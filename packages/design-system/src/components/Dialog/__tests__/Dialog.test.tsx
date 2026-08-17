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

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

// MODAL-LOTE (17/08, fala do dono na íntegra: "tem scroll bar aparecendo").
// A causa PRINCIPAL do sintoma era a moldura inteira rolando (provado em
// scrollTrava.test.tsx — "Modal: rola em y, fecha x, na wrapper do CORPO, não
// na moldura"). Esta é a causa SECUNDÁRIA: `overflow:hidden` no body faz a
// barra nativa da página sumir e devolve a faixa de pixels que ela ocupava —
// um layout shift de alguns pixels a cada abertura/fechamento de overlay, que
// também lê como "coisa aparecendo/sumindo" mesmo sem barra nova nenhuma.
// `travarRolagem`/`destravarRolagem` (useDialogBehavior.ts) compensam com
// `padding-right` do tamanho exato da barra — provado aqui.
describe('Dialog — compensação de gutter (MODAL-LOTE · 17/08)', () => {
  let innerWidthDesc: PropertyDescriptor | undefined;
  let clientWidthDesc: PropertyDescriptor | undefined;

  beforeEach(() => {
    innerWidthDesc = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    clientWidthDesc = Object.getOwnPropertyDescriptor(document.documentElement, 'clientWidth');
  });

  afterEach(() => {
    if (innerWidthDesc) Object.defineProperty(window, 'innerWidth', innerWidthDesc);
    else delete (window as unknown as Record<string, unknown>).innerWidth;
    if (clientWidthDesc) Object.defineProperty(document.documentElement, 'clientWidth', clientWidthDesc);
    else delete (document.documentElement as unknown as Record<string, unknown>).clientWidth;
  });

  // `innerWidth - clientWidth` é a medida que useDialogBehavior usa — simulada
  // aqui porque jsdom não calcula layout de verdade (clientWidth nasce 0).
  function simularBarraNativa(pixels: number): void {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 1024 - pixels,
      configurable: true,
    });
  }

  it('barra clássica (Windows/Chrome, ~15px): padding-right compensa, e some ao fechar', () => {
    simularBarraNativa(15);
    abrir();
    expect(document.body.style.paddingRight).toBe('15px');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.paddingRight).toBe('');
  });

  it('barra overlay (macOS/mobile, gutter 0): padding-right não é tocado', () => {
    simularBarraNativa(0);
    abrir();
    expect(document.body.style.paddingRight).toBe('');
  });
});

// FIX-OVERLAY-LOGIN (04/08) — o primitivo era o único overlay do DS sem portal
// (Modal, Drawer e DropdownMenu já portalizavam). Em produção isso pôs o modal
// de login da landing dentro de um `<header>` com `backdrop-blur`, que cria
// bloco de contenção para `position: fixed`: o `inset-0` resolveu contra a
// caixa do header (1920×64) e o modal nasceu cortado no topo, sem cortina.
// A prova é ESTRUTURAL porque jsdom não calcula layout nem `backdrop-filter`.
describe('Dialog — portal no body (imune a ancestral filtrado)', () => {
  function AbrirDentroDeAncestralFiltrado(): React.JSX.Element {
    const [open, setOpen] = React.useState(false);
    return (
      // O ancestral hostil, igual ao header da landing.
      <div className="sticky top-0 z-40 backdrop-blur" data-testid="ancestral-filtrado">
        <button type="button" onClick={() => setOpen(true)}>
          Abrir dialog
        </button>
        <Dialog open={open} onOpenChange={setOpen} title="Título do dialog">
          <p>Conteúdo do dialog.</p>
        </Dialog>
      </div>
    );
  }

  it('renderiza no document.body, fora do ancestral que o continha', () => {
    render(<AbrirDentroDeAncestralFiltrado />);
    fireEvent.click(screen.getByRole('button', { name: /abrir dialog/i }));
    const dialog = screen.getByRole('dialog');
    const ancestral = screen.getByTestId('ancestral-filtrado');
    expect(ancestral.contains(dialog)).toBe(false);
    expect(dialog.parentElement).toBe(document.body);
  });

  it('desmonta o conteúdo portalizado ao fechar (não vaza nó no body)', () => {
    render(<AbrirDentroDeAncestralFiltrado />);
    fireEvent.click(screen.getByRole('button', { name: /abrir dialog/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
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
