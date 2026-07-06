import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toolbar } from '../Toolbar';

describe('Toolbar', () => {
  it('renderiza role="toolbar" com aria-label default', () => {
    render(<Toolbar start={<span>busca</span>} end={<span>ações</span>} />);
    const bar = screen.getByRole('toolbar', { name: 'Ferramentas globais' });
    expect(bar).toContainElement(screen.getByText('busca'));
    expect(bar).toContainElement(screen.getByText('ações'));
  });

  it('fecha em hairline com pb da T1 e gaps por token', () => {
    render(<Toolbar />);
    const bar = screen.getByRole('toolbar');
    expect(bar.className).toContain('pb-[var(--layout-toolbar-pb)]');
    expect(bar.className).toContain('border-b-[var(--border-subtle)]');
    expect(bar.className).toContain('gap-[var(--toolbar-gap)]');
  });

  it('aria-label customizável', () => {
    render(<Toolbar aria-label="Ferramentas do evento" />);
    expect(screen.getByRole('toolbar', { name: 'Ferramentas do evento' })).toBeInTheDocument();
  });
});
