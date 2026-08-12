/**
 * CardDominio — o cartão de ENTIDADE em lista: clube, comunicado, campanha,
 * parceria, afiliação.
 *
 * POR QUE EXISTE. Inventário de 2026-08-11, §7.2: o DS publicava `CardEvento`
 * e `CardDesafio` e mais nenhum cartão de domínio. Cinco famílias ficaram sem
 * canônico e produziram sete `<article>` crus (§5), cada um recriando a
 * anatomia do cartão à mão. A CANONE-1 decidiu em 11/08, pela leitura do dono:
 * *"Se um componente nao existe, precisamos documentar e padronizar o
 * componente para nao ficar refazendo ele."*
 *
 * POR QUE UMA PEÇA E NÃO CINCO. As cinco famílias foram lidas linha a linha
 * antes de qualquer código, e elas têm **a mesma anatomia**: um cabeçalho com
 * mídia opcional à esquerda, título com selos ao lado, descrição curta, uma
 * linha de metadados, ações no canto superior direito, um acento lateral de
 * estado em duas delas e um rodapé de botões em três. O que muda entre clube e
 * comunicado é o CONTEÚDO dos slots, não a montagem.
 *
 * Publicar cinco componentes com o mesmo corpo seria criar cinco motores para
 * manter em sincronia — exatamente a lição que o `ConfirmModal` custou (o DS
 * reconstruía `Textarea` e `Checkbox` por dentro em vez de compô-los, e toda
 * tela que o usava herdava estados que nunca passaram pelo AA por estado). Uma
 * peça com slots dá ao gate o alvo reprovável que faltava, sem a duplicação.
 *
 * COMPOSIÇÃO, NUNCA MOTOR NOVO. A superfície é o `Card` do DS —
 * `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`, com
 * `as` para a tag certa. Este arquivo não escreve raio, fundo, elevação nem
 * padding de cartão: se escrevesse, seria a 193ª superfície reconstruída à
 * mão, só que dentro do design system.
 *
 * AA: nenhum par de cor novo. O acento lateral usa os tokens `--feedback-*` e
 * `--border-brand`, todos já na matriz de contraste como não-texto ≥ 3:1.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type CardElement,
} from '../Card';

// ---------------------------------------------------------------------------
// Acento lateral
// ---------------------------------------------------------------------------

/**
 * A faixa de estado à esquerda do cartão. O painel a escrevia com
 * `style={{ borderLeftColor: 'var(...)' }}` a partir de um mapa de status —
 * cor por objeto de estilo inline, que é o caminho por onde valor cru entra
 * sem o gate de marca ver. Aqui o conjunto é fechado e cada braço é token.
 */
const ACENTO: Record<Exclude<CardDominioAccent, 'none'>, string> = {
  brand: 'border-l-4 border-l-[var(--border-brand)]',
  vitoria: 'border-l-4 border-l-[var(--feedback-success)]',
  alerta: 'border-l-4 border-l-[var(--feedback-warning)]',
  vulcao: 'border-l-4 border-l-[var(--feedback-danger)]',
  heroico: 'border-l-4 border-l-[var(--feedback-heroico)]',
  neutro: 'border-l-4 border-l-[var(--border-strong)]',
};

/** Os nomes acompanham o enum do `Badge` — o cartão e o selo dizem o mesmo. */
export type CardDominioAccent =
  | 'none'
  | 'brand'
  | 'vitoria'
  | 'alerta'
  | 'vulcao'
  | 'heroico'
  | 'neutro';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CardDominioProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** O nome da entidade. É o heading do cartão. */
  title: React.ReactNode;
  /**
   * Nível do heading. `h3` é o default (o cartão vive sob o cabeçalho de
   * bloco, que é `h2`); dentro de um bloco mais fundo, desça para `h4`.
   */
  titleAs?: 'h2' | 'h3' | 'h4';
  /** Mídia à esquerda do título: `Avatar` da entidade, `Thumb`, ícone. */
  leading?: React.ReactNode;
  /** Selos ao lado do título — `Badge` de estado, de categoria, de origem. */
  badges?: React.ReactNode;
  /** Uma ou duas linhas de resumo. Ver `clamp`. */
  description?: React.ReactNode;
  /** A linha de metadados sob a descrição: canal, origem, contagem, data. */
  meta?: React.ReactNode;
  /** Canto superior direito: `DropdownMenu`, `IconButton`, `Badge` de estado. */
  actions?: React.ReactNode;
  /** Faixa lateral de estado. `none` por default — acento é exceção, não regra. */
  accent?: CardDominioAccent;
  /** Corpo livre: grade de indicadores, tabela, lista. */
  children?: React.ReactNode;
  /** Rodapé de ações, alinhado à direita. */
  footer?: React.ReactNode;
  /**
   * Corta a descrição em duas linhas (default). As cinco famílias medidas
   * usavam `line-clamp-2` sem exceção: cartão de lista com texto longo empurra
   * o vizinho e destrói o ritmo da grade.
   */
  clamp?: boolean;
  /**
   * Tag da raiz. `article` é o default porque cartão de entidade em lista é
   * conteúdo independente; dentro de `<ul>`, use `as="li"`.
   */
  as?: CardElement;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CardDominio({
  title,
  titleAs = 'h3',
  leading,
  badges,
  description,
  meta,
  actions,
  accent = 'none',
  children,
  footer,
  clamp = true,
  as = 'article',
  className,
  ...props
}: CardDominioProps): JSX.Element {
  return (
    <Card
      as={as}
      className={cn(accent !== 'none' && ACENTO[accent], className)}
      {...props}
    >
      {/* `flex-row` sobrepõe o `flex-col` do CardHeader pelo tailwind-merge —
          a montagem em linha é do cartão de domínio, o padding e o gap seguem
          sendo os do Card. */}
      <CardHeader className="flex-row items-start gap-[var(--spacing-4)]">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-2)]">
          <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
            <CardTitle
              as={titleAs}
              className="min-w-0 truncate text-[length:var(--font-size-md)]"
            >
              {title}
            </CardTitle>
            {badges}
          </div>
          {description ? (
            <CardDescription className={cn(clamp && 'line-clamp-2')}>
              {description}
            </CardDescription>
          ) : null}
          {meta ? (
            <div className="flex flex-wrap items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
      {footer ? (
        <CardFooter className="justify-end gap-[var(--spacing-2)]">{footer}</CardFooter>
      ) : null}
    </Card>
  );
}

CardDominio.displayName = 'CardDominio';

export { CardDominio };
