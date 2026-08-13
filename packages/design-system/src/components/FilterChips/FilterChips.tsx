/**
 * FilterChips — a faceta de UM filtro, com o limiar do cânone fechado por
 * construção.
 *
 * POR QUE EXISTE. Inventário de 2026-08-12, §4.1: doze telas montaram à mão o
 * mesmo `<div role="group" aria-label="Filtrar por X">` + `Chip.map()`, e sete
 * delas compartilham até a classe de espaçamento. O `Chip` é canônico e está
 * certo; o que se repetiu doze vezes é a MONTAGEM — e é a montagem que decide
 * se existe o chip de "Todos", se a faceta é exclusiva ou empilhável, se o chip
 * mostra contagem e como o leitor de tela ouve o grupo. Hoje isso é escolha de
 * cada tela, e as telas escolheram diferente: oito têm o chip "Todos", quatro
 * não; uma mostra contagem, onze não.
 *
 * O LIMIAR É DA PEÇA, NÃO DO GATE. O cânone §1 manda `FilterMenu` em faceta de
 * quatro ou mais valores (a regra Polaris que o próprio `FilterMenu` cita) e
 * `Chip` com `active` abaixo disso. Doze facetas foram montadas como fileira
 * sem que ninguém contasse os valores, porque não havia contra o quê reprovar —
 * e um script não sabe quantos valores uma faceta tem em execução, já que o
 * array vem de `_lib`, de query ou de prop. A peça sabe: ela RECEBE a lista.
 * Regra que precisa de dado de execução não vira lint; vira componente.
 *
 * QUAL DROPDOWN, E POR QUE DOIS. Acima do limiar a escolha não é uma só, e a
 * régua já estava escrita no cabeçalho do `FilterMenu`: *"para seleção ÚNICA
 * exclusiva com 4+ valores, use `Combobox`; com <4, use `Chips`"*. O
 * `FilterMenu` é multi-seleção por construção (itens `menuitemcheckbox`), e
 * usá-lo para escolha exclusiva anunciaria "marcado" onde a semântica é
 * "selecionado". Então: `multiple` acima do limiar é `FilterMenu`, exclusiva
 * acima do limiar é `Combobox`. Os dois são canônicos e os dois mostram o que
 * está aplicado — nenhum deles é `Select`, que o cânone proíbe com essas
 * palavras.
 *
 * O CHIP DE "TODOS" DEIXA DE SER ESCOLHA DE TELA. Em faceta exclusiva ele
 * SEMPRE existe: limpar um filtro exclusivo clicando de novo no chip ativo é
 * afordância escondida — nada na tela diz que ele destrava —, e quatro das doze
 * facetas medidas não tinham outra saída. Em faceta empilhável ele não existe:
 * seleção vazia já é o estado "tudo", e cada chip destrava sozinho e visível
 * pelo `aria-pressed`.
 *
 * ZERO MOTOR PRÓPRIO. Nada aqui desenha chip, popover ou lista: a peça compõe
 * `Chip`, `FilterMenu` e `Combobox` do barril. A lição é a do `ConfirmModal`,
 * que duplicava `<textarea>` e `<input type="checkbox">` DENTRO do design
 * system e ficou parado numa decisão de estilo que o canônico já tinha
 * atualizado.
 *
 * AA: nenhum par novo — `Chip`, `FilterMenu` e `Combobox` já rodam na matriz de
 * contraste nos três temas, e o grupo não pinta nada.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import { Chip } from '../Chip';
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
  className?: string;
}

/**
 * O limiar do cânone §1, e a única constante desta peça. Abaixo dele a fileira
 * mostra todas as opções de uma vez; a partir dele a fileira vira parede e o
 * canônico é o menu.
 */
const LIMIAR_DE_DROPDOWN = 4;

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
  className,
}: FilterChipsProps): JSX.Element {
  const marcados = React.useMemo(() => new Set(selected), [selected]);

  // ── Acima do limiar · faceta empilhável ────────────────────────────────────
  if (options.length >= LIMIAR_DE_DROPDOWN && multiple) {
    return (
      <FilterMenu
        label={label}
        allLabel={allLabel}
        selected={selected}
        onChange={onChange}
        options={options.map((o) => ({
          id: o.id,
          label: o.label,
          ...(o.count !== undefined ? { count: o.count } : {}),
        }))}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  // ── Acima do limiar · faceta exclusiva ─────────────────────────────────────
  //
  // O `Combobox` devolve string em modo single. A opção vazia é o "Todos": ela
  // precisa de um valor real porque `value=""` no `Command` não é selecionável,
  // então o id do "tudo" é explícito e nunca escapa desta peça.
  if (options.length >= LIMIAR_DE_DROPDOWN) {
    const ID_TUDO = '__todos__';
    return (
      <Combobox
        aria-label={label}
        placeholder={allLabel}
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

  // ── Abaixo do limiar · a fileira ───────────────────────────────────────────
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex flex-wrap items-center gap-[var(--spacing-2)]', className)}
    >
      {multiple ? null : (
        <Chip active={selected.length === 0} onClick={() => onChange([])}>
          {rotulo(allLabel, allCount)}
        </Chip>
      )}
      {options.map((o) => (
        <Chip
          key={o.id}
          active={marcados.has(o.id)}
          onClick={() => {
            if (multiple) {
              onChange(
                marcados.has(o.id) ? selected.filter((s) => s !== o.id) : [...selected, o.id],
              );
              return;
            }
            // Exclusiva: o chip ativo NÃO destrava no próprio clique — quem
            // limpa é o "Todos", que está do lado e diz o que faz.
            onChange([o.id]);
          }}
        >
          {rotulo(o.label, o.count)}
        </Chip>
      ))}
    </div>
  );
}

FilterChips.displayName = 'FilterChips';

export { FilterChips };
