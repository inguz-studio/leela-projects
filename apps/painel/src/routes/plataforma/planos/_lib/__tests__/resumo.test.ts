import { describe, it, expect } from 'vitest';
import { CHAVES_TABELA_PARCELAS, type TabelaTaxasParcela } from '@leela/core';
import { planoIdFromNome, resumoTabelaParcelas } from '../resumo';

function tabela(fn: (chave: string, i: number) => number): TabelaTaxasParcela {
  const t: TabelaTaxasParcela = {};
  CHAVES_TABELA_PARCELAS.forEach((chave, i) => {
    t[chave] = fn(chave, i);
  });
  return t;
}

describe('resumoTabelaParcelas', () => {
  it('trata tabela ausente como "—"', () => {
    expect(resumoTabelaParcelas(undefined)).toBe('—');
    expect(resumoTabelaParcelas(null)).toBe('—');
    expect(resumoTabelaParcelas({})).toBe('—');
  });

  it('mostra "Sem taxa" quando toda a tabela é 0', () => {
    expect(resumoTabelaParcelas(tabela(() => 0))).toBe('Sem taxa');
  });

  it('mostra valor único quando todas as parcelas têm a mesma taxa', () => {
    expect(resumoTabelaParcelas(tabela(() => 2.5))).toBe('2,5% em 2x-12x');
  });

  it('mostra faixa min-max quando as taxas variam', () => {
    const t = tabela((_chave, i) => i + 1); // 1..11
    expect(resumoTabelaParcelas(t)).toBe('1%-11% (2x-12x)');
  });
});

describe('planoIdFromNome', () => {
  it('deriva slug kebab-case sem acentos', () => {
    expect(planoIdFromNome('Promoção Agressiva')).toBe('promocao-agressiva');
  });

  it('colapsa separadores e apara as pontas', () => {
    expect(planoIdFromNome('  Plano   Padrão!  ')).toBe('plano-padrao');
  });
});
