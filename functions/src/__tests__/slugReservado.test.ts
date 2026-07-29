// =============================================================================
// functions/src/__tests__/slugReservado.test.ts
//
// Slug de evento não sombreia rota estática da superfície pública
// (S1214-T2 · RN-418). Unit puro — a integração com `criarEvento` é uma linha
// de `continue` no laço de candidatos, coberta pela suíte daquela Function.
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  SLUGS_RESERVADOS,
  slugCandidato,
  slugReservado,
  slugify,
} from '../eventos/slug';

describe('slugs reservados (RN-418)', () => {
  it('`ingresso` está reservado — é a rota da página do ingresso', () => {
    expect(slugReservado('ingresso')).toBe(true);
  });

  it('`convite` continua reservado — a rota existe desde o E18', () => {
    expect(slugReservado('convite')).toBe(true);
  });

  it('um evento chamado "Ingresso" NÃO sombreia a rota: cai no candidato seguinte', () => {
    const base = slugify('Ingresso');
    expect(base).toBe('ingresso');
    expect(slugReservado(slugCandidato(base, 0))).toBe(true);
    // É o que o laço de `criarEvento` faz: pula o reservado e tenta o próximo.
    expect(slugReservado(slugCandidato(base, 1))).toBe(false);
    expect(slugCandidato(base, 1)).toBe('ingresso-2');
  });

  it('nome com acento e caixa alta também colide depois do slugify', () => {
    expect(slugReservado(slugify('INGRESSO'))).toBe(true);
    expect(slugReservado(slugify('Convite'))).toBe(true);
  });

  it('nome de evento de verdade não é reservado', () => {
    for (const nome of [
      'Meia Maratona Floripa 2026',
      'Ingresso Livre Trail',
      'Desafio MTB Costa da Lagoa',
    ]) {
      expect(slugReservado(slugify(nome))).toBe(false);
    }
  });

  it('a lista não depende de Object.prototype (é array, não mapa)', () => {
    for (const herdado of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(slugReservado(herdado)).toBe(false);
    }
  });

  it('toda entrada da lista sobrevive ao slugify, exceto as com ponto (rotas de arquivo)', () => {
    for (const reservado of SLUGS_RESERVADOS) {
      if (reservado.includes('.') || reservado.startsWith('_')) continue;
      expect(slugify(reservado)).toBe(reservado);
    }
  });
});
