// =============================================================================
// ClubesRoutes — a rota nova de Engajamento sobre a ÁRVORE REAL.
//
// O risco é conhecido e já mordeu esta subárvore antes: `:slug` casa com
// QUALQUER segmento, então uma rota estática declarada depois dele renderiza
// "Club não encontrado" em vez da tela (foi o fix #14, com `novo`). Este teste
// prova a precedência, e prova junto que nenhuma das rotas estáticas irmãs
// regrediu ao entrar a nova.
//
// As telas viram marcadores: o que está sob teste é o ROTEAMENTO. O conteúdo
// tem suíte própria.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';

vi.mock('../hub/HubRoute', () => ({ HubRoute: () => <div data-testid="alvo">hub</div> }));
vi.mock('../novo/NovoClubePage', () => ({
  NovoClubePage: () => <div data-testid="alvo">novo-club</div>,
}));
vi.mock('../engajamento/EngajamentoPage', () => ({
  EngajamentoPage: () => <div data-testid="alvo">engajamento</div>,
}));
vi.mock('../assessorias/AssessoriasPage', () => ({
  AssessoriasPage: () => <div data-testid="alvo">assessorias</div>,
}));
vi.mock('../influenciadores/InfluenciadoresPage', () => ({
  InfluenciadoresPage: () => <div data-testid="alvo">influenciadores</div>,
}));
vi.mock('../clube/ClubeLayout', () => ({
  ClubeLayout: () => {
    const { slug } = useParams();
    return <div data-testid="alvo">{`club:${slug ?? ''}`}</div>;
  },
}));

const { ClubesRoutes } = await import('../ClubesRoutes');

/** Monta o módulo no MESMO ponto do App.tsx (`/clubes/*`). */
function resolverEm(rota: string): string {
  const { unmount } = render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/clubes/*" element={<ClubesRoutes />} />
      </Routes>
    </MemoryRouter>,
  );
  const texto = screen.getByTestId('alvo').textContent ?? '';
  unmount();
  return texto;
}

describe('ClubesRoutes · rota estática vence o coringa :slug', () => {
  it('/clubes/engajamento abre a análise da comunidade, não um club chamado "engajamento"', () => {
    expect(resolverEm('/clubes/engajamento')).toBe('engajamento');
  });

  it.each([
    ['/clubes', 'hub'],
    ['/clubes/novo', 'novo-club'],
    ['/clubes/assessorias', 'assessorias'],
    ['/clubes/influenciadores', 'influenciadores'],
  ])('%s continua resolvendo em %s', (rota, esperado) => {
    expect(resolverEm(rota)).toBe(esperado);
  });

  it('um club de verdade continua caindo no detalhe', () => {
    expect(resolverEm('/clubes/floripa-run')).toBe('club:floripa-run');
  });
});
