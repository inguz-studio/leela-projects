// =============================================================================
// navSpa — navegação de SPA SEM perder o link (LEELA-NAVFIX-T2).
//
// O problema que isto resolve (PAINEL-NAV-DIAG-REPORT, H1): as abas do painel
// eram âncoras HTML cruas. Clicar numa aba disparava navegação de DOCUMENTO —
// `main.tsx` rodava de novo, o QueryClient evaporava, a sessão do Firebase
// precisava ser restaurada do IndexedDB e a tela pintava o esqueleto inteiro.
// É o "parece que entrei num site novo" relatado pelo Vitor. Não é percepção.
//
// A correção NÃO é trocar `<a href>` por `<button>`. O `href` é o que dá
// ctrl/cmd+clique, clique do meio, "copiar endereço do link" e preview da URL
// na barra de status — e é o que faz a superfície ser navegação de verdade para
// leitor de tela e para o histórico. O `href` FICA; o clique simples é que passa
// a ser interceptado.
//
// Espelho disto no menu lateral: lá o defeito era invertido (só `onClick`, sem
// `href` — navegava por SPA mas não era link). O estado correto é um só padrão,
// nas duas pontas: `href` presente E `onClick` que faz `preventDefault`.
// =============================================================================

import type * as React from 'react';
import type { BreadcrumbItem, SubNavTab } from '@leela/design-system';

/** Assinatura mínima do `navigate` do react-router que estas superfícies usam. */
export type NavegarSpa = (para: string) => void;

/**
 * O clique pertence ao NAVEGADOR, não a nós?
 *
 *   ctrl/cmd → abrir em nova aba · shift → nova janela · alt → baixar
 *   button ≠ 0 → clique do meio (nova aba) ou secundário (menu de contexto)
 *
 * Em qualquer um desses casos não interceptamos nada: devolvemos o clique ao
 * `href` e o navegador faz o que a pessoa pediu. Preservar essas teclas é o
 * ponto inteiro de manter a âncora.
 */
export function ehCliqueDoNavegador(event: React.MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

/**
 * Handler de clique para uma superfície de navegação interna: clique simples
 * navega por SPA; qualquer clique com intenção de "abrir noutro lugar" passa
 * batido para o `href`.
 */
export function onClickSpa(
  navegar: NavegarSpa,
  para: string,
): (event: React.MouseEvent) => void {
  return (event) => {
    // Alguém acima já tratou (ex.: um wrapper que fecha um menu) — não navegar
    // duas vezes nem sequestrar a decisão de quem chegou primeiro.
    if (event.defaultPrevented) return;
    if (ehCliqueDoNavegador(event)) return;
    event.preventDefault();
    navegar(para);
  };
}

/**
 * Compõe um `onClick` que a superfície já trazia com a navegação de SPA
 * (LEELA-NAVFIX-REV).
 *
 * A fiação por spread (`{ ...tab, onClick: onClickSpa(...) }`) SOBRESCREVIA em
 * silêncio um `onClick` que a aba trouxesse — fechar um menu, registrar um
 * evento de produto. Como a Directive desta lane manda toda superfície nova
 * nascer por aqui, o descarte silencioso seria descoberto em produção, não no
 * gate. A ordem é a mesma do resto do contrato: quem chegou primeiro decide —
 * o handler original roda antes, e se ele cancelar o default o `onClickSpa`
 * desiste sozinho pelo early-return de `defaultPrevented`.
 */
function comNavSpa(
  original: ((event: React.MouseEvent) => void) | undefined,
  navegar: NavegarSpa,
  para: string,
): (event: React.MouseEvent) => void {
  const spa = onClickSpa(navegar, para);
  if (!original) return spa;
  return (event) => {
    original(event);
    spa(event);
  };
}

/**
 * Fia as abas de um `SubNav` para navegar por SPA. Aplicado no PONTO DE RENDER
 * (a casca que monta a barra), nunca dentro dos construtores `@pure` de abas —
 * eles seguem sendo funções puras de (slug, aba ativa) → tabs, com teste
 * orientado a tabela que esta lane não toca.
 *
 * Aba sem `href` já navega por `onClick` (padrão nascido na rodada IA-MENU) e
 * passa intocada.
 */
export function tabsComNavSpa(tabs: readonly SubNavTab[], navegar: NavegarSpa): SubNavTab[] {
  return tabs.map((tab) =>
    tab.href ? { ...tab, onClick: comNavSpa(tab.onClick, navegar, tab.href) } : tab,
  );
}

/**
 * Mesma fiação para a trilha do `Breadcrumb`. O último item é a página atual
 * (não vira link) e um item sem `href` é texto — o DS ignora o `onClick` nos
 * dois casos, então mapear a lista inteira é seguro.
 */
export function trilhaComNavSpa(
  itens: readonly BreadcrumbItem[],
  navegar: NavegarSpa,
): BreadcrumbItem[] {
  return itens.map((item) =>
    item.href ? { ...item, onClick: comNavSpa(item.onClick, navegar, item.href) } : item,
  );
}
