// =============================================================================
// Pré-requisito do saque — risco de regressão #5 da rodada IA-MENU.
//
// Até aqui, "tem dados bancários" era garantido por PROXIMIDADE: o formulário
// ficava logo abaixo do botão de saque. Com o cadastro em Configurações
// (RN-366), a garantia virou decisão explícita — e é isso que este arquivo
// prova, dos dois lados:
//
//   sem dado  → o caminho para Configurações aparece, o botão não habilita e o
//               modal de saque NÃO monta (o servidor recusaria — RN-352);
//   com dado  → o saque funciona igual a hoje, inclusive a escolha do evento
//               (RN-349), e o aviso de pré-requisito some.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { DadosBancarios, SaldoRepasse, Timestamp } from '@leela/core';
import { RepassesView, type RepassesViewProps } from '../RepassesView';

// Fixtures no MESMO formato dos testes vizinhos (SaldoCards,
// SolicitarRepasseModal) — nenhum shape novo inventado.
function ts(ms: number): Timestamp {
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  };
}

const SALDO: SaldoRepasse = {
  tenantId: 'castelo',
  vendidoBruto: 10000,
  retido: 1500,
  disponivel: 8500,
  comprometido: 0,
  dentroJanelaDN: 0,
  eventosSemTermo: 0,
  atualizadoEm: ts(Date.UTC(2026, 3, 15)),
};

const DADOS: DadosBancarios = {
  tenantId: 'castelo',
  banco: '260 — Nubank',
  agencia: '0001',
  contaMascarada: '****1234',
  tipo: 'corrente',
  pixMascarado: null,
  titular: 'Marina Castelo',
  cpfCnpjMascarado: '***.***.***-12',
  criadoEm: ts(0),
  atualizadoEm: ts(0),
};

function props(over: Partial<RepassesViewProps> = {}): RepassesViewProps {
  return {
    saldo: SALDO,
    saldoLoading: false,
    saldoError: null,
    onRetrySaldo: vi.fn(),
    porEvento: [],
    porEventoLoading: false,
    porEventoError: null,
    onRetryPorEvento: vi.fn(),
    dadosBancarios: null,
    dbLoading: false,
    dbError: null,
    onRetryDb: vi.fn(),
    solicitarRunning: false,
    onSolicitar: vi.fn().mockResolvedValue(true),
    historico: [],
    histLoading: false,
    histError: null,
    onRetryHist: vi.fn(),
    ...over,
  };
}

function Pathname(): JSX.Element {
  const { pathname } = useLocation();
  return <span data-testid="pathname">{pathname}</span>;
}

function renderView(over: Partial<RepassesViewProps> = {}) {
  return render(
    <MemoryRouter initialEntries={['/eventos/repasses']}>
      <RepassesView {...props(over)} />
      <Routes>
        <Route path="*" element={<Pathname />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RepassesView — pré-requisito do saque (risco #5)', () => {
  it('SEM dados de recebimento: mostra o caminho para Configurações', () => {
    renderView({ dadosBancarios: null });
    expect(screen.getByText('Cadastre seus dados de recebimento')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para Configurações' })).toBeInTheDocument();
  });

  it('SEM dados: o botão de saque não habilita e o modal NÃO monta', async () => {
    renderView({ dadosBancarios: null });
    const botao = screen.getByRole('button', { name: 'Solicitar repasse' });
    expect(botao).toBeDisabled();
    // Mesmo forçando o clique, nenhum diálogo de saque existe para abrir —
    // a proteção não depende só do `disabled` do botão.
    await userEvent.click(botao);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('SEM dados: o caminho leva mesmo a /conta (não é um botão decorativo)', async () => {
    renderView({ dadosBancarios: null });
    await userEvent.click(screen.getByRole('button', { name: 'Ir para Configurações' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/conta');
  });

  it('COM dados: o aviso some e o saque abre normalmente', async () => {
    renderView({ dadosBancarios: DADOS });
    expect(screen.queryByText('Cadastre seus dados de recebimento')).not.toBeInTheDocument();
    const botao = screen.getByRole('button', { name: 'Solicitar repasse' });
    expect(botao).toBeEnabled();
    await userEvent.click(botao);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('o formulário de cadastro NÃO vive mais nesta tela (mudou para /conta)', () => {
    renderView({ dadosBancarios: null });
    expect(screen.queryByRole('form', { name: 'Dados bancários' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Banco')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Agência')).not.toBeInTheDocument();
  });

  it('enquanto o dado carrega, NÃO anuncia "faltam dados" (nem sugere saque)', () => {
    renderView({ dadosBancarios: null, dbLoading: true });
    expect(screen.queryByText('Cadastre seus dados de recebimento')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Carregando dados de recebimento' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar repasse' })).toBeDisabled();
  });

  it('erro ao ler o dado: oferece retry e não acusa falta de cadastro', async () => {
    const onRetryDb = vi.fn();
    renderView({ dadosBancarios: null, dbError: new Error('falhou'), onRetryDb });
    expect(screen.queryByText('Cadastre seus dados de recebimento')).not.toBeInTheDocument();
    expect(
      screen.getByText('Não foi possível verificar seus dados de recebimento.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetryDb).toHaveBeenCalledOnce();
  });

  it('RN-358: o consolidado segue declarado na própria superfície', () => {
    renderView({ dadosBancarios: DADOS });
    expect(
      screen.getByText('Saldo e repasses consolidados de todos os seus eventos'),
    ).toBeInTheDocument();
  });
});
