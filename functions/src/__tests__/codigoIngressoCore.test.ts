/**
 * codigoIngressoCore.test.ts — LEELA-S1206-T5 (RN-396)
 *
 * Unit PURO do código identificador do ingresso (core/tickets/codigoIngresso):
 *   - alfabeto: nenhum caractere ambíguo (0/O/1/I/L) SAI, em amostra grande;
 *   - formato: tamanho e maiúsculas; minúscula e ruído são recusados;
 *   - normalização da busca não "conserta" ambíguo (não adivinha ingresso
 *     alheio);
 *   - RNG hostil (fora de [0,1)) não produz código torto.
 *
 * A unicidade POR EVENTO não é testada aqui de propósito: sorteio não é
 * unicidade, quem garante é a emissão contra chave primária
 * (emitirIngressos.integration.test.ts).
 *
 * Sem emulator — tudo puro.
 */

import { describe, expect, it } from 'vitest';
import {
  ALFABETO_CODIGO_INGRESSO,
  CARACTERES_AMBIGUOS_INGRESSO,
  TAMANHO_CODIGO_INGRESSO,
  gerarCodigoIngresso,
  isCodigoIngressoValido,
  normalizarCodigoIngresso,
} from '@leela/core';

describe('alfabeto (RN-396) — o que a voz e o olho confundem fica de fora', () => {
  it('o alfabeto NÃO contém 0, O, 1, I nem L', () => {
    for (const ch of CARACTERES_AMBIGUOS_INGRESSO) {
      expect(ALFABETO_CODIGO_INGRESSO.includes(ch)).toBe(false);
    }
  });

  it('o alfabeto é maiúsculo, sem repetição e cobre A–Z + 2–9 menos os ambíguos', () => {
    expect(ALFABETO_CODIGO_INGRESSO).toBe(
      ALFABETO_CODIGO_INGRESSO.toUpperCase()
    );
    expect(new Set(ALFABETO_CODIGO_INGRESSO).size).toBe(
      ALFABETO_CODIGO_INGRESSO.length
    );
    // 26 letras − 3 (O, I, L) + 10 dígitos − 2 (0, 1) = 31
    expect(ALFABETO_CODIGO_INGRESSO.length).toBe(31);
  });

  it('caractere ambíguo NUNCA sai do gerador (amostra de 20 mil)', () => {
    const proibidos = new Set(CARACTERES_AMBIGUOS_INGRESSO);
    for (let i = 0; i < 20_000; i++) {
      for (const ch of gerarCodigoIngresso()) {
        expect(proibidos.has(ch)).toBe(false);
      }
    }
  });
});

describe('formato (RN-396)', () => {
  it('o gerador produz sempre um código canônico', () => {
    for (let i = 0; i < 5_000; i++) {
      const codigo = gerarCodigoIngresso();
      expect(codigo).toHaveLength(TAMANHO_CODIGO_INGRESSO);
      expect(isCodigoIngressoValido(codigo)).toBe(true);
    }
  });

  it('minúscula, tamanho errado, ambíguo e não-string são inválidos', () => {
    expect(isCodigoIngressoValido('ab2cd3')).toBe(false);
    expect(isCodigoIngressoValido('AB2CD')).toBe(false);
    expect(isCodigoIngressoValido('AB2CD34')).toBe(false);
    expect(isCodigoIngressoValido('AB0CD3')).toBe(false); // zero
    expect(isCodigoIngressoValido('ABOCD3')).toBe(false); // letra O
    expect(isCodigoIngressoValido('AB1CD3')).toBe(false); // um
    expect(isCodigoIngressoValido('ABICD3')).toBe(false); // letra I
    expect(isCodigoIngressoValido('ABLCD3')).toBe(false); // letra L
    expect(isCodigoIngressoValido('AB2 D3')).toBe(false);
    expect(isCodigoIngressoValido(undefined)).toBe(false);
    expect(isCodigoIngressoValido(null)).toBe(false);
    expect(isCodigoIngressoValido(123456)).toBe(false);
    expect(isCodigoIngressoValido({ toString: () => 'AB2CD3' })).toBe(false);
  });

  it('RNG hostil (1, negativo, NaN) não produz código fora do alfabeto', () => {
    for (const valor of [1, 1.5, -0.4, Number.NaN]) {
      const codigo = gerarCodigoIngresso(() => valor);
      expect(codigo).toHaveLength(TAMANHO_CODIGO_INGRESSO);
      for (const ch of codigo) {
        expect(ALFABETO_CODIGO_INGRESSO.includes(ch)).toBe(true);
      }
    }
  });

  it('RNG injetado é determinístico — a mesma sequência dá o mesmo código', () => {
    const sequencia = [0, 0.5, 0.99, 0.25, 0.75, 0.1];
    const gerar = (): string => {
      let i = 0;
      return gerarCodigoIngresso(() => sequencia[i++ % sequencia.length] as number);
    };
    expect(gerar()).toBe(gerar());
  });

  it('sorteio default (entropia do sistema): cobre os 31 símbolos e não trava', () => {
    // O default deixou de ser `Math.random` junto com o do código da compra —
    // a doutrina é a mesma nos dois. O que se prende aqui é o observável:
    // faixa igual ao alfabeto inteiro, e fonte que de fato varia (uma fonte
    // travada geraria o mesmo código para todo ingresso do evento).
    const vistos = new Set<string>();
    const amostra = new Set<string>();
    for (let i = 0; i < 20_000; i++) {
      const codigo = gerarCodigoIngresso();
      if (i < 50) amostra.add(codigo);
      for (const ch of codigo) vistos.add(ch);
    }
    expect(vistos.size).toBe(ALFABETO_CODIGO_INGRESSO.length);
    expect(amostra.size).toBe(50);
  });
});

describe('normalização da busca (RN-397)', () => {
  it('sobe caixa e tira espaço/hífen', () => {
    expect(normalizarCodigoIngresso(' ab2-cd3 ')).toBe('AB2CD3');
    expect(normalizarCodigoIngresso('AB2 CD3')).toBe('AB2CD3');
  });

  it('NÃO troca caractere ambíguo por parecido — adivinhar acharia outra pessoa', () => {
    // 'AB0CD3' não pode virar 'ABOCD3' (nem o contrário): o código de outra
    // pessoa está a um caractere de distância.
    expect(normalizarCodigoIngresso('AB0CD3')).toBe('AB0CD3');
    expect(normalizarCodigoIngresso('ABICD3')).toBe('ABICD3');
  });

  it('entrada não-string vira string vazia (busca não quebra)', () => {
    expect(normalizarCodigoIngresso(undefined)).toBe('');
    expect(normalizarCodigoIngresso(null)).toBe('');
    expect(normalizarCodigoIngresso(42)).toBe('');
  });
});
