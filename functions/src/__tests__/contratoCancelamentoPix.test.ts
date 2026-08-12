/**
 * contratoCancelamentoPix.test.ts — o CONTRATO DE DADOS do cancelamento por
 * prazo do PIX (RN-157 · RN-545 · trace leela-redesign-v2-20260810, lane
 * ESTOURO-BUILD).
 *
 * Por que este arquivo existe antes de qualquer código novo da varredura: a
 * lane da TELA constrói em paralelo a superfície que REAGE a este estado, e
 * as duas precisam do mesmo símbolo antes de qualquer uma escrever a
 * primeira linha. Estático — não sobe Emulator, roda em milissegundos.
 *
 * O que ele trava:
 *   1. o VALOR do motivo é `'pix_expirado'` — o mesmo que a porta do
 *      comprador grava desde a CK2-T5. Renomear o literal quebra este teste
 *      ANTES de quebrar a tela de alguém em produção;
 *   2. o predicado exige a CONJUNÇÃO (status + motivo): `'cancelado'` sem
 *      motivo, ou motivo sem status, não é cancelamento por prazo;
 *   3. `'falhou'` (OVERDUE do gateway) NÃO é cancelamento por prazo — os
 *      dois desfechos continuam distintos, como a spec exige.
 */
import { describe, expect, it } from 'vitest';
import {
  MOTIVO_CANCELAMENTO_PIX_EXPIRADO,
  MOTIVOS_CANCELAMENTO_PEDIDO,
  isMotivoCancelamentoPedido,
  canceladoPorPrazoPix,
} from '@leela/core';

describe('contrato de cancelamento por prazo do PIX (RN-545)', () => {
  it('o valor do motivo é o literal que a porta do comprador já grava', () => {
    // Falsificação: trocar o literal no core deixa este caso vermelho — e é
    // exatamente o que deve acontecer, porque docs em produção carregam ele.
    expect(MOTIVO_CANCELAMENTO_PIX_EXPIRADO).toBe('pix_expirado');
    expect(MOTIVOS_CANCELAMENTO_PEDIDO).toContain('pix_expirado');
  });

  it('type guard aceita só o que está na lista canônica', () => {
    expect(isMotivoCancelamentoPedido('pix_expirado')).toBe(true);
    expect(isMotivoCancelamentoPedido('pix_vencido')).toBe(false);
    expect(isMotivoCancelamentoPedido('')).toBe(false);
    expect(isMotivoCancelamentoPedido(undefined)).toBe(false);
    expect(isMotivoCancelamentoPedido(null)).toBe(false);
  });

  it('o predicado exige status E motivo — a conjunção inteira', () => {
    expect(
      canceladoPorPrazoPix({ status: 'cancelado', canceladoMotivo: 'pix_expirado' })
    ).toBe(true);
    // Cancelado por outra origem (ou doc anterior ao carimbo): NÃO é prazo.
    expect(canceladoPorPrazoPix({ status: 'cancelado' })).toBe(false);
    expect(
      canceladoPorPrazoPix({ status: 'cancelado', canceladoMotivo: null })
    ).toBe(false);
    // Motivo carimbado sobre status vivo é dado incoerente — nunca `true`.
    expect(
      canceladoPorPrazoPix({ status: 'pendente', canceladoMotivo: 'pix_expirado' })
    ).toBe(false);
  });

  it('`falhou` (OVERDUE do gateway) NÃO é cancelamento por prazo', () => {
    // A plataforma decidiu × o gateway avisou: desfechos distintos, e a tela
    // que quiser tratá-los igual faz a disjunção explícita.
    expect(canceladoPorPrazoPix({ status: 'falhou' })).toBe(false);
    expect(
      canceladoPorPrazoPix({ status: 'falhou', canceladoMotivo: 'pix_expirado' })
    ).toBe(false);
  });

  it('o par pedido+pagamento responde igual — os dois carregam os mesmos campos', () => {
    const pedido = { status: 'cancelado', canceladoMotivo: 'pix_expirado' };
    const pagamento = {
      status: 'cancelado',
      canceladoMotivo: 'pix_expirado',
      gatewayCancelado: true,
    };
    expect(canceladoPorPrazoPix(pedido)).toBe(true);
    expect(canceladoPorPrazoPix(pagamento)).toBe(true);
  });
});
