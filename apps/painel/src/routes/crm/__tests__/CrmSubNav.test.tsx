// =============================================================================
// CrmSubNav — as 3 subdivisões, a derivação da aba ativa pelo pathname e a
// divisória RN-229.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CrmSubNav, crmAbaAtiva } from '../_components/CrmSubNav';

function renderEm(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <CrmSubNav />
    </MemoryRouter>,
  );
}

function Pathname(): JSX.Element {
  const { pathname } = useLocation();
  return <span data-testid="pathname">{pathname}</span>;
}

describe('crmAbaAtiva — derivação pura pelo pathname', () => {
  it.each([
    ['/crm', 'visao-geral'],
    ['/crm/visao-geral', 'visao-geral'],
    ['/crm/clientes', 'clientes'],
    ['/crm/clientes/tipo_abc123', 'clientes'],
    ['/crm/comunicacao', 'comunicacao'],
  ])('%s → aba %s', (pathname, esperada) => {
    expect(crmAbaAtiva(pathname)).toBe(esperada);
  });
});

describe('CrmSubNav', () => {
  it('renderiza exatamente as 3 subdivisões, na ordem da decisão', () => {
    renderEm('/crm');
    const abas = screen.getAllByRole('link');
    expect(abas.map((b) => b.textContent)).toEqual(['Visão geral', 'Clientes', 'Comunicação']);
  });

  it('marca só UMA aba como ativa, por pathname', () => {
    for (const [rota, ativa] of [
      ['/crm', 'Visão geral'],
      ['/crm/clientes', 'Clientes'],
      ['/crm/clientes/tipo_abc123', 'Clientes'],
      ['/crm/comunicacao', 'Comunicação'],
    ] as const) {
      const { unmount } = renderEm(rota);
      const marcadas = screen
        .getAllByRole('link')
        .filter((b) => b.getAttribute('aria-current') === 'page');
      expect(marcadas, `rota ${rota}`).toHaveLength(1);
      expect(marcadas[0]?.textContent, `rota ${rota}`).toBe(ativa);
      unmount();
    }
  });

  // LEVA 14 — a divisoria MORREU. O dono, na integra: *"o menu secundario de
  // clubs esta coreto, mas nas outras telas, a linha esta aparecendo, aonde os
  // seletores laranja ficam."* Este teste guardava a RN-229; agora guarda o
  // contrario, para a linha nao voltar por esta area.
  it('a sub-nav NÃO tem divisória — a linha morreu na Leva 14', () => {
    renderEm('/crm');
    const nav = screen.getByRole('navigation', { name: 'Seções de CRM' });
    expect(nav).not.toHaveClass('border-b');
    expect(nav).toHaveClass('border-b-0');
  });

  // LEELA-DEBT-T4 (H7): as abas eram `<button>` — navegavam, mas não davam
  // ctrl+clique, clique do meio nem "copiar endereço do link".
  it('cada aba é LINK de verdade: href no DOM apontando para a própria rota', () => {
    renderEm('/crm');
    const porRotulo = Object.fromEntries(
      screen.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]),
    );
    expect(porRotulo).toEqual({
      'Visão geral': '/crm',
      Clientes: '/crm/clientes',
      Comunicação: '/crm/comunicacao',
    });
  });

  it('as 3 abas navegam para as rotas declaradas', async () => {
    render(
      <MemoryRouter initialEntries={['/crm']}>
        <CrmSubNav />
        <Routes>
          <Route path="*" element={<Pathname />} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('link', { name: 'Clientes' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/crm/clientes');
    await userEvent.click(screen.getByRole('link', { name: 'Comunicação' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/crm/comunicacao');
    await userEvent.click(screen.getByRole('link', { name: 'Visão geral' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/crm');
  });
});
