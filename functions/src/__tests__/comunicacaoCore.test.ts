/**
 * comunicacaoCore.test.ts — LEELA-E06-L1-T1
 *
 * Guarda da EXTRAÇÃO das primitivas agnósticas de comunicação (Camada A →
 * `core/comunicacao`) e do envelope de envio (Camada B → `functions/shared`).
 *
 * Aceites do brief E06-L1-T1:
 *   - PUSH_MAX_CHARS === 160 e PUSH_SEMANA_MAX === 4 importados de
 *     `@leela/core` — UM só símbolo: o re-export do clube é IDENTICO
 *     (Object.is) ao da fonte `core/comunicacao` (zero literal duplicado);
 *   - truncarPush('a'.repeat(161)) devolve 160 code points;
 *   - emoji NÃO é cortado no meio (corte por code point, nunca surrogate);
 *   - miolo de validação agnóstico (validarComunicacaoBase) cobre título/
 *     conteúdo/canal/160/capa-só-email — o clube compõe com o segmento dele.
 *
 * Unit puro — sem emulator.
 */
import { describe, expect, it } from 'vitest';
import {
  CANAIS_COMUNICADO,
  contarChars,
  PUSH_MAX_CHARS,
  PUSH_SEMANA_MAX,
  STATUS_COMUNICADO,
  temCanalPush,
  truncarPush,
  validarComunicacaoBase,
  validarComunicado,
} from '@leela/core';
import * as fonte from '../../../packages/core/src/comunicacao/canal';
import * as clubeReexport from '../../../packages/core/src/clubs/comunicado';
import * as clubeValidacao from '../../../packages/core/src/clubs/comunicado-validacao';

describe('comunicacao — fonte única das constantes de segurança (E06-L1-T1)', () => {
  it('PUSH_MAX_CHARS === 160 e PUSH_SEMANA_MAX === 4 via @leela/core', () => {
    expect(PUSH_MAX_CHARS).toBe(160);
    expect(PUSH_SEMANA_MAX).toBe(4);
  });

  it('re-export do clube é o MESMO símbolo da fonte core/comunicacao (zero drift)', () => {
    // Identidade de referência prova módulo único — não cópia de valor.
    expect(Object.is(clubeReexport.CANAIS_COMUNICADO, fonte.CANAIS_COMUNICADO)).toBe(true);
    expect(Object.is(clubeReexport.STATUS_COMUNICADO, fonte.STATUS_COMUNICADO)).toBe(true);
    expect(Object.is(clubeValidacao.truncarPush, fonte.truncarPush)).toBe(true);
    expect(Object.is(clubeReexport.temCanalPush, fonte.temCanalPush)).toBe(true);
    expect(clubeReexport.PUSH_MAX_CHARS).toBe(fonte.PUSH_MAX_CHARS);
    expect(clubeReexport.PUSH_SEMANA_MAX).toBe(fonte.PUSH_SEMANA_MAX);
    // E o barrel @leela/core serve os mesmos objetos.
    expect(Object.is(CANAIS_COMUNICADO, fonte.CANAIS_COMUNICADO)).toBe(true);
    expect(Object.is(STATUS_COMUNICADO, fonte.STATUS_COMUNICADO)).toBe(true);
    expect(Object.is(truncarPush, fonte.truncarPush)).toBe(true);
  });

  it('códigos de status compartilhados são os masculinos (decisão item 9)', () => {
    expect(STATUS_COMUNICADO).toEqual(['rascunho', 'agendado', 'enviado']);
  });
});

describe('truncarPush — corte por code point (RN-134)', () => {
  it('161 chars → 160 code points; ≤160 volta intacto', () => {
    const truncado = truncarPush('a'.repeat(161));
    expect(contarChars(truncado)).toBe(160);
    expect(truncarPush('a'.repeat(160))).toBe('a'.repeat(160));
  });

  it('emoji não é cortado no meio (nenhum surrogate órfão)', () => {
    // 161 corredores (cada 🏃 = 2 UTF-16 units, 1 code point)
    const texto = '🏃'.repeat(161);
    const truncado = truncarPush(texto);
    expect(contarChars(truncado)).toBe(160);
    // Cada code point resultante segue sendo um emoji inteiro
    expect([...truncado].every((c) => c === '🏃')).toBe(true);
    // Nenhum HIGH surrogate órfão na fronteira do corte (par completo
    // termina no LOW surrogate — 0xDC00..0xDFFF é o final legítimo).
    const ultimo = truncado.charCodeAt(truncado.length - 1);
    const ehHighSurrogateOrfao = ultimo >= 0xd800 && ultimo <= 0xdbff;
    expect(ehHighSurrogateOrfao).toBe(false);
  });

  it('contarChars conta por code point (emoji = 1)', () => {
    expect(contarChars('🏃🏃')).toBe(2);
    expect('🏃🏃'.length).toBe(4); // prova de que .length mentiria
  });
});

describe('validarComunicacaoBase — miolo agnóstico (Camada A)', () => {
  const valido = {
    titulo: 'Kit pronto',
    conteudo: 'Seu kit está pronto para retirada.',
    canal: ['push'] as ('push' | 'email')[],
  };

  it('payload válido → sem erros', () => {
    expect(validarComunicacaoBase(valido)).toEqual([]);
  });

  it('título < 5 e conteúdo < 10 acusam', () => {
    const erros = validarComunicacaoBase({
      ...valido,
      titulo: 'Oi',
      conteudo: 'curto',
    });
    expect(erros.some((e) => e.includes('título'))).toBe(true);
    expect(erros.some((e) => e.includes('conteúdo'))).toBe(true);
  });

  it('canal vazio / duplicado / inválido acusam', () => {
    expect(
      validarComunicacaoBase({ ...valido, canal: [] }).length
    ).toBeGreaterThan(0);
    expect(
      validarComunicacaoBase({
        ...valido,
        canal: ['push', 'push'],
      }).some((e) => e.includes('duplicado'))
    ).toBe(true);
    expect(
      validarComunicacaoBase({
        ...valido,
        canal: ['sms' as never],
      }).some((e) => e.includes('inválido'))
    ).toBe(true);
  });

  it('push com 161 chars acusa RN-134; email puro com 161 passa', () => {
    const longo = 'x'.repeat(161);
    expect(
      validarComunicacaoBase({ ...valido, conteudo: longo }).some((e) =>
        e.includes('RN-134')
      )
    ).toBe(true);
    expect(
      validarComunicacaoBase({
        ...valido,
        canal: ['email'],
        conteudo: longo,
      })
    ).toEqual([]);
  });

  it('capa sem email acusa RN-135; com email passa', () => {
    expect(
      validarComunicacaoBase({
        ...valido,
        capaUrl: 'https://cdn/capa.png',
      }).some((e) => e.includes('RN-135'))
    ).toBe(true);
    expect(
      validarComunicacaoBase({
        ...valido,
        canal: ['push', 'email'],
        capaUrl: 'https://cdn/capa.png',
      })
    ).toEqual([]);
  });
});

describe('validarComunicado (clube) — composição miolo + segmento (regressão)', () => {
  it('segue exigindo segmento e referência fora de "todos"', () => {
    const base = {
      titulo: 'Treino de sábado',
      conteudo: 'Encontro às 7h no parque, leve água.',
      canal: ['push'] as ('push' | 'email')[],
    };
    expect(
      validarComunicado({ ...base, segmento: { tipo: 'todos' } })
    ).toEqual([]);
    expect(
      validarComunicado({ ...base }).some((e) => e.includes('segmento'))
    ).toBe(true);
    expect(
      validarComunicado({
        ...base,
        segmento: { tipo: 'por_desafio' },
      }).some((e) => e.includes('referência'))
    ).toBe(true);
  });

  it('temCanalPush segue respondendo pela cota RN-133', () => {
    expect(temCanalPush(['push', 'email'])).toBe(true);
    expect(temCanalPush(['email'])).toBe(false);
  });
});
