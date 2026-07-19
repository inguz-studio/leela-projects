/**
 * Dialog — modal Radix-free para a superfície PÚBLICA (ADR-017 · W2-F-06).
 *
 * PROVENIÊNCIA: generalização do `RegulamentoModal` da landing — o dialog
 * acessível que a lane SECFIX provou com 10/10 testes (focus trap, Esc,
 * retorno de foco). O comportamento migra para o DS como fonte única; a
 * landing vira consumidor fino. NÃO substitui o `Modal` (Radix Dialog) do
 * painel — convergência registrada como follow-up pós-S8FIX no ADR-017.
 *
 * Por que Radix-free: a landing (Next 14, Server Components, bundle público)
 * é deliberadamente sem `@radix-ui/*` — o dist do DS externaliza Radix e o
 * import quebrava o bundle público (500 da lane LPVK). Este componente usa
 * só React + lucide (SVG puro) + tokens; entra na landing pelo subpath
 * `@leela/design-system/dialog` sob o boundary 'use client' do consumidor.
 *
 * A11y (DoD Modal): role=dialog + aria-modal + aria-labelledby (+
 * aria-describedby quando há description); 4 vias de fechamento (X, Esc,
 * clique no overlay, ação no footer via onOpenChange(false)); foco entra no
 * X ao abrir e RETORNA ao abridor ao fechar (`returnFocusRef`, com fallback
 * no elemento ativo no momento da abertura); scroll do body travado; focus
 * trap CÍCLICO de Tab/Shift+Tab (aria-modal sinaliza AT mas não bloqueia
 * teclado — W2-F-05).
 *
 * Skin default = superfície pública (bottom-sheet no mobile, centrado sm+),
 * 100% token; sobrescritas por className hooks (container/overlay/panel/
 * header/body/footer) para reestilização futura (ex.: painel).
 * `z-50` segue a escala z consistente das superfícies (tokenização --z-* é
 * proposta registrada no W2-F-04/W1-M-04 — manter alinhado até lá).
 */

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

// Seletor dos elementos focáveis do painel (suficiente para conteúdo de
// dialog: botões, links, campos). Mantido simples de propósito — não é um
// focus-trap genérico de biblioteca.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título acessível (vira o aria-labelledby). */
  title: React.ReactNode;
  /** Adorno decorativo antes do título (ex.: ícone lucide com aria-hidden). */
  titleIcon?: React.ReactNode | undefined;
  /** Linha de apoio sob o título (vira o aria-describedby). */
  description?: React.ReactNode | undefined;
  /** Slot de rodapé — ações (ex.: botão Fechar/confirmar). */
  footer?: React.ReactNode | undefined;
  children: React.ReactNode;
  /**
   * Elemento que recebe o foco de volta ao fechar (ex.: o botão que abriu).
   * Sem ele, devolve ao elemento ativo no momento da abertura.
   */
  returnFocusRef?: React.RefObject<HTMLElement | null> | undefined;
  /** Nível do heading do título — a hierarquia da página decide (default h2). */
  titleAs?: 'h2' | 'h3' | undefined;
  /** aria-label do botão X (default "Fechar"). */
  closeLabel?: string | undefined;
  /** Sobrescritas de apresentação — defaults são a skin pública por token. */
  containerClassName?: string | undefined;
  overlayClassName?: string | undefined;
  panelClassName?: string | undefined;
  headerClassName?: string | undefined;
  bodyClassName?: string | undefined;
  footerClassName?: string | undefined;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  titleIcon,
  description,
  footer,
  children,
  returnFocusRef,
  titleAs = 'h2',
  closeLabel = 'Fechar',
  containerClassName,
  overlayClassName,
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: DialogProps): React.JSX.Element | null {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  // Elemento ativo no momento da abertura — fallback do retorno de foco.
  const openerRef = React.useRef<HTMLElement | null>(null);

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  // Esc fecha; foco entra no X ao abrir; scroll do body travado; Tab/Shift+Tab
  // ficam CÍCLICOS dentro do painel (focus trap · W2-F-05). Cleanup devolve o
  // foco ao abridor (returnFocusRef ?? elemento ativo na abertura).
  React.useEffect(() => {
    if (!open) return;
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        close();
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
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowBefore;
      // Retorna o foco ao abridor ao fechar (retorno de foco do DoD Modal).
      const target = returnFocusRef?.current ?? openerRef.current;
      target?.focus();
    };
  }, [open, close, returnFocusRef]);

  if (!open) return null;

  const TitleTag = titleAs;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-end justify-center sm:items-center',
        containerClassName,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description !== undefined ? descriptionId : undefined}
    >
      {/* Overlay — escurece + fecha ao clicar (via 1..4). Token com alpha. */}
      <div
        aria-hidden
        className={cn('absolute inset-0 bg-surface-base/80 backdrop-blur-sm', overlayClassName)}
        onClick={close}
      />

      {/* Painel — surface-raised, radius e elevação do DS; scroll interno. */}
      <div
        ref={panelRef}
        className={cn(
          'relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-ds-lg bg-surface-raised shadow-elev-3 sm:rounded-ds-lg',
          panelClassName,
        )}
      >
        <div
          className={cn(
            'flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4 sm:px-6',
            headerClassName,
          )}
        >
          <div className="min-w-0">
            <TitleTag
              id={titleId}
              className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-text-primary"
            >
              {titleIcon}
              {title}
            </TitleTag>
            {description !== undefined ? (
              <p id={descriptionId} className="mt-1 text-sm text-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={closeLabel}
            onClick={close}
            className="shrink-0 rounded-ds-sm p-1.5 text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        {/* Corpo com scroll interno — o conteúdo é do consumidor. */}
        <div className={cn('overflow-y-auto px-5 py-4 sm:px-6', bodyClassName)}>{children}</div>

        {footer !== undefined ? (
          <div
            className={cn(
              'flex justify-end border-t border-border-subtle px-5 py-3 sm:px-6',
              footerClassName,
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

Dialog.displayName = 'Dialog';
