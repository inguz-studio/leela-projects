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
 *
 * PORTAL PARA O BODY (defeito de produção 04/08 · FIX-OVERLAY-LOGIN)
 * -----------------------------------------------------------------
 * Este primitivo era o ÚNICO overlay do DS que renderizava in-place: `Modal`,
 * `Drawer` e `DropdownMenu` já portalizavam. A omissão custou caro em produção.
 *
 * `position: fixed` NÃO resolve contra a viewport quando algum ancestral cria
 * bloco de contenção — e `backdrop-filter` cria, pela mesma regra de
 * `transform`/`filter`/`perspective`/`will-change`/`contain`. O `PublicHeader`
 * da landing é `sticky top-0 z-40 ... backdrop-blur` e o slot de conta vive
 * dentro dele; o `fixed inset-0` deste container passou a resolver contra a
 * caixa do header (medido no ar: 1920×64 numa viewport de 911 de altura). O
 * modal de login centralizava dentro de 64px, nascia cortado ao meio colado no
 * topo, e a cortina não cobria tela nenhuma.
 *
 * A correção é o portal, não tirar o `backdrop-blur` do header: o blur é da
 * marca e não é a causa — a causa é o overlay estar DENTRO dele. Portalizado no
 * `document.body`, o container fica imune a QUALQUER ancestral filtrado, hoje e
 * no futuro, para os quatro consumidores (login, regulamento, kit, aceites).
 *
 * Efeito colateral bem-vindo no empilhamento: o `backdrop-filter` do header
 * também criava CONTEXTO DE EMPILHAMENTO, então o `z-50` daqui ficava preso
 * dentro do `z-40` do header — a barra fixa "Garantir inscrição" da página do
 * evento (também `z-40`, e posterior no DOM) pintava POR CIMA do modal. No body,
 * os três disputam no contexto raiz e `z-50` ganha de ambos sem tocar em token.
 *
 * SSR (Next 14): `createPortal` toca `document`, que não existe no servidor, e
 * um portal presente já na hidratação diverge do HTML do servidor. Por isso o
 * portal só monta depois do primeiro efeito do cliente (`montado`), e o
 * `useDialogBehavior` recebe `open && montado` — sem esse `&&`, um diálogo que
 * nascesse aberto rodaria o efeito de foco com o painel ainda fora do DOM e o
 * foco nunca entraria. Nenhum consumidor nasce aberto hoje; a trava é para que
 * o primeiro que nascer não descubra isso em produção.
 *
 * MOVIMENTO (BUILD-MOTION · ordem do dono de 04/08)
 * ------------------------------------------------
 * A REGRA DA SUPERFÍCIE, escrita para não ser reinventada tela a tela:
 *   - a CORTINA sempre faz fade, nos dois breakpoints — ela não tem forma, só
 *     presença;
 *   - o PAINEL no mobile é bottom-sheet: já nasce encostado na borda de baixo
 *     (`items-end`), então sobe de lá. Uma folha que aparece por fade no lugar
 *     onde o polegar espera um gesto lê como bug de renderização;
 *   - o PAINEL no desktop (sm+) é card CENTRADO: não há borda de onde vir, e
 *     deslizar faria parecer que ele caiu. Fade + zoom curto, que é a gramática
 *     do `Modal` do painel — as duas superfícies do produto se movem igual.
 *
 * A SAÍDA é animada de verdade: o nó só some do DOM depois que a animação
 * termina (`usePresencaOverlay`). O `useDialogBehavior` recebe `presente`, não
 * `open` — então o focus trap, o scroll-lock e o RETORNO DE FOCO ao abridor
 * acontecem no desmonte, como no Radix. Um diálogo que devolvesse o foco no
 * início da saída deixaria a pessoa navegando por cima de um painel que ainda
 * está na tela.
 *
 * Duração por token (`--motion-overlay-duration`) e reduced-motion tratados em
 * `utils/overlayMotion` — ver o cabeçalho de lá.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { estiloMotion, usePresencaOverlay } from '../../utils/overlayMotion';
import { useDialogBehavior } from './useDialogBehavior';

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

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  // Só o cliente tem `document.body` — ver "PORTAL PARA O BODY" no topo.
  const [montado, setMontado] = React.useState(false);
  React.useEffect(() => {
    setMontado(true);
  }, []);

  // `aberto` é o estado REAL da tela: aberto E com o painel podendo existir no
  // DOM. O hook precisa dessa versão, não do `open` cru, senão o efeito de foco
  // rodaria antes do portal existir.
  const aberto = open && montado;

  // `presente` continua true durante a SAÍDA — é o que dá tempo do
  // `data-state="closed"` rodar a animação antes do nó sumir.
  const { presente, estado } = usePresencaOverlay(aberto);

  // Comportamento (Esc, focus trap cíclico, scroll-lock, retorno de foco) é
  // fonte ÚNICA no hook compartilhado — foco de entrada no X (closeRef).
  // Recebe `presente`: o foco volta ao abridor no DESMONTE, não no início da
  // saída (paridade com o Radix).
  useDialogBehavior({
    open: presente,
    onClose: close,
    panelRef,
    initialFocusRef: closeRef,
    returnFocusRef,
  });

  if (!presente) return null;

  const TitleTag = titleAs;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-end justify-center sm:items-center',
        containerClassName,
      )}
      data-state={estado}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description !== undefined ? descriptionId : undefined}
    >
      {/* Overlay — escurece + fecha ao clicar (via 1..4). Token com alpha.
          Motion: fade nos dois breakpoints, gated por motion-safe. */}
      <div
        aria-hidden
        data-state={estado}
        style={estiloMotion(estado)}
        className={cn(
          'absolute inset-0 bg-surface-base/80 backdrop-blur-sm',
          'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0',
          'motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0',
          overlayClassName,
        )}
        onClick={close}
      />

      {/* Painel — surface-raised, radius e elevação do DS; scroll interno.
          Motion: sobe do rodapé no mobile (bottom-sheet), fade+zoom centrado
          no desktop — `slide-*-bottom-0` zera a translação a partir de `sm`. */}
      <div
        ref={panelRef}
        data-state={estado}
        style={estiloMotion(estado)}
        className={cn(
          'relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-ds-lg bg-surface-raised shadow-elev-3 sm:rounded-ds-lg',
          'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0',
          'motion-safe:data-[state=open]:slide-in-from-bottom',
          'motion-safe:sm:data-[state=open]:slide-in-from-bottom-0 motion-safe:sm:data-[state=open]:zoom-in-95',
          'motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0',
          'motion-safe:data-[state=closed]:slide-out-to-bottom',
          'motion-safe:sm:data-[state=closed]:slide-out-to-bottom-0 motion-safe:sm:data-[state=closed]:zoom-out-95',
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
    </div>,
    document.body,
  );
}

Dialog.displayName = 'Dialog';
