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
import {
  CHAMADAS_ASAAS_PIOR_CASO,
  FOLGA_NAO_GATEWAY_SEGUNDOS,
  TETO_CALLABLE_CHECKOUT_SEGUNDOS,
} from '../checkout/createInscricaoCharge';

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

  // ── Review ASAASTETO-REV · o buraco que dois defeitos abriam juntos ────────
  //
  // Falsificação da review: trocar a expressão de `TETO_CALLABLE_CHECKOUT_
  // SEGUNDOS` pelo literal `120` passava nos 5 testes acima. Sozinho isso é
  // inofensivo (o número é o mesmo). O problema é o que ele DESLIGA: as
  // asserções acima só enxergavam a contagem de chamadas ATRAVÉS da
  // derivação, e a lista `CHAMADAS_NO_PIOR_CASO` deste arquivo é uma CÓPIA,
  // não a fonte. Com o literal no lugar da conta, acrescentar a 8ª viagem ao
  // gateway em `CHAMADAS_ASAAS_PIOR_CASO` ficava invisível: a suíte inteira
  // seguia verde com a Function morrendo 15s antes da última chamada — a
  // cobrança órfã que o T3 existe para evitar.
  //
  // As duas asserções abaixo leem a FONTE, e é isso que fecha a composição.

  it('a relação teto = (chamadas × teto por chamada) + folga é verificada contra a FONTE', () => {
    // Com o literal no lugar da conta E uma chamada a mais na fonte, os dois
    // lados divergem aqui — é o cruzamento que a suíte não fazia.
    expect(TETO_CALLABLE_CHECKOUT_SEGUNDOS).toBe(
      (ASAAS_TIMEOUT_MS / 1000) * CHAMADAS_ASAAS_PIOR_CASO + FOLGA_NAO_GATEWAY_SEGUNDOS
    );
    expect(FOLGA_NAO_GATEWAY_SEGUNDOS).toBeGreaterThanOrEqual(10);
  });

  it('a lista repetida neste arquivo bate com a contagem que o código usa', () => {
    // A lista existe duplicada de propósito (é a documentação legível do pior
    // caso). Duplicata que pode divergir em silêncio, porém, é pior do que
    // nenhuma: quem acrescentar uma viagem ao gateway tem de mexer NAS DUAS.
    expect(CHAMADAS_ASAAS_PIOR_CASO).toBe(CHAMADAS_NO_PIOR_CASO.length);
  });
});
