// =============================================================================
// PROVA dos fixes de checkout (lote CHECKOUT-FIXES · trace leela-build-2d6ee98d).
// Testes de comportamento (RTL) das superfícies presentacionais — sem Firebase
// (os componentes só importam TIPOS do api-client, apagados em runtime):
//   - StepResumo: retry no erro de cotação (BC-1/T1) + banner de cupom da URL (A-2/T3)
//   - StepPagamento: QR visual do PIX + "Copiar código" (A-3/T4)
//   - StepModalidadeKit: nota de transparência de taxa no step 0 (A-5/T5)
// =============================================================================

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type {
  CotarInscricaoCheckoutResult,
  CreateInscricaoChargeResult,
} from '@leela/api-client';
import { StepResumo } from '../app/(public)/[eventSlug]/inscricao/checkout/StepResumo';
import { StepPagamento } from '../app/(public)/[eventSlug]/inscricao/checkout/StepPagamento';
import { StepModalidadeKit } from '../app/(public)/[eventSlug]/inscricao/checkout/StepModalidadeKit';
import { inscritoVazio } from '../app/(public)/[eventSlug]/inscricao/checkout/tipos';
import { ToastProvider } from '../app/_ds/ds';

afterEach(cleanup);

const noop = (): void => {};

function renderResumo(overrides: Partial<Parameters<typeof StepResumo>[0]> = {}): void {
  render(
    <StepResumo
      cotacao={null}
      cotando={false}
      erroCotacao={null}
      onTentarCotacao={noop}
      linhas={[]}
      cupomInput=""
      onCupomInput={noop}
      onAplicarCupom={noop}
      onRemoverCupom={noop}
      aplicandoCupom={false}
      erroCupomUrl={null}
      taxaRepassada
      forma="pix"
      onForma={noop}
      parcelas={1}
      onParcelas={noop}
      opcoesParcelamento={null}
      {...overrides}
    />,
  );
}

function cotacaoFixture(
  over: Partial<CotarInscricaoCheckoutResult> = {}
): CotarInscricaoCheckoutResult {
  return {
    itens: [],
    valorBase: 100,
    desconto: 0,
    valorFinal: 100,
    cupomAplicado: null,
    taxaServico: 8,
    totalAVista: 108,
    opcoesParcelamento: [{ parcelas: 1, valorParcela: 108, valorTotal: 108 }],
    parcelamento: { parcelas: 1, valorParcela: 108, valorTotal: 108 },
    totalCobrado: 108,
    forma: 'pix',
    totaisPorMeio: { pix: 108, cartao_credito: 110.3 },
    ...over,
  };
}

describe('StepResumo — TAXAFLEX/RN-180 · total por opção de meio (S1210)', () => {
  it('taxa repassada: cada opção mostra o próprio total (PIX ≠ cartão)', () => {
    renderResumo({ cotacao: cotacaoFixture() });
    expect(screen.getByRole('radio', { name: /pix \(à vista\).*108,00/i })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /cartão de crédito.*110,30/i })).toBeTruthy();
  });

  // S1216-T4 · RN-435/D-ACH-6 — este caso documentava a regra ANTIGA ("só
  // quando os totais DIFEREM"), que deixava a feature inteira invisível
  // justamente no evento de taxa incorporada que o dono testou. Totais iguais
  // são informação: dizem que a escolha do meio não muda o que se paga.
  it('incorporada: os totais IGUAIS aparecem nas duas opções (era o caso mudo)', () => {
    renderResumo({
      cotacao: cotacaoFixture({
        taxaServico: 0,
        totalAVista: 100,
        totalCobrado: 100,
        totaisPorMeio: { pix: 100, cartao_credito: 100 },
      }),
    });
    expect(screen.getByRole('radio', { name: /pix \(à vista\).*100,00/i })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /cartão de crédito.*100,00/i })).toBeTruthy();
  });

  it('derivação parcial: o meio sem total volta ao genérico e o outro não é afetado', () => {
    renderResumo({
      cotacao: cotacaoFixture({ totaisPorMeio: { pix: 108, cartao_credito: null } }),
    });
    expect(screen.getByRole('radio', { name: /pix \(à vista\).*108,00/i })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /cartão de crédito/i })).toBeTruthy();
    // A opção sem derivação NÃO ganha número — e a principal não é afetada.
    expect(screen.queryByRole('radio', { name: /cartão de crédito.*R\$/i })).toBeNull();
  });

  it('servidor antigo (sem totaisPorMeio): rótulos vigentes — nunca quebra', () => {
    const { totaisPorMeio: _drop, ...semCampo } = cotacaoFixture();
    renderResumo({ cotacao: semCampo as CotarInscricaoCheckoutResult });
    expect(screen.getByRole('radio', { name: 'PIX (à vista)' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Cartão de crédito' })).toBeTruthy();
  });
});

describe('StepResumo — BC-1 · retry da cotação', () => {
  it('mostra "Tentar novamente" no erro de cotação e re-dispara a cotação ao clicar', () => {
    const onTentarCotacao = vi.fn();
    renderResumo({ erroCotacao: 'Não foi possível calcular o total.', onTentarCotacao });

    const btn = screen.getByRole('button', { name: /tentar novamente/i });
    fireEvent.click(btn);
    expect(onTentarCotacao).toHaveBeenCalledTimes(1);
  });

  it('sem erro de cotação, não renderiza o botão de retry', () => {
    renderResumo({ erroCotacao: null });
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).toBeNull();
  });
});

describe('StepResumo — A-2 · banner de cupom da URL', () => {
  it('renderiza o aviso honesto quando o cupom do link não pôde ser aplicado', () => {
    renderResumo({ erroCupomUrl: 'O cupom HEROI10 não pôde ser aplicado (expirado)' });
    expect(screen.getByText(/o cupom heroi10 não pôde ser aplicado/i)).toBeTruthy();
  });
});

function chargeFixture(over: Partial<CreateInscricaoChargeResult> = {}): CreateInscricaoChargeResult {
  return {
    pedidoId: 'ped_1',
    pagamentoId: 'pag_1',
    inscritoIds: ['ins_1'],
    chargeId: 'chg_1',
    qrCode: 'PIX-COPIA-E-COLA-PAYLOAD',
    // PIXREAL-FIX T3: fixture de SANDBOX, e agora ela precisa dizer isso. O
    // campo `gatewayReal` passou a governar a interface de simulação, com
    // polaridade fail-safe: ausente = gateway real = nada de "Já paguei". As
    // asserções deste arquivo são sobre o mundo do Mock, então o `false` aqui
    // é o que as mantém falando do cenário que elas sempre descreveram.
    gatewayReal: false,
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
    ...over,
  };
}

function renderPagamento(overrides: Partial<Parameters<typeof StepPagamento>[0]> = {}): void {
  // S1209-T2: o bloco do PIX passou a disparar o toast do auto-copy (RN-157),
  // então o step declara dependência do ToastProvider do DS. Só o WRAPPER
  // mudou — nenhuma asserção deste arquivo foi tocada.
  render(
    <ToastProvider>
    <StepPagamento
      forma="pix"
      total={5000}
      charge={chargeFixture()}
      criandoCharge={false}
      erroCharge={null}
      onGerarCobranca={noop}
      onPagarCartao={noop}
      confirmando={false}
      erroConfirmar={null}
      onConfirmar={noop}
      aceitesOk
      {...overrides}
    />
    </ToastProvider>,
  );
}

describe('StepPagamento — A-3 · PIX com QR visual + copiar', () => {
  it('renderiza o QR escaneável do payload PIX (reuso da lib qrcode)', async () => {
    renderPagamento();
    const qr = await screen.findByAltText(/qr code para pagamento via pix/i);
    expect(qr.getAttribute('src')).toMatch(/^data:image\/png/);
  });

  it('mantém o copia-e-cola visível e copia o código com feedback "copiado"', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    renderPagamento();
    // copia-e-cola do payload segue no DOM (mono).
    expect(screen.getByText('PIX-COPIA-E-COLA-PAYLOAD')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /copiar código/i }));
    expect(writeText).toHaveBeenCalledWith('PIX-COPIA-E-COLA-PAYLOAD');
    expect(await screen.findByText(/código copiado/i)).toBeTruthy();
  });

  it('não exige clique extra de "Gerar" quando a cobrança já existe (auto-gerada)', () => {
    renderPagamento();
    expect(screen.queryByRole('button', { name: /gerar código pix/i })).toBeNull();
    expect(screen.getByRole('button', { name: /já paguei/i })).toBeTruthy();
  });
});

describe('StepModalidadeKit — A-5/CKFORM-T4 · nota de taxa CONDICIONAL (RN-347)', () => {
  function renderKit(taxaRepassada: boolean): void {
    render(
      <StepModalidadeKit
        modalidades={[{ nome: '5k', precoVigente: 5000 }]}
        kits={[]}
        itensTamanhados={[]}
        inscritos={[inscritoVazio()]}
        euCorro
        onInscrito={noop}
        onAddInscrito={noop}
        onRemoveInscrito={noop}
        errosModalidade={[]}
        errosKit={[]}
        errosTamanhos={[]}
        taxaRepassada={taxaRepassada}
      />,
    );
  }

  it('evento em modo repassada: nota do Serviço aparece no step 0, antes do resumo', () => {
    renderKit(true);
    expect(screen.getByText(/repassa o serviço/i)).toBeTruthy();
  });

  // S1216-T4 · D-ACH-7 — a nota deixou de existir só num dos modos. O caso
  // anterior exigia SILÊNCIO em taxa incorporada, e o silêncio foi o achado.
  it('evento em modo incorporada: a nota diz que não há valor adicional', () => {
    renderKit(false);
    expect(screen.getByText(/não há valor adicional/i)).toBeTruthy();
    expect(screen.getByText(/valor exibido é o valor final/i)).toBeTruthy();
    expect(screen.queryByText(/repassa o serviço/i)).toBeNull();
    // Nenhum dos dois ramos revela percentual (703db9c).
    expect(screen.queryByText(/%/)).toBeNull();
  });
});
