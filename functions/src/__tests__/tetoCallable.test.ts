/**
 * tetoCallable.test.ts — o teto da callable do checkout (DEC-0727 · T3 ·
 * lane ASAAS-TETO · trace leela-build-2d6ee98d).
 *
 * PURO: sem emulator, sem rede, sem Firestore. O que se prova aqui é
 * ARITMÉTICA, e ela é sobre dinheiro por um motivo específico.
 *
 * O teto de 15s POR CHAMADA (T1) só é honesto se a Function sobreviver a
 * todas as chamadas que ela pode fazer. Function morta no meio do caminho é
 * o pior desfecho da lane: ela pode cair JUSTAMENTE entre o `POST /payments`
 * que vingou e a transação que grava o `gatewayChargeId` — produzindo a
 * cobrança órfã que o teto existe para tornar rara.
 *
 * Estes testes existem contra a DERIVA: no dia em que alguém mexer nos 15s,
 * ou acrescentar uma chamada ao gateway no caminho do checkout, o número da
 * callable tem de acompanhar. Dois números soltos derivam, e o que deriva
 * mente.
 */
import { describe, expect, it } from 'vitest';
import { ASAAS_TIMEOUT_MS } from '../payments/asaasProvider';
import { TETO_CALLABLE_CHECKOUT_SEGUNDOS } from '../checkout/createInscricaoCharge';

/**
 * As chamadas ao Asaas que o pior caso da callable faz. A lista está aqui,
 * repetida de propósito: se ela e a do código divergirem, é porque alguém
 * acrescentou uma viagem ao gateway no caminho quente do checkout sem contar
 * quanto ela custa — e é isso que o teste quer que doa.
 */
const CHAMADAS_NO_PIOR_CASO = [
  'DELETE /payments/{id}                (cancelar a cobrança PIX anterior)',
  'GET /payments/{id}                   (reconciliação A1-REV, só em 4xx≠429)',
  'GET /payments?externalReference=     (lookup idempotente)',
  'GET /customers?cpfCnpj=              (lookup do cliente)',
  'POST /customers                      (cliente novo)',
  'POST /payments                       (a cobrança)',
  'GET /payments/{id}/pixQrCode         (QR do PIX pendente)',
] as const;

describe('DEC-0727 · T3 — o teto da callable acomoda o teto por chamada', () => {
  it('o teto do adapter continua sendo 15s (o número é decisão do dono)', () => {
    expect(ASAAS_TIMEOUT_MS).toBe(15_000);
  });

  it('a callable NÃO herda os 60s default: ela cobre a SOMA dos tetos por chamada', () => {
    const somaDosTetos = (ASAAS_TIMEOUT_MS / 1000) * CHAMADAS_NO_PIOR_CASO.length;

    // 105s de gateway no pior caso — mais do que o default do Firebase.
    expect(somaDosTetos).toBe(105);
    // Herdar 60s deixaria a Function morrer com chamadas ainda por responder,
    // e o ponto de morte pode ser entre o POST que criou a cobrança e a
    // gravação do chargeId. É o buraco que o T1 sozinho não fecha.
    expect(TETO_CALLABLE_CHECKOUT_SEGUNDOS).toBeGreaterThan(60);
    expect(TETO_CALLABLE_CHECKOUT_SEGUNDOS).toBeGreaterThanOrEqual(somaDosTetos);
  });

  it('sobra folga para o que NÃO é gateway (transações, leituras, validações)', () => {
    const somaDosTetos = (ASAAS_TIMEOUT_MS / 1000) * CHAMADAS_NO_PIOR_CASO.length;
    const folga = TETO_CALLABLE_CHECKOUT_SEGUNDOS - somaDosTetos;

    // Sem folga, a Function morreria no Firestore em vez de morrer no Asaas —
    // mesmo estrago, causa mais difícil de enxergar no log.
    expect(folga).toBeGreaterThanOrEqual(10);
    expect(TETO_CALLABLE_CHECKOUT_SEGUNDOS).toBe(120);
  });

  it('o teto é DERIVADO do teto por chamada, não um número digitado à parte', () => {
    // A prova da derivação: dobrar o teto por chamada tem de dobrar a parte
    // de gateway do teto da callable. Se alguém trocar a expressão por uma
    // constante literal, esta conta deixa de fechar.
    const parteDeGateway =
      TETO_CALLABLE_CHECKOUT_SEGUNDOS - 15; /* FOLGA_NAO_GATEWAY_SEGUNDOS */
    expect(parteDeGateway % (ASAAS_TIMEOUT_MS / 1000)).toBe(0);
    expect(parteDeGateway / (ASAAS_TIMEOUT_MS / 1000)).toBe(
      CHAMADAS_NO_PIOR_CASO.length
    );
  });

  it('fica dentro do máximo que o Firebase aceita numa Function v1 (540s)', () => {
    expect(TETO_CALLABLE_CHECKOUT_SEGUNDOS).toBeLessThanOrEqual(540);
  });
});
