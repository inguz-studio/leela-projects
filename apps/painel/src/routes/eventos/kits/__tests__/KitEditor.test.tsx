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
    itens: [],
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

  it('preço com separador de milhar salva o valor inteiro (FIX-PARSE-DINHEIRO)', async () => {
    const { onSalvarKit } = setup({ evento: { qtdInscritos: 0 }, kit: mkKit({ preco: 0 }) });
    const preco = screen.getByLabelText('Preço (delta sobre a inscrição, aceita negativo)');
    await userEvent.clear(preco);
    await userEvent.type(preco, '1.234,56');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar kit' }));
    await waitFor(() => expect(onSalvarKit).toHaveBeenCalled());
    const [, input] = onSalvarKit.mock.calls[0]!;
    // O defeito gravava 1.234 aqui — R$ 1,23 no lugar de mil duzentos e trinta
    // e quatro reais, sem erro nenhum na tela.
    expect(input.preco).toBe(1234.56);
    expect(Math.round(input.preco * 100)).toBe(123456);
  });

  it('preço "1.500" salva mil e quinhentos, não R$ 1,50', async () => {
    // Decisão do dono: ponto sozinho com grupo de três é o milhar do hábito
    // pt-BR. A leitura de R$ 1,50 é a que ficou perdida, e o aviso mora no
    // texto de ajuda do campo.
    const { onSalvarKit } = setup({ evento: { qtdInscritos: 0 }, kit: mkKit({ preco: 0 }) });
    const preco = screen.getByLabelText('Preço (delta sobre a inscrição, aceita negativo)');
    await userEvent.clear(preco);
    await userEvent.type(preco, '1.500');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar kit' }));
    await waitFor(() => expect(onSalvarKit).toHaveBeenCalled());
    const [, input] = onSalvarKit.mock.calls[0]!;
    expect(input.preco).toBe(1500);
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

  it('salva descrição e itens da visão de compra (RN-230)', async () => {
    const { onSalvarKit } = setup({ evento: { qtdInscritos: 0 }, kit: mkKit({ preco: 100 }) });
    const desc = screen.getByLabelText(/Descrição/);
    await userEvent.type(desc, 'Kit completo do finisher');
    const novoItem = screen.getByLabelText('Adicionar item');
    await userEvent.type(novoItem, 'Medalha de finisher');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));
    expect(screen.getByText('Medalha de finisher')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar kit' }));
    await waitFor(() => expect(onSalvarKit).toHaveBeenCalled());
    const [, input] = onSalvarKit.mock.calls[0]!;
    expect(input.descricao).toBe('Kit completo do finisher');
    expect(input.itens).toContain('Medalha de finisher');
  });

  it('descrição vazia salva como null (limpa o campo)', async () => {
    const { onSalvarKit } = setup({ evento: { qtdInscritos: 0 }, kit: mkKit({ preco: 100 }) });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar kit' }));
    await waitFor(() => expect(onSalvarKit).toHaveBeenCalled());
    const [, input] = onSalvarKit.mock.calls[0]!;
    expect(input.descricao).toBeNull();
  });

  it('bloqueia salvar sem nome', async () => {
    const { onSalvarKit } = setup({ kit: mkKit({ nome: '' }) });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar kit' }));
    expect(await screen.findByText('Informe o nome do kit.')).toBeInTheDocument();
    expect(onSalvarKit).not.toHaveBeenCalled();
  });
});
