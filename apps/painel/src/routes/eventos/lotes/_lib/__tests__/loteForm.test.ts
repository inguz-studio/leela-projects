import { describe, it, expect } from 'vitest';
import type { Lote } from '@leela/core';
import { ts } from '../../../_test/fixtures';
import {
  arredondarCentavos,
  dateParaInputLocal,
  estadoLoteBadge,
  inputLocalParaDate,
  loteImutavel,
  parsePrecoReais,
  proximaOrdem,
  timestampParaInputLocal,
  validarFormLote,
  type LoteFormValues,
} from '../loteForm';

/** Constrói um Lote de teste. Datas via datetime-local → parse LOCAL (mesmo
 *  caminho do form) para que a comparação por toMillis seja tz-consistente. */
function mkLote(over: Partial<Lote> & { modalidade: string; ordem: number }): Lote {
  const inicioEm = over.inicioEm ?? ts(inputLocalParaDate('2025-12-01T00:00')!);
  const fimEm = over.fimEm ?? ts(inputLocalParaDate('2026-02-01T00:00')!);
  return {
    id: `${over.modalidade}-lote-${over.ordem}`,
    tenantId: 'castelo',
    nome: `Lote ${over.ordem}`,
    quantidadeLimite: 300,
    preco: 60,
    vendidos: 0,
    criadoEm: ts(new Date('2025-11-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2025-11-01T00:00:00Z')),
    ...over,
    inicioEm,
    fimEm,
  };
}

describe('parsePrecoReais + arredondarCentavos (money-config cent-exato)', () => {
  it('aceita vírgula e ponto e arredonda ao centavo', () => {
    expect(parsePrecoReais('99,90')).toBe(99.9);
    expect(parsePrecoReais('99.90')).toBe(99.9);
    expect(parsePrecoReais('120')).toBe(120);
  });

  it('arredonda sub-centavo (condição de moneyCentExato na Rule)', () => {
    expect(arredondarCentavos(99.999)).toBe(100);
    expect(arredondarCentavos(99.994)).toBe(99.99);
    expect(parsePrecoReais('99,999')).toBe(100);
  });

  it('rejeita negativo e não-numérico', () => {
    expect(parsePrecoReais('-5')).toBeNull();
    expect(parsePrecoReais('abc')).toBeNull();
    expect(parsePrecoReais('')).toBeNull();
  });
});

describe('datetime-local ↔ Date/Timestamp (round-trip)', () => {
  it('formata e reparte o mesmo instante local', () => {
    const d = new Date(2026, 1, 1, 14, 30); // 01/fev/2026 14:30 local
    const s = dateParaInputLocal(d);
    expect(s).toBe('2026-02-01T14:30');
    expect(inputLocalParaDate(s)!.getTime()).toBe(d.getTime());
  });

  it('timestampParaInputLocal devolve vazio quando ausente', () => {
    expect(timestampParaInputLocal(null)).toBe('');
    expect(timestampParaInputLocal(undefined)).toBe('');
  });
});

describe('loteImutavel + proximaOrdem', () => {
  it('lote com venda é imutável (RN-200/300)', () => {
    expect(loteImutavel({ vendidos: 1 })).toBe(true);
    expect(loteImutavel({ vendidos: 0 })).toBe(false);
  });

  it('proximaOrdem = max + 1 (mínimo 1)', () => {
    expect(proximaOrdem([{ ordem: 1 }, { ordem: 3 }])).toBe(4);
    expect(proximaOrdem([])).toBe(1);
  });
});

describe('estadoLoteBadge (derivação do kernel)', () => {
  const l1 = mkLote({
    modalidade: '5k',
    ordem: 1,
    inicioEm: ts(inputLocalParaDate('2025-12-01T00:00')!),
    fimEm: ts(inputLocalParaDate('2026-02-01T00:00')!),
    quantidadeLimite: 150,
    vendidos: 150, // esgotado
  });
  const l2 = mkLote({
    modalidade: '5k',
    ordem: 2,
    inicioEm: ts(inputLocalParaDate('2026-02-01T00:00')!),
    fimEm: ts(inputLocalParaDate('2026-04-01T00:00')!),
    quantidadeLimite: 300,
    vendidos: 120,
  });
  const grupo = [l1, l2];
  const agora = inputLocalParaDate('2026-03-01T00:00')!;

  it('marca o lote ativo (vitoria) e o esgotado (vulcao)', () => {
    expect(estadoLoteBadge(l2, grupo, agora)).toEqual({ label: 'Ativo', variant: 'vitoria' });
    expect(estadoLoteBadge(l1, grupo, agora)).toEqual({ label: 'Esgotado', variant: 'vulcao' });
  });
});

describe('validarFormLote (shape do core + invariante cross-lote)', () => {
  const l1 = mkLote({
    modalidade: '5k',
    ordem: 1,
    inicioEm: ts(inputLocalParaDate('2025-12-01T00:00')!),
    fimEm: ts(inputLocalParaDate('2026-02-01T00:00')!),
  });

  const base: LoteFormValues = {
    nome: 'Lote 2',
    ordem: '2',
    inicioEm: '2026-02-01T00:00',
    fimEm: '2026-04-01T00:00',
    quantidadeLimite: '300',
    preco: '75,00',
  };

  it('aceita um lote seguinte sem sobreposição', () => {
    const r = validarFormLote({ values: base, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.preco).toBe(75);
      expect(r.input.ordem).toBe(2);
      expect(r.input.modalidade).toBe('5k');
    }
  });

  it('rejeita janela sobreposta na modalidade (RN-300)', () => {
    const values = { ...base, inicioEm: '2026-01-15T00:00', fimEm: '2026-03-01T00:00' };
    const r = validarFormLote({ values, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/sobrepost/i);
  });

  it('rejeita ordem duplicada na modalidade (ADR-012)', () => {
    const values = { ...base, ordem: '1' };
    const r = validarFormLote({ values, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/ordem 1 duplicada/i);
  });

  it('rejeita fim ≤ início', () => {
    const values = { ...base, inicioEm: '2026-04-01T00:00', fimEm: '2026-02-01T00:00' };
    const r = validarFormLote({ values, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/depois do início/i);
  });

  it('rejeita preço inválido', () => {
    const values = { ...base, preco: 'abc' };
    const r = validarFormLote({ values, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/pre.o inv/i);
  });

  it('ao editar, exclui o próprio lote dos irmãos (não colide consigo)', () => {
    const values = { ...base, ordem: '1', inicioEm: '2025-12-01T00:00', fimEm: '2026-02-01T00:00' };
    const r = validarFormLote({ values, modalidade: '5k', loteId: l1.id, lotesDoEvento: [l1] });
    expect(r.ok).toBe(true);
  });
});
