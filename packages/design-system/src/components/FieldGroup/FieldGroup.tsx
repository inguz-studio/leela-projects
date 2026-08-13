/**
 * FieldGroup — o grupo de campos: `fieldset` + `legend` com o navegador
 * normalizado, dica e erro DO GRUPO.
 *
 * POR QUE EXISTE. Inventário de 2026-08-12, §7: o cânone tem `Field` para UM
 * controle e não tinha nada para o grupo. O painel montou onze `<fieldset>` à
 * mão — três hospedando `Checkbox`, oito hospedando `Chip` e `Input` —, e a
 * régua da catraca conta os onze de propósito: ela mede a MONTAGEM, não o
 * conteúdo dela, e contar só os de checkbox deixaria oito grupos crescendo fora
 * da vista.
 *
 * O QUE O NAVEGADOR ATRAPALHA, E POR ISSO MORA AQUI. O `<fieldset>` tem dois
 * defaults que ninguém lembra e que cada tela reconserta do seu jeito:
 *
 *   `min-inline-size: min-content` — o fieldset se recusa a encolher, e um
 *   grupo dentro de uma coluna estreita empurra a página para a rolagem
 *   horizontal (`min-w-0` resolve);
 *   `padding-inline: 2px` na `<legend>` — dois pixels que desalinham a legenda
 *   de todo rótulo da tela (`p-0` resolve).
 *
 * Some-se a borda e o padding próprios do fieldset, que o produto não usa em
 * lugar nenhum. Três conserto de default, uma vez, em vez de onze.
 *
 * A LEGENDA É SEMPRE VISÍVEL, e a escala fechada é a decisão. `ItemKitModal:230`
 * põe `<legend className="sr-only">` e desenha um `<span>` visível ao lado — um
 * rótulo escrito duas vezes, um para o leitor de tela e outro para o olho, que
 * divergem no primeiro conserto. Grupo que não merece rótulo visível
 * provavelmente não é grupo; se um caso legítimo aparecer, ele volta como
 * decisão, não como prop.
 *
 * COMPÕE O `Stack`. O ritmo interno do grupo é o do primitivo de empilhamento,
 * com a escala fechada que ele já publica — não um `gap` novo inventado aqui.
 *
 * AA: nenhum par novo. O `disabled` do `fieldset` é nativo e propaga a todos os
 * controles de dentro, então a peça não precisa reimplementá-lo — só esmaece a
 * legenda para o olho acompanhar o que o teclado já sabe.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import { Stack, type StackProps } from '../Stack';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FieldGroupProps
  extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, 'children'> {
  /** O rótulo do grupo. Sempre visível. */
  legend: React.ReactNode;
  /** Texto de apoio do grupo, sob a legenda. Entra por `aria-describedby`. */
  description?: React.ReactNode;
  /** Erro DO GRUPO ("escolha ao menos uma"). Não é o erro de um campo. */
  errorMessage?: string;
  /** Ritmo interno, na escala fechada do `Stack`. Default `md`. */
  gap?: StackProps['gap'];
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FieldGroup = React.forwardRef<HTMLFieldSetElement, FieldGroupProps>(
  ({ legend, description, errorMessage, gap = 'md', className, children, ...props }, ref) => {
    const gerado = React.useId();
    const temErro = Boolean(errorMessage);
    const descId = description ? `${gerado}-desc` : undefined;
    const erroId = temErro ? `${gerado}-error` : undefined;
    const describedBy = [descId, erroId].filter(Boolean).join(' ') || undefined;
    const desabilitado = props.disabled === true;

    return (
      <fieldset
        ref={ref}
        // `min-w-0` mata o `min-inline-size: min-content` do fieldset, que é o
        // que empurra a página para a rolagem horizontal numa coluna estreita.
        className={cn('m-0 w-full min-w-0 border-0 p-0', className)}
        {...(describedBy !== undefined ? { 'aria-describedby': describedBy } : {})}
        {...props}
      >
        <legend
          className={cn(
            // `p-0` mata os 2px de `padding-inline` que o navegador dá à
            // legenda e que desalinham o rótulo do grupo de todos os outros.
            'p-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)]',
            desabilitado ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]',
          )}
        >
          {legend}
        </legend>

        {description ? (
          <span
            id={descId}
            className="mt-[var(--spacing-0-5)] block text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]"
          >
            {description}
          </span>
        ) : null}

        <Stack gap={gap} className="mt-[var(--spacing-2)]">
          {children}
        </Stack>

        {temErro && errorMessage ? (
          <span
            id={erroId}
            role="alert"
            className="mt-[var(--spacing-2)] block text-[length:var(--font-size-sm)] text-[var(--text-danger)]"
          >
            {errorMessage}
          </span>
        ) : null}
      </fieldset>
    );
  },
);

FieldGroup.displayName = 'FieldGroup';

export { FieldGroup };
