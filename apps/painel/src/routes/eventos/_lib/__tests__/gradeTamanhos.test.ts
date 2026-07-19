// =============================================================================
// gradeTamanhos — derivações puras da grade (RN-231/232 · TAMANHOS-GRADE):
// rótulo do sufixo de SKU e ENTREGAS por corte×tamanho (fulfillment do balcão).
// =============================================================================

import { describe, it, expect } from 'vitest';
import { mkInscrito, ts } from '../../_test/fixtures';
import { entregasPorSku, rotuloSufixo } from '../gradeTamanhos';

const AGORA = ts(new Date('2026-04-27T09:00:00Z'));

describe('rotuloSufixo (RN-231)', () => {
  it('sufixo bare (unissex/legado) mostra só o tamanho; corte prefixa o rótulo', () => {
    expect(rotuloSufixo('M')).toBe('M');
    expect(rotuloSufixo('feminina__M')).toBe('Feminina M');
    expect(rotuloSufixo('masculina__GG')).toBe('Masculina GG');
  });

  it('sufixo malformado ecoa cru (a UI não esconde dado do servidor)', () => {
    expect(rotuloSufixo('unissex__M')).toBe('unissex__M');
    expect(rotuloSufixo('juvenil__M')).toBe('juvenil__M');
  });
});

describe('entregasPorSku (RN-232·e — entregues vs pendentes por SKU)', () => {
  it('conta entregue (presença registrada) vs pendente, por corte×tamanho', () => {
    const mapa = entregasPorSku([
      mkInscrito({ id: '1', status: 'confirmado', checkinEm: AGORA, tamanhos: { camiseta: 'feminina__M' } }),
      mkInscrito({ id: '2', status: 'confirmado', tamanhos: { camiseta: 'feminina__M' } }),
      mkInscrito({ id: '3', status: 'confirmado', checkinEm: AGORA, tamanhos: { camiseta: 'G' } }),
    ]);
    expect(mapa.get('camiseta__feminina__M')).toEqual({ entregues: 1, pendentes: 1 });
    expect(mapa.get('camiseta__G')).toEqual({ entregues: 1, pendentes: 0 }); // legado 2-seg
  });

  it('só CONFIRMADO conta; sufixo malformado é pulado (nunca inventa SKU)', () => {
    const mapa = entregasPorSku([
      mkInscrito({ id: '1', status: 'pendente', tamanhos: { camiseta: 'feminina__M' } }),
      mkInscrito({ id: '2', status: 'estornado', tamanhos: { camiseta: 'feminina__M' } }),
      mkInscrito({ id: '3', status: 'confirmado', tamanhos: { camiseta: 'unissex__M' } }),
    ]);
    expect(mapa.size).toBe(0);
  });
});
