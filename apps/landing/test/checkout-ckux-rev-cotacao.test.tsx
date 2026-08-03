// =============================================================================
// REVIEW ANTAGONISTA da lane CHECKOUT-UX (lane CKUX-REV · trace
// leela-build-2d6ee98d). Vetor B5 do contrato: "duas interações rápidas não
// podem trocar a resposta de lugar (race da cotação antiga aterrissando por
// cima da nova); cache não pode servir cotação de OUTRA seleção".
//
// O que este arquivo prova: o número de sequência do coalescing só é
// incrementado no ramo que DISPARA cotação. O ramo de early-return (assinatura
// já cotada) devolve a tela ao estado conhecido sem invalidar o que está NO AR
// — e a resposta em voo de uma seleção ABANDONADA aterrissa como se fosse a
// atual, trocando o total exibido no ato de pagar.
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
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
}));

vi.mock('@/lib/leelaClient', () => ({
  ensureLeela: (...a: unknown[]) => ensureLeela(...a),
}));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';

const evento = {
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

/** Cotação com total controlado — é o número que a tela do dinheiro exibe. */
function cotacaoCom(total: number, forma: string): Record<string, unknown> {
  return {
    itens: [{ modalidade: '5k', preco: total, loteNome: 'Lote 1', kitNome: null, kitPreco: 0 }],
    valorBase: total,
    desconto: 0,
    valorFinal: total,
    cupomAplicado: null,
    taxaServico: 0,
    totalAVista: total,
    opcoesParcelamento: [
      { parcelas: 1, valorParcela: total, valorTotal: total },
      { parcelas: 3, valorParcela: Math.round(total / 3), valorTotal: total },
    ],
    parcelamento: { parcelas: 1, valorParcela: total, valorTotal: total },
    totalCobrado: total,
    forma,
    // Nulo de propósito: sem total por opção os rótulos do seletor ficam
    // limpos e o único lugar da tela que carrega um valor em R$ é o que vem
    // da cotação vigente — que é exatamente o que este teste mede.
    totaisPorMeio: { pix: null, cartao_credito: null },
  };
}

/** O total que o comprador lê no rodapé do passo PAGAR. */
function totalNaTela(): string {
  return screen.getByText(/^Total:/).textContent ?? '';
}

const TOTAL_PIX = 5000;
const TOTAL_CARTAO = 5400;
const brl = (n: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

beforeEach(() => {
  vi.clearAllMocks();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  cotarInscricaoCheckout.mockResolvedValue(cotacaoCom(TOTAL_PIX, 'pix'));
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
  // S1217-T1 · RN-438: os aceites passaram a fechar a etapa de
  // INSCRIÇÃO e gateiam o "Continuar". Preencher os campos deixou de
  // ser suficiente para avançar — este helper leva o fluxo até o PAGAR,
  // então ele marca os dois. As asserções dos casos seguem intactas.
  fireEvent.click(
    screen.getByRole('checkbox', { name: /termos da compra e a política de cancelamento/i }),
  );
  fireEvent.click(screen.getByRole('checkbox', { name: /boas condições de saúde/i }));
}

async function irAtePagar(): Promise<void> {
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={{}} />);
  });
  fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
  });
  preencherDados();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
  });
  // S1217-T2 · RN-440: o PAGAR não vem mais com meio pré-selecionado — o marco
  // de "cheguei" passa a ser o resumo do pedido, não o botão de pagar.
  await waitFor(() => {
    expect(screen.getByText(/^Seu pedido$/)).toBeTruthy();
  });
  await waitFor(() => {
    expect(cotarInscricaoCheckout).toHaveBeenCalled();
  });
  await waitFor(() => {
    expect(screen.getByText(/subtotal/i)).toBeTruthy();
  });
}

/** Deixa passar o debounce de 200 ms + o microtask da resposta. */
async function passarDebounce(ms = 350): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe('CKUX-REV · B5 — a resposta de uma seleção ABANDONADA não pode aterrissar', () => {
  it('voltar à seleção já cotada enquanto a outra está no ar não troca o total exibido', async () => {
    // A cotação do cartão fica PRESA no ar (round-trip de 1,7-9,8 s medido em
    // produção). A do PIX responde na hora.
    let resolverCartao: ((v: unknown) => void) | null = null;
    cotarInscricaoCheckout.mockImplementation((args: { forma?: string }) => {
      if (args.forma === 'cartao_credito') {
        return new Promise((resolve) => {
          resolverCartao = resolve;
        });
      }
      return Promise.resolve(cotacaoCom(TOTAL_PIX, 'pix'));
    });

    await irAtePagar();
    expect(totalNaTela()).toContain(brl(TOTAL_PIX));

    // 1) Troca para cartão e ESPERA o debounce: a chamada sai de verdade.
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });
    await passarDebounce();
    expect(resolverCartao).not.toBeNull();

    // 2) Volta para PIX com a cotação do cartão ainda no ar. A assinatura do
    //    PIX já está cotada — o efeito devolve a tela ao total conhecido.
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    });
    await passarDebounce();

    // 3) A resposta do cartão aterrissa AGORA, para uma seleção que a pessoa
    //    já abandonou.
    await act(async () => {
      resolverCartao!(cotacaoCom(TOTAL_CARTAO, 'cartao_credito'));
      await Promise.resolve();
    });
    await passarDebounce();

    // A forma selecionada é PIX; o total na tela tem de ser o do PIX.
    expect((screen.getByRole('radio', { name: /^pix/i }) as HTMLInputElement).checked).toBe(true);
    expect(totalNaTela()).not.toContain(brl(TOTAL_CARTAO));
    expect(totalNaTela()).toContain(brl(TOTAL_PIX));
  });
});

describe('CKUX-REV · B1 — o valor no botão de pagar é o valor que seria cobrado', () => {
  it('com a cotação nova no ar, o botão não oferece o preço velho', async () => {
    // O B1 pôs resumo, escolha de parcelas e botão de pagar na MESMA tela. A
    // consequência é que mexer no que move preço passou a acontecer a um
    // clique do ato de pagar — e a cotação nova leva 200 ms de debounce mais
    // o round-trip (1,7-9,8 s medidos em produção) para chegar.
    let resolverTresVezes: ((v: unknown) => void) | null = null;
    cotarInscricaoCheckout.mockImplementation(
      (args: { forma?: string; parcelas?: number }) => {
        if (args.forma === 'cartao_credito' && args.parcelas === 3) {
          return new Promise((resolve) => {
            resolverTresVezes = resolve;
          });
        }
        if (args.forma === 'cartao_credito') {
          return Promise.resolve(cotacaoCom(TOTAL_CARTAO, 'cartao_credito'));
        }
        return Promise.resolve(cotacaoCom(TOTAL_PIX, 'pix'));
      },
    );
    createInscricaoCharge.mockResolvedValue({
      pedidoId: 'ped-1',
      pixExpiraEmMillis: Date.now() + 1_800_000,
    });

    await irAtePagar();

    // Cartão à vista, cotado e estável.
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });
    await passarDebounce();
    // S1217-T1 · RN-438: os aceites deixaram de existir nesta etapa — eles são
    // marcados na etapa de inscrição, dentro do `preencherDados`.
    const botaoPagar = (): HTMLButtonElement =>
      screen.getByRole('button', { name: /^pagar|processando|atualizando/i }) as HTMLButtonElement;
    expect(botaoPagar().textContent).toContain(brl(TOTAL_CARTAO));

    // Muda para 3x — o preço MUDA (juros) e a cotação nova fica no ar.
    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '3' } });
    });
    await passarDebounce();
    expect(resolverTresVezes).not.toBeNull();

    // Enquanto o total novo não chega, o botão não pode prometer o antigo:
    // clicar aqui manda `parcelas: 3` ao servidor, que cobra o total de 3x —
    // não o valor que a pessoa leu no botão.
    const botao = botaoPagar();
    const prometeuPrecoVelho = (botao.textContent ?? '').includes(brl(TOTAL_CARTAO));
    expect(prometeuPrecoVelho && !botao.disabled).toBe(false);

    // S1217-T1 · RN-438: com os aceites dados na etapa anterior, a chegada ao
    // PAGAR com PIX pré-selecionado já dispara a auto-geração (A-3) — é o
    // efeito que a D-ACH-12/RN-440 (task C2) desfaz tirando a pré-seleção. A
    // asserção passa a ser RELATIVA: o clique no botão de pagar defasado não
    // acrescenta chamada nenhuma.
    const antes = createInscricaoCharge.mock.calls.length;
    await act(async () => {
      fireEvent.click(botao);
    });
    expect(createInscricaoCharge.mock.calls.length).toBe(antes);
  });
});

// ---------------------------------------------------------------------------
// Cobertura secundária do contrato: B3 (nascimento numérico, datas inválidas) e
// B8 (CEP-first com o lookup fora). Nenhum defeito encontrado aqui — os testes
// ficam como guarda, porque os dois são caminhos onde um afrouxamento futuro
// passaria despercebido.
// ---------------------------------------------------------------------------

describe('CKUX-REV · B3 — a máscara de nascimento não deixa passar data que não existe', () => {
  it('31/02 é recusada no gate do avanço e nunca chega ao servidor', async () => {
    await act(async () => {
      render(<CheckoutFlow evento={evento} atribuicao={{}} />);
    });
    fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    });
    preencherDados();
    // 31 de fevereiro: 8 dígitos, máscara feliz, dia que não existe.
    fireEvent.change(screen.getAllByLabelText(/data de nascimento/i)[0]!, {
      target: { value: '31/02/2000' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    });

    // Continua no passo de dados, com erro à vista — e sem cotação nenhuma
    // pedida (o gate barrou antes de o fluxo chegar ao PAGAR).
    expect(screen.getAllByLabelText(/data de nascimento/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /gerar código pix/i })).toBeNull();
    expect(createInscricaoCharge).not.toHaveBeenCalled();
  });

  it('data pela metade não vira data: o texto digitado sobrevive à re-renderização', async () => {
    await act(async () => {
      render(<CheckoutFlow evento={evento} atribuicao={{}} />);
    });
    fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    });
    const campo = screen.getAllByLabelText(/data de nascimento/i)[0] as HTMLInputElement;
    await act(async () => {
      fireEvent.change(campo, { target: { value: '20' } });
    });
    // O estado do fluxo é ISO e ainda está vazio; se o texto fosse derivado
    // dele, o dígito recém-digitado desapareceria da tela.
    expect((screen.getAllByLabelText(/data de nascimento/i)[0] as HTMLInputElement).value).toBe(
      '20',
    );
    await act(async () => {
      fireEvent.change(campo, { target: { value: '2005' } });
    });
    expect((screen.getAllByLabelText(/data de nascimento/i)[0] as HTMLInputElement).value).toBe(
      '20/05',
    );
  });
});

describe('CKUX-REV · B8 — CEP-first é fail-open: lookup fora não fecha o caminho', () => {
  it('com o ViaCEP indisponível os campos aparecem mesmo assim e a compra segue', async () => {
    const fetchOriginal = globalThis.fetch;
    // Rede fora — o pior caso do lookup (a spec 5.2 exige fail-open).
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('sem rede')) as unknown as typeof fetch;
    try {
      await act(async () => {
        render(<CheckoutFlow evento={evento} atribuicao={{}} />);
      });
      fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
      });

      // Antes do CEP completo, o bloco de endereço mostra só o CEP.
      expect(screen.queryByLabelText(/logradouro/i)).toBeNull();

      await act(async () => {
        fireEvent.change(screen.getByLabelText(/^cep/i), { target: { value: '01310100' } });
      });
      await passarDebounce();

      // 8 dígitos revelam os campos — a revelação não depende do lookup.
      expect(screen.getByLabelText(/logradouro/i)).toBeTruthy();
      const logradouro = screen.getByLabelText(/logradouro/i) as HTMLInputElement;
      expect(logradouro.disabled).toBe(false);

      // E dá para completar à mão e seguir até o PAGAR.
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
      fireEvent.change(logradouro, { target: { value: 'Av. Paulista' } });
      fireEvent.change(screen.getByLabelText(/^número/i), { target: { value: '1000' } });
      fireEvent.change(screen.getByLabelText(/cidade/i), { target: { value: 'São Paulo' } });
      fireEvent.change(screen.getByLabelText(/^uf/i), { target: { value: 'SP' } });
      // S1217-T1 · RN-438: os aceites fecham a etapa de inscrição.
      fireEvent.click(
        screen.getByRole('checkbox', {
          name: /termos da compra e a política de cancelamento/i,
        }),
      );
      fireEvent.click(screen.getByRole('checkbox', { name: /boas condições de saúde/i }));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
      });
      await waitFor(() => {
        expect(screen.getByText(/^Seu pedido$/)).toBeTruthy();
      });
    } finally {
      globalThis.fetch = fetchOriginal;
    }
  });
});
