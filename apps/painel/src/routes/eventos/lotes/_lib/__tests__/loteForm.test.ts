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

describe('datetime-local ↔ Date/Timestamp (PINADO em FUSO_EVENTO — review S300-T4 #2)', () => {
  it('interpreta a parede em America/Sao_Paulo, independente do fuso do runtime', () => {
    // 10:00 na parede de SP = 13:00Z (UTC-3, sem DST desde 2019).
    expect(inputLocalParaDate('2026-07-12T10:00')!.toISOString()).toBe(
      '2026-07-12T13:00:00.000Z',
    );
    // Inversa: 13:00Z exibe 10:00 no input, seja o navegador de onde for.
    expect(dateParaInputLocal(new Date('2026-07-12T13:00:00Z'))).toBe('2026-07-12T10:00');
  });

  it('rollover: 23:59 BRT cruza para o dia seguinte em UTC sem deslocar a parede', () => {
    const d = inputLocalParaDate('2026-04-26T23:59')!;
    expect(d.toISOString()).toBe('2026-04-27T02:59:00.000Z');
    expect(dateParaInputLocal(d)).toBe('2026-04-26T23:59');
  });

  it('formata e reparte o mesmo instante (round-trip sem perda de minuto)', () => {
    const s = '2026-02-01T14:30';
    const d = inputLocalParaDate(s)!;
    expect(dateParaInputLocal(d)).toBe(s);
    expect(inputLocalParaDate(dateParaInputLocal(d))!.getTime()).toBe(d.getTime());
  });

  it('rejeita shape/calendário inválido', () => {
    expect(inputLocalParaDate('')).toBeNull();
    expect(inputLocalParaDate('2026-02-30T10:00')).toBeNull();
    expect(inputLocalParaDate('2026-02-01T24:00')).toBeNull();
    expect(inputLocalParaDate('2026-02-01 10:00')).toBeNull();
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
    if (r.ok && 'preco' in r.input) {
      expect(r.input.preco).toBe(75);
      expect(r.input.ordem).toBe(2);
      expect(r.input.modalidade).toBe('5k');
    } else {
      expect.fail('esperava payload completo (lote sem venda)');
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

describe('lote VENDIDO — payload SÓ-NOME (RN-200/300 · review S300-T4 #1)', () => {
  const vendido = mkLote({ modalidade: '5k', ordem: 1, vendidos: 42 });
  const values: LoteFormValues = {
    nome: 'Lote 1 renomeado',
    ordem: String(vendido.ordem),
    inicioEm: timestampParaInputLocal(vendido.inicioEm),
    fimEm: timestampParaInputLocal(vendido.fimEm),
    quantidadeLimite: String(vendido.quantidadeLimite),
    preco: '60,00',
  };

  it('payload de edição de lote vendido contém SÓ `nome` — nada de preco/janela/vaga/ordem', () => {
    const r = validarFormLote({
      values,
      modalidade: '5k',
      loteId: vendido.id,
      lotesDoEvento: [vendido],
      congelado: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input).toEqual({ nome: 'Lote 1 renomeado' });
      expect(Object.keys(r.input)).toEqual(['nome']);
    }
  });

  it('rename não é refém dos campos congelados: janela/preço ilegíveis não bloqueiam', () => {
    // Campos comerciais corrompidos/ilegíveis no form (disabled na UI) — o
    // caminho congelado nem os olha; só o nome importa.
    const r = validarFormLote({
      values: { ...values, preco: 'abc', inicioEm: '', fimEm: '', ordem: '0' },
      modalidade: '5k',
      loteId: vendido.id,
      lotesDoEvento: [vendido],
      congelado: true,
    });
    expect(r.ok).toBe(true);
  });

  it('nome vazio segue rejeitado mesmo congelado', () => {
    const r = validarFormLote({
      values: { ...values, nome: '   ' },
      modalidade: '5k',
      loteId: vendido.id,
      lotesDoEvento: [vendido],
      congelado: true,
    });
    expect(r.ok).toBe(false);
  });
});
