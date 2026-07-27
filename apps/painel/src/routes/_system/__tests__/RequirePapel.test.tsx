import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import type { EventoOutletContext } from '../../eventos/evento/EventoLayout';
import { avaliarAcesso, RequirePapel } from '../RequirePapel';

// Estado controlável dos hooks de dados (vi.hoisted evita TDZ na fábrica).
const { papelState, sessionState } = vi.hoisted(() => ({
  papelState: { current: { papel: null as string | null, loading: false } },
  sessionState: {
    current: { status: 'authenticated' as string, uid: 'u1' as string | null, tenantId: 't1' as string | null },
  },
}));

vi.mock('../../eventos/_data/papelEvento', () => ({
  usePapelEvento: () => papelState.current,
}));
vi.mock('../../../lib/session/tenantSession', () => ({
  useTenantSession: () => sessionState.current,
}));

// ---------------------------------------------------------------------------
// avaliarAcesso — decisão pura casada com a matriz podeAcessar (@leela/core)
// ---------------------------------------------------------------------------

describe('avaliarAcesso (403 casado com a matriz RN-320)', () => {
  it('operador em financeiro → forbidden (célula false)', () => {
    expect(
      avaliarAcesso({ status: 'authenticated', papel: 'operador', loading: false }, 'financeiro'),
    ).toBe('forbidden');
  });

  it('operador em entrega → allow (balcão)', () => {
    expect(
      avaliarAcesso({ status: 'authenticated', papel: 'operador', loading: false }, 'entrega'),
    ).toBe('allow');
  });

  it('financeiro em financeiro → allow; em pagina_vendas → forbidden', () => {
    expect(
      avaliarAcesso({ status: 'authenticated', papel: 'financeiro', loading: false }, 'financeiro'),
    ).toBe('allow');
    expect(
      avaliarAcesso({ status: 'authenticated', papel: 'financeiro', loading: false }, 'pagina_vendas'),
    ).toBe('forbidden');
  });

  it('administrador NÃO acessa financeiro (dinheiro é organizador/financeiro)', () => {
    expect(
      avaliarAcesso({ status: 'authenticated', papel: 'administrador', loading: false }, 'financeiro'),
    ).toBe('forbidden');
    expect(
      avaliarAcesso({ status: 'authenticated', papel: 'administrador', loading: false }, 'configuracoes'),
    ).toBe('allow');
  });

  it('organizador acessa qualquer área', () => {
    expect(
      avaliarAcesso({ status: 'authenticated', papel: 'organizador', loading: false }, 'financeiro'),
    ).toBe('allow');
  });

  it('não autenticado → login (não 403), independente da área', () => {
    expect(
      avaliarAcesso({ status: 'anonymous', papel: null, loading: false }, 'financeiro'),
    ).toBe('login');
  });

  it('autenticado sem papel no evento → forbidden', () => {
    expect(
      avaliarAcesso({ status: 'authenticated', papel: null, loading: false }, 'inscritos'),
    ).toBe('forbidden');
  });

  it('sessão/claims carregando → loading', () => {
    expect(
      avaliarAcesso({ status: 'authenticated', papel: null, loading: true }, 'inscritos'),
    ).toBe('loading');
    expect(
      avaliarAcesso({ status: 'loading', papel: null, loading: false }, 'inscritos'),
    ).toBe('loading');
  });
});

// ---------------------------------------------------------------------------
// RequirePapel — integração (Outlet context real + hooks mockados)
// ---------------------------------------------------------------------------

function renderGuard(area: Parameters<typeof RequirePapel>[0]['area']): void {
  const ctx = { evento: { id: 'e1', organizadorId: 'owner' } } as unknown as EventoOutletContext;
  render(
    <MemoryRouter initialEntries={['/eventos/e1/area']}>
      <Routes>
        <Route path="/eventos/:slug" element={<Outlet context={ctx} />}>
          <Route
            path="area"
            element={
              <RequirePapel area={area}>
                <div>Conteúdo da área</div>
              </RequirePapel>
            }
          />
        </Route>
        <Route path="/entrar" element={<div>Tela de login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequirePapel (guarda de 403 · S501-T1)', () => {
  beforeEach(() => {
    papelState.current = { papel: null, loading: false };
    sessionState.current = { status: 'authenticated', uid: 'u1', tenantId: 't1' };
  });

  it('operador em financeiro → renderiza o 403 (Forbidden), não a página', () => {
    papelState.current = { papel: 'operador', loading: false };
    renderGuard('financeiro');
    expect(screen.getByRole('heading', { name: 'Esse espaço ainda não é seu' })).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo da área')).toBeNull();
  });

  it('organizador em financeiro → renderiza a página (allow)', () => {
    papelState.current = { papel: 'organizador', loading: false };
    renderGuard('financeiro');
    expect(screen.getByText('Conteúdo da área')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Esse espaço ainda não é seu' })).toBeNull();
  });

  it('não autenticado → redireciona para login (não 403)', () => {
    sessionState.current = { status: 'anonymous', uid: null, tenantId: null };
    papelState.current = { papel: null, loading: false };
    renderGuard('financeiro');
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Esse espaço ainda não é seu' })).toBeNull();
  });

  it('carregando → placeholder de verificação (nunca decide a meio caminho)', () => {
    papelState.current = { papel: null, loading: true };
    renderGuard('financeiro');
    expect(screen.getByRole('status', { name: 'Verificando permissão' })).toBeInTheDocument();
  });
});
