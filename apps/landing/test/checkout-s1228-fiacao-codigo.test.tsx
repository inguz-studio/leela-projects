// =============================================================================
// FIAÇÃO da S1228-T2 no `CheckoutFlow` (RN-474 · RN-475).
//
// `checkout-s1228-codigo-compra.test.tsx` prova o CONTRATO da tela: dado um
// código, ela o exibe; dada a ausência, ela não inventa nada. Este arquivo
// prova a outra metade, que é de onde o código VEM — e ela não é óbvia.
//
// O `createInscricaoCharge` grava o `codigoPedido` no doc do pedido mas NÃO o
// devolve na resposta da callable. A landing não tem, portanto, o código em
// mãos ao chegar na confirmação: ela o LÊ do próprio pedido, pela porta que a
// S1225-T3 já abriu (RN-469). São dois caminhos até a mesma leitura, e é por
// isso que são dois casos:
//
//   PIX     — a consulta de status já roda no carregamento, e o código vem de
//             carona nela. Custo: zero leitura a mais.
//   CARTÃO  — a consulta de status NÃO roda (o desfecho se resolve na própria
//             chamada de pagar), então existe uma leitura dedicada, uma por
//             pedido. Sem ela o comprador de cartão chegaria à confirmação sem
//             referência nenhuma — nem o código, nem o id.
//
// Por que este arquivo existe separado: as suítes de fluxo do checkout mockam
// `@leela/api-client` função a função, e uma leitura nova que caia num mock
// incompleto falha em SILÊNCIO (ela é acessória de propósito). O arquivo fica
// verde sem exercitar nada. Aqui `getPedido` é mockado e a asserção é sobre o
// que sobrou na tela.
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

const PEDIDO_ID = 'ped-anon-ana-4f21c9-chk-a1b2c3d4';
const UID_NO_MEIO = 'anon-ana-4f21c9';
/** Os cinco símbolos como o doc grava. O prefixo é do core. */
const CODIGO = 'K7MPQ';
const CODIGO_EXIBIDO = 'PED-K7MPQ';

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

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  loginAnonimo.mockResolvedValue({ uid: 'anon-ana-4f21c9' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  expirarPixPendente.mockResolvedValue({ expirado: true, jaFinal: false });
  cotarInscricaoCheckout.mockResolvedValue(COTACAO);
  getLeelaDb.mockReturnValue({ __db: true });
  // O doc do pedido, como o servidor o gravou: os cinco símbolos LIMPOS.
  getPedido.mockResolvedValue({ id: PEDIDO_ID, status: 'pendente', codigoPedido: CODIGO });
  createInscricaoCharge.mockResolvedValue({
    pedidoId: PEDIDO_ID,
    pagamentoId: 'pag-s1228',
    inscritoIds: [`${PEDIDO_ID}-i1`],
    qrCode: 'PIX-PAYLOAD-S1228',
    chargeId: 'ch-s1228',
    pixExpiraEmMillis: Date.now() + 1_800_000,
    statusPedido: 'pendente',
    valores: VALORES,
    gatewayReal: true,
  });
  confirmarPagamentoSandbox.mockResolvedValue({
    pedidoId: PEDIDO_ID,
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

/** Até a etapa de pagar, com o meio escolhido. */
async function irAtePagamento(forma: 'pix' | 'cartao'): Promise<void> {
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
  if (forma === 'pix') {
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /^pix/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /gerar código pix/i }));
    });
    await waitFor(() => expect(screen.getByText('PIX-PAYLOAD-S1228')).toBeTruthy());
    return;
  }
  await act(async () => {
    fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
  });
  await waitFor(() =>
    expect((screen.getByRole('button', { name: /^pagar/i }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
}

const ESPERA = { timeout: 5_000 } as const;

function expectSemIdInterno(): void {
  const texto = document.body.textContent ?? '';
  expect(texto).not.toContain(PEDIDO_ID);
  expect(texto).not.toContain(UID_NO_MEIO);
}

describe('S1228-T2 · o código chega à tela pelos DOIS caminhos de leitura', () => {
  it('PIX: o código vem de carona na consulta de status — sem uma leitura a mais', async () => {
    await irAtePagamento('pix');
    // A consulta de CARREGAMENTO já rodou: uma leitura, e o código já foi
    // captado dela mesmo com o pedido ainda pendente. O código é imutável e
    // não depende de desfecho — prendê-lo ao `pago` seria perdê-lo por um
    // motivo que não tem nada a ver com ele.
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(1), ESPERA);

    // O webhook chegou; o gesto traz o desfecho e a tela vira confirmação.
    getPedido.mockResolvedValue({ id: PEDIDO_ID, status: 'pago', codigoPedido: CODIGO });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /atualizar estado do pedido/i }));
    });
    await waitFor(() => expect(screen.getByText('Inscrição confirmada!')).toBeTruthy(), ESPERA);
    expect(screen.getByText(CODIGO_EXIBIDO)).toBeTruthy();
    expectSemIdInterno();

    // Duas leituras, e as duas são da S1225: carregamento e gesto. A leitura
    // dedicada do código NÃO roda no PIX — ela é do caminho do cartão.
    expect(getPedido).toHaveBeenCalledTimes(2);
  });

  it('CARTÃO: a leitura dedicada existe, e é UMA por pedido', async () => {
    await irAtePagamento('cartao');
    // Antes de pagar não há pedido, então não há nada a ler.
    expect(getPedido).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^pagar/i }));
    });
    await waitFor(() => expect(screen.getByText('Inscrição confirmada!')).toBeTruthy(), ESPERA);

    await waitFor(() => expect(screen.getByText(CODIGO_EXIBIDO)).toBeTruthy(), ESPERA);
    expect(getPedido).toHaveBeenCalledWith({ __db: true }, PEDIDO_ID);
    expectSemIdInterno();

    // A `ref` de leitura segura o efeito: re-renders não relêem o mesmo pedido.
    await passarDebounce(600);
    expect(getPedido).toHaveBeenCalledTimes(1);
  });

  it('CARTÃO com compra anterior ao backfill: a tela fica correta e MUDA sobre o id', async () => {
    // Um dos dezessete pedidos que ainda não têm código. A leitura acontece, o
    // doc responde sem o campo, e a tela não escreve nada no lugar.
    getPedido.mockResolvedValue({ id: PEDIDO_ID, status: 'pago' });
    await irAtePagamento('cartao');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^pagar/i }));
    });
    await waitFor(() => expect(screen.getByText('Inscrição confirmada!')).toBeTruthy(), ESPERA);
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(1), ESPERA);

    expect(document.body.textContent).not.toContain('PED-');
    expectSemIdInterno();
  });

  it('a leitura do código que FALHA não derruba a confirmação de quem pagou', async () => {
    getPedido.mockRejectedValue(
      Object.assign(new Error('Missing or insufficient permissions.'), {
        code: 'permission-denied',
      }),
    );
    await irAtePagamento('cartao');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^pagar/i }));
    });
    await waitFor(() => expect(screen.getByText('Inscrição confirmada!')).toBeTruthy(), ESPERA);
    // Sem código na tela — e, de novo, nada de id no lugar dele.
    expect(document.body.textContent).not.toContain('PED-');
    expectSemIdInterno();
  });
});
