/**
 * CheckboxField — o par rótulo + caixinha, com o `htmlFor`/`id` fiado.
 *
 * POR QUE EXISTE. Inventário de 2026-08-12, §7: a procedência do CONTROLE é
 * perfeita — dezenove `Checkbox`, todos do DS, zero checkbox nativo nos dois
 * apps. A montagem do RÓTULO é que foi escrita dezessete vezes, em três
 * dialetos. O `Checkbox` do DS não tem prop de rótulo (`CheckboxProps` estende
 * `InputHTMLAttributes` e acrescenta só `indeterminate`), e o `Field`, que o
 * cânone indica para "rótulo + dica + erro + `aria-describedby`", põe o rótulo
 * ACIMA do controle — e o rótulo de um checkbox vai AO LADO. Não havia peça
 * para o par. Então cada tela montou a sua.
 *
 * OS TRÊS DIALETOS NÃO SÃO GOSTO, e é por isso que a peça fecha um:
 *
 *   `<label className="flex items-center">` envolvendo (11×) alinha ao CENTRO e
 *   quebra quando o rótulo tem duas linhas;
 *   `<label className="flex items-start">` envolvendo (4×, a landing) alinha ao
 *   topo e é o único que passa `cursor-pointer`;
 *   `<div>` + `<label htmlFor>` irmão (2×) não envolve o controle, então depende
 *   do `htmlFor`/`id` casarem — e é o que deixa o rótulo carregar um link sem
 *   que a tela precise tirar o link do rótulo (o aceite de compra da landing
 *   precisa disso e hoje resolve movendo o gatilho para fora do `<label>`).
 *
 * A peça leva o terceiro com o alinhamento do segundo: `<label htmlFor>` irmão,
 * `items-start` sempre. O alinhamento ao topo é o único correto quando o rótulo
 * quebra, e num rótulo de uma linha ele é indistinguível do centro — escolher
 * "centro quando cabe" seria devolver a decisão para a tela, que é o defeito.
 *
 * O ERRO E A DICA ENTRAM POR `aria-describedby`, como no `Field`, e não por
 * texto solto: um erro que só existe visualmente não chega a quem usa leitor de
 * tela. A ligação é fiada aqui, uma vez, em vez de dezessete.
 *
 * FRONTEIRA COM O `Field`. O `Field` continua sendo a casca de QUALQUER controle
 * com rótulo acima (`Input`, `Textarea`, `select` cru). Esta peça é só do par
 * checkbox — e ela NÃO compõe o `Field`, porque compor um layout de coluna para
 * depois desfazê-lo em linha seria carregar a anatomia errada. As duas são
 * irmãs no cânone §3, não pai e filho.
 *
 * LANDING (ADR-017). A peça entra pelo boundary `app/_ds/ds.ts`, como o
 * `Checkbox` que ela compõe — o `Checkbox` tem `useRef`/`useEffect` para o
 * `indeterminate` e por isso nenhum dos dois cabe na entrada server-safe. O
 * grafo é Radix-free, e o `server-safety.test.ts` prova isso antes da Onda C2
 * abrir.
 *
 * AA: nenhum par novo — `text-primary`, `text-tertiary` e `text-danger` sobre as
 * superfícies já rodam na matriz de contraste nos três temas.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import { Checkbox, type CheckboxProps } from '../Checkbox';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CheckboxFieldProps extends Omit<CheckboxProps, 'className'> {
  /**
   * O rótulo, ao lado da caixinha. Aceita nó — o aceite de compra precisa de
   * um link aqui dentro, e um `<label htmlFor>` irmão não rouba o clique dele.
   */
  label: React.ReactNode;
  /** Texto de apoio sob o rótulo. Entra por `aria-describedby`. */
  description?: React.ReactNode;
  /** Mensagem de erro; liga `aria-invalid` e `role="alert"`. */
  errorMessage?: string;
  /** Classe do BLOCO (a caixinha tem a própria, e ela é do `Checkbox`). */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CheckboxField = React.forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ label, description, errorMessage, className, id, disabled, ...props }, ref) => {
    const gerado = React.useId();
    const controlId = id ?? gerado;
    const temErro = Boolean(errorMessage);
    const descId = description ? `${controlId}-desc` : undefined;
    const erroId = temErro ? `${controlId}-error` : undefined;
    const describedBy = [descId, erroId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={cn('flex items-start gap-[var(--spacing-2)]', className)}>
        <Checkbox
          ref={ref}
          id={controlId}
          disabled={disabled}
          {...(describedBy !== undefined ? { 'aria-describedby': describedBy } : {})}
          {...(temErro ? { 'aria-invalid': true } : {})}
          {...props}
        />
        <div className="flex min-w-0 flex-col gap-[var(--spacing-0-5)]">
          <label
            htmlFor={controlId}
            className={cn(
              'text-[length:var(--font-size-sm)]',
              disabled
                ? 'cursor-not-allowed text-[var(--text-tertiary)]'
                : 'cursor-pointer text-[var(--text-primary)]',
            )}
          >
            {label}
          </label>
          {description ? (
            <span
              id={descId}
              className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]"
            >
              {description}
            </span>
          ) : null}
          {temErro && errorMessage ? (
            <span
              id={erroId}
              role="alert"
              className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]"
            >
              {errorMessage}
            </span>
          ) : null}
        </div>
      </div>
    );
  },
);

CheckboxField.displayName = 'CheckboxField';

export { CheckboxField };
