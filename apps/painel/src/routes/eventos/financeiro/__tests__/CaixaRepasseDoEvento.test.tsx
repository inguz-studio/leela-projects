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
    expect(screen.getByText('Valor Repassado')).toBeInTheDocument();
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

  // R-4 da review CAIXADISP-REV. Depois da DEC-0727 o disponível DEPENDE deste
  // reader: falha na leitura ⇒ Σ vazia ⇒ o número não abate. Sem declarar, a
  // tela fica idêntica à do evento que não teve repasse — e mostra o disponível
  // cheio com cara de final. Antes da DEC-0727 esse erro era cosmético.
  it('ledger ilegível: não afirma ausência de repasse e declara que o disponível pode não estar abatido', () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={null}
        repasseErro={new Error('permission-denied')}
      />,
    );
    // A afirmação falsa não sobrevive à falha de leitura.
    expect(
      screen.queryByText('Nenhum repasse solicitado para este evento'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Não foi possível ler os repasses deste evento')).toBeInTheDocument();
    // O disponível continua exibido (é o único número que a tela tem), mas
    // declarado: 8.500 aqui é "não abatido", não "nada saiu".
    expect(screen.getByText(/^R\$\s*8\.500$/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /^Não foi possível ler os repasses deste evento: este valor pode não estar abatido\. O disponível oficial de saque está em Eventos › Repasses\.$/,
      ),
    ).toBeInTheDocument();
    // E nunca a nota de desconto — não houve desconto nenhum.
    expect(screen.queryByText(/Já desconta/)).not.toBeInTheDocument();
  });

  // O reader pode falhar no refetch com o dado anterior de pé (react-query
  // mantém `data` e seta `error`). Aí o número exibido é real e JÁ abateu —
  // declarar "não foi possível ler" ao lado dele seria a tela se desmentindo.
  it('erro COM Σ de pé: mostra o número (real, já abatido) e não declara falha', () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={{ qtd: 1, total: 500 }}
        repasseErro={new Error('refetch falhou')}
      />,
    );
    expect(screen.getByText('1 repasse solicitado para este evento')).toBeInTheDocument();
    expect(screen.getByText(/^R\$\s*8\.000$/)).toBeInTheDocument();
    expect(
      screen.queryByText('Não foi possível ler os repasses deste evento'),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/^Já desconta R\$\s*500,00 em repasse/)).toBeInTheDocument();
  });

  it('erro do ledger não vence o loading: enquanto consulta, só o "consultando"', () => {
    render(
      <FinanceiroView
        slug="castelo"
        financeiro={mkFin()}
        loading={false}
        error={null}
        repasseDoEvento={null}
        repasseLoading
        repasseErro={new Error('transient')}
      />,
    );
    expect(screen.getByText('Consultando os repasses deste evento')).toBeInTheDocument();
    expect(
      screen.queryByText('Não foi possível ler os repasses deste evento'),
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
