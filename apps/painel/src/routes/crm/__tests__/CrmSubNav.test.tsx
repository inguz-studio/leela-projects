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
    const abas = screen.getAllByRole('button');
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
        .getAllByRole('button')
        .filter((b) => b.getAttribute('aria-current') === 'page');
      expect(marcadas, `rota ${rota}`).toHaveLength(1);
      expect(marcadas[0]?.textContent, `rota ${rota}`).toBe(ativa);
      unmount();
    }
  });

  it('aplica a divisória padrão da sub-nav (RN-229)', () => {
    renderEm('/crm');
    expect(screen.getByRole('navigation', { name: 'Seções de CRM' })).toHaveClass('border-b');
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
    await userEvent.click(screen.getByRole('button', { name: 'Clientes' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/crm/clientes');
    await userEvent.click(screen.getByRole('button', { name: 'Comunicação' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/crm/comunicacao');
    await userEvent.click(screen.getByRole('button', { name: 'Visão geral' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/crm');
  });
});
