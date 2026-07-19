// =============================================================================
// ajustarProporcao — geometria pura (COVER + downscale) + degradação honesta.
// jsdom não implementa createImageBitmap/canvas 2D: `ajustarProporcaoImagem`
// devolve o arquivo original (comportamento de degradação testado aqui). A
// matemática do recorte é testada de forma pura e determinística.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  calcularCropCover,
  calcularSaidaDims,
  ajustarProporcaoImagem,
} from '../ajustarProporcao';

describe('calcularCropCover', () => {
  it('origem mais larga que o alvo: corta as laterais, mantém a altura', () => {
    // 4000×1000 (4:1) para 16/9 → mantém h=1000, sw = 1000*16/9 ≈ 1778, centralizado.
    const r = calcularCropCover(4000, 1000, 16, 9);
    expect(r.sh).toBe(1000);
    expect(r.sw).toBe(1778);
    expect(r.sy).toBe(0);
    expect(r.sx).toBe(Math.round((4000 - 1778) / 2));
  });

  it('origem mais alta que o alvo: corta topo/base, mantém a largura', () => {
    // 1000×4000 para 16/9 → mantém w=1000, sh = 1000*9/16 ≈ 563, centralizado.
    const r = calcularCropCover(1000, 4000, 16, 9);
    expect(r.sw).toBe(1000);
    expect(r.sh).toBe(563);
    expect(r.sx).toBe(0);
    expect(r.sy).toBe(Math.round((4000 - 563) / 2));
  });

  it('quadrado para 1:1 é no-op (usa a imagem inteira)', () => {
    const r = calcularCropCover(800, 800, 1, 1);
    expect(r).toEqual({ sx: 0, sy: 0, sw: 800, sh: 800 });
  });

  it('retângulo para 1:1 (avatar): corta o lado maior, centralizado', () => {
    const r = calcularCropCover(1200, 800, 1, 1);
    expect(r.sh).toBe(800);
    expect(r.sw).toBe(800);
    expect(r.sx).toBe(200);
    expect(r.sy).toBe(0);
  });

  it('dimensões inválidas degradam sem lançar', () => {
    expect(calcularCropCover(0, 0, 16, 9)).toEqual({ sx: 0, sy: 0, sw: 0, sh: 0 });
    expect(calcularCropCover(100, 100, 0, 0).sw).toBe(100);
  });
});

describe('calcularSaidaDims', () => {
  it('não amplia quando já abaixo do teto', () => {
    expect(calcularSaidaDims(800, 450, 1600)).toEqual({ w: 800, h: 450 });
  });

  it('reduz mantendo a proporção quando o maior lado passa do teto', () => {
    // 3200×1800, teto 1600 → escala 0.5.
    expect(calcularSaidaDims(3200, 1800, 1600)).toEqual({ w: 1600, h: 900 });
  });

  it('teto 0 desativa o limite', () => {
    expect(calcularSaidaDims(5000, 5000, 0)).toEqual({ w: 5000, h: 5000 });
  });
});

describe('ajustarProporcaoImagem — degradação honesta (jsdom sem canvas)', () => {
  it('sem createImageBitmap/canvas, devolve o arquivo original inalterado', async () => {
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    const out = await ajustarProporcaoImagem(file, 16, 9);
    expect(out).toBe(file);
  });

  it('tipo não re-encodável (gif) devolve o original mesmo com suporte', async () => {
    const gif = new File(['x'], 'anim.gif', { type: 'image/gif' });
    const out = await ajustarProporcaoImagem(gif, 1, 1);
    expect(out).toBe(gif);
  });

  it('nunca lança em erro de decode (arquivo corrompido)', async () => {
    const ruim = new File(['not-an-image'], 'x.jpg', { type: 'image/jpeg' });
    await expect(ajustarProporcaoImagem(ruim, 16, 9)).resolves.toBeInstanceOf(File);
  });
});
