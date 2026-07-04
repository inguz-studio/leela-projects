/**
 * membroCore.test.ts — LEELA-S103-T1
 *
 * Unit (puro, sem Emulator): derivação de status do membro (RN-102) e
 * definição do agregado ∑ (contaComoAtivo) em @leela/core.
 *
 * RN-102:
 *   novo    — entrou há MENOS de 7 dias (estrito);
 *   inativo — sem atividade há 30 dias OU MAIS (inclusivo);
 *   ativo   — caso contrário.
 */
import { describe, expect, it } from 'vitest';
import {
  MEMBRO_INATIVO_DIAS,
  MEMBRO_NOVO_DIAS,
  contaComoAtivo,
  derivarStatus,
} from '@leela/core';

const DIA_MS = 24 * 60 * 60 * 1000;
const HOJE = new Date('2026-07-04T12:00:00Z');

/** Data N dias antes de HOJE (aceita fração de dia). */
function diasAtras(n: number): Date {
  return new Date(HOJE.getTime() - n * DIA_MS);
}

describe('derivarStatus (RN-102)', () => {
  describe('novo — entrou há menos de 7 dias', () => {
    it('entrou há 1 dia → novo', () => {
      expect(derivarStatus(diasAtras(1), null, HOJE)).toBe('novo');
    });

    it('entrou agora mesmo → novo', () => {
      expect(derivarStatus(HOJE, null, HOJE)).toBe('novo');
    });

    it('entrou há 6.99 dias → ainda novo (limiar estrito)', () => {
      expect(derivarStatus(diasAtras(6.99), null, HOJE)).toBe('novo');
    });

    it('entrou há EXATOS 7 dias → já NÃO é novo (vira ativo)', () => {
      expect(derivarStatus(diasAtras(7), null, HOJE)).toBe('ativo');
    });

    it('novo tem precedência sobre inativo (dados anômalos: atividade antiga)', () => {
      // entrou há 3 dias mas registra "última atividade" há 60 (lixo herdado)
      expect(derivarStatus(diasAtras(3), diasAtras(60), HOJE)).toBe('novo');
    });
  });

  describe('inativo — 30+ dias sem atividade', () => {
    it('última atividade há EXATOS 30 dias → inativo (limiar inclusivo)', () => {
      expect(derivarStatus(diasAtras(120), diasAtras(30), HOJE)).toBe('inativo');
    });

    it('última atividade há 29.9 dias → ainda ativo', () => {
      expect(derivarStatus(diasAtras(120), diasAtras(29.9), HOJE)).toBe('ativo');
    });

    it('última atividade há 60 dias → inativo', () => {
      expect(derivarStatus(diasAtras(120), diasAtras(60), HOJE)).toBe('inativo');
    });

    it('sem NENHUMA atividade registrada, entrada conta como atividade: 40 dias de casa → inativo', () => {
      expect(derivarStatus(diasAtras(40), null, HOJE)).toBe('inativo');
    });

    it('sem atividade registrada mas só 10 dias de casa → ativo (não inativa antes de 30d)', () => {
      expect(derivarStatus(diasAtras(10), null, HOJE)).toBe('ativo');
    });

    it('undefined equivale a null para ultimaAtividadeEm', () => {
      expect(derivarStatus(diasAtras(40), undefined, HOJE)).toBe('inativo');
    });
  });

  describe('ativo — caso contrário', () => {
    it('membro de 90 dias com atividade há 3 → ativo', () => {
      expect(derivarStatus(diasAtras(90), diasAtras(3), HOJE)).toBe('ativo');
    });

    it('membro antigo com atividade hoje → ativo', () => {
      expect(derivarStatus(diasAtras(900), HOJE, HOJE)).toBe('ativo');
    });
  });

  describe('constantes canônicas', () => {
    it('limiares RN-102: 7 dias (novo) e 30 dias (inativo)', () => {
      expect(MEMBRO_NOVO_DIAS).toBe(7);
      expect(MEMBRO_INATIVO_DIAS).toBe(30);
    });
  });
});

describe('contaComoAtivo (∑ qtdMembrosAtivos)', () => {
  it('ativo conta', () => {
    expect(contaComoAtivo('ativo')).toBe(true);
  });

  it('novo conta (recém-chegado entra no KPI)', () => {
    expect(contaComoAtivo('novo')).toBe(true);
  });

  it('inativo NÃO conta', () => {
    expect(contaComoAtivo('inativo')).toBe(false);
  });
});
