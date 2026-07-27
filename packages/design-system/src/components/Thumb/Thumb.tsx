/**
 * Thumb — miniatura de mídia de ENTIDADE nas listagens e ao lado de campos.
 *
 * O job: reconhecer o item DE VISTA antes de clicar (kit, logo de marca, capa
 * de evento). Identificação primeiro; a estética vem de graça pelos tokens.
 *
 * DEDUP (governança §6.1 — o DS não aceita duplicata com outro nome):
 *   - NÃO é variante do `Avatar`. Avatar representa PESSOA: é circular por
 *     contrato (`--avatar-radius`), `aspect-square` fixo, exige `name` e o
 *     publica como `role="img"`/`aria-label`, e deriva iniciais + gradiente
 *     determinístico desse nome. Aqui a mídia é de ENTIDADE, a razão varia com
 *     o dado (1:1 kit/logo · 1.9:1 capa) e o rótulo acessível já vive ao lado.
 *   - NÃO é o `CardEvento` nem o `CardDesafio`: aqueles são cards de mídia com
 *     título, meta e ação; este é só a caixa da imagem.
 *   - O thumb híbrido do `EventRow` continua interno a ele porque o fallback
 *     dele é SEMÂNTICO (gradiente `--thumb-{modalidade}` + ícone da
 *     modalidade) e o mesmo elemento carrega a colocação no grid responsivo da
 *     linha (`max-lg:row-span-3`). Contrato de fallback diferente → migrar não
 *     é dedup, é acoplar. Os dois compartilham a família de tokens `--thumb-*`.
 *
 * Anatomia: a LARGURA vem do token do tamanho e a ALTURA sai da razão
 * (`aspect-[1/1]` / `aspect-[1.9/1]` — razão sem unidade, permitida pela
 * governança §2). Uma medida por tamanho serve às duas proporções.
 *
 * - `object-cover` sempre: a imagem preenche a caixa sem distorcer o assunto.
 * - `loading="lazy"` por default — nasceu para LISTA, onde a maioria das
 *   miniaturas está fora da primeira dobra. `lazy={false}` para a miniatura
 *   única ao lado de um campo, que é visível de saída.
 * - Fallback DIGNO, nunca quadrado quebrado: sem `src` E também quando a URL
 *   morre (`onError`) — URL de Storage revogada não deixa cicatriz na tela.
 *   Engine de imagem própria (`img` + `onError`), a mesma decisão registrada no
 *   Avatar: o `AvatarImage` do Radix espera o evento de load e nunca renderiza
 *   em jsdom, o que transformaria os testes em mock frágil.
 *
 * A11y: a mídia é DECORATIVA por default (`alt=""`), porque nas três
 * superfícies o nome da entidade fica ao lado e já é o rótulo da linha — a
 * mesma decisão do EventRow. Passe `alt` só quando a miniatura for a única
 * identificação do item.
 * AA: o componente não tem estado interativo (sem hover/focus/pressed — é
 * caixa passiva); o único par de texto é o do fallback,
 * `text-tertiary × surface-sunken`, já provado na matriz (contrast.test.ts).
 * §2.16 flat — sem borda decorativa.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Variant definitions
// ---------------------------------------------------------------------------

const thumbVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center',
    'overflow-hidden rounded-[var(--thumb-radius)]',
    'bg-[var(--surface-sunken)]',
    'select-none',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'w-[var(--thumb-size-sm)]',
        md: 'w-[var(--thumb-size-md)]',
        lg: 'w-[var(--thumb-size-lg)]',
      },
      // Razão contratada pelo dado, não escolha estética: `square` cobre logo
      // de marca (RN-171) e imagem de kit (RN-227); `wide` cobre a capa do
      // evento (RN-228, 1600×838).
      ratio: {
        square: 'aspect-[1/1]',
        wide: 'aspect-[1.9/1]',
      },
    },
    defaultVariants: {
      size: 'sm',
      ratio: 'square',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ThumbProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof thumbVariants> {
  /** URL da imagem. Ausente, vazia ou quebrada ⇒ renderiza o `fallback`. */
  src?: string | null | undefined;
  /**
   * Texto alternativo. Default `''` (decorativa): o nome da entidade ao lado já
   * rotula a linha. Preencha só quando a miniatura for a única identificação.
   */
  alt?: string;
  /**
   * Conteúdo exibido sem imagem: sigla curta, ícone lucide ou o que a
   * superfície entender. Sempre `aria-hidden` (é reforço visual, não rótulo).
   */
  fallback?: React.ReactNode;
  /** Carregamento adiado. Default `true` (nasceu para lista). */
  lazy?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Thumb = React.forwardRef<HTMLSpanElement, ThumbProps>(
  ({ className, size, ratio, src, alt = '', fallback, lazy = true, ...props }, ref) => {
    const [erro, setErro] = React.useState(false);

    // Trocar de imagem (ex.: o organizador sobe outra capa) tem de limpar o
    // erro anterior, senão a nova URL nasce condenada ao fallback.
    React.useEffect(() => {
      setErro(false);
    }, [src]);

    const url = typeof src === 'string' ? src.trim() : '';
    const mostraImagem = url.length > 0 && !erro;

    return (
      <span ref={ref} className={cn(thumbVariants({ size, ratio, className }))} {...props}>
        {mostraImagem ? (
          <img
            src={url}
            alt={alt}
            {...(lazy ? { loading: 'lazy' as const } : {})}
            onError={() => setErro(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className={cn(
              'flex h-full w-full items-center justify-center',
              'text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)]',
              'text-[var(--text-tertiary)]',
              '[&_svg]:h-[var(--thumb-fallback-icon-size)] [&_svg]:w-[var(--thumb-fallback-icon-size)]',
              '[&_svg]:[stroke-width:var(--icon-stroke)]',
            )}
          >
            {fallback}
          </span>
        )}
      </span>
    );
  },
);
Thumb.displayName = 'Thumb';

export { Thumb };
