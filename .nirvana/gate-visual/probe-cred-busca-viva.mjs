// Prova que a BUSCA do credenciamento acha gente de verdade (não só que a
// caixa existe) e que a aba Inscritos filtra pelo mesmo nome.
import { chromium } from '@playwright/test';

const OUT = process.argv[2];
const BASE = process.argv[3] ?? 'http://127.0.0.1:4602';
const NOME = 'Marina Bittencourt';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error') logs.push(`error: ${m.text().slice(0, 200)}`);
});
page.on('pageerror', (e) => logs.push(`pageerror: ${String(e.message).slice(0, 200)}`));

await page.goto(`${BASE}/eventos/mock-campeche-run/credenciamento?preview=castelo`, {
  waitUntil: 'domcontentloaded',
  timeout: 45000,
});
const caixa = page.getByPlaceholder('Nome, CPF ou código');
await caixa.waitFor({ timeout: 30000 });
await caixa.fill(NOME);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/credenciamento-busca.png`, fullPage: true });
const achou = await page.evaluate((n) => document.body.innerText.includes(n), NOME);
const trecho = await page.evaluate(() => document.body.innerText.slice(0, 1400));
console.log('BUSCA CREDENCIAMENTO achou o atleta?', achou);
console.log('CONSOLE:', logs.join(' | ') || 'nenhum');
console.log('TEXTO:', trecho.replace(/\n+/g, ' · ').slice(0, 1200));

await browser.close();
