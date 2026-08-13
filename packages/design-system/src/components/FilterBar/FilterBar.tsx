/**
 * FilterBar — a barra que hospeda busca, facetas, contador e ações da lista.
 *
 * POR QUE EXISTE. Inventário de 2026-08-12, §4.2: treze telas montaram a mesma
 * barra à mão, tela por tela. A única fatorada do produto é a casca app-local
 * `plataforma/_components/ListaGlobal.tsx`, e o comentário no topo dela diz
 * exatamente por quê: *"em vez de dois arquivos que nascem iguais e divergem no
 * primeiro conserto"*. Ela nunca subiu ao design system, e o oitavo consumidor
 * já declarou a divergência por escrito (`VendasTab.tsx:6`). Divergência com
 * razão escrita é o melhor caso possível de uma peça que devia ser do design
 * system e não é.
 *
 * COMPÕE O `Toolbar`, NÃO O SUBSTITUI. O `Toolbar` já resolve o que se repete:
 * a linha com dois lados, o refluxo que EMPILHA abaixo de `lg` (defeito M2 do
 * QA-LIVE-2, quando busca + ícones + CTA não cabiam em 390px), o `role="toolbar"`
 * com nome acessível e a hairline de separação. A `FilterBar` acrescenta o que
 * falta: os quatro slots com papel declarado e o refluxo INTERNO das facetas,
 * que é onde a barra à mão quebra — três grupos de faceta numa linha sem
 * `flex-wrap` produzem rolagem horizontal, e rolagem horizontal nesta casa é
 * dívida recorrente.
 *
 * O LANDMARK DE BUSCA FICA ONDE A BUSCA ESTÁ, e essa é a única decisão em que
 * esta peça se afasta da letra da spec da rodada. O `SearchInput` do DS já
 * declara `role="search"` no próprio contêiner (`SearchInput.tsx:66`); um
 * segundo `role="search"` na barra aninharia dois landmarks do mesmo tipo, que
 * é o que a regra `landmark-unique` do axe reprova e o que faz o leitor de tela
 * anunciar duas buscas onde há uma. Então a barra é o `toolbar` nomeado e o
 * `search` continua no campo. O ganho que a spec pedia — "ARIA num lugar só" —
 * é o mesmo: treze telas param de decidir, e a decisão passa a ser da peça.
 *
 * NÃO É UM CARTÃO NEM UM CABEÇALHO. A barra não pinta superfície e não tem
 * título: quem dá título ao bloco é o `SectionHeader`, quem dá superfície é o
 * `Card`. Misturar os três foi o que produziu treze anatomias.
 *
 * AA: nenhum par novo — a barra não pinta nada. Contraste, foco e teclado são
 * dos controles que entram nos slots, e todos já rodam na matriz.
 */

import * as React from 'react';
import { Toolbar } from '../Toolbar';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FilterBarProps {
  /**
   * O que a lista mostra, no plural ("comunicados", "inscritos"). Vira o nome
   * acessível da barra — `Filtros de comunicados` —, de propósito em UMA
   * grafia só: as treze barras medidas ou não tinham nome ou tinham um cada.
   */
  label: string;
  /** O campo de busca. `SearchInput` do DS — ele traz o próprio `role="search"`. */
  search?: React.ReactNode;
  /** As facetas. Uma ou mais `FilterChips`; elas refluem sozinhas. */
  facets?: React.ReactNode;
  /** O contador da lista recortada. `ResultCount` do DS. */
  count?: React.ReactNode;
  /** Ação primária da lista ("+ Nova campanha"), à direita. */
  actions?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function FilterBar({
  label,
  search,
  facets,
  count,
  actions,
  className,
}: FilterBarProps): JSX.Element {
  return (
    <Toolbar
      aria-label={`Filtros de ${label}`}
      {...(className !== undefined ? { className } : {})}
      start={
        // `flex-wrap` AQUI, e não no `start` do Toolbar: o lado esquerdo da
        // barra é o que cresce (busca + N facetas) e é ele que precisa quebrar
        // linha. O Toolbar continua com uma linha só de dois lados.
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[var(--spacing-3)]">
          {search}
          {facets ? (
            <div className="flex flex-wrap items-center gap-[var(--spacing-4)]">{facets}</div>
          ) : null}
        </div>
      }
      end={
        count || actions ? (
          <>
            {count}
            {actions}
          </>
        ) : null
      }
    />
  );
}

FilterBar.displayName = 'FilterBar';

export { FilterBar };
