import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParceriaDestrutivaModal } from '../ParceriaDestrutivaModal';

describe('ParceriaDestrutivaModal', () => {
  it('desativar patrocinador mostra preview §2.15 e confirma', async () => {
    const onConfirm = vi.fn();
    render(
      <ParceriaDestrutivaModal
        open
        onOpenChange={() => {}}
        variante="desativar-patrocinador"
        nome="Loja do Corredor"
        onConfirm={onConfirm}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Desativar patrocinador' })).toBeInTheDocument();
    expect(within(dialog).getByText('Loja do Corredor')).toBeInTheDocument();
    expect(within(dialog).getByText(/possibilidade de reativar/i)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Desativar patrocinador' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('remover evento mostra preview de trilha preservada (RN-124)', async () => {
    const onConfirm = vi.fn();
    render(
      <ParceriaDestrutivaModal
        open
        onOpenChange={() => {}}
        variante="remover-evento"
        nome="meia-floripa"
        onConfirm={onConfirm}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Remover evento promovido')).toBeInTheDocument();
    expect(within(dialog).getByText(/conversões e comissões já registradas/i)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remover evento' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('cancelar fecha sem confirmar', async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ParceriaDestrutivaModal
        open
        onOpenChange={onOpenChange}
        variante="remover-evento"
        nome="meia-floripa"
        onConfirm={onConfirm}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
