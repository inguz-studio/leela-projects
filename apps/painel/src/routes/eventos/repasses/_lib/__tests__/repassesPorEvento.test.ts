// =============================================================================
// derivarRepassesPorEvento (RN-349) — prova o eixo por-evento do repasse:
// vendido real, retido/disponível ESTIMADOS pelos helpers canônicos do core, e
// o tratamento honesto do evento SEM termo comercial.
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { FinanceiroEvento } from '@leela/api-client';
import {
  comprometeSaldo,
  computeSaldoRepasse,
  ESTADOS_REPASSE,
  ESTADOS_REPASSE_COMPROMETIDOS,
} from '@leela/core';
import type { Repasse, Timestamp } from '@leela/core';
import type { EventoFinanceiroRow } from '../../../../../lib/query/queries';
// A Σ desta associação é o que a Caixa do evento exporta no CSV — a coerência
// entre os dois módulos é de produção (FinanceiroPage), não só de teste.
import { gerarCsvFinanceiro } from '../../../_lib/financeiro';
import {
  abaterRepassesVivos,
  associarRepassesPorEvento,
  derivarRepassesPorEvento,
  totaisRepasseEvento,
} from '../repassesPorEvento';

function fin(over: Partial<FinanceiroEvento>): FinanceiroEvento {
  return {
    tenantId: 'corrida',
    receitaBruta: 0,
    taxaPct: 10,
    taxaValor: 0,
    receitaLiquida: 0,
    inscritos: { total: 0, porStatus: {}, porKit: {}, porModalidade: {} } as FinanceiroEvento['inscritos'],
    ...over,
  };
}

function row(
  id: string,
  status: 'rascunho' | 'publicado' | 'ao_vivo' | 'encerrado',
  financeiro: FinanceiroEvento | null,
): EventoFinanceiroRow {
  return { evento: { id, nome: `Evento ${id}`, slug: id, status }, financeiro };
}

describe('derivarRepassesPorEvento', () => {
  it('evento em andamento: retido = líquido × pct; disponível = líquido − retido', () => {
    const linhas = derivarRepassesPorEvento(
      [row('a', 'ao_vivo', fin({ receitaBruta: 12000, receitaLiquida: 10000 }))],
      15,
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      eventoId: 'a',
      vendido: 12000,
      retido: 1500, // 10000 × 15%
      disponivelEstimado: 8500, // 10000 − 1500
      encerrado: false,
      semTermo: false,
    });
  });

  it('evento ENCERRADO libera a retenção: retido 0, disponível = líquido inteiro', () => {
    const linhas = derivarRepassesPorEvento(
      [row('a', 'encerrado', fin({ receitaBruta: 12000, receitaLiquida: 10000 }))],
      15,
    );
    expect(linhas[0]?.retido).toBe(0);
    expect(linhas[0]?.disponivelEstimado).toBe(10000);
    expect(linhas[0]?.encerrado).toBe(true);
  });

  it('evento SEM termo (receitaLiquida null): vendido conta, retido/disponível = null (honesto)', () => {
    const linhas = derivarRepassesPorEvento(
      [row('a', 'ao_vivo', fin({ receitaBruta: 5000, receitaLiquida: null }))],
    );
    expect(linhas[0]).toMatchObject({
      vendido: 5000,
      retido: null,
      disponivelEstimado: null,
      semTermo: true,
    });
  });

  it('usa o default de retenção (15%) quando o pct não é informado', () => {
    const linhas = derivarRepassesPorEvento([
      row('a', 'ao_vivo', fin({ receitaBruta: 2000, receitaLiquida: 1000 })),
    ]);
    expect(linhas[0]?.retido).toBe(150); // 1000 × 15% default
  });

  it('exclui eventos sem agregado financeiro (sem movimento) e ordena por vendido desc', () => {
    const linhas = derivarRepassesPorEvento([
      row('sem', 'publicado', null),
      row('pequeno', 'ao_vivo', fin({ receitaBruta: 1000, receitaLiquida: 900 })),
      row('grande', 'ao_vivo', fin({ receitaBruta: 9000, receitaLiquida: 8000 })),
    ]);
    expect(linhas.map((l) => l.eventoId)).toEqual(['grande', 'pequeno']);
  });

  it('totais somam as linhas; sem-termo entra só no vendido e conta em eventosSemTermo', () => {
    const linhas = derivarRepassesPorEvento(
      [
        row('a', 'ao_vivo', fin({ receitaBruta: 2000, receitaLiquida: 1000 })),
        row('b', 'ao_vivo', fin({ receitaBruta: 5000, receitaLiquida: null })),
      ],
      20,
    );
    const totais = totaisRepasseEvento(linhas);
    expect(totais.vendido).toBe(7000);
    expect(totais.retido).toBe(200); // só o evento 'a': 1000 × 20%
    expect(totais.disponivelEstimado).toBe(800);
    expect(totais.eventosSemTermo).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// associarRepassesPorEvento (RN-349 · LEELA-BEPEND-T2)
// ---------------------------------------------------------------------------

function tsRep(ms: number): Timestamp {
  return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toDate: () => new Date(ms), toMillis: () => ms };
}

function repasse(
  id: string,
  estado: Repasse['estado'],
  valor: number,
  eventoId?: string,
): Repasse {
  return {
    id,
    tenantId: 'castelo',
    ...(eventoId !== undefined ? { eventoId } : {}),
    valor,
    estado,
    dadosBancariosSnapshot: {
      tenantId: 'castelo',
      banco: 'x',
      agencia: '0001',
      contaMascarada: '****1234',
      tipo: 'corrente',
      pixMascarado: null,
      titular: 'Marina',
      cpfCnpjMascarado: '***',
    },
    transicoes: [],
    criadoEm: tsRep(0),
    atualizadoEm: tsRep(0),
  };
}

describe('associarRepassesPorEvento (campo EXATO — fim de heurística)', () => {
  it('agrupa {solicitado, aprovado, pago} por eventoId; legado sem campo → semAssociacao', () => {
    const { porEvento, semAssociacao } = associarRepassesPorEvento([
      repasse('r1', 'solicitado', 1000, 'ev-a'),
      repasse('r2', 'pago', 2500, 'ev-a'),
      repasse('r3', 'aprovado', 500, 'ev-b'),
      repasse('r4', 'pago', 3000), // legado pré-RN-349
    ]);
    expect(porEvento.get('ev-a')).toEqual({ qtd: 2, total: 3500 });
    expect(porEvento.get('ev-b')).toEqual({ qtd: 1, total: 500 });
    expect(semAssociacao).toEqual({ qtd: 1, total: 3000 });
  });

  it('cancelado/recusado NÃO contam (valor devolvido ao disponível — RN-351/353)', () => {
    const { porEvento, semAssociacao } = associarRepassesPorEvento([
      repasse('r1', 'cancelado', 1000, 'ev-a'),
      repasse('r2', 'recusado', 800, 'ev-a'),
      repasse('r3', 'recusado', 700), // legado devolvido também fora
    ]);
    expect(porEvento.size).toBe(0);
    expect(semAssociacao).toEqual({ qtd: 0, total: 0 });
  });

  it('histórico vazio → mapas zerados (nada fabricado)', () => {
    const { porEvento, semAssociacao } = associarRepassesPorEvento([]);
    expect(porEvento.size).toBe(0);
    expect(semAssociacao).toEqual({ qtd: 0, total: 0 });
  });

  // Achado R-1 da review CAIXADISP-REV: a Σ era acumulada em float cru e o CSV
  // da Caixa imprime esse número SEM formatar — a planilha de conciliação
  // recebia "300.29999999999995". Os DOIS eixos fecham em centavos.
  it('a Σ fecha em CENTAVOS nos dois eixos (o CSV da Caixa imprime esta Σ crua)', () => {
    const { porEvento, semAssociacao } = associarRepassesPorEvento([
      repasse('r1', 'pago', 100.1, 'ev-a'),
      repasse('r2', 'solicitado', 200.2, 'ev-a'),
      repasse('r3', 'pago', 100.1),
      repasse('r4', 'aprovado', 200.2),
    ]);
    const doEvento = porEvento.get('ev-a');
    expect(doEvento).toEqual({ qtd: 2, total: 300.3 });
    expect(semAssociacao).toEqual({ qtd: 2, total: 300.3 });
    // A prova que interessa é a do dígito, não a do arredondamento do expect:
    // sem `roundMoney` na acumulação, `String(total)` = '300.29999999999995'.
    expect(String(doEvento?.total)).toBe('300.3');
    expect(gerarCsvFinanceiro(fin({ receitaBruta: 10000 }), doEvento)).toContain(
      'Resumo,Valor Repassado (R$),300.3',
    );
  });

  // A coerência que a DEC-0727 exige entre a Caixa do evento e a visão macro é
  // a da DEFINIÇÃO de repasse vivo. Ela não é conferida por leitura: vale para
  // TODO estado da máquina (RN-353), e é a do core — não uma lista repetida aqui.
  it('vivo == comprometeSaldo, estado por estado (mesma definição do saldo do servidor)', () => {
    for (const estado of ESTADOS_REPASSE) {
      const { porEvento } = associarRepassesPorEvento([repasse('r', estado, 100, 'ev-a')]);
      expect(porEvento.get('ev-a')?.total ?? 0, `estado ${estado}`).toBe(
        comprometeSaldo(estado) ? 100 : 0,
      );
    }
    expect([...ESTADOS_REPASSE_COMPROMETIDOS]).toEqual(['solicitado', 'aprovado', 'pago']);
  });

  it('o que o evento abate é o que o tenant compromete (mesmo Σ, RN-351)', () => {
    const historico = [
      repasse('r1', 'solicitado', 1000, 'ev-a'),
      repasse('r2', 'aprovado', 500, 'ev-a'),
      repasse('r3', 'pago', 200, 'ev-a'),
      repasse('r4', 'cancelado', 900, 'ev-a'),
      repasse('r5', 'recusado', 700, 'ev-a'),
    ];
    // Σ por evento (as duas telas) × comprometido do saldo consolidado (servidor).
    const doEvento = associarRepassesPorEvento(historico).porEvento.get('ev-a');
    const doTenant = computeSaldoRepasse({
      eventos: [{ eventoId: 'ev-a', receitaBruta: 10000, receitaLiquida: 10000, encerrado: true }],
      repasses: historico.map((r) => ({ valor: r.valor, estado: r.estado })),
    });
    expect(doEvento).toEqual({ qtd: 3, total: 1700 });
    expect(doTenant.comprometido).toBe(1700);
    expect(doTenant.disponivel).toBe(8300); // 10.000 − 1.700
  });
});

// ---------------------------------------------------------------------------
// abaterRepassesVivos (DEC-0727) — a coluna por evento abate o que já saiu
// ---------------------------------------------------------------------------

describe('abaterRepassesVivos (DEC-0727)', () => {
  const LINHAS = () =>
    derivarRepassesPorEvento(
      [
        row('ev-a', 'ao_vivo', fin({ receitaBruta: 12000, receitaLiquida: 10000 })),
        row('ev-b', 'ao_vivo', fin({ receitaBruta: 5000, receitaLiquida: null })),
      ],
      15,
    );

  function porId(linhas: ReturnType<typeof LINHAS>, id: string) {
    return linhas.find((l) => l.eventoId === id);
  }

  it('abate a Σ viva daquele evento do disponível estimado', () => {
    const assoc = associarRepassesPorEvento([repasse('r1', 'pago', 500, 'ev-a')]);
    const linhas = abaterRepassesVivos(LINHAS(), assoc);
    expect(porId(linhas, 'ev-a')?.disponivelEstimado).toBe(8000); // 8.500 − 500
    expect(porId(linhas, 'ev-a')?.retido).toBe(1500); // retenção intacta (RN-350)
    expect(porId(linhas, 'ev-a')?.vendido).toBe(12000);
  });

  it('não vaza entre eventos: repasse de ev-a não toca ev-b', () => {
    const linhas = abaterRepassesVivos(
      derivarRepassesPorEvento(
        [
          row('ev-a', 'ao_vivo', fin({ receitaBruta: 12000, receitaLiquida: 10000 })),
          row('ev-c', 'ao_vivo', fin({ receitaBruta: 4000, receitaLiquida: 4000 })),
        ],
        15,
      ),
      associarRepassesPorEvento([repasse('r1', 'pago', 500, 'ev-a')]),
    );
    expect(porId(linhas, 'ev-a')?.disponivelEstimado).toBe(8000);
    expect(porId(linhas, 'ev-c')?.disponivelEstimado).toBe(3400); // 4.000 − 15%, intacto
  });

  it('ESTORNO devolve: o mesmo histórico com o repasse cancelado volta ao número cheio', () => {
    const vivo = abaterRepassesVivos(
      LINHAS(),
      associarRepassesPorEvento([repasse('r1', 'pago', 500, 'ev-a')]),
    );
    const estornado = abaterRepassesVivos(
      LINHAS(),
      associarRepassesPorEvento([repasse('r1', 'cancelado', 500, 'ev-a')]),
    );
    expect(porId(vivo, 'ev-a')?.disponivelEstimado).toBe(8000);
    expect(porId(estornado, 'ev-a')?.disponivelEstimado).toBe(8500);
    // Recusa (rejectRepasse) devolve igual — os dois caminhos de estorno.
    const recusado = abaterRepassesVivos(
      LINHAS(),
      associarRepassesPorEvento([repasse('r1', 'recusado', 500, 'ev-a')]),
    );
    expect(porId(recusado, 'ev-a')?.disponivelEstimado).toBe(8500);
  });

  it('evento SEM termo continua "—": não há líquido de onde abater', () => {
    const linhas = abaterRepassesVivos(
      LINHAS(),
      associarRepassesPorEvento([repasse('r1', 'pago', 500, 'ev-b')]),
    );
    expect(porId(linhas, 'ev-b')?.disponivelEstimado).toBeNull();
    expect(porId(linhas, 'ev-b')?.semTermo).toBe(true);
  });

  it('sem associação (histórico vazio ou repasse legado sem eventoId): linhas intactas', () => {
    const base = LINHAS();
    expect(abaterRepassesVivos(base, associarRepassesPorEvento([]))).toEqual(base);
    expect(
      abaterRepassesVivos(base, associarRepassesPorEvento([repasse('r1', 'pago', 500)])),
    ).toEqual(base);
  });

  it('repasse maior que o liberado: 0, nunca negativo (clamp RN-351)', () => {
    const linhas = abaterRepassesVivos(
      LINHAS(),
      associarRepassesPorEvento([repasse('r1', 'pago', 99999, 'ev-a')]),
    );
    expect(porId(linhas, 'ev-a')?.disponivelEstimado).toBe(0);
  });

  it('evento ENCERRADO abate sobre o líquido inteiro (retenção já liberada)', () => {
    const linhas = abaterRepassesVivos(
      derivarRepassesPorEvento(
        [row('ev-a', 'encerrado', fin({ receitaBruta: 12000, receitaLiquida: 10000 }))],
        15,
      ),
      associarRepassesPorEvento([repasse('r1', 'pago', 500, 'ev-a')]),
    );
    expect(porId(linhas, 'ev-a')?.disponivelEstimado).toBe(9500); // 10.000 − 0 − 500
  });
});
