import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Marca } from '@leela/core';
import { AddPatrocinadorModal } from '../AddPatrocinadorModal';
import { validarPatrocinador } from '../../../_lib/parcerias';

function renderModal(over = {}) {
  return render(
    <AddPatrocinadorModal open onOpenChange={() => {}} onCriar={() => {}} {...over} />,
  );
}

const MARCAS_REGISTRO = [
  {
    id: 'loja-do-corredor',
    nome: 'Loja do Corredor',
    modeloComercial: 'financeiro',
    valorAnual: 12000,
    contrapartida: 'Logo na camiseta e posts mensais nas redes.',
    status: 'ativa',
  },
  {
    id: 'agua-fonte',
    nome: 'Água Fonte',
    modeloComercial: 'permuta',
    contrapartida: 'Fornece água para todos os pontos de hidratação.',
    status: 'ativa',
  },
  {
    id: 'marca-inativa',
    nome: 'Marca Inativa',
    modeloComercial: 'financeiro',
    valorAnual: 5000,
    contrapartida: 'Contrapartida antiga que não vale mais nada aqui.',
    status: 'inativa',
  },
] as unknown as Marca[];

describe('validarPatrocinador', () => {
  it('financeiro exige valor anual > 0', () => {
    const erros = validarPatrocinador({
      nome: 'Loja',
      modeloComercial: 'financeiro',
      contrapartida: 'Contrapartida com mais de vinte caracteres.',
    });
    expect(erros.some((e) => e.includes('valor anual'))).toBe(true);
  });

  it('contrapartida < 20 chars é inválida', () => {
    const erros = validarPatrocinador({
      nome: 'Loja',
      modeloComercial: 'permuta',
      contrapartida: 'curta',
    });
    expect(erros.some((e) => e.includes('contrapartida'))).toBe(true);
  });

  it('permuta com contrapartida longa é válido', () => {
    expect(
      validarPatrocinador({
        nome: 'Loja',
        modeloComercial: 'permuta',
        contrapartida: 'Troca de produtos por divulgação nas redes do club.',
      }),
    ).toEqual([]);
  });
});

describe('AddPatrocinadorModal', () => {
  it('valor anual aparece só no modelo financeiro', async () => {
    renderModal();
    expect(screen.getByLabelText('Valor anual (R$)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Permuta' }));
    expect(screen.queryByLabelText('Valor anual (R$)')).not.toBeInTheDocument();
  });

  it('submit desabilitado até o form ficar válido, e chama onCriar', async () => {
    const onCriar = vi.fn();
    renderModal({ onCriar });
    const enviar = screen.getByRole('button', { name: 'Adicionar patrocinador' });
    expect(enviar).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Nome do patrocinador'), 'Loja do Corredor');
    await userEvent.type(screen.getByLabelText('Valor anual (R$)'), '12000');
    await userEvent.type(
      screen.getByLabelText('Contrapartida'),
      'Logo na camiseta e posts mensais nas redes.',
    );
    expect(enviar).toBeEnabled();
    await userEvent.click(enviar);
    expect(onCriar).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Loja do Corredor', modeloComercial: 'financeiro', valorAnual: 12000 }),
    );
  });

  it('oferece fechamento por Cancelar e X (C10)', async () => {
    const onOpenChange = vi.fn();
    renderModal({ onOpenChange });
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  describe('RN-171 · registro reutilizável (S-R9-12-T2)', () => {
    it('sem registro, o seletor de patrocinadores salvos não aparece', () => {
      renderModal();
      expect(
        screen.queryByRole('button', { name: 'Partir de um patrocinador salvo' }),
      ).not.toBeInTheDocument();
    });

    it('com registro, a seleção é o Combobox do DS (shadcn §8), não um <select> nativo', () => {
      const { container } = renderModal({ marcasDoRegistro: MARCAS_REGISTRO });
      // Trigger do Combobox do DS (Popover+Command), com busca embutida — não a
      // "caixa do SO" que o Vitor apontou.
      expect(
        screen.getByRole('button', { name: 'Partir de um patrocinador salvo' }),
      ).toHaveAttribute('aria-haspopup');
      // Nenhum <select> nativo no modal (regra inviolável shadcn §8).
      expect(container.querySelector('select')).toBeNull();
      // Radix Dialog portaliza o conteúdo no body — varre o document inteiro.
      expect(document.querySelectorAll('select').length).toBe(0);
    });

    // NOTA (zero-flake, persona): a interação de abrir o painel do Combobox e
    // clicar num item NÃO é exercida aqui — o Radix Popover portalizado sob o
    // Radix Dialog (modal, pointer-events do react-remove-scroll) não abre no
    // jsdom, embora funcione no browser real. O contrato abrir/filtrar/
    // selecionar do Combobox é coberto pela suíte do DS
    // (packages/design-system/src/components/Combobox/__tests__). A fiação
    // onValueChange→selecionarMarca→preencherDaMarca é direta (find por id +
    // setState dos campos), verificada por inspeção.
  });
});
