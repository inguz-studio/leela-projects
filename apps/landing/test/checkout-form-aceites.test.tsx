// =============================================================================
// PROVA dos DOIS aceites obrigatórios.
//
// Origem: lote CHECKOUT-FORM · T2 (spec CHECKOUT-UX §5.3), que os pôs no
// StepPagamento. A S1217-T1 (RN-438) os MOVEU para a etapa de inscrição — o
// veto do dono em 02/08 é explícito e vale para os dois. Este arquivo seguiu o
// bloco: as asserções de conteúdo, modal e travamento passaram a mirar o
// `AceitesCompra` diretamente, que é onde elas sempre pertenceram; o
// StepPagamento fica com o que sobrou dele aqui — o gate do botão de pagar,
// agora alimentado por um booleano que vem de fora.
//
// Nada de regra mudou: o servidor continua recusando a cobrança sem os dois
// (flip F-4a) e o carimbo continua nascendo na transação da compra.
// =============================================================================

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CreateInscricaoChargeResult } from '@leela/api-client';
import { StepPagamento } from '../app/(public)/[eventSlug]/inscricao/checkout/StepPagamento';
import { AceitesCompra } from '../app/(public)/[eventSlug]/inscricao/checkout/AceitesCompra';
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
  // declara dependência do ToastProvider do DS.
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
        aceitesOk={false}
        {...over}
      />
    </ToastProvider>,
  );
}

function renderAceites(over: Partial<Parameters<typeof AceitesCompra>[0]> = {}): void {
  render(
    <AceitesCompra
      politica={politica}
      termoSaudeVersao={2}
      eventoNome="Corrida Teste"
      organizadorNome="Clube Teste"
      aceiteTermos={false}
      aceiteSaude={false}
      onAceiteTermos={noop}
      onAceiteSaude={noop}
      {...over}
    />,
  );
}

describe('StepPagamento — RN-438 · o pagar continua gateado pelos aceites', () => {
  it('PIX sem aceite: "Gerar código PIX" desabilitado; com aceite, destrava', () => {
    renderPagamento();
    expect(
      (screen.getByRole('button', { name: /gerar código pix/i }) as HTMLButtonElement).disabled,
    ).toBe(true);

    cleanup();
    renderPagamento({ aceitesOk: true });
    expect(
      (screen.getByRole('button', { name: /gerar código pix/i }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('cartão sem aceite: "Pagar" desabilitado; com aceite, destrava', () => {
    renderPagamento({ forma: 'cartao_credito' });
    expect((screen.getByRole('button', { name: /pagar/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    cleanup();
    renderPagamento({ forma: 'cartao_credito', aceitesOk: true });
    expect((screen.getByRole('button', { name: /^pagar/i }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('S1217-T1: a etapa de pagamento NÃO exibe mais os checkboxes de aceite', () => {
    renderPagamento({ aceitesOk: true });
    expect(screen.queryAllByRole('checkbox').length).toBe(0);
    expect(screen.queryByRole('button', { name: /ler os termos da compra/i })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /ler o termo de responsabilidade de saúde/i }),
    ).toBeNull();
  });

  it('sem aceite, a tela aponta ONDE ele é dado — não deixa a pessoa no beco', () => {
    renderPagamento();
    expect(screen.getByText(/volte à etapa de inscrição e confirme os aceites/i)).toBeTruthy();
  });
});

describe('AceitesCompra — §5.3 · os dois checkboxes e a propagação', () => {
  it('marcar um checkbox propaga o aceite (controlado pelo flow)', () => {
    const onAceiteTermos = vi.fn();
    renderAceites({ onAceiteTermos });
    fireEvent.click(
      screen.getByRole('checkbox', { name: /termos da compra e a política de cancelamento/i }),
    );
    expect(onAceiteTermos).toHaveBeenCalledWith(true);
  });

  it('são DOIS, e só dois', () => {
    renderAceites();
    expect(screen.getAllByRole('checkbox').length).toBe(2);
  });
});

describe('AceitesCompra — §5.3 · modais dos termos (Dialog ADR-017)', () => {
  it('abre o modal dos termos com o conteúdo da politicaVendas pública + versão vigente', () => {
    renderAceites();
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
    renderAceites();
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
describe('AceitesCompra — C1-LEGAL · vocabulário de participante no texto legal', () => {
  it('termo de saúde: regulamento da experiência, participantes do pedido, zero "atleta"', () => {
    renderAceites();
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
    renderAceites();
    fireEvent.click(screen.getByRole('button', { name: /ler os termos da compra/i }));
    const dialogo = screen.getByRole('dialog');

    expect(screen.getByText(/transferência de inscrição para outro participante/i)).toBeTruthy();
    expect(/atleta/i.test(dialogo.textContent ?? '')).toBe(false);
  });
});

describe('AceitesCompra — §5.3/RN-438 · prova registrada trava os checkboxes', () => {
  it('com a cobrança criada, os 2 checkboxes ficam desabilitados', () => {
    // O `desabilitado` é derivado de `charge !== null` no CheckoutFlow; aqui
    // prova-se o efeito no bloco, onde quer que ele seja renderizado.
    void charge();
    renderAceites({ aceiteTermos: true, aceiteSaude: true, desabilitado: true });
    const cbs = screen.getAllByRole('checkbox');
    expect(cbs.length).toBe(2);
    for (const cb of cbs) {
      expect((cb as HTMLInputElement).disabled).toBe(true);
    }
  });
});
