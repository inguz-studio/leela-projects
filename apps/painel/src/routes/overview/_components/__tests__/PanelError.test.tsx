import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanelError } from '../PanelError';

describe('PanelError (FIX-E02 #03)', () => {
  it('é um alert honesto com a mensagem dada', () => {
    render(<PanelError message="Não foi possível carregar." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar.');
  });

  it('com onRetry → botão dispara a recarga', async () => {
    const onRetry = vi.fn();
    render(<PanelError message="Falhou." onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('sem onRetry → sem botão (erro não recuperável por retry)', () => {
    render(<PanelError message="Falhou." />);
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });
});
