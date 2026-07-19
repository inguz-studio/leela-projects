import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinanceiroSubNav } from '../FinanceiroSubNav';

function renderEm(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <FinanceiroSubNav />
    </MemoryRouter>,
  );
}

describe('FinanceiroSubNav', () => {
  it('marca Análise como ativa na raiz e Repasses em /financeiro/repasses', () => {
    renderEm('/financeiro');
    expect(screen.getByRole('button', { name: 'Análise' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Repasses' })).not.toHaveAttribute('aria-current');
  });

  it('aplica a divisória padrão na sub-nav (RN-229 · DEC-0719 item 21)', () => {
    renderEm('/financeiro');
    // Mesmo token/padrão (border-b em --border-subtle) das terciárias de eventos.
    expect(screen.getByRole('navigation', { name: 'Seções de Financeiro' })).toHaveClass('border-b');
  });
});
