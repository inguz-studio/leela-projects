// =============================================================================
// Gate visual da landing LEELA — probe Playwright.
// Técnica herdada de `.nirvana/gate-visual/probe-visual.mjs`, com dois
// acréscimos que o "antes" desta rodada mostrou serem necessários:
//
//  1. A landing carrega capa/galeria com `loading="lazy"`, e um `fullPage` cru
//     fotografa buracos onde a imagem ainda não entrou. O probe ROLA a página
//     até o fim (e volta ao topo) antes de disparar — senão "antes" e "depois"
//     diferem por artefato de captura, não por mudança de design.
//
//  2. A revelação por rolagem usa `animation-timeline: view()`, que é
//     RECALCULADA no momento da captura: um `fullPage` fotografaria as dobras
//     de baixo em `opacity: 0`. Por isso a captura de página inteira roda com
//     `prefers-reduced-motion: reduce` — que é uma página REAL (a de quem pediu
//     menos movimento), não uma página falsificada para a foto. Para provar que
//     a revelação existe, um par extra de fotos sai COM movimento, em viewport,
//     no meio da rolagem.
//
// Uso: node probe-gate-visual.mjs <OUT_DIR> <PREFIXO>
// =============================================================================
import { chromium } from '@playwright/test';

const OUT = process.argv[2];
const PREFIX = process.argv[3] ?? '';
const B = process.env.BASE ?? 'http://127.0.0.1:3100';

const rotas = [
  { path: '/', nome: 'home' },
  { path: '/meia-floripa-2026', nome: 'evento-meia-floripa' },
  { path: '/desafio-mtb-costa-lagoa-2026', nome: 'evento-mtb' },
];

const viewports = [
  { nome: 'desktop-1440', vp: { width: 1440, height: 900 } },
  { nome: 'mobile-390', vp: { width: 390, height: 844 } },
];

/** Destrava o lazy-load e espera as imagens do viewport decodificarem. */
async function aquecer(page) {
  await page.evaluate(async () => {
    const passo = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += passo) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  });
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images)
        .filter((i) => !i.complete)
        .map((i) => new Promise((res) => { i.onload = res; i.onerror = res; })),
    ),
  );
  await page.waitForTimeout(800);
}

const browser = await chromium.launch();

// ── Página inteira, sem movimento (a foto que se compara antes/depois) ───────
for (const r of rotas) {
  for (const v of viewports) {
    const page = await browser.newPage({ viewport: v.vp, deviceScaleFactor: 2 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const erros = [];
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text());
    });
    const resp = await page.goto(`${B}${r.path}`, { waitUntil: 'networkidle', timeout: 60000 });
    await aquecer(page);
    const arquivo = `${OUT}/${PREFIX}${r.nome}-${v.nome}.png`;
    await page.screenshot({ path: arquivo, fullPage: true });
    console.log(`ok ${arquivo} · http ${resp?.status()} · console-errors ${erros.length}`);
    if (erros.length > 0) console.log('   ', erros.slice(0, 3).join(' | '));
    await page.close();
  }
}

// ── Prova do movimento: viewport, com motion, no meio da rolagem ─────────────
if (process.env.COM_MOVIMENTO === '1') {
  for (const r of rotas.slice(0, 2)) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`${B}${r.path}`, { waitUntil: 'networkidle', timeout: 60000 });
    await aquecer(page);
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.35, behavior: 'instant' }));
    await page.waitForTimeout(400);
    const arquivo = `${OUT}/${PREFIX}${r.nome}-revelacao-1440.png`;
    await page.screenshot({ path: arquivo });
    console.log(`ok ${arquivo} · (viewport, com movimento)`);
    await page.close();
  }
}

await browser.close();
