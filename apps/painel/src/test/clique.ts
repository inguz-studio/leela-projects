// =============================================================================
// Dublês de clique para as superfícies de navegação (LEELA-NAVFIX).
//
// A lane NAV-FIX tem duas formas de exercitar o mesmo contrato:
//   · construtores puros (shell/sidebar.ts) devolvem `onClick` — chamamos o
//     handler direto, com um dublê que expõe só o que ele lê;
//   · cascas renderizadas (abas, breadcrumbs) têm âncoras no DOM — disparamos
//     um MouseEvent de verdade e lemos `defaultPrevented` nele.
//
// Fonte única para os dois, para o gate anti-regressão e os testes de
// superfície falarem exatamente a mesma língua sobre "o que é um clique
// simples" e "o que é um clique que pertence ao navegador".
// =============================================================================

import { createEvent, fireEvent } from '@testing-library/react';
import type * as React from 'react';

/** Superfície do MouseEvent que `onClickSpa` lê — nada além disso. */
export interface CliqueDuble {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
  defaultPrevented: boolean;
  preventDefault: () => void;
}

/**
 * Cliques que pertencem ao NAVEGADOR — nenhum deles pode ser interceptado.
 * Tabela em formato de `it.each`: o contrato é a tabela, não a boa intenção.
 */
export const CLIQUES_DO_NAVEGADOR: Array<[string, Partial<CliqueDuble>]> = [
  ['ctrl+clique', { ctrlKey: true }],
  ['cmd+clique', { metaKey: true }],
  ['shift+clique', { shiftKey: true }],
  ['alt+clique', { altKey: true }],
  ['clique do meio', { button: 1 }],
];

export function cliqueDuble(over: Partial<CliqueDuble> = {}): CliqueDuble {
  const evento: CliqueDuble = {
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    button: 0,
    defaultPrevented: false,
    preventDefault: () => {
      evento.defaultPrevented = true;
    },
    ...over,
  };
  return evento;
}

/** Empresta o dublê ao tipo do React — ele expõe exatamente o que é lido. */
export function comoMouseEvent(duble: CliqueDuble): React.MouseEvent {
  return duble as unknown as React.MouseEvent;
}

/** Chama o handler com um dublê e devolve o evento para inspeção. */
export function chamarOnClick(
  onClick: ((event: React.MouseEvent) => void) | undefined,
  over: Partial<CliqueDuble> = {},
): CliqueDuble {
  const evento = cliqueDuble(over);
  onClick?.(comoMouseEvent(evento));
  return evento;
}

/**
 * Dispara um clique REAL no elemento e devolve o evento.
 *
 * `defaultPrevented === true` é a prova de que não houve navegação de
 * documento: o `<a href>` só recarrega a página quando o default sobrevive.
 */
export function clicarNoDom(elemento: Element, init: MouseEventInit = {}): MouseEvent {
  const evento = createEvent.click(elemento, { button: 0, ...init });
  fireEvent(elemento, evento);
  return evento as MouseEvent;
}
