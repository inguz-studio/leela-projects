// =============================================================================
// apps/landing/scripts/verify-brand-fonts.mjs
//
// Guarda EXECUTÁVEL de consistência de marca — TIPOGRAFIA (LEELA-R12-FIX2).
// Nos moldes do teste de AA da L-006: prova determinística que impede regressão
// silenciosa do problema em que a LP/checkout caíam no sans-serif do sistema
// porque a webfont Exo 2 nunca carregava (o `@import url(google)` em globals.css
// é derrubado pelo pipeline de CSS do Next).
//
// O ESLint (leela-tokens-plugin) já barra cor/spacing/radius hardcoded; ele NÃO
// cobre font-family nem a CARGA da fonte — esta guarda fecha esse furo.
//
// Duas camadas:
//   (A) ESTÁTICA (sem servidor, CI-safe):
//       - app/layout.tsx CARREGA Exo 2 via <link> (a família dos tokens resolve);
//       - nenhum font-family LITERAL (fora de var(--font-*)) no código da landing.
//   (B) VIVA (se BRAND_VERIFY_URL setada): a font-family computada em body/h1 é
//       "Exo 2" E a FontFace "Exo 2" está de fato loaded (não só nomeada).
//
// Uso:
//   node scripts/verify-brand-fonts.mjs                 # só estática
//   BRAND_VERIFY_URL=http://localhost:3200/meia-floripa-2026 node scripts/verify-brand-fonts.mjs
// =============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = (msg) => { console.error(`  ✗ ${msg}`); failures += 1; };
const pass = (msg) => console.log(`  ✓ ${msg}`);
let failures = 0;

// ── (A1) layout carrega Exo 2 ────────────────────────────────────────────────
const layout = readFileSync(join(ROOT, 'app/layout.tsx'), 'utf8');
if (/fonts\.googleapis\.com\/css2\?family=Exo\+2/.test(layout)) {
  pass('app/layout.tsx carrega a webfont Exo 2 (<link> no <head>)');
} else {
  fail('app/layout.tsx NÃO carrega Exo 2 — a LP cairia no sans-serif do sistema');
}

// ── (A2) nenhum font-family LITERAL fora de var(--font-*) ─────────────────────
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) { if (e !== 'node_modules' && e !== '.next') out.push(...walk(p)); }
    else if (/\.(tsx?|css)$/.test(e)) out.push(p);
  }
  return out;
}
const files = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'lib'))];
// Extrai o VALOR e testa se começa por var(...) — evita o backtracking de \s*.
const cssLiteral = (line) => {
  const m = line.match(/font-family\s*:\s*([^;]+)/i);
  return m ? !/^var\(/.test(m[1].trim()) : false;
};
const tsxLiteral = (line) => {
  const m = line.match(/fontFamily\s*:\s*([^,}]+)/);
  return m ? !/^['"`]?\s*var\(/.test(m[1].trim()) : false;
};
// arbitrary Tailwind font family literal: font-['Arial'] / font-[Helvetica]
const TW_LITERAL = /\bfont-\[(?![^\]]*var\()[^\]]*\]/;
let offenders = 0;
for (const f of files) {
  const txt = readFileSync(f, 'utf8');
  const rel = f.slice(ROOT.length + 1).replace(/\\/g, '/');
  txt.split('\n').forEach((line, i) => {
    if (rel.endsWith('.css') && cssLiteral(line)) { fail(`${rel}:${i + 1} font-family literal (use var(--font-*))`); offenders += 1; }
    if (/\.tsx?$/.test(rel) && (tsxLiteral(line) || TW_LITERAL.test(line))) { fail(`${rel}:${i + 1} font-family hardcoded (use token/classe do DS)`); offenders += 1; }
  });
}
if (offenders === 0) pass(`nenhum font-family hardcoded em ${files.length} arquivos da landing`);

// ── (B) verificação VIVA opcional ────────────────────────────────────────────
const url = process.env['BRAND_VERIFY_URL'];
if (url) {
  const { chromium } = await import('file:///C:/dev/LEELA/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs');
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let resolved = false;
  for (let i = 0; i < 8; i++) {
    await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    if (!(await p.content()).includes('saiu para correr')) { resolved = true; break; }
    await p.waitForTimeout(4000);
  }
  await p.waitForTimeout(1200);
  const d = await p.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    exoLoaded: [...document.fonts].some((f) => /Exo 2/i.test(f.family) && f.status === 'loaded'),
    fontsN: document.fonts.size,
  }));
  await b.close();
  if (!resolved) fail(`rota não resolveu (flicker do emulator): ${url}`);
  if (/Exo 2/i.test(d.body)) pass(`font-family computada em body é Exo 2 (${d.body})`);
  else fail(`font-family computada NÃO é Exo 2: ${d.body}`);
  if (d.exoLoaded) pass(`FontFace "Exo 2" LOADED (document.fonts=${d.fontsN})`);
  else fail(`Exo 2 declarada mas NÃO carregada (document.fonts=${d.fontsN}) — regressão da webfont`);
}

console.log(failures === 0 ? '\nBRAND FONT CHECK: PASS' : `\nBRAND FONT CHECK: FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
