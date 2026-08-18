// Gate visual DEPLOY-J4 — páginas PÚBLICAS de PRODUÇÃO, pós-deploy.
// Telas autenticadas ficam com o dono; aqui só o que a internet vê.
import { chromium } from '@playwright/test';

const OUT = process.argv[2];
const LANDING = 'https://leela-landing.web.app';
const PAINEL = 'https://leela-hub.web.app';

const shots = [
  { url: `${LANDING}/`, vp: { width: 1440, height: 900 }, f: 'landing-home-desktop.png', full: true },
  { url: `${LANDING}/`, vp: { width: 375, height: 812 }, f: 'landing-home-375.png', full: false },
  { url: `${LANDING}/teste-taxa-repassada`, vp: { width: 1440, height: 900 }, f: 'landing-evento-desktop.png', full: true },
  { url: `${LANDING}/teste-taxa-repassada`, vp: { width: 375, height: 812 }, f: 'landing-evento-375.png', full: false },
  { url: `${LANDING}/teste-taxa-repassada/inscricao`, vp: { width: 1440, height: 900 }, f: 'landing-inscricao-desktop.png', full: true },
  { url: `${PAINEL}/entrar`, vp: { width: 1440, height: 900 }, f: 'painel-entrar-desktop.png', full: false },
  { url: `${PAINEL}/entrar`, vp: { width: 375, height: 812 }, f: 'painel-entrar-375.png', full: false },
];

const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage({ viewport: s.vp });
  const erros = [];
  page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text().slice(0, 200)); });
  const resp = await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: `${OUT}/${s.f}`, fullPage: s.full });
  const titulo = await page.title();
  console.log(JSON.stringify({ f: s.f, http: resp?.status(), titulo, errosConsole: erros.length, primeiroErro: erros[0] ?? null }));
  await page.close();
}
await browser.close();
