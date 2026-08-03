// =============================================================================
// S1216-T3 · RN-435/RN-437 · D-ACH-5 — o bloco de totais declara a composição.
//
// O ACHADO DO DONO: ele comprou no meia-floripa e não achou a taxa de serviço
// em lugar nenhum da tela. O inventário mostrou que não era descuido: o evento
// roda em `taxaModo: 'incorporada'`, a cotação devolve `taxaServico: 0` e a
// linha simplesmente não era renderizada. O resumo calava nos DOIS modos, e no
// modo incorporada o silêncio parecia omissão.
//
// Estes casos REPROVAM a versão anterior em três frentes:
//   · repassada — a linha era "Taxa de serviço", muda sobre a qual meio a taxa
//     pertence; agora é "Taxa de serviço (PIX)" / "(cartão)";
//   · incorporada — não havia linha nenhuma; agora existe e diz "inclusa no
//     valor", sem número (nem "R$ 0,00", que afirmaria ausência de taxa, nem o
//     valor real, que vazaria o termo comercial do organizador — 703db9c);
//   · juros — não existia linha de juros em superfície alguma; agora tem nome
//     próprio, com o valor que veio PRONTO do servidor (S1216-T2).
//
// O caso "a interface não soma um centavo" é o vetor 4 da fila e é o mais
// importante: a cotação chega com um `jurosParcelamento` que NÃO bate com
// `totalCobrado − totalAVista`, de propósito. A tela mostra o campo do
// servidor. Qualquer implementação que derivasse o juro localmente mostraria o
// outro número e o caso morde.
// =============================================================================

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type {
  CotarInscricaoCheckoutResult,
  CreateInscricaoChargeResult,
} from '@leela/api-client';
import { StepResumo } from '../app/(public)/[eventSlug]/inscricao/checkout/StepResumo';
import { StepConfirmacao } from '../app/(public)/[eventSlug]/inscricao/checkout/StepConfirmacao';
import { ToastProvider } from '../app/_ds/ds';

afterEach(cleanup);

const noop = (): void => {};

function cotacao(over: Partial<CotarInscricaoCheckoutResult> = {}): CotarInscricaoCheckoutResult {
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

function renderResumo(over: Partial<Parameters<typeof StepResumo>[0]> = {}): void {
  render(
    <StepResumo
      cotacao={cotacao()}
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
      {...over}
    />,
  );
}

/** Os rótulos do bloco de totais, na ordem em que a tela os apresenta. */
function rotulosDosTotais(): string[] {
  return Array.from(document.querySelectorAll('dl dt')).map((el) =>
    (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
  );
}

/** O texto inteiro do bloco de totais (para provar o que NÃO aparece nele). */
function textoDosTotais(): string {
  return Array.from(document.querySelectorAll('dl'))
    .map((el) => el.textContent ?? '')
    .join(' | ');
}

// ── Resumo · a taxa que aparece (RN-435) ────────────────────────────────────

describe('StepResumo · RN-435 — a taxa de serviço nomeia o meio quando é repassada', () => {
  it('PIX: a linha diz "Taxa de serviço (PIX)" e mostra o valor em R$', () => {
    renderResumo({ forma: 'pix' });
    expect(screen.getByText('Taxa de serviço (PIX)')).toBeTruthy();
    expect(screen.getByText('R$ 8,00')).toBeTruthy();
  });

  it('cartão: a MESMA linha muda de nome — é a taxa daquele meio', () => {
    renderResumo({
      forma: 'cartao_credito',
      cotacao: cotacao({ taxaServico: 10.3, totalAVista: 110.3, totalCobrado: 110.3 }),
    });
    expect(screen.getByText('Taxa de serviço (cartão)')).toBeTruthy();
    expect(screen.getByText('R$ 10,30')).toBeTruthy();
  });

  it('rótulo mudo NÃO sobrevive: não existe mais "Taxa de serviço" sem meio', () => {
    renderResumo({ forma: 'pix' });
    // Casamento EXATO — o rótulo antigo era exatamente este texto.
    expect(screen.queryByText('Taxa de serviço')).toBeNull();
  });

  it('evento repassado com taxa zero no meio escolhido continua sem linha', () => {
    renderResumo({ cotacao: cotacao({ taxaServico: 0, totalAVista: 100, totalCobrado: 100 }) });
    expect(screen.queryByText(/taxa de serviço/i)).toBeNull();
  });
});

describe('StepResumo · RN-435 — em taxa incorporada a linha existe e não tem número', () => {
  it('diz "inclusa no valor" — o silêncio que o dono reclamou acabou', () => {
    renderResumo({
      taxaRepassada: false,
      cotacao: cotacao({ taxaServico: 0, totalAVista: 100, totalCobrado: 100 }),
    });
    expect(screen.getByText('Taxa de serviço')).toBeTruthy();
    expect(screen.getByText('inclusa no valor')).toBeTruthy();
  });

  it('nunca escreve "R$ 0,00" — isso afirmaria que a taxa não existe', () => {
    renderResumo({
      taxaRepassada: false,
      cotacao: cotacao({ taxaServico: 0, totalAVista: 100, totalCobrado: 100 }),
    });
    expect(textoDosTotais()).not.toMatch(/R\$\s*0,00/);
  });

  it('nunca vaza o valor real da taxa do organizador (703db9c)', () => {
    // Servidor que, por qualquer motivo, mandasse a taxa num evento
    // incorporado: a tela continua muda sobre o número.
    renderResumo({
      taxaRepassada: false,
      cotacao: cotacao({ taxaServico: 8, totalAVista: 100, totalCobrado: 100 }),
    });
    expect(screen.getByText('inclusa no valor')).toBeTruthy();
    expect(textoDosTotais()).not.toMatch(/8,00/);
  });

  it('percentual não aparece em nenhum dos dois modos', () => {
    renderResumo({ forma: 'pix' });
    expect(textoDosTotais()).not.toMatch(/%|2,89|10,5/);
    cleanup();
    renderResumo({
      taxaRepassada: false,
      cotacao: cotacao({ taxaServico: 0, totalAVista: 100, totalCobrado: 100 }),
    });
    expect(textoDosTotais()).not.toMatch(/%|2,89|10,5/);
  });
});

// ── Resumo · o juro com nome próprio (RN-437) ───────────────────────────────

describe('StepResumo · RN-437 — o juro do parcelamento é uma linha, não um disfarce do total', () => {
  it('parcelado com juros: a linha existe e traz o valor do servidor', () => {
    renderResumo({
      forma: 'cartao_credito',
      parcelas: 12,
      cotacao: cotacao({
        jurosParcelamento: 59.28,
        totalCobrado: 359.28,
        totalAVista: 300,
        parcelamento: { parcelas: 12, valorParcela: 29.94, valorTotal: 359.28 },
      }),
    });
    expect(screen.getByText('Juros do parcelamento')).toBeTruthy();
    expect(screen.getByText('R$ 59,28')).toBeTruthy();
  });

  it('A INTERFACE NÃO SOMA UM CENTAVO: o valor exibido é o campo do servidor', () => {
    // `totalCobrado − totalAVista` daria 92,00. O campo do servidor diz 5,00.
    // Quem derivasse o juro na tela mostraria 92,00 e este caso morde.
    renderResumo({
      forma: 'cartao_credito',
      parcelas: 3,
      cotacao: cotacao({
        jurosParcelamento: 5,
        totalAVista: 108,
        totalCobrado: 200,
        parcelamento: { parcelas: 3, valorParcela: 66.67, valorTotal: 200 },
      }),
    });
    expect(screen.getByText('R$ 5,00')).toBeTruthy();
    expect(textoDosTotais()).not.toMatch(/92,00/);
  });

  it('PIX / à vista / termo sem juros: sem linha, porque não há o que dizer', () => {
    renderResumo({ cotacao: cotacao({ jurosParcelamento: 0 }) });
    expect(screen.queryByText(/juros do parcelamento/i)).toBeNull();
  });

  it('servidor antigo sem o campo: sem linha — nunca "undefined" na tela', () => {
    renderResumo();
    expect(screen.queryByText(/juros do parcelamento/i)).toBeNull();
    expect(textoDosTotais()).not.toMatch(/undefined|NaN/);
  });
});

describe('StepResumo · RN-435 — a ordem das linhas é a da regra', () => {
  it('subtotal → desconto → taxa → juros → total', () => {
    renderResumo({
      forma: 'cartao_credito',
      parcelas: 12,
      cotacao: cotacao({
        desconto: 10,
        valorFinal: 90,
        taxaServico: 8,
        jurosParcelamento: 20,
        totalAVista: 98,
        totalCobrado: 118,
        parcelamento: { parcelas: 12, valorParcela: 9.84, valorTotal: 118 },
      }),
    });
    expect(rotulosDosTotais()).toEqual([
      'Subtotal',
      'Desconto',
      'Taxa de serviço (cartão)',
      'Juros do parcelamento',
      'Total parcelado',
    ]);
  });
});

// ── Confirmação · a mesma história depois de pagar ──────────────────────────

function chargeFixture(
  valores: Partial<CreateInscricaoChargeResult['valores']> = {},
): CreateInscricaoChargeResult {
  return {
    pedidoId: 'ped_1',
    pagamentoId: 'pag_1',
    inscritoIds: ['ins_1'],
    chargeId: 'chg_1',
    statusPedido: 'pendente',
    valores: {
      valorBase: 100,
      desconto: 0,
      valorFinal: 100,
      taxaServico: 8,
      totalCobrado: 108,
      parcelas: 1,
      valorParcela: 108,
      ...valores,
    },
  };
}

function renderConfirmacao(over: Partial<Parameters<typeof StepConfirmacao>[0]> = {}): void {
  render(
    <ToastProvider>
      <StepConfirmacao
        charge={chargeFixture()}
        confirmacao={null}
        eventoNome="Experiência Teste"
        slug="experiencia-teste"
        responsavelEmail="participante@example.com"
        linhas={[{ titulo: 'Você', modalidade: '5k', kitLabel: 'Sem kit' }]}
        forma="pix"
        taxaRepassada
        {...over}
      />
    </ToastProvider>,
  );
}

describe('StepConfirmacao · RN-435/RN-437 — o comprovante conta a MESMA história', () => {
  it('repassada no cartão: "Taxa de serviço (cartão)" com valor', () => {
    renderConfirmacao({
      forma: 'cartao_credito',
      charge: chargeFixture({ taxaServico: 10.3, totalCobrado: 110.3, valorParcela: 110.3 }),
    });
    expect(screen.getByText('Taxa de serviço (cartão)')).toBeTruthy();
    expect(screen.getByText('R$ 10,30')).toBeTruthy();
  });

  it('incorporada: "inclusa no valor", sem "R$ 0,00" e sem o valor real', () => {
    renderConfirmacao({
      taxaRepassada: false,
      charge: chargeFixture({ taxaServico: 0, totalCobrado: 100, valorParcela: 100 }),
    });
    expect(screen.getByText('Taxa de serviço')).toBeTruthy();
    expect(screen.getByText('inclusa no valor')).toBeTruthy();
    expect(textoDosTotais()).not.toMatch(/R\$\s*0,00/);
  });

  it('juros congelado no pedido aparece com nome próprio', () => {
    renderConfirmacao({
      forma: 'cartao_credito',
      charge: chargeFixture({
        jurosParcelamento: 59.28,
        totalCobrado: 359.28,
        parcelas: 12,
        valorParcela: 29.94,
      }),
    });
    expect(screen.getByText('Juros do parcelamento')).toBeTruthy();
    expect(screen.getByText('R$ 59,28')).toBeTruthy();
  });

  it('pedido anterior a esta rodada (sem o campo): sem linha de juros', () => {
    renderConfirmacao({ forma: 'cartao_credito', charge: chargeFixture({ parcelas: 3 }) });
    expect(screen.queryByText(/juros do parcelamento/i)).toBeNull();
    expect(textoDosTotais()).not.toMatch(/undefined|NaN/);
  });
});
