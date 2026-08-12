// =============================================================================
// Puros da SubNav da ficha do tenant (ADMIN-VISAO onda 2 · S1612-T1).
//
// O caso que justifica o módulo existir é o do prefixo: `startsWith` sobre a
// string inteira casaria a ficha do tenant `abc` com a do `abc-2` e acenderia
// aba de vizinho. A regra é o PRIMEIRO segmento depois da base.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  ABAS_DA_FICHA,
  abaAtivaDoPath,
  caminhoDaAba,
  caminhoDaFicha,
  precisaDeFaixaDeIdentidade,
} from '../fichaSubnav';

const TID = 'castelo-producoes';

describe('ABAS_DA_FICHA', () => {
  it('tem as sete abas que a spec nomeou, na ordem dela', () => {
    expect(ABAS_DA_FICHA.map((a) => a.id)).toEqual([
      'resumo',
      'eventos',
      'clubs',
      'clientes',
      'vendas',
      'financeiro',
      'termos',
    ]);
  });

  it('só o Resumo tem segmento vazio — ele é a rota índice', () => {
    const semSegmento = ABAS_DA_FICHA.filter((a) => a.segmento === '');
    expect(semSegmento.map((a) => a.id)).toEqual(['resumo']);
  });

  it('não repete segmento entre abas', () => {
    const segmentos = ABAS_DA_FICHA.map((a) => a.segmento);
    expect(new Set(segmentos).size).toBe(segmentos.length);
  });
});

describe('caminhoDaAba', () => {
  it('o Resumo devolve a própria ficha, sem barra no fim', () => {
    const resumo = ABAS_DA_FICHA[0]!;
    expect(caminhoDaAba(TID, resumo)).toBe(`/plataforma/tenants/${TID}`);
    expect(caminhoDaAba(TID, resumo).endsWith('/')).toBe(false);
  });

  it('as demais penduram o segmento na base', () => {
    for (const aba of ABAS_DA_FICHA.filter((a) => a.segmento !== '')) {
      expect(caminhoDaAba(TID, aba)).toBe(`${caminhoDaFicha(TID)}/${aba.segmento}`);
    }
  });
});

describe('abaAtivaDoPath', () => {
  it('a base é o Resumo', () => {
    expect(abaAtivaDoPath(`/plataforma/tenants/${TID}`, TID)).toBe('resumo');
  });

  it('a base com barra no fim continua sendo o Resumo', () => {
    expect(abaAtivaDoPath(`/plataforma/tenants/${TID}/`, TID)).toBe('resumo');
  });

  it.each([
    ['eventos', 'eventos'],
    ['clubs', 'clubs'],
    ['clientes', 'clientes'],
    ['vendas', 'vendas'],
    ['financeiro', 'financeiro'],
    ['termos', 'termos'],
  ])('o segmento %s acende a aba %s', (segmento, esperada) => {
    expect(abaAtivaDoPath(`/plataforma/tenants/${TID}/${segmento}`, TID)).toBe(esperada);
  });

  it('ignora o que vier depois do primeiro segmento', () => {
    expect(abaAtivaDoPath(`/plataforma/tenants/${TID}/vendas/xyz/123`, TID)).toBe('vendas');
  });

  it('segmento desconhecido cai no Resumo — a barra nunca fica sem aba acesa', () => {
    expect(abaAtivaDoPath(`/plataforma/tenants/${TID}/inventado`, TID)).toBe('resumo');
  });

  it('NÃO acende aba de tenant vizinho com id de mesmo prefixo', () => {
    // `/plataforma/tenants/castelo-producoes-2/vendas` não é aba nenhuma DESTA
    // ficha — casar por prefixo de string acenderia "Vendas" na ficha errada.
    expect(abaAtivaDoPath(`/plataforma/tenants/${TID}-2/vendas`, TID)).toBe('resumo');
  });

  it('caminho de fora da ficha cai no Resumo em vez de estourar', () => {
    expect(abaAtivaDoPath('/plataforma/eventos', TID)).toBe('resumo');
  });
});

describe('precisaDeFaixaDeIdentidade', () => {
  it('o Resumo não precisa — ele já tem o próprio cabeçalho no ar', () => {
    expect(precisaDeFaixaDeIdentidade('resumo')).toBe(false);
  });

  it('todas as outras precisam — tabela sem o nome do tenant é tabela de ninguém', () => {
    for (const aba of ABAS_DA_FICHA.filter((a) => a.id !== 'resumo')) {
      expect(precisaDeFaixaDeIdentidade(aba.id)).toBe(true);
    }
  });
});
