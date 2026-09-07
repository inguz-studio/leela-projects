/**
 * Alert — o aviso em bloco: ícone, título e corpo num par de cor semântica.
 *
 * POR QUE EXISTE. O barrel tinha 78 componentes e nenhum era aviso em bloco. A
 * lane CKPIX-FLOW encontrou a consequência no checkout: `AvisoPedidoEncerrado`,
 * `AvisoPedidoEmConfirmacao` e `ProcessandoPagamento` repetem a MESMA forma à
 * mão, e a lane escreveu o quarto (`DesfechoPosPagamento`) copiando linha por
 * linha os três — de propósito, para não inventar um desenho novo, e
 * encaminhou a peça para cá. É o caso literal da diretriz da leva 7: *"Se um
 * componente nao existe, precisamos documentar e padronizar o componente para
 * nao ficar refazendo ele."*
 *
 * O QUE ELE FECHA. Quatro cópias, cinco divergências entre elas: raio
 * (`rounded-ds-lg` × `rounded-lg`), padding (`p-5` × `p-4`), título (`text-lg
 * font-bold` × `text-sm font-semibold`), gap (3 × 2) e a posição do ícone (ao
 * lado do bloco inteiro × ao lado só do corpo). Nenhuma delas é decisão — são
 * as sobras de quatro pessoas resolvendo o mesmo problema sem ter o que
 * importar. O componente fica com uma forma só.
 *
 * O CANAL DE ARIA É PROP, E É A DECISÃO MAIS IMPORTANTE AQUI. Os três arquivos
 * do checkout escolheram canais DIFERENTES, cada um com a razão escrita no
 * topo, e estavam certos:
 *
 *   - `AvisoPedidoEncerrado` usa `role="alert"` — um desfecho final que muda o
 *     que a pessoa precisa fazer é exatamente o que o canal assertivo existe
 *     para anunciar;
 *   - `ProcessandoPagamento` usa `role="status"` com `aria-live="polite"` — a
 *     espera não pode atropelar o anúncio de erro que divide a tela com ela.
 *
 * Por isso `live` não tem default agressivo: o default é `'none'`. Aviso que
 * já estava na tela quando ela carregou NÃO é live region — anunciar conteúdo
 * estático a cada render é ruído, e ruído treina a pessoa a ignorar o canal.
 * Quem tem mudança a anunciar diz qual canal quer.
 *
 * AA: nenhum par novo. Os quatro tons usam `--feedback-*-fg` sobre
 * `--feedback-*-surface` (texto, ≥ 4.5:1) — os quatro pares já rodam na matriz
 * de contraste, nos três temas. (V2708-21 · 28/08: a borda lateral foi removida
 * por fuga de identidade — o idioma do produto é ícone com cor de severidade,
 * não listra. O fundo suave por tom permanece.)
 */

import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const alertVariants = cva(
  [
    'flex items-start gap-[var(--spacing-3)]',
    'rounded-[var(--radius-lg)] p-[var(--spacing-5)]',
  ].join(' '),
  {
    variants: {
      /**
       * Os quatro tons que o produto usa. `heroico` e `neutro` (que o `Badge`
       * publica) ficam de fora: no brasa `--feedback-info` resolve para a
       * mesma família rosa do heroico, e um aviso neutro sem cor de estado é
       * um `Card` com texto dentro, não um aviso.
       *
       * V2708-21 · 28/08: sem borda lateral — apenas fundo suave + ícone com
       * a cor de severidade (text-[var(--feedback-*-fg)]). A listra foge à
       * identidade do produto; o ícone é o sinal.
       */
      tone: {
        info: 'bg-[var(--feedback-info-surface)] text-[var(--feedback-info-fg)]',
        vitoria: 'bg-[var(--feedback-success-surface)] text-[var(--feedback-success-fg)]',
        alerta: 'bg-[var(--feedback-warning-surface)] text-[var(--feedback-warning-fg)]',
        vulcao: 'bg-[var(--feedback-danger-surface)] text-[var(--feedback-danger-fg)]',
      },
    },
    defaultVariants: { tone: 'info' },
  },
);

/** Ícone padrão de cada tom. Trocável por `icon`, silenciável com `icon={null}`. */
const ICONE_PADRAO = {
  info: Info,
  vitoria: CheckCircle2,
  alerta: AlertTriangle,
  vulcao: XCircle,
} as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type AlertTone = 'info' | 'vitoria' | 'alerta' | 'vulcao';

/**
 * Canal de anúncio para leitor de tela.
 *
 * `'alert'`  — assertivo: interrompe. Para desfecho que muda o que fazer.
 * `'status'` — polido: espera a vez. Para progresso e espera.
 * `'none'`   — sem live region. Para aviso que já estava na tela.
 */
export type AlertLive = 'alert' | 'status' | 'none';

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'role'>,
    VariantProps<typeof alertVariants> {
  /** Título curto do aviso. Sem ele, o corpo fica sozinho ao lado do ícone. */
  title?: React.ReactNode;
  /** Nível do heading do título. Navegação de leitor de tela, não tamanho. */
  titleAs?: 'h2' | 'h3' | 'h4';
  /**
   * Ícone à esquerda. Default: o do tom. `null` remove — use quando o aviso já
   * está dentro de um bloco que carrega o ícone.
   */
  icon?: React.ReactNode;
  /** Canal de ARIA. Default `'none'` — ver a nota no topo do arquivo. */
  live?: AlertLive;
  /** Corpo do aviso. */
  children?: React.ReactNode;
  /** Ações abaixo do corpo (CTA, link de retomada). */
  actions?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Alert({
  tone = 'info',
  title,
  titleAs = 'h3',
  icon,
  live = 'none',
  actions,
  children,
  className,
  ...props
}: AlertProps): JSX.Element {
  // Ver a nota do `Stack` sobre o cast: runtime usa a tag pedida, a tipagem
  // fica em `h3`.
  const Heading = titleAs as 'h3';
  const IconePadrao = ICONE_PADRAO[tone ?? 'info'];
  const mostraIcone = icon !== null;

  // `role` e `aria-live` andam juntos, e é por isso que eles saem de UMA prop:
  // `role="alert"` com `aria-live="polite"` é contradição que o navegador
  // resolve sozinho, do jeito dele, e o defeito não aparece em teste nenhum.
  const aria =
    live === 'alert'
      ? ({ role: 'alert' } as const)
      : live === 'status'
        ? ({ role: 'status', 'aria-live': 'polite' } as const)
        : ({} as const);

  return (
    <div className={cn(alertVariants({ tone }), className)} {...aria} {...props}>
      {mostraIcone ? (
        <span className="mt-[var(--spacing-0-5)] shrink-0" aria-hidden>
          {icon ?? (
            <IconePadrao
              className="w-[var(--alert-icon-size)] h-[var(--alert-icon-size)]"
              strokeWidth={2}
            />
          )}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-1)]">
        {title ? (
          <Heading className="text-[length:var(--font-size-md-plus)] font-[var(--font-weight-bold)]">
            {title}
          </Heading>
        ) : null}
        {children ? (
          <div className="text-[length:var(--font-size-base)]">{children}</div>
        ) : null}
        {actions ? (
          <div className="flex flex-wrap items-center gap-[var(--spacing-2)] pt-[var(--spacing-2)]">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

Alert.displayName = 'Alert';

export { Alert, alertVariants };
