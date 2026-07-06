import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders neutro variant by default', () => {
    render(<Badge>Ativo</Badge>);
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it.each(['brand', 'heroico', 'vulcao', 'vitoria', 'alerta', 'neutro'] as const)(
    'renders %s variant',
    (variant) => {
      render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
    },
  );

  it('accepts custom className', () => {
    render(<Badge className="test-badge">Label</Badge>);
    expect(screen.getByText('Label')).toHaveClass('test-badge');
  });

  it('renders children', () => {
    render(<Badge variant="vitoria">Confirmado</Badge>);
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  // QA m5: tipografia do mockup `.badge` — 10px/700 uppercase, altura nasce
  // do padding (sem height fixa).
  it('usa a tipografia do mockup por token (m5)', () => {
    render(<Badge>Publicado</Badge>);
    const el = screen.getByText('Publicado');
    expect(el.className).toContain('uppercase');
    expect(el.className).toContain('tracking-[var(--badge-spacing)]');
    expect(el.className).toContain('py-[var(--badge-py)]');
    expect(el.className).toContain('text-[length:var(--badge-font-size)]');
    expect(el.className).not.toContain('--badge-height');
  });
});
