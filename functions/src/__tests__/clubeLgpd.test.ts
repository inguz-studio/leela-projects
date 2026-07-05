/**
 * clubeLgpd.test.ts — LEELA-E05 · S110-T2 (unit puro, sem Emulator)
 *
 * Helpers LGPD de deleteClube/exportClubeData (RN-144):
 *   - calcularExpiracaoRetencao: exatamente 90 dias em ms (estável em DST);
 *   - chaveSnapshot: bijetiva (caminhos distintos nunca colidem) e decodável;
 *   - assertInputClubeLgpd: fronteira de input do servidor;
 *   - retencaoDisponivel: janela fecha EXATAMENTE em expiraEm.
 */
import { describe, expect, it } from 'vitest';
import { https } from 'firebase-functions/v1';
import {
  RETENCAO_LGPD_DIAS,
  assertInputClubeLgpd,
  calcularExpiracaoRetencao,
  chaveSnapshot,
} from '../clubs/deleteClube';
import { retencaoDisponivel } from '../clubs/exportClubeData';

describe('calcularExpiracaoRetencao (RN-144)', () => {
  it('expira exatamente 90 dias (em ms) após a exclusão', () => {
    const deletadoEm = new Date('2026-07-04T21:00:00.000Z');
    const expiraEm = calcularExpiracaoRetencao(deletadoEm);
    expect(RETENCAO_LGPD_DIAS).toBe(90);
    expect(expiraEm.getTime() - deletadoEm.getTime()).toBe(
      90 * 24 * 60 * 60 * 1000
    );
    expect(expiraEm.toISOString()).toBe('2026-10-02T21:00:00.000Z');
  });

  it('não muta a data de entrada', () => {
    const deletadoEm = new Date('2026-01-01T00:00:00.000Z');
    calcularExpiracaoRetencao(deletadoEm);
    expect(deletadoEm.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('chaveSnapshot', () => {
  it('é decodável de volta ao caminho original (bijetiva)', () => {
    const caminhos = [
      'membros/m1',
      'desafios/d1/acoes/a1',
      'parcerias/p1/conversoes/c1',
      'convites/ana@leela.com.br',
    ];
    for (const caminho of caminhos) {
      expect(decodeURIComponent(chaveSnapshot(caminho))).toBe(caminho);
    }
  });

  it('caminhos distintos nunca colidem (barra não é ambígua)', () => {
    // Sem encoding, 'a/b%2Fc' e 'a/b/c' poderiam colidir em esquemas ingênuos.
    const a = chaveSnapshot('desafios/d1/acoes/a1');
    const b = chaveSnapshot('desafios/d1%2Facoes/a1');
    expect(a).not.toBe(b);
  });

  it('não contém "/" — sempre é um docId válido de uma única coleção', () => {
    expect(chaveSnapshot('desafios/d1/acoes/a1')).not.toContain('/');
  });
});

describe('assertInputClubeLgpd (fronteira do servidor)', () => {
  it('aceita { clubeId } válido e devolve só o clubeId', () => {
    expect(assertInputClubeLgpd({ clubeId: 'clube-x', extra: 1 })).toEqual({
      clubeId: 'clube-x',
    });
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['sem clubeId', {}],
    ['clubeId vazio', { clubeId: '' }],
    ['clubeId não-string', { clubeId: 42 }],
  ])('rejeita %s com invalid-argument', (_rotulo, raw) => {
    try {
      assertInputClubeLgpd(raw);
      expect.unreachable('esperava invalid-argument');
    } catch (err) {
      expect(err).toBeInstanceOf(https.HttpsError);
      expect((err as https.HttpsError).code).toBe('invalid-argument');
    }
  });
});

describe('retencaoDisponivel (guard 90d — RN-144)', () => {
  const expiraEm = new Date('2026-10-02T21:00:00.000Z');

  it('disponível 1ms antes de expirar', () => {
    expect(retencaoDisponivel(expiraEm, new Date(expiraEm.getTime() - 1))).toBe(
      true
    );
  });

  it('indisponível NO instante exato de expiraEm (janela fechada)', () => {
    expect(retencaoDisponivel(expiraEm, expiraEm)).toBe(false);
  });

  it('indisponível depois de expirar', () => {
    expect(retencaoDisponivel(expiraEm, new Date(expiraEm.getTime() + 1))).toBe(
      false
    );
  });
});
