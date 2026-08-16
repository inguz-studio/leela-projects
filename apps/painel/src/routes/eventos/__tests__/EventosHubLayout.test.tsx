// =============================================================================
// EventosHubSubNav — sub-navegação de primeiro nível da área Eventos
// (Eventos | Repasses), padrão §2.14 + divisória RN-229.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { EventosHubSubNav } from '../EventosHubLayout';

function renderEm(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <EventosHubSubNav />
    </MemoryRouter>,
  );
}

/** Espia o pathname para provar que o clique navega de verdade. */
function Pathname(): JSX.Element {
  const { pathname } = useLocation();
  return <span data-testid="pathname">{pathname}</span>;
}

describe('EventosHubSubNav', () => {
  it('marca Eventos como ativa em /eventos e Repasses em /eventos/repasses', () => {
    renderEm('/eventos');
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Repasses' })).not.toHaveAttribute('aria-current');
  });

  it('em /eventos/repasses a aba Repasses fica ativa e a lista sai de ativa', () => {
    renderEm('/eventos/repasses');
    expect(screen.getByRole('link', { name: 'Repasses' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Eventos' })).not.toHaveAttribute('aria-current');
  });

  it('dentro de um evento (/eventos/{slug}/...) a aba Eventos segue a ativa', () => {
    renderEm('/eventos/corrida-da-serra/inscritos');
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  // LEVA 14 — a divisoria MORREU. O dono, na integra: *"o menu secundario de
  // clubs esta coreto, mas nas outras telas, a linha esta aparecendo, aonde os
  // seletores laranja ficam."* Este teste guardava a RN-229; agora guarda o
  // contrario, para a linha nao voltar por esta area.
  it('a sub-nav NÃO tem divisória — a linha morreu na Leva 14', () => {
    renderEm('/eventos');
    const nav = screen.getByRole('navigation', { name: 'Seções de Eventos' });
    expect(nav).not.toHaveClass('border-b');
    expect(nav).toHaveClass('border-b-0');
  });

  // LEELA-DEBT-T4 (H7): as abas eram `<button>` — navegavam, mas não davam
  // ctrl+clique, clique do meio nem "copiar endereço do link".
  it('cada aba é LINK de verdade: href no DOM apontando para a própria rota', () => {
    renderEm('/eventos');
    const porRotulo = Object.fromEntries(
      screen.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]),
    );
    expect(porRotulo).toEqual({ Eventos: '/eventos', Repasses: '/eventos/repasses' });
  });

  it('as duas abas navegam para as rotas declaradas', async () => {
    render(
      <MemoryRouter initialEntries={['/eventos']}>
        <EventosHubSubNav />
        <Routes>
          <Route path="*" element={<Pathname />} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('link', { name: 'Repasses' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/eventos/repasses');
    await userEvent.click(screen.getByRole('link', { name: 'Eventos' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/eventos');
  });
});
