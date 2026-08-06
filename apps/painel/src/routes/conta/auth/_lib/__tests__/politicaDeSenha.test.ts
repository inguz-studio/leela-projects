// =============================================================================
// A política de senha da casa (FRONTEIRA-AUTH · `@leela/core` ·
// platform/politicaDeSenha).
//
// A regra vive no core porque as Functions também a chamam; o teste vive aqui
// porque `@leela/core` não tem suíte própria e as regras dele são cobertas
// pelas suítes dos apps (mesmo padrão de `kit-galeria-core.test.ts` na
// landing). As telas de senha do painel são as vizinhas mais próximas.
//
// Os casos são a regra que o dono pediu e as armadilhas que ela cria. O caso
// que mais importa é `Senha1!`: ele ATENDE aos três requisitos e sai FRACO —
// se um dia alguém "consertar" isso para verde, a régua terá voltado a premiar
// exatamente a senha que os ataques de dicionário tentam primeiro.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  SENHA_MIN,
  SENHA_MAX,
  avaliarSenha,
  senhaValida,
  exigenciaDeSenha,
} from '@leela/core';

describe('a regra que o dono pediu: número + caractere especial', () => {
  it('recusa senha sem número', () => {
    const a = avaliarSenha('abcdefgh!');
    expect(a.requisitos.numero).toBe(false);
    expect(a.atende).toBe(false);
    expect(a.pendencias).toContain('um número');
  });

  it('recusa senha sem caractere especial', () => {
    const a = avaliarSenha('abcdefg123');
    expect(a.requisitos.especial).toBe(false);
    expect(a.atende).toBe(false);
    expect(a.pendencias).toContain('um caractere especial');
  });

  it('recusa senha curta mesmo com número e especial', () => {
    const a = avaliarSenha('a1!');
    expect(a.requisitos.comprimento).toBe(false);
    expect(a.atende).toBe(false);
    expect(a.pendencias[0]).toContain(String(SENHA_MIN));
  });

  it('aceita quando os três requisitos batem', () => {
    const a = avaliarSenha('trilha-longa9!');
    expect(a.requisitos).toEqual({ comprimento: true, numero: true, especial: true });
    expect(a.atende).toBe(true);
    expect(a.pendencias).toEqual([]);
  });

  it('lista TODAS as pendências de uma vez (a pessoa não descobre uma por vez)', () => {
    expect(avaliarSenha('abc').pendencias).toEqual([
      `pelo menos ${SENHA_MIN} caracteres`,
      'um número',
      'um caractere especial',
    ]);
  });

  it('recusa senha acima do teto do Identity Platform', () => {
    const a = avaliarSenha(`${'a'.repeat(SENHA_MAX)}1!`);
    expect(a.requisitos.comprimento).toBe(false);
    expect(a.pendencias[0]).toContain(String(SENHA_MAX));
  });

  it('o conjunto de especiais é o do Identity Platform — hífen NÃO conta', () => {
    // O caso que salva a tela de se contradizer com o servidor: `-`, `+` e `=`
    // ficam de FORA da lista que o Identity Platform publica. Uma senha como
    // `senha-forte-123` passaria aqui e morreria lá se contássemos o hífen.
    for (const fora of ['-', '+', '=']) {
      expect(avaliarSenha(`senhaforte1${fora}`).requisitos.especial).toBe(false);
    }
    for (const dentro of ['!', '@', '#', '$', '%', '&', '*', '_', '~', '?', '.']) {
      expect(avaliarSenha(`senhaforte1${dentro}`).requisitos.especial).toBe(true);
    }
  });

  it('é total: entrada que não é string não explode, só não vale', () => {
    for (const lixo of [undefined, null, 42, {}, []]) {
      expect(senhaValida(lixo)).toBe(false);
      expect(avaliarSenha(lixo).forca).toBe('vazia');
    }
  });
});

describe('o medidor é honesto', () => {
  it('`Senha1!` atende a regra e AINDA ASSIM é fraca — é curta e é dicionário', () => {
    const a = avaliarSenha('Senha1!!');
    expect(a.atende).toBe(true);
    expect(a.forca).toBe('fraca');
  });

  it('senha que não atende a regra nunca passa de fraca', () => {
    // 24 caracteres, sem número e sem especial: comprimento não compra nível.
    expect(avaliarSenha('abcdefghijklmnopqrstuvwx').forca).toBe('fraca');
  });

  it('repetição pura não vira força (poucos caracteres distintos)', () => {
    expect(avaliarSenha('aaaa1111!!!!').forca).toBe('fraca');
  });

  it('frase longa é forte mesmo sem maiúscula', () => {
    expect(avaliarSenha('guarda-chuva no 7o andar!').forca).toBe('forte');
  });

  it('campo em branco é `vazia`, não `fraca` — não se acusa quem não digitou', () => {
    const a = avaliarSenha('');
    expect(a.forca).toBe('vazia');
    expect(a.rotulo).toBe('');
  });

  it('o nível sobe conforme a senha melhora, e o rótulo acompanha', () => {
    // 3 → 8 → 10 → 12 caracteres. Note que 8 (o piso) ainda é FRACA: atender
    // ao mínimo é a licença para enviar, não um elogio.
    expect(avaliarSenha('abc').forca).toBe('fraca');
    expect(avaliarSenha('abcdef1!').forca).toBe('fraca');
    expect(avaliarSenha('abcdef1!xy').forca).toBe('media');
    expect(avaliarSenha('abcdef1!xyzw').forca).toBe('forte');
    expect(avaliarSenha('abcdef1!xyzw').rotulo).toBe('Forte');
  });
});

describe('uma frase só para tela e servidor', () => {
  it('a exigência cita o piso vigente — tela e Function nunca se contradizem', () => {
    const frase = exigenciaDeSenha();
    expect(frase).toContain(String(SENHA_MIN));
    expect(frase).toContain('número');
    expect(frase).toContain('caractere especial');
  });

  it('o piso é o do NIST (8), não o 6 antigo do Firebase', () => {
    expect(SENHA_MIN).toBe(8);
  });
});
