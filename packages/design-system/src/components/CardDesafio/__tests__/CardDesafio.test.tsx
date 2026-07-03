import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardDesafio } from '../CardDesafio';

describe('CardDesafio', () => {
  it('renders title as heading', () => {
    render(<CardDesafio title="Desafio 100km no mês" progress={40} />);
    expect(
      screen.getByRole('heading', { name: 'Desafio 100km no mês' }),
    ).toBeInTheDocument();
  });

  it('exposes progressbar with aria values', () => {
    render(<CardDesafio title="Desafio" progress={40} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-label', 'Progresso: 40%');
  });

  it('fills progress bar with feedback-success (Vitória) token', () => {
    render(<CardDesafio title="Desafio" progress={40} />);
    const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill.className).toContain('bg-[var(--feedback-success)]');
    expect(fill.style.width).toBe('40%');
  });

  it('clamps progress outside 0–100', () => {
    const { rerender } = render(<CardDesafio title="Desafio" progress={140} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    rerender(<CardDesafio title="Desafio" progress={-10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('applies elev-brand glow only at 100%', () => {
    const { rerender } = render(<CardDesafio title="Desafio" progress={99} />);
    expect(screen.getByRole('article').className).not.toContain(
      'shadow-[var(--elevation-brand)]',
    );
    rerender(<CardDesafio title="Desafio" progress={100} />);
    expect(screen.getByRole('article').className).toContain(
      'shadow-[var(--elevation-brand)]',
    );
  });

  it('renders percentage label and meta slot', () => {
    render(
      <CardDesafio title="Desafio" progress={72} meta={<span>18 dias restantes</span>} />,
    );
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('18 dias restantes')).toBeInTheDocument();
  });
});
