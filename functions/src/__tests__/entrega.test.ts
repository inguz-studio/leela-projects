/**
 * entrega.test.ts — LEELA-S204-T2 (unit)
 *
 * Regras puras do balcão (core/eventos/entrega.ts):
 *   - derivação de passos (RN-205/207)
 *   - elegibilidade de atendimento e presença
 *   - normalização/classificação de chip (RN-203/206)
 */
import { describe, expect, it } from 'vitest';
import {
  CHIP_MAX_LENGTH,
  classificarVinculoChip,
  derivarPassosBalcao,
  exigeChipParaFechar,
  normalizarChip,
  podeAtender,
  presencaRegistrada,
} from '@leela/core';
import type { Timestamp } from '@leela/core';

describe('derivarPassosBalcao (RN-205/207)', () => {
  it('evento com chip: kit → chip → checkin', () => {
    expect(derivarPassosBalcao('kit_prata', true)).toEqual({
      passos: ['kit', 'chip', 'checkin'],
      kitJaConcluido: false,
    });
  });

  it('usaChip=false SUPRIME o passo de chip (RN-207)', () => {
    expect(derivarPassosBalcao('kit_prata', false).passos).toEqual([
      'kit',
      'checkin',
    ]);
  });

  it('sem_kit: passo de kit já abre concluído (§2.9 estado sem-kit)', () => {
    const plano = derivarPassosBalcao('sem_kit', true);
    expect(plano.kitJaConcluido).toBe(true);
    expect(plano.passos).toEqual(['kit', 'chip', 'checkin']);
  });

  it('sem_kit em evento sem chip: só kit(concluído) + checkin', () => {
    expect(derivarPassosBalcao('sem_kit', false)).toEqual({
      passos: ['kit', 'checkin'],
      kitJaConcluido: true,
    });
  });
});

describe('podeAtender / presencaRegistrada (RN-205)', () => {
  it('só confirmado é atendido; pendente e cancelado não', () => {
    expect(podeAtender({ status: 'confirmado' })).toBe(true);
    expect(podeAtender({ status: 'pendente' })).toBe(false);
    expect(podeAtender({ status: 'cancelado' })).toBe(false);
  });

  it('presença = checkinEm carimbado', () => {
    // checkinEm ausente (exactOptionalPropertyTypes: ausência, não undefined)
    expect(presencaRegistrada({})).toBe(false);
    expect(
      presencaRegistrada({ checkinEm: { seconds: 1 } as unknown as Timestamp })
    ).toBe(true);
  });
});

describe('exigeChipParaFechar (RN-206/207)', () => {
  it('evento com chip exige chip vinculado — inclusive sem_kit', () => {
    expect(exigeChipParaFechar(true, { chipNumero: null })).toBe(true);
    expect(exigeChipParaFechar(true, { chipNumero: 'CHIP-1' })).toBe(false);
  });

  it('evento sem chip nunca exige (RN-207)', () => {
    expect(exigeChipParaFechar(false, { chipNumero: null })).toBe(false);
  });
});

describe('normalizarChip (RN-203 — input manual/leitor USB)', () => {
  it('apara, sobe caixa e aceita alfanumérico+hífen', () => {
    expect(normalizarChip('  chip-8891 ')).toBe('CHIP-8891');
    expect(normalizarChip('A1B2C3')).toBe('A1B2C3');
  });

  it('rejeita vazio, não-string, chars inválidos e comprimento >32', () => {
    expect(normalizarChip('')).toBeNull();
    expect(normalizarChip('   ')).toBeNull();
    expect(normalizarChip(8891)).toBeNull();
    expect(normalizarChip(null)).toBeNull();
    expect(normalizarChip('chip 8891')).toBeNull(); // espaço interno
    expect(normalizarChip('chip;drop')).toBeNull();
    expect(normalizarChip('a'.repeat(CHIP_MAX_LENGTH + 1))).toBeNull();
    expect(normalizarChip('a'.repeat(CHIP_MAX_LENGTH))).toBe(
      'A'.repeat(CHIP_MAX_LENGTH)
    );
  });
});

describe('classificarVinculoChip (RN-206)', () => {
  it('livre / já do inscrito / conflito', () => {
    expect(classificarVinculoChip(null, 'insc-1')).toEqual({ tipo: 'livre' });
    expect(classificarVinculoChip('insc-1', 'insc-1')).toEqual({
      tipo: 'ja_do_inscrito',
    });
    expect(classificarVinculoChip('insc-2', 'insc-1')).toEqual({
      tipo: 'conflito',
      ocupanteId: 'insc-2',
    });
  });
});
