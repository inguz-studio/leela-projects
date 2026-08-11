// =============================================================================
// ClubesRoutes — precedência de rota estática sobre o coringa `:slug`, na
// ÁRVORE REAL.
//
// O risco é conhecido e já mordeu esta subárvore antes: `:slug` casa com
// QUALQUER segmento, então uma rota estática declarada depois dele renderiza
// "Club não encontrado" em vez da tela (foi o fix #14, com `novo`). Este teste
// prova a precedência — inclusive a dos REDIRECTS legados da migração para
// Parcerias (D-1008-R17): sem precedência, o link salvo de
// `/clubes/assessorias` viraria "Club não encontrado" em vez de redirecionar.
// O destino RESOLVIDO dos redirects é coberto pelo gate da RN-234
// (`_system/__tests__/RotasLegadas.test.tsx`); aqui a asserção é que a
// subárvore SAI para o endereço novo, não que o endereço novo abre.
//
// As telas viram marcadores: o que está sob teste é o ROTEAMENTO. O conteúdo
// tem suíte própria.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';

vi.mock('../hub/HubRoute', () => ({ HubRoute: () => <div data-testid="alvo">hub</div> }));
vi.mock('../novo/NovoClubePage', () => ({
  NovoClubePage: () => <div data-testid="alvo">novo-club</div>,
}));
vi.mock('../engajamento/EngajamentoPage', () => ({
  EngajamentoPage: () => <div data-testid="alvo">engajamento</div>,
}));
vi.mock('../clube/ClubeLayout', () => ({
  ClubeLayout: () => {
    const { slug } = useParams();
    return <div data-testid="alvo">{`club:${slug ?? ''}`}</div>;
  },
}));

const { ClubesRoutes } = await import('../ClubesRoutes');

/** Sonda de rota: para redirect, o pathname final é a asserção. */
function Sonda(): JSX.Element {
  const { pathname } = useLocation();
  return <div data-testid="rota">{pathname}</div>;
}

/** Monta o módulo no MESMO ponto do App.tsx (`/clubes/*`). */
function resolverEm(rota: string): { tela: string; pathname: string } {
  const { unmount } = render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/clubes/*" element={<ClubesRoutes />} />
      </Routes>
      <Sonda />
    </MemoryRouter>,
  );
  const tela = screen.queryByTestId('alvo')?.textContent ?? '';
  const pathname = screen.getByTestId('rota').textContent ?? '';
  unmount();
  return { tela, pathname };
}

describe('ClubesRoutes · rota estática vence o coringa :slug', () => {
  it('/clubes/engajamento abre a análise da comunidade, não um club chamado "engajamento"', () => {
    expect(resolverEm('/clubes/engajamento').tela).toBe('engajamento');
  });

  it.each([
    ['/clubes', 'hub'],
    ['/clubes/novo', 'novo-club'],
  ])('%s continua resolvendo em %s', (rota, esperado) => {
    expect(resolverEm(rota).tela).toBe(esperado);
  });

  it('um club de verdade continua caindo no detalhe', () => {
    expect(resolverEm('/clubes/floripa-run').tela).toBe('club:floripa-run');
  });
});

describe('ClubesRoutes · redirects da migração D-1008-R17 vencem o :slug', () => {
  it.each([
    ['/clubes/assessorias', '/parcerias/assessorias'],
    ['/clubes/assessorias/nova', '/parcerias/assessorias/nova'],
    ['/clubes/assessorias/p-1', '/parcerias/assessorias/p-1'],
    ['/clubes/influenciadores', '/parcerias/afiliacoes'],
    ['/clubes/minhas-afiliacoes', '/parcerias/afiliacoes/minhas'],
  ])('%s NÃO cai em "Club não encontrado" — sai para %s', (rota, destino) => {
    const r = resolverEm(rota);
    expect(r.tela, 'a rota migrada caiu no coringa :slug').not.toContain('club:');
    expect(r.pathname).toBe(destino);
  });
});
