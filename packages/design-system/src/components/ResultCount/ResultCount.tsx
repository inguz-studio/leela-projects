/**
 * ResultCount — o "Mostrando X de Y" da lista recortada.
 *
 * POR QUE EXISTE. Inventário de 2026-08-12, §4.3: doze escritas de uma frase de
 * seis palavras produziram TRÊS dialetos de ARIA e duas grafias. Nove usam
 * `aria-live="polite"`, uma usa `role="status"`, e duas — `RepassesFilaView:184`
 * e `TenantsList:166` — não têm canal nenhum: quem filtra por teclado com leitor
 * de tela não ouve que a lista mudou. Essa é a única correção de acessibilidade
 * real da fila inteira, e ela cai numa tela que move dinheiro de terceiros.
 *
 * A HONESTIDADE DO NÚMERO É A REGRA, NÃO A EXCEÇÃO. Dez das doze instâncias
 * afirmam um total que só é verdade porque a lista é pequena. O `rotuloContagem`
 * do painel master é a única que não faz isso, e o motivo está escrito no
 * arquivo dele: a paginação por cursor NUNCA computou um total, então "de N"
 * seria invenção. A peça herda a honestidade dele e não o contrário — com
 * `temMais`, o total é ignorado e a frase diz o que é verdade: o que está na
 * tela, e que há mais.
 *
 * O CANAL DE ARIA É PROP, COM DEFAULT POLIDO. Mesmo desenho do `Alert`, e pela
 * mesma razão: `role` e `aria-live` saem de UMA prop porque `role="alert"` com
 * `aria-live="polite"` é contradição que o navegador resolve do jeito dele. O
 * default aqui é `'status'` (que é `role="status"` + `aria-live="polite"`) e não
 * `'none'` como no `Alert`, porque o caso é o oposto: o contador EXISTE para
 * mudar quando a pessoa filtra, e é essa mudança que o canal polido anuncia.
 *
 * NÃO HÁ CANAL ASSERTIVO NA ESCALA, e a ausência é a decisão. `aria-live="assertive"`
 * interrompe o que o leitor de tela está falando; um contador de lista nunca é
 * urgente a esse ponto, e o único efeito de oferecer a opção seria alguém
 * escolhê-la. A escala fechada é o serviço que a peça presta — a mesma lição do
 * `Stack` e do `MetricGrid`.
 *
 * AA: nenhum par novo — `--text-tertiary` sobre as superfícies já está na
 * matriz de contraste nos três temas.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * `'status'` — `role="status"` + `aria-live="polite"`. O default: a lista mudou
 *              porque alguém filtrou, e quem filtra precisa ouvir o resultado.
 * `'none'`   — sem live region. Para o contador de lista que não recorta nada.
 */
export type ResultCountLive = 'status' | 'none';

export interface ResultCountSubstantivo {
  singular: string;
  plural: string;
}

export interface ResultCountProps extends Omit<React.HTMLAttributes<HTMLParagraphElement>, 'children'> {
  /** Quantos itens estão na tela agora. */
  visiveis: number;
  /**
   * O total do recorte, quando ele é CONHECIDO. Omita quando a lista vem por
   * cursor — a query não computou total nenhum e "de N" seria invenção.
   */
  total?: number;
  /** O nome do que se conta, nas duas flexões. */
  substantivo: ResultCountSubstantivo;
  /** Há página seguinte. Quando verdadeiro, `total` é IGNORADO. */
  temMais?: boolean;
  /** Canal de ARIA. Default `'status'` (polido). */
  live?: ResultCountLive;
}

const numero = (n: number): string => new Intl.NumberFormat('pt-BR').format(n);

/**
 * O texto do contador. Exportado porque é a regra de honestidade do número, e
 * regra de negócio se testa direto — não só pelo que o DOM mostra.
 */
export function textoDoContador({
  visiveis,
  total,
  substantivo,
  temMais = false,
}: {
  visiveis: number;
  total?: number | undefined;
  substantivo: ResultCountSubstantivo;
  temMais?: boolean | undefined;
}): string {
  const palavra = (n: number): string => (n === 1 ? substantivo.singular : substantivo.plural);

  // Cursor aberto: o número é do que está na tela, e o total não existe.
  if (temMais) {
    return `Mostrando ${numero(visiveis)} ${palavra(visiveis)} · há mais para carregar`;
  }
  // Total conhecido: a única forma em que "de N" é verdade.
  if (total !== undefined) {
    return `Mostrando ${numero(visiveis)} de ${numero(total)} ${palavra(total)}`;
  }
  // Cursor fechado: o carregado É o total do recorte, porque a paginação acabou.
  return `${numero(visiveis)} ${palavra(visiveis)} · fim da lista`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ResultCount({
  visiveis,
  total,
  substantivo,
  temMais = false,
  live = 'status',
  className,
  ...props
}: ResultCountProps): JSX.Element {
  const canal =
    live === 'status' ? ({ role: 'status', 'aria-live': 'polite' } as const) : ({} as const);

  return (
    <p
      {...canal}
      className={cn(
        'text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]',
        className,
      )}
      {...props}
    >
      {textoDoContador({ visiveis, total, substantivo, temMais })}
    </p>
  );
}

ResultCount.displayName = 'ResultCount';

export { ResultCount };
