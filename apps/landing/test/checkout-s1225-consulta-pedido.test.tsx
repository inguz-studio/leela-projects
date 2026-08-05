// =============================================================================
// PROVA de INTEGRAÇÃO da S1225-T3 (RN-469 + RN-470) — o fio inteiro.
//
// `checkout-s1225-estados-por-meio.test.tsx` prova o CONTRATO dos componentes.
// Este arquivo prova a FIAÇÃO no `CheckoutFlow`: que a consulta acontece nas
// duas ocasiões previstas (carregamento da cobrança e gesto explícito), que
// ela NÃO vira polling, que ela lê o pedido CERTO e que a tela reage.
//
// Por que ele existe: as suítes de fluxo do checkout mockam `@leela/api-client`
// função a função. Uma consulta nova cai num mock incompleto e a leitura falha
// em silêncio (ela é acessória de propósito) — a suíte fica VERDE sem exercitar
// nada. Aqui o mock inclui `getPedido`/`getLeelaDb`, e a asserção é sobre as
// chamadas, não sobre o que sobrou na tela.
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

const evento = {
  slug: 'experiencia-s1225',
  nome: 'Experiência S1225',
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
  seo: { titulo: 'Experiência S1225', descricao: 'desc' },
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

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  loginAnonimo.mockResolvedValue({ uid: 'anon-ana-4f21c9' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  expirarPixPendente.mockResolvedValue({ expirado: true, jaFinal: false });
  cotarInscricaoCheckout.mockResolvedValue(COTACAO);
  getLeelaDb.mockReturnValue({ __db: true });
  getPedido.mockResolvedValue({ id: PEDIDO_ID, status: 'pendente' });
  createInscricaoCharge.mockResolvedValue({
    pedidoId: PEDIDO_ID,
    pagamentoId: 'pag-s1225',
    inscritoIds: [`${PEDIDO_ID}-i1`],
    qrCode: 'PIX-PAYLOAD-S1225',
    chargeId: 'ch-s1225',
    pixExpiraEmMillis: Date.now() + 1_800_000,
    statusPedido: 'pendente',
    // A tela de confirmação relê a composição CONGELADA do pedido (S1216-T3);
    // sem ela o `pago` vindo da consulta chegaria a um render quebrado.
    valores: {
      valorBase: 5000,
      desconto: 0,
      valorFinal: 5000,
      taxaServico: 0,
      jurosParcelamento: 0,
      totalCobrado: 5000,
      parcelas: 1,
      valorParcela: 5000,
    },
    // Gateway REAL — é este o mundo em que a consulta faz sentido: aqui não
    // há botão de simular, e quem confirma é o webhook do Asaas.
    gatewayReal: true,
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

/** Vai até a etapa de pagar, escolhe PIX e gera a cobrança REAL. */
async function gerarPixReal(): Promise<void> {
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
  await waitFor(() => expect(screen.getByText('PIX-PAYLOAD-S1225')).toBeTruthy());
}

const btnAtualizar = (): HTMLElement =>
  screen.getByRole('button', { name: /atualizar estado do pedido/i });

// Cada `it` daqui monta o CheckoutFlow INTEIRO e o percorre até a cobrança —
// é o teste mais caro desta suíte. Os casos foram agrupados por FLUXO (e não
// um `it` por asserção) de propósito: um `it` por asserção multiplicaria essa
// montagem, e o custo em CPU dos workers paralelos do vitest fazia a suíte de
// cotação vizinha (debounce de 400 ms) flakear. Teste que derruba o vizinho é
// teste quebrado.
const ESPERA = { timeout: 5_000 } as const;

describe('S1225-T3 · a consulta acontece, e no pedido certo', () => {
  it('a cobrança nascer dispara UMA consulta — no pedido certo, silenciosa, e sem virar polling', async () => {
    await gerarPixReal();
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(1), ESPERA);

    // No pedido certo, com o handle de banco que o api-client devolve.
    expect(getPedido).toHaveBeenCalledWith({ __db: true }, PEDIDO_ID);

    // Silenciosa: na chegada ninguém pagou ainda, e a tela não afirma que há
    // uma confirmação em curso.
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();

    // E não vira polling — a v1 da RN-470 não tem escuta automática. A janela
    // é folgada em relação ao debounce de 400 ms da cotação e curta o
    // bastante para não pesar na suíte.
    await passarDebounce(700);
    expect(getPedido).toHaveBeenCalledTimes(1);
  });

  it('o GESTO consulta de novo: pendente mostra a mensagem do dono, pago leva à confirmação', async () => {
    await gerarPixReal();
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(1), ESPERA);

    // 1º gesto — o webhook ainda não materializou o `pago`.
    await act(async () => {
      fireEvent.click(btnAtualizar());
    });
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(2), ESPERA);
    await waitFor(
      () => expect(screen.getByText('Estamos confirmando o seu pedido')).toBeTruthy(),
      ESPERA,
    );
    expect(screen.getByText(/confira a caixa de entrada/i)).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();

    // 2º gesto — o webhook chegou. A tela para de esperar.
    getPedido.mockResolvedValue({ id: PEDIDO_ID, status: 'pago' });
    await act(async () => {
      fireEvent.click(btnAtualizar());
    });
    await waitFor(() => expect(screen.getByText('Inscrição confirmada!')).toBeTruthy(), ESPERA);
    // O caminho do sandbox não foi acionado: com gateway real quem confirma é
    // o webhook, e a tela só FOI OLHAR o registro.
    expect(confirmarPagamentoSandbox).not.toHaveBeenCalled();
  });

  it('consulta que falha (Rules, rede) não derruba a tela — o QR segue à mão', async () => {
    await gerarPixReal();
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(1), ESPERA);
    getPedido.mockRejectedValue(
      Object.assign(new Error('Missing or insufficient permissions.'), {
        code: 'permission-denied',
      }),
    );
    await act(async () => {
      fireEvent.click(btnAtualizar());
    });
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(2), ESPERA);
    expect(screen.getByText('PIX-PAYLOAD-S1225')).toBeTruthy();
    expect(btnAtualizar()).toBeTruthy();
    // Falha de leitura NÃO pode virar "estamos confirmando": a plataforma não
    // sabe de nada a mais do que sabia antes do clique.
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
  });
});
