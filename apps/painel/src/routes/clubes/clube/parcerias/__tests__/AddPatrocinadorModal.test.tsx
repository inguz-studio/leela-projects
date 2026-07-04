import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddPatrocinadorModal } from '../AddPatrocinadorModal';
import { validarPatrocinador } from '../../../_lib/parcerias';

function renderModal(over = {}) {
  return render(
    <AddPatrocinadorModal open onOpenChange={() => {}} onCriar={() => {}} {...over} />,
  );
}

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
        contrapartida: 'Troca de produtos por divulgação nas redes do clube.',
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
});
