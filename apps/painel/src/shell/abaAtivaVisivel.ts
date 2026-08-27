// =============================================================================
// abaAtivaVisivel — o conserto do V2708-05 ("animações de troca de menu
// quebrando o layout").
//
// ## O sintoma, reproduzido e MEDIDO
//
// Numa janela de 1024 com a aba "Configurações" ativa, a barra do evento mostra
// "Visão geral · Inscritos · Kits · Modalidades · Comunicação · Afiliados ·
// Credenciamento" e é cortada na borda direita. A aba em que a pessoa ESTÁ —
// e o sublinhado laranja que a marca — não aparecem em lugar nenhum da barra.
//
// Abrir o menu lateral piora: a moldura perde 164px, e o pedaço da aba ativa
// que fica fora da área visível salta de **66px para 230px** (medido por
// `getBoundingClientRect` no preview, com a barra rolando 269px). Fechar o menu
// devolve. É por isso que o defeito se apresenta como *"trocar o menu quebra o
// layout"*: o que muda com o menu é o quanto da barra some.
//
// ## ⚠️ A hipótese que NÃO se confirmou, registrada para ninguém repetir
//
// A leitura inicial desta lane era que o indicador do `SubNav` ficava com a
// medida velha, porque ele mede `offsetLeft`/`offsetWidth` e só remede no
// `resize` da JANELA (`SubNav.tsx:101-112`) — abrir o rail não redimensiona
// janela nenhuma. Era a mesma causa que a NAVBAR-FIX consertou no `BottomNav`
// em 17/08 (S053), com `ResizeObserver`.
//
// **Foi medido e não reproduz.** Com o aviso de largura suprimido de propósito,
// o desalinho entre a aba ativa e o sublinhado ficou em **1px** em todos os
// estados (rail fechado, rail aberto, troca de aba). A razão é anatômica: os
// itens do `SubNav` são de LARGURA DE CONTEÚDO dentro de um `ul` com `w-max`,
// então `offsetLeft`/`offsetWidth` não dependem do tamanho do contêiner. Os do
// `BottomNav` são `flex-1 min-w-0` — POR ISSO lá a medida envelhecia e aqui não.
// Portar o `ResizeObserver` para o `SubNav` consertaria um defeito que ele não
// tem. Fica escrito porque a hipótese é plausível e alguém vai tê-la de novo.
//
// ## A causa real, e por que o conserto mora na moldura
//
// O `SubNav` rola na horizontal (`SCROLL_X_ONLY_SEM_CROMO`) e **nunca traz a aba
// ativa para dentro da área visível** — nem ao montar, nem ao trocar de rota,
// nem quando a largura disponível muda. Não há código de scroll nele.
//
// O conserto vive aqui, e não no componente, por duas razões. A de escopo: o
// `packages/design-system` está despachado para a lane vizinha nesta rodada. A
// de anatomia, que sobrevive ao escopo: quem muda de tamanho é a MOLDURA, e
// quem sabe que a rota trocou é a moldura. Uma barra é só a primeira vítima —
// a régua abaixo serve QUALQUER navegação que role na horizontal dentro do
// painel, incluindo o `TerciarioNav` na orientação de faixa (mobile), sem que
// nenhuma delas precise aprender uma convenção nova.
//
// ⛔ Só `scrollLeft` da própria barra é tocado. Nada de `scrollIntoView`, que
// arrastaria a PÁGINA na vertical junto — o oposto do que o dono pediu, e a
// armadilha que o cabeçalho de `utils/scroll` já documenta para esta superfície.
// =============================================================================

import * as React from 'react';

/** Respiro entre a aba ativa e a borda da barra, para ela não colar no corte. */
const FOLGA = 16;

/**
 * O elemento que realmente rola dentro de uma navegação: às vezes é o próprio
 * `<nav>` (é o caso do `SubNav`), às vezes um filho (é o caso do `TerciarioNav`,
 * cuja lista é que rola). Devolve `null` quando nada ali rola na horizontal —
 * que é o estado normal no desktop, e onde esta régua não faz nada.
 */
function rolagemHorizontal(nav: HTMLElement): HTMLElement | null {
  if (nav.scrollWidth > nav.clientWidth) return nav;
  for (const filho of Array.from(nav.querySelectorAll('*'))) {
    if (filho instanceof HTMLElement && filho.scrollWidth > filho.clientWidth) return filho;
  }
  return null;
}

/** Traz a aba ativa de cada navegação rolável para dentro da área visível. */
export function revelarAbasAtivas(raiz: HTMLElement): void {
  for (const nav of Array.from(raiz.querySelectorAll('nav'))) {
    const rolador = rolagemHorizontal(nav);
    if (!rolador) continue;
    const ativo = nav.querySelector('[aria-current]');
    if (!(ativo instanceof HTMLElement)) continue;

    const r = rolador.getBoundingClientRect();
    const a = ativo.getBoundingClientRect();
    // Sem `getBoundingClientRect` de verdade (jsdom) tudo é zero e a conta
    // viraria um scroll aleatório — melhor não mexer.
    if (r.width === 0) continue;

    if (a.left < r.left + FOLGA) {
      rolador.scrollLeft -= r.left + FOLGA - a.left;
    } else if (a.right > r.right - FOLGA) {
      rolador.scrollLeft += a.right - (r.right - FOLGA);
    }
  }
}

/**
 * Mantém a aba ativa visível dentro da moldura.
 *
 * Devolve a `ref` do contêiner que muda de largura quando o menu abre e fecha —
 * no painel, o contêiner de rolagem da página. Reage a duas coisas: a rota
 * mudou (`chave`) e a moldura mudou de largura (`ResizeObserver`, que dispara
 * durante toda a animação do rail e não só no fim dela).
 *
 * No-op onde não há `ResizeObserver` (jsdom): a régua acima continua exportada
 * e testável sozinha.
 */
export function useAbaAtivaVisivel<T extends HTMLElement>(chave: string): React.RefObject<T> {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    revelarAbasAtivas(el);

    if (typeof ResizeObserver === 'undefined') return undefined;
    let largura = el.getBoundingClientRect().width;
    const ro = new ResizeObserver(() => {
      const atual = el.getBoundingClientRect().width;
      // Altura muda a cada linha de conteúdo que entra; largura é o que mexe
      // com o quanto da barra cabe.
      if (atual === largura) return;
      largura = atual;
      revelarAbasAtivas(el);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [chave]);

  return ref;
}
