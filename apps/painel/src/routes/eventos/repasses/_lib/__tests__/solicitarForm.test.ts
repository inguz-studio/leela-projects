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

  it('separador de milhar sobrevive: pede-se 1.234,56 e sai 1234,56', () => {
    // FIX-PARSE-DINHEIRO: o `replace(',', '.')` pedia R$ 1,23 de repasse.
    expect(parseValorReais('1.234,56')).toBe(1234.56);
    expect(Math.round(parseValorReais('1.234,56')! * 100)).toBe(123456);
    expect(parseValorReais('R$ 8.500,00')).toBe(8500);
  });

  it('ponto ambíguo vira null em vez de um pedido mil vezes menor', () => {
    expect(parseValorReais('1.500')).toBeNull();
    expect(parseValorReais('1e3')).toBeNull();
  });
});

// A assinatura antiga (texto, disponivelDoTenant) descrevia o mundo em que o
// evento era opcional e o único teto era o do tenant. A DEC-0727C encerrou os
// dois: o evento é obrigatório (RN-369) e o teto que manda é o DAQUELE evento
// (RN-368). As asserções trocadas ganharam substitutas mais fortes — cada uma
// prova qual dos dois tetos barrou, o que a versão anterior nem conseguia
// distinguir.
const CASTELO = 'meia-floripa-2026';

/** Caso base: evento com 8.500 liberados, tenant com folga. */
function av(texto: string, over: Partial<Parameters<typeof avaliarSolicitacao>[0]> = {}) {
  return avaliarSolicitacao({
    texto,
    eventoId: CASTELO,
    disponivelDoEvento: 8500,
    disponivelDoTenant: 17000,
    ...over,
  });
}

describe('avaliarSolicitacao (espelho de RN-352 + RN-368/369)', () => {
  it('vazio → não pode enviar, sem hint (nada digitado ainda)', () => {
    expect(av('')).toEqual({ valor: null, podeEnviar: false, hint: null });
  });

  it('valor dentro do disponível do evento → pode enviar', () => {
    const r = av('5000');
    expect(r.podeEnviar).toBe(true);
    expect(r.valor).toBe(5000);
    expect(r.hint).toBeNull();
  });

  it('valor exatamente igual ao disponível do evento → pode enviar', () => {
    expect(av('8500').podeEnviar).toBe(true);
  });

  it('valor acima do disponível DO EVENTO → bloqueado + hint (RN-368)', () => {
    const r = av('9000');
    expect(r.podeEnviar).toBe(false);
    expect(r.hint).toBe('O valor excede o disponível deste evento.');
  });

  it('valor <= 0 → bloqueado + hint', () => {
    expect(av('0').podeEnviar).toBe(false);
    expect(av('-100').podeEnviar).toBe(false);
    expect(av('0').hint).toBe('Informe um valor válido (maior que zero).');
  });

  // RN-369 — sem evento não há solicitação. O "sem associação" era o default e
  // criava o repasse que não abatia evento nenhum (§P-IAMENU-2).
  it('SEM evento escolhido → bloqueado, e o hint só aparece depois do número', () => {
    expect(av('', { eventoId: null })).toEqual({ valor: null, podeEnviar: false, hint: null });
    const comValor = av('5000', { eventoId: null });
    expect(comValor.podeEnviar).toBe(false);
    expect(comValor.hint).toBe('Escolha o evento deste repasse.');
  });

  it('evento sem termo comercial → bloqueado com a razão, nunca com "excede"', () => {
    const r = av('10', { disponivelDoEvento: null });
    expect(r.podeEnviar).toBe(false);
    expect(r.hint).toBe(
      'Este evento ainda não tem termo comercial: não há disponível para repassar.',
    );
  });

  // Os dois tetos COMPÕEM, e o hint diz qual barrou: cabe no evento, não cabe
  // no caixa consolidado (normalmente a janela D+N — RN-348).
  it('cabe no evento mas não no tenant → hint distingue os dois tetos (RN-352)', () => {
    const r = av('8000', { disponivelDoTenant: 3000 });
    expect(r.podeEnviar).toBe(false);
    expect(r.hint).toBe(
      'O valor cabe neste evento, mas excede o saldo disponível da sua conta.',
    );
  });

  it('o teto do EVENTO é checado primeiro — o hint específico vence o genérico', () => {
    const r = av('9000', { disponivelDoTenant: 100 });
    expect(r.hint).toBe('O valor excede o disponível deste evento.');
  });
});
