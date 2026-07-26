import { describe, it, expect } from 'vitest';
import { avaliarSolicitacao, parseValorReais } from '../solicitarForm';

describe('parseValorReais', () => {
  it('parseia inteiros e decimais (ponto ou vírgula)', () => {
    expect(parseValorReais('8500')).toBe(8500);
    expect(parseValorReais('8500.50')).toBe(8500.5);
    expect(parseValorReais('1234,56')).toBe(1234.56);
    expect(parseValorReais('0')).toBe(0);
  });

  it('vazio/ilegível → null', () => {
    expect(parseValorReais('')).toBeNull();
    expect(parseValorReais('   ')).toBeNull();
    expect(parseValorReais('abc')).toBeNull();
  });
});

describe('avaliarSolicitacao (espelho de RN-352)', () => {
  it('vazio → não pode enviar, sem hint (nada digitado ainda)', () => {
    expect(avaliarSolicitacao('', 8500)).toEqual({ valor: null, podeEnviar: false, hint: null });
  });

  it('valor dentro do disponível → pode enviar', () => {
    const r = avaliarSolicitacao('5000', 8500);
    expect(r.podeEnviar).toBe(true);
    expect(r.valor).toBe(5000);
    expect(r.hint).toBeNull();
  });

  it('valor exatamente igual ao disponível → pode enviar', () => {
    expect(avaliarSolicitacao('8500', 8500).podeEnviar).toBe(true);
  });

  it('valor acima do disponível → bloqueado + hint (servidor reconfere)', () => {
    const r = avaliarSolicitacao('9000', 8500);
    expect(r.podeEnviar).toBe(false);
    expect(r.hint).toBe('O valor excede o disponível para saque.');
  });

  it('valor <= 0 → bloqueado + hint', () => {
    expect(avaliarSolicitacao('0', 8500).podeEnviar).toBe(false);
    expect(avaliarSolicitacao('-100', 8500).podeEnviar).toBe(false);
    expect(avaliarSolicitacao('0', 8500).hint).toBe('Informe um valor válido (maior que zero).');
  });
});
