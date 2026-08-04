// =============================================================================
// scripts/brand/gerar-logo-email.mjs
//
// Rasteriza o wordmark oficial da Leela (`brand/leela-logo-brasa.svg`) para um
// PNG OPACO servido pela landing e consumido pelo cabeçalho dos e-mails
// (lane IDENTIDADE-EMAIL · trace leela-build-2d6ee98d).
//
// POR QUE ESTE SCRIPT EXISTE, em vez de apontar o e-mail para o SVG que já está
// no ar. Cliente de e-mail não renderiza SVG: Gmail (web, Android, iOS),
// Outlook (todos), Yahoo e AOL descartam a imagem. Apontar o `<img>` do
// cabeçalho para `/leela-logo-brasa.svg` daria uma marca invisível justamente
// na maioria das caixas. E-mail aceita PNG/GIF/JPEG e mais nada.
//
// POR QUE OPACO, sem canal alfa. O Word engine do Outlook 2007-2016 compõe PNG
// com alfa contra branco, não contra o fundo real — um wordmark com fundo
// transparente ganharia uma franja clara em cima do quase-preto da marca. Como
// o fundo do cabeçalho é uma constante conhecida (o token `surface-base` do
// tema `brasa`), a composição é feita AQUI, na geração, e o cliente recebe um
// retângulo chapado que nenhum motor consegue interpretar errado.
//
// POR QUE RASTERIZAR EM NODE PURO. Sem navegador headless e sem dependência
// nova: o `d` do wordmark usa só `M`/`L`/`C`/`Z` absolutos, então achatar as
// cúbicas e preencher por varredura com supersampling é determinístico e
// auditável. Rodar de novo com o mesmo SVG produz byte a byte o mesmo arquivo.
//
// USO: node scripts/brand/gerar-logo-email.mjs
//      (`--check` valida que o PNG versionado bate com o SVG-fonte, sem gravar)
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** SVG-fonte: o wordmark oficial (mesmo asset do header da landing/painel). */
const SVG_FONTE = resolve(RAIZ, 'brand/leela-logo-brasa.svg');

/**
 * Destino: `apps/landing/public/**` é servido na RAIZ do site `leela-landing`
 * (provado por `/leela-logo-brasa.svg` e `/brand/leela-wordmark-cream.svg`
 * respondendo 200 hoje). O e-mail aponta para a landing, não para o painel,
 * porque a landing é o host público estável do produto.
 */
const PNG_DESTINO = resolve(RAIZ, 'apps/landing/public/brand/leela-wordmark-email.png');

// ---------------------------------------------------------------------------
// Cores — token, nunca escolha de momento
// ---------------------------------------------------------------------------

/**
 * Tinta do wordmark. Vem do PRÓPRIO SVG oficial (`fill="#C8E84A"`), lido em
 * tempo de execução: se a marca mudar de cor, o PNG segue junto sem ninguém
 * lembrar de editar este arquivo.
 */
const TINTA_PADRAO = [200, 232, 74];

/**
 * Fundo composto: `--surface-base` do tema `brasa` (= `--neutral-950`,
 * `#0C0C0C`), o MESMO fundo do cabeçalho do e-mail. Fica aqui como constante
 * porque a composição precisa de um número; o contrato com o design system é
 * garantido pelo teste `emailIdentidade.test.ts`, que compara este valor com o
 * token resolvido em `packages/design-system/themes/index.css`.
 */
const FUNDO = [0x0c, 0x0c, 0x0c];

// Geometria: 2x do tamanho de exibição (150x44 no e-mail) — nítido em retina.
const LARGURA = 300;
const ALTURA = 88;
const LARGURA_GLIFO = 260;
const SUPERSAMPLE = 6;

// ---------------------------------------------------------------------------
// Parser de path SVG (só M/L/C/Z absolutos — o que o wordmark usa)
// ---------------------------------------------------------------------------

/** Quebra o atributo `d` em subcaminhos de pontos já achatados. @pure */
function acharSubcaminhos(d, achatarEm) {
  const tokens = d.match(/[MLCZmlcz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const subcaminhos = [];
  let atual = null;
  let cursor = [0, 0];
  let inicio = [0, 0];
  let i = 0;
  const num = () => Number(tokens[i++]);

  while (i < tokens.length) {
    const cmd = tokens[i];
    if (!/^[MLCZmlcz]$/.test(cmd)) {
      throw new Error(`comando de path inesperado perto de "${cmd}"`);
    }
    i++;
    if (cmd === 'Z' || cmd === 'z') {
      if (atual !== null && atual.length > 0) subcaminhos.push(atual);
      atual = null;
      cursor = [...inicio];
      continue;
    }
    if (cmd === 'M' || cmd === 'm') {
      if (atual !== null && atual.length > 0) subcaminhos.push(atual);
      const x = num();
      const y = num();
      cursor = cmd === 'M' ? [x, y] : [cursor[0] + x, cursor[1] + y];
      inicio = [...cursor];
      atual = [[...cursor]];
      // Coordenadas soltas depois de M significam L implícito.
      while (i < tokens.length && !/^[MLCZmlcz]$/.test(tokens[i])) {
        const lx = num();
        const ly = num();
        cursor = cmd === 'M' ? [lx, ly] : [cursor[0] + lx, cursor[1] + ly];
        atual.push([...cursor]);
      }
      continue;
    }
    if (cmd === 'L' || cmd === 'l') {
      do {
        const x = num();
        const y = num();
        cursor = cmd === 'L' ? [x, y] : [cursor[0] + x, cursor[1] + y];
        atual.push([...cursor]);
      } while (i < tokens.length && !/^[MLCZmlcz]$/.test(tokens[i]));
      continue;
    }
    // C/c — cúbica achatada em segmentos de reta.
    do {
      const p0 = cursor;
      const c1 = [num(), num()];
      const c2 = [num(), num()];
      const p3 = [num(), num()];
      const a1 = cmd === 'C' ? c1 : [p0[0] + c1[0], p0[1] + c1[1]];
      const a2 = cmd === 'C' ? c2 : [p0[0] + c2[0], p0[1] + c2[1]];
      const fim = cmd === 'C' ? p3 : [p0[0] + p3[0], p0[1] + p3[1]];
      for (let s = 1; s <= achatarEm; s++) {
        const t = s / achatarEm;
        const u = 1 - t;
        atual.push([
          u * u * u * p0[0] + 3 * u * u * t * a1[0] + 3 * u * t * t * a2[0] + t * t * t * fim[0],
          u * u * u * p0[1] + 3 * u * u * t * a1[1] + 3 * u * t * t * a2[1] + t * t * t * fim[1],
        ]);
      }
      cursor = fim;
    } while (i < tokens.length && !/^[MLCZmlcz]$/.test(tokens[i]));
  }
  if (atual !== null && atual.length > 0) subcaminhos.push(atual);
  return subcaminhos;
}

// ---------------------------------------------------------------------------
// Rasterizador por varredura (regra non-zero, supersampling NxN)
// ---------------------------------------------------------------------------

/**
 * Cobertura por pixel (0..1) dos subcaminhos, em um canvas LARGURA x ALTURA.
 * Amostra SUPERSAMPLE^2 pontos por pixel e conta os que caem dentro.
 */
function rasterizar(subcaminhos, largura, altura, ss) {
  const arestas = [];
  for (const pts of subcaminhos) {
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k];
      const b = pts[(k + 1) % pts.length];
      if (a[1] !== b[1]) arestas.push([a[0], a[1], b[0], b[1]]);
    }
  }
  const cobertura = new Float32Array(largura * altura);
  const porAmostra = 1 / (ss * ss);
  const cruz = [];

  for (let sy = 0; sy < altura * ss; sy++) {
    const y = (sy + 0.5) / ss;
    cruz.length = 0;
    for (const [x0, y0, x1, y1] of arestas) {
      if (y0 <= y ? y1 > y : y1 <= y) {
        const t = (y - y0) / (y1 - y0);
        cruz.push([x0 + t * (x1 - x0), y1 > y0 ? 1 : -1]);
      }
    }
    if (cruz.length === 0) continue;
    cruz.sort((a, b) => a[0] - b[0]);

    const linha = Math.floor(sy / ss) * largura;
    let vento = 0;
    for (let c = 0; c < cruz.length - 1; c++) {
      vento += cruz[c][1];
      if (vento === 0) continue;
      const de = cruz[c][0];
      const ate = cruz[c + 1][0];
      const sxDe = Math.max(0, Math.ceil(de * ss - 0.5));
      const sxAte = Math.min(largura * ss - 1, Math.floor(ate * ss - 0.5));
      for (let sx = sxDe; sx <= sxAte; sx++) {
        cobertura[linha + Math.floor(sx / ss)] += porAmostra;
      }
    }
  }
  for (let i = 0; i < cobertura.length; i++) {
    if (cobertura[i] > 1) cobertura[i] = 1;
  }
  return cobertura;
}

// ---------------------------------------------------------------------------
// Codificador PNG (truecolor 8 bits, sem alfa, filtro 0)
// ---------------------------------------------------------------------------

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dados) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([len, corpo, crc]);
}

function codificarPng(rgb, largura, altura) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // profundidade
  ihdr[9] = 2; // truecolor RGB (sem alfa)
  const bruto = Buffer.alloc(altura * (1 + largura * 3));
  for (let y = 0; y < altura; y++) {
    bruto[y * (1 + largura * 3)] = 0; // filtro None — o deflate resolve
    rgb.copy(bruto, y * (1 + largura * 3) + 1, y * largura * 3, (y + 1) * largura * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(bruto, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

export function gerarPngDoWordmark() {
  const svg = readFileSync(SVG_FONTE, 'utf8');
  const viewBox = svg.match(/viewBox="([^"]+)"/);
  if (viewBox === null) throw new Error('SVG sem viewBox — não dá para escalar.');
  const [vbX, vbY, vbW, vbH] = viewBox[1].trim().split(/\s+/).map(Number);

  const tintaHex = svg.match(/fill="#([0-9A-Fa-f]{6})"/);
  const tinta =
    tintaHex === null
      ? TINTA_PADRAO
      : [0, 2, 4].map((i) => parseInt(tintaHex[1].slice(i, i + 2), 16));

  const escala = LARGURA_GLIFO / vbW;
  const alturaGlifo = vbH * escala;
  const offX = (LARGURA - LARGURA_GLIFO) / 2;
  const offY = (ALTURA - alturaGlifo) / 2;

  const subcaminhos = [];
  for (const m of svg.matchAll(/ d="([^"]+)"/g)) {
    for (const pts of acharSubcaminhos(m[1], 24)) {
      subcaminhos.push(pts.map(([x, y]) => [(x - vbX) * escala + offX, (y - vbY) * escala + offY]));
    }
  }
  if (subcaminhos.length === 0) throw new Error('nenhum path encontrado no SVG.');

  const cobertura = rasterizar(subcaminhos, LARGURA, ALTURA, SUPERSAMPLE);
  const rgb = Buffer.alloc(LARGURA * ALTURA * 3);
  for (let i = 0; i < LARGURA * ALTURA; i++) {
    const a = cobertura[i];
    for (let c = 0; c < 3; c++) {
      rgb[i * 3 + c] = Math.round(FUNDO[c] * (1 - a) + tinta[c] * a);
    }
  }
  return codificarPng(rgb, LARGURA, ALTURA);
}

const png = gerarPngDoWordmark();
if (process.argv.includes('--check')) {
  if (!existsSync(PNG_DESTINO)) {
    console.error(`FALTA ${PNG_DESTINO} — rode sem --check para gerar.`);
    process.exit(1);
  }
  const atual = readFileSync(PNG_DESTINO);
  if (!atual.equals(png)) {
    console.error('PNG versionado DIVERGE do SVG-fonte. Rode sem --check e commite.');
    process.exit(1);
  }
  console.log(`ok — ${PNG_DESTINO} bate com ${SVG_FONTE}`);
} else {
  writeFileSync(PNG_DESTINO, png);
  console.log(`gravado ${PNG_DESTINO} (${png.length} bytes, ${LARGURA}x${ALTURA})`);
}
