// =============================================================================
// repasseForm — espelho client da guarda do repasse parcial (S705-T2 · RN-385).
// O foco é a fronteira: o que a tela deixa chegar ao servidor e o que ela para
// antes, com a MESMA régua (cent-exato · > 0 · ≤ saldo).
// =============================================================================
import { describe, it, expect } from 'vitest';
import {
  avaliarRepasse,
  parseValorRepasse,
  textoInicialRepasse,
} from '../repasseForm';

describe('parseValorRepasse', () => {
  it('lê ponto e vírgula como o mesmo decimal', () => {
    expect(parseValorRepasse('500.00')).toBe(500);
    expect(parseValorRepasse('500,50')).toBe(500.5);
  });

  it('NÃO arredonda: a terceira casa sobrevive para ser reprovada', () => {
    expect(parseValorRepasse('10,005')).toBe(10.005);
  });

  it('vazio e ilegível viram null', () => {
    expect(parseValorRepasse('')).toBeNull();
    expect(parseValorRepasse('   ')).toBeNull();
    expect(parseValorRepasse('abc')).toBeNull();
  });

  it('separador de milhar sobrevive: "1.234,56" é o repasse inteiro', () => {
    // FIX-PARSE-DINHEIRO: o `replace(',', '.')` registrava R$ 1,23 de repasse
    // ao influenciador e dava o resto por pago.
    expect(parseValorRepasse('1.234,56')).toBe(1234.56);
    expect(Math.round(parseValorRepasse('1.234,56')! * 100)).toBe(123456);
    expect(parseValorRepasse('R$ 1.234,56')).toBe(1234.56);
  });

  it('ponto ambíguo vira null — e o não-arredondar continua valendo', () => {
    expect(parseValorRepasse('1.500')).toBeNull();
    expect(parseValorRepasse('1.234,005')).toBe(1234.005);
  });
});

describe('textoInicialRepasse', () => {
  it('propõe o saldo integral com duas casas e vírgula (caminho de um clique)', () => {
    expect(textoInicialRepasse(1200)).toBe('1200,00');
    expect(textoInicialRepasse(700.5)).toBe('700,50');
  });

  it('o que ele propõe volta como o MESMO número pelo parse (ida e volta)', () => {
    for (const saldo of [1200, 700.5, 0.01, 999.99]) {
      expect(parseValorRepasse(textoInicialRepasse(saldo))).toBe(saldo);
    }
  });

  it('saldo não positivo não propõe nada', () => {
    expect(textoInicialRepasse(0)).toBe('');
    expect(textoInicialRepasse(-200)).toBe('');
  });
});

describe('avaliarRepasse', () => {
  it('parcial abaixo do saldo passa', () => {
    expect(avaliarRepasse('500', 1200)).toEqual({
      valor: 500,
      podeEnviar: true,
      hint: null,
    });
  });

  it('valor IGUAL ao saldo passa (o resto quita)', () => {
    expect(avaliarRepasse('700,00', 700).podeEnviar).toBe(true);
  });

  it('um centavo acima do saldo é barrado com o motivo certo', () => {
    const r = avaliarRepasse('700,01', 700);
    expect(r.podeEnviar).toBe(false);
    expect(r.hint).toContain('excede o saldo');
  });

  it('três casas decimais são barradas antes da chamada', () => {
    const r = avaliarRepasse('10,005', 700);
    expect(r.podeEnviar).toBe(false);
    expect(r.hint).toContain('duas casas decimais');
  });

  it('zero e negativo são barrados', () => {
    expect(avaliarRepasse('0', 700).hint).toContain('maior que zero');
    expect(avaliarRepasse('-5', 700).hint).toContain('maior que zero');
  });

  it('campo vazio não acusa erro antes da digitação', () => {
    expect(avaliarRepasse('', 700)).toEqual({
      valor: null,
      podeEnviar: false,
      hint: null,
    });
  });

  it('saldo negativo explica que dívida não se quita por registro', () => {
    const r = avaliarRepasse('50', -200);
    expect(r.podeEnviar).toBe(false);
    expect(r.hint).toContain('dívida');
  });

  it('saldo zero não oferece caminho', () => {
    expect(avaliarRepasse('50', 0).podeEnviar).toBe(false);
    expect(avaliarRepasse('50', 0).hint).toContain('Não há saldo');
  });
});
