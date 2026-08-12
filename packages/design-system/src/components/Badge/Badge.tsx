/**
 * Badge — indicador semântico de estado/categoria.
 *
 * PROVENIÊNCIA: miolo shadcn stock `badge` (cva) restilizado ao brasa. Diff vs
 * stock (esteira shadcn→brasa):
 *   - API pública PRESERVADA: variantes semânticas brand|heroico|vulcao|vitoria|
 *     alerta|neutro (NÃO os nomes stock default/secondary/destructive/outline);
 *   - `brand` por alias (bg-primary/text-primary-foreground = action-primary/-fg,
 *     provado em shadcn-aliases.test.ts); `neutro` por alias bg-muted
 *     (= surface-overlay) + text-secondary (par na matriz L93);
 *   - variantes de feedback (heroico/vulcao/vitoria/alerta) por TOKEN dedicado
 *     (--feedback-*-surface/-fg): não há alias shadcn para a paleta de feedback,
 *     e o par fg/surface já está na matriz. Desde o D-PATCH o heroico usa a
 *     família rosa --feedback-heroico-* (paleta Be Hero restaurada) — o azul
 *     info não existe no mockup e saiu do tema brasa;
 *   - flat (border-0): o stock traz `border`; o brasa é flat (§2.16);
 *   - dimensões/tipo/radius por token de componente (--badge-*).
 *
 * AA: nenhum par novo — todos caem na matriz de contraste já provada.
 * A11y: use aria-label para contexto quando o texto não bastar.
 *
 * `outline` e `size` (Onda 0 Parte B · CANONE-1). A esteira shadcn→brasa
 * dropou a variante `outline` do stock, e a landing pagou por isso: cinco
 * pílulas informativas de contorno escritas à mão em `HeroSection`,
 * `HeroMinimo`, `KitsSection`, `PerfilView` e `PublicHeader` — cada uma com
 * seu tamanho, seu peso e sua tinta de texto. A Onda 1 não as converteu
 * justamente porque o `Badge` não tinha a variante (handoff §3.2), e as
 * nomeou como a lacuna mais bem definida que sobrava.
 *
 * Duas notas de desenho que valem mais que o diff:
 *
 *   1. A BORDA É `border-strong`, NÃO `border-default`. Numa pílula
 *      transparente a borda é o componente inteiro: sem ela não há pílula.
 *      Isso a tira da isenção de "frame decorativo" que o `Card` invoca e a
 *      põe sob a 1.4.11 (≥ 3:1). `border-default` dá 1.67:1 no brasa e 1.46:1
 *      no wine — foi por esse mesmo número que o `ConfirmModal` migrou para
 *      `border-strong` (M1 da matriz), e é a mesma escolha que a receita do
 *      `Button` de contorno já fazia. As cinco instâncias da landing usam
 *      `border-default`; converter é subir o contraste, não descê-lo.
 *
 *   2. `size` MUDA A FORMA, e isso é deliberado. `sm` é o selo do mockup
 *      (10px, uppercase, radius xs). `md` e `lg` são a PÍLULA informativa
 *      (12 e 14px, caixa normal, radius pill) — a mesma peça em outro papel,
 *      não uma peça nova. Era essa a diferença entre o `Badge` publicado e as
 *      cinco escritas à mão, e ela cabe num eixo.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Variant definitions
// ---------------------------------------------------------------------------

// A GEOMETRIA E A TIPOGRAFIA MORAM NO EIXO `size`, NÃO NA BASE — e a razão é
// um defeito que o teste pegou antes do commit. Com `rounded-[var(--badge-radius)]`
// na base e `rounded-ds-pill` no eixo, o tailwind-merge deixava as DUAS na
// string: ele não reconhece `ds-pill` como chave de raio (é entrada própria do
// preset) e por isso não vê conflito. Duas regras de mesma especificidade, e o
// vencedor sairia da ordem do stylesheet — que ninguém controla e que muda
// entre builds. Deduplicação por merge é conveniência; ela não é contrato.
const badgeVariants = cva(
  [
    'inline-flex items-center justify-center gap-[var(--badge-gap)]',
    'font-[var(--badge-font-weight)]',
    '[&_svg]:w-[var(--badge-icon-size)] [&_svg]:h-[var(--badge-icon-size)]',
    'whitespace-nowrap select-none',
    // Flat (§2.16)
    'border-0',
  ].join(' '),
  {
    variants: {
      variant: {
        brand:   'bg-primary text-primary-foreground',
        heroico: 'bg-[var(--feedback-heroico-surface)] text-[var(--feedback-heroico-fg)]',
        vulcao:  'bg-[var(--feedback-danger-surface)] text-[var(--feedback-danger-fg)]',
        vitoria: 'bg-[var(--feedback-success-surface)] text-[var(--feedback-success-fg)]',
        alerta:  'bg-[var(--feedback-warning-surface)] text-[var(--feedback-warning-fg)]',
        neutro:  'bg-muted text-[var(--text-secondary)]',
        // Contorno: a única variante sem preenchimento. `border` vence o
        // `border-0` da base pelo tailwind-merge (mesmo grupo de largura).
        outline: 'border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)]',
      },
      /**
       * `sm` é o selo do mockup e NÃO acrescenta classe nenhuma: ele é a base
       * inteira, byte a byte. Manter o default assim é o que garante que esta
       * mudança não altera um pixel de nenhum dos badges já em tela.
       */
      // O peso fica na BASE de propósito: `font-[var(--badge-font-weight)]` é
      // arbitrary value, e o tailwind-merge não sabe se um `font-[…]` é peso
      // ou família — dois deles sobreviveriam juntos, com o mesmo defeito do
      // raio. A pílula herda o 700 do selo; as cinco instâncias da landing
      // usavam 600 (uma, 500), e esse é o delta declarado da conversão.
      size: {
        // `sm` é o selo do mockup (QA m5): 10px/700 uppercase .04em, radius
        // xs, altura (~21px) nascendo do padding 3x7 — sem height fixa.
        sm: 'rounded-[var(--badge-radius)] px-[var(--badge-px)] py-[var(--badge-py)] text-[length:var(--badge-font-size)] uppercase tracking-[var(--badge-spacing)]',
        md: 'rounded-[var(--radius-pill)] px-[var(--spacing-2-5)] py-[var(--spacing-0-5)] text-[length:var(--font-size-sm)] normal-case tracking-normal',
        lg: 'rounded-[var(--radius-pill)] px-[var(--spacing-3)] py-[var(--spacing-1)] text-[length:var(--font-size-base)] normal-case tracking-normal',
      },
    },
    defaultVariants: {
      variant: 'neutro',
      size: 'sm',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Badge({ className, variant, size, ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
