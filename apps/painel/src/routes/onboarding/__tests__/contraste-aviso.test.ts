// =============================================================================
// O LIMITE DO CARTÃO DO AVISO, MEDIDO (VITRINE-CONTRASTE-1 · corte de 09/08).
//
// O QUE A REVIEW MEDIU. No tema brasa — que é o que roda hoje, porque
// `apps/painel/index.html` não declara `data-theme` — o cartão do aviso dá
// **1,13:1** contra o próprio fundo velado, e a borda `--border-subtle` não
// resgata: **1,31:1**. O piso da WCAG 1.4.11 para o limite de um componente é
// 3:1. Quem tem baixa visão vê o texto do aviso flutuando, sem enxergar onde o
// cartão começa e termina. Duas lanes independentes chegaram ao mesmo par.
//
// A DECISÃO, e o que ela não é. `--border-subtle` vira `--border-strong`. Não
// se toca em `--surface-raised`: clarear a superfície resolveria em todo modal
// do painel de uma vez e mexe na paleta — é a condição de reabertura do item, e
// é do dono.
//
// O QUE ESTE ARQUIVO PERGUNTA, nos DOIS temas:
//
//   1. a classe da borda COMPILA? (a família do DEF-C: classe certa, zero CSS)
//   2. a borda se enxerga SOBRE o cartão? — senão ela não é limite, é textura
//   3. o limite do cartão se separa do VÉU? — por borda ou pela própria
//      superfície, o que for; é a pergunta da 1.4.11, e ela não exige que a
//      resposta venha da borda
//
// Por que a 3 é assim, e não "a borda contra o véu ≥ 3:1": no wine o cartão é
// branco sobre um velado rgb(101,100,99) e já dá **5,90:1** sozinho — o limite
// está identificado antes de qualquer borda. Exigir da borda um número que a
// superfície já entrega reprovaria um tema que passa, e a régua deixaria de
// medir o que a norma pede.
//
// A FALSIFICAÇÃO É O TOKEN ANTIGO. O último caso roda a mesma medição com
// `--border-subtle` e exige que ela REPROVE no brasa. Um gate que não falha no
// defeito que veio prevenir é decoração.
//
// MEDIDO TAMBÉM NO `dist`, com `vite build` (09/08, `dist/assets/index-
// 3PlkfKJK.css`), porque é lá que os tokens chegam resolvidos:
//
//   .border-\[var\(--border-strong\)\]{border-color:var(--border-strong)}  ✅
//   [brasa] card #161616 · velado rgb(5,5,5) · borda #737373
//           borda vs cartão 3,82:1 · borda vs velado 4,30:1
//           (antes) borda subtle vs velado 1,31:1 · cartão vs velado 1,13:1
//   [wine]  card #FFFFFF · velado rgb(101,100,99) · borda #8A837B
//           borda vs cartão 3,74:1 · cartão vs velado 5,90:1
//
// ATUALIZAÇÃO (MODAL-LOTE · 17/08): `--modal-overlay-bg` — o mesmo token que
// COMPÕE o véu desta cena — subiu de alfa 0,6 para 0,82 (pedido do dono sobre
// o overlay do Modal/Drawer; este véu de onboarding reusa o TOKEN, não é
// consumidor de Modal). O véu ficou mais escuro nos dois temas (brasa
// rgb(5,5,5)→rgb(2,2,2); wine rgb(101,100,99)→rgb(46,45,44)) e os números
// abaixo se moveram, mas nenhum cruzou o piso na direção errada — o wine
// folga MAIS (5,90:1 → 13,74:1), porque um véu mais escuro separa melhor um
// cartão branco. Remedidos direto dos temas do DS:
//   [brasa] velado rgb(2,2,2) · borda vs velado 4,38:1 · (antes, subtle) 1,34:1
//           · cartão vs velado 1,15:1 · borda vs cartão 3,82:1 (sem mudança,
//           não depende do véu)
//   [wine]  velado rgb(46,45,44) · cartão vs velado 13,74:1 · borda vs cartão
//           3,74:1 (sem mudança)
//
// Aqui as mesmas contas rodam contra os arquivos de tema do DS, que é o texto
// que o bundle embarca — sem pagar um build a cada `vitest run`.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import leelaPreset from '@leela/design-system/tailwind-preset';
import type { Config } from 'tailwindcss';
import { CLASSE_BORDA_AVISO } from '../OverlayConvite';

const RAIZ_DS = resolve(__dirname, '../../../../../../packages/design-system');

/** O piso da WCAG 2.2 · 1.4.11 (Non-text Contrast) para limite de componente. */
const PISO_LIMITE = 3;

// ---------------------------------------------------------------------------
// Cor
// ---------------------------------------------------------------------------

type RGB = readonly [number, number, number];

/** `#RRGGBB` → canais. @pure */
function doHex(hex: string): RGB {
  const limpo = hex.trim().replace('#', '');
  return [0, 2, 4].map((i) => Number.parseInt(limpo.slice(i, i + 2), 16)) as unknown as RGB;
}

/** @pure */
function canal(valor: number): number {
  const s = valor / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa (WCAG 2.x). @pure */
function luminancia([r, g, b]: RGB): number {
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Razão de contraste entre duas cores opacas. @pure */
function razao(a: RGB, b: RGB): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (escuro + 0.05);
}

/** `rgba(r,g,b,a)` composto sobre um fundo opaco. @pure */
function compor(veu: string, fundo: RGB): RGB {
  const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/.exec(veu);
  expect(m, `véu sem alfa legível: ${veu}`).not.toBeNull();
  const [r, g, b, alfa] = (m as RegExpExecArray).slice(1).map(Number) as [
    number,
    number,
    number,
    number,
  ];
  return [r, g, b].map((c, i) => Math.round(c * alfa + fundo[i]! * (1 - alfa))) as unknown as RGB;
}

// ---------------------------------------------------------------------------
// Tokens, resolvidos
// ---------------------------------------------------------------------------

/** Todos os pares `--token: valor` de um arquivo de tema. @pure */
function tokensDoTema(arquivo: string): Map<string, string> {
  const css = readFileSync(resolve(RAIZ_DS, arquivo), 'utf8');
  const mapa = new Map<string, string>();
  for (const m of css.matchAll(/(--[a-z0-9-]+):\s*([^;}]+)/g)) mapa.set(m[1]!, m[2]!.trim());
  return mapa;
}

/**
 * Segue a cadeia `var(--x)` até o literal. É por isso que a medição é do token
 * RESOLVIDO e não do valor de origem: `--border-strong` é `var(--neutral-500)`,
 * e é o `#737373` do outro lado que a pessoa enxerga.
 * @pure
 */
function resolvido(mapa: Map<string, string>, nome: string, salto = 0): string {
  const bruto = mapa.get(nome);
  expect(bruto, `token ${nome} não existe no tema`).toBeDefined();
  expect(salto, `cadeia circular em ${nome}`).toBeLessThan(10);
  const referencia = /^var\((--[a-z0-9-]+)\)$/.exec(bruto ?? '');
  return referencia === null ? (bruto ?? '') : resolvido(mapa, referencia[1]!, salto + 1);
}

interface Tema {
  nome: string;
  arquivo: string;
}

/**
 * Os dois temas em arquivo próprio. `themes/index.css` embarca os dois blocos e
 * é o que o painel importa; os arquivos separados carregam os mesmos valores e
 * dizem QUAL tema falhou quando a conta reprova.
 */
const TEMAS: readonly Tema[] = [
  { nome: 'brasa (o que roda hoje no painel)', arquivo: 'themes/brasa.css' },
  { nome: 'wine', arquivo: 'themes/wine.css' },
];

/** As três cores da cena, já resolvidas e compostas. */
function cenaDoAviso(arquivo: string, tokenDaBorda: string) {
  const mapa = tokensDoTema(arquivo);
  const cartao = doHex(resolvido(mapa, '--surface-raised'));
  const borda = doHex(resolvido(mapa, tokenDaBorda));
  const velado = compor(resolvido(mapa, '--modal-overlay-bg'), doHex(resolvido(mapa, '--surface-base')));
  return {
    bordaSobreCartao: razao(borda, cartao),
    bordaSobreVelado: razao(borda, velado),
    cartaoSobreVelado: razao(cartao, velado),
  };
}

// ---------------------------------------------------------------------------
// Casos
// ---------------------------------------------------------------------------

describe('borda do aviso · a classe existe no CSS que o build produz', () => {
  it('`border border-[var(--border-strong)]` compila em largura e cor', async () => {
    // A classe é LIDA do componente, nunca escrita aqui: trocar o token por um
    // mais fraco derruba os casos de contraste abaixo em vez de passar calado.
    const config = {
      presets: [leelaPreset as Config],
      content: [{ raw: `<div class="${CLASSE_BORDA_AVISO}"></div>`, extension: 'html' }],
      corePlugins: { preflight: false },
    } as Config;
    const { css } = await postcss([tailwindcss(config)]).process('@tailwind utilities;', {
      from: undefined,
    });
    expect(css).toMatch(/border-color:\s*var\(--border-strong\)/);
    expect(css).toMatch(/border-width:\s*1px/);
  });

  it('a borda do aviso aponta para `--border-strong`, não para o token antigo', () => {
    expect(CLASSE_BORDA_AVISO).toContain('var(--border-strong)');
    expect(CLASSE_BORDA_AVISO).not.toContain('var(--border-subtle)');
  });
});

describe('borda do aviso · o limite do cartão passa no piso de 3:1 (1.4.11)', () => {
  it.each(TEMAS)('$nome: a borda se enxerga SOBRE o cartão', ({ arquivo }) => {
    const { bordaSobreCartao } = cenaDoAviso(arquivo, '--border-strong');
    expect(bordaSobreCartao).toBeGreaterThanOrEqual(PISO_LIMITE);
  });

  it.each(TEMAS)('$nome: o limite do cartão se separa do véu', ({ arquivo }) => {
    // Por borda ou pela própria superfície — o que a pessoa enxerga é o maior
    // dos dois. No brasa quem resgata é a borda (4,30:1, com o cartão em
    // 1,13:1); no wine o cartão já se separa sozinho (5,90:1).
    const { bordaSobreVelado, cartaoSobreVelado } = cenaDoAviso(arquivo, '--border-strong');
    expect(Math.max(bordaSobreVelado, cartaoSobreVelado)).toBeGreaterThanOrEqual(PISO_LIMITE);
  });

  it('os números do brasa são os que a decisão carrega', () => {
    // O tema que roda hoje, com os números escritos no registro do maestro —
    // para que uma mudança de paleta que ainda passe no piso apareça aqui em
    // vez de escorregar.
    const cena = cenaDoAviso('themes/brasa.css', '--border-strong');
    expect(cena.bordaSobreCartao).toBeCloseTo(3.82, 2);
    // MODAL-LOTE (17/08): era 4,3 com --modal-overlay-bg a 0,6 de alfa; o véu
    // ficou mais escuro (alfa 0,82) e a razão subiu — remedido, ver o cabeçalho.
    expect(cena.bordaSobreVelado).toBeCloseTo(4.38, 2);
  });
});

describe('borda do aviso · FALSIFICAÇÃO: o token antigo reprova', () => {
  it('`--border-subtle` no brasa não alcança o piso — era o defeito', () => {
    // A mesma medição, com o que estava lá. Se este caso passar a aprovar, é a
    // paleta que mudou, e os casos acima precisam ser relidos antes de crer
    // neles.
    const { bordaSobreVelado, cartaoSobreVelado } = cenaDoAviso('themes/brasa.css', '--border-subtle');
    // MODAL-LOTE (17/08): eram 1,31 e 1,13 com o véu a 0,6 de alfa — remedido
    // junto com o caso acima (o token do véu é o mesmo). Continua reprovando
    // bem abaixo do piso, que é o que este caso de falsificação exige.
    expect(bordaSobreVelado).toBeCloseTo(1.34, 2);
    expect(cartaoSobreVelado).toBeCloseTo(1.15, 2);
    expect(Math.max(bordaSobreVelado, cartaoSobreVelado)).toBeLessThan(PISO_LIMITE);
  });
});
