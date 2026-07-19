// =============================================================================
// PROVA da cascata de imagem do kit (KIT-IMG-LANDING / T1) — resolvedor puro.
//
// A regra de superfície honesta em três níveis:
//   real → mock temático SÓ no preview → placeholder padrão Leela em produção.
// Também prova a escolha de tema determinística (ciclismo/trail/wellness/tier).
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  imagemDoKit,
  temaKit,
  rotuloKit,
  KITS_MOCK,
  PLACEHOLDER_KIT,
} from '../lib/kitImagem';

describe('rotuloKit — alt descritivo sem duplicar "Kit"', () => {
  it('nome que já começa com "Kit" não duplica', () => {
    expect(rotuloKit('Kit Prata')).toBe('Kit Prata');
    expect(rotuloKit('kit básico')).toBe('kit básico');
  });
  it('nome solto ganha o prefixo "Kit"', () => {
    expect(rotuloKit('Ouro')).toBe('Kit Ouro');
  });
});

describe('imagemDoKit — cascata real → mock preview → placeholder Leela', () => {
  const kitCorrida = { nome: 'Kit Prata', modalidades: ['5km', '10km'] };

  it('imagem REAL do organizador vence em preview E em produção', () => {
    const real = 'https://cdn.exemplo.com/kits/ouro.jpg';
    for (const preview of [true, false]) {
      const r = imagemDoKit({ ...kitCorrida, imagemUrl: real }, preview);
      expect(r).toEqual({ src: real, origem: 'real', ampliavel: true });
    }
  });

  it('sem imagem + PREVIEW → foto mock temática, ampliável', () => {
    const r = imagemDoKit({ ...kitCorrida, imagemUrl: null }, true);
    expect(r.origem).toBe('mock');
    expect(r.ampliavel).toBe(true);
    expect(Object.values(KITS_MOCK)).toContain(r.src);
  });

  it('sem imagem + PRODUÇÃO real → placeholder padrão Leela, NÃO ampliável', () => {
    const r = imagemDoKit({ ...kitCorrida, imagemUrl: null }, false);
    expect(r).toEqual({ src: PLACEHOLDER_KIT, origem: 'placeholder', ampliavel: false });
  });

  it('imagemUrl vazia/em branco cai na cascata (não conta como real)', () => {
    expect(imagemDoKit({ ...kitCorrida, imagemUrl: '   ' }, false).origem).toBe('placeholder');
    expect(imagemDoKit({ ...kitCorrida, imagemUrl: '' }, true).origem).toBe('mock');
    expect(imagemDoKit({ ...kitCorrida }, false).origem).toBe('placeholder');
  });
});

describe('temaKit — escolha determinística por nome + modalidades', () => {
  it('ciclismo por palavra-chave de bike', () => {
    expect(temaKit('Kit Pedal', ['MTB 40km'])).toBe('ciclismo');
    expect(temaKit('Kit Speed', ['Ciclismo'])).toBe('ciclismo');
  });

  it('trail por trilha/montanha', () => {
    expect(temaKit('Kit Trail', ['Trilha 12km'])).toBe('trail');
  });

  it('wellness por yoga/bem-estar/caminhada', () => {
    expect(temaKit('Kit Bem-estar', ['Caminhada'])).toBe('wellness');
    expect(temaKit('Kit Yoga', [])).toBe('wellness');
  });

  it('tier premium ganha o bundle; corrida genérica cai na camiseta', () => {
    expect(temaKit('Kit Ouro', ['21km'])).toBe('apparelBundle');
    expect(temaKit('Kit Básico', ['5km'])).toBe('tee');
    expect(temaKit('Kit Prata', ['10km'])).toBe('tee');
  });

  it('é determinística (mesma entrada → mesmo tema)', () => {
    const a = temaKit('Kit Ouro', ['42km']);
    const b = temaKit('Kit Ouro', ['42km']);
    expect(a).toBe(b);
  });
});
