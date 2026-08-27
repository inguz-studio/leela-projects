// =============================================================================
// Gate visual da lane TERCIARIO-E-NAV (rodada 2026-08-27, vetos do dono).
//
// Dois viewports obrigatórios: 1440 (desktop) e 390 (o iPhone do dono). Um
// terceiro, 1024, entra só para o V2708-05: é a largura em que a barra do
// evento começa a rolar, e defeito de barra apertada não aparece onde sobra
// espaço.
//
// Preview no porto 4612.
//
// Os "antes" são reconstruídos no MESMO build — a barra por injeção dos tokens
// antigos, a rolagem da sub-nav por `scrollLeft = 0` (que é literalmente o que o
// produto fazia: o `SubNav` nunca rolou a barra). Comparar com screenshot de
// outro commit compararia também tudo o que mudou no meio.
//
// As medidas saem de `getBoundingClientRect` no navegador de verdade, não de
// estimativa sobre a imagem: jsdom não tem motor de layout, e é por isso que
// estes dois defeitos atravessaram as suítes unitárias.
// =============================================================================

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? '.';
const B = 'http://127.0.0.1:4612';
const EVENTO = 'meia-floripa-2026';

mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
/** A largura em que a barra do evento passa a rolar — onde o V2708-05 mora. */
const APERTADO = { width: 1024, height: 900 };

/** Os valores da barra ANTES do V2708-04 — para a foto do "antes". */
const BARRA_ANTIGA = `:root:root {
  --bottomnav-height: 58px;
  --bottomnav-margin: 12px;
  --bottomnav-px: 6px;
  --bottomnav-item-gap: 3px;
  --bottomnav-icon-size: 22px;
  --bottomnav-space: calc(58px + 12px * 2 + var(--bottomnav-safe-b));
}`;

const browser = await chromium.launch();

async function abrir(url, vp) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(9000);
  return page;
}

async function tirar({ url, vp, arquivo, full = false, css }) {
  const page = await abrir(url, vp);
  if (css) await page.addStyleTag({ content: css });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${arquivo}`, fullPage: full });
  await page.close();
  console.log('ok', arquivo);
}

/** Clica numa aba da barra do evento pelo rótulo. */
const irParaAba = (page, rotulo) =>
  page.evaluate((alvo) => {
    const nav = document.querySelector('nav[aria-label="Seções do evento"]');
    [...(nav?.querySelectorAll('a') ?? [])].find((a) => a.textContent?.includes(alvo))?.click();
  }, rotulo);

/** Abre/fecha o rail (o menu lateral). */
const alternarRail = (page) =>
  page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => {
      const rot = `${b.getAttribute('aria-label') ?? ''} ${b.title ?? ''}`.toLowerCase();
      return rot.includes('menu') || rot.includes('expandir') || rot.includes('recolher');
    });
    btn?.click();
  });

// ---------------------------------------------------------------------------
// V2708-03 · o terciário padronizado em Configurações do evento
// ---------------------------------------------------------------------------
await tirar({
  url: `${B}/eventos/${EVENTO}/configuracoes?preview=castelo`,
  vp: DESKTOP,
  arquivo: 'terciario-eventos-config-1440.png',
  full: true,
});
await tirar({
  url: `${B}/eventos/${EVENTO}/configuracoes?preview=castelo`,
  vp: MOBILE,
  arquivo: 'terciario-eventos-config-390.png',
});

// ---------------------------------------------------------------------------
// V2708-11 · a página de vendas DENTRO do terciário de Configurações
// ---------------------------------------------------------------------------
await tirar({
  url: `${B}/eventos/${EVENTO}/configuracoes/pagina-vendas?preview=castelo`,
  vp: DESKTOP,
  arquivo: 'vendas-no-terciario-1440.png',
  full: true,
});
await tirar({
  url: `${B}/eventos/${EVENTO}/configuracoes/pagina-vendas?preview=castelo`,
  vp: MOBILE,
  arquivo: 'vendas-no-terciario-390.png',
});

// O endereço ANTIGO: prova de que o redirect entrega a tela, não um 404.
{
  const page = await abrir(`${B}/eventos/${EVENTO}/pagina-vendas?preview=castelo`, DESKTOP);
  console.log('REDIRECT · endereço final:', page.url());
  await page.screenshot({ path: `${OUT}/vendas-redirect-do-endereco-antigo-1440.png` });
  await page.close();
}

// A barra do evento perdeu "Página de vendas" e ficou com nove abas.
await tirar({
  url: `${B}/eventos/${EVENTO}?preview=castelo`,
  vp: DESKTOP,
  arquivo: 'subnav-evento-nove-abas-1440.png',
});

// ---------------------------------------------------------------------------
// V2708-03 · o molde de origem (Clubs) rodando na peça publicada
// ---------------------------------------------------------------------------
{
  // A lista de clubs entra por BOTÃO ("Acessar painel"), não por âncora, então
  // o slug do seed se descobre navegando — não lendo href.
  const page = await abrir(`${B}/clubes?preview=corrida`, DESKTOP);
  const botao = page.getByRole('button', { name: 'Acessar painel' }).first();
  let href = null;
  if ((await botao.count()) > 0) {
    await botao.click();
    await page.waitForTimeout(6000);
    href = new URL(page.url()).pathname;
  }
  await page.close();
  if (href && href !== '/clubes') {
    console.log('club do seed:', href);
    await tirar({
      url: `${B}${href}/configuracoes?preview=corrida`,
      vp: DESKTOP,
      arquivo: 'terciario-clubs-config-1440.png',
      full: true,
    });
    await tirar({
      url: `${B}${href}/configuracoes?preview=corrida`,
      vp: MOBILE,
      arquivo: 'terciario-clubs-config-390.png',
    });
  } else {
    console.log('!! nenhum club encontrado no seed — telas de Clubs puladas');
  }
}

// ---------------------------------------------------------------------------
// V2708-04 · a barra inferior, antes e depois
// ---------------------------------------------------------------------------
await tirar({
  url: `${B}/?preview=castelo`,
  vp: MOBILE,
  arquivo: 'barra-mobile-ANTES-390.png',
  css: BARRA_ANTIGA,
});
await tirar({
  url: `${B}/?preview=castelo`,
  vp: MOBILE,
  arquivo: 'barra-mobile-DEPOIS-390.png',
});

// A medida, lida do DOM em vez de estimada na imagem.
{
  const page = await abrir(`${B}/?preview=castelo`, MOBILE);
  const medir = () =>
    page.evaluate(() => {
      const pilula = document.querySelector('[data-bottomnav] > div');
      const item = pilula?.querySelector('a, button');
      const r = pilula?.getBoundingClientRect();
      const ri = item?.getBoundingClientRect();
      const cs = getComputedStyle(document.documentElement);
      return {
        alturaDaPilula: r ? Math.round(r.height) : null,
        alvoDeToque: ri ? Math.round(ri.height) : null,
        espacoReservado: cs.getPropertyValue('--bottomnav-space').trim(),
        alturaToken: cs.getPropertyValue('--bottomnav-height').trim(),
        margem: cs.getPropertyValue('--bottomnav-margin').trim(),
      };
    });
  console.log('BARRA DEPOIS (390):', JSON.stringify(await medir()));
  await page.addStyleTag({ content: BARRA_ANTIGA });
  await page.waitForTimeout(800);
  console.log('BARRA ANTES  (390):', JSON.stringify(await medir()));
  await page.close();
}

// ---------------------------------------------------------------------------
// V2708-05 · a aba ativa some da barra quando o menu troca
//
// A régua é `abaEscondida`: quantos px da aba ATIVA ficam fora da área visível
// da barra. Zero é a aba inteira à vista.
//
// `desalinhoDoIndicador` fica na sonda de propósito, mesmo sendo sempre ~0: é a
// prova de que a hipótese inicial da lane (sublinhado com medida velha) NÃO era
// a causa — e a medição que impede alguém de "consertar" isso de novo.
// ---------------------------------------------------------------------------
const sondaDaBarra = (page) =>
  page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Seções do evento"]');
    const ativo = nav?.querySelector('[aria-current="page"]');
    const ind = nav?.querySelector('span[class*="absolute"]');
    const n = nav?.getBoundingClientRect();
    const a = ativo?.getBoundingClientRect();
    const i = ind?.getBoundingClientRect();
    if (!n || !a) return null;
    return {
      abaEscondida: Math.round(
        Math.max(0, a.x + a.width - (n.x + n.width)) + Math.max(0, n.x - a.x),
      ),
      desalinhoDoIndicador: i
        ? Math.round(Math.abs(a.x - i.x) + Math.abs(a.width - i.width))
        : null,
      barraRolaX: nav.scrollWidth - nav.clientWidth,
      scrollLeft: Math.round(nav.scrollLeft),
    };
  });

/**
 * `zerar: true` devolve a barra ao comportamento anterior à lane — o `SubNav`
 * nunca mexeu em `scrollLeft`, então zerá-lo É o "antes", não uma imitação dele.
 */
async function medirV270805({ zerar, rotulo, prefixo }) {
  const page = await abrir(`${B}/eventos/${EVENTO}?preview=castelo`, APERTADO);
  const zerarScroll = () =>
    page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Seções do evento"]');
      if (nav) nav.scrollLeft = 0;
    });

  await irParaAba(page, 'Configurações');
  await page.waitForTimeout(3500);
  if (zerar) {
    await zerarScroll();
    await page.waitForTimeout(300);
  }
  const fechado = await sondaDaBarra(page);
  console.log(`[${rotulo}] 1024 · rail fechado:`, JSON.stringify(fechado));
  await page.screenshot({ path: `${OUT}/${prefixo}-1-rail-fechado-1024.png` });

  await alternarRail(page);
  await page.waitForTimeout(1600);
  if (zerar) {
    await zerarScroll();
    await page.waitForTimeout(300);
  }
  const aberto = await sondaDaBarra(page);
  console.log(`[${rotulo}] 1024 · rail ABERTO :`, JSON.stringify(aberto));
  await page.screenshot({ path: `${OUT}/${prefixo}-2-rail-aberto-1024.png` });
  await page.close();
  return { fechado, aberto };
}

const v5antes = await medirV270805({
  zerar: true,
  rotulo: 'V2708-05 ANTES ',
  prefixo: 'troca-de-menu-ANTES',
});
const v5depois = await medirV270805({
  zerar: false,
  rotulo: 'V2708-05 DEPOIS',
  prefixo: 'troca-de-menu-DEPOIS',
});

console.log(
  'V2708-05 · px da aba ativa fora da barra —',
  `rail fechado: ${v5antes.fechado?.abaEscondida} → ${v5depois.fechado?.abaEscondida}`,
  `· rail aberto: ${v5antes.aberto?.abaEscondida} → ${v5depois.aberto?.abaEscondida}`,
);

await browser.close();
console.log('gate visual completo');
