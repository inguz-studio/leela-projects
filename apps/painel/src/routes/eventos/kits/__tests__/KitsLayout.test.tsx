// =============================================================================
// KitsLayout — a sub-nav interna de Kits depois da leva 11.
//
// S1257 · o quarto item ("Credenciamento") saiu. Ele apontava para o MESMO
// `href` que a aba de Credenciamento do menu secundário do evento já abria, sem
// tela própria e com `active` sempre `false`, porque o destino vive fora da
// árvore de Kits. O teste que importa não é "sumiu" — é que o destino continua
// ALCANÇÁVEL pela porta que ficou, senão a remoção teria deixado a área de
// credenciamento sem caminho a partir de Kits.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';

import { KitsLayout } from '../KitsLayout';
import { eventoSubNavTabs } from '../../_lib/subnav';
import { mkEvento } from '../../_test/fixtures';
import type { EventoOutletContext } from '../../evento/EventoLayout';

const SLUG = 'meia-floripa-2026';
const EVENTO = mkEvento();

/** Mesmo molde do gate de navegação: o slug vem do Outlet context, não da URL. */
function montar(rota: string): void {
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route
          element={<Outlet context={{ evento: EVENTO } satisfies EventoOutletContext} />}
        >
          <Route path="*" element={<KitsLayout />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function abas(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Seções de kits' });
}

describe('S1257 · a sub-nav de Kits para de duplicar Credenciamento', () => {
  it('a sub-nav de Kits tem 3 abas, e nenhuma delas é Credenciamento', () => {
    montar(`/eventos/${SLUG}/kits`);
    const links = within(abas()).getAllByRole('link');
    expect(links.map((l) => l.textContent?.trim())).toEqual([
      'Cadastro',
      'Distribuição',
      'Estoque',
    ]);
    expect(within(abas()).queryByText('Credenciamento')).toBeNull();
  });

  it('nenhuma aba de Kits aponta para fora da árvore de Kits', () => {
    montar(`/eventos/${SLUG}/kits`);
    const hrefs = within(abas())
      .getAllByRole('link')
      .map((l) => l.getAttribute('href'));
    for (const href of hrefs) {
      expect(href).toContain(`/eventos/${SLUG}/kits`);
    }
    expect(hrefs).not.toContain(`/eventos/${SLUG}/credenciamento`);
  });

  it('o destino continua ALCANÇÁVEL: a porta que ficou é a aba do menu do evento', () => {
    // A remoção só é limpa porque o mesmo `href` continua sendo servido pelo
    // menu secundário do evento (§2.14) — é ele que passa a ser a porta única.
    const credenciamento = eventoSubNavTabs(SLUG, 'kits').find((t) => t.id === 'entrega');
    expect(credenciamento?.label).toBe('Credenciamento');
    expect(credenciamento?.href).toBe(`/eventos/${SLUG}/credenciamento`);
  });
});
