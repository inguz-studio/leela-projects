// =============================================================================
// PROVA da S1225-T3 (RN-469 + RN-470 · trace leela-pixreal-diag-20260804).
//
// O que a T3 acrescenta à T2: o estado deixa de ser suposto e passa a ser
// CONSULTADO. A S1225-T1 abriu a leitura do próprio pedido nas Rules; aqui ela
// vira resposta na tela, em duas ocasiões e só duas — o carregamento e um
// gesto explícito do comprador. Sem polling, sem listener (v1 da RN-470).
//
// E o cartão passa a distinguir os TRÊS desfechos, com a regra que o dono
// fixou: nunca "Estamos confirmando" sobre resposta já conhecida.
//
//   confirmado    → "Inscrição confirmada!"
//   recusado      → a recusa do servidor, em `role="alert"`, com o botão de
//                   pagar de novo vivo — e sem uma palavra de espera
//   indeterminado → "Estamos confirmando o seu pedido" + orientação de e-mail
//                   + a copy de segurança de dinheiro do DEC-0727
//
// Sem Firebase — os componentes só importam TIPOS do api-client.
// =============================================================================

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type {
  ConfirmarPagamentoSandboxResult,
  CreateInscricaoChargeResult,
} from '@leela/api-client';
import { StepPagamento } from '../app/(public)/[eventSlug]/inscricao/checkout/StepPagamento';
import { StepConfirmacao } from '../app/(public)/[eventSlug]/inscricao/checkout/StepConfirmacao';
import { ToastProvider } from '../app/_ds/ds';

afterEach(cleanup);

const noop = (): void => {};
const EMAIL = 'compradora@example.com';

function charge(over: Partial<CreateInscricaoChargeResult> = {}): CreateInscricaoChargeResult {
  return {
    pedidoId: 'ped-anon-ana-4f21c9-chk-a1b2c3d4',
    pagamentoId: 'pag-anon-ana-4f21c9-chk-a1b2c3d4',
    inscritoIds: ['ins_1'],
    chargeId: 'pay_6e37hktx4xld12qf',
    qrCode: '00020126...br.gov.bcb.pix...',
    pixExpiraEmMillis: Date.now() + 1_800_000,
    gatewayReal: true,
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

type PagamentoProps = Partial<React.ComponentProps<typeof StepPagamento>>;

function renderPagamento(over: PagamentoProps = {}): void {
  render(
    <ToastProvider>
      <StepPagamento
        forma="pix"
        total={1105}
        charge={charge()}
        criandoCharge={false}
        erroCharge={null}
        onGerarCobranca={noop}
        onPagarCartao={noop}
        confirmando={false}
        erroConfirmar={null}
        onConfirmar={noop}
        aceitesOk
        emailDaCompra={EMAIL}
        {...over}
      />
    </ToastProvider>,
  );
}

const btnAtualizar = (): HTMLElement | null =>
  screen.queryByRole('button', { name: /atualizar estado do pedido/i });

// ─────────────────────────────────────────────────────────────────────────
// PIX real — o gesto explícito
// ─────────────────────────────────────────────────────────────────────────
describe('S1225-T3 · PIX real: a tela consulta o próprio pedido', () => {
  it('o gesto existe com gateway REAL — e ele LÊ, não afirma pagamento', () => {
    renderPagamento({ onConsultarPedido: noop });
    expect(btnAtualizar()).toBeTruthy();
    // O botão do incidente (que dizia à plataforma "já paguei") continua
    // proibido com gateway real — T3 da PIXREAL-FIX, não regride aqui.
    expect(screen.queryByRole('button', { name: /já paguei/i })).toBeNull();
  });

  it('o clique dispara UMA consulta — não há polling nem repetição automática', () => {
    const consultar = vi.fn();
    renderPagamento({ onConsultarPedido: consultar });
    btnAtualizar()?.click();
    expect(consultar).toHaveBeenCalledTimes(1);
  });

  it('consulta no ar ⇒ botão travado (a segunda não sai por cima da primeira)', () => {
    renderPagamento({ onConsultarPedido: noop, consultandoPedido: true });
    const b = screen.getByRole('button', { name: /consultando/i });
    expect((b as HTMLButtonElement).disabled).toBe(true);
  });

  it('na CHEGADA a tela não diz "Estamos confirmando" — ninguém pagou ainda', () => {
    renderPagamento({ onConsultarPedido: noop });
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
  });

  it('depois do gesto, com o pedido ainda pendente ⇒ a mensagem do dono + e-mail', () => {
    renderPagamento({ onConsultarPedido: noop, pedidoEmConfirmacao: true });
    expect(screen.getByText('Estamos confirmando o seu pedido')).toBeTruthy();
    expect(screen.getByText(/confira a caixa de entrada/i)).toBeTruthy();
    expect(screen.getByText(EMAIL)).toBeTruthy();
  });

  it('cobrança EXPIRADA não oferece consulta — ali o caminho é cobrança nova', () => {
    renderPagamento({ onConsultarPedido: noop, pixExpirado: true });
    expect(btnAtualizar()).toBeNull();
  });

  it('no SANDBOX o gesto não aparece — lá o desfecho vem do botão de simular', () => {
    renderPagamento({ charge: charge({ gatewayReal: false }), onConsultarPedido: noop });
    expect(btnAtualizar()).toBeNull();
    expect(screen.queryByRole('button', { name: /já paguei/i })).toBeTruthy();
  });

  it('sem handler de consulta a tela segue igual (a v1 degrada sem quebrar)', () => {
    renderPagamento();
    expect(btnAtualizar()).toBeNull();
    expect(screen.getByText('00020126...br.gov.bcb.pix...')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// O `pago` lido das Rules move a tela de confirmação
// ─────────────────────────────────────────────────────────────────────────
describe('S1225-T3 · o status lido do pedido vale tanto quanto a confirmação', () => {
  function renderConfirmacao(over: Partial<React.ComponentProps<typeof StepConfirmacao>>): void {
    render(
      <ToastProvider>
        <StepConfirmacao
          charge={charge()}
          confirmacao={null}
          eventoNome="Meia Maratona de Florianópolis"
          slug="meia-maratona-floripa-2026"
          responsavelEmail={EMAIL}
          linhas={[{ titulo: 'Ana', modalidade: '21k', kitLabel: 'Kit Ouro' }]}
          forma="pix"
          taxaRepassada
          {...over}
        />
      </ToastProvider>,
    );
  }

  it('PIX real: `confirmacao` é null e o `pago` vem da leitura (RN-469)', () => {
    // No PIX real ninguém chama confirmarPagamentoSandbox — quem confirma é o
    // webhook do Asaas. Antes da T3 esta tela não tinha COMO saber.
    renderConfirmacao({ statusPedidoConsultado: 'pago' });
    expect(screen.getByText('Inscrição confirmada!')).toBeTruthy();
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
  });

  it('status lido diferente de pago mantém a espera honesta', () => {
    renderConfirmacao({ statusPedidoConsultado: 'pendente' });
    expect(screen.getByText('Estamos confirmando o seu pedido')).toBeTruthy();
  });

  it('pedido cancelado/expirado NÃO vira confirmação (só `pago` confirma)', () => {
    renderConfirmacao({ statusPedidoConsultado: 'cancelado' });
    expect(screen.queryByText('Inscrição confirmada!')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Cartão — os três desfechos, distintos
// ─────────────────────────────────────────────────────────────────────────
describe('S1225-T3 · cartão distingue confirmado, recusado e indeterminado', () => {
  const confirmado: ConfirmarPagamentoSandboxResult = {
    pedidoId: charge().pedidoId,
    pagamentoId: charge().pagamentoId,
    chargeId: charge().chargeId,
    statusGateway: 'confirmed',
    duplicado: false,
    ignorado: false,
    statusPedido: 'pago',
  };

  it('CONFIRMADO ⇒ confirmação direta, sem passar por espera nenhuma', () => {
    render(
      <ToastProvider>
        <StepConfirmacao
          charge={charge()}
          confirmacao={confirmado}
          eventoNome="Meia Maratona de Florianópolis"
          slug="meia-maratona-floripa-2026"
          responsavelEmail={EMAIL}
          linhas={[{ titulo: 'Ana', modalidade: '21k', kitLabel: 'Kit Ouro' }]}
          forma="cartao_credito"
          taxaRepassada
        />
      </ToastProvider>,
    );
    expect(screen.getByText('Inscrição confirmada!')).toBeTruthy();
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
  });

  it('RECUSADO ⇒ a recusa em alerta, e NUNCA "Estamos confirmando" por cima dela', () => {
    renderPagamento({
      forma: 'cartao_credito',
      charge: null,
      erroCharge: 'O gateway recusou a cobrança. (código do provedor: invalid_creditCard)',
    });
    const alerta = screen.getByRole('alert');
    expect(alerta.textContent).toMatch(/recusou a cobrança/i);
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
    expect(screen.queryByText(/processando pagamento/i)).toBeNull();
  });

  it('RECUSADO mantém o caminho de tentar de novo (o botão de pagar segue vivo)', () => {
    renderPagamento({
      forma: 'cartao_credito',
      charge: null,
      erroCharge: 'O gateway recusou a cobrança.',
    });
    const pagar = screen.getByRole('button', { name: /pagar/i });
    expect((pagar as HTMLButtonElement).disabled).toBe(false);
  });

  it('INDETERMINADO (cobrança criada, desfecho desconhecido) ⇒ a mensagem do dono', () => {
    renderPagamento({
      forma: 'cartao_credito',
      charge: charge(),
      gatewaySemResposta: true,
    });
    expect(screen.getByText('Estamos confirmando o seu pedido')).toBeTruthy();
    expect(screen.getByText(/confira a caixa de entrada/i)).toBeTruthy();
  });

  it('INDETERMINADO não perde a copy de dinheiro do DEC-0727 nem a retomada', () => {
    renderPagamento({
      forma: 'cartao_credito',
      charge: charge(),
      gatewaySemResposta: true,
    });
    expect(screen.getByText(/não abra outra/i)).toBeTruthy();
    expect(screen.getByText(/nunca cobra duas vezes/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeTruthy();
  });

  it('INDETERMINADO é UMA live region, não duas (um estado, um anúncio)', () => {
    renderPagamento({
      forma: 'cartao_credito',
      charge: charge(),
      gatewaySemResposta: true,
    });
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('teto na CRIAÇÃO (sem cobrança) segue "Processando pagamento" — nada a confirmar', () => {
    // Fronteira estreita de propósito: sem cobrança pode não haver dinheiro em
    // trânsito, e "estamos confirmando o seu pedido" afirmaria um pedido em
    // confirmação que talvez nem tenha nascido.
    renderPagamento({ forma: 'cartao_credito', charge: null, gatewaySemResposta: true });
    expect(screen.getByText('Processando pagamento')).toBeTruthy();
    expect(screen.queryByText(/estamos confirmando o seu pedido/i)).toBeNull();
  });

  it('PIX com teto estourado segue "Processando pagamento" (a exceção é só do cartão)', () => {
    renderPagamento({ forma: 'pix', charge: charge(), gatewaySemResposta: true });
    expect(screen.getByText('Processando pagamento')).toBeTruthy();
  });
});
