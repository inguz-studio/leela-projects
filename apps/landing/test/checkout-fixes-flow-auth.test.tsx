// =============================================================================
// PROVA do fix BC-2/T2 (lote CHECKOUT-FIXES · trace leela-build-2d6ee98d):
// a sessão anônima é RECUPERÁVEL e a copy é humana.
//   - falha da auth → banner com copy em português comum (zero jargão de infra:
//     nunca "Firebase", nunca o erro cru do SDK) + botão "Tentar novamente";
//   - enquanto o erro está ativo, o avanço fica bloqueado no step 0;
//   - clicar "Tentar novamente" com a auth recuperada limpa o erro e destrava.
//
// api-client e leelaClient são mockados (o teste não sobe Firebase).
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { EventoPublico } from '@/lib/tipos';

const loginAnonimo = vi.fn();
const cotarInscricaoCheckout = vi.fn();
const createInscricaoCharge = vi.fn();
const confirmarPagamentoSandbox = vi.fn();
// S1209-T3: o flow passou a consultar o prefill do comprador conhecido
// (RN-154/RN-174) assim que a sessão fica pronta. O mock ganhou a função —
// nenhuma asserção deste arquivo foi tocada.
const getCheckoutPrefill = vi.fn(async () => ({ prefill: null }));
const ensureLeela = vi.fn();

vi.mock('@leela/api-client', () => ({
  loginAnonimo: (...a: unknown[]) => loginAnonimo(...a),
  cotarInscricaoCheckout: (...a: unknown[]) => cotarInscricaoCheckout(...a),
  createInscricaoCharge: (...a: unknown[]) => createInscricaoCharge(...a),
  confirmarPagamentoSandbox: (...a: unknown[]) => confirmarPagamentoSandbox(...a),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...(a as [])),
}));

vi.mock('@/lib/leelaClient', () => ({
  ensureLeela: (...a: unknown[]) => ensureLeela(...a),
}));

// Import DEPOIS dos mocks (o componente resolve os módulos já mockados).
import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';

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
  // CKMOD — projeção nova do leitor (defaults legais/flags OFF)
  exigenciasSaude: { atestado: false, parq: false },
  politicaVendas: {
    versao: 1,
    reembolso: { janelaArrependimentoDias: 7, corteHoras: 48, slaAnaliseDias: 3 },
    transferencia: { habilitada: false, janelaHoras: 72, taxa: 0 },
    trocaIngresso: { habilitada: false, janelaHoras: 48, permiteReembolsoDowngrade: false },
  },
  termoSaudeVersao: 1,
  termoSaudeCustom: null,
  taxaRepassada: false,
};

beforeEach(() => {
  vi.useFakeTimers();
  loginAnonimo.mockReset();
  ensureLeela.mockReset();
  cotarInscricaoCheckout.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CheckoutFlow — BC-2 · sessão anônima recuperável', () => {
  it('auth OK: renderiza o step 0 sem banner de erro', async () => {
    loginAnonimo.mockResolvedValue(undefined);
    render(<CheckoutFlow evento={evento} atribuicao={{}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText(/modalidade e kit/i)).toBeTruthy();
    expect(screen.queryByText(/não conseguimos preparar seu pagamento/i)).toBeNull();
  });

  it('auth falha: banner humano (sem jargão), avanço bloqueado, retry destrava', async () => {
    loginAnonimo.mockRejectedValue(new Error('Firebase: Error (auth/network-request-failed).'));
    render(<CheckoutFlow evento={evento} atribuicao={{}} />);

    // Deixa a tentativa de mount + o retry automático (backoff) esgotarem.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Copy humana, sem vazar infra.
    expect(screen.getByText(/não conseguimos preparar seu pagamento/i)).toBeTruthy();
    expect(screen.queryByText(/firebase/i)).toBeNull();
    expect(screen.queryByText(/auth\/network/i)).toBeNull();

    // Avanço bloqueado no step 0 enquanto o erro está ativo.
    const continuar = screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement;
    expect(continuar.disabled).toBe(true);

    // Recuperação: próxima tentativa resolve.
    loginAnonimo.mockResolvedValueOnce(undefined);
    const retry = screen.getByRole('button', { name: /tentar novamente/i });
    await act(async () => {
      fireEvent.click(retry);
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.queryByText(/não conseguimos preparar seu pagamento/i)).toBeNull();
    expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
