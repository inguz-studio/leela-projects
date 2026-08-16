import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeletarClubeModal } from '../DeletarClubeModal';

function renderModal(over = {}) {
  return render(
    <DeletarClubeModal
      open
      onOpenChange={() => {}}
      nomeClube="Corrida Perfeita Sul"
      onExportar={() => {}}
      onConfirmar={() => {}}
      {...over}
    />,
  );
}

describe('DeletarClubeModal', () => {
  it('mostra o disclaimer LGPD (irreversível + 90 dias) e as perdas (§2.15)', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Irreversível')).toBeInTheDocument();
    expect(within(dialog).getByText(/90 dias/)).toBeInTheDocument();
    expect(within(dialog).getByText(/apagados definitivamente/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Todos os membros/)).toBeInTheDocument();
  });

  it('exclusão só habilita ao digitar o nome exato do clube', async () => {
    const onConfirmar = vi.fn();
    renderModal({ onConfirmar });
    const excluir = screen.getByRole('button', { name: 'Excluir clube permanentemente' });
    expect(excluir).toBeDisabled();
    const campo = screen.getByLabelText('Confirmar nome do clube');
    await userEvent.type(campo, 'Corrida Errada');
    expect(excluir).toBeDisabled();
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Corrida Perfeita Sul');
    expect(excluir).toBeEnabled();
    await userEvent.click(excluir);
    expect(onConfirmar).toHaveBeenCalledOnce();
  });

  it('exportar dados dispara onExportar antes de excluir', async () => {
    const onExportar = vi.fn();
    renderModal({ onExportar });
    await userEvent.click(screen.getByRole('button', { name: 'Exportar dados do clube' }));
    expect(onExportar).toHaveBeenCalledOnce();
  });

  it('cancelar fecha sem excluir', async () => {
    const onOpenChange = vi.fn();
    const onConfirmar = vi.fn();
    renderModal({ onOpenChange, onConfirmar });
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
