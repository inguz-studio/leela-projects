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
import { fireEvent, render, screen } from '@testing-library/react';
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
  reservas: 0,
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

  it('⛔ V2708-26: NÃO pergunta motivo — o dono cortou a exigência dos fluxos do organizador', () => {
    renderModal();
    expect(screen.queryByLabelText(/Motivo/i)).not.toBeInTheDocument();
  });

  it('o caso do dono: baixar 50 → 20 com 19 vendidos é aceito (sobra 1 disponível)', async () => {
    const onAjustar = renderModal();
    const usuario = userEvent.setup({ delay: null });
    const campo = screen.getByLabelText(/Nova capacidade/i);
    await usuario.clear(campo);
    await usuario.type(campo, '20');
    // V2708-26: sem campo de motivo — o dono cortou a exigência.

    const salvar = screen.getByRole('button', { name: 'Salvar capacidade' });
    expect(salvar).toBeEnabled();
    await usuario.click(salvar);
    expect(onAjustar).toHaveBeenCalledWith('5k-lote-2', 20);
  });

  // ---------------------------------------------------------------------------
  // REV-LOTES · achado #1 (frente D) — a ARITMÉTICA NA TELA, não só no payload.
  //
  // O teste acima provava que o 20 chega no callable. O dono não reclamou do
  // payload: ele reclamou do NÚMERO NA TELA ("editar total de 50 para 20 com 19
  // vendidos ⇒ 1 disponível, não 31"). Esta é a única tela onde a vaga de um
  // lote COM VENDA é editável — no LoteModal o campo fica `disabled` exatamente
  // quando `vendidos > 0` —, e o painel daqui lia só o valor GRAVADO. Sem estes
  // testes, o 31 continuava na cara dele com a suíte verde.
  // ---------------------------------------------------------------------------
  it('o painel acompanha o total digitado: 50 → 20 com 19 vendidos mostra 1, não 31', async () => {
    renderModal();
    const usuario = userEvent.setup({ delay: null });
    expect(screen.getByText('Disponível').nextSibling).toHaveTextContent('31');

    const campo = screen.getByLabelText(/Nova capacidade/i);
    await usuario.clear(campo);
    await usuario.type(campo, '20');

    expect(screen.getByText('Configurado').nextSibling).toHaveTextContent('20');
    expect(screen.getByText('Vendido').nextSibling).toHaveTextContent('19');
    expect(screen.getByText('Disponível').nextSibling).toHaveTextContent('1');
    // A prévia diz que ainda não está salvo, e lembra o número gravado.
    expect(screen.getByRole('status')).toHaveTextContent(/ainda não salvo/i);
    expect(screen.getByRole('status')).toHaveTextContent(/50/);
  });

  it('total igual ao vendido zera o disponível na prévia (sem negativo)', async () => {
    renderModal();
    const usuario = userEvent.setup({ delay: null });
    const campo = screen.getByLabelText(/Nova capacidade/i);
    await usuario.clear(campo);
    await usuario.type(campo, '19');
    expect(screen.getByText('Disponível').nextSibling).toHaveTextContent('0');
  });

  it('nenhum caminho de tela mostra disponível negativo — nem abaixo do vendido, nem negativo digitado', async () => {
    renderModal();
    const usuario = userEvent.setup({ delay: null });
    const campo = screen.getByLabelText(/Nova capacidade/i);

    // Abaixo do vendido: recusado, e o disponível fica em 0 — nunca −9.
    await usuario.clear(campo);
    await usuario.type(campo, '10');
    expect(screen.getByText('Disponível').nextSibling).toHaveTextContent('0');
    expect(screen.getByText('Disponível').nextSibling).not.toHaveTextContent('-');

    // Total negativo digitado: ilegível para a prévia, cai no gravado.
    await usuario.clear(campo);
    await usuario.type(campo, '-5');
    expect(screen.getByText('Disponível').nextSibling).not.toHaveTextContent('-');
    expect(screen.getByRole('button', { name: 'Salvar capacidade' })).toBeDisabled();
  });

  it('campo vazio ou meio-digitado não pisca o painel em branco', async () => {
    renderModal();
    const usuario = userEvent.setup({ delay: null });
    await usuario.clear(screen.getByLabelText(/Nova capacidade/i));
    expect(screen.getByText('Configurado').nextSibling).toHaveTextContent('50');
    expect(screen.getByText('Disponível').nextSibling).toHaveTextContent('31');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('baixar ABAIXO do vendido é recusado com o limite à mostra, e nada é chamado', async () => {
    const onAjustar = renderModal();
    const usuario = userEvent.setup({ delay: null });
    const campo = screen.getByLabelText(/Nova capacidade/i);
    await usuario.clear(campo);
    await usuario.type(campo, '10');

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

    await usuario.click(screen.getByRole('button', { name: 'Salvar capacidade' }));
    expect(onAjustar).toHaveBeenCalledWith('5k-lote-2', 19);
  });
});

// =============================================================================
// PARSE-1 · o campo da capacidade (um dos dezoito).
//
// Aqui havia DOIS motivos para a mensagem não aparecer, e o `type="number"` era
// só o primeiro. O segundo morava na própria tela: o `errorMessage` só era
// passado quando `capacidadeParseavel` era verdadeiro — isto é, exatamente
// quando a frase do parser NÃO existe. A recusa era montada e jogada fora.
// =============================================================================

describe('PARSE-1 · a recusa do parser tem onde aparecer na capacidade', () => {
  it('é campo de TEXTO com teclado numérico', () => {
    renderModal();
    const campo = screen.getByLabelText(/Nova capacidade/i);
    expect(campo).toHaveAttribute('type', 'text');
    expect(campo).toHaveAttribute('inputmode', 'numeric');
  });

  it('casa decimal na capacidade diz o que fazer, e o botão fecha', async () => {
    const onAjustar = renderModal();
    const usuario = userEvent.setup({ delay: null });
    const campo = screen.getByLabelText(/Nova capacidade/i);
    await usuario.clear(campo);
    await usuario.type(campo, '2,5');

    expect(
      screen.getByText(
        'A quantidade é um número inteiro, sem casas decimais. Para mil, escreva 1.000 ou 1000.',
      ),
    ).toBeInTheDocument();
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Salvar capacidade' })).toBeDisabled();
    expect(onAjustar).not.toHaveBeenCalled();
  });

  it('BASELINE colar de planilha: "1.000" atravessa o campo e vale mil', async () => {
    const onAjustar = renderModal();
    const usuario = userEvent.setup({ delay: null });
    const campo = screen.getByLabelText(/Nova capacidade/i);
    fireEvent.change(campo, { target: { value: '1.000' } });
    expect(campo).toHaveValue('1.000');
    expect(screen.getByText('Configurado').nextSibling).toHaveTextContent('1.000');

    await usuario.click(screen.getByRole('button', { name: 'Salvar capacidade' }));
    expect(onAjustar).toHaveBeenCalledWith('5k-lote-2', 1000);
  });
});
