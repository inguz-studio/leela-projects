// =============================================================================
// PROVA de INTEGRAÇÃO do fluxo pós-pagamento (CKPIX-FLOW · RN-560 e RN-546).
//
// `checkout-ckpix-desfecho-ramos.test.ts` prova a REGRA (a tabela dos cinco
// ramos). Este arquivo prova a FIAÇÃO: que a tela assina o pedido certo, que o
// desfecho escrito pelo webhook chega SEM ninguém clicar, e que cada ramo faz o
// que o dono decidiu — inclusive a saída, que é a parte que ninguém vê num
// teste de unidade.
//
// COMO O WEBHOOK É SIMULADO. `observarPedido` é mockado capturando os handlers
// da assinatura; empurrar um doc por `handlers.next(...)` é exatamente o que o
// `onSnapshot` faz quando o servidor escreve. Nenhum clique participa disso, e
// é esse o ponto: a RN-470 dizia que a tela só sabia por gesto, e a RN-560 a
// revogou.
//
// A NAVEGAÇÃO é provada pela costura `@/lib/navegacao` (`irPara`), que existe
// justamente porque `jsdom` não navega — sem ela, o ramo do redirecionamento
// seria o único sem prova.
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
const irPara = vi.fn();

/** Handlers da assinatura VIVA — é por aqui que o "webhook" entra no teste. */
interface HandlersPedido {
  next: (p: unknown) => void;
  error?: (e: Error) => void;
}
let assinatura: { pedidoId: string; handlers: HandlersPedido } | null = null;
const cancelarAssinatura = vi.fn();

vi.mock('@leela/api-client', () => ({
  loginAnonimo: (...a: unknown[]) => loginAnonimo(...a),
  cotarInscricaoCheckout: (...a: unknown[]) => cotarInscricaoCheckout(...a),
  createInscricaoCharge: (...a: unknown[]) => createInscricaoCharge(...a),
  confirmarPagamentoSandbox: (...a: unknown[]) => confirmarPagamentoSandbox(...a),
  expirarPixPendente: (...a: unknown[]) => expirarPixPendente(...a),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
  getPedido: (...a: unknown[]) => getPedido(...a),
  getLeelaDb: (...a: unknown[]) => getLeelaDb(...a),
  observarPedido: (_db: unknown, pedidoId: string, handlers: HandlersPedido) => {
    assinatura = { pedidoId, handlers };
    return cancelarAssinatura;
  },
}));
vi.mock('@/lib/leelaClient', () => ({ ensureLeela: (...a: unknown[]) => ensureLeela(...a) }));
vi.mock('@/lib/navegacao', () => ({ irPara: (...a: unknown[]) => irPara(...a) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';

const PEDIDO_ID = 'ped-anon-ckpix-9f1a-chk-77ab12cd';
const SLUG = 'experiencia-ckpix';

const evento = {
  slug: SLUG,
  nome: 'Experiência CKPIX',
  dataISO: '2026-05-10T07:00:00-03:00',
  dataLabel: '10 de maio de 2026',
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
  seo: { titulo: 'Experiência CKPIX', descricao: 'desc' },
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
  window.sessionStorage.clear();
  assinatura = null;
  loginAnonimo.mockResolvedValue({ uid: 'anon-ckpix-9f1a' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  expirarPixPendente.mockResolvedValue({ expirado: true, jaFinal: false });
  cotarInscricaoCheckout.mockResolvedValue(COTACAO);
  getLeelaDb.mockReturnValue({ __db: true });
  getPedido.mockResolvedValue({ id: PEDIDO_ID, status: 'pendente' });
  createInscricaoCharge.mockResolvedValue({
    pedidoId: PEDIDO_ID,
    pagamentoId: 'pag-ckpix',
    inscritoIds: [`${PEDIDO_ID}-i1`],
    qrCode: 'PIX-PAYLOAD-CKPIX',
    chargeId: 'ch-ckpix',
    pixExpiraEmMillis: Date.now() + 1_800_000,
    statusPedido: 'pendente',
    valores: VALORES,
    gatewayReal: true,
  });
  confirmarPagamentoSandbox.mockResolvedValue({ status: 'confirmado', valores: VALORES });
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

/** Vai até a etapa de pagar e gera a cobrança PIX real. */
async function gerarPix(): Promise<void> {
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
  await waitFor(() => expect(screen.getByText('PIX-PAYLOAD-CKPIX')).toBeTruthy());
}

/** O mesmo caminho, pagando com CARTÃO (criar cobrança É pagar). */
async function pagarComCartao(): Promise<void> {
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
    fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
  });
  await passarDebounce();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^pagar/i }));
  });
}

/** O webhook escreveu — o servidor empurra o doc pela assinatura viva. */
async function webhookEscreve(doc: Record<string, unknown>): Promise<void> {
  await waitFor(() => expect(assinatura).not.toBeNull());
  await act(async () => {
    assinatura!.handlers.next({ id: PEDIDO_ID, ...doc });
  });
}

const ESPERA = { timeout: 5_000 } as const;

describe('RN-560 · a tela assina o próprio pedido', () => {
  it('a cobrança nascer abre a assinatura — no pedido certo, e ela morre com a tela', async () => {
    await gerarPix();
    await waitFor(() => expect(assinatura).not.toBeNull(), ESPERA);
    expect(assinatura!.pedidoId).toBe(PEDIDO_ID);
    expect(getLeelaDb).toHaveBeenCalled();

    // O cleanup devolve a assinatura: listener que sobrevive à tela é
    // vazamento, e num doc de dinheiro é vazamento que continua cobrando.
    cleanup();
    expect(cancelarAssinatura).toHaveBeenCalled();
  });

  it('a assinatura que CAI não derruba a tela — o QR e o botão manual continuam', async () => {
    await gerarPix();
    await waitFor(() => expect(assinatura).not.toBeNull(), ESPERA);
    await act(async () => {
      assinatura!.handlers.error?.(
        Object.assign(new Error('Missing or insufficient permissions.'), {
          code: 'permission-denied',
        }),
      );
    });
    expect(screen.getByText('PIX-PAYLOAD-CKPIX')).toBeTruthy();
    expect(screen.getByRole('button', { name: /atualizar estado do pedido/i })).toBeTruthy();
    // Falha de LEITURA não é recusa de PAGAMENTO, e a tela não as confunde.
    expect(screen.queryByText(/não foi aprovado/i)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('RN-560 · ramo 1 — PIX confirmado', () => {
  it('o webhook escreve `pago` e a tela vai à confirmação e à conta, SEM clique', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await gerarPix();
      // Ninguém clicou em "atualizar" — o doc chegou pela assinatura.
      await webhookEscreve({ status: 'pago', formaPagamento: 'pix', codigoPedido: 'K7M2P' });
      await waitFor(() => expect(screen.getByText('Inscrição confirmada!')).toBeTruthy(), ESPERA);
      expect(screen.getByText(/levando você para a sua conta/i)).toBeTruthy();
      // A saída de emergência aponta para o MESMO lugar que o temporizador.
      expect(
        screen.getByRole('link', { name: /ir agora/i }).getAttribute('href'),
      ).toBe('/minha-conta');
      // O sandbox não foi acionado: quem confirmou foi o webhook.
      expect(confirmarPagamentoSandbox).not.toHaveBeenCalled();

      expect(irPara).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(4000);
      });
      expect(irPara).toHaveBeenCalledWith('/minha-conta');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('RN-560 · ramo 2 — PIX vencido', () => {
  it('vencido vira o aviso do prazo, guarda o recado e leva à área do cliente', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await gerarPix();
      await webhookEscreve({
        status: 'cancelado',
        canceladoMotivo: 'pix_expirado',
        formaPagamento: 'pix',
      });
      await waitFor(
        () => expect(screen.getByText(/o pix foi cancelado depois que o prazo venceu/i)).toBeTruthy(),
        ESPERA,
      );
      // O aviso ATRAVESSA a navegação, e não pela URL.
      expect(window.sessionStorage.getItem('leela.aviso-area')).toBe('pix-vencido');

      await act(async () => {
        vi.advanceTimersByTime(4000);
      });
      expect(irPara).toHaveBeenCalledWith('/minha-conta');
    } finally {
      vi.useRealTimers();
    }
  });

  it('`cancelado` SEM motivo não ganha a frase do prazo nem manda ninguém embora', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await gerarPix();
      await webhookEscreve({ status: 'cancelado', formaPagamento: 'pix' });
      await waitFor(
        () => expect(screen.getByText('Este pedido não foi concluído')).toBeTruthy(),
        ESPERA,
      );
      expect(screen.queryByText(/prazo venceu/i)).toBeNull();
      await act(async () => {
        vi.advanceTimersByTime(4000);
      });
      expect(irPara).not.toHaveBeenCalled();
      expect(window.sessionStorage.getItem('leela.aviso-area')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('RN-560 · ramo 3 — cartão recusado', () => {
  it('a recusa volta ao checkout com a mensagem, e a tentativa seguinte nasce de cobrança NOVA', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await pagarComCartao();
      await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1), ESPERA);
      await webhookEscreve({ status: 'falhou', formaPagamento: 'cartao_credito' });

      await waitFor(
        () => expect(screen.getByText(/o pagamento não foi aprovado/i)).toBeTruthy(),
        ESPERA,
      );
      expect(screen.getByText(/revise os dados do cartão/i)).toBeTruthy();
      // A frase NÃO promete que nada saiu da conta: cartão pode deixar
      // pré-autorização, e esta tela não tem como garantir o contrário.
      expect(screen.queryByText(/nada foi cobrado/i)).toBeNull();

      // Fica no checkout: nem redireciona, nem promete confirmação.
      await act(async () => {
        vi.advanceTimersByTime(4000);
      });
      expect(irPara).not.toHaveBeenCalled();
      expect(screen.queryByText(/estamos confirmando/i)).toBeNull();

      // E a tentativa seguinte é uma COMPRA NOVA. Sem o descarte da cobrança
      // morta, o replay pela chave de idempotência devolveria o mesmo pedido
      // recusado e o botão viraria controle morto.
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^pagar/i }));
      });
      await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(2), ESPERA);
      const primeira = createInscricaoCharge.mock.calls[0]![0] as { idempotencyKey: string };
      const segunda = createInscricaoCharge.mock.calls[1]![0] as { idempotencyKey: string };
      expect(segunda.idempotencyKey).not.toBe(primeira.idempotencyKey);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('RN-560 · ramo 4 — cartão aceito', () => {
  it('aprovado mostra o sucesso, depois o loader, depois a conta', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await pagarComCartao();
      await webhookEscreve({
        status: 'pago',
        formaPagamento: 'cartao_credito',
        codigoPedido: 'Q4R8T',
      });
      await waitFor(() => expect(screen.getByText('Inscrição confirmada!')).toBeTruthy(), ESPERA);
      expect(screen.getByText(/levando você para a sua conta/i)).toBeTruthy();

      // A ORDEM é a decisão: o sucesso aparece ANTES de a tela mudar. Um
      // redirecionamento imediato seria não mostrar mensagem nenhuma.
      expect(irPara).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(4000);
      });
      expect(irPara).toHaveBeenCalledWith('/minha-conta');
    } finally {
      vi.useRealTimers();
    }
  });
});
