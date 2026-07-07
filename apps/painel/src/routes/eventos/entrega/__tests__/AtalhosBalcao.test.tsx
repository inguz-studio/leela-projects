import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AtalhosBalcao } from '../AtalhosBalcao';

describe('AtalhosBalcao', () => {
  it('lista as teclas da operação do balcão', () => {
    render(<AtalhosBalcao />);
    expect(screen.getByLabelText('Atalhos de teclado')).toBeInTheDocument();
    for (const t of ['⌘K', 'Enter', 'Tab', 'Esc']) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    expect(screen.getByText('Confirmar passo atual')).toBeInTheDocument();
  });
});
