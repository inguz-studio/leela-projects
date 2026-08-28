// =============================================================================
// Gate visual da lane TERCIARIO-FASE-2 (rodada 2026-08-28, fase 2 do terciário).
//
// Dois viewports obrigatórios: 1440 (desktop) e 390 (mobile).
//
// Preview no porto 4615.
//
// O gate deve ser executado com o usuário já autenticado no perfil do
// Playwright — copie o userData de um perfil Chrome logado ou autentique
// manualmente antes de tirar as capturas.
//
// Migrações desta fase:
//   A) Kits do evento    — modo ROTA (AreaSubNav → TerciarioNav)
//   B) Financeiro do evt — modo ROTA (AreaSubNav → TerciarioNav)
//   C) Conta do usuário  — modo ÂNCORA (sem menu → TerciarioNav)
//
// Usage:
//   pnpm --filter @leela/painel vite preview --port 4615 --strictPort
//   node probe-terciario-fase2.mjs .nirvana/gate-visual/terciario-fase2
// =============================================================================

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? '.';
const B = 'http://127.0.0.1:4615';
const EVENTO = 'meia-floripa-2026';

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
// A · Kits do evento — ROTA (AreaSubNav → TerciarioNav)
//
// Antes: barra horizontal (AreaSubNav) em cima do conteúdo
// Depois: coluna sticky 25% à esq (≥lg), faixa horizontal (<lg)
// ===========================================================================
console.log('A · Kits do evento');
{
  const d = await abrir(`${B}/eventos/${EVENTO}/kits`, DESKTOP);
  await foto(d, 'kits-depois-1440');
  await d.close();

  const m = await abrir(`${B}/eventos/${EVENTO}/kits`, MOBILE);
  await foto(m, 'kits-depois-390');
  await m.close();
}

// ===========================================================================
// B · Financeiro do evento — ROTA (AreaSubNav → TerciarioNav)
//
// Antes: barra horizontal (AreaSubNav) em cima do conteúdo
// Depois: coluna sticky 25% à esq (≥lg), faixa horizontal (<lg)
// ===========================================================================
console.log('B · Financeiro do evento');
{
  const d = await abrir(`${B}/eventos/${EVENTO}/financeiro`, DESKTOP);
  await foto(d, 'financeiro-depois-1440');
  await d.close();

  const m = await abrir(`${B}/eventos/${EVENTO}/financeiro`, MOBILE);
  await foto(m, 'financeiro-depois-390');
  await m.close();
}

// ===========================================================================
// C · Configurações da conta — ÂNCORA (sem menu → TerciarioNav)
//
// Antes: coluna única, 6 seções empilhadas sem qualquer navegação de seções
// Depois: coluna sticky 25% à esq com 6 itens de âncora + scroll spy
// ===========================================================================
console.log('C · Configurações da conta');
{
  const d = await abrir(`${B}/conta`, DESKTOP);
  await foto(d, 'conta-depois-1440');
  // Scroll até Trocar senha para provar que o spy funciona
  await d.evaluate(() =>
    document.getElementById('conta-trocar-senha')?.scrollIntoView(),
  );
  await d.waitForTimeout(500);
  await foto(d, 'conta-depois-trocar-senha-1440');
  await d.close();

  const m = await abrir(`${B}/conta`, MOBILE);
  await foto(m, 'conta-depois-390');
  await m.close();
}

await browser.close();
console.log('Gate visual concluído.');
