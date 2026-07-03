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
});
