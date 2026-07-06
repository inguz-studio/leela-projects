import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DateBadge } from '../DateBadge';

describe('DateBadge', () => {
  it('renderiza o conteúdo do consumidor (o DS não formata datas)', () => {
    render(<DateBadge>Domingo, 19 de Abril · 14:32</DateBadge>);
    expect(screen.getByText('Domingo, 19 de Abril · 14:32')).toBeInTheDocument();
  });

  it('dot "ao vivo" presente por padrão, decorativo e token-only', () => {
    render(<DateBadge>agora</DateBadge>);
    const dot = screen.getByTestId('datebadge-dot');
    expect(dot).toHaveAttribute('aria-hidden');
    expect(dot.className).toContain('bg-[var(--feedback-success)]');
    expect(dot.className).toContain('shadow-[var(--datebadge-dot-glow)]');
  });

  it('showDot=false remove o dot', () => {
    render(<DateBadge showDot={false}>27 Abr</DateBadge>);
    expect(screen.queryByTestId('datebadge-dot')).toBeNull();
  });

  it('pill com as métricas do mockup via tokens (pad 6×10, texto 12, overlay + hairline)', () => {
    const { container } = render(<DateBadge>x</DateBadge>);
    const pill = container.firstElementChild as HTMLElement;
    for (const cls of [
      'px-[var(--datebadge-px)]',
      'py-[var(--datebadge-py)]',
      'gap-[var(--datebadge-gap)]',
      'text-[length:var(--datebadge-font-size)]',
      'bg-[var(--surface-overlay)]',
      'border-[var(--border-subtle)]',
      'rounded-[var(--radius-pill)]',
    ]) {
      expect(pill.className).toContain(cls);
    }
  });
});
