// =============================================================================
// RequireSessao (LEELA-FIX-AUTHGUARD) — guard de autenticação da branch com
// shell: produção sem sessão → /entrar com state.from; modo Emulator → inerte
// (preview local mockado intacto); sessão que morre em rota profunda → mesmo
// redirect preservando o destino.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { avaliarSessao, RequireSessao } from '../RequireSessao';

// Estado controlável dos módulos de ambiente/sessão (vi.hoisted evita TDZ).
const { ambiente, sessao } = vi.hoisted(() => ({
  ambiente: { emulador: false },
  sessao: {
    listener: null as ((user: { uid: string } | null) => void) | null,
    unsubscribe: vi.fn(),
  },
}));

vi.mock('../../../lib/firebase', () => ({
  isModoEmulador: () => ambiente.emulador,
}));

vi.mock('@leela/api-client', () => ({
  onSessionChange: (cb: (user: { uid: string } | null) => void) => {
    sessao.listener = cb;
    return sessao.unsubscribe;
  },
}));

/** Emite um evento de sessão como o Firebase Auth faria (login/logout/restore). */
function emitirSessao(user: { uid: string } | null): void {
  act(() => {
    sessao.listener?.(user);
  });
}

/** Stub de /entrar que expõe o state.from recebido (contrato S020-T1). */
function EntrarStub(): JSX.Element {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return <div>Tela de login · from={from ?? '(vazio)'}</div>;
}

function renderGuard(rotaInicial = '/'): void {
  render(
    <MemoryRouter initialEntries={[rotaInicial]}>
      <Routes>
        <Route path="/entrar" element={<EntrarStub />} />
        <Route
          path="/*"
          element={
            <RequireSessao>
              <div>Shell autenticado</div>
            </RequireSessao>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ambiente.emulador = false;
  sessao.listener = null;
});

// ---------------------------------------------------------------------------
// avaliarSessao — decisão pura
// ---------------------------------------------------------------------------

describe('avaliarSessao (decisão pura)', () => {
  it('guard inerte (modo Emulator) → render, qualquer status', () => {
    expect(avaliarSessao(false, 'loading')).toBe('render');
    expect(avaliarSessao(false, 'anonymous')).toBe('render');
    expect(avaliarSessao(false, 'authenticated')).toBe('render');
  });

  it('guard ativo → loading espera; anonymous → login; authenticated → render', () => {
    expect(avaliarSessao(true, 'loading')).toBe('loading');
    expect(avaliarSessao(true, 'anonymous')).toBe('login');
    expect(avaliarSessao(true, 'authenticated')).toBe('render');
  });
});

// ---------------------------------------------------------------------------
// RequireSessao — integração (router real + ambiente/sessão mockados)
// ---------------------------------------------------------------------------

describe('RequireSessao (guard da branch com shell)', () => {
  it('modo Emulator: renderiza direto, sem assinar sessão (preview mockado intacto)', () => {
    ambiente.emulador = true;
    renderGuard();
    expect(screen.getByText('Shell autenticado')).toBeInTheDocument();
    // Guard inerte nem observa a sessão — zero mudança de comportamento local.
    expect(sessao.listener).toBeNull();
  });

  it('produção, restauração pendente: placeholder, nunca decide a meio caminho', () => {
    renderGuard();
    expect(screen.getByRole('status', { name: 'Verificando sessão' })).toBeInTheDocument();
    expect(screen.queryByText('Shell autenticado')).toBeNull();
    expect(screen.queryByText(/Tela de login/)).toBeNull();
  });

  it('produção, sem sessão: raiz redireciona para /entrar com from=/', () => {
    renderGuard('/');
    emitirSessao(null);
    expect(screen.getByText('Tela de login · from=/')).toBeInTheDocument();
  });

  it('produção, sem sessão em rota profunda: from preserva caminho + query', () => {
    renderGuard('/eventos/e1/inscritos?f=pendentes');
    emitirSessao(null);
    expect(
      screen.getByText('Tela de login · from=/eventos/e1/inscritos?f=pendentes'),
    ).toBeInTheDocument();
  });

  it('produção, com sessão: renderiza o shell (nada muda para o logado)', () => {
    renderGuard('/eventos/e1');
    emitirSessao({ uid: 'u1' });
    expect(screen.getByText('Shell autenticado')).toBeInTheDocument();
  });

  it('produção, sessão morre em rota profunda (logout/expiração): mesmo redirect com from', () => {
    renderGuard('/crm/clientes?tab=ativos');
    emitirSessao({ uid: 'u1' });
    expect(screen.getByText('Shell autenticado')).toBeInTheDocument();
    emitirSessao(null);
    expect(screen.getByText('Tela de login · from=/crm/clientes?tab=ativos')).toBeInTheDocument();
  });

  it('desmonta → cancela a assinatura da sessão (sem listener vazando)', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <RequireSessao>
          <div>Shell autenticado</div>
        </RequireSessao>
      </MemoryRouter>,
    );
    unmount();
    expect(sessao.unsubscribe).toHaveBeenCalled();
  });
});
