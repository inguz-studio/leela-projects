// =============================================================================
// V2708-05 — a régua que mantém a aba ativa dentro da barra.
//
// jsdom não tem motor de layout: `getBoundingClientRect` devolve zero para tudo
// e `scrollWidth` nunca passa de `clientWidth`. Por isso a MEDIÇÃO do defeito
// mora no gate visual (`.nirvana/gate-visual/terciario-nav/`, navegador de
// verdade, 65px→0 com o menu fechado e 229px→0 com ele aberto).
//
// O que este arquivo guarda é a ARITMÉTICA, com as caixas fabricadas à mão: em
// que direção a barra rola, quanta folga sobra, e — o mais importante — os casos
// em que ela NÃO deve mexer em nada. Uma régua de scroll que corre solta é pior
// que o defeito que ela conserta.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { revelarAbasAtivas } from '../abaAtivaVisivel';

interface Caixa {
  x: number;
  width: number;
}

/**
 * Monta uma `<nav>` com uma aba ativa, fabricando as caixas que o jsdom não
 * calcula. `rola` liga a rolagem horizontal (scrollWidth > clientWidth).
 */
function montarBarra({
  nav,
  aba,
  rola = true,
  scrollLeft = 0,
}: {
  nav: Caixa;
  aba: Caixa;
  rola?: boolean;
  scrollLeft?: number;
}): HTMLElement {
  const raiz = document.createElement('div');
  const barra = document.createElement('nav');
  const ativo = document.createElement('a');
  ativo.setAttribute('aria-current', 'page');
  barra.appendChild(ativo);
  raiz.appendChild(barra);

  Object.defineProperty(barra, 'clientWidth', { value: nav.width, configurable: true });
  Object.defineProperty(barra, 'scrollWidth', {
    value: rola ? nav.width + 300 : nav.width,
    configurable: true,
  });
  barra.scrollLeft = scrollLeft;

  barra.getBoundingClientRect = () =>
    ({ x: nav.x, left: nav.x, right: nav.x + nav.width, width: nav.width }) as DOMRect;
  ativo.getBoundingClientRect = () =>
    ({ x: aba.x, left: aba.x, right: aba.x + aba.width, width: aba.width }) as DOMRect;

  return raiz;
}

function scrollDa(raiz: HTMLElement): number {
  return (raiz.querySelector('nav') as HTMLElement).scrollLeft;
}

describe('a aba ativa entra na área visível', () => {
  it('aba cortada à DIREITA: a barra rola para a frente, com folga', () => {
    // Barra de 0 a 900; aba de 850 a 990 → 90px para fora. Rola 90 + 16 de folga.
    const raiz = montarBarra({ nav: { x: 0, width: 900 }, aba: { x: 850, width: 140 } });
    revelarAbasAtivas(raiz);
    expect(scrollDa(raiz)).toBe(106);
  });

  it('aba cortada à ESQUERDA: a barra rola para trás, com folga', () => {
    // Aba começa 40px antes da borda esquerda da barra; volta 40 + 16.
    const raiz = montarBarra({
      nav: { x: 100, width: 900 },
      aba: { x: 60, width: 140 },
      scrollLeft: 300,
    });
    revelarAbasAtivas(raiz);
    expect(scrollDa(raiz)).toBe(300 - 56);
  });

  it('quanto mais estreita a barra, mais ela precisa rolar', () => {
    // É a diferença que o menu lateral faz: a moldura encolhe e o corte cresce.
    const larga = montarBarra({ nav: { x: 0, width: 900 }, aba: { x: 850, width: 140 } });
    const estreita = montarBarra({ nav: { x: 0, width: 740 }, aba: { x: 850, width: 140 } });
    revelarAbasAtivas(larga);
    revelarAbasAtivas(estreita);
    expect(scrollDa(estreita)).toBeGreaterThan(scrollDa(larga));
  });
});

describe('⛔ quando a régua NÃO pode encostar no scroll', () => {
  it('aba inteiramente visível: não mexe', () => {
    const raiz = montarBarra({
      nav: { x: 0, width: 900 },
      aba: { x: 300, width: 140 },
      scrollLeft: 55,
    });
    revelarAbasAtivas(raiz);
    expect(scrollDa(raiz)).toBe(55);
  });

  it('barra que não rola: não mexe (o desktop inteiro cai aqui)', () => {
    const raiz = montarBarra({
      nav: { x: 0, width: 900 },
      aba: { x: 850, width: 140 },
      rola: false,
      scrollLeft: 0,
    });
    revelarAbasAtivas(raiz);
    expect(scrollDa(raiz)).toBe(0);
  });

  it('sem aba ativa: não mexe', () => {
    const raiz = montarBarra({ nav: { x: 0, width: 900 }, aba: { x: 850, width: 140 } });
    raiz.querySelector('[aria-current]')?.removeAttribute('aria-current');
    revelarAbasAtivas(raiz);
    expect(scrollDa(raiz)).toBe(0);
  });

  it('sem layout medível (jsdom cru, largura 0): não mexe', () => {
    // A guarda que impede a régua de virar scroll aleatório em ambiente sem
    // motor de layout — inclusive na captura de miniatura e em teste de outrem.
    const raiz = montarBarra({ nav: { x: 0, width: 0 }, aba: { x: 0, width: 0 } });
    revelarAbasAtivas(raiz);
    expect(scrollDa(raiz)).toBe(0);
  });

  it('só o scroll da BARRA é tocado — a página não se mexe', () => {
    // `scrollIntoView` arrastaria a página na vertical junto. A régua não o usa,
    // e este caso falha se alguém trocar a implementação por ele.
    const raiz = montarBarra({ nav: { x: 0, width: 900 }, aba: { x: 850, width: 140 } });
    const antes = { x: window.scrollX, y: window.scrollY };
    revelarAbasAtivas(raiz);
    expect({ x: window.scrollX, y: window.scrollY }).toEqual(antes);
  });
});
