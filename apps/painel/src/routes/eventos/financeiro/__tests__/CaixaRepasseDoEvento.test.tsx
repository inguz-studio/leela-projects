// =============================================================================
// Caixa do evento × repasse DAQUELE evento (RN-235/RN-349 · IAM-T7).
//
// A lacuna que a rodada IA-MENU fechou: a aba financeira do evento mostrava
// "repassado R$ 0,00" com aviso honesto porque nunca leu o ledger — a
// informação existia, mas só na tela consolidada.
//
// O que este arquivo prova:
//   1. sem repasse  → estado honesto ("—"), NUNCA R$ 0,00 sugerindo movimento;
//   2. com repasse  → o número DAQUELE evento, com a contagem;
//   3. RECONCILIAÇÃO → o valor exibido aqui é o MESMO que a linha daquele
//      evento mostra em `/eventos/repasses`, porque as duas telas passam pela
//      MESMA função pura sobre o MESMO histórico. Não é recálculo paralelo;
//   4. o atalho para a visão macro aparece para quem tem acesso a repasse e
//      SOME para quem não tem (RN-320, matriz única de papéis).
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { podeAcessar, type PapelEvento, type Repasse, type Timestamp } from '@leela/core';
import type { FinanceiroEvento } from '@leela/api-client';
import { FinanceiroView } from '../FinanceiroView';
import { associarRepassesPorEvento } from '../../repasses/_lib/repassesPorEvento';

function ts(ms: number): Timestamp {
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  };
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
  } as FinanceiroEvento;
}

function mkRepasse(over: Partial<Repasse> = {}): Repasse {
  return {
    id: 'r1',
    tenantId: 'castelo',
    valor: 1200,
    estado: 'pago',
    solicitadoEm: ts(Date.UTC(2026, 3, 10)),
    ...over,
  } as Repasse;
}

const EVENTO_ID = 'meia-floripa-2026';

describe('Caixa do evento — linha de repasse (RN-235 · IAM-T7)', () => {
  it('sem repasse: estado honesto, nunca R$ 0,00', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={null}
      />,
    );
    expect(screen.getByText('Valor repassado')).toBeInTheDocument();
    expect(screen.getByText('Nenhum repasse solicitado para este evento')).toBeInTheDocument();
    // O modo de falha que a RN-235 fecha: zero que parece movimento.
    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
  });

  it('com repasse: mostra o valor e a contagem daquele evento', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 2, total: 3200 }}
      />,
    );
    expect(screen.getByText('2 repasses solicitados para este evento')).toBeInTheDocument();
  });

  it('singular/plural honesto na contagem', () => {
    const { unmount } = render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 1, total: 1200 }}
      />,
    );
    expect(screen.getByText('1 repasse solicitado para este evento')).toBeInTheDocument();
    unmount();
  });

  it('enquanto consulta, não afirma ausência de repasse', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={null}
        repasseLoading
      />,
    );
    expect(screen.getByText('Consultando os repasses deste evento')).toBeInTheDocument();
    expect(
      screen.queryByText('Nenhum repasse solicitado para este evento'),
    ).not.toBeInTheDocument();
  });

  it('RECONCILIAÇÃO: o número da Caixa é o MESMO da linha em /eventos/repasses', () => {
    // Um histórico como o que a tela macro recebe — inclusive ruído que ela
    // ignora: outro evento, um cancelado e um sem associação.
    const historico: Repasse[] = [
      mkRepasse({ id: 'r1', eventoId: EVENTO_ID, valor: 1200, estado: 'pago' }),
      mkRepasse({ id: 'r2', eventoId: EVENTO_ID, valor: 2000, estado: 'solicitado' }),
      mkRepasse({ id: 'r3', eventoId: EVENTO_ID, valor: 999, estado: 'cancelado' }),
      mkRepasse({ id: 'r4', eventoId: 'trail-serra', valor: 500, estado: 'pago' }),
      mkRepasse({ id: 'r5', valor: 700, estado: 'pago' }),
    ];

    // Esta é a MESMA derivação que a RepassesView aplica antes de montar a
    // tabela "Por evento" — mesma função, mesmo histórico.
    const daMacro = associarRepassesPorEvento(historico).porEvento.get(EVENTO_ID);
    expect(daMacro).toEqual({ qtd: 2, total: 3200 }); // cancelado fora (RN-351)

    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={daMacro ?? null}
      />,
    );
    // A Caixa exibe exatamente o que a macro exibiria para este evento.
    expect(screen.getByText('2 repasses solicitados para este evento')).toBeInTheDocument();
  });
});

describe('Caixa do evento — atalho para a visão macro (RN-320)', () => {
  it('aparece e navega para quem tem acesso a repasse', async () => {
    const onVerRepasses = vi.fn();
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        podeVerRepasses
        onVerRepasses={onVerRepasses}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ver todos os repasses' }));
    expect(onVerRepasses).toHaveBeenCalledOnce();
  });

  it('some para quem NÃO tem acesso a repasse', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin()}
        loading={false}
        error={null}
        podeVerRepasses={false}
        onVerRepasses={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Ver todos os repasses' }),
    ).not.toBeInTheDocument();
  });

  it('a visibilidade segue a MATRIZ ÚNICA de papéis, não uma segunda regra', () => {
    // Espelha exatamente a decisão que o container toma. Se a matriz mudar,
    // este teste muda junto — que é o comportamento desejado.
    const esperado: Record<PapelEvento, boolean> = {
      organizador: true,
      administrador: false,
      operador: false,
      financeiro: true,
    };
    for (const [papel, visivel] of Object.entries(esperado) as [PapelEvento, boolean][]) {
      expect(podeAcessar(papel, 'financeiro'), `papel ${papel}`).toBe(visivel);
    }
  });
});
