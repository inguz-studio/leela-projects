import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import type { ItemKit } from '@leela/core';
import { ItemKitModal } from '../ItemKitModal';

function setup(onSalvar = vi.fn().mockResolvedValue(undefined), item?: ItemKit) {
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <ItemKitModal open onOpenChange={onOpenChange} onSalvar={onSalvar} item={item ?? null} />
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

  it('salva item patrocinado com marca + logo (único ⇒ grade removida)', async () => {
    const { onSalvar } = setup();
    await userEvent.type(screen.getByLabelText('Nome do item'), 'Gel Growth');
    await userEvent.click(screen.getByRole('radio', { name: 'Único (sacochila, amostra)' }));
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
      tamanhado: false,
      grade: null, // item único REMOVE a grade (RN-231 — sem grade órfã)
      tamanhosDisponiveis: [],
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
    await userEvent.type(screen.getByLabelText('Tamanhos (unissex)'), 'P, M');
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

describe('ItemKitModal — grade por corte (RN-231 · TAMANHOS-GRADE)', () => {
  function mkItemLegado(over: Partial<ItemKit> = {}): ItemKit {
    return {
      id: 'camiseta',
      tenantId: 'castelo',
      eventoId: 'meia-floripa-2026',
      nome: 'Camiseta oficial',
      tamanhado: true,
      origem: 'organizador',
      exibirLogo: false,
      modeloEstoque: 'sob_encomenda',
      tamanhosDisponiveis: ['P', 'M', 'G'],
      kits: ['kit_prata'],
      criadoEm: {} as ItemKit['criadoEm'],
      atualizadoEm: {} as ItemKit['atualizadoEm'],
      ...over,
    };
  }

  it('novo item tamanhado: unissex (grade única) vem ativo por default', () => {
    setup();
    expect(screen.getByLabelText('Unissex')).toBeChecked();
    expect(screen.getByLabelText('Feminina')).not.toBeChecked();
    expect(screen.getByLabelText('Tamanhos (unissex)')).toBeInTheDocument();
  });

  it('salva grade unissex: CSV vira lista + tamanhosDisponiveis = união', async () => {
    const { onSalvar } = setup();
    await userEvent.type(screen.getByLabelText('Nome do item'), 'Camiseta');
    await userEvent.type(screen.getByLabelText('Tamanhos (unissex)'), 'P, M, G, G');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    const [, input] = onSalvar.mock.calls[0]!;
    expect(input.grade).toEqual([{ corte: 'unissex', tamanhos: ['P', 'M', 'G'] }]);
    expect(input.tamanhosDisponiveis).toEqual(['P', 'M', 'G']);
  });

  it('salva grade por corte: feminina + masculina, cada um com os seus tamanhos', async () => {
    const { onSalvar } = setup();
    await userEvent.type(screen.getByLabelText('Nome do item'), 'Camiseta');
    await userEvent.click(screen.getByLabelText('Unissex')); // desliga a grade única
    await userEvent.click(screen.getByLabelText('Feminina'));
    await userEvent.type(screen.getByLabelText('Tamanhos (feminina)'), 'P, M');
    await userEvent.click(screen.getByLabelText('Masculina'));
    await userEvent.type(screen.getByLabelText('Tamanhos (masculina)'), 'M, G');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    const [, input] = onSalvar.mock.calls[0]!;
    expect(input.grade).toEqual([
      { corte: 'feminina', tamanhos: ['P', 'M'] },
      { corte: 'masculina', tamanhos: ['M', 'G'] },
    ]);
    expect(input.tamanhosDisponiveis).toEqual(['P', 'M', 'G']); // união sem duplicar
  });

  it('bloqueia salvar: corte ativo sem tamanhos / nenhum corte ativo', async () => {
    const { onSalvar } = setup();
    await userEvent.type(screen.getByLabelText('Nome do item'), 'Camiseta');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Informe os tamanhos/);
    await userEvent.click(screen.getByLabelText('Unissex')); // desliga o único corte
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Ative ao menos um corte/);
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('item LEGADO (só tamanhosDisponiveis) abre com grade unissex pré-preenchida', () => {
    setup(vi.fn().mockResolvedValue(undefined), mkItemLegado());
    expect(screen.getByLabelText('Unissex')).toBeChecked();
    expect(screen.getByLabelText('Tamanhos (unissex)')).toHaveValue('P, M, G');
  });

  it('item com grade por corte abre com os cortes e tamanhos configurados', () => {
    setup(
      vi.fn().mockResolvedValue(undefined),
      mkItemLegado({
        grade: [
          { corte: 'feminina', tamanhos: ['P', 'M'] },
          { corte: 'masculina', tamanhos: ['G'] },
        ],
      }),
    );
    expect(screen.getByLabelText('Feminina')).toBeChecked();
    expect(screen.getByLabelText('Masculina')).toBeChecked();
    expect(screen.getByLabelText('Unissex')).not.toBeChecked();
    expect(screen.getByLabelText('Tamanhos (feminina)')).toHaveValue('P, M');
    expect(screen.getByLabelText('Tamanhos (masculina)')).toHaveValue('G');
  });

  it('item único não mostra a grade', async () => {
    setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Único (sacochila, amostra)' }));
    expect(screen.queryByText('Grade de tamanhos')).not.toBeInTheDocument();
  });
});
