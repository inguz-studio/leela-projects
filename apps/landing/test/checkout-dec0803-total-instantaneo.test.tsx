// =============================================================================
// DEC-0803 · C1-0803 — o total muda no ATO da escolha.
//
// Verbatim do dono no teste do parcelamento vivo (2026-08-03): *"sub total, nao
// altera imediatamente, quando eu faço a seleção."*
//
// A escada inteira chega na cotação (`opcoesParcelamento`: parcelas,
// valorParcela e valorTotal de cada opção). Trocar entre opções já cotadas é
// releitura do que o servidor mandou — não round-trip. A guarda do item 64
// ("Atualizando o total…", botão travado) continua exata para cotação NOVA em
// voo, e é isso que a segunda metade deste arquivo mede.
//
// ESTES CASOS REPROVAM A VERSÃO ANTERIOR: com o total lido direto de
// `cotacao.totalCobrado`, trocar de 1x para 3x deixava R$ 5.000,00 na tela e o
// botão em "Atualizando o total…" pelos 200 ms de debounce mais o round-trip
// (1,7-9,8 s medidos em produção).
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
  slug: 'experiencia-0803',
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

const A_VISTA = 5000;
/** A escada real do termo: cada opção tem o SEU total, e eles diferem. */
const ESCADA = [
  { parcelas: 1, valorParcela: 5000, valorTotal: 5000 },
  { parcelas: 3, valorParcela: 1750, valorTotal: 5250 },
  { parcelas: 6, valorParcela: 900, valorTotal: 5400 },
];

const brl = (n: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

/**
 * Cotação do evento com taxa INCORPORADA: os dois meios custam o mesmo à vista,
 * e é o parcelamento que move o total.
 */
function cotacao(
  forma: 'pix' | 'cartao_credito',
  parcelas = 1,
  base = A_VISTA,
): Record<string, unknown> {
  const escada =
    forma === 'cartao_credito'
      ? ESCADA.map((o) => ({
          parcelas: o.parcelas,
          valorParcela: (o.valorParcela * base) / A_VISTA,
          valorTotal: (o.valorTotal * base) / A_VISTA,
        }))
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

/** O total que o comprador lê no rodapé do passo PAGAR. */
function totalNaTela(): string {
  return screen.getByText(/^Total:/).textContent ?? '';
}

/** O seletor de parcelas — único combobox do passo PAGAR. */
function selectParcelas(): HTMLSelectElement {
  return screen.getByRole('combobox') as HTMLSelectElement;
}

/** O botão de pagar, seja qual for o rótulo que ele esteja usando. */
function botaoPagar(): HTMLButtonElement {
  return screen.getByRole('button', {
    name: /^pagar|processando|atualizando/i,
  }) as HTMLButtonElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  cotarInscricaoCheckout.mockImplementation(
    (args: { forma: 'pix' | 'cartao_credito'; parcelas: number }) =>
      Promise.resolve(cotacao(args.forma, args.parcelas)),
  );
  createInscricaoCharge.mockResolvedValue({
    pedidoId: 'ped-0803',
    pixExpiraEmMillis: Date.now() + 1_800_000,
  });
  // O que este arquivo mede para antes da confirmação: a tela de confirmação
  // tem contrato próprio e caso próprio noutro lugar.
  confirmarPagamentoSandbox.mockRejectedValue(new Error('sandbox fora'));
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

/** Deixa passar o debounce de 200 ms + o microtask da resposta. */
async function passarDebounce(ms = 350): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

async function irAtePagar(modalidade = '5k'): Promise<void> {
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={{}} />);
  });
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${modalidade}`, 'i') }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
  });
  preencherDados();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
  });
  await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
  await waitFor(() => expect(screen.getByText('Subtotal')).toBeTruthy());
}

/** Escolhe o cartão e espera a cotação de cartão aterrissar de fato. */
async function escolherCartaoCotado(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
  });
  await passarDebounce();
  await waitFor(() => expect(totalNaTela()).toContain(brl(5000)));
}

describe('C1-0803 · trocar entre opções JÁ COTADAS atualiza o total sem round-trip', () => {
  it('escolher 3x mostra o total de 3x no MESMO gesto — sem esperar cotação nova', async () => {
    await irAtePagar();
    await escolherCartaoCotado();

    const chamadasAntes = cotarInscricaoCheckout.mock.calls.length;

    // O gesto do dono: trocar a parcela. NADA de esperar timer — a asserção
    // acontece no mesmo tick, e é isso que prova que não houve round-trip.
    await act(async () => {
      fireEvent.change(selectParcelas(), {
        target: { value: '3' },
      });
    });

    expect(totalNaTela()).toContain(brl(5250));
    expect(cotarInscricaoCheckout.mock.calls.length).toBe(chamadasAntes);
  });

  it('a escada inteira responde: 1x, 3x e 6x cada uma com o seu total', async () => {
    await irAtePagar();
    await escolherCartaoCotado();

    for (const [valor, total] of [
      ['6', 5400],
      ['3', 5250],
      ['1', 5000],
    ] as const) {
      await act(async () => {
        fireEvent.change(selectParcelas(), {
          target: { value: valor },
        });
      });
      expect(totalNaTela()).toContain(brl(total));
    }
  });

  it('o resumo acompanha: "Total parcelado" e a linha de parcela são as da opção escolhida', async () => {
    await irAtePagar();
    await escolherCartaoCotado();

    await act(async () => {
      fireEvent.change(selectParcelas(), {
        target: { value: '6' },
      });
    });

    expect(screen.getByText('Total parcelado')).toBeTruthy();
    // O texto da linha é montado em pedaços — o matcher olha o nó inteiro.
    expect(
      screen.getByText((_conteudo, el) => {
        const t = el?.textContent ?? '';
        return el?.tagName === 'P' && t.includes('6x de') && t.includes(brl(900));
      }),
    ).toBeTruthy();
  });
});

describe('C1-0803 · item 64 continua exato — a guarda não dispara onde não há cotação nova', () => {
  it('trocar de parcela NÃO trava o botão de pagar em "Atualizando o total…"', async () => {
    // A cotação de 3x fica PRESA no ar — o pior caso do round-trip.
    cotarInscricaoCheckout.mockImplementation(
      (args: { forma: 'pix' | 'cartao_credito'; parcelas: number }) => {
        if (args.forma === 'cartao_credito' && args.parcelas === 3) {
          return new Promise(() => {
            /* nunca resolve */
          });
        }
        return Promise.resolve(cotacao(args.forma, args.parcelas));
      },
    );

    await irAtePagar();
    await escolherCartaoCotado();

    await act(async () => {
      fireEvent.change(selectParcelas(), {
        target: { value: '3' },
      });
    });
    await passarDebounce();

    // A cotação de 3x está no ar e NUNCA volta. Mesmo assim o botão promete o
    // total de 3x, porque esse número já veio na escada da cotação anterior.
    const botao = botaoPagar();
    expect(botao.textContent).toContain(brl(5250));
    expect(botao.disabled).toBe(false);
    expect(screen.queryByText(/Atualizando o total/i)).toBeNull();
  });

  it('FALSIFICAÇÃO · o que o botão prometeu é o que vai ao servidor', async () => {
    await irAtePagar();
    await escolherCartaoCotado();

    await act(async () => {
      fireEvent.change(selectParcelas(), {
        target: { value: '3' },
      });
    });
    const prometido = botaoPagar().textContent ?? '';
    expect(prometido).toContain(brl(5250));

    await act(async () => {
      fireEvent.click(botaoPagar());
    });
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));
    // `parcelas: 3` sobre a MESMA base de preço que a escada cotou: o servidor
    // recalcula e chega no total de 3x — o número que estava no botão.
    expect(createInscricaoCharge.mock.calls[0]?.[0]).toMatchObject({
      forma: 'cartao_credito',
      parcelas: 3,
    });
  });

  it('FALSIFICAÇÃO · mudar a SELEÇÃO DE ITENS dispara a guarda, como antes', async () => {
    await irAtePagar();
    await escolherCartaoCotado();

    // A cotação da 10k fica presa: é o preço NOVO que a tela ainda não tem.
    cotarInscricaoCheckout.mockImplementation(
      () =>
        new Promise(() => {
          /* nunca resolve */
        }),
    );

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

    const botao = botaoPagar();
    expect(botao.textContent).toMatch(/Atualizando o total/i);
    expect(botao.disabled).toBe(true);
  });

  it('FALSIFICAÇÃO · trocar de MEIO com totais diferentes por meio dispara a guarda', async () => {
    // Taxa repassada com custo por meio: o total do cartão não é o do PIX, e a
    // composição do resumo (linha de taxa) muda junto. Sem os dois números na
    // mão, a tela espera — nada de projetar dinheiro que ninguém calculou.
    cotarInscricaoCheckout.mockImplementation(
      (args: { forma: 'pix' | 'cartao_credito'; parcelas: number }) => {
        if (args.forma === 'cartao_credito') {
          return new Promise(() => {
            /* nunca resolve */
          });
        }
        return Promise.resolve({
          ...cotacao('pix', 1),
          taxaServico: 0,
          totaisPorMeio: { pix: 5000, cartao_credito: 5200 },
        });
      },
    );

    await irAtePagar();
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /^pix/i }));
    });
    await passarDebounce();
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });
    await passarDebounce();

    const botao = botaoPagar();
    expect(botao.textContent).toMatch(/Atualizando o total/i);
    expect(botao.disabled).toBe(true);
  });
});
