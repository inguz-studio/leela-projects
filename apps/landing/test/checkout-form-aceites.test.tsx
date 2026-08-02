// =============================================================================
// PROVA do lote CHECKOUT-FORM · T2 (trace leela-build-2d6ee98d) — os DOIS
// aceites obrigatórios no StepPagamento (spec CHECKOUT-UX §5.3):
//   - sem os 2 checks, Gerar PIX / Pagar ficam DESABILITADOS (constraint);
//   - com os 2, destravam;
//   - cada aceite abre o próprio modal (Dialog ADR-017, padrão
//     RegulamentoModal) com o conteúdo da politicaVendas pública (a) e o
//     termo de saúde do produto com a versão vigente (b);
//   - cobrança criada ⇒ checkboxes travados (prova registrada no servidor).
// =============================================================================

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CreateInscricaoChargeResult } from '@leela/api-client';
import { StepPagamento } from '../app/(public)/[eventSlug]/inscricao/checkout/StepPagamento';
import { ToastProvider } from '../app/_ds/ds';

afterEach(cleanup);

const noop = (): void => {};

const politica = {
  versao: 3,
  reembolso: { janelaArrependimentoDias: 7, corteHoras: 48, slaAnaliseDias: 3 },
  transferencia: { habilitada: true, janelaHoras: 72, taxa: 25 },
  trocaIngresso: { habilitada: false, janelaHoras: 48, permiteReembolsoDowngrade: false },
};

function charge(): CreateInscricaoChargeResult {
  return {
    pedidoId: 'ped_1',
    pagamentoId: 'pag_1',
    inscritoIds: ['ins_1'],
    chargeId: 'chg_1',
    qrCode: 'PIX-PAYLOAD',
    statusPedido: 'pendente',
    valores: {
      valorBase: 5000,
      desconto: 0,
      valorFinal: 5000,
      taxaServico: 0,
      totalCobrado: 5000,
      parcelas: 1,
      valorParcela: 5000,
    },
  };
}

function renderPagamento(over: Partial<Parameters<typeof StepPagamento>[0]> = {}): void {
  // S1209-T2: o bloco do PIX dispara o toast do auto-copy (RN-157) — o step
  // declara dependência do ToastProvider do DS. Só o WRAPPER mudou aqui.
  render(
    <ToastProvider>
    <StepPagamento
      forma="pix"
      total={5000}
      charge={null}
      criandoCharge={false}
      erroCharge={null}
      onGerarCobranca={noop}
      onPagarCartao={noop}
      confirmando={false}
      erroConfirmar={null}
      onConfirmar={noop}
      politica={politica}
      termoSaudeVersao={2}
      eventoNome="Corrida Teste"
      organizadorNome="Clube Teste"
      aceiteTermos={false}
      aceiteSaude={false}
      onAceiteTermos={noop}
      onAceiteSaude={noop}
      {...over}
    />
    </ToastProvider>,
  );
}

describe('StepPagamento — §5.3 · aceites gateiam o pagar', () => {
  it('PIX sem os 2 aceites: "Gerar código PIX" desabilitado; com os 2, destrava', () => {
    renderPagamento();
    const gerar = screen.getByRole('button', { name: /gerar código pix/i });
    expect((gerar as HTMLButtonElement).disabled).toBe(true);

    cleanup();
    renderPagamento({ aceiteTermos: true, aceiteSaude: true });
    const gerar2 = screen.getByRole('button', { name: /gerar código pix/i });
    expect((gerar2 as HTMLButtonElement).disabled).toBe(false);
  });

  it('apenas 1 dos 2 aceites NÃO destrava (os dois são obrigatórios juntos)', () => {
    renderPagamento({ aceiteTermos: true, aceiteSaude: false });
    const gerar = screen.getByRole('button', { name: /gerar código pix/i });
    expect((gerar as HTMLButtonElement).disabled).toBe(true);
  });

  it('cartão sem aceites: "Pagar" desabilitado; com os 2, destrava', () => {
    renderPagamento({ forma: 'cartao_credito' });
    const pagar = screen.getByRole('button', { name: /pagar/i });
    expect((pagar as HTMLButtonElement).disabled).toBe(true);

    cleanup();
    renderPagamento({ forma: 'cartao_credito', aceiteTermos: true, aceiteSaude: true });
    const pagar2 = screen.getByRole('button', { name: /^pagar/i });
    expect((pagar2 as HTMLButtonElement).disabled).toBe(false);
  });

  it('marcar um checkbox propaga o aceite (controlado pelo flow)', () => {
    const onAceiteTermos = vi.fn();
    renderPagamento({ onAceiteTermos });
    const cb = screen.getByRole('checkbox', {
      name: /termos da compra e a política de cancelamento/i,
    });
    fireEvent.click(cb);
    expect(onAceiteTermos).toHaveBeenCalledWith(true);
  });
});

describe('StepPagamento — §5.3 · modais dos termos (Dialog ADR-017)', () => {
  it('abre o modal dos termos com o conteúdo da politicaVendas pública + versão vigente', () => {
    renderPagamento();
    fireEvent.click(screen.getByRole('button', { name: /ler os termos da compra/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: /termos da compra e política de cancelamento/i }),
    ).toBeTruthy();
    // Parametrizado pela política REAL do evento (não texto fixo).
    expect(screen.getByText(/7 dias corridos/i)).toBeTruthy();
    expect(screen.getAllByText(/48 horas/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/versão 3/i)).toBeTruthy();
    // Transferência habilitada com taxa em R$.
    expect(screen.getByText(/mediante taxa de/i)).toBeTruthy();
  });

  it('abre o modal do termo de saúde com o template do produto + versão vigente', () => {
    renderPagamento();
    fireEvent.click(
      screen.getByRole('button', { name: /ler o termo de responsabilidade de saúde/i }),
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    // "boas condições de saúde" também vive no rótulo do checkbox — o modal
    // soma a 2ª ocorrência (o texto completo do termo).
    expect(screen.getAllByText(/boas condições de saúde/i).length).toBeGreaterThan(1);
    expect(screen.getByText(/apto\(a\) a participar do evento corrida teste/i)).toBeTruthy();
    expect(screen.getByText(/clube teste \(organizador do evento\)/i)).toBeTruthy();
    expect(screen.getByText(/versão 2/i)).toBeTruthy();
  });
});

// =============================================================================
// C1-LEGAL (D-0802-1, rodada 2026-08-02) — o texto legal da jornada de compra
// fala de PARTICIPANTE e EXPERIÊNCIA, não de atleta e prova. A fronteira dura
// que estes casos guardam: o vocabulário da PLATAFORMA muda, o conteúdo do
// ORGANIZADOR não. Por isso o evento do fixture se chama "Corrida Teste" — o
// nome dele continua saindo com "Corrida" no mesmo modal em que nenhuma
// palavra da plataforma remete a corrida.
// =============================================================================
describe('StepPagamento — C1-LEGAL · vocabulário de participante no texto legal', () => {
  it('termo de saúde: regulamento da experiência, participantes do pedido, zero "atleta"', () => {
    renderPagamento();
    fireEvent.click(
      screen.getByRole('button', { name: /ler o termo de responsabilidade de saúde/i }),
    );
    const dialogo = screen.getByRole('dialog');

    expect(screen.getByText(/regulamento da experiência/i)).toBeTruthy();
    expect(screen.getByText(/vale para todos os participantes deste pedido/i)).toBeTruthy();
    expect(screen.getByText(/me preparei adequadamente para a atividade/i)).toBeTruthy();

    // Vocabulário de plataforma: nada de atleta/prova/treino no termo.
    const texto = dialogo.textContent ?? '';
    expect(/atleta/i.test(texto)).toBe(false);
    expect(/\bprova\b/i.test(texto)).toBe(false);
    expect(/treinei/i.test(texto)).toBe(false);

    // ...e o conteúdo do ORGANIZADOR atravessa intacto no mesmo modal.
    expect(screen.getByText(/apto\(a\) a participar do evento corrida teste/i)).toBeTruthy();
  });

  it('termos da compra: transferência é para outro participante, não para outro atleta', () => {
    renderPagamento();
    fireEvent.click(screen.getByRole('button', { name: /ler os termos da compra/i }));
    const dialogo = screen.getByRole('dialog');

    expect(screen.getByText(/transferência de inscrição para outro participante/i)).toBeTruthy();
    expect(/atleta/i.test(dialogo.textContent ?? '')).toBe(false);
  });
});

describe('StepPagamento — §5.3 · prova registrada trava os checkboxes', () => {
  it('com a cobrança criada, os 2 checkboxes ficam desabilitados', () => {
    renderPagamento({ charge: charge(), aceiteTermos: true, aceiteSaude: true });
    const cbs = screen.getAllByRole('checkbox');
    expect(cbs.length).toBe(2);
    for (const cb of cbs) {
      expect((cb as HTMLInputElement).disabled).toBe(true);
    }
  });
});
