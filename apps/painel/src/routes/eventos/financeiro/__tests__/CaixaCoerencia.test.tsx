// =============================================================================
// Coerência da Caixa do evento — achados A-1/A-2 da review antagonista IA-MENU,
// agora sob a DEC-0727 ("sim disponivel tem que abater o que já foi repassado,
// isso é muito imoprtante").
//
//   A-1 · o CSV exportado pelo botão da MESMA tela imprimia `repassado = 0`
//         enquanto a tela mostrava R$ 3.200,00. Export que contradiz a tela de
//         onde saiu é pior que export ausente: ele é o que vai para a planilha
//         de conciliação. Invariante mantida e ESTENDIDA ao disponível;
//   A-2 · o disponível era derivado com `repassado = 0` e a tela declarava a
//         estimativa. O aviso era o contorno; a DEC-0727 matou o motivo. Agora
//         o número ABATE e a nota diz o que ele já desconta — a asserção do
//         aviso antigo saiu com autorização do dono, e no lugar entrou a prova
//         numérica do caso do Castelo, antes × depois, na tela e no CSV.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Timestamp } from '@leela/core';
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

function mkFin(over: Partial<FinanceiroEvento> = {}): FinanceiroEvento {
  return {
    receitaBruta: 85617,
    receitaLiquida: 80000,
    taxaPct: 6.5,
    taxaValor: 5617,
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

describe('A-1 · o CSV da Caixa não contradiz a tela', () => {
  it('com repasse: o CSV carrega a MESMA Σ que o card mostra', async () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 2, total: 3200 }}
      />,
    );

    // O que a pessoa LÊ na tela (`formatBRL` do dashboard arredonda centavos;
    // o separador do Intl é NBSP — o `\s*` cobre os dois). Ancorado: o valor
    // do card, não a nota que agora também cita a Σ abatida.
    expect(screen.getByText(/^R\$\s*3\.200$/)).toBeInTheDocument();
    // E o disponível que ela lê já vem abatido: 85.617 − 12.842,55 − 3.200
    // (o card do dashboard exibe sem centavos; a planilha leva o valor exato).
    expect(screen.getByText(/^R\$\s*69\.574$/)).toBeInTheDocument();

    // O que ela LEVA na planilha — tem de ser o mesmo número, nas duas linhas.
    const csv = await exportar();
    expect(csv).toContain('Resumo,Valor repassado (R$),3200');
    expect(csv).toContain('Resumo,Valor disponível (R$),69574.45');
    expect(csv).not.toContain('Resumo,Valor repassado (R$),0');
    expect(csv).not.toContain('Resumo,Valor disponível (R$),72774.45');
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
    expect(csv).toContain('Resumo,Valor repassado (R$),0');
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
    expect(csv).toContain('Resumo,Valor repassado (R$),0');
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
    expect(screen.getByText('Valor disponível')).toBeInTheDocument();
    // Regex por causa do NBSP do Intl entre "R$" e o número (e o card do
    // dashboard formata sem centavos — `formatBRL`).
    expect(
      screen.getByText(/^Já desconta R\$\s*1\.200 em repasse deste evento\.$/),
    ).toBeInTheDocument();
    expect(screen.queryByText(AVISO_MORTO)).not.toBeInTheDocument();
    expect(screen.queryByText(/não desconta/)).not.toBeInTheDocument();
  });

  it('sem repasse, os quatro números fecham entre si — nada a declarar', () => {
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
  /** R$ 10.000 vendidos: retenção 1.500, liberado 8.500. */
  const CASTELO = mkFin({ receitaBruta: 10000 });

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
    expect(csv).toContain('Resumo,Valor disponível (R$),8500');
    expect(csv).toContain('Resumo,Valor repassado (R$),0');
  });

  it('DEPOIS: com os R$ 500 na terça, a quarta mostra 8.000 — a soma de cabeça fecha', async () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={CASTELO}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 1, total: 500 }}
      />,
    );
    // Os quatro números da tela: 10.000 = 8.000 + 1.500 + 500.
    expect(screen.getByText(/^R\$\s*10\.000$/)).toBeInTheDocument();
    expect(screen.getByText(/^R\$\s*500$/)).toBeInTheDocument();
    expect(screen.getByText(/^R\$\s*8\.000$/)).toBeInTheDocument();
    expect(screen.getByText(/^R\$\s*1\.500$/)).toBeInTheDocument();
    // O número do mundo anterior não aparece em lugar nenhum da tela.
    expect(screen.queryByText(/^R\$\s*8\.500$/)).not.toBeInTheDocument();

    const csv = await exportar();
    expect(csv).toContain('Resumo,Receita total (R$),10000');
    expect(csv).toContain('Resumo,Valor repassado (R$),500');
    expect(csv).toContain('Resumo,Valor disponível (R$),8000');
    expect(csv).toContain('Resumo,Valor a ser disponibilizado (R$),1500');
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
    expect(csv).toContain('Resumo,Valor disponível (R$),8500');
  });
});
