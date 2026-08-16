/**
 * DefinitionItem — o par rótulo + valor em pé, para ficha e resumo.
 *
 * POR QUE EXISTE. A auditoria de ADMINVISAO-ONDAS-235 (retomada de 11/08) mediu,
 * dentro dos componentes que a lane escreveu para a ficha do tenant, QUATRO
 * receitas distintas do mesmo par: `ResponsavelCard.tsx` e
 * `FichaDoClienteDrawer.tsx` montaram cada um a própria função local `Campo`
 * (`<dt>` + `<dd>`, rótulo em maiúsculas por cima, valor ou frase de ausência
 * embaixo) — na hora em que foram escritas o design system publicava 50
 * componentes e nenhum deste. A Onda C0 (2026-08-12) deixou a decisão para
 * quem tocasse estas telas depois (`03-fila-em-ondas.md`, Onda C6): "peça
 * própria ou composição de `Stack`?" As duas leituras linha a linha (17 usos
 * ao todo) mostram anatomia idêntica — só a ausência de dado divergia entre
 * "Não informado" fixo e uma frase por campo.
 *
 * O QUE FICA DE FORA, E POR QUÊ. `PlanoAplicadoCard.tsx` tem uma TERCEIRA
 * receita (`ListaDeDivergencias`) que parece a mesma coisa e não é: rótulo e
 * valor lado a lado numa linha de comparação (`justify-between`, dentro de um
 * `<li>`), não um par empilhado. Forçar as duas anatomias na mesma peça seria
 * o defeito que o `FieldGroup` já nomeou para si mesmo — "compor um layout
 * para depois desfazê-lo é carregar a anatomia errada". Ela continua como
 * está, decisão medida nesta mesma rodada (ver o comentário no arquivo).
 *
 * A AUSÊNCIA É UMA PROP, NÃO UM SINAL ESCONDIDO. `value` aceita `null`,
 * `undefined` ou string vazia — as três formas que os dois consumidores já
 * usavam para dizer "não há dado aqui" — e todas caem no MESMO `emptyLabel`.
 * O default é "Não informado"; `FichaDoClienteDrawer` sobrescreve por campo
 * porque cada ausência ali tem uma causa que vale a pena nomear ("Não
 * coletado. O CPF vem dos dados pessoais da inscrição...").
 *
 * DOIS TAMANHOS, NÃO UM. `ResponsavelCard` é um resumo com poucos campos
 * (`--font-size-base`); `FichaDoClienteDrawer` é uma ficha densa com seis
 * seções (`--font-size-sm`). A peça herda os dois em vez de forçar um só —
 * mesmo espírito do `ResultCount` herdando `role`/`aria-live` por prop em vez
 * de escolher por conta própria.
 *
 * COMPÕE `FormGrid`/`Stack`, NÃO OS SUBSTITUI. Quem decide a grade (1, 2, 3
 * colunas) e o `as="dl"` continua sendo o container — a peça só é o `<dt>` +
 * `<dd>` de dentro.
 *
 * AA: nenhum par novo — `text-tertiary`/`text-primary`/`text-danger` sobre as
 * superfícies já rodam na matriz de contraste nos três temas.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type DefinitionItemSize = 'sm' | 'base';

export interface DefinitionItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** O rótulo do campo ("Nome", "CPF", "Telefone"). */
  label: React.ReactNode;
  /** O valor. `null`, `undefined` ou string vazia contam como ausência. */
  value: React.ReactNode;
  /** A frase da ausência declarada. Default: "Não informado". */
  emptyLabel?: React.ReactNode;
  /** Tamanho do texto do valor. Default `'base'` (resumo); `'sm'` para ficha densa. */
  size?: DefinitionItemSize;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** @pure */
function estaAusente(value: React.ReactNode): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

function DefinitionItem({
  label,
  value,
  emptyLabel = 'Não informado',
  size = 'base',
  className,
  ...props
}: DefinitionItemProps): JSX.Element {
  const ausente = estaAusente(value);
  const tamanho = size === 'sm' ? 'text-[length:var(--font-size-sm)]' : 'text-[length:var(--font-size-base)]';

  return (
    <div className={cn('flex flex-col gap-[var(--spacing-1)]', className)} {...props}>
      <dt
        className={cn(
          'text-[length:var(--font-size-xs)] uppercase tracking-[var(--table-header-spacing)]',
          'text-[var(--text-tertiary)]',
        )}
      >
        {label}
      </dt>
      <dd className={cn(tamanho, ausente ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]')}>
        {ausente ? emptyLabel : value}
      </dd>
    </div>
  );
}

DefinitionItem.displayName = 'DefinitionItem';

export { DefinitionItem };
