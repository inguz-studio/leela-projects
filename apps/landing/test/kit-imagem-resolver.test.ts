// =============================================================================
// PROVA da cascata de imagem do kit (KIT-IMG-LANDING / T1) — resolvedor puro.
//
// A regra de superfície honesta em três níveis:
//   real → mock temático SÓ no preview → placeholder padrão Leela em produção.
// Também prova a escolha de tema determinística (ciclismo/trail/wellness/tier).
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  extrasDePreview,
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

  // S1218-T4 (B9): este caso carimbava o balaio antigo — "Kit Yoga" recebia a
  // MESMA foto genérica de bem-estar de um kit de caminhada, e foi isso que o
  // dono viu ao testar. A ioga saiu do balaio e ganhou foto própria; o
  // `wellness` continua valendo para o que sobra.
  it('wellness continua com caminhada, retiro e bem-estar', () => {
    expect(temaKit('Kit Bem-estar', ['Caminhada'])).toBe('wellness');
    expect(temaKit('Kit Retiro', [])).toBe('wellness');
  });

  it('ioga e fitness têm foto PRÓPRIA, não a genérica de bem-estar (B9)', () => {
    expect(temaKit('Kit Yoga', [])).toBe('ioga');
    expect(temaKit('Kit Ioga', ['Prática guiada'])).toBe('ioga');
    expect(temaKit('Kit Meditação', [])).toBe('ioga');
    expect(temaKit('Kit Fitness', [])).toBe('fitness');
    expect(temaKit('Kit Treino', ['Funcional'])).toBe('fitness');
    // E as três fotos são arquivos DIFERENTES — senão a separação seria só
    // nome, e a tela do usuário tester continuaria mostrando a mesma imagem.
    const usadas = new Set([KITS_MOCK.ioga, KITS_MOCK.fitness, KITS_MOCK.wellness]);
    expect(usadas.size).toBe(3);
  });

  it('kit nomeado por camiseta ganha a foto de camisetas (B9)', () => {
    expect(temaKit('Kit Camiseta', [])).toBe('camiseta');
    expect(temaKit('Camiseta oficial', ['5km'])).toBe('camiseta');
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

// =============================================================================
// S1218-T4 · B9 — o acervo local é REAL, versionado e servido do próprio domínio
//
// O pedido do dono: "na visualização do kit, seria interessante você colocar
// imagens reais, de camisetas ou kits fitness com de yoga, por exemplo, para
// ilustrar melhor para o usuário tester."
//
// O que estes casos guardam é o CONTRATO do acervo, que é o que um refator
// quebra sem perceber: nenhuma URL externa em tempo de execução, todo asset
// dentro do diretório versionado, e o par extra de preview sem repetição.
// A avaliação da FOTO em si é do olho do dono — está apontada no handoff.
// =============================================================================
describe('acervo local de kit (S1218-T4 · B9)', () => {
  it('nenhum asset do acervo aponta para fora do domínio', () => {
    for (const src of Object.values(KITS_MOCK)) {
      expect(src.startsWith('/covers/kits/')).toBe(true);
      expect(src).not.toMatch(/^https?:/);
      expect(src).not.toContain('unsplash');
    }
  });

  it('os três temas novos existem e são arquivos distintos dos antigos', () => {
    const todos = Object.values(KITS_MOCK);
    expect(new Set(todos).size).toBe(todos.length);
    expect(KITS_MOCK.camiseta).toContain('camiseta-evento');
    expect(KITS_MOCK.fitness).toContain('fitness');
    expect(KITS_MOCK.ioga).toContain('ioga');
  });

  it('o par extra de preview continua determinístico e sem repetir a principal', () => {
    for (const [nome, mods] of [
      ['Kit Yoga', []],
      ['Kit Fitness', []],
      ['Kit Camiseta', []],
      ['Kit Prata', ['10km']],
    ] as const) {
      const extras = extrasDePreview(nome, mods);
      const principal = KITS_MOCK[temaKit(nome, mods)];
      expect(extras).toHaveLength(2);
      expect(extras).not.toContain(principal);
      expect(new Set(extras).size).toBe(2);
      // Estável entre chamadas — senão a fita piscaria entre renders.
      expect(extrasDePreview(nome, mods)).toEqual(extras);
    }
  });
});
