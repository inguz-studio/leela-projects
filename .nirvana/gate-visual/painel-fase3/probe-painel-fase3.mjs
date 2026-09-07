// =============================================================================
// Gate visual da lane PAINEL-FASE-3 (rodada 2026-08-28).
//
// Dois viewports obrigatórios: 1440 (desktop) e 390 (mobile).
//
// Preview no porto 4618.
// Emulador do mock em 127.0.0.1:8280.
// Autologin: ?preview=castelo (Marina Castelo).
// LEELA_CLOCK: 2026-03-15T12:00:00-03:00
//
// Capturas desta fase:
//   A) Inscritos — TerciarioNav modo ÂNCORA (V2708-23)
//   B) Visão geral do evento — bento 2×2 do credenciamento (V2708-24)
//
// Usage (da raiz do repositório):
//   node .nirvana/gate-visual/painel-fase3/probe-painel-fase3.mjs \
//        .nirvana/gate-visual/painel-fase3
// =============================================================================

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? '.nirvana/gate-visual/painel-fase3';
const B = 'http://localhost:4618';
const EVENTO = 'meia-floripa-2026';
const PREVIEW = '?preview=castelo';

mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const browser = await chromium.launch();

async function abrir(url, vp) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(9000);
  return page;
}

async function foto(page, nome) {
  await page.screenshot({ path: `${OUT}/${nome}.png`, fullPage: false });
  console.log(`  → ${nome}.png`);
}

// ===========================================================================
// A · Inscritos — TerciarioNav modo ÂNCORA (V2708-23)
//
// Antes: Tabs horizontal (DS) com 4 abas
// Depois: TerciarioLayout (25/75) + TerciarioNav coluna vertical (≥lg)
//         com 4 itens âncora: Geral, Pagamento, Comunicação, Histórico
// ===========================================================================
console.log('A · Inscritos do evento (TerciarioNav âncora)');
{
  const d = await abrir(`${B}/eventos/${EVENTO}/inscritos${PREVIEW}`, DESKTOP);
  await foto(d, 'inscritos-depois-1440');
  await d.close();

  const m = await abrir(`${B}/eventos/${EVENTO}/inscritos${PREVIEW}`, MOBILE);
  await foto(m, 'inscritos-depois-390');
  await m.close();
}

// ===========================================================================
// B · Visão geral do evento — bento grid 2×2 (V2708-24)
//
// Antes: 4 cards em flex-col (coluna única)
// Depois: MetricGrid columns=2 (xs:grid-cols-2) — 2×2 no desktop, 1 col em 390
// ===========================================================================
console.log('B · Visão geral — bento 2x2');
{
  const d = await abrir(`${B}/eventos/${EVENTO}${PREVIEW}`, DESKTOP);
  // Rola para o painel operacional (abaixo do fold)
  await d.evaluate(() => {
    const el = document.querySelector('[aria-label="Credenciamento ao vivo"]');
    el?.scrollIntoView();
  });
  await d.waitForTimeout(500);
  await foto(d, 'overview-bento-depois-1440');
  await d.close();

  const m = await abrir(`${B}/eventos/${EVENTO}${PREVIEW}`, MOBILE);
  await m.evaluate(() => {
    const el = document.querySelector('[aria-label="Credenciamento ao vivo"]');
    el?.scrollIntoView();
  });
  await m.waitForTimeout(500);
  await foto(m, 'overview-bento-depois-390');
  await m.close();
}

await browser.close();
console.log('Gate visual PAINEL-FASE-3 concluído.');
