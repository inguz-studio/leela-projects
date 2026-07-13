/**
 * comunicadoCore.test.ts — LEELA-S108-T1
 *
 * Unit (puro, sem emulator): tipos/guards do Comunicado (RN-130/131/132)
 * e constantes de limite (RN-133/134 — fonte única em @leela/core).
 */
import { describe, expect, it } from 'vitest';
import {
  CAMPOS_FUNCTION_COMUNICADO,
  isCanalComunicado,
  isOrigemComunicado,
  isStatusComunicado,
  isTipoSegmento,
  PUSH_MAX_CHARS,
  PUSH_SEMANA_MAX,
  segmentoDispensaReferencia,
  temCanalPush,
  TIPOS_SEGMENTO,
  TIPOS_SEGMENTO_SEM_REFERENCIA,
} from '@leela/core';

describe('guards do comunicado (RN-130/131/132)', () => {
  it('status: rascunho/agendado/enviado (RN-130)', () => {
    expect(isStatusComunicado('rascunho')).toBe(true);
    expect(isStatusComunicado('agendado')).toBe(true);
    expect(isStatusComunicado('enviado')).toBe(true);
    expect(isStatusComunicado('pausado')).toBe(false);
  });

  it('canal: push/email (RN-131)', () => {
    expect(isCanalComunicado('push')).toBe(true);
    expect(isCanalComunicado('email')).toBe(true);
    expect(isCanalComunicado('sms')).toBe(false);
    expect(isCanalComunicado('whatsapp')).toBe(false);
  });

  it('origem: manual/automatizada (RN-132)', () => {
    expect(isOrigemComunicado('manual')).toBe(true);
    expect(isOrigemComunicado('automatizada')).toBe(true);
    expect(isOrigemComunicado('bot')).toBe(false);
  });

  it('tipos de segmento: todos/por_desafio/por_pilar/por_engajamento/novos_membros', () => {
    expect(isTipoSegmento('todos')).toBe(true);
    expect(isTipoSegmento('por_desafio')).toBe(true);
    expect(isTipoSegmento('por_pilar')).toBe(true);
    expect(isTipoSegmento('por_engajamento')).toBe(true);
    // 5º segmento (CONS-4-T2 — mockup S109 "Novos membros (Automação)")
    expect(isTipoSegmento('novos_membros')).toBe(true);
    expect(isTipoSegmento('por_cidade')).toBe(false);
  });

  it('taxonomia V1 do clube é exatamente os 5 tipos (CONS-4-T2)', () => {
    expect(TIPOS_SEGMENTO).toEqual([
      'todos',
      'por_desafio',
      'por_pilar',
      'por_engajamento',
      'novos_membros',
    ]);
    // 'todos' e 'novos_membros' dispensam referência — fonte única do form
    expect(TIPOS_SEGMENTO_SEM_REFERENCIA).toEqual(['todos', 'novos_membros']);
    expect(segmentoDispensaReferencia('novos_membros')).toBe(true);
    expect(segmentoDispensaReferencia('por_desafio')).toBe(false);
  });

  it('temCanalPush detecta push em qualquer combinação', () => {
    expect(temCanalPush(['push'])).toBe(true);
    expect(temCanalPush(['push', 'email'])).toBe(true);
    expect(temCanalPush(['email'])).toBe(false);
    expect(temCanalPush([])).toBe(false);
  });
});

describe('limites canônicos (RN-133/134)', () => {
  it('push limita corpo a 160 chars (RN-134)', () => {
    expect(PUSH_MAX_CHARS).toBe(160);
  });

  it('clube limita 4 push por semana (RN-133)', () => {
    expect(PUSH_SEMANA_MAX).toBe(4);
  });

  it('campos de Function espelham as Rules', () => {
    expect(CAMPOS_FUNCTION_COMUNICADO).toEqual([
      'alcance',
      'aberturasPct',
      'enviadoEm',
    ]);
  });
});
