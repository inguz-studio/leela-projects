// =============================================================================
// S1217-T2 · RN-440 · D-ACH-12 — nenhuma cobrança nasce sem escolha de meio.
//
// Este é o efeito colateral que a migração dos aceites (S1217-T1) produz, e que
// precisa ser desfeito de propósito. A auto-geração do PIX (A-3) dispara com
// `step === 2 && forma === 'pix' && aceitesOk`. Enquanto os aceites eram o
// último gesto humano antes disso, a cobrança nascia porque a pessoa marcava
// dois checkboxes NESTA tela. Com o aceite vindo da etapa anterior e `'pix'` no
// default, entrar no pagamento passaria a criar cobrança sozinho.
//
// E isso não é detalhe de interface: `createInscricaoCharge` grava pedido,
// pagamento e inscritos como PENDENTES antes de falar com o gateway, e os
// gatilhos de estoque e demografia recomputam os contadores do evento no
// caminho. Cada chegada ao PAGAR viraria uma inscrição pendente e uma cobrança
// real no Asaas — para quem só queria ver o preço.
//
// Estes casos REPROVAM a versão anterior: com `useState<FormaUI>('pix')`
// restaurado, a chegada ao pagamento chama o servidor sozinha e o PIX aparece
// marcado sem ninguém ter escolhido.
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
  expirarPixPendente: vi.fn(),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
}));
vi.mock('@/lib/leelaClient', () => ({ ensureLeela: (...a: unknown[]) => ensureLeela(...a) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';

const evento = {
  slug: 'experiencia-teste',
  nome: 'Experiência Teste',
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
  seo: { titulo: 'Experiência Teste', descricao: 'desc' },
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
  itens: [{ modalidade: '5k', preco: 5000, loteNome: null, kitNome: null, kitPreco: 0 }],
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
};

const CHARGE = {
  pedidoId: 'ped_1',
  pagamentoId: 'pag_1',
  inscritoIds: ['ins_1'],
  chargeId: 'chg_1',
  qrCode: 'PIX-PAYLOAD',
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
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  ensureLeela.mockReturnValue(undefined);
  cotarInscricaoCheckout.mockResolvedValue(COTACAO);
  createInscricaoCharge.mockResolvedValue(CHARGE);
});

afterEach(cleanup);

function preencherDados(): void {
  fireEvent.change(screen.getAllByLabelText(/nome completo/i)[0]!, {
    target: { value: 'Ana Participante' },
  });
  fireEvent.change(screen.getAllByLabelText(/^e-mail/i)[0]!, {
    target: { value: 'ana@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '11988887777' } });
  fireEvent.change(screen.getAllByLabelText(/^cpf/i)[0]!, { target: { value: '529.982.247-25' } });
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

/** Leva o fluxo ao PAGAR com os aceites dados e NENHUM meio escolhido. */
async function irAtePagar(): Promise<void> {
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={{}} />);
  });
  fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
  });
  preencherDados();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
  });
  await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
  // A cotação do pré-aquecimento (S1216-T1) aterrissa depois do debounce.
  await waitFor(() => expect(cotarInscricaoCheckout).toHaveBeenCalled());
}

describe('S1217-T2 · RN-440 — nenhuma cobrança nasce na chegada ao pagamento', () => {
  it('chegar ao PAGAR com os aceites dados NÃO cria pedido, nem inscrito, nem cobrança', async () => {
    await irAtePagar();
    // Uma janela generosa: se a auto-geração fosse disparar, ela já teria.
    await new Promise((r) => setTimeout(r, 300));
    expect(createInscricaoCharge).not.toHaveBeenCalled();
  });

  it('nenhuma das duas opções vem marcada', async () => {
    await irAtePagar();
    const pix = screen.getByRole('radio', { name: /pix/i }) as HTMLInputElement;
    const cartao = screen.getByRole('radio', { name: /cartão de crédito/i }) as HTMLInputElement;
    expect(pix.checked).toBe(false);
    expect(cartao.checked).toBe(false);
  });

  it('sem meio escolhido não há instrumento na tela — nem botão de pagar', async () => {
    await irAtePagar();
    expect(screen.queryByRole('button', { name: /gerar código pix/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^pagar/i })).toBeNull();
    expect(screen.getByText(/escolha a forma de pagamento acima/i)).toBeTruthy();
  });

  it('o preço já está na tela antes da escolha — decide-se vendo os dois totais', async () => {
    await irAtePagar();
    expect(screen.getByText('Subtotal')).toBeTruthy();
    expect(screen.getByRole('radio', { name: /pix.*5\.000,00/i })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /cartão de crédito.*5\.000,00/i })).toBeTruthy();
  });
});

describe('S1217-T2 · RN-440 — a cobrança PIX nasce da ESCOLHA do PIX', () => {
  it('escolher PIX gera a cobrança sem clique extra (o ganho da A-3 continua inteiro)', async () => {
    await irAtePagar();
    expect(createInscricaoCharge).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    });
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));
    expect(createInscricaoCharge.mock.calls[0]?.[0]).toMatchObject({ forma: 'pix', parcelas: 1 });
  });

  it('escolher CARTÃO não cria cobrança — ali o pagamento exige o botão', async () => {
    await irAtePagar();
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });
    await new Promise((r) => setTimeout(r, 300));
    expect(createInscricaoCharge).not.toHaveBeenCalled();
    // ...e o botão de pagar aparece, porque agora existe instrumento.
    await waitFor(() => expect(screen.getByRole('button', { name: /^pagar/i })).toBeTruthy());
  });
});

describe('S1217-T2 · RN-440 — a cotação assume PIX à vista sem que isso vire cobrança', () => {
  it('o pré-aquecimento cota como PIX à vista antes de qualquer escolha', async () => {
    await irAtePagar();
    expect(cotarInscricaoCheckout.mock.calls[0]?.[0]).toMatchObject({
      forma: 'pix',
      parcelas: 1,
    });
    // Cotar é LEITURA. Nada foi gravado e nada foi cobrado.
    expect(createInscricaoCharge).not.toHaveBeenCalled();
  });
});
