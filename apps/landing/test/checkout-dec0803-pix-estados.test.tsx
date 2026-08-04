// =============================================================================
// DEC-0803 · C3-0803 — os estados do PIX na ordem do dono.
//
// Verbatim (2026-08-03): *"Já para o pix, o 'processando pagamento' só deve
// aparecer depois de clicar em 'código pix', com um loader aparecendo com a
// mensagem 'Preparando código pix', com o pix aparecendo na tela."*
//
// A ordem que passa a valer:
//   1. escolher PIX — nada acontece. Nenhuma cobrança, nenhum estado de espera.
//   2. clicar em "Gerar código PIX" — UMA chamada, e um loader que diz
//      exatamente "Preparando código PIX".
//   3. o código aparece.
//
// POR QUE ISSO É DINHEIRO, e não interface: `createInscricaoCharge` grava
// pedido, pagamento e inscritos como PENDENTES antes de falar com o gateway,
// recomputa os contadores do evento no caminho e cria cobrança real no
// provedor. Escolher "PIX" para ver o preço não pode fazer nada disso.
//
// Refina a D-ACH-12/C2 da ACHADOS-0802 (que tirou a PRÉ-SELEÇÃO do PIX): a
// cobrança nascia na escolha da forma; passa a nascer só no clique do botão.
// RN-440 continua inteira — chegar na etapa não cria nada.
//
// "Processando pagamento" (DEC-0727 · teto de 15s) segue existindo SÓ no lugar
// dela: pós-submissão que demora. Os últimos casos deste arquivo são a prova
// de que ela não foi apagada junto.
//
// ESTES CASOS REPROVAM A VERSÃO ANTERIOR: em `b29e9719` a auto-geração (A-3)
// cria a cobrança na escolha do PIX e a espera se anuncia como "Processando
// pagamento".
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
const ensureLeela = vi.fn();

vi.mock('@leela/api-client', () => ({
  loginAnonimo: (...a: unknown[]) => loginAnonimo(...a),
  cotarInscricaoCheckout: (...a: unknown[]) => cotarInscricaoCheckout(...a),
  createInscricaoCharge: (...a: unknown[]) => createInscricaoCharge(...a),
  confirmarPagamentoSandbox: (...a: unknown[]) => confirmarPagamentoSandbox(...a),
  expirarPixPendente: (...a: unknown[]) => expirarPixPendente(...a),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
}));
vi.mock('@/lib/leelaClient', () => ({ ensureLeela: (...a: unknown[]) => ensureLeela(...a) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';

const evento = {
  slug: 'experiencia-0803-pix',
  nome: 'Experiência 0803',
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
  seo: { titulo: 'Experiência 0803', descricao: 'desc' },
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

/** Erro de callable com `code` e `details` — o formato que o SDK entrega. */
function erroCallable(code: string, motivo: string): Error {
  return Object.assign(new Error('falhou'), { code, details: { motivo } });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  confirmarPagamentoSandbox.mockRejectedValue(new Error('sandbox fora'));
  expirarPixPendente.mockResolvedValue({ expirado: true, jaFinal: false });
  cotarInscricaoCheckout.mockResolvedValue(COTACAO);
  createInscricaoCharge.mockResolvedValue({
    pedidoId: 'ped-pix-0803',
    qrCode: 'PIX-PAYLOAD-0803',
    chargeId: 'ch-0803',
    pixExpiraEmMillis: Date.now() + 1_800_000,
    // PIXREAL-FIX T3: este arquivo descreve o SANDBOX (ele clica em "Já
    // paguei"), e a partir de agora é o servidor que diz se aquele botão pode
    // existir. Sem este `false` a cobrança seria lida como real e o botão
    // sumiria — que é exatamente o comportamento novo, provado no arquivo
    // `checkout-pixreal-banner-simulacao.test.tsx`.
    gatewayReal: false,
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

async function irAtePagar(): Promise<void> {
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
  await waitFor(() => expect(screen.getByText('Subtotal')).toBeTruthy());
  await passarDebounce();
}

async function escolherPix(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('radio', { name: /^pix/i }));
  });
}

function botaoGerar(): HTMLButtonElement {
  return screen.getByRole('button', { name: /gerar código pix/i }) as HTMLButtonElement;
}

describe('C3-0803 · nada nasce antes do clique', () => {
  it('RN-440 · chegar à etapa de pagamento não cria cobrança', async () => {
    await irAtePagar();
    await passarDebounce(300);
    expect(createInscricaoCharge).not.toHaveBeenCalled();
  });

  it('escolher PIX NÃO chama createInscricaoCharge — nem depois de uma janela generosa', async () => {
    await irAtePagar();
    await escolherPix();
    await passarDebounce(500);
    expect(createInscricaoCharge).not.toHaveBeenCalled();
  });

  it('escolher PIX não anuncia espera nenhuma — a tela só oferece o botão', async () => {
    await irAtePagar();
    await escolherPix();
    expect(screen.queryByText(/processando pagamento/i)).toBeNull();
    expect(screen.queryByText(/preparando código pix/i)).toBeNull();
    expect(botaoGerar().disabled).toBe(false);
  });
});

describe('C3-0803 · o clique, o loader e o código — nessa ordem', () => {
  it('clicar chama createInscricaoCharge UMA vez', async () => {
    await irAtePagar();
    await escolherPix();
    await act(async () => {
      fireEvent.click(botaoGerar());
    });
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));
    expect(createInscricaoCharge.mock.calls[0]?.[0]).toMatchObject({
      forma: 'pix',
      parcelas: 1,
    });
  });

  it('o loader diz exatamente "Preparando código PIX" — e não "Processando pagamento"', async () => {
    let resolverCharge: ((v: unknown) => void) | null = null;
    createInscricaoCharge.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolverCharge = resolve;
        }),
    );

    await irAtePagar();
    await escolherPix();
    await act(async () => {
      fireEvent.click(botaoGerar());
    });

    // A cobrança está no ar: é o instante que o dono descreveu.
    const loader = screen.getByRole('status', { name: '' });
    expect(loader.textContent).toBe('Preparando código PIX');
    expect(screen.queryByText(/processando pagamento/i)).toBeNull();
    // Espera anunciada uma vez só, e o botão não dispara a segunda.
    expect(botaoGerar().disabled).toBe(true);

    // …e o código aparece na sequência.
    await act(async () => {
      resolverCharge!({
        pedidoId: 'ped-pix-0803',
        qrCode: 'PIX-PAYLOAD-0803',
    chargeId: 'ch-0803',
        pixExpiraEmMillis: Date.now() + 1_800_000,
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByText('PIX-PAYLOAD-0803')).toBeTruthy());
    expect(screen.queryByText(/preparando código pix/i)).toBeNull();
  });
});

describe('C3-0803 · "Processando pagamento" continua no lugar dela', () => {
  it('teto de 15s estourado na criação do PIX ⇒ "Processando pagamento"', async () => {
    // DEC-0727 · item 28: o provedor não respondeu e o desfecho é DESCONHECIDO.
    // Essa é a espera que se chama "processando pagamento", e ela sobreviveu.
    createInscricaoCharge.mockRejectedValue(
      erroCallable('functions/deadline-exceeded', 'gateway_sem_resposta'),
    );

    await irAtePagar();
    await escolherPix();
    await act(async () => {
      fireEvent.click(botaoGerar());
    });

    await waitFor(() => expect(screen.getByText(/processando pagamento/i)).toBeTruthy());
    expect(screen.queryByText(/preparando código pix/i)).toBeNull();
  });

  it('confirmar o pagamento do PIX ⇒ "Processando pagamento", não "Preparando"', async () => {
    let resolverConfirma: ((v: unknown) => void) | null = null;
    confirmarPagamentoSandbox.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolverConfirma = resolve;
        }),
    );

    await irAtePagar();
    await escolherPix();
    await act(async () => {
      fireEvent.click(botaoGerar());
    });
    await waitFor(() => expect(screen.getByText('PIX-PAYLOAD-0803')).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /já paguei/i }));
    });

    // Aqui há dinheiro em trânsito de verdade — a frase é a do DEC-0727.
    expect(screen.getByText(/processando pagamento/i)).toBeTruthy();
    expect(screen.queryByText(/preparando código pix/i)).toBeNull();
    expect(resolverConfirma).not.toBeNull();
  });

  it('no CARTÃO a criação da cobrança É o ato de pagar ⇒ "Processando pagamento"', async () => {
    let resolverCharge: ((v: unknown) => void) | null = null;
    createInscricaoCharge.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolverCharge = resolve;
        }),
    );

    await irAtePagar();
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });
    await passarDebounce();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^pagar/i }));
    });

    expect(screen.getByText(/processando pagamento/i)).toBeTruthy();
    expect(screen.queryByText(/preparando código pix/i)).toBeNull();
    expect(resolverCharge).not.toBeNull();
  });
});

describe('C3-0803 · falsificação — o gesto do comprador é a única origem da cobrança', () => {
  it('voltar e reentrar no PAGAR com o PIX já escolhido não cria cobrança sozinho', async () => {
    await irAtePagar();
    await escolherPix();
    await passarDebounce(300);
    expect(createInscricaoCharge).not.toHaveBeenCalled();

    // Sai do PAGAR e volta: a forma continua escolhida, os aceites continuam
    // dados, a sessão continua pronta. Nada disso pode virar cobrança.
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /^voltar$/i }).at(-1)!);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
    });
    await passarDebounce(400);

    expect(createInscricaoCharge).not.toHaveBeenCalled();
    expect(botaoGerar()).toBeTruthy();
  });
});
