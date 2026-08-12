// =============================================================================
// PROVA da REGRA dos ramos pós-pagamento (CKPIX-FLOW · RN-560 e RN-546).
//
// Este arquivo prova a CLASSIFICAÇÃO — a função pura que decide qual dos cinco
// ramos um doc de pedido é. `checkout-ckpix-fluxo.test.tsx` prova a FIAÇÃO no
// `CheckoutFlow` (que a assinatura nasce, que a tela reage, que o destino é o
// certo). A separação é a mesma da S1225, e pela mesma razão: montar o
// checkout inteiro para exercitar uma tabela de verdade custa trinta segundos e
// esconde a regra atrás de dez cliques.
//
// O QUE ESTÁ EM JOGO. O `status` do pedido tem quatro valores e três terminais,
// e os ramos do dono são cinco. `falhou` é cartão recusado OU PIX vencido;
// `cancelado` é PIX vencido OU encerrado sem causa. Errar essa tradução não é
// um bug de tela: é dizer a alguém que o cartão foi recusado quando o PIX
// venceu, ou prometer "estamos confirmando" sobre uma compra morta.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { MOTIVO_CANCELAMENTO_PIX_EXPIRADO } from '@leela/core';
import {
  classificarDesfecho,
  destinoDoDesfecho,
  reservaDoPedidoExpirou,
} from '../app/(public)/[eventSlug]/inscricao/checkout/desfechoPedido';

const SLUG = 'experiencia-ckpix';

describe('RN-560 · ramo 1 e 4 — PIX confirmado e cartão aceito', () => {
  it('`pago` é `pago` nos dois meios, e leva à área do cliente', () => {
    expect(classificarDesfecho({ status: 'pago', formaPagamento: 'pix' })).toBe('pago');
    expect(
      classificarDesfecho({ status: 'pago', formaPagamento: 'cartao_credito' }),
    ).toBe('pago');
    expect(destinoDoDesfecho('pago', SLUG)).toBe('/minha-conta');
  });

  it('`pago` vence a reserva expirada — RN-498 admite confirmação atrasada', () => {
    // A ordem das portas é a regra: um pedido pode ter perdido a reserva e ser
    // pago logo depois. Mandar essa pessoa de volta à página do evento seria
    // negar uma compra que o servidor aceitou.
    expect(
      classificarDesfecho({
        status: 'pago',
        formaPagamento: 'cartao_credito',
        reservaExpirada: true,
      }),
    ).toBe('pago');
  });
});

describe('RN-560 · ramo 2 — o PIX que venceu', () => {
  it('`cancelado` com o motivo carimbado é vencimento, e leva à área do cliente', () => {
    expect(
      classificarDesfecho({
        status: 'cancelado',
        canceladoMotivo: MOTIVO_CANCELAMENTO_PIX_EXPIRADO,
        formaPagamento: 'pix',
      }),
    ).toBe('pix_vencido');
    expect(destinoDoDesfecho('pix_vencido', SLUG)).toBe('/minha-conta');
  });

  it('`falhou` num PIX é vencimento — no Asaas só `PAYMENT_OVERDUE` chega aqui', () => {
    // Os outros dois eventos que viram `failed` (`CREDIT_CARD_CAPTURE_REFUSED`
    // e `REPROVED_BY_RISK_ANALYSIS`) são de cartão por definição.
    expect(classificarDesfecho({ status: 'falhou', formaPagamento: 'pix' })).toBe(
      'pix_vencido',
    );
  });

  it('`cancelado` SEM motivo não vira vencimento — a tela não afirma causa que não leu', () => {
    // Esta é a linha que separa informar de adivinhar: sem o carimbo, a
    // plataforma não sabe por que a cobrança morreu, e o `AvisoPedidoEncerrado`
    // (que não afirma causa nenhuma) continua sendo a resposta honesta.
    expect(classificarDesfecho({ status: 'cancelado', formaPagamento: 'pix' })).toBe(
      'encerrado',
    );
    expect(
      classificarDesfecho({
        status: 'cancelado',
        canceladoMotivo: 'cancelamento_gateway_falhou',
        formaPagamento: 'pix',
      }),
    ).toBe('encerrado');
    expect(destinoDoDesfecho('encerrado', SLUG)).toBeNull();
  });
});

describe('RN-560 · ramo 3 — o cartão recusado', () => {
  it('`falhou` num cartão é recusa, e NÃO tira ninguém do checkout', () => {
    expect(
      classificarDesfecho({ status: 'falhou', formaPagamento: 'cartao_credito' }),
    ).toBe('cartao_recusado');
    // "volta para o checkout" — que é a tela onde a pessoa já está.
    expect(destinoDoDesfecho('cartao_recusado', SLUG)).toBeNull();
  });

  it('`cancelado` num cartão NÃO é recusa — cancelar não é o emissor dizendo não', () => {
    expect(
      classificarDesfecho({ status: 'cancelado', formaPagamento: 'cartao_credito' }),
    ).toBe('encerrado');
  });
});

describe('RN-546 · ramo 5 — a reserva do pendente de cartão', () => {
  it('pendente de CARTÃO com reserva vencida volta para a página do evento', () => {
    expect(
      classificarDesfecho({
        status: 'pendente',
        formaPagamento: 'cartao_credito',
        reservaExpirada: true,
      }),
    ).toBe('reserva_expirada');
    // O destino é a landing do evento, e NÃO a área do cliente: ali não houve
    // compra, e o que a pessoa precisa é escolher de novo.
    expect(destinoDoDesfecho('reserva_expirada', SLUG)).toBe(`/${SLUG}`);
  });

  it('pendente de PIX NUNCA cai no ramo 5 — o PIX tem vencimento próprio', () => {
    expect(
      classificarDesfecho({ status: 'pendente', formaPagamento: 'pix', reservaExpirada: true }),
    ).toBe('pendente');
  });

  it('⛔ o predicado da reserva está atrás do contrato da lane ESTOURO-BUILD', () => {
    // Marcador declarado, e é ele que faz este ramo não acender em produção. A
    // outra lane troca SÓ o corpo de `reservaDoPedidoExpirou` e o ramo passa a
    // valer — a tabela acima já prova o comportamento por injeção.
    expect(reservaDoPedidoExpirou({ status: 'pendente' })).toBe(false);
  });
});

describe('a fronteira do MEIO — o doc manda, a tela desempata', () => {
  it('o espelho do servidor vence a forma escolhida na tela', () => {
    // A pessoa trocou para PIX depois de o cartão ser recusado; quem o gateway
    // recusou foi o cartão, e é o doc que sabe disso.
    expect(
      classificarDesfecho({
        status: 'falhou',
        formaPagamento: 'cartao_credito',
        formaNaTela: 'pix',
      }),
    ).toBe('cartao_recusado');
  });

  it('sem espelho, a forma da tela decide — e só entre frases honestas', () => {
    expect(classificarDesfecho({ status: 'falhou', formaNaTela: 'pix' })).toBe('pix_vencido');
    expect(classificarDesfecho({ status: 'falhou', formaNaTela: 'cartao_credito' })).toBe(
      'cartao_recusado',
    );
  });

  it('sem espelho e sem forma na tela, o terminal não ganha causa inventada', () => {
    expect(classificarDesfecho({ status: 'falhou' })).toBe('encerrado');
  });

  it('pedido vivo é `pendente`, e status desconhecido não vira desfecho', () => {
    expect(classificarDesfecho({ status: 'pendente', formaPagamento: 'pix' })).toBe('pendente');
    expect(classificarDesfecho({ status: null })).toBe('pendente');
    expect(classificarDesfecho({ status: undefined })).toBe('pendente');
  });
});
