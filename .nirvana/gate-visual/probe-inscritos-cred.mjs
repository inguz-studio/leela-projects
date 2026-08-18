// Gate visual da lane INSCRITOS-READ-FIX: prova por RENDER que a aba
// Inscritos lista gente de verdade e que o Credenciamento tem busca viva.
// Molde: .nirvana/gate-visual/probe-cred.mjs
import { chromium } from '@playwright/test';

const OUT = process.argv[2];
const BASE = process.argv[3] ?? 'http://127.0.0.1:4602';
const ROTAS = [
  ['inscritos', '/eventos/mock-campeche-run/inscritos?preview=castelo'],
  ['credenciamento', '/eventos/mock-campeche-run/credenciamento?preview=castelo'],
];

const browser = await chromium.launch();
for (const [nome, rota] of ROTAS) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text().slice(0, 200)}`);
  });
  page.on('pageerror', (e) => logs.push(`pageerror: ${String(e.message).slice(0, 200)}`));
  await page.goto(BASE + rota, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(20000);
  await page.screenshot({ path: `${OUT}/${nome}-20s.png`, fullPage: true });
  const texto = await page.evaluate(() => document.body.innerText.slice(0, 1200));
  const linhas = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
  const buscas = await page.evaluate(() =>
    [...document.querySelectorAll('input')].map((i) => i.getAttribute('placeholder') ?? '(sem placeholder)')
  );
  console.log(`\n===== ${nome} =====`);
  console.log('CONSOLE:', logs.slice(0, 12).join(' | ') || 'nenhum');
  console.log('LINHAS DE TABELA:', linhas);
  console.log('INPUTS:', JSON.stringify(buscas));
  console.log('TEXTO:', texto.replace(/\n+/g, ' · ').slice(0, 900));
  await page.close();
}
await browser.close();
