// =============================================================================
// GUARDA DE REGRESSÃO da review KITCUPOM-REV — Alvo C.
//
// O DEFEITO (herdado da S1209, encontrado pelo builder da B2 e confirmado
// aqui): no step 0, "Remover" desligava o cupom no estado e NÃO descartava a
// cotação. Como o efeito de cotação só roda a partir do step 2
// (`precisaCotar = step >= 2`), nada substituía o número velho — a tela seguia
// exibindo "Cupom FLORIPA10 aplicado — menos R$ …" para sempre. E como o campo
// de digitação só aparece quando NÃO há código aplicado, a pessoa também não
// conseguia reaplicar: o desconto ia embora do estado, a tela continuava
// prometendo desconto, e não havia caminho de volta sem recarregar a página.
//
// Medido antes do fix: depois do clique em "Remover", `queryByText(/Cupom
// FLORIPA10 aplicado/)` continuava encontrando o texto e o `Input` "Código do
// cupom" continuava ausente.
//
// O que estes casos travam: (1) o rótulo do cupom some no ato; (2) o campo
// volta, então dá para reaplicar; (3) o valor exibido NUNCA é calculado aqui —
// depois do "Remover" a tela não tem cotação nenhuma para exibir, e a próxima
// vem inteira do servidor.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EventoPublico } from '@/lib/tipos';

const loginAnonimo = vi.fn();
const cotarInscricaoCheckout = vi.fn();
const getCheckoutPrefill = vi.fn();
const ensureLeela = vi.fn();

vi.mock('@leela/api-client', () => ({
  loginAnonimo: (...a: unknown[]) => loginAnonimo(...a),
  cotarInscricaoCheckout: (...a: unknown[]) => cotarInscricaoCheckout(...a),
  createInscricaoCharge: vi.fn(),
  confirmarPagamentoSandbox: vi.fn(),
  expirarPixPendente: vi.fn(),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
}));
vi.mock('@/lib/leelaClient', () => ({ ensureLeela: (...a: unknown[]) => ensureLeela(...a) }));

let queryAtual = new URLSearchParams();
vi.mock('next/navigation', () => ({ useSearchParams: () => queryAtual }));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';

const SLUG = 'corrida-teste';

const evento = {
  slug: SLUG,
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

const COM_CUPOM = cotacaoOk({
  desconto: 500,
  valorFinal: 4500,
  totalCobrado: 4500,
  cupomAplicado: { codigo: 'FLORIPA10', desconto: 500 },
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  queryAtual = new URLSearchParams();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  ensureLeela.mockReturnValue(undefined);
});

afterEach(cleanup);

async function montarComCupomAplicado(): Promise<void> {
  cotarInscricaoCheckout.mockResolvedValue(COM_CUPOM);
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={{ cupom: 'FLORIPA10' }} />);
  });
  fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
  await waitFor(() => expect(screen.getByText(/Cupom FLORIPA10 aplicado/i)).toBeTruthy());
}

describe('KITCUPOM-REV · "Remover" no step 0 não pode mentir sobre desconto', () => {
  it('o rótulo "Cupom X aplicado — menos R$ …" some no ato do clique', async () => {
    await montarComCupomAplicado();
    expect(screen.getByText(/Cupom FLORIPA10 aplicado/i).textContent).toMatch(/menos R\$/);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Remover$/i }));
    });

    expect(screen.queryByText(/Cupom FLORIPA10 aplicado/i)).toBeNull();
    expect(screen.queryByText(/menos R\$/i)).toBeNull();
  });

  it('o campo de digitação VOLTA — sem ele a pessoa fica sem caminho de volta', async () => {
    await montarComCupomAplicado();
    // Com cupom aplicado o campo não existe: o bloco verde ocupa o lugar.
    expect(screen.queryByLabelText('Código do cupom')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Remover$/i }));
    });

    const campo = screen.getByLabelText('Código do cupom') as HTMLInputElement;
    expect(campo).toBeTruthy();
    expect(campo.value).toBe('');
  });

  it('reaplicar depois de remover volta a funcionar, e o número vem do SERVIDOR', async () => {
    await montarComCupomAplicado();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Remover$/i }));
    });

    const chamadasAntes = cotarInscricaoCheckout.mock.calls.length;
    fireEvent.change(screen.getByLabelText('Código do cupom'), {
      target: { value: 'FLORIPA10' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Aplicar$/i }));
    });

    // A reaplicação é uma COTAÇÃO nova — a interface não ressuscita o número
    // velho que estava na tela, ela pede o valor ao servidor de novo.
    expect(cotarInscricaoCheckout.mock.calls.length).toBe(chamadasAntes + 1);
    expect(cotarInscricaoCheckout.mock.calls.at(-1)?.[0]).toMatchObject({
      cupomCodigo: 'FLORIPA10',
    });
    expect(screen.getByText(/Cupom FLORIPA10 aplicado/i)).toBeTruthy();
  });

  it('remover NÃO recota sozinho no step 0 — quem paga a chamada é a reaplicação', async () => {
    await montarComCupomAplicado();
    const chamadas = cotarInscricaoCheckout.mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Remover$/i }));
    });
    // O step 0 não tem bloco de totais: descartar a cotação basta, e gastar um
    // round-trip para exibir um número que ninguém vê seria custo puro.
    expect(cotarInscricaoCheckout.mock.calls.length).toBe(chamadas);
  });
});
