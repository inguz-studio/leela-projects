// =============================================================================
// PROVA do T3 da lane PIXREAL-FIX (trace leela-build-2d6ee98d) — 2026-08-04.
//
// O INCIDENTE que estes testes impedem de voltar: o dono percorreu o checkout
// em PRODUÇÃO, recebeu um PIX de verdade (chave `$aact_prod_`, cobrança
// `pay_6e37hktx4xld12qf` viva no Asaas, BR Code que o banco dele aceitava) e
// leu, embaixo do QR, "Ambiente de simulação: nenhum PIX real é cobrado" —
// com um botão "Já paguei — confirmar" ao lado. As duas peças eram
// INCONDICIONAIS em `StepPagamento`: nasceram quando o MockPaymentProvider era
// o único gateway do mundo e nunca ganharam guarda de ambiente.
//
// O SINAL é do servidor (`gatewayReal` no resultado da cobrança), porque só
// ele sabe qual provider construiu. E a polaridade é fail-safe: a interface de
// simulação exige um `false` EXPLÍCITO. Ausente ⇒ real ⇒ some.
//
// Contra o código anterior a `f37b8187`, os três primeiros testes falham: lá o
// banner e o botão não olhavam nada.
//
// Sem Firebase — `StepPagamento` só importa TIPOS do api-client.
// =============================================================================

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { CreateInscricaoChargeResult } from '@leela/api-client';
import { StepPagamento } from '../app/(public)/[eventSlug]/inscricao/checkout/StepPagamento';
import { ToastProvider } from '../app/_ds/ds';

afterEach(cleanup);

const noop = (): void => {};

function charge(over: Partial<CreateInscricaoChargeResult> = {}): CreateInscricaoChargeResult {
  return {
    pedidoId: 'ped_pixreal',
    pagamentoId: 'pag_pixreal',
    inscritoIds: ['ins_1'],
    chargeId: 'pay_6e37hktx4xld12qf',
    qrCode: '00020126...br.gov.bcb.pix...',
    pixExpiraEmMillis: Date.now() + 1_800_000,
    statusPedido: 'pendente',
    valores: {
      valorBase: 1000,
      desconto: 0,
      valorFinal: 1000,
      taxaServico: 105,
      totalCobrado: 1105,
      parcelas: 1,
      valorParcela: 1105,
    },
    ...over,
  };
}

function renderPix(over: Partial<CreateInscricaoChargeResult> = {}): void {
  render(
    <ToastProvider>
      <StepPagamento
        forma="pix"
        total={1105}
        charge={charge(over)}
        criandoCharge={false}
        erroCharge={null}
        onGerarCobranca={noop}
        onPagarCartao={noop}
        confirmando={false}
        erroConfirmar={null}
        onConfirmar={noop}
        aceitesOk
      />
    </ToastProvider>,
  );
}

const banner = (): HTMLElement | null => screen.queryByText(/ambiente de simulação/i);
const botaoConfirmar = (): HTMLElement | null =>
  screen.queryByRole('button', { name: /já paguei/i });

describe('T3 · com gateway REAL a tela não oferece simulação', () => {
  it('gatewayReal: true ⇒ banner de simulação e botão "Já paguei" SOMEM', () => {
    renderPix({ gatewayReal: true });
    expect(banner()).toBeNull();
    expect(botaoConfirmar()).toBeNull();
  });

  it('gatewayReal: true ⇒ a tela diz a verdade sobre o dinheiro, o prazo e a confirmação', () => {
    renderPix({ gatewayReal: true });
    // O PIX é real e o valor sai da conta do comprador.
    expect(screen.getByText(/é um PIX real/i)).toBeTruthy();
    expect(screen.getByText(/sai da sua conta/i)).toBeTruthy();
    // Há prazo, e ele é o do relógio que já está na tela.
    expect(screen.getByText(/dentro do prazo/i)).toBeTruthy();
    // Ninguém precisa avisar a plataforma — quem confirma é o webhook.
    expect(screen.getByText(/confirmação chega sozinha/i)).toBeTruthy();
  });

  it('campo AUSENTE ⇒ tratado como REAL (fail-safe: servidor antigo não reabre o buraco)', () => {
    // Sem `gatewayReal` nenhum — resposta de um deploy anterior ao T3. A tela
    // NÃO pode presumir sandbox: presumir sandbox foi o incidente.
    renderPix();
    expect(banner()).toBeNull();
    expect(botaoConfirmar()).toBeNull();
  });

  it('o QR e o copia-e-cola continuam lá — o comprador ainda tem o que pagar', () => {
    renderPix({ gatewayReal: true });
    expect(screen.getByText('00020126...br.gov.bcb.pix...')).toBeTruthy();
  });
});

describe('T3 · com o simulador o sandbox segue inteiro', () => {
  it('gatewayReal: false ⇒ banner e botão de confirmar voltam a existir', () => {
    renderPix({ gatewayReal: false });
    expect(banner()).toBeTruthy();
    expect(botaoConfirmar()).toBeTruthy();
    // E a frase honesta do gateway real NÃO aparece por cima do Mock.
    expect(screen.queryByText(/é um PIX real/i)).toBeNull();
  });
});
