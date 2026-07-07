import { describe, it, expect } from 'vitest';
import type { Inscrito, Kit } from '@leela/core';
import { matrizEstoque, resumoEstoque } from '../distribuicao';
import { mkInscrito, ts } from '../../_test/fixtures';

const AGORA = ts(new Date('2026-04-27T09:00:00Z'));

function mkKit(over: Partial<Kit>): Kit {
  return {
    id: 'kit_ouro',
    tenantId: 'castelo',
    nome: 'Kit Ouro',
    preco: 120,
    capacidade: 100,
    modalidades: ['21k'],
    criadoEm: ts(new Date()),
    atualizadoEm: ts(new Date()),
    ...over,
  };
}

const inscritos: Inscrito[] = [
  mkInscrito({ id: '1', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado', checkinEm: AGORA }),
  mkInscrito({ id: '2', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado' }),
  // não conta: cancelado
  mkInscrito({ id: '3', kit: 'kit_ouro', modalidade: '21k', status: 'cancelado', checkinEm: AGORA }),
];

describe('resumoEstoque', () => {
  it('soma capacidade e retiradas do dado real', () => {
    const r = resumoEstoque([mkKit({ capacidade: 100 })], inscritos);
    expect(r.totalCapacidade).toBe(100);
    expect(r.retirados).toBe(1); // só o confirmado com presença
    expect(r.disponiveis).toBe(99);
    expect(r.emRisco).toBe(0);
  });

  it('capacidade desconhecida → total/disponíveis null (não inventa denominador)', () => {
    const r = resumoEstoque([mkKit({ capacidade: 0 })], inscritos);
    expect(r.totalCapacidade).toBeNull();
    expect(r.disponiveis).toBeNull();
    expect(r.retirados).toBe(1); // retirada é real, independe de capacidade
  });

  it('conta kit esgotado como em risco', () => {
    const r = resumoEstoque([mkKit({ capacidade: 1 })], inscritos);
    expect(r.emRisco).toBe(1);
    expect(r.disponiveis).toBe(0);
  });
});

describe('matrizEstoque', () => {
  it('cruza kit × modalidade com confirmados e retirados', () => {
    const [linha] = matrizEstoque([mkKit({})], inscritos, ['5k', '21k']);
    expect(linha?.nome).toBe('Kit Ouro');
    const c21 = linha?.celulas.find((c) => c.modalidade === '21k');
    expect(c21).toMatchObject({ oferecido: true, confirmados: 2, retirados: 1 });
    const c5 = linha?.celulas.find((c) => c.modalidade === '5k');
    expect(c5).toMatchObject({ oferecido: false, confirmados: 0, retirados: 0 });
    expect(linha?.totalConfirmados).toBe(2);
    expect(linha?.totalRetirados).toBe(1);
    expect(linha?.saldo).toBe(99);
  });

  it('kit sem capacidade degrada saldo para null', () => {
    const [linha] = matrizEstoque([mkKit({ capacidade: 0 })], inscritos, ['21k']);
    expect(linha?.capacidade).toBeNull();
    expect(linha?.saldo).toBeNull();
    expect(linha?.esgotado).toBe(false);
  });

  it('reconcilia id de doc com hífen (kit-ouro) e enum com underscore (kit_ouro)', () => {
    // regressão do gap seed↔enum: sem a reconciliação, a demanda viria 0/0
    const [linha] = matrizEstoque([mkKit({ id: 'kit-ouro' })], inscritos, ['21k']);
    const c21 = linha?.celulas.find((c) => c.modalidade === '21k');
    expect(c21).toMatchObject({ confirmados: 2, retirados: 1 });
  });
});
