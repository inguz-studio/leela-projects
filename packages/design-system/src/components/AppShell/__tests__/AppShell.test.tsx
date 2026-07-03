import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from '../AppShell';

describe('AppShell', () => {
  it('renders main content landmark', () => {
    render(
      <AppShell sidebar={<nav aria-label="sidebar">Nav</nav>}>
        <p>Conteúdo</p>
      </AppShell>,
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders sidebar content', () => {
    render(
      <AppShell sidebar={<nav aria-label="sidebar">Nav</nav>}>
        <p>Conteúdo</p>
      </AppShell>,
    );
    expect(screen.getByRole('navigation', { name: 'sidebar' })).toBeInTheDocument();
  });

  it('renders children inside main', () => {
    render(
      <AppShell sidebar={<div>nav</div>}>
        <p>Página principal</p>
      </AppShell>,
    );
    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByText('Página principal'));
  });

  it('accepts custom className', () => {
    const { container } = render(
      <AppShell sidebar={<div>nav</div>} className="test-shell">
        <p>Content</p>
      </AppShell>,
    );
    expect(container.firstChild).toHaveClass('test-shell');
  });
});
