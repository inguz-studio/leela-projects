/**
 * useDialogBehavior — comportamento ADQUIRIDO de diálogo, Radix-free (ADR-017).
 *
 * PROVENIÊNCIA: extraído verbatim do efeito do `Dialog` público (que por sua
 * vez generalizou o `RegulamentoModal` provado pela lane SECFIX com 10/10
 * testes). É a fonte ÚNICA da parte perigosa de duplicar — focus trap cíclico,
 * Esc, scroll-lock do body e retorno de foco — consumida por TRÊS superfícies:
 *   - `Dialog` (skin pública, bottom-sheet → centrado);
 *   - `Modal` (skin do painel, centrado, ex-Radix — convergência da pendência
 *     (1) do ADR-017: some o `@radix-ui/react-dialog` do grafo);
 *   - `Drawer` (off-canvas do painel, ex-Radix).
 * O comportamento é único; a SKIN (DOM/classe/motion) é de cada componente.
 *
 * Contrato (DoD Modal): Esc fecha; foco ENTRA no alvo ao abrir (X, ou o 1º
 * focável, ou o próprio painel via tabIndex=-1 quando não há focável — paridade
 * com o autofocus do Radix Content); Tab/Shift+Tab CÍCLICOS dentro do painel
 * (aria-modal sinaliza AT mas não bloqueia teclado — W2-F-05); scroll do body
 * travado enquanto aberto e restaurado ao fechar; foco RETORNA ao abridor
 * (`returnFocusRef`, com fallback no elemento ativo no momento da abertura).
 */

import * as React from 'react';

// Seletor dos elementos focáveis (suficiente para conteúdo de diálogo: botões,
// links, campos). Mantido simples de propósito — não é um focus-trap genérico
// de biblioteca.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface UseDialogBehaviorOptions {
  open: boolean;
  /** Fecha o diálogo (ex.: () => onOpenChange(false)). */
  onClose: () => void;
  /** Painel do diálogo — escopo do focus trap e alvo do foco fallback. */
  panelRef: React.RefObject<HTMLElement | null>;
  /**
   * Elemento que recebe o foco ao abrir. Sem ele, foca o 1º focável do painel;
   * sem focável, foca o próprio painel (precisa de tabIndex=-1) — paridade com
   * o autofocus do Radix Content.
   */
  initialFocusRef?: React.RefObject<HTMLElement | null> | undefined;
  /**
   * Elemento que recebe o foco de volta ao fechar (ex.: o botão que abriu).
   * Sem ele, devolve ao elemento ativo no momento da abertura.
   */
  returnFocusRef?: React.RefObject<HTMLElement | null> | undefined;
}

export function useDialogBehavior({
  open,
  onClose,
  panelRef,
  initialFocusRef,
  returnFocusRef,
}: UseDialogBehaviorOptions): void {
  // Elemento ativo no momento da abertura — fallback do retorno de foco.
  const openerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (panel === null) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      const insidePanel = active instanceof HTMLElement && panel.contains(active);
      if (e.shiftKey) {
        // Shift+Tab no primeiro (ou com foco fora do painel) → cicla p/ último.
        if (!insidePanel || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!insidePanel || active === last) {
        // Tab no último (ou com foco fora do painel) → cicla p/ primeiro.
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const overflowBefore = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foco de entrada: alvo explícito → 1º focável → o próprio painel.
    const panel = panelRef.current;
    const target =
      initialFocusRef?.current ??
      panel?.querySelector<HTMLElement>(FOCUSABLE) ??
      panel ??
      null;
    target?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowBefore;
      // Retorna o foco ao abridor ao fechar (retorno de foco do DoD Modal).
      const back = returnFocusRef?.current ?? openerRef.current;
      back?.focus();
    };
  }, [open, onClose, panelRef, initialFocusRef, returnFocusRef]);
}
