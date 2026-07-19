// =============================================================================
// PROVA do fix W2-F-05 (GATE-DS-W2 · focus trap do RegulamentoModal).
//
// aria-modal sinaliza AT mas NÃO bloqueia teclado: sem trap, Tab escapa para o
// conteúdo atrás do modal. Estes testes provam o mini-trap Radix-free:
//   - Tab no ÚLTIMO focável cicla para o PRIMEIRO;
//   - Shift+Tab no PRIMEIRO cicla para o ÚLTIMO;
//   - foco que escapou do painel é puxado de volta no próximo Tab;
//   - regressão: foco entra no X ao abrir, Esc fecha e devolve ao gatilho.
//
// Focáveis do painel na ordem do DOM: [X (aria-label "Fechar"), botão "Fechar"
// do rodapé] — primeiro e último do ciclo.
// =============================================================================

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RegulamentoModal } from '../app/(public)/[eventSlug]/sections/RegulamentoModal';

afterEach(cleanup);

function abrirModal(): {
  gatilho: HTMLElement;
  primeiro: HTMLElement;
  ultimo: HTMLElement;
} {
  render(<RegulamentoModal regulamento={'Texto do regulamento da prova.'} versao={3} />);
  const gatilho = screen.getByRole('button', { name: /ler regulamento completo/i });
  fireEvent.click(gatilho);
  const dialog = screen.getByRole('dialog');
  // Ambos têm nome acessível "Fechar" (X via aria-label + botão do rodapé);
  // a ordem do DOM define primeiro/último do ciclo.
  const botoesFechar = within(dialog).getAllByRole('button', { name: 'Fechar' });
  expect(botoesFechar).toHaveLength(2);
  const primeiro = botoesFechar[0]!;
  const ultimo = botoesFechar[1]!;
  return { gatilho, primeiro, ultimo };
}

describe('RegulamentoModal — focus trap (W2-F-05)', () => {
  it('ao abrir, o foco entra no primeiro focável (X de fechar)', () => {
    const { primeiro } = abrirModal();
    expect(document.activeElement).toBe(primeiro);
  });

  it('Tab no último focável cicla para o primeiro (não escapa do modal)', () => {
    const { primeiro, ultimo } = abrirModal();
    ultimo.focus();
    expect(document.activeElement).toBe(ultimo);
    fireEvent.keyDown(ultimo, { key: 'Tab' });
    expect(document.activeElement).toBe(primeiro);
  });

  it('Shift+Tab no primeiro focável cicla para o último', () => {
    const { primeiro, ultimo } = abrirModal();
    primeiro.focus();
    fireEvent.keyDown(primeiro, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(ultimo);
  });

  it('foco que escapou para trás do modal é puxado de volta no próximo Tab', () => {
    const { gatilho, primeiro, ultimo } = abrirModal();
    // Simula o vazamento que o finding descreve: foco em elemento ATRÁS do modal.
    gatilho.focus();
    expect(document.activeElement).toBe(gatilho);
    fireEvent.keyDown(gatilho, { key: 'Tab' });
    expect(document.activeElement).toBe(primeiro);
    // E na direção reversa também.
    gatilho.focus();
    fireEvent.keyDown(gatilho, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(ultimo);
  });

  it('regressão: Esc fecha o modal e devolve o foco ao gatilho', () => {
    const { gatilho } = abrirModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(gatilho);
  });
});
