// =============================================================================
// Coerência da Caixa do evento — achados A-1/A-2 da review antagonista IA-MENU.
//
// O IAM-T7 passou a exibir em "Valor repassado" a Σ REAL do ledger daquele
// evento. Duas coisas ficaram para trás e este arquivo as trava:
//
//   A-1 · o CSV exportado pelo botão da MESMA tela seguia imprimindo
//         `derivarRepasse().repassado`, cravado em 0 — a pessoa lia R$ 3.200,00
//         na tela e exportava "Valor repassado (R$),0". Export que contradiz a
//         tela de onde saiu é pior que export ausente: ele é o que vai para a
//         planilha de conciliação;
//   A-2 · `disponivel` é derivado com `repassado = 0`. Enquanto o card ao lado
//         mostrava R$ 0,00 os quatro números fechavam; com o repasse real ao
//         lado, não fecham mais. A tela passa a DECLARAR a estimativa — mesma
//         disciplina já ratificada na visão macro ("disponível estimado" não
//         abate os repasses solicitados).
//
// Nenhuma asserção existente foi tocada: este arquivo só acrescenta.
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

function mkFin(): FinanceiroEvento {
  return {
    receitaBruta: 85617,
    receitaLiquida: 80000,
    taxaPct: 6.5,
    taxaValor: 5617,
    inscritos: { total: 3, porModalidade: {}, porKit: {}, porStatus: {} },
    receitaPorModalidade: {},
    atualizadoEm: ts(Date.UTC(2026, 3, 15)),
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
    // o separador do Intl é NBSP — casamos o número).
    expect(screen.getByText(/3\.200/)).toBeInTheDocument();

    // O que ela LEVA na planilha — tem de ser o mesmo número.
    const csv = await exportar();
    expect(csv).toContain('Resumo,Valor repassado (R$),3200');
    expect(csv).not.toContain('Resumo,Valor repassado (R$),0');
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

describe('A-2 · o disponível declara que não abate o repasse', () => {
  const NOTA =
    'Estimativa deste evento: não desconta os repasses já solicitados. O disponível oficial está em Eventos › Repasses.';

  it('com repasse vivo, o card de disponível declara a estimativa', () => {
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
    expect(screen.getByText(NOTA)).toBeInTheDocument();
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
    expect(screen.queryByText(NOTA)).not.toBeInTheDocument();
  });
});
