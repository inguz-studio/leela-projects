/**
 * campanhaCore.test.ts — LEELA-S401-T1 (E06-L1-T2)
 *
 * Unit puro: modelo `Campanha` do evento — validação (miolo compartilhado
 * core/comunicacao + taxonomia de segmento do evento) e parsing fail-fast.
 *
 * Aceites do brief:
 *   - validarCampanha reusa o miolo agnóstico e adiciona SÓ a taxonomia de
 *     evento: por_kit sem referencia → erro; referencia='kit_ouro' → válido
 *     (usa isKitInscrito de core/eventos/inscrito);
 *   - corte 5: 'por_engajamento' NÃO é tipo válido de segmento de campanha;
 *   - corte 4: parse REJEITA doc com aberturasPct;
 *   - RN-134/135 valem (herdadas do miolo);
 *   - códigos de status compartilhados masculinos (item 9).
 */
import { describe, expect, it } from 'vitest';
import {
  parseCampanha,
  TIPOS_SEGMENTO_CAMPANHA,
  validarCampanha,
  validarSegmentoCampanha,
  type CampanhaInput,
} from '@leela/core';

const inputValido: CampanhaInput = {
  titulo: 'Kit pronto para retirada',
  conteudo: 'Seu kit da Meia Floripa 2026 está disponível para retirada.',
  canal: ['push'],
  segmento: { tipo: 'por_kit', referencia: 'kit_ouro' },
};

describe('validarSegmentoCampanha — taxonomia do evento (Camada C)', () => {
  it('taxonomia V1 é exatamente todos_inscritos|por_modalidade|por_kit|por_status (corte 5)', () => {
    expect(TIPOS_SEGMENTO_CAMPANHA).toEqual([
      'todos_inscritos',
      'por_modalidade',
      'por_kit',
      'por_status',
    ]);
    expect(
      validarSegmentoCampanha({ tipo: 'por_engajamento' as never }).length
    ).toBeGreaterThan(0);
  });

  it('todos_inscritos não exige referência', () => {
    expect(validarSegmentoCampanha({ tipo: 'todos_inscritos' })).toEqual([]);
  });

  it('por_kit valida contra o enum RN-202 (isKitInscrito)', () => {
    expect(
      validarSegmentoCampanha({ tipo: 'por_kit', referencia: 'kit_ouro' })
    ).toEqual([]);
    expect(
      validarSegmentoCampanha({ tipo: 'por_kit' }).some((e) =>
        e.includes('por_kit')
      )
    ).toBe(true);
    expect(
      validarSegmentoCampanha({
        tipo: 'por_kit',
        referencia: 'kit_diamante',
      }).some((e) => e.includes('RN-202'))
    ).toBe(true);
  });

  it('por_status valida contra o enum RN-204 (isStatusInscrito)', () => {
    expect(
      validarSegmentoCampanha({ tipo: 'por_status', referencia: 'pendente' })
    ).toEqual([]);
    expect(
      validarSegmentoCampanha({
        tipo: 'por_status',
        referencia: 'vip',
      }).some((e) => e.includes('RN-204'))
    ).toBe(true);
  });

  it('por_modalidade exige referência não-vazia (string livre do evento)', () => {
    expect(
      validarSegmentoCampanha({ tipo: 'por_modalidade', referencia: '21k' })
    ).toEqual([]);
    expect(
      validarSegmentoCampanha({ tipo: 'por_modalidade', referencia: '  ' })
        .length
    ).toBeGreaterThan(0);
  });
});

describe('validarCampanha — composição miolo compartilhado + segmento', () => {
  it('payload válido → sem erros', () => {
    expect(validarCampanha(inputValido)).toEqual([]);
  });

  it('herda RN-134 do miolo: push com 161 chars acusa', () => {
    expect(
      validarCampanha({ ...inputValido, conteudo: 'x'.repeat(161) }).some(
        (e) => e.includes('RN-134')
      )
    ).toBe(true);
  });

  it('herda RN-135 do miolo: capa sem email acusa', () => {
    expect(
      validarCampanha({
        ...inputValido,
        capaUrl: 'https://cdn/capa.png',
      }).some((e) => e.includes('RN-135'))
    ).toBe(true);
  });

  it('segmento ausente acusa', () => {
    expect(
      validarCampanha({ ...inputValido, segmento: null }).some((e) =>
        e.includes('segmento')
      )
    ).toBe(true);
  });
});

describe('parseCampanha — fail-fast', () => {
  const ts = { seconds: 1, nanoseconds: 0, toDate: () => new Date(0), toMillis: () => 0 };
  const docValido: Record<string, unknown> = {
    tenantId: 'castelo-producoes',
    titulo: 'Kit pronto para retirada',
    conteudo: 'Seu kit está disponível para retirada no balcão.',
    canal: ['push', 'email'],
    origem: 'manual',
    status: 'rascunho',
    segmento: { tipo: 'por_kit', referencia: 'kit_ouro', tamanhoEstimado: 48 },
    alcance: 0,
    criadoEm: ts,
    atualizadoEm: ts,
  };

  it('round-trip de doc válido', () => {
    const c = parseCampanha('camp-1', docValido);
    expect(c.id).toBe('camp-1');
    expect(c.segmento.referencia).toBe('kit_ouro');
    expect(c.segmento.tamanhoEstimado).toBe(48);
    expect(c.alcance).toBe(0);
  });

  it('enviado válido carrega enviadoEm + alcance', () => {
    const c = parseCampanha('camp-2', {
      ...docValido,
      status: 'enviado',
      enviadoEm: ts,
      alcance: 48,
    });
    expect(c.status).toBe('enviado');
    expect(c.alcance).toBe(48);
  });

  it('REJEITA aberturasPct (corte 4 — deferido da V1)', () => {
    expect(() =>
      parseCampanha('camp-x', { ...docValido, aberturasPct: 54 })
    ).toThrow(/aberturasPct/);
  });

  it('REJEITA enviado sem carimbo e carimbo sem enviado', () => {
    expect(() =>
      parseCampanha('camp-x', { ...docValido, status: 'enviado' })
    ).toThrow(/enviadoEm/);
    expect(() =>
      parseCampanha('camp-x', { ...docValido, enviadoEm: ts })
    ).toThrow(/enviadoEm/);
  });

  it('REJEITA alcance > 0 sem envio (∑ é da Function)', () => {
    expect(() =>
      parseCampanha('camp-x', { ...docValido, alcance: 10 })
    ).toThrow(/alcance/);
  });

  it('REJEITA agendado sem agendadoPara', () => {
    expect(() =>
      parseCampanha('camp-x', { ...docValido, status: 'agendado' })
    ).toThrow(/agendadoPara/);
  });

  it('REJEITA capa sem canal email (RN-135)', () => {
    expect(() =>
      parseCampanha('camp-x', {
        ...docValido,
        canal: ['push'],
        capaUrl: 'https://cdn/capa.png',
      })
    ).toThrow(/RN-135/);
  });

  it('REJEITA segmento fora da taxonomia (por_engajamento — corte 5)', () => {
    expect(() =>
      parseCampanha('camp-x', {
        ...docValido,
        segmento: { tipo: 'por_engajamento', referencia: '7d' },
      })
    ).toThrow(/segmento/);
  });

  it('REJEITA canal duplicado e status fora do enum', () => {
    expect(() =>
      parseCampanha('camp-x', { ...docValido, canal: ['push', 'push'] })
    ).toThrow(/canal/);
    expect(() =>
      parseCampanha('camp-x', { ...docValido, status: 'enviada' })
    ).toThrow(/status/); // código feminino NÃO é código de dado (item 9)
  });
});
