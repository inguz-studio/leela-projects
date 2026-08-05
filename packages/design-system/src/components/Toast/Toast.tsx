/**
 * Toast — feedback de ação de escrita (DoD Tela).
 *
 * PROVENIÊNCIA (Lote A restante, decisão bd31974): VISUAL shadcn `toast`,
 * COMPORTAMENTO nosso. O frame adota a receita stock (rounded-md + border +
 * shadow + animate-in) via classes de ALIAS shadcn→brasa (border-border,
 * bg-popover = surface-overlay — mesma cor resolvida de antes) e motion
 * tokenizado (A2: animate-in roda em var(--motion-duration-fast)). A fila do
 * `useToast` (ToastProvider) fica INTACTA — nada de Radix Toast primitives.
 *
 * MOVIMENTO (BUILD-MOTION · 04/08 — o dono pediu "a mesma coisa para os toasts").
 * O toast entrava com fade + slide de baixo e sumia por corte: o `ToastProvider`
 * tirava o item da fila e o nó evaporava. Agora ele SAI pelo mesmo caminho por
 * onde entrou (fade + slide para baixo, de volta ao canto de onde veio), e quem
 * segura o item na fila até a animação terminar é o provider — o componente só
 * obedece ao `state` que recebe.
 *
 * ⛔ O toast é a peça em que os 800ms de `--motion-overlay-duration` mais
 * incomodam, e o motivo está registrado no handoff: ele já vive 4s na tela;
 * somar quase um segundo de saída em cada aviso de "salvo" faz o canto da tela
 * parecer ocupado o tempo todo. A recomendação técnica é 200-300ms. A decisão é
 * do dono e a troca é uma linha em `tokens/component.json`.
 *
 * Regras preservadas do E01:
 *   - Some em 4s; variante danger persiste até dismiss manual (ToastProvider).
 *   - Borda esquerda 3px por variante (--toast-border-left + feedback-*) —
 *     marcador semântico brasa, sobrepõe a borda stock só no lado esquerdo.
 *   - danger usa role="alert" (assertivo); demais role="status" (polite).
 *
 * AA: título/descrição sobre bg-popover = text-primary|secondary sobre
 * surface-overlay; borda esquerda = feedback-* sobre surface-overlay — todos
 * na matriz de contraste (contrast.test.ts). border-border é decorativa
 * (frame shadcn), não-funcional — fora do gate 1.4.11.
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { estiloMotion, type EstadoOverlay } from '../../utils/overlayMotion';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const toastVariants = cva(
  [
    'group relative flex items-start gap-[var(--spacing-3)]',
    'w-[var(--toast-width)] max-w-[calc(100vw-var(--spacing-8))]',
    // Frame shadcn stock via aliases: superfície + borda + raio + elevação
    'bg-popover',
    'rounded-md border border-border',
    'shadow-elev-2',
    'p-[var(--spacing-4)]',
    // Marcador semântico brasa (E01): borda esquerda por variante
    'border-l-[length:var(--toast-border-left)]',
    // Motion (A2 + BUILD-MOTION): entrada stock do toast shadcn, e a saída
    // pelo mesmo caminho. Tudo gated por motion-safe.
    'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:slide-in-from-bottom-2',
    'motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:slide-out-to-bottom-2',
  ].join(' '),
  {
    variants: {
      variant: {
        success: 'border-l-[color:var(--feedback-success)]',
        danger: 'border-l-[color:var(--feedback-danger)]',
        warning: 'border-l-[color:var(--feedback-warning)]',
        info: 'border-l-[color:var(--feedback-info)]',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ToastVariant = NonNullable<VariantProps<typeof toastVariants>['variant']>;

export interface ToastProps {
  title: string;
  description?: string | undefined;
  variant?: ToastVariant;
  onDismiss?: () => void;
  className?: string;
  /**
   * Fase do movimento. Quem controla é o `ToastProvider`, que mantém o item na
   * fila durante a saída. Default `'open'` para o uso avulso (showroom, teste
   * de apresentação) continuar aparecendo com a entrada de sempre.
   */
  state?: EstadoOverlay;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Toast({
  title,
  description,
  variant = 'info',
  onDismiss,
  className,
  state = 'open',
}: ToastProps): JSX.Element {
  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      data-state={state}
      style={estiloMotion(state)}
      className={cn(toastVariants({ variant }), className)}
    >
      <div className="flex flex-col gap-[var(--spacing-1)] min-w-0 flex-1">
        <p className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {title}
        </p>
        {description && (
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Fechar notificação"
          onClick={onDismiss}
          className={cn(
            'shrink-0 inline-flex items-center justify-center',
            'h-[var(--spacing-6)] w-[var(--spacing-6)]',
            'rounded-[var(--radius-sm)]',
            'text-[var(--text-secondary)]',
            'hover:bg-accent hover:text-accent-foreground',
            'transition-colors duration-[var(--motion-duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-ring',
          )}
        >
          <span aria-hidden>✕</span>
        </button>
      )}
    </div>
  );
}

Toast.displayName = 'Toast';

export { Toast, toastVariants };
