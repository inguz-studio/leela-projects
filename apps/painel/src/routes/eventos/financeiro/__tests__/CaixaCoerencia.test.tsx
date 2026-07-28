// =============================================================================
// Coerência da Caixa do evento — achados A-1/A-2 da review antagonista IA-MENU,
// agora sob a DEC-0727C ("o que devemos mostrar: Receita Total, Disponível para
// Repasse, Valor Repassado. nao complica essa porra. Faz o simples").
//
//   A-1 · o CSV exportado pelo botão da MESMA tela imprimia `repassado = 0`
//         enquanto a tela mostrava R$ 3.200,00. Export que contradiz a tela de
//         onde saiu é pior que export ausente: ele é o que vai para a planilha
//         de conciliação. Invariante mantida nas TRÊS linhas do resumo;
//   A-2 · o disponível não abatia os repasses. A DEC-0727 matou isso; a
//         DEC-0727C foi além e trocou a BASE (RN-367): a Caixa passou a
//         calcular como o SAQUE calcula. As asserções que cravavam a base
//         bruta (12.000 × 0,85 = 10.200) descreviam o mundo anterior e saíram
//         com autorização da rodada; no lugar entrou a prova de convergência
//         com o número que o modal aceita — 9.700 antes, 8.000 depois.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { computeSaldoRepasse, type Timestamp } from '@leela/core';
import type { FinanceiroEvento } from '@leela/api-client';
import { FinanceiroView } from '../FinanceiroView';

const baixarTexto = vi.hoisted(() => vi.fn());
vi.mock('../../_lib/download', () => ({ baixarTexto }));

function ts(ms: number): Timestamp {
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  } as unknown as Timestamp;
}

/** Mock CANÔNICO do repo: bruto 12.000 · líquido 10.000 ⇒ liberado 8.500. */
function mkFin(over: Partial<FinanceiroEvento> = {}): FinanceiroEvento {
  return {
    receitaBruta: 12000,
    receitaLiquida: 10000,
    taxaPct: 16.67,
    taxaValor: 2000,
    inscritos: { total: 3, porModalidade: {}, porKit: {}, porStatus: {} },
    receitaPorModalidade: {},
    atualizadoEm: ts(Date.UTC(2026, 3, 15)),
    ...over,
  } as unknown as FinanceiroEvento;
}

/** Dispara o "Exportar CSV" e devolve o conteúdo entregue ao download. */
async function exportar(): Promise<string> {
  await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
  expect(baixarTexto).toHaveBeenCalledTimes(1);
  return String(baixarTexto.mock.calls[0]?.[0] ?? '');
}

beforeEach(() => {
  baixarTexto.mockClear();
});

// ---------------------------------------------------------------------------
// DEC-0727C · a Caixa mostra TRÊS números, e só três
// ---------------------------------------------------------------------------

describe('DEC-0727C · três números na Caixa', () => {
  it('os três cards estão na tela com o nome que o dono deu', () => {
    render(
      <FinanceiroView slug="e1" financeiro={mkFin()} loading={false} error={null} />,
    );
    expect(screen.getByText('Receita Total')).toBeInTheDocument();
    expect(screen.getByText('Disponível para Repasse')).toBeInTheDocument();
    expect(screen.getByText('Valor Repassado')).toBeInTheDocument();
  });

  it('o card de retenção MORREU — nem o rótulo, nem a frase da retenção sobrevivem', () => {
    render(
      <FinanceiroView slug="e1" financeiro={mkFin()} loading={false} error={null} />,
    );
    expect(screen.queryByText('Valor a ser disponibilizado')).not.toBeInTheDocument();
    expect(screen.queryByText(/Retenção de até/)).not.toBeInTheDocument();
    // E o número da retenção (1.500) não aparece em card nenhum.
    expect(screen.queryByText(/^R\$\s*1\.500$/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// RN-367 · a base do Disponível é a do saque autoritativo
// ---------------------------------------------------------------------------

describe('RN-367 · o número da Caixa converge com o do saque', () => {
  it('ANTES a Caixa dizia 9.700 e o modal aceitava 8.000; DEPOIS os dois dizem 8.000', async () => {
    const CANONICO = mkFin();
    const repasseVivo = 500;

    // O saque autoritativo, pela função que o SERVIDOR usa (mesmo evento,
    // mesmo repasse vivo).
    const doSaque = computeSaldoRepasse({
      eventos: [
        {
          eventoId: 'castelo',
          receitaBruta: 12000,
          receitaLiquida: 10000,
          encerrado: false,
        },
      ],
      repasses: [{ valor: repasseVivo, estado: 'solicitado' }],
    });
    expect(doSaque.disponivel).toBe(8000);

    render(
      <FinanceiroView
        slug="castelo"
        financeiro={CANONICO}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 1, total: repasseVivo }}
      />,
    );

    // A tela mostra o MESMO número do saque …
    expect(screen.getByText(/^R\$\s*8\.000$/)).toBeInTheDocument();
    // … e o número da base bruta morta não aparece em lugar nenhum.
    expect(screen.queryByText(/^R\$\s*9\.700$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^R\$\s*10\.200$/)).not.toBeInTheDocument();

    const csv = await exportar();
    expect(csv).toContain('Resumo,Disponível para Repasse (R$),8000');
    expect(csv).not.toContain('9700');
  });

  it('sem termo comercial: "—" e a razão declarada, nunca um zero mudo', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin({ receitaLiquida: null })}
        loading={false}
        error={null}
      />,
    );
    expect(
      screen.getByText(
        'Sem termo comercial cadastrado: o disponível deste evento ainda não pode ser calculado.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^R\$\s*0$/)).not.toBeInTheDocument();
  });

  it('evento encerrado libera a retenção também na Caixa (RN-350)', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        contexto={{ encerrado: true }}
      />,
    );
    expect(screen.getByText(/^R\$\s*10\.000$/)).toBeInTheDocument();
  });
});

describe('A-1 · o CSV da Caixa não contradiz a tela', () => {
  it('com repasse: o CSV carrega a MESMA Σ que o card mostra', async () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin({ receitaBruta: 85617, receitaLiquida: 80000 })}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 2, total: 3200 }}
      />,
    );

    // O que a pessoa LÊ na tela (`formatBRL` do dashboard arredonda centavos;
    // o separador do Intl é NBSP — o `\s*` cobre os dois). Ancorado: o valor
    // do card, não a nota que também cita a Σ abatida.
    expect(screen.getByText(/^R\$\s*3\.200$/)).toBeInTheDocument();
    // E o disponível que ela lê já vem abatido, na base do saque:
    // 80.000 líquido − 12.000 de retenção − 3.200 de repasse.
    expect(screen.getByText(/^R\$\s*64\.800$/)).toBeInTheDocument();

    // O que ela LEVA na planilha — tem de ser o mesmo número, nas duas linhas.
    const csv = await exportar();
    expect(csv).toContain('Resumo,Valor Repassado (R$),3200');
    expect(csv).toContain('Resumo,Disponível para Repasse (R$),64800');
    expect(csv).not.toContain('Resumo,Valor Repassado (R$),0');
    expect(csv).not.toContain('Resumo,Disponível para Repasse (R$),68000');
  });

  it('sem repasse associado: o CSV segue em 0 (comportamento pré-T7 intacto)', async () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={null}
      />,
    );
    const csv = await exportar();
    expect(csv).toContain('Resumo,Valor Repassado (R$),0');
  });

  it('repasse com qtd 0 não vira linha de export (Σ vazia é ausência)', async () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 0, total: 0 }}
      />,
    );
    const csv = await exportar();
    expect(csv).toContain('Resumo,Valor Repassado (R$),0');
  });
});

describe('A-2 · o disponível ABATE o repasse (DEC-0727)', () => {
  /** O aviso do contorno. Morto o motivo, ele não pode voltar a aparecer. */
  const AVISO_MORTO =
    'Estimativa deste evento: não desconta os repasses já solicitados. O disponível oficial está em Eventos › Repasses.';

  it('com repasse vivo, o card diz o que JÁ desconta — e não a ressalva antiga', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 1, total: 1200 }}
      />,
    );
    expect(screen.getByText('Disponível para Repasse')).toBeInTheDocument();
    // Regex por causa do NBSP do Intl entre "R$" e o número. O card formata sem
    // centavos (`formatBRL` do dashboard); a NOTA, que afirma um valor
    // descontado, sai com centavos (`formatDinheiro` — R-5). Ela diz o que o
    // número desconta E onde está o número oficial de saque (R-3: o botão "Ver
    // todos os repasses" é navegação, não declaração de autoridade).
    expect(
      screen.getByText(
        /^Já desconta R\$\s*1\.200,00 em repasse deste evento\. O disponível oficial de saque está em Eventos › Repasses\.$/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(AVISO_MORTO)).not.toBeInTheDocument();
    expect(screen.queryByText(/não desconta/)).not.toBeInTheDocument();
  });

  // R-2 da review CAIXADISP-REV: repasse vivo MAIOR que o liberado do evento.
  // O clamp de RN-351 absorve só até 8.500; a nota não pode afirmar um desconto
  // de 9.000 que não aconteceu.
  it('repasse maior que o liberado: a nota declara o que ABSORVEU, não a Σ', () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 1, total: 9000 }}
      />,
    );
    // Disponível travado em 0 (nunca negativo) …
    expect(screen.getByText(/^R\$\s*0$/)).toBeInTheDocument();
    // … e a nota diz 8.500,00 (o liberado deste evento), não 9.000.
    expect(
      screen.getByText(
        /^Já desconta R\$\s*8\.500,00 em repasse deste evento\. O disponível oficial de saque está em Eventos › Repasses\.$/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Já desconta R\$\s*9\.000/)).not.toBeInTheDocument();
  });

  // R-5: o card arredonda (convenção do dashboard, mantida), mas a NOTA afirma
  // um valor descontado e é lida contra o extrato — e a MESMA Σ aparece com
  // centavos na tabela por evento de /eventos/repasses e no CSV.
  it('a nota do disponível é cent-exata: R$ 3.200,55 não vira "R$ 3.201"', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin({ receitaBruta: 85617, receitaLiquida: 80000 })}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 2, total: 3200.55 }}
      />,
    );
    expect(screen.getByText(/^Já desconta R\$\s*3\.200,55 em repasse/)).toBeInTheDocument();
    expect(screen.queryByText(/Já desconta R\$\s*3\.201/)).not.toBeInTheDocument();
    // O card do KPI segue arredondado — a convenção do dashboard não mudou.
    expect(screen.getByText(/^R\$\s*3\.201$/)).toBeInTheDocument();
  });

  it('sem repasse, nada a declarar no card do disponível', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={null}
      />,
    );
    expect(screen.queryByText(AVISO_MORTO)).not.toBeInTheDocument();
    expect(screen.queryByText(/Já desconta/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// O caso do painel §P-IAMENU-2, com números: o Castelo e os R$ 500
// ---------------------------------------------------------------------------

describe('o caso do Castelo (R$ 500 repassados) — antes × depois', () => {
  const CASTELO = mkFin();

  it('ANTES: sem repasse, disponível 8.500 e o CSV concorda', async () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={CASTELO}
        loading={false}
        error={null}
        repasseDoEvento={null}
      />,
    );
    expect(screen.getByText(/^R\$\s*8\.500$/)).toBeInTheDocument();
    const csv = await exportar();
    expect(csv).toContain('Resumo,Disponível para Repasse (R$),8500');
    expect(csv).toContain('Resumo,Valor Repassado (R$),0');
  });

  it('DEPOIS: com os R$ 500 na terça, a quarta mostra 8.000', async () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={CASTELO}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 1, total: 500 }}
      />,
    );
    // Os três números da tela.
    expect(screen.getByText(/^R\$\s*12\.000$/)).toBeInTheDocument();
    expect(screen.getByText(/^R\$\s*500$/)).toBeInTheDocument();
    expect(screen.getByText(/^R\$\s*8\.000$/)).toBeInTheDocument();
    // O número do mundo anterior não aparece em lugar nenhum da tela.
    expect(screen.queryByText(/^R\$\s*8\.500$/)).not.toBeInTheDocument();

    const csv = await exportar();
    expect(csv).toContain('Resumo,Receita Total (R$),12000');
    expect(csv).toContain('Resumo,Valor Repassado (R$),500');
    expect(csv).toContain('Resumo,Disponível para Repasse (R$),8000');
  });

  it('ESTORNO: repasse cancelado sai da Σ viva e o disponível volta a 8.500', async () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={CASTELO}
        loading={false}
        error={null}
        // cancelRepasse/rejectRepasse tiram o doc do conjunto vivo — a Σ que
        // chega à tela já é a de depois (`associarRepassesPorEvento`).
        repasseDoEvento={{ qtd: 0, total: 0 }}
      />,
    );
    expect(screen.getByText(/^R\$\s*8\.500$/)).toBeInTheDocument();
    const csv = await exportar();
    expect(csv).toContain('Resumo,Disponível para Repasse (R$),8500');
  });
});

// ---------------------------------------------------------------------------
// Itens 49 e 50 · a Caixa não promete mais do que o saque aceita, e não engole
// o erro que faria ela prometer
//
// 49: a Caixa é POR EVENTO; a janela D+N (RN-348) é do TENANT. A review mediu:
//     card R$ 8.500 × saque R$ 4.025. Default do dono: exibir o menor.
// 50: leitura do termo falhando cai no default de 15% EM SILÊNCIO — com um
//     termo negociado de 30% o card volta a prometer acima do saque. O
//     histórico da mesma tela já declara o erro dele; o card passa a fazer
//     igual.
// ---------------------------------------------------------------------------
describe('item 49 · o card exibe o menor entre evento e tenant', () => {
  it('o cenário MEDIDO: card 4.025 (o saque), não 8.500 (o evento)', async () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={mkFin()}
        loading={false}
        error={null}
        contexto={{ encerrado: false, disponivelTenant: 4025 }}
      />,
    );
    expect(screen.getByText(/^R\$\s*4\.025$/)).toBeInTheDocument();
    expect(screen.queryByText(/^R\$\s*8\.500$/)).not.toBeInTheDocument();
    // E o CSV, que é o que vai para a conciliação, sai do MESMO número.
    const csv = await exportar();
    expect(csv).toContain('Resumo,Disponível para Repasse (R$),4025');
  });

  it('a nota diz DE ONDE veio o corte — senão parece que o evento vendeu menos', () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={mkFin()}
        loading={false}
        error={null}
        contexto={{ encerrado: false, disponivelTenant: 4025 }}
      />,
    );
    expect(screen.getByText(/limitado pelo saldo disponível do produtor/i)).toBeInTheDocument();
    // O número do evento aparece NA FRASE (contexto), nunca como o valor do card.
    expect(screen.getByText(/R\$ 8\.500,00/)).toBeInTheDocument();
  });

  it('sem teto do tenant (leitura ainda não chegou) o card segue o evento, sem nota de corte', () => {
    render(
      <FinanceiroView slug="castelo" financeiro={mkFin()} loading={false} error={null} />,
    );
    expect(screen.getByText(/^R\$\s*8\.500$/)).toBeInTheDocument();
    expect(screen.queryByText(/limitado pelo saldo disponível/i)).not.toBeInTheDocument();
  });
});

describe('item 50 · erro de leitura não pode ser silêncio no card do dinheiro', () => {
  it('termo ilegível: o card DECLARA que usou 15% e pode estar acima do saque', () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={mkFin()}
        loading={false}
        error={null}
        termoErro={new Error('permission-denied')}
      />,
    );
    const nota = screen.getByText(/não foi possível ler o termo comercial/i);
    expect(nota).toBeInTheDocument();
    // Estado de ERRO, não rodapé cinza: a a11y não depende só da cor.
    expect(nota).toHaveAttribute('role', 'status');
    expect(nota.className).toContain('--text-danger');
  });

  it('saldo do tenant ilegível: o card DECLARA que o número é o do evento', () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={mkFin()}
        loading={false}
        error={null}
        tetoTenantErro={new Error('unavailable')}
      />,
    );
    expect(screen.getByText(/não foi possível ler o saldo do produtor/i)).toBeInTheDocument();
  });

  it('sem termo cadastrado ainda ganha a frase de sempre — ausência ≠ falha de leitura', () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={mkFin({ receitaLiquida: null })}
        loading={false}
        error={null}
        termoErro={new Error('boom')}
      />,
    );
    expect(screen.getByText(/sem termo comercial cadastrado/i)).toBeInTheDocument();
  });

  it('tudo lido: a nota do card NÃO vira alerta à toa', () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 1, total: 500 }}
        contexto={{ encerrado: false, disponivelTenant: 99000 }}
      />,
    );
    const nota = screen.getByText(/já desconta/i);
    expect(nota).not.toHaveAttribute('role', 'status');
    expect(nota.className).toContain('--text-tertiary');
  });
});
