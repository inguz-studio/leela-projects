import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import { ItemKitModal } from '../ItemKitModal';

function setup(onSalvar = vi.fn().mockResolvedValue(undefined)) {
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <ItemKitModal open onOpenChange={onOpenChange} onSalvar={onSalvar} />
    </ToastProvider>,
  );
  return { onSalvar, onOpenChange };
}

describe('ItemKitModal (RN-213/214)', () => {
  it('origem organizador: sem bloco de marca nem toggle de logo', () => {
    setup();
    expect(screen.queryByText('Exibir logo ao atleta')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Marca do patrocinador')).not.toBeInTheDocument();
  });

  it('origem patrocinador: aparece bloco da marca + toggle de logo (RN-214)', async () => {
    setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Patrocinador' }));
    expect(screen.getByLabelText('Marca do patrocinador')).toBeInTheDocument();
    expect(screen.getByText('Exibir logo ao atleta')).toBeInTheDocument();
  });

  it('salva item patrocinado com marca + logo', async () => {
    const { onSalvar } = setup();
    await userEvent.type(screen.getByLabelText('Nome do item'), 'Gel Growth');
    await userEvent.click(screen.getByRole('radio', { name: 'Patrocinador' }));
    await userEvent.type(screen.getByLabelText('Marca do patrocinador'), 'Growth');
    await userEvent.click(screen.getByLabelText('Exibir logo ao atleta'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    const [, input] = onSalvar.mock.calls[0]!;
    expect(input).toMatchObject({
      nome: 'Gel Growth',
      origem: 'patrocinador',
      marca: 'Growth',
      exibirLogo: true,
    });
  });

  it('bloqueia salvar sem nome', async () => {
    const { onSalvar } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe o nome do item.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('trocar patrocinador→organizador zera logo (RN-214)', async () => {
    const { onSalvar } = setup();
    await userEvent.type(screen.getByLabelText('Nome do item'), 'Camiseta');
    await userEvent.click(screen.getByRole('radio', { name: 'Patrocinador' }));
    await userEvent.type(screen.getByLabelText('Marca do patrocinador'), 'X');
    await userEvent.click(screen.getByLabelText('Exibir logo ao atleta'));
    await userEvent.click(screen.getByRole('radio', { name: 'Organizador' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    const [, input] = onSalvar.mock.calls[0]!;
    expect(input.exibirLogo).toBe(false);
    expect(input.marca).toBeUndefined();
  });

  it('fecha pelo Cancelar (uma das 4 vias)', async () => {
    const { onOpenChange } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
