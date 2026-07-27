/**
 * estornoLedger.test.ts — LEELA-ESTORNO-T1 (RN-348/349/350)
 *
 * Derivações PURAS do carimbo durável de estorno (sem Emulator, sem rede):
 *   - quais estados proíbem um segundo `POST /refund` (RN-349);
 *   - qual falha do gateway PROVA que nada saiu (e portanto libera retry);
 *   - qual estorno uma entrega `PAYMENT_REFUNDED` confirma (RN-350).
 *
 * Estas três decisões são o que separa "estorno enviado e não registrado" de
 * "estorno duplo" — ASAASTETO-REV §V4 mediu 2 POSTs sem elas.
 */

import { describe, expect, it } from 'vitest';
import {
  STATUS_ESTORNO_LEDGER,
  STATUS_ESTORNO_CARIMBO_VIVO,
  STATUS_ESTORNO_CONFIRMAVEL,
  carimboEstornoVivo,
  podeEnviarRefund,
  falhaRefundSemEfeito,
  motivoCarimboVivo,
} from '../checkout/estornarInscricao';
import {
  AsaasApiError,
  AsaasMappingError,
  AsaasTimeoutError,
  AsaasValidationError,
  extrairRefundDaEntrega,
} from '../payments/asaasProvider';
import { MockRefundRecusadoError } from '../payments/mockProvider';

describe('carimbo do ledger de estorno (RN-348/349)', () => {
  it('SÓ "pendente" autoriza um POST de estorno', () => {
    const autorizados = STATUS_ESTORNO_LEDGER.filter((s) => podeEnviarRefund(s));
    expect(autorizados).toEqual(['pendente']);
  });

  it('todo estado que não é pendente nem aprovado é carimbo VIVO (bloqueia)', () => {
    for (const status of STATUS_ESTORNO_LEDGER) {
      const esperado = status !== 'pendente' && status !== 'aprovado';
      expect(carimboEstornoVivo(status), status).toBe(esperado);
    }
    // A lista publicada e a derivação não podem divergir (uma some, a outra
    // libera o segundo POST — foi assim que o estorno duplo passou).
    expect([...STATUS_ESTORNO_CARIMBO_VIVO].sort()).toEqual(
      STATUS_ESTORNO_LEDGER.filter(
        (s) => s !== 'pendente' && s !== 'aprovado'
      ).sort()
    );
  });

  it('carimbo vivo e envio autorizado são mutuamente exclusivos', () => {
    for (const status of STATUS_ESTORNO_LEDGER) {
      expect(carimboEstornoVivo(status) && podeEnviarRefund(status)).toBe(false);
    }
  });

  it('todo estado confirmável por webhook é carimbo vivo (nunca o inverso)', () => {
    for (const status of STATUS_ESTORNO_CONFIRMAVEL) {
      expect(carimboEstornoVivo(status), status).toBe(true);
    }
    // 'divergencia_valor' e 'rejeitado_gateway' NÃO fecham por webhook:
    // exigem olho humano no extrato antes de mexer no livro.
    expect(STATUS_ESTORNO_CONFIRMAVEL).not.toContain('divergencia_valor');
    expect(STATUS_ESTORNO_CONFIRMAVEL).not.toContain('rejeitado_gateway');
  });

  it('status desconhecido/legado não vira carimbo vivo nem autoriza envio', () => {
    expect(carimboEstornoVivo('status_que_nao_existe')).toBe(false);
    expect(podeEnviarRefund('status_que_nao_existe')).toBe(false);
  });

  it('todo carimbo vivo tem mensagem própria — nunca cai no genérico', () => {
    for (const status of STATUS_ESTORNO_CARIMBO_VIVO) {
      const msg = motivoCarimboVivo(status);
      expect(msg.length).toBeGreaterThan(40);
      expect(msg).not.toBe(motivoCarimboVivo('inexistente'));
    }
  });
});

describe('falhaRefundSemEfeito — o que PROVA que nada saiu (RN-349)', () => {
  it('validação local e recusa explícita do mock: nada saiu ⇒ retry liberado', () => {
    expect(falhaRefundSemEfeito(new AsaasValidationError('[asaas] amount inválido'))).toBe(true);
    expect(falhaRefundSemEfeito(new MockRefundRecusadoError('[mock] recusado'))).toBe(true);
  });

  it('4xx do gateway (exceto 429): o gateway leu e recusou ⇒ retry liberado', () => {
    expect(falhaRefundSemEfeito(new AsaasApiError(400, [], ['saldo insuficiente']))).toBe(true);
    expect(falhaRefundSemEfeito(new AsaasApiError(404, [], ['cobrança inexistente']))).toBe(true);
  });

  it('timeout de ESCRITA, 429, 5xx, rede e erro desconhecido = efeito POSSÍVEL', () => {
    const timeoutPost = new AsaasTimeoutError('POST', '/payments/x/refund', 15000);
    expect(timeoutPost.efeitoPossivel).toBe(true);
    expect(falhaRefundSemEfeito(timeoutPost)).toBe(false);

    expect(falhaRefundSemEfeito(new AsaasApiError(429, [], ['rate limit']))).toBe(false);
    expect(falhaRefundSemEfeito(new AsaasApiError(500, [], ['boom']))).toBe(false);
    expect(falhaRefundSemEfeito(new AsaasApiError(502, [], ['gateway']))).toBe(false);
    expect(falhaRefundSemEfeito(new Error('socket hang up'))).toBe(false);
    expect(falhaRefundSemEfeito(new AsaasMappingError('[asaas] shape fora do contrato'))).toBe(false);
    expect(falhaRefundSemEfeito(undefined)).toBe(false);
  });

  it('timeout de LEITURA (GET) não move dinheiro ⇒ retry liberado', () => {
    const timeoutGet = new AsaasTimeoutError('GET', '/payments/x', 15000);
    expect(timeoutGet.efeitoPossivel).toBe(false);
    expect(falhaRefundSemEfeito(timeoutGet)).toBe(true);
  });
});

describe('extrairRefundDaEntrega — qual estorno o webhook confirma (RN-350)', () => {
  it('pega o DONE mais recente de refunds[] e converte para centavos', () => {
    const info = extrairRefundDaEntrega({
      id: 'pay_1',
      refunds: [
        { id: 'ref_antigo', status: 'DONE', value: 50, dateCreated: '2026-07-01 10:00:00' },
        { id: 'ref_novo', status: 'DONE', value: 189.9, dateCreated: '2026-07-20 10:00:00' },
      ],
    });
    expect(info).toEqual({ refundId: 'ref_novo', amountCentavos: 18990, status: 'approved' });
  });

  it('ignora PENDING/CANCELLED — só o DONE é confirmação', () => {
    expect(
      extrairRefundDaEntrega({
        refunds: [
          { id: 'ref_p', status: 'PENDING', value: 100, dateCreated: '2026-07-20 10:00:00' },
          { id: 'ref_c', status: 'CANCELLED', value: 100, dateCreated: '2026-07-21 10:00:00' },
        ],
      })
    ).toBeUndefined();
  });

  it('valor negativo do Asaas vira centavos positivos (o sinal é do extrato)', () => {
    const info = extrairRefundDaEntrega({
      refunds: [{ id: 'ref_1', status: 'DONE', value: -75.5 }],
    });
    expect(info?.amountCentavos).toBe(7550);
  });

  it('cai no endToEndIdentifier quando o item não traz id', () => {
    const info = extrairRefundDaEntrega({
      refunds: [{ endToEndIdentifier: 'E2E123', status: 'DONE', value: 10 }],
    });
    expect(info?.refundId).toBe('E2E123');
  });

  it('shape fora do contrato NUNCA lança — devolve undefined (4xx pausa a fila do Asaas)', () => {
    expect(extrairRefundDaEntrega({})).toBeUndefined();
    expect(extrairRefundDaEntrega({ refunds: [] })).toBeUndefined();
    expect(extrairRefundDaEntrega({ refunds: 'nao-é-array' })).toBeUndefined();
    expect(extrairRefundDaEntrega({ refunds: [null, 42] })).toBeUndefined();
    // DONE sem valor numérico e DONE sem identificador: sem prova, sem bloco.
    expect(extrairRefundDaEntrega({ refunds: [{ id: 'r', status: 'DONE' }] })).toBeUndefined();
    expect(extrairRefundDaEntrega({ refunds: [{ status: 'DONE', value: 10 }] })).toBeUndefined();
  });
});
