// =============================================================================
// Dialog (Radix-free · ADR-017) — comportamento ADQUIRIDO da lane SECFIX.
//
// Esta suíte é o espelho, no nível do primitivo, dos testes que a landing
// provou em test/regulamento-modal-focus-trap.test.tsx (W2-F-05):
//   - Tab no ÚLTIMO focável cicla para o PRIMEIRO;
//   - Shift+Tab no PRIMEIRO cicla para o ÚLTIMO;
//   - foco que escapou do painel é puxado de volta no próximo Tab;
//   - foco entra no X ao abrir, Esc fecha e devolve ao abridor;
// + contrato a11y do primitivo (role/aria-modal/labelledby/describedby),
// overlay-click fecha, e fallback de retorno de foco sem returnFocusRef.
// =============================================================================

import { afterEach, describe, expect, it } from 'vitest';
import * as React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Dialog } from '../Dialog';

afterEach(cleanup);

function Harness({ useReturnRef = true }: { useReturnRef?: boolean }): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  return (
    <div>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Abrir dialog
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Título do dialog"
        titleAs="h3"
        description="Linha de apoio"
        returnFocusRef={useReturnRef ? triggerRef : undefined}
        footer={
          <button type="button" onClick={() => setOpen(false)}>
            Fechar
          </button>
        }
      >
        <p>Conteúdo do dialog.</p>
      </Dialog>
    </div>
  );
}

function abrir(props?: { useReturnRef?: boolean }): {
  gatilho: HTMLElement;
  dialog: HTMLElement;
  primeiro: HTMLElement;
  ultimo: HTMLElement;
} {
  render(<Harness {...props} />);
  const gatilho = screen.getByRole('button', { name: /abrir dialog/i });
  fireEvent.click(gatilho);
  const dialog = screen.getByRole('dialog');
  // Focáveis na ordem do DOM: X (aria-label "Fechar") e o botão do footer.
  const botoes = within(dialog).getAllByRole('button', { name: 'Fechar' });
  expect(botoes).toHaveLength(2);
  return { gatilho, dialog, primeiro: botoes[0]!, ultimo: botoes[1]! };
}

describe('Dialog — contrato a11y', () => {
  it('expõe role=dialog + aria-modal + labelledby/describedby ligados', () => {
    const { dialog } = abrir();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelId = dialog.getAttribute('aria-labelledby');
    const descId = dialog.getAttribute('aria-describedby');
    expect(labelId).toBeTruthy();
    expect(descId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent).toContain('Título do dialog');
    expect(document.getElementById(descId!)?.textContent).toContain('Linha de apoio');
  });

  it('respeita titleAs (heading não quebra a hierarquia da página)', () => {
    abrir();
    expect(screen.getByRole('heading', { level: 3, name: /título do dialog/i })).toBeTruthy();
  });

  it('clique no overlay fecha (via de fechamento nº 3)', () => {
    const { dialog } = abrir();
    const overlay = dialog.firstElementChild as HTMLElement;
    expect(overlay.getAttribute('aria-hidden')).not.toBeNull();
    fireEvent.click(overlay);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('trava o scroll do body enquanto aberto e restaura ao fechar', () => {
    abrir();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
  });
});

describe('Dialog — focus trap (comportamento adquirido W2-F-05)', () => {
  it('ao abrir, o foco entra no primeiro focável (X de fechar)', () => {
    const { primeiro } = abrir();
    expect(document.activeElement).toBe(primeiro);
  });

  it('Tab no último focável cicla para o primeiro (não escapa do dialog)', () => {
    const { primeiro, ultimo } = abrir();
    ultimo.focus();
    expect(document.activeElement).toBe(ultimo);
    fireEvent.keyDown(ultimo, { key: 'Tab' });
    expect(document.activeElement).toBe(primeiro);
  });

  it('Shift+Tab no primeiro focável cicla para o último', () => {
    const { primeiro, ultimo } = abrir();
    primeiro.focus();
    fireEvent.keyDown(primeiro, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(ultimo);
  });

  it('foco que escapou para trás do dialog é puxado de volta no próximo Tab', () => {
    const { gatilho, primeiro, ultimo } = abrir();
    gatilho.focus();
    expect(document.activeElement).toBe(gatilho);
    fireEvent.keyDown(gatilho, { key: 'Tab' });
    expect(document.activeElement).toBe(primeiro);
    gatilho.focus();
    fireEvent.keyDown(gatilho, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(ultimo);
  });

  it('Esc fecha e devolve o foco ao returnFocusRef (abridor)', () => {
    const { gatilho } = abrir();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(gatilho);
  });

  it('sem returnFocusRef, devolve ao elemento ativo no momento da abertura', () => {
    const { gatilho } = abrir({ useReturnRef: false });
    // jsdom: click não move foco — simula o teclado real focando o gatilho
    // antes de abrir de novo. Fecha e confere o fallback.
    fireEvent.keyDown(document, { key: 'Escape' });
    gatilho.focus();
    fireEvent.click(gatilho);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(gatilho);
  });
});
