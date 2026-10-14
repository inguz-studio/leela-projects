// =============================================================================
// probe-rosca-s825 — o gate visual da rosca de formas de pagamento (S825-T2).
//
// Molde do `probe-visual.mjs`. A diferença é que este não só captura: ele LÊ o
// cartão e devolve o texto medido, porque o handoff da SERIE-FINANCEIRA pina
// números exatos (centro R$ 2.500, 10 vendas, 41,6% / 58,4%, nota citando
// R$ 50.560) e "capturar não é ver" — a tela-preta de 10/08 passou por 2.387
// testes verdes.
//
// Os três estados NÃO são o mesmo estado (ver FormasDePagamento.tsx):
//   null          → "em breve"  (o servidor não sabe somar)
//   série zerada  → vazio honesto ("Nenhuma venda confirmada ainda")
//   série c/ venda→ a rosca
// Este probe rotula qual estado encontrou, e não deixa nenhum passar por outro.
// =============================================================================

import { chromium } from '@playwright/test';

const OUT = process.argv[2];
const ROTULO = process.argv[3] ?? 'estado';
const B = 'http://127.0.0.1:4602';
const CARTAO = '[aria-label="Formas de pagamento"]';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const erros = [];
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
page.on('pageerror', (e) => erros.push(String(e)));

const resp = await page.goto(`${B}/?preview=castelo`, {
  waitUntil: 'domcontentloaded',
  timeout: 45000,
});
console.log('http', resp?.status());

// O autologin do mock + o agregado do portfólio levam alguns segundos.
await page.waitForTimeout(9000);

// Espera o cartão existir em QUALQUER um dos três estados. O "em breve" é
// outro componente (EmBreveV3), então procuramos pelo texto do título também.
await page
  .waitForFunction(
    () =>
      document.querySelector('[aria-label="Formas de pagamento"]') !== null ||
      Array.from(document.querySelectorAll('*')).some(
        (el) =>
          el.children.length === 0 &&
          el.textContent?.trim() === 'Formas de pagamento',
      ),
    { timeout: 30000 },
  )
  .catch(() => console.log('AVISO: cartao nao apareceu no tempo'));

// Rola o cartão para a vista antes de fotografar — foto de coisa fora da
// viewport é foto de nada.
const alvo = page.locator(CARTAO).first();
const temCartao = (await alvo.count()) > 0;
if (temCartao) {
  await alvo.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
}

// --- o que o cartão DIZ, medido do DOM ---------------------------------------
const medido = await page.evaluate(() => {
  const card = document.querySelector('[aria-label="Formas de pagamento"]');
  if (card) {
    const svg = card.querySelector('svg');
    return {
      estado: 'cartao',
      texto: card.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      ariaGrafico:
        card.querySelector('[aria-label*="forma de pagamento"]')?.getAttribute('aria-label') ?? null,
      fatias: svg ? svg.querySelectorAll('path').length : 0,
    };
  }
  // "em breve" — o EmBreveV3 não usa CartaoV3, procura pelo título solto.
  const titulo = Array.from(document.querySelectorAll('*')).find(
    (el) => el.children.length === 0 && el.textContent?.trim() === 'Formas de pagamento',
  );
  const bloco = titulo?.closest('section, article, div[class*="card"], div');
  return {
    estado: 'em-breve-ou-ausente',
    texto: bloco?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 600) ?? '(nada)',
    ariaGrafico: null,
    fatias: 0,
  };
});

console.log('--- TEXTO DO CARTAO ---');
console.log(medido.texto);
console.log('--- ARIA DO GRAFICO ---');
console.log(medido.ariaGrafico);
console.log('--- CAMINHOS NO SVG (fatias+anel) ---', medido.fatias);

// --- veredito de estado, sem achatar dois num só ------------------------------
const t = medido.texto;
const eRosca = /vendas? confirmadas?/.test(t) && medido.fatias > 0;
const eVazio = /Nenhuma venda confirmada ainda/.test(t);
const eEmBreve = /ainda não chegou a este painel/.test(t);
console.log(
  'ESTADO:',
  eRosca ? 'ROSCA (serie com venda)' : eVazio ? 'VAZIO HONESTO (serie zerada)' : eEmBreve ? 'EM BREVE (serie null)' : 'INDETERMINADO',
);

// --- as marcas que o handoff pina --------------------------------------------
const marcas = {
  'centro R$ 2.500': /R\$\s?2\.500/.test(t),
  '10 vendas confirmadas': /10 vendas confirmadas/.test(t),
  'legenda Cartão': /Cart[ãa]o de cr[ée]dito/.test(t),
  'legenda Pix': /Pix/.test(t),
  'nota de cobertura c/ R$ 50.560': /50\.560/.test(t),
};
for (const [k, v] of Object.entries(marcas)) console.log(v ? 'OK  ' : 'FALTA', k);

// --- capturas -----------------------------------------------------------------
if (temCartao) {
  await alvo.screenshot({ path: `${OUT}/rosca-${ROTULO}-cartao.png` });
  console.log('shot', `rosca-${ROTULO}-cartao.png`);
}
await page.screenshot({ path: `${OUT}/rosca-${ROTULO}-desktop.png`, fullPage: true });
console.log('shot', `rosca-${ROTULO}-desktop.png`);

const page375 = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page375.goto(`${B}/?preview=castelo`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page375.waitForTimeout(9000);
const alvo375 = page375.locator(CARTAO).first();
if ((await alvo375.count()) > 0) {
  await alvo375.scrollIntoViewIfNeeded();
  await page375.waitForTimeout(1200);
  await alvo375.screenshot({ path: `${OUT}/rosca-${ROTULO}-375-cartao.png` });
  console.log('shot', `rosca-${ROTULO}-375-cartao.png`);
}
await page375.close();

console.log('ERROS DE CONSOLE:', erros.length);
erros.slice(0, 10).forEach((e) => console.log('  !', e));

await browser.close();
