// =============================================================================
// DEC-0803 · C2-0803 — o seletor de parcelas nasce completo.
//
// Verbatim do dono (2026-08-03): *"Na primeira vez que cliquei no select
// apareceu apenas a opção como valor do ingresso, e não o parcelamento, somente
// na segunda vez que apareciam as opções."*
//
// CAUSA-RAIZ (medida, não suposta): as opções do select vinham de
// `cotacao.opcoesParcelamento` — e enquanto ninguém escolheu meio, a cotação é
// pedida com `forma: 'pix'` (D-ACH-12: a cotação assume PIX à vista). Por
// contrato do servidor, cotação de PIX traz UMA opção só
// (`saleState.ts`: `forma === 'cartao_credito' ? buildInstallmentOptions(...) :
// [{ parcelas: 1, ... }]`). O painel do cartão abre no 1º clique (D-0729-6), e
// o que ele encontra ali dentro é a escada do PIX: "À vista — R$ 5.000,00", uma
// linha. A escada de verdade só aparecia quando a cotação de CARTÃO aterrissava,
// 200 ms de debounce mais o round-trip depois — a "segunda vez".
//
// Não era memo, não era re-render do conteúdo do select: era escada da forma
// errada.
//
// ESTES CASOS REPROVAM A VERSÃO ANTERIOR: em `30232e9c` o primeiro deles acha
// uma opção onde tem de haver três.
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
  // CKPIX-FLOW · RN-560 — a assinatura do pedido nasceu nesta rodada. Esta
  // suíte não a exercita, então o stub é um no-op que devolve o cancelador:
  // sem ele o efeito quebra a árvore por uma função que o mock não conhece.
  observarPedido: () => () => undefined,
  // CKPIX-FLOW · a assinatura do pedido pede o handle de banco em toda
  // cobrança, e não só no PIX como a leitura da S1225-T3 pedia.
  getLeelaDb: () => ({ __db: true }),
  getPedido: () => Promise.resolve(null),
  createInscricaoCharge: (...a: unknown[]) => createInscricaoCharge(...a),
  confirmarPagamentoSandbox: (...a: unknown[]) => confirmarPagamentoSandbox(...a),
  expirarPixPendente: vi.fn(),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
}));
vi.mock('@/lib/leelaClient', () => ({ ensureLeela: (...a: unknown[]) => ensureLeela(...a) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';

const evento = {
  slug: 'experiencia-0803-select',
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
  modalidades: [
    { nome: '5k', precoVigente: 5000 },
    { nome: '10k', precoVigente: 7000 },
  ],
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

/**
 * O contrato do servidor: PIX traz UMA opção; cartão traz a escada do termo.
 * É essa assimetria que o defeito expunha.
 */
function cotacao(
  forma: 'pix' | 'cartao_credito',
  parcelas = 1,
  base = 5000,
): Record<string, unknown> {
  const escada =
    forma === 'cartao_credito'
      ? [
          { parcelas: 1, valorParcela: base, valorTotal: base },
          { parcelas: 3, valorParcela: base / 3 + 50, valorTotal: base + 150 },
          { parcelas: 6, valorParcela: base / 6 + 60, valorTotal: base + 360 },
        ]
      : [{ parcelas: 1, valorParcela: base, valorTotal: base }];
  const escolhida = escada.find((o) => o.parcelas === parcelas) ?? escada[0]!;
  return {
    itens: [{ modalidade: '5k', preco: base, loteNome: 'Lote 1', kitNome: null, kitPreco: 0 }],
    valorBase: base,
    desconto: 0,
    valorFinal: base,
    cupomAplicado: null,
    taxaServico: 0,
    totalAVista: base,
    jurosParcelamento: escolhida.valorTotal - base,
    opcoesParcelamento: escada,
    parcelamento: escolhida,
    totalCobrado: escolhida.valorTotal,
    forma,
    totaisPorMeio: { pix: base, cartao_credito: base },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  confirmarPagamentoSandbox.mockRejectedValue(new Error('sandbox fora'));
  cotarInscricaoCheckout.mockImplementation(
    (args: { forma: 'pix' | 'cartao_credito'; parcelas: number; itens: { modalidade: string }[] }) =>
      Promise.resolve(
        cotacao(args.forma, args.parcelas, args.itens[0]?.modalidade === '10k' ? 7000 : 5000),
      ),
  );
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

/** Chega ao PAGAR e deixa a tela assentar — é o tempo de ler o resumo. */
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

function opcoesDoSelect(): string[] {
  const select = screen.getByRole('combobox') as HTMLSelectElement;
  return Array.from(select.options).map((o) => o.textContent ?? '');
}

describe('C2-0803 · a escada aparece na PRIMEIRA abertura do select', () => {
  it('escolher cartão revela o parcelamento inteiro no mesmo gesto', async () => {
    await irAtePagar();

    // O gesto do dono: um clique em "Cartão de crédito". Sem esperar timer
    // nenhum depois dele — é a primeira abertura que precisa estar certa.
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });

    const opcoes = opcoesDoSelect();
    expect(opcoes).toHaveLength(3);
    expect(opcoes[0]).toMatch(/À vista/i);
    expect(opcoes[1]).toMatch(/^3x de/);
    expect(opcoes[2]).toMatch(/^6x de/);
  });

  it('a escada carregada é a do CARTÃO — o pedido diz isso ao servidor', async () => {
    await irAtePagar();
    const pedidosCartao = cotarInscricaoCheckout.mock.calls.filter(
      (c) => (c[0] as { forma?: string }).forma === 'cartao_credito',
    );
    expect(pedidosCartao.length).toBeGreaterThan(0);
    expect(pedidosCartao[0]?.[0]).toMatchObject({ forma: 'cartao_credito', parcelas: 1 });
  });

  it('o seletor tem nome acessível — "Parcelas" deixa de ser rótulo solto', async () => {
    await irAtePagar();
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });
    expect(screen.getByRole('combobox', { name: /parcelas/i })).toBeTruthy();
  });
});

describe('C2-0803 · nenhuma escada de outra cotação entra no select', () => {
  it('sem a escada do cartão na mão, a tela DIZ que está calculando — não inventa uma opção', async () => {
    // O pré-carregamento do cartão fica preso no ar: é a janela em que a tela
    // não sabe o parcelamento. Antes, ela preenchia o buraco com a escada do
    // PIX (uma linha) e o dono lia isso como "não tem parcelamento".
    cotarInscricaoCheckout.mockImplementation((args: { forma: string; parcelas: number }) => {
      if (args.forma === 'cartao_credito') {
        return new Promise(() => {
          /* nunca resolve */
        });
      }
      return Promise.resolve(cotacao('pix', 1));
    });

    await irAtePagar();
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText(/calculando as op(ç|c)ões de parcelamento/i)).toBeTruthy();
  });

  it('trocar de modalidade invalida a escada: a do preço antigo não serve o preço novo', async () => {
    await irAtePagar();
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });
    await passarDebounce();
    expect(opcoesDoSelect()[1]).toContain('5.150,00');

    // Volta, troca para a 10k e retorna ao PAGAR — outra base de preço.
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /alterar modalidade/i })[0]!);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /^10k/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
    });
    await passarDebounce();

    // A escada é a da 10k, com os totais da 10k.
    const opcoes = opcoesDoSelect();
    expect(opcoes).toHaveLength(3);
    expect(opcoes[1]).toContain('7.150,00');
  });
});
