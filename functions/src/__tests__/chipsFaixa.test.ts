/**
 * chipsFaixa.test.ts — LEELA-FABLE-F-T1 (unit PURO, sem Emulator)
 *
 * Faixa/estoque de chips (core/eventos/faixaChips.ts):
 *   - guard e tamanho da faixa (fim ≥ início, pontas inclusivas)
 *   - ponte chip físico (string RN-203) → número do lote
 *   - chip órfão (regra canônica que a UI derivava inline) e fora-da-faixa
 *   - estoque DERIVADO dos vínculos reais (dedupe, cancelado devolve chip,
 *     esgotamento/quase-esgotamento)
 */
import { describe, expect, it } from 'vitest';
import {
  LIMIAR_CHIPS_ESGOTANDO,
  chipForaDaFaixa,
  chipOrfao,
  derivarEstoqueChips,
  isFaixaChips,
  numeroDoChip,
  tamanhoFaixaChips,
  type FaixaChips,
  type Timestamp,
} from '@leela/core';

const FAIXA: FaixaChips = { inicio: 8001, fim: 8600 };
const ts = { seconds: 1, nanoseconds: 0 } as unknown as Timestamp;

describe('isFaixaChips / tamanhoFaixaChips', () => {
  it('aceita faixa válida — inclusive faixa de UM chip (inicio == fim)', () => {
    expect(isFaixaChips(FAIXA)).toBe(true);
    expect(isFaixaChips({ inicio: 10, fim: 10 })).toBe(true);
    expect(isFaixaChips({ inicio: 0, fim: 5 })).toBe(true);
  });

  it('rejeita fim < início, floats, negativos e não-objeto', () => {
    expect(isFaixaChips({ inicio: 8600, fim: 8001 })).toBe(false);
    expect(isFaixaChips({ inicio: 8001.5, fim: 8600 })).toBe(false);
    expect(isFaixaChips({ inicio: -1, fim: 10 })).toBe(false);
    expect(isFaixaChips({ inicio: '8001', fim: 8600 })).toBe(false);
    expect(isFaixaChips(null)).toBe(false);
    expect(isFaixaChips([8001, 8600])).toBe(false);
  });

  it('tamanho conta as pontas (inclusivas)', () => {
    expect(tamanhoFaixaChips(FAIXA)).toBe(600);
    expect(tamanhoFaixaChips({ inicio: 10, fim: 10 })).toBe(1);
  });
});

describe('numeroDoChip — ponte código físico → número do lote', () => {
  it('extrai o número de códigos com prefixo e de códigos puros', () => {
    expect(numeroDoChip('CHIP-8891')).toBe(8891);
    expect(numeroDoChip('8891')).toBe(8891);
    // normaliza como o balcão (trim + uppercase — RN-203)
    expect(numeroDoChip('  chip-8891 ')).toBe(8891);
  });

  it('usa a ÚLTIMA corrida de dígitos (prefixo de lote não confunde)', () => {
    expect(numeroDoChip('A1B-0042')).toBe(42);
  });

  it('null para código sem dígitos, inválido (RN-203) ou null', () => {
    expect(numeroDoChip('ABC')).toBe(null);
    expect(numeroDoChip('CHIP@8891')).toBe(null); // caractere fora do formato
    expect(numeroDoChip('')).toBe(null);
    expect(numeroDoChip(null)).toBe(null);
  });
});

describe('chipForaDaFaixa', () => {
  it('dentro (pontas inclusivas) → false; fora → true', () => {
    expect(chipForaDaFaixa('CHIP-8001', FAIXA)).toBe(false);
    expect(chipForaDaFaixa('CHIP-8600', FAIXA)).toBe(false);
    expect(chipForaDaFaixa('CHIP-8000', FAIXA)).toBe(true);
    expect(chipForaDaFaixa('CHIP-8601', FAIXA)).toBe(true);
  });

  it('código sem componente numérico conta como fora (alerta, nunca finge)', () => {
    expect(chipForaDaFaixa('AVULSO', FAIXA)).toBe(true);
  });
});

describe('chipOrfao (RN-205/207 — retirou kit sem vincular chip)', () => {
  it('kit retirado + sem chip + evento usa chip → órfão', () => {
    expect(chipOrfao({ kitEntregueEm: ts, chipNumero: null }, true)).toBe(true);
  });

  it('com chip vinculado → não é órfão', () => {
    expect(chipOrfao({ kitEntregueEm: ts, chipNumero: 'CHIP-8123' }, true)).toBe(false);
  });

  it('kit ainda não retirado → não é órfão (nada pendente)', () => {
    expect(chipOrfao({ chipNumero: null }, true)).toBe(false);
  });

  it('usaChip=false suprime o conceito (RN-207)', () => {
    expect(chipOrfao({ kitEntregueEm: ts, chipNumero: null }, false)).toBe(false);
  });
});

describe('derivarEstoqueChips — estoque derivado dos vínculos reais', () => {
  it('conta distintos dentro da faixa; fora vai para foraDaFaixa', () => {
    const estoque = derivarEstoqueChips(
      [
        { chipNumero: 'CHIP-8001', status: 'confirmado' },
        { chipNumero: 'CHIP-8002', status: 'confirmado' },
        { chipNumero: 'CHIP-9999', status: 'confirmado' }, // fora da faixa
        { chipNumero: null, status: 'confirmado' }, // sem vínculo — não conta
      ],
      FAIXA
    );
    expect(estoque).toEqual({
      total: 600,
      vinculados: 2,
      disponiveis: 598,
      foraDaFaixa: 1,
      esgotado: false,
      quaseEsgotado: false,
    });
  });

  it('chip repetido conta UMA vez (conflito é assunto da RN-206)', () => {
    const estoque = derivarEstoqueChips(
      [
        { chipNumero: 'CHIP-8001', status: 'confirmado' },
        { chipNumero: 'CHIP-8001', status: 'confirmado' },
      ],
      FAIXA
    );
    expect(estoque.vinculados).toBe(1);
  });

  it('cancelado devolve o chip ao estoque (não conta)', () => {
    const estoque = derivarEstoqueChips(
      [
        { chipNumero: 'CHIP-8001', status: 'cancelado' },
        { chipNumero: 'CHIP-8002', status: 'pendente' },
      ],
      FAIXA
    );
    expect(estoque.vinculados).toBe(1); // só o pendente (ativo) conta
    expect(estoque.disponiveis).toBe(599);
  });

  it('esgotado quando todos os números da faixa estão vinculados', () => {
    const faixa: FaixaChips = { inicio: 1, fim: 2 };
    const estoque = derivarEstoqueChips(
      [
        { chipNumero: 'CHIP-1', status: 'confirmado' },
        { chipNumero: 'CHIP-2', status: 'confirmado' },
      ],
      faixa
    );
    expect(estoque.esgotado).toBe(true);
    expect(estoque.quaseEsgotado).toBe(false);
    expect(estoque.disponiveis).toBe(0);
  });

  it(`quaseEsgotado quando restam ≤ ${LIMIAR_CHIPS_ESGOTANDO * 100}% da faixa`, () => {
    const faixa: FaixaChips = { inicio: 1, fim: 10 };
    const nove = Array.from({ length: 9 }, (_, i) => ({
      chipNumero: `CHIP-${i + 1}`,
      status: 'confirmado' as const,
    }));
    const estoque = derivarEstoqueChips(nove, faixa);
    expect(estoque.disponiveis).toBe(1); // 10% restante — na borda do limiar
    expect(estoque.quaseEsgotado).toBe(true);
    expect(estoque.esgotado).toBe(false);

    const oito = derivarEstoqueChips(nove.slice(0, 8), faixa);
    expect(oito.quaseEsgotado).toBe(false); // 20% restante — acima do limiar
  });

  it('faixa vazia de vínculos → estoque cheio', () => {
    expect(derivarEstoqueChips([], FAIXA)).toEqual({
      total: 600,
      vinculados: 0,
      disponiveis: 600,
      foraDaFaixa: 0,
      esgotado: false,
      quaseEsgotado: false,
    });
  });
});
