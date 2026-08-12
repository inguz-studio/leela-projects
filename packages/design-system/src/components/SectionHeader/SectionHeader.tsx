/**
 * SectionHeader — o cabeçalho de BLOCO interno: eyebrow na tinta da marca,
 * contexto opcional embaixo e slots à direita.
 *
 * POR QUE EXISTE. Inventário de 2026-08-11, §7.3: o `PageHeader` do DS é de
 * PÁGINA, e o cabeçalho de bloco (título + ação à direita, dentro de um
 * cartão) não tinha canônico. O painel resolveu localmente em
 * `components/SecaoHead.tsx`, e o comentário do próprio arquivo registra que a
 * extração aconteceu **depois de duas cópias** (`ActiveEvents`,
 * `RecentRegistrations`): o padrão nasceu duplicado e foi consolidado por
 * iniciativa de quem passou por ali, não por regra.
 *
 * O arquivo do painel argumenta que a peça "não sobe ao design system porque é
 * composição de tela, não primitivo". A CANONE-1 decidiu o contrário em
 * 11/08, com a frase do dono: *"Se um componente nao existe, precisamos
 * documentar e padronizar o componente para nao ficar refazendo ele."* Um
 * cabeçalho de bloco que muda de anatomia conforme a tela não é cabeçalho de
 * bloco — e isso vale entre PROJETOS, não só entre telas do painel.
 *
 * A FRONTEIRA DO SLOT. A anatomia mora aqui: o eyebrow (11px/700 uppercase na
 * tinta da marca, herdado do HIFI-REC), o ritmo (`--layout-section-head-mb`) e
 * o alinhamento pela linha de base. O que é INTERATIVO mora fora, em slot:
 * `help` recebe o gatilho de ajuda, `control` recebe o recorte do próprio
 * bloco, `action` recebe o link de "ver tudo". Assim o componente permanece
 * puro — sem hook, sem Radix — e entra na entrada server-safe do ADR-017, que
 * a landing consome sem custo de bundle.
 *
 * AA: nenhum par novo — `action-brand-tint-fg` sobre as superfícies já está na
 * matriz de contraste, e `text-tertiary` também.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SectionHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** O eyebrow do bloco. Curto: ele é rótulo, não frase. */
  title: React.ReactNode;
  /**
   * Nível do heading. `h2` é o default porque o bloco vive sob o `PageHeader`
   * (que é `h1`); dentro de um cartão que já tem título, desça para `h3`.
   * Nível de heading é navegação de leitor de tela, não tamanho de letra — o
   * tamanho aqui é o mesmo nos três.
   */
  titleAs?: 'h2' | 'h3' | 'h4';
  /** Uma linha de contexto sob o título. */
  description?: React.ReactNode;
  /** Slot logo após o título — o gatilho do "?" do bloco, por exemplo. */
  help?: React.ReactNode;
  /** Slot à direita, antes da ação: o recorte do PRÓPRIO bloco. */
  control?: React.ReactNode;
  /** Slot mais à direita: o link de "ver tudo". */
  action?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  titleAs = 'h2',
  description,
  help,
  control,
  action,
  className,
  ...props
}: SectionHeaderProps): JSX.Element {
  // Ver a nota do `Stack` sobre o cast: runtime usa a tag pedida, a tipagem
  // fica em `h2`.
  const Heading = titleAs as 'h2';

  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-[var(--spacing-3)]',
        'mb-[var(--layout-section-head-mb)]',
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-[var(--spacing-1)]">
          <Heading
            className={cn(
              'text-[length:var(--section-eyebrow-size)] font-[var(--section-eyebrow-weight)]',
              'uppercase tracking-[var(--section-eyebrow-spacing)]',
              'text-[var(--action-brand-tint-fg)]',
            )}
          >
            {title}
          </Heading>
          {help}
        </div>
        {description ? (
          <p className="mt-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {description}
          </p>
        ) : null}
      </div>
      {control ? <div className="shrink-0 self-center">{control}</div> : null}
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

SectionHeader.displayName = 'SectionHeader';

export { SectionHeader };
