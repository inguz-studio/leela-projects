// =============================================================================
// REV-5C · o código da compra ANTERIOR não pode sobreviver à cobrança nova.
//
// A BUILD-5C zerou o `codigoPedido` em dois pontos SÍNCRONOS (invalidação por
// preço e `novaCobrancaPix`) e declarou o vetor: *"se existir um terceiro
// caminho que troque o `pedidoId` sem passar por nenhum dos dois, a tela
// mostraria o código do pedido anterior — e essa é a única falha desta lane
// que faria alguém ditar a compra errada"*.
//
// O terceiro caminho existe, e ele não é um `setCharge` a mais: é a LEITURA
// que já estava no ar quando os dois zeraram. As duas leituras que captam o
// código (`consultarPedido` e a dedicada do cartão) escrevem o resultado sem
// conferir se o pedido que elas leram ainda é o pedido da tela — o único guard
// é `montadoRef`, que só sabe de desmontagem.
//
// O caminho pela UI, sem nenhuma condição rara:
//   1. PIX: "Gerar código PIX" cria o pedido A; a consulta de carregamento lê
//      o código de A e o põe na tela;
//   2. a pessoa muda de ideia e clica em "Cartão de crédito". A invalidação por
//      preço zera cobrança e código — MAS o efeito da leitura dedicada roda no
//      MESMO flush, ainda enxergando a cobrança de A, e dispara `getPedido(A)`;
//   3. a resposta de A aterrissa depois do zero e RESSUSCITA o código de A;
//   4. o cartão cria o pedido B. Se a leitura de B não voltar (Rules, rede — o
//      caso que a própria lane já testa como "falha engolida"), a confirmação
//      de B fica exibindo o código de A: um código REAL, de uma compra
//      cancelada, que o balcão encontra e abre.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EventoPublico } from '@/lib/tipos';

const loginAnonimo = vi.fn();
const cotarInscricaoCheckout = vi.fn();
const createInscricaoCharge = vi.fn();
const confirmarPagamentoSandbox = vi.fn();
const expirarPixPendente = vi.fn();
const getCheckoutPrefill = vi.fn();
const getPedido = vi.fn();
const getLeelaDb = vi.fn();
const ensureLeela = vi.fn();

vi.mock('@leela/api-client', () => ({
  loginAnonimo: (...a: unknown[]) => loginAnonimo(...a),
  cotarInscricaoCheckout: (...a: unknown[]) => cotarInscricaoCheckout(...a),
  createInscricaoCharge: (...a: unknown[]) => createInscricaoCharge(...a),
  confirmarPagamentoSandbox: (...a: unknown[]) => confirmarPagamentoSandbox(...a),
  expirarPixPendente: (...a: unknown[]) => expirarPixPendente(...a),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
  getPedido: (...a: unknown[]) => getPedido(...a),
  getLeelaDb: (...a: unknown[]) => getLeelaDb(...a),
}));
vi.mock('@/lib/leelaClient', () => ({ ensureLeela: (...a: unknown[]) => ensureLeela(...a) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';

/** O pedido ABANDONADO (PIX que a pessoa desistiu de pagar). */
const PEDIDO_A = 'ped-anon-ana-4f21c9-chk-aaaaaaaa';
const CODIGO_A = 'A2B3C';
/** O pedido que a pessoa DE FATO pagou, no cartão. */
const PEDIDO_B = 'ped-anon-ana-4f21c9-chk-bbbbbbbb';
const CODIGO_B = 'K7MPQ';

const evento = {
  slug: 'experiencia-s1228',
  nome: 'Experiência S1228',
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
  seo: { titulo: 'Experiência S1228', descricao: 'desc' },
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

const COTACAO = {
  itens: [{ modalidade: '5k', preco: 5000, loteNome: 'Lote 1', kitNome: null, kitPreco: 0 }],
  valorBase: 5000,
  desconto: 0,
  valorFinal: 5000,
  cupomAplicado: null,
  taxaServico: 0,
  totalAVista: 5000,
  jurosParcelamento: 0,
  opcoesParcelamento: [{ parcelas: 1, valorParcela: 5000, valorTotal: 5000 }],
  parcelamento: { parcelas: 1, valorParcela: 5000, valorTotal: 5000 },
  totalCobrado: 5000,
  forma: 'pix',
  totaisPorMeio: { pix: 5000, cartao_credito: 5000 },
};

const VALORES = {
  valorBase: 5000,
  desconto: 0,
  valorFinal: 5000,
  taxaServico: 0,
  jurosParcelamento: 0,
  totalCobrado: 5000,
  parcelas: 1,
  valorParcela: 5000,
};

function chargeDe(pedidoId: string): Record<string, unknown> {
  return {
    pedidoId,
    pagamentoId: `pag-${pedidoId}`,
    inscritoIds: [`${pedidoId}-i1`],
    qrCode: 'PIX-PAYLOAD-S1228',
    chargeId: `ch-${pedidoId}`,
    pixExpiraEmMillis: Date.now() + 1_800_000,
    statusPedido: 'pendente',
    valores: VALORES,
    gatewayReal: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  loginAnonimo.mockResolvedValue({ uid: 'anon-ana-4f21c9' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  expirarPixPendente.mockResolvedValue({ expirado: true, jaFinal: false });
  cotarInscricaoCheckout.mockResolvedValue(COTACAO);
  getLeelaDb.mockReturnValue({ __db: true });
  createInscricaoCharge
    .mockResolvedValueOnce(chargeDe(PEDIDO_A))
    .mockResolvedValueOnce(chargeDe(PEDIDO_B));
  confirmarPagamentoSandbox.mockResolvedValue({
    pedidoId: PEDIDO_B,
    statusPedido: 'pago',
    statusPagamento: 'confirmado',
  });
});

afterEach(cleanup);

function preencherDados(): void {
  fireEvent.change(screen.getAllByLabelText(/nome completo/i)[0]!, {
    target: { value: 'Ana Corredora' },
  });
  fireEvent.change(screen.getAllByLabelText(/^e-mail/i)[0]!, {
    target: { value: 'ana@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '11988887777' } });
  fireEvent.change(screen.getAllByLabelText(/^cpf/i)[0]!, {
    target: { value: '529.982.247-25' },
  });
  fireEvent.change(screen.getAllByLabelText(/data de nascimento/i)[0]!, {
    target: { value: '20/05/1990' },
  });
  fireEvent.change(screen.getByLabelText(/^cep/i), { target: { value: '01310100' } });
  fireEvent.change(screen.getByLabelText(/logradouro/i), { target: { value: 'Av. Paulista' } });
  fireEvent.change(screen.getByLabelText(/^número/i), { target: { value: '1000' } });
  fireEvent.change(screen.getByLabelText(/cidade/i), { target: { value: 'São Paulo' } });
  fireEvent.change(screen.getByLabelText(/^uf/i), { target: { value: 'SP' } });
  fireEvent.click(
    screen.getByRole('checkbox', { name: /termos da compra e a política de cancelamento/i }),
  );
  fireEvent.click(screen.getByRole('checkbox', { name: /boas condições de saúde/i }));
}

async function passarDebounce(ms = 400): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

const ESPERA = { timeout: 5_000 } as const;

describe('REV-5C · o código do pedido abandonado não volta pela leitura em voo', () => {
  it('PIX gerado → troca para cartão → a compra paga NÃO exibe o código da abandonada', async () => {
    // A leitura de A responde; a de B falha, que é o caso já previsto pela
    // lane ("falha engolida com log") e o que torna a corrupção PERMANENTE.
    getPedido.mockImplementation((_db: unknown, id: string) =>
      id === PEDIDO_A
        ? Promise.resolve({ id: PEDIDO_A, status: 'pendente', codigoPedido: CODIGO_A })
        : Promise.reject(
            Object.assign(new Error('Missing or insufficient permissions.'), {
              code: 'permission-denied',
            }),
          ),
    );

    await act(async () => {
      render(<CheckoutFlow evento={evento} atribuicao={{}} />);
    });
    fireEvent.click(screen.getByRole('radio', { name: /^5k/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
    });
    preencherDados();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
    });
    await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
    await passarDebounce();

    // 1 · PIX: o pedido A nasce e a consulta de carregamento lê o código dele.
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /^pix/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /gerar código pix/i }));
    });
    await waitFor(() => expect(screen.getByText('PIX-PAYLOAD-S1228')).toBeTruthy(), ESPERA);
    await waitFor(() => expect(getPedido).toHaveBeenCalledWith({ __db: true }, PEDIDO_A), ESPERA);

    // 2 · a pessoa muda de ideia. A invalidação por preço zera cobrança e
    //     código — e é aqui que a leitura em voo tem de ser descartada.
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });
    await passarDebounce();

    // 3 · o cartão cria o pedido B e o desfecho vem na própria chamada.
    await waitFor(
      () =>
        expect(
          (screen.getByRole('button', { name: /^pagar/i }) as HTMLButtonElement).disabled,
        ).toBe(false),
      ESPERA,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^pagar/i }));
    });
    await waitFor(() => expect(screen.getByText('Inscrição confirmada!')).toBeTruthy(), ESPERA);
    await passarDebounce();

    // O veredito: a confirmação é do pedido B. Sem o código de B, a linha some
    // (RN-475). O que ela NUNCA pode mostrar é o código de A — ele existe, é
    // de uma compra que não vingou, e o balcão o encontra.
    expect(document.body.textContent).not.toContain(`PED-${CODIGO_A}`);
    expect(document.body.textContent).not.toContain(CODIGO_A);
  });

  it('quando a leitura de B responde, é o código de B que fica — nunca o de A', async () => {
    getPedido.mockImplementation((_db: unknown, id: string) =>
      Promise.resolve(
        id === PEDIDO_A
          ? { id: PEDIDO_A, status: 'pendente', codigoPedido: CODIGO_A }
          : { id: PEDIDO_B, status: 'pago', codigoPedido: CODIGO_B },
      ),
    );

    await act(async () => {
      render(<CheckoutFlow evento={evento} atribuicao={{}} />);
    });
    fireEvent.click(screen.getByRole('radio', { name: /^5k/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
    });
    preencherDados();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
    });
    await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
    await passarDebounce();

    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /^pix/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /gerar código pix/i }));
    });
    await waitFor(() => expect(screen.getByText('PIX-PAYLOAD-S1228')).toBeTruthy(), ESPERA);
    await waitFor(() => expect(getPedido).toHaveBeenCalledWith({ __db: true }, PEDIDO_A), ESPERA);

    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });
    await passarDebounce();
    await waitFor(
      () =>
        expect(
          (screen.getByRole('button', { name: /^pagar/i }) as HTMLButtonElement).disabled,
        ).toBe(false),
      ESPERA,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^pagar/i }));
    });
    await waitFor(() => expect(screen.getByText('Inscrição confirmada!')).toBeTruthy(), ESPERA);
    await waitFor(() => expect(screen.getByText(`PED-${CODIGO_B}`)).toBeTruthy(), ESPERA);
    expect(document.body.textContent).not.toContain(CODIGO_A);
  });
});
