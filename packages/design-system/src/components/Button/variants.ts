/**
 * buttonVariants — receita cva do Button, extraída para módulo próprio
 * (ADR-017 · lote MODAL-ADR). Motivo: o subpath server-safe do DS
 * (`@leela/design-system/server`) exporta esta receita para composição em
 * Server Components (ex.: CTA da landing) SEM puxar `@radix-ui/react-slot`
 * (que só o componente Button usa, para `asChild`). Zero mudança de valor:
 * o bloco abaixo é o mesmo que vivia em Button.tsx — Button re-exporta.
 */

import { cva } from 'class-variance-authority';

// ---------------------------------------------------------------------------
// Variant definitions
// ---------------------------------------------------------------------------

const buttonVariants = cva(
  // ── Base ─────────────────────────────────────────────────────────────────
  [
    'inline-flex items-center justify-center gap-2',
    'font-[var(--btn-font-weight)] not-italic select-none whitespace-nowrap',
    'rounded-[var(--btn-radius)]',
    'ring-offset-background',
    'transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
    // Focus ring — cor por alias (ring = border-focus), largura por token, offset AA
    'focus-visible:outline-none',
    'focus-visible:ring-[length:var(--btn-focus-ring)]',
    'focus-visible:ring-ring',
    'focus-visible:ring-offset-2',
    // Disabled
    'disabled:pointer-events-none disabled:opacity-40',
    // Borda estrutural transparente (receita do mockup be-hero `.btn`): mantém
    // §2.16 flat nos variants cheios E estabiliza dimensões quando o secondary
    // (outline) pinta a borda — zero layout shift entre variantes.
    'border border-transparent',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--action-primary)] text-[var(--action-primary-fg)]',
          'hover:bg-[var(--action-primary-hover)]',
          'active:bg-[var(--action-primary-pressed)]',
        ].join(' '),

        // Outline + brand-tint (congruência mockup be-hero `.btn-secondary`,
        // patch 2026-07-06): transparente com borda strong em repouso; hover
        // vira tint de marca (--action-brand-tint, literal rgba por tema) com
        // borda brand e texto no hover da marca. AA provado por composição
        // alpha-sobre-surface em contrast.test.ts (brand-tint §).
        secondary: [
          'bg-transparent text-[var(--text-primary)]',
          'border-[var(--border-strong)]',
          'hover:bg-[var(--action-brand-tint)]',
          'hover:border-[var(--border-brand)]',
          'hover:text-[var(--action-brand-tint-fg)]',
          'active:bg-[var(--action-brand-tint)]',
        ].join(' '),

        ghost: [
          'bg-transparent text-[var(--action-ghost-fg)]',
          'hover:bg-[var(--action-ghost-hover)]',
          'active:bg-[var(--action-ghost-hover)]',
        ].join(' '),

        destructive: [
          'bg-[var(--action-destructive)] text-[var(--action-destructive-fg)]',
          'hover:bg-[var(--action-destructive-hover)]',
          'active:bg-[var(--action-destructive-pressed)]',
        ].join(' '),

        // Bloco neutro do protótipo "Visao Geral v3" (L-021 · HIFI-REC-FIX):
        // superfície alta com texto primário, hover no cinza de ação
        // secundária. Nasceu para o CtaV3 do painel consumir o Button
        // canônico em vez de re-implementar `<button>` cru; pressed reusa o
        // hover (mesma receita do ghost — o protótipo não desenha pressed
        // próprio para o CTA neutro).
        neutral: [
          'bg-[var(--surface-high)] text-[var(--text-primary)]',
          'hover:bg-[var(--action-secondary-hover)]',
          'active:bg-[var(--action-secondary-hover)]',
        ].join(' '),
      },

      size: {
        sm: 'h-[var(--btn-height-sm)] px-[var(--btn-px-sm)] text-[length:var(--btn-font-size-sm)]',
        md: 'h-[var(--btn-height-md)] px-[var(--btn-px-md)] text-[length:var(--btn-font-size-md)]',
        lg: 'h-[var(--btn-height-lg)] px-[var(--btn-px-lg)] text-[length:var(--btn-font-size-lg)]',
        // Quadrado 36×36 p-0 (stock shadcn `size: icon`; mockup `.btn-icon`) —
        // fecha o gap de size apontado no QA (T3): botão só-ícone que participa
        // da tríade de cor dos variants. Para o icon-btn GHOST da toolbar com
        // pip de notificação, use o átomo IconButton.
        icon: 'h-[var(--btn-height-md)] w-[var(--btn-height-md)] p-0 text-[length:var(--btn-font-size-md)]',

        // Forma CTA do protótipo "Visao Geral v3" (L-021 · HIFI-REC-FIX): o
        // botão de largura cheia dos cartões do dashboard — raio md, gap 2.5
        // e tipografia própria. SEM px de propósito: o conteúdo centraliza na
        // largura cheia, como o protótipo desenha. `cta` pareia com o CTA
        // primário (base-plus bold); `cta-sm` com o neutro (base; peso fica
        // no --btn-font-weight = 600, o semibold do protótipo).
        //
        // ALTURA CANÔNICA (D-1008-R7): o 48/44 do protótipo (pin l.281,
        // tokens --v3-cta-h/-sm) foi REVERTIDO por decisão do dono — "altura
        // de botão é a do padrão canônico do Button". A medida do protótipo
        // perde para o padrão do DS aqui; os dois sizes usam --btn-height-md
        // e os tokens v3.cta-h/-sm morreram na fonte (component.json).
        cta: [
          'h-[var(--btn-height-md)] w-full rounded-[var(--radius-md)]',
          'gap-[var(--spacing-2-5)] text-[length:var(--font-size-base-plus)]',
          'font-[var(--font-weight-bold)]',
        ].join(' '),
        'cta-sm': [
          'h-[var(--btn-height-md)] w-full rounded-[var(--radius-md)]',
          'gap-[var(--spacing-2-5)] text-[length:var(--font-size-base)]',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export { buttonVariants };
