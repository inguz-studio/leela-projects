/**
 * FilterChips — a faceta de UM filtro de listagem. Sempre em LISTA.
 *
 * POR QUE EXISTE. Inventário de 2026-08-12, §4.1: doze telas montaram à mão o
 * mesmo `<div role="group" aria-label="Filtrar por X">` + `Chip.map()`, e sete
 * delas compartilham até a classe de espaçamento. O `Chip` é canônico e está
 * certo; o que se repetiu doze vezes é a MONTAGEM — e é a montagem que decide
 * se a faceta é exclusiva ou empilhável, se mostra contagem e como o leitor de
 * tela ouve o grupo.
 *
 * ⛔ O LIMIAR MORREU EM 2026-08-17, POR DECISÃO DO DONO (leva 20). Até aqui
 * esta peça CONTAVA as opções: abaixo de quatro desenhava fileira de `Chip`,
 * de quatro em diante virava `FilterMenu`/`Combobox`. O dono, na íntegra:
 * *"novamente, voco colocol pills no lugar de filtros, em Membros, em duas
 * fileiras, quanto poderiamos apenas ter filtros. (...) quero que voce aplique
 * o componente dos filtros em lista. e eles devem ficar alinhados ao lado do
 * pesquisador, assim como em DEsafios. Para padronizar."* Filtro de listagem é
 * lista, e ponto — a contagem de opções não decide mais nada.
 *
 * A RÉGUA QUE PERDEU, ESCRITA PARA NÃO VOLTAR POR ESQUECIMENTO. O limiar
 * existia para poupar clique: fileira mostra tudo de uma vez, menu cobra abrir.
 * Três ADRs (018, 019, 020) recusaram converter telas em nome dessa economia, e
 * a régua deles era "onda que sobe passo não fecha". A régua do dono é outra e
 * vence: clareza do padrão. O que a medição de 17/08 mostrou é que o clique
 * economizado saía caro em outro lugar — a fileira não mostra o NOME da faceta.
 * Em Membros o organizador via `Todos · Ativos · Novos · Inativos · Todos ·
 * Owner · Admins · Membros`: dois "Todos" colados, sem nada dizendo onde acaba
 * Status e começa Papel. O nome só existia no `aria-label`, ou seja, só para
 * quem usa leitor de tela. A lista resolve isso por construção: o gatilho é
 * `Status: Todos`, com o nome da faceta VISÍVEL e o valor aplicado junto.
 *
 * QUAL LISTA, E POR QUE DUAS. `FilterMenu` é multi-seleção por construção
 * (itens `menuitemcheckbox`) e usá-lo para escolha exclusiva anunciaria
 * "marcado" onde a semântica é "selecionado". Então: `multiple` é `FilterMenu`,
 * exclusiva é `Combobox`. Os dois são canônicos, os dois mostram o que está
 * aplicado, e nenhum é `Select` — que o cânone proíbe para filtro com essas
 * palavras.
 *
 * O "TODOS" NÃO É MAIS UM CHIP, E CONTINUA EXISTINDO. Em faceta exclusiva ele
 * é a primeira linha do `Combobox` (limpar filtro exclusivo precisa de saída
 * visível — clicar de novo no valor ativo é afordância escondida). Em faceta
 * empilhável ele é o resumo do gatilho quando nada está marcado.
 *
 * ZERO MOTOR PRÓPRIO. Nada aqui desenha popover ou lista: a peça compõe
 * `FilterMenu` e `Combobox` do barril.
 *
 * AA: nenhum par novo — `FilterMenu` e `Combobox` já rodam na matriz de
 * contraste nos três temas, e o grupo não pinta nada.
 */

import { FilterMenu } from '../FilterMenu';
import { Combobox } from '../Combobox';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FilterChipsOption {
  id: string;
  label: string;
  /** Quantos itens a opção recorta. Aparece no chip e na linha do menu. */
  count?: number;
}

export interface FilterChipsProps {
  /**
   * O nome da faceta ("Status", "Canal"). Nomeia o grupo para o leitor de tela
   * e o gatilho do menu — é o mesmo texto nos dois desenhos, de propósito.
   */
  label: string;
  options: FilterChipsOption[];
  /** ids aplicados. Vazio = sem filtro. Em faceta exclusiva, no máximo um. */
  selected: string[];
  onChange: (next: string[]) => void;
  /** Faceta empilhável (marca vários) ou exclusiva (um recorte por vez). */
  multiple?: boolean;
  /** Texto do estado sem seleção. Default: "Todos". */
  allLabel?: string;
  /** Contagem do estado sem seleção — o total do recorte. */
  allCount?: number;
  /**
   * Faceta desligada em bloco. Nasceu do ADR-020: o diretório global de eventos
   * desabilita o recorte por status enquanto o recorte por tenant está ativo
   * (os dois são mutuamente exclusivos na leitura de dado). Era a capacidade
   * que faltava à peça e que o ADR nomeou como condição de reabertura.
   */
  disabled?: boolean;
  className?: string;
}

/** "Rascunho · 12" — a grafia que a faceta de inscritos já usava. */
function rotulo(texto: string, count: number | undefined): string {
  return count === undefined ? texto : `${texto} · ${count}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function FilterChips({
  label,
  options,
  selected,
  onChange,
  multiple = false,
  allLabel = 'Todos',
  allCount,
  disabled = false,
  className,
}: FilterChipsProps): JSX.Element {
  // ── Faceta empilhável ──────────────────────────────────────────────────────
  if (multiple) {
    return (
      <FilterMenu
        label={label}
        allLabel={allLabel}
        selected={selected}
        onChange={onChange}
        disabled={disabled}
        options={options.map((o) => ({
          id: o.id,
          label: o.label,
          ...(o.count !== undefined ? { count: o.count } : {}),
        }))}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  // ── Faceta exclusiva ───────────────────────────────────────────────────────
  //
  // O `Combobox` devolve string em modo single. A opção vazia é o "Todos": ela
  // precisa de um valor real porque `value=""` no `Command` não é selecionável,
  // então o id do "tudo" é explícito e nunca escapa desta peça.
  const ID_TUDO = '__todos__';
  return (
    <Combobox
      aria-label={label}
      placeholder={allLabel}
      disabled={disabled}
      value={selected[0] ?? ID_TUDO}
      onValueChange={(v) => {
        const escolhido = Array.isArray(v) ? v[0] : v;
        onChange(escolhido === undefined || escolhido === ID_TUDO ? [] : [escolhido]);
      }}
      options={[
        { value: ID_TUDO, label: rotulo(allLabel, allCount) },
        ...options.map((o) => ({ value: o.id, label: rotulo(o.label, o.count) })),
      ]}
      {...(className !== undefined ? { className } : {})}
    />
  );
}

FilterChips.displayName = 'FilterChips';

export { FilterChips };
