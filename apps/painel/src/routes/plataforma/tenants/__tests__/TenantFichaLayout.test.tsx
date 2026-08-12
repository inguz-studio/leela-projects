// =============================================================================
// TenantFichaLayout (ADMIN-VISAO onda 2 · S1612-T1).
//
// Os casos são o critério de aceite da S1612: a SubNav com as sete seções, o
// Resumo como rota índice, e a decisão de desenho da faixa de identidade (ela
// existe nas abas e NÃO existe no Resumo, que já tem o próprio cabeçalho —
// é o que evita nome duplicado sem reescrever a tela que está no ar).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type * as ReactRouter from 'react-router-dom';
import { TenantFichaLayout } from '../TenantFichaLayout';
import { mkTenant } from '../../_test/fixtures';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useTenantComOwner: vi.fn(),
}));

vi.mock('../../_data/tenants', () => ({
  useTenantComOwner: mocks.useTenantComOwner,
}));

vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof ReactRouter>('react-router-dom');
  return { ...real, useNavigate: () => mocks.navigate };
});

const TID = 'castelo-producoes';

function renderEm(pathname: string): void {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route path="/plataforma/tenants/:tenantId" element={<TenantFichaLayout />}>
          <Route index element={<div>conteudo do resumo</div>} />
          <Route path="vendas" element={<div>conteudo de vendas</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useTenantComOwner.mockReturnValue({
    tenant: mkTenant(),
    owner: null,
    loading: false,
    error: null,
  });
});

describe('TenantFichaLayout', () => {
  it('mostra a SubNav com as sete seções da spec', () => {
    renderEm(`/plataforma/tenants/${TID}`);
    const nav = screen.getByRole('navigation', { name: 'Seções da ficha do tenant' });
    for (const label of ['Resumo', 'Eventos', 'Clubs', 'Clientes', 'Vendas', 'Financeiro', 'Termos']) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
  });

  it('o Resumo é a rota índice e o conteúdo dele entra pelo Outlet', () => {
    renderEm(`/plataforma/tenants/${TID}`);
    expect(screen.getByText('conteudo do resumo')).toBeInTheDocument();
  });

  it('NÃO repete o nome do tenant no Resumo — a tela que está no ar já o traz', () => {
    renderEm(`/plataforma/tenants/${TID}`);
    expect(screen.queryByRole('heading', { name: 'Castelo Produções' })).not.toBeInTheDocument();
  });

  it('mostra o nome do tenant nas outras abas — tabela sem dono é tabela de ninguém', () => {
    renderEm(`/plataforma/tenants/${TID}/vendas`);
    expect(screen.getByRole('heading', { name: 'Castelo Produções' })).toBeInTheDocument();
    expect(screen.getByText('conteudo de vendas')).toBeInTheDocument();
  });

  it('marca a aba da rota atual como a página corrente', () => {
    renderEm(`/plataforma/tenants/${TID}/vendas`);
    expect(screen.getByRole('link', { name: /Vendas/ })).toHaveAttribute('aria-current', 'page');
  });

  it('os links carregam href de verdade (ctrl+clique e copiar endereço continuam funcionando)', () => {
    renderEm(`/plataforma/tenants/${TID}`);
    expect(screen.getByRole('link', { name: /Financeiro/ })).toHaveAttribute(
      'href',
      `/plataforma/tenants/${TID}/financeiro`
    );
  });

  it('clique simples navega por SPA, sem recarregar o documento', async () => {
    const user = userEvent.setup();
    renderEm(`/plataforma/tenants/${TID}`);
    await user.click(screen.getByRole('link', { name: /Clientes/ }));
    expect(mocks.navigate).toHaveBeenCalledWith(`/plataforma/tenants/${TID}/clientes`);
  });

  it('enquanto o tenant carrega, a faixa não inventa nome', () => {
    mocks.useTenantComOwner.mockReturnValue({
      tenant: null,
      owner: null,
      loading: true,
      error: null,
    });
    renderEm(`/plataforma/tenants/${TID}/vendas`);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
