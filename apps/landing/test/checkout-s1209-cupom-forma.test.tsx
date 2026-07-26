// =============================================================================
// PROVA do S1209-T1 (trace leela-build-2d6ee98d · decisões D-4 e D-5).
//
//   D-4 — o campo de cupom aparece JÁ NO STEP 0 do checkout, além do auto-apply
//         do cupom vindo por URL; cupom inválido no step 0 mostra a recusa NO
//         PRÓPRIO CAMPO (não se disfarça de "erro de cotação").
//   D-5 — Pix e Cartão na etapa de pagamento são BOTÕES (RadioCard do DS), sem
//         toggle: o controle não é switch/checkbox e cada opção segue com role
//         de radio (a11y de fábrica + navegação por seta).
//
// O flow (CheckoutFlow) roda com api-client e leelaClient mockados — nenhum
// Firebase sobe; o servidor é quem valida o cupom, e é o mock que responde.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EventoPublico } from '@/lib/tipos';

const loginAnonimo = vi.fn();
const cotarInscricaoCheckout = vi.fn();
const createInscricaoCharge = vi.fn();
const confirmarPagamentoSandbox = vi.fn();
const getCheckoutPrefill = vi.fn();
const ensureLeela = vi.fn();

vi.mock('@leela/api-client', () => ({
  loginAnonimo: (...a: unknown[]) => loginAnonimo(...a),
  cotarInscricaoCheckout: (...a: unknown[]) => cotarInscricaoCheckout(...a),
  createInscricaoCharge: (...a: unknown[]) => createInscricaoCharge(...a),
  confirmarPagamentoSandbox: (...a: unknown[]) => confirmarPagamentoSandbox(...a),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
}));

vi.mock('@/lib/leelaClient', () => ({
  ensureLeela: (...a: unknown[]) => ensureLeela(...a),
}));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';
import { StepResumo } from '../app/(public)/[eventSlug]/inscricao/checkout/StepResumo';

const evento: EventoPublico = {
  slug: 'corrida-teste',
  nome: 'Corrida Teste',
  dataISO: '2026-04-26T07:00:00-03:00',
  dataLabel: '26 de abril de 2026',
  diaSemanaLabel: 'dom.',
  horaLabel: '07:00',
  local: 'Parque',
  modalidadeEsporte: 'Corrida de rua',
  usaChip: false,
  qtdInscritos: 0,
  organizador: null,
  modalidades: [{ nome: '5k', precoVigente: 5000 }],
  kits: [],
  itensTamanhados: [],
  precoMinimo: 5000,
  janelasRetirada: [],
  secoes: [],
  seo: { titulo: 'Corrida Teste', descricao: 'desc' },
  estadoVenda: 'aberto',
  exigenciasSaude: { atestado: false, parq: false },
  politicaVendas: {
    versao: 1,
    reembolso: { janelaArrependimentoDias: 7, corteHoras: 48, slaAnaliseDias: 3 },
    transferencia: { habilitada: false, janelaHoras: 72, taxa: 0 },
    trocaIngresso: { habilitada: false, janelaHoras: 48, permiteReembolsoDowngrade: false },
  },
  termoSaudeVersao: 1,
  taxaRepassada: false,
} as unknown as EventoPublico;

function cotacaoOk(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    itens: [{ modalidade: '5k', preco: 5000, loteNome: 'Lote 1' }],
    valorBase: 5000,
    desconto: 0,
    valorFinal: 5000,
    cupomAplicado: null,
    taxaServico: 0,
    totalAVista: 5000,
    opcoesParcelamento: [{ parcelas: 1, valorParcela: 5000, valorTotal: 5000 }],
    parcelamento: { parcelas: 1, valorParcela: 5000, valorTotal: 5000 },
    totalCobrado: 5000,
    forma: 'pix',
    totaisPorMeio: { pix: 5000, cartao_credito: 5000 },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  ensureLeela.mockReturnValue(undefined);
});

afterEach(cleanup);

async function montarStep0(cupomUrl?: string): Promise<void> {
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={cupomUrl ? { cupom: cupomUrl } : {}} />);
  });
}

/** Escolhe a modalidade do 1º atleta no step 0 (habilita a cotação). */
function escolherModalidade(): void {
  fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
}

describe('S1209-T1 · D-4 — cupom no STEP 0', () => {
  it('o campo de cupom já aparece no início do fluxo (step 0)', async () => {
    await montarStep0();
    expect(screen.getByLabelText('Código do cupom')).toBeTruthy();
    // Sem modalidade escolhida ainda não há o que precificar — a razão fica à
    // vista e o botão desabilitado (nunca um "aplicado" falso).
    expect(screen.getByText(/escolha a modalidade de cada atleta/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /aplicar/i }).hasAttribute('disabled')).toBe(true);
  });

  it('cupom VÁLIDO no step 0: aplica pela cotação do servidor e some o input', async () => {
    cotarInscricaoCheckout.mockResolvedValue(
      cotacaoOk({ desconto: 500, cupomAplicado: { codigo: 'HEROI10' } }),
    );
    await montarStep0();
    escolherModalidade();

    fireEvent.change(screen.getByLabelText('Código do cupom'), {
      target: { value: 'heroi10' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /aplicar/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/cupom heroi10 aplicado/i)).toBeTruthy();
    });
    // O código sobe SEMPRE em maiúsculo para o servidor.
    expect(cotarInscricaoCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ cupomCodigo: 'HEROI10' }),
    );
  });

  it('cupom INVÁLIDO no step 0: recusa aparece no campo, e não como erro de cotação', async () => {
    cotarInscricaoCheckout.mockRejectedValue(new Error('Cupom expirado.'));
    await montarStep0();
    escolherModalidade();

    fireEvent.change(screen.getByLabelText('Código do cupom'), {
      target: { value: 'EXPIRADO' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /aplicar/i }));
    });

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toMatch(/o cupom EXPIRADO não pôde ser aplicado/i);
    // Fica no step 0 e o campo continua editável (sem beco sem saída).
    expect(screen.getByLabelText('Código do cupom')).toBeTruthy();
  });

  it('auto-apply por URL resolve JÁ NO STEP 0, sem atravessar o fluxo', async () => {
    cotarInscricaoCheckout.mockResolvedValue(
      cotacaoOk({ desconto: 500, cupomAplicado: { codigo: 'LINK10' } }),
    );
    await montarStep0('link10');
    await act(async () => {
      escolherModalidade();
    });

    await waitFor(() => {
      expect(screen.getByText(/cupom link10 aplicado/i)).toBeTruthy();
    });
    expect(cotarInscricaoCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ cupomCodigo: 'LINK10' }),
    );
  });

  it('auto-apply por URL que NÃO cola: banner honesto no step 0 e segue sem cupom', async () => {
    cotarInscricaoCheckout.mockRejectedValue(new Error('não encontrado'));
    await montarStep0('naoexiste');
    await act(async () => {
      escolherModalidade();
    });

    await waitFor(() => {
      expect(screen.getByText(/o cupom NAOEXISTE não pôde ser aplicado/i)).toBeTruthy();
    });
    expect(screen.queryByText(/cupom naoexiste aplicado/i)).toBeNull();
  });
});

describe('S1209-T1 · D-5 — Pix e Cartão são BOTÕES, sem toggle', () => {
  const noop = (): void => {};

  function renderResumo(over: Partial<Parameters<typeof StepResumo>[0]> = {}): void {
    render(
      <StepResumo
        cotacao={cotacaoOk() as never}
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
        {...over}
      />,
    );
  }

  it('renderiza as duas opções como cartões de decisão clicáveis (role radio)', () => {
    renderResumo();
    expect(screen.getByRole('radio', { name: 'PIX (à vista)' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Cartão de crédito' })).toBeTruthy();
  });

  it('SEM toggle: nenhum switch/checkbox na escolha da forma', () => {
    renderResumo();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /pix|cart/i })).toBeNull();
  });

  it('cada botão carrega o apoio da decisão (validade do PIX / parcelamento)', () => {
    renderResumo();
    expect(screen.getByText(/o código vale por 30 minutos/i)).toBeTruthy();
    expect(screen.getByText(/à vista ou parcelado/i)).toBeTruthy();
  });

  it('clicar no botão do cartão troca a forma escolhida', () => {
    const onForma = vi.fn();
    renderResumo({ onForma });
    fireEvent.click(screen.getByRole('radio', { name: 'Cartão de crédito' }));
    expect(onForma).toHaveBeenCalledWith('cartao_credito');
  });
});
