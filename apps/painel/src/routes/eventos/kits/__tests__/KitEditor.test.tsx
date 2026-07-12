import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { KitEditor } from '../KitEditor';
import { mkEvento, ts } from '../../_test/fixtures';
import type { Evento, ItemKit, Kit } from '@leela/core';

function mkKit(over: Partial<Kit> = {}): Kit {
  return {
    id: 'kit_ouro',
    tenantId: 'castelo',
    nome: 'Kit Ouro',
    preco: 120,
    capacidade: 100,
    modalidades: ['21k'],
    criadoEm: ts(new Date()),
    atualizadoEm: ts(new Date()),
    ...over,
  };
}
function mkItem(over: Partial<ItemKit> = {}): ItemKit {
  return {
    id: 'cam',
    tenantId: 'castelo',
    eventoId: 'e1',
    nome: 'Camiseta',
    tamanhado: true,
    origem: 'organizador',
    exibirLogo: false,
    modeloEstoque: 'sob_encomenda',
    tamanhosDisponiveis: [],
    kits: [],
    criadoEm: ts(new Date()),
    atualizadoEm: ts(new Date()),
    ...over,
  };
}

function setup(opts: {
  evento?: Partial<Evento>;
  kit?: Kit | null;
  itens?: ItemKit[];
  onSalvarKit?: ReturnType<typeof vi.fn>;
  onSalvarItem?: ReturnType<typeof vi.fn>;
} = {}) {
  const onSalvarKit = opts.onSalvarKit ?? vi.fn().mockResolvedValue(undefined);
  const onSalvarItem = opts.onSalvarItem ?? vi.fn().mockResolvedValue(undefined);
  const onConcluir = vi.fn();
  render(
    <MemoryRouter>
      <ToastProvider>
        <KitEditor
          evento={mkEvento(opts.evento)}
          kit={opts.kit ?? null}
          itens={opts.itens ?? [mkItem()]}
          onSalvarKit={onSalvarKit}
          onSalvarItem={onSalvarItem}
          onConcluir={onConcluir}
        />
      </ToastProvider>
    </MemoryRouter>,
  );
  return { onSalvarKit, onSalvarItem, onConcluir };
}

describe('KitEditor (RN-200/211/216/217)', () => {
  it('nunca usa "tier" na copy (RN-216)', () => {
    const { container } = render(
      <MemoryRouter>
        <ToastProvider>
          <KitEditor
            evento={mkEvento()}
            kit={mkKit()}
            itens={[]}
            onSalvarKit={vi.fn()}
            onSalvarItem={vi.fn()}
            onConcluir={vi.fn()}
          />
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(container.textContent?.toLowerCase()).not.toContain('tier');
  });

  it('preço aceita negativo (RN-211) e salva', async () => {
    const { onSalvarKit } = setup({ evento: { qtdInscritos: 0 }, kit: mkKit({ preco: 0, nome: 'Sem kit' }) });
    const preco = screen.getByLabelText('Preço (delta sobre a inscrição, aceita negativo)');
    await userEvent.clear(preco);
    await userEvent.type(preco, '-30');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar kit' }));
    await waitFor(() => expect(onSalvarKit).toHaveBeenCalled());
    const [, input] = onSalvarKit.mock.calls[0]!;
    expect(input.preco).toBe(-30);
  });

  it('evento com venda bloqueia o preço (RN-200)', () => {
    setup({ evento: { qtdInscritos: 453 }, kit: mkKit() });
    const preco = screen.getByLabelText('Preço (delta sobre a inscrição, aceita negativo)');
    expect(preco).toBeDisabled();
    expect(screen.getByText('Preço bloqueado após a primeira venda (RN-200).')).toBeInTheDocument();
  });

  it('remover modalidade atualiza a lista (§2.12)', () => {
    setup({ kit: mkKit({ modalidades: ['21k', '10k'] }) });
    const chip21 = screen.getByRole('button', { name: '21k' });
    fireEvent.keyDown(chip21, { key: 'Delete' });
    expect(screen.queryByRole('button', { name: '21k' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10k' })).toBeInTheDocument();
  });

  it('marcar item atualiza contador e salva pertinência N:N (RN-215)', async () => {
    const { onSalvarItem } = setup({
      kit: mkKit({ id: 'kit_ouro' }),
      itens: [mkItem({ id: 'cam', kits: [] })],
    });
    await userEvent.click(screen.getByLabelText('Camiseta'));
    expect(screen.getByText('1 item selecionado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar kit' }));
    await waitFor(() => expect(onSalvarItem).toHaveBeenCalled());
    const [, input] = onSalvarItem.mock.calls[0]!;
    expect(input.kits).toContain('kit_ouro');
  });

  it('bloqueia salvar sem nome', async () => {
    const { onSalvarKit } = setup({ kit: mkKit({ nome: '' }) });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar kit' }));
    expect(await screen.findByText('Informe o nome do kit.')).toBeInTheDocument();
    expect(onSalvarKit).not.toHaveBeenCalled();
  });
});
