import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { KitEditor } from '../KitEditor';
import {
  CAPACIDADE_DE_KIT_EM_BRANCO,
  REGUA_PONTO_E_VIRGULA,
} from '../../../../lib/textosDeCampo';
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

  // REV-PARSE · defeito achado na review antagonista. O campo de preço é lido
  // pelo `parseValorPtBr`, onde ponto com grupo final de três dígitos é MILHAR
  // (decisão do dono, FIX-PARSE-MILHAR). O campo nascia com `String(kit.preco)`,
  // que para um preço de três casas produz exatamente esse texto — e o kit
  // era regravado mil vezes maior sem ninguém tocar no campo. Preço de três
  // casas existe no acervo: até FIX-PARSE-DINHEIRO esta tela gravava
  // `parseFloat(texto)` cru, e nem `precoKitValido` nem a Rule do kit exigem
  // cent-exatidão (só `is number`, porque RN-211 admite negativo).
  it('kit com preço de três casas não vira mil vezes maior ao reabrir e salvar', async () => {
    const { onSalvarKit } = setup({
      evento: { qtdInscritos: 0 },
      kit: mkKit({ preco: 12.345 }),
    });
    // Salvar sem tocar em nada: o preço é o mesmo, arredondado ao centavo.
    // Esta é a asserção que pega o defeito — sem o conserto grava 12345.
    await userEvent.click(screen.getByRole('button', { name: 'Salvar kit' }));
    await waitFor(() => expect(onSalvarKit).toHaveBeenCalled());
    const [, input] = onSalvarKit.mock.calls[0]!;
    expect(input.preco).toBe(12.35);
    expect(input.preco).not.toBe(12345);
    // E o campo se apresenta com a vírgula decimal do pt-BR, como o LoteModal.
    expect(screen.getByLabelText('Preço (delta sobre a inscrição, aceita negativo)')).toHaveValue(
      '12,345',
    );
  });

  it('kit com preço negativo de três casas também não escala (RN-211)', async () => {
    const { onSalvarKit } = setup({
      evento: { qtdInscritos: 0 },
      kit: mkKit({ preco: -12.345, nome: 'Sem kit' }),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar kit' }));
    await waitFor(() => expect(onSalvarKit).toHaveBeenCalled());
    const [, input] = onSalvarKit.mock.calls[0]!;
    expect(input.preco).toBe(-12.35);
    expect(screen.getByLabelText('Preço (delta sobre a inscrição, aceita negativo)')).toHaveValue(
      '-12,345',
    );
  });

  it('preço de duas casas segue intacto no round-trip', async () => {
    const { onSalvarKit } = setup({
      evento: { qtdInscritos: 0 },
      kit: mkKit({ preco: 1234.56 }),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar kit' }));
    await waitFor(() => expect(onSalvarKit).toHaveBeenCalled());
    const [, input] = onSalvarKit.mock.calls[0]!;
    expect(input.preco).toBe(1234.56);
    expect(screen.getByLabelText('Preço (delta sobre a inscrição, aceita negativo)')).toHaveValue(
      '1234,56',
    );
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

// =============================================================================
// PARSE-1 · dois dos dezoito campos (preço e capacidade do kit).
//
// O preço já era campo de texto e já mostrava a frase do parser; a capacidade
// montava a frase e nunca a mostrava, porque era `type="number"` e o navegador
// higienizava o texto antes de o código ver.
// =============================================================================

describe('PARSE-1 · a recusa do parser tem onde aparecer no kit', () => {
  it('preço e capacidade são campo de TEXTO com teclado numérico', () => {
    setup();
    const preco = screen.getByLabelText(/Preço \(delta/i);
    const capacidade = screen.getByLabelText('Capacidade');
    expect(preco).toHaveAttribute('type', 'text');
    expect(preco).toHaveAttribute('inputmode', 'decimal');
    expect(capacidade).toHaveAttribute('type', 'text');
    expect(capacidade).toHaveAttribute('inputmode', 'numeric');
  });

  it('capacidade com casa decimal acusa, em vez de o campo se apagar sozinho', async () => {
    const { onSalvarKit } = setup();
    await userEvent.type(screen.getByLabelText('Nome do kit'), 'Kit Prata');
    await userEvent.clear(screen.getByLabelText('Capacidade'));
    await userEvent.type(screen.getByLabelText('Capacidade'), '2,5');
    await userEvent.click(screen.getByRole('button', { name: /Salvar kit/i }));

    expect(
      await screen.findByText(
        'A quantidade é um número inteiro, sem casas decimais. Para mil, escreva 1.000 ou 1000.',
      ),
    ).toBeInTheDocument();
    expect(onSalvarKit).not.toHaveBeenCalled();
  });

  it('preço no estilo en-US ensina a pontuação', async () => {
    // Evento SEM venda: com venda o preço nasce `disabled` pela RN-200 e a
    // conversa é outra (a frase do bloqueio, que já tem teste próprio).
    const { onSalvarKit } = setup({ evento: { qtdInscritos: 0 } });
    await userEvent.type(screen.getByLabelText('Nome do kit'), 'Kit Prata');
    await userEvent.clear(screen.getByLabelText(/Preço \(delta/i));
    await userEvent.type(screen.getByLabelText(/Preço \(delta/i), '1,234.56');
    await userEvent.click(screen.getByRole('button', { name: /Salvar kit/i }));

    expect(
      await screen.findByText(
        'Pontuação fora do padrão. Ponto separa milhar e vírgula separa centavos (ex.: 1.234,56).',
      ),
    ).toBeInTheDocument();
    expect(onSalvarKit).not.toHaveBeenCalled();
  });

  it('a régua fica embaixo do preço, e a capacidade em branco passa a dizer o que vale', () => {
    setup();
    const preco = screen.getByLabelText(/Preço \(delta/i);
    const capacidade = screen.getByLabelText('Capacidade');
    expect(document.getElementById(`${preco.id}-hint`)).toHaveTextContent(REGUA_PONTO_E_VIRGULA);
    expect(preco.getAttribute('aria-describedby')).toContain(`${preco.id}-hint`);
    expect(document.getElementById(`${capacidade.id}-hint`)).toHaveTextContent(
      CAPACIDADE_DE_KIT_EM_BRANCO,
    );
    expect(capacidade.getAttribute('aria-describedby')).toContain(`${capacidade.id}-hint`);
  });

  it('BASELINE colar de planilha: "1.000" na capacidade e "1.234,56" no preço viram mil e mil duzentos', async () => {
    const { onSalvarKit } = setup({ evento: { qtdInscritos: 0 } });
    await userEvent.type(screen.getByLabelText('Nome do kit'), 'Kit Prata');
    fireEvent.change(screen.getByLabelText('Capacidade'), { target: { value: '1.000' } });
    fireEvent.change(screen.getByLabelText(/Preço \(delta/i), { target: { value: '1.234,56' } });
    await userEvent.click(screen.getByRole('button', { name: /Salvar kit/i }));

    await waitFor(() => expect(onSalvarKit).toHaveBeenCalledTimes(1));
    expect(onSalvarKit.mock.calls[0]?.[1]).toMatchObject({ capacidade: 1000, preco: 1234.56 });
  });
});
