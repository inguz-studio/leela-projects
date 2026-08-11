// =============================================================================
// MOLDURA DA ÁREA DE CLUBS — a prova do D-1008-R16 (reconciliada pela R17).
//
// A palavra do dono: "revisar as rotas de clubs, para que o menu secundário
// nao leve a abas sem menu e que voce nao quebre o layout, como em assessorias
// parceiras". A causa era anatomia: o R9 colou o `ClubesAreaNav` página a
// página — quem não colou ficou órfã de menu, quem colou diferente
// (Assessorias) quebrou o layout. O conserto é o layout route
// `ClubesAreaLayout`, ÚNICO dono do menu.
//
// Após a D-1008-R17 a área ficou com o que é COMUNIDADE (hub + engajamento);
// assessorias e afiliações migraram para Parcerias (moldura própria, provada
// em `parcerias/__tests__/moldura-da-area.test.tsx`) e as rotas antigas viram
// redirects (cobertos em `ClubesRoutes.test.tsx` e no gate da RN-234).
//
// Este arquivo percorre a régua da decisão rota a rota, sobre a ÁRVORE REAL
// (`ClubesRoutes`): em TODA aba da área o menu secundário renderiza —
// exatamente UM, com o item ativo certo — e as rotas declaradas FORA da
// moldura estão afirmadas sem o menu, para o veredito da auditoria não virar
// boa intenção. As telas viram marcadores, como em `ClubesRoutes.test.tsx`.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';

vi.mock('../hub/HubRoute', () => ({ HubRoute: () => <div data-testid="tela">hub</div> }));
vi.mock('../novo/NovoClubePage', () => ({
  NovoClubePage: () => <div data-testid="tela">novo-club</div>,
}));
vi.mock('../engajamento/EngajamentoPage', () => ({
  EngajamentoPage: () => <div data-testid="tela">engajamento</div>,
}));
vi.mock('../clube/ClubeLayout', () => ({
  ClubeLayout: () => {
    const { slug } = useParams();
    return <div data-testid="tela">{`club:${slug ?? ''}`}</div>;
  },
}));

const { ClubesRoutes } = await import('../ClubesRoutes');

const MENU = 'Seções de clubs';

/** Monta o módulo no MESMO ponto do App.tsx (`/clubes/*`). */
function montarEm(rota: string): () => void {
  const { unmount } = render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/clubes/*" element={<ClubesRoutes />} />
      </Routes>
    </MemoryRouter>,
  );
  return unmount;
}

// Rota → [tela esperada, rótulo da aba ativa]. A tabela É o inventário da
// auditoria R16 — cada linha nova da área entra aqui, porque a régua é
// "toda aba da área".
const DENTRO_DA_MOLDURA: ReadonlyArray<[string, string, string]> = [
  ['/clubes', 'hub', 'Clubs'],
  ['/clubes/engajamento', 'engajamento', 'Engajamento'],
];

// Vereditos "fora da moldura POR DESIGN" da auditoria — afirmados, não
// esquecidos: criação em tela cheia com retorno próprio (precedente
// `/eventos/novo` do EventosHubLayout) e o shell próprio do club (breadcrumb
// "Clubes › {nome}" do D-1008-R10 + abas do clube).
const FORA_DA_MOLDURA: ReadonlyArray<[string, string]> = [
  ['/clubes/novo', 'novo-club'],
  ['/clubes/floripa-run', 'club:floripa-run'],
];

describe('moldura da área de clubs (D-1008-R16)', () => {
  it.each(DENTRO_DA_MOLDURA)(
    '%s: renderiza a tela E exatamente UM menu da área',
    (rota, tela) => {
      const unmount = montarEm(rota);
      expect(screen.getByTestId('tela').textContent).toBe(tela);
      // getAllByRole + length 1: um menu a menos é aba órfã; um a mais é
      // página colando menu por conta própria — os DOIS defeitos do R16.
      expect(screen.getAllByRole('navigation', { name: MENU })).toHaveLength(1);
      unmount();
    },
  );

  it.each(DENTRO_DA_MOLDURA)('%s: o item ativo do menu é o certo', (rota, _tela, ativa) => {
    const unmount = montarEm(rota);
    const nav = screen.getByRole('navigation', { name: MENU });
    const marcados = Array.from(nav.querySelectorAll('[aria-current="page"]'));
    expect(
      marcados.map((e) => e.textContent),
      'a moldura tem de dizer ONDE a pessoa está — uma marca, nem zero nem duas',
    ).toHaveLength(1);
    expect(marcados[0]?.textContent).toContain(ativa);
    unmount();
  });

  it.each(FORA_DA_MOLDURA)(
    '%s: fora da moldura POR DESIGN — a tela renderiza, o menu da área não',
    (rota, tela) => {
      const unmount = montarEm(rota);
      expect(screen.getByTestId('tela').textContent).toBe(tela);
      expect(screen.queryByRole('navigation', { name: MENU })).toBeNull();
      unmount();
    },
  );

  it('as âncoras do menu são navegação de verdade dentro da moldura', () => {
    // Amostra da lei navegacao-spa no ponto novo (a tabela completa vive em
    // routes/__tests__/navegacao-spa.test.tsx): âncora com href interno.
    const unmount = montarEm('/clubes/engajamento');
    const nav = screen.getByRole('navigation', { name: MENU });
    for (const ancora of within(nav).getAllByRole('link')) {
      expect(ancora.getAttribute('href')).toMatch(/^\/clubes/);
    }
    unmount();
  });
});
