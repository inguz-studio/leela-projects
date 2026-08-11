// =============================================================================
// AssessoriasPage — o "layout quebrado" que o dono nomeou no D-1008-R16.
//
// A página era a fora-da-lei da área: menu da área DENTRO de uma coluna
// `mx-auto max-w-5xl` com `px-0` e header custom (h1 solto), enquanto TODAS as
// irmãs abriam com PageHeader canônico e menu full-width — o menu saltava de
// posição e largura ao trocar de aba. Este arquivo pina o conserto:
//
//   1. a página NÃO desenha menu de área nenhum — o menu é da MOLDURA
//      (ParceriasAreaLayout), e página que volta a colar menu reabre o defeito
//      (o teste de moldura pega o duplo; este pega a recidiva na origem);
//   2. o header é o PageHeader canônico (h1 + subtítulo + ação primária),
//      como nas irmãs.
//
// Estados de dado (lista/vazio/erro) têm cobertura leve aqui; o fluxo de
// encerrar parceria é do ConfirmModal §2.15 e das suítes de servidor.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import type { ParceriaAssessoria } from '@leela/core';

const mocks = vi.hoisted(() => ({
  useParceriasAssessoria: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  encerrarParceriaAssessoria: vi.fn(),
}));

vi.mock('../../../../lib/session/tenantSession', () => ({
  useTenantSession: () => ({ status: 'authenticated', uid: 'u-1', tenantId: 't-1' }),
}));

vi.mock('../_data/assessorias', () => ({
  useParceriasAssessoria: mocks.useParceriasAssessoria,
}));

const { AssessoriasPage } = await import('../AssessoriasPage');

function parceria(over: Partial<ParceriaAssessoria> = {}): ParceriaAssessoria {
  return {
    id: 'p-1',
    nome: 'Assessoria Alfa',
    documento: { tipo: 'cnpj', valor: '12345678000190' },
    status: 'ativa',
    responsavelEmail: 'alfa@exemplo.com',
    condicaoDesconto: null,
    ...over,
  } as ParceriaAssessoria;
}

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/parcerias/assessorias']}>
      <ToastProvider>
        <AssessoriasPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.useParceriasAssessoria.mockReturnValue({
    data: [parceria()],
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
});

describe('AssessoriasPage · anatomia da área (D-1008-R16)', () => {
  it('NÃO desenha menu de área — o menu é da moldura (ParceriasAreaLayout)', () => {
    renderPage();
    expect(screen.queryByRole('navigation', { name: 'Seções de parcerias' })).toBeNull();
  });

  it('abre com o PageHeader canônico, como as abas irmãs', () => {
    renderPage();
    // O h1 do PageHeader, não mais o header custom da coluna 5xl.
    expect(screen.getByRole('heading', { level: 1, name: 'Assessorias parceiras' })).toBeInTheDocument();
    // Subtítulo (D-1008-R8: sem o jargão "(E18)") e ação primária no slot.
    expect(
      screen.getByText('Clubs parceiros com condição de desconto exclusiva, sem comissão e sem divisão de receita.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastrar assessoria' })).toBeInTheDocument();
  });

  it('lista as parcerias na Table canônica', () => {
    renderPage();
    expect(screen.getByRole('table', { name: 'Assessorias parceiras do organizador' })).toBeInTheDocument();
    expect(screen.getByText('Assessoria Alfa')).toBeInTheDocument();
  });

  it('vazio honesto quando não há parceria', () => {
    mocks.useParceriasAssessoria.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Nenhuma assessoria cadastrada')).toBeInTheDocument();
  });
});
