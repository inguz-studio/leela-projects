import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders role="status" with aria-label', () => {
    render(<EmptyState title="Nenhum clube encontrado" />);
    expect(screen.getByRole('status', { name: 'Nenhum clube encontrado' })).toBeInTheDocument();
  });

  it('renders default title', () => {
    render(<EmptyState />);
    expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<EmptyState title="Nenhum evento encontrado" />);
    expect(screen.getByText('Nenhum evento encontrado')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<EmptyState title="Vazio" description="Tente limpar os filtros." />);
    expect(screen.getByText('Tente limpar os filtros.')).toBeInTheDocument();
  });

  it('renders icon slot', () => {
    render(<EmptyState title="Vazio" icon={<svg data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders action slot', () => {
    render(
      <EmptyState
        title="Vazio"
        action={<button type="button">Limpar filtros</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  it('does not render description when equal to title', () => {
    render(<EmptyState title="Vazio" description="Vazio" />);
    const elements = screen.getAllByText('Vazio');
    // description matches title so it's skipped — only 1 instance
    expect(elements.length).toBe(1);
  });
});
