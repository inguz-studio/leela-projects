// =============================================================================
// CapacidadeModal — a recusa de reduzir abaixo do vendido (BUILD-LOTES-UX ·
// frente D, decisão do maestro).
//
// Aqui vive a única edição de vaga permitida depois da primeira venda (RN-304).
// O que estes testes protegem é a POSTURA da recusa: baixar o total abaixo do
// que já foi vendido não é aceito em silêncio nem mostrado como negativo — é
// recusado com o limite à mostra e o botão fechado, ANTES de qualquer chamada.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import type { Lote } from '@leela/core';
import { CapacidadeModal } from '../CapacidadeModal';
import { ts } from '../../_test/fixtures';

const LOTE: Lote = {
  id: '5k-lote-2',
  tenantId: 'castelo',
  modalidade: '5k',
  ordem: 2,
  nome: 'Lote 2',
  quantidadeLimite: 50,
  preco: 75,
  vendidos: 19,
  inicioEm: ts(new Date('2026-02-01T03:00:00Z')),
  fimEm: ts(new Date('2026-04-01T03:00:00Z')),
  criadoEm: ts(new Date('2025-11-01T00:00:00Z')),
  atualizadoEm: ts(new Date('2025-11-01T00:00:00Z')),
};

function renderModal(onAjustar = vi.fn().mockResolvedValue(undefined)) {
  render(
    <ToastProvider>
      <CapacidadeModal open onOpenChange={vi.fn()} lote={LOTE} onAjustar={onAjustar} />
    </ToastProvider>,
  );
  return onAjustar;
}

describe('CapacidadeModal · aritmética e recusa (frente D)', () => {
  it('abre mostrando os três números: configurado, vendido e disponível', () => {
    renderModal();
    expect(screen.getByText('Configurado').nextSibling).toHaveTextContent('50');
    expect(screen.getByText('Vendido').nextSibling).toHaveTextContent('19');
    expect(screen.getByText('Disponível').nextSibling).toHaveTextContent('31');
  });

  it('o caso do dono: baixar 50 → 20 com 19 vendidos é aceito (sobra 1 disponível)', async () => {
    const onAjustar = renderModal();
    const usuario = userEvent.setup({ delay: null });
    const campo = screen.getByLabelText(/Nova capacidade/i);
    await usuario.clear(campo);
    await usuario.type(campo, '20');
    await usuario.type(screen.getByLabelText(/Motivo do ajuste/i), 'Fechando as vagas que sobraram.');

    const salvar = screen.getByRole('button', { name: 'Salvar capacidade' });
    expect(salvar).toBeEnabled();
    await usuario.click(salvar);
    expect(onAjustar).toHaveBeenCalledWith('5k-lote-2', 20, 'Fechando as vagas que sobraram.');
  });

  it('baixar ABAIXO do vendido é recusado com o limite à mostra, e nada é chamado', async () => {
    const onAjustar = renderModal();
    const usuario = userEvent.setup({ delay: null });
    const campo = screen.getByLabelText(/Nova capacidade/i);
    await usuario.clear(campo);
    await usuario.type(campo, '10');
    await usuario.type(screen.getByLabelText(/Motivo do ajuste/i), 'Tentativa de reduzir demais.');

    // Recusa explícita, com o número que manda no limite.
    expect(screen.getByText(/menor que o vendido \(19\)/i)).toBeInTheDocument();
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    // E nunca um disponível negativo: a dica repete o piso.
    expect(screen.getByText(/Não pode ficar abaixo de 19/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Salvar capacidade' })).toBeDisabled();
    await usuario.click(screen.getByRole('button', { name: 'Salvar capacidade' }));
    expect(onAjustar).not.toHaveBeenCalled();
  });

  it('reduzir ATÉ o vendido é permitido — é como se fecha a venda sem desfazer venda', async () => {
    const onAjustar = renderModal();
    const usuario = userEvent.setup({ delay: null });
    const campo = screen.getByLabelText(/Nova capacidade/i);
    await usuario.clear(campo);
    await usuario.type(campo, '19');
    await usuario.type(screen.getByLabelText(/Motivo do ajuste/i), 'Encerrando a venda deste lote.');

    await usuario.click(screen.getByRole('button', { name: 'Salvar capacidade' }));
    expect(onAjustar).toHaveBeenCalledWith('5k-lote-2', 19, 'Encerrando a venda deste lote.');
  });
});
