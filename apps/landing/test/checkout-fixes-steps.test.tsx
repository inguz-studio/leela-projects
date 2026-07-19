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
import type { CreateInscricaoChargeResult } from '@leela/api-client';
import { StepResumo } from '../app/(public)/[eventSlug]/inscricao/checkout/StepResumo';
import { StepPagamento } from '../app/(public)/[eventSlug]/inscricao/checkout/StepPagamento';
import { StepModalidadeKit } from '../app/(public)/[eventSlug]/inscricao/checkout/StepModalidadeKit';
import { inscritoVazio } from '../app/(public)/[eventSlug]/inscricao/checkout/tipos';

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
      forma="pix"
      onForma={noop}
      parcelas={1}
      onParcelas={noop}
      {...overrides}
    />,
  );
}

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

/** Política pública mínima (defaults legais CDC — mesma shape do leitor). */
const politicaFixture = {
  versao: 1,
  reembolso: { janelaArrependimentoDias: 7, corteHoras: 48, slaAnaliseDias: 3 },
  transferencia: { habilitada: false, janelaHoras: 72, taxa: 0 },
  trocaIngresso: { habilitada: false, janelaHoras: 48, permiteReembolsoDowngrade: false },
};

function renderPagamento(overrides: Partial<Parameters<typeof StepPagamento>[0]> = {}): void {
  render(
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
      cartao={{ nome: '', numero: '', validade: '', cvv: '' }}
      onCartao={noop}
      politica={politicaFixture}
      termoSaudeVersao={1}
      eventoNome="Corrida Teste"
      organizadorNome={null}
      aceiteTermos
      aceiteSaude
      onAceiteTermos={noop}
      onAceiteSaude={noop}
      {...overrides}
    />,
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
        inscritos={[inscritoVazio()]}
        euCorro
        onInscrito={noop}
        onAddInscrito={noop}
        onRemoveInscrito={noop}
        errosModalidade={[]}
        errosKit={[]}
        taxaRepassada={taxaRepassada}
      />,
    );
  }

  it('evento em modo repassada: nota da taxa aparece no step 0, antes do resumo', () => {
    renderKit(true);
    expect(screen.getByText(/repassa a taxa de serviço/i)).toBeTruthy();
  });

  it('evento em modo incorporada: SEM nota de taxa (a antiga nota fixa saiu)', () => {
    renderKit(false);
    expect(screen.queryByText(/taxa de serviço/i)).toBeNull();
    expect(screen.queryByText(/eventuais taxas/i)).toBeNull();
  });
});
