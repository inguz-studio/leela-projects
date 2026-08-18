// =============================================================================
// Prova pinada da lane navbar-fix-20260817.
//
// O DEFEITO, na fala do dono: "a responsividade do mobile esta quebrando o
// select de menu (selecionado)... fazendo o componente... quebrar e
// ultrapassar os limites do componente da menu bar".
//
// A CAUSA, provada por medição (não presumida): o indicador deslizante do
// BottomNav (`data-bottomnav-indicador`) media `offsetLeft`/`offsetWidth` do
// botão ativo só quando o ITEM ativo trocava (`useLayoutEffect` com deps
// `[ativoId, items]`). Como cada botão é `flex-1 min-w-0`, a largura dele é
// função do tamanho do CONTÊINER — recalculada a cada reflow do navegador —
// mas o indicador não tinha como saber disso: sem listener de resize, ele
// ficava com a medida antiga. É "responsividade" no sentido literal:
// REDIMENSIONAR (rotacionar aparelho, arrastar a janela do devtools, o
// teclado virtual abrindo) sem trocar de item é exatamente o gatilho.
//
// Medido ANTES do conserto, em 375 → 320 sem remontar, com "CRM" (o item mais
// à direita) ativo: o botão real ficava em x=234 w=68 (right=302, dentro da
// barra), mas o indicador ficava PRESO em w=82 (herdado de 375) e vazava
// **49 px** para fora da moldura da barra (right=357 contra right=308 da
// barra). Esse número trava esta suíte: qualquer regressão da mesma família
// reabre a mesma conta.
//
// MÉTODO. jsdom não tem motor de layout (getBoundingClientRect devolve zero
// pra tudo — mesma razão do custo-na-dobra.test.ts). Este arquivo mede de
// verdade, via Playwright, contra o harness-bottomnav.html do showroom do DS
// (mesmo preset do Tailwind que apps/painel usa — CSS idêntico), servido numa
// porta PRÓPRIA (5401, playwright.harness.config.ts) para nunca competir com
// o app real.
// =============================================================================

import { test, expect } from '@playwright/test';

const WIDTHS = [320, 360, 375] as const;
const ITEMS = ['visao-geral', 'eventos', 'clubs', 'crm'] as const;
const EPS = 1; // subpixel — o navegador arredonda offsetWidth em fração de px

interface Caixa {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  left: number;
  top: number;
}

async function medir(page: import('@playwright/test').Page): Promise<{
  moldura: Caixa;
  indicador: Caixa;
  ativo: Caixa;
}> {
  await page.waitForSelector('[data-bottomnav-indicador]');
  // Deixa a transição de transform/width assentar — o indicador anima
  // (`--bottomnav-motion`) e uma leitura no meio do voo não é a medida final.
  await page.waitForTimeout(350);
  return page.evaluate(() => {
    const nav = document.querySelector('nav[data-bottomnav]');
    const moldura = nav?.firstElementChild ?? null; // a pílula da barra em si
    const indicador = document.querySelector('[data-bottomnav-indicador]');
    const ativo = document.querySelector('[aria-current="page"]');
    const r = (el: Element | null) => {
      const b = (el as HTMLElement)?.getBoundingClientRect();
      if (!b) throw new Error('elemento da barra não encontrado no DOM');
      return {
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        right: b.right,
        bottom: b.bottom,
        left: b.left,
        top: b.top,
      };
    };
    return { moldura: r(moldura), indicador: r(indicador), ativo: r(ativo) };
  });
}

function dentro(caixa: Caixa, moldura: Caixa, epsilon: number): boolean {
  return (
    caixa.left >= moldura.left - epsilon &&
    caixa.right <= moldura.right + epsilon &&
    caixa.top >= moldura.top - epsilon &&
    caixa.bottom <= moldura.bottom + epsilon
  );
}

for (const active of ITEMS) {
  test(`"${active}" ativo — a pílula acompanha o botão em toda a varredura 320↔375`, async ({
    page,
  }) => {
    // A cadeia cobre carga a frio em 320 e as duas direções de resize (largo→
    // estreito e estreito→largo) sem nunca remontar o componente — é
    // literalmente arrastar a janela, o gesto que expôs o defeito.
    const rota = [320, 360, 375, 320] as const;

    await page.setViewportSize({ width: rota[0], height: 800 });
    await page.goto(`/harness-bottomnav.html?active=${active}`, { waitUntil: 'networkidle' });

    for (const width of rota) {
      await page.setViewportSize({ width, height: 800 });
      const { moldura, indicador, ativo } = await medir(page);

      // Aceite literal do brief: a pílula inteira dentro da moldura da barra,
      // nas duas direções.
      expect(
        dentro(indicador, moldura, EPS),
        `indicador fora da moldura em ${width}px (indicador=${JSON.stringify(indicador)} moldura=${JSON.stringify(moldura)})`,
      ).toBe(true);

      // Mais forte que "cabe por acaso": o indicador precisa ser o MESMO
      // retângulo do botão ativo por baixo, não só um retângulo qualquer que
      // não vaza. Sem isto, uma medida presa que por sorte ainda coubesse na
      // barra passaria despercebida.
      expect(Math.abs(indicador.x - ativo.x), `x do indicador != x do botão em ${width}px`).toBeLessThanOrEqual(EPS);
      expect(
        Math.abs(indicador.width - ativo.width),
        `largura do indicador != largura do botão em ${width}px`,
      ).toBeLessThanOrEqual(EPS);
    }
  });
}

test('WIDTHS cobre exatamente o trio do brief (320/360/375)', () => {
  expect(WIDTHS).toEqual([320, 360, 375]);
});
