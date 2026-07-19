/**
 * inscritoPedido.test.ts — LEELA-FABLE-A-T2 (ADR-011 · S203-T3 · RN-223)
 *
 * Unit (SEM emulator): projeção `Inscrito` enriquecida — link ao pedido
 * (pedidoRef/ehResponsavel), bloco `[reg]` (dadosPessoais) e `tamanhos`
 * (map itemId → tamanho) — + coerência do seed de pedidos/pagamentos com o
 * seed canônico de inscritos. Sem I/O.
 *
 * O join `[pag]` real (api-client contra Rules) está em
 * inscritoPedidoRules.integration.test.ts (exige Emulator — gate
 * consolidado do maestro).
 */

import { describe, expect, it } from 'vitest';
import {
  CAMPOS_FUNCTION_INSCRITO,
  parseInscrito,
  parsePagamento,
  parsePedido,
  type Pedido,
} from '@leela/core';
import {
  cpfValido,
  idadeNaData,
  parseDadosPessoais,
  parseTamanhos,
  telefoneValido,
} from '../../../packages/core/src/eventos/dadosPessoais';
import {
  inscritoTemPedido,
  pedidoDoInscritoCoerente,
} from '../../../packages/core/src/eventos/inscrito';
import { gerarInscritosSeed, type InscritoSeed } from '../seed/inscritos.seed';
import {
  cpfDeterministico,
  gerarPedidosSeed,
  type EnriquecimentoInscritoSeed,
  type PagamentoSeed,
  type PedidoSeed,
} from '../seed/pedidos.seed';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeTs = { seconds: 1_770_000_000, nanoseconds: 0 };

function tsFromMillis(millis: number): { seconds: number; nanoseconds: number } {
  return {
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1_000_000,
  };
}

function dadosPessoaisValidos(): Record<string, unknown> {
  return {
    cpf: '529.982.247-25',
    telefone: '(48) 99999-0001',
    nascimento: '1990-06-15',
    genero: 'feminino',
    cidade: 'Florianópolis',
    uf: 'SC',
    contatoEmergencia: { nome: 'João Silva', telefone: '(48) 3222-1100' },
    restricoesMedicas: 'Asma leve',
  };
}

function docInscrito(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tenantId: 'castelo-producoes',
    atletaId: 'atleta-0001',
    atletaNome: 'Marina Silva',
    kit: 'kit_prata',
    chipNumero: null,
    status: 'confirmado',
    modalidade: '21k',
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseInscrito — novos campos ADR-011 + [reg] + tamanhos
// ---------------------------------------------------------------------------

describe('parseInscrito — link ao pedido (ADR-011)', () => {
  it('doc legado (sem os campos novos) normaliza defaults honestos', () => {
    const inscrito = parseInscrito('insc-legado', docInscrito());
    expect(inscrito.pedidoRef).toBeNull();
    expect(inscrito.ehResponsavel).toBe(false);
    expect(inscrito.tamanhos).toEqual({});
    expect(inscrito.dadosPessoais).toBeUndefined();
  });

  it('parseia pedidoRef + ehResponsavel válidos', () => {
    const inscrito = parseInscrito(
      'insc-0001',
      docInscrito({ pedidoRef: 'ped-0001', ehResponsavel: true })
    );
    expect(inscrito.pedidoRef).toBe('ped-0001');
    expect(inscrito.ehResponsavel).toBe(true);
    expect(inscritoTemPedido(inscrito)).toBe(true);
  });

  it('lança quando ehResponsavel=true SEM pedidoRef (vínculo órfão)', () => {
    expect(() =>
      parseInscrito('x', docInscrito({ ehResponsavel: true }))
    ).toThrow(/ADR-011/);
  });

  it('lança com pedidoRef vazio ou não-string', () => {
    expect(() => parseInscrito('x', docInscrito({ pedidoRef: '' }))).toThrow(/pedidoRef/);
    expect(() => parseInscrito('x', docInscrito({ pedidoRef: 7 }))).toThrow(/pedidoRef/);
  });

  it('lança com ehResponsavel não-boolean', () => {
    expect(() =>
      parseInscrito('x', docInscrito({ pedidoRef: 'ped-1', ehResponsavel: 'sim' }))
    ).toThrow(/ehResponsavel/);
  });

  it('CAMPOS_FUNCTION_INSCRITO ganhou os 4 campos do checkout (A-T2) + kitId (E12) + estornadoEm (FABLE-B)', () => {
    expect(CAMPOS_FUNCTION_INSCRITO).toEqual([
      'kitEntregueEm',
      'checkinEm',
      'qrToken',
      'ingressoEmitidoEm',
      'pedidoRef',
      'ehResponsavel',
      'dadosPessoais',
      'tamanhos',
      'kitId',
      // FABLE-B (RN-341): carimbo do estorno — Function-only (espelho da
      // lista canônica em eventos/inscrito.ts; drift pego por este teste)
      'estornadoEm',
      // S904-T4 (RN-345): trilha de titularidade — Function-only (drift do
      // teste-espelho vs lista canônica; corrigido no CKMOD)
      'titularHistorico',
      // CK2 (RN-173): vínculo ao registro global de pessoa — Function-only
      'pessoaRef',
    ]);
  });
});

describe('parseInscrito — tamanhos (RN-223 · S209-T1)', () => {
  it('map itemId → tamanho é preservado', () => {
    const inscrito = parseInscrito(
      'x',
      docInscrito({ tamanhos: { 'camiseta-tecnica': 'M' } })
    );
    expect(inscrito.tamanhos).toEqual({ 'camiseta-tecnica': 'M' });
  });

  it('ausente/null normaliza para {} (kit sem item tamanhado)', () => {
    expect(parseInscrito('x', docInscrito({ tamanhos: null })).tamanhos).toEqual({});
  });

  it('lança com valor não-string ou vazio (RN-223)', () => {
    expect(() =>
      parseInscrito('x', docInscrito({ tamanhos: { 'camiseta-tecnica': 42 } }))
    ).toThrow(/RN-223/);
    expect(() =>
      parseInscrito('x', docInscrito({ tamanhos: { 'camiseta-tecnica': '' } }))
    ).toThrow(/RN-223/);
  });

  it('lança com shape não-map (array)', () => {
    expect(() => parseInscrito('x', docInscrito({ tamanhos: ['M'] }))).toThrow(/RN-223/);
  });
});

describe('parseInscrito — bloco [reg] (dadosPessoais)', () => {
  it('parseia bloco completo (PII do titular)', () => {
    const inscrito = parseInscrito(
      'x',
      docInscrito({ dadosPessoais: dadosPessoaisValidos() })
    );
    expect(inscrito.dadosPessoais?.cpf).toBe('529.982.247-25');
    expect(inscrito.dadosPessoais?.nascimento).toBe('1990-06-15');
    expect(inscrito.dadosPessoais?.contatoEmergencia?.nome).toBe('João Silva');
    expect(inscrito.dadosPessoais?.restricoesMedicas).toBe('Asma leve');
  });

  it('contatoEmergencia e restricoesMedicas são opcionais', () => {
    const dados = dadosPessoaisValidos();
    delete dados['contatoEmergencia'];
    delete dados['restricoesMedicas'];
    const inscrito = parseInscrito('x', docInscrito({ dadosPessoais: dados }));
    expect(inscrito.dadosPessoais?.contatoEmergencia).toBeUndefined();
    expect(inscrito.dadosPessoais?.restricoesMedicas).toBeUndefined();
  });

  it('lança com CPF de dígito verificador errado', () => {
    const dados = dadosPessoaisValidos();
    dados['cpf'] = '529.982.247-26';
    expect(() => parseInscrito('x', docInscrito({ dadosPessoais: dados }))).toThrow(/cpf/);
  });

  it('lança com nascimento de calendário inválido (2026-02-30)', () => {
    const dados = dadosPessoaisValidos();
    dados['nascimento'] = '2026-02-30';
    expect(() =>
      parseInscrito('x', docInscrito({ dadosPessoais: dados }))
    ).toThrow(/nascimento/);
  });

  it('lança com uf fora da lista e genero fora do enum', () => {
    const comUf = dadosPessoaisValidos();
    comUf['uf'] = 'XX';
    expect(() => parseInscrito('x', docInscrito({ dadosPessoais: comUf }))).toThrow(/uf/);

    const comGenero = dadosPessoaisValidos();
    comGenero['genero'] = 'other';
    expect(() =>
      parseInscrito('x', docInscrito({ dadosPessoais: comGenero }))
    ).toThrow(/genero/);
  });

  it('lança com contatoEmergencia incompleto', () => {
    const dados = dadosPessoaisValidos();
    dados['contatoEmergencia'] = { nome: 'João Silva' };
    expect(() =>
      parseInscrito('x', docInscrito({ dadosPessoais: dados }))
    ).toThrow(/contatoEmergencia/);
  });

  it('lança com restricoesMedicas vazia (ausência = omitir o campo)', () => {
    const dados = dadosPessoaisValidos();
    dados['restricoesMedicas'] = '';
    expect(() =>
      parseInscrito('x', docInscrito({ dadosPessoais: dados }))
    ).toThrow(/restricoesMedicas/);
  });
});

// ---------------------------------------------------------------------------
// Validações puras de PII
// ---------------------------------------------------------------------------

describe('cpfValido / telefoneValido / idadeNaData', () => {
  it('aceita CPF válido com e sem máscara', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
  });

  it('rejeita DV errado, sequência única, tamanho errado e não-string', () => {
    expect(cpfValido('529.982.247-24')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('1234567890')).toBe(false);
    expect(cpfValido('52998224725a')).toBe(false);
    expect(cpfValido(52998224725)).toBe(false);
  });

  it('telefone aceita máscara livre com 10–13 dígitos', () => {
    expect(telefoneValido('(48) 99999-0001')).toBe(true);
    expect(telefoneValido('+55 48 99999-0001')).toBe(true);
    expect(telefoneValido('4832221100')).toBe(true);
    expect(telefoneValido('999')).toBe(false);
    expect(telefoneValido('')).toBe(false);
  });

  it('idadeNaData conta aniversário no dia civil (fuso do produto)', () => {
    const ref = new Date('2026-07-11T12:00:00Z');
    expect(idadeNaData('1990-06-15', ref)).toBe(36); // já fez aniversário
    expect(idadeNaData('1990-08-01', ref)).toBe(35); // ainda não fez
    expect(() => idadeNaData('1990-13-01', ref)).toThrow(/yyyy-mm-dd/);
  });

  it('parseTamanhos e parseDadosPessoais são utilizáveis isolados (checkout)', () => {
    expect(parseTamanhos('ctx', undefined)).toEqual({});
    expect(parseDadosPessoais('ctx', dadosPessoaisValidos()).uf).toBe('SC');
  });
});

// ---------------------------------------------------------------------------
// Coerência inscrito ↔ pedido (guarda do join [pag])
// ---------------------------------------------------------------------------

describe('pedidoDoInscritoCoerente (ADR-011)', () => {
  const pedido: Pick<Pedido, 'id' | 'inscritoRefs' | 'responsavel'> = {
    id: 'ped-0001',
    inscritoRefs: ['insc-0001', 'insc-0002'],
    responsavel: { atletaId: 'atleta-0001', nome: 'Marina', email: 'm@x.dev' },
  };

  it('true para o responsável e para o não-responsável do mesmo pedido', () => {
    expect(
      pedidoDoInscritoCoerente(
        { id: 'insc-0001', atletaId: 'atleta-0001', pedidoRef: 'ped-0001', ehResponsavel: true },
        pedido
      )
    ).toBe(true);
    expect(
      pedidoDoInscritoCoerente(
        { id: 'insc-0002', atletaId: 'atleta-0002', pedidoRef: 'ped-0001', ehResponsavel: false },
        pedido
      )
    ).toBe(true);
  });

  it('false quando o pedido não lista o inscrito', () => {
    expect(
      pedidoDoInscritoCoerente(
        { id: 'insc-0099', atletaId: 'atleta-0099', pedidoRef: 'ped-0001', ehResponsavel: false },
        pedido
      )
    ).toBe(false);
  });

  it('false quando ehResponsavel diverge do responsavel do pedido', () => {
    expect(
      pedidoDoInscritoCoerente(
        { id: 'insc-0001', atletaId: 'atleta-0001', pedidoRef: 'ped-0001', ehResponsavel: false },
        pedido
      )
    ).toBe(false);
    expect(
      pedidoDoInscritoCoerente(
        { id: 'insc-0002', atletaId: 'atleta-0002', pedidoRef: 'ped-0001', ehResponsavel: true },
        pedido
      )
    ).toBe(false);
  });

  it('false quando pedidoRef aponta para OUTRO pedido', () => {
    expect(
      pedidoDoInscritoCoerente(
        { id: 'insc-0001', atletaId: 'atleta-0001', pedidoRef: 'ped-0002', ehResponsavel: true },
        pedido
      )
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Seed de pedidos — coerência com o seed canônico + invariantes financeiras
// ---------------------------------------------------------------------------

describe('gerarPedidosSeed (FABLE-A-T2)', () => {
  const seed = gerarPedidosSeed();
  const inscritos = gerarInscritosSeed();
  const inscritoPorId = new Map<string, InscritoSeed>(inscritos.map((i) => [i.id, i]));
  const pedidoPorId = new Map<string, PedidoSeed>(seed.pedidos.map((p) => [p.id, p]));
  const pagamentoPorId = new Map<string, PagamentoSeed>(
    seed.pagamentos.map((p) => [p.id, p])
  );

  function docPedido(p: PedidoSeed): Record<string, unknown> {
    const { criadoEmMillis, id: _id, ...doc } = p;
    const ts = tsFromMillis(criadoEmMillis);
    return { ...doc, criadoEm: ts, atualizadoEm: ts };
  }

  function docPagamento(p: PagamentoSeed): Record<string, unknown> {
    const { criadoEmMillis, pagoEmMillis, conciliacao, id: _id, ...doc } = p;
    const ts = tsFromMillis(criadoEmMillis);
    const resultado: Record<string, unknown> = { ...doc, criadoEm: ts, atualizadoEm: ts };
    if (pagoEmMillis !== undefined) resultado['pagoEm'] = tsFromMillis(pagoEmMillis);
    if (conciliacao !== undefined) {
      const { repassePrevistoEmMillis, ...c } = conciliacao;
      resultado['conciliacao'] = {
        ...c,
        repassePrevistoEm: tsFromMillis(repassePrevistoEmMillis),
      };
    }
    return resultado;
  }

  it('é determinístico (duas gerações idênticas)', () => {
    expect(gerarPedidosSeed()).toEqual(seed);
  });

  it('todo pedido passa no parse defensivo do kernel (parsePedido)', () => {
    for (const p of seed.pedidos) {
      expect(() => parsePedido(p.id, docPedido(p))).not.toThrow();
    }
    expect(seed.pedidos.length).toBeGreaterThanOrEqual(10);
  });

  it('todo pagamento passa no parse defensivo (invariantes monetárias)', () => {
    for (const p of seed.pagamentos) {
      expect(() => parsePagamento(p.id, docPagamento(p))).not.toThrow();
    }
  });

  it('pedido pago ⇒ pagamento confirmado e valorTotal = valorFinal', () => {
    for (const p of seed.pedidos) {
      if (p.status !== 'pago') continue;
      expect(p.pagamentoRef).not.toBeNull();
      const pagamento = pagamentoPorId.get(p.pagamentoRef as string);
      expect(pagamento?.status).toBe('confirmado');
      expect(pagamento?.pedidoRef).toBe(p.id);
      expect(p.valorTotal).toBe(pagamento?.valorFinal);
    }
  });

  it('cobre os ramos da UI: grupo, auto-inscrição, pendente c/ e s/ cobrança, cancelado', () => {
    expect(seed.pedidos.some((p) => p.inscritoRefs.length > 1 && p.status === 'pago')).toBe(true);
    expect(seed.pedidos.some((p) => p.inscritoRefs.length === 1 && p.status === 'pago')).toBe(true);
    expect(
      seed.pedidos.some((p) => p.status === 'pendente' && p.pagamentoRef !== null)
    ).toBe(true);
    expect(
      seed.pedidos.some((p) => p.status === 'pendente' && p.pagamentoRef === null)
    ).toBe(true);
    expect(seed.pedidos.some((p) => p.status === 'cancelado')).toBe(true);
    expect(seed.pagamentos.some((p) => p.forma === 'pix')).toBe(true);
    expect(seed.pagamentos.some((p) => (p.cartao?.parcelas ?? 0) > 1)).toBe(true);
    expect(seed.pagamentos.some((p) => p.cupom !== undefined)).toBe(true);
  });

  it('enriquecimento referencia inscritos REAIS com status coerente ao pedido', () => {
    for (const e of seed.enriquecimentos) {
      const inscrito = inscritoPorId.get(e.inscritoId);
      expect(inscrito, e.inscritoId).toBeDefined();
      const pedido = pedidoPorId.get(e.pedidoRef);
      expect(pedido, e.pedidoRef).toBeDefined();
      // pago ⇒ confirmado · pendente ⇒ pendente · cancelado ⇒ cancelado
      const esperado =
        pedido?.status === 'pago'
          ? 'confirmado'
          : (pedido?.status as 'pendente' | 'cancelado');
      expect(inscrito?.status).toBe(esperado);
    }
  });

  it('exatamente UM responsável por pedido, batendo com pedido.responsavel', () => {
    for (const p of seed.pedidos) {
      const doPedido = seed.enriquecimentos.filter((e) => e.pedidoRef === p.id);
      expect(doPedido.map((e) => e.inscritoId).sort()).toEqual([...p.inscritoRefs].sort());
      const responsaveis = doPedido.filter((e) => e.ehResponsavel);
      expect(responsaveis).toHaveLength(1);
      const inscritoResp = inscritoPorId.get(
        (responsaveis[0] as EnriquecimentoInscritoSeed).inscritoId
      );
      expect(inscritoResp?.atletaId).toBe(p.responsavel.atletaId);
      expect(inscritoResp?.atletaNome).toBe(p.responsavel.nome);
    }
  });

  it('tamanhos: kit c/ camiseta tamanhada tem entrada; ouro/sem_kit tem {}', () => {
    let comTamanho = 0;
    for (const e of seed.enriquecimentos) {
      const kit = inscritoPorId.get(e.inscritoId)?.kit;
      if (kit === 'kit_prata' || kit === 'kit_basico') {
        expect(e.tamanhos['camiseta-tecnica'], e.inscritoId).toMatch(/^(P|M|G|GG)$/);
        comTamanho++;
      } else {
        expect(e.tamanhos).toEqual({});
      }
    }
    expect(comTamanho).toBeGreaterThanOrEqual(5); // S209 tem dado real p/ A-T3
  });

  it('CPFs determinísticos são VÁLIDOS e únicos', () => {
    const cpfs = seed.enriquecimentos.map((e) => e.dadosPessoais.cpf);
    expect(new Set(cpfs).size).toBe(cpfs.length);
    for (const cpf of cpfs) expect(cpfValido(cpf), cpf).toBe(true);
    expect(cpfValido(cpfDeterministico(453))).toBe(true);
  });

  it('inscrito ENRIQUECIDO parseia inteiro e é coerente com seu pedido', () => {
    for (const e of seed.enriquecimentos) {
      const base = inscritoPorId.get(e.inscritoId) as InscritoSeed;
      const doc: Record<string, unknown> = {
        tenantId: base.tenantId,
        atletaId: base.atletaId,
        atletaNome: base.atletaNome,
        kit: base.kit,
        chipNumero: base.chipNumero,
        status: base.status,
        modalidade: base.modalidade,
        criadoEm: tsFromMillis(base.criadoEmMillis),
        atualizadoEm: tsFromMillis(e.atualizadoEmMillis),
        pedidoRef: e.pedidoRef,
        ehResponsavel: e.ehResponsavel,
        dadosPessoais: e.dadosPessoais,
        tamanhos: e.tamanhos,
      };
      const inscrito = parseInscrito(e.inscritoId, doc);
      expect(inscrito.dadosPessoais).toBeDefined();

      const pedido = parsePedido(
        e.pedidoRef,
        docPedido(pedidoPorId.get(e.pedidoRef) as PedidoSeed)
      );
      expect(pedidoDoInscritoCoerente(inscrito, pedido), e.inscritoId).toBe(true);
    }
  });
});
