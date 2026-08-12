// =============================================================================
// S1216-T1 · RN-434 · D-ACH-1/D-ACH-2/D-ACH-4 — o total pronto na chegada.
//
// O ACHADO DO DONO: "quando o usuário chega na etapa de pagamento, ele já deve
// ter os custos do pedido totalmente calculados". O gatilho era
// `precisaCotar = step >= 2`: o primeiro pedido de preço saía no instante em
// que a pessoa entrava no PAGAR, e ela assistia ao round-trip — de 1,7 s no
// piso a 9,8 s quando a function acorda fria (medido em produção).
//
// Estes casos REPROVAM a versão anterior. Com `step >= 2` restaurado, os dois
// primeiros caem: nenhuma cotação sai na etapa de dados, e a chegada ao PAGAR
// volta a ser o momento da primeira chamada.
//
// Os outros dois travam o que a decisão NÃO pode custar: o step 0 continua sem
// cotar (cotar ali transformaria a exploração da oferta numa chamada por
// clique), o pré-aquecimento é silencioso (falha no meio do formulário não
// pinta erro numa tela onde a pessoa ainda não tem o problema), e os caminhos
// manuais de cupom passaram a respeitar o mesmo número de sequência do efeito
// (a ressalva R-2 da CKUX-REV, cuja janela o próprio B1 alarga).
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EventoPublico } from '@/lib/tipos';

const loginAnonimo = vi.fn();
const cotarInscricaoCheckout = vi.fn();
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
  createInscricaoCharge: vi.fn(),
  confirmarPagamentoSandbox: vi.fn(),
  expirarPixPendente: vi.fn(),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
}));
vi.mock('@/lib/leelaClient', () => ({ ensureLeela: (...a: unknown[]) => ensureLeela(...a) }));

let queryAtual = new URLSearchParams();
vi.mock('next/navigation', () => ({ useSearchParams: () => queryAtual }));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';

const SLUG = 'experiencia-teste';

const evento = {
  slug: SLUG,
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
  modalidades: [
    { nome: '5k', precoVigente: 5000 },
    { nome: '10k', precoVigente: 7000 },
  ],
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

function cotacaoOk(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    itens: [{ modalidade: '5k', preco: 5000, loteNome: 'Lote 1' }],
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
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  queryAtual = new URLSearchParams();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  ensureLeela.mockReturnValue(undefined);
});

afterEach(cleanup);

/** Monta e escolhe a modalidade, parando no step 0. */
async function montarNoStep0(modalidade = '5k'): Promise<void> {
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={{}} />);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(modalidade, 'i') }));
  });
}

/** Avança para a etapa de DADOS (step 1). */
async function irParaDados(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^Continuar$/i }));
  });
}

describe('S1216-T1 · a cotação começa na etapa de dados', () => {
  it('entrar na etapa de dados dispara a cotação — antes ela só saía no PAGAR', async () => {
    cotarInscricaoCheckout.mockResolvedValue(cotacaoOk());
    await montarNoStep0();
    expect(cotarInscricaoCheckout).not.toHaveBeenCalled();

    await irParaDados();

    // O debounce de 200 ms da T-CKUX-1 continua de pé: a chamada sai depois
    // dele, não no mesmo tick da troca de etapa.
    await waitFor(() => expect(cotarInscricaoCheckout).toHaveBeenCalledTimes(1));
    expect(cotarInscricaoCheckout.mock.calls[0]?.[0]).toMatchObject({
      eventoId: SLUG,
      forma: 'pix',
      parcelas: 1,
      itens: [{ modalidade: '5k' }],
    });
  });

  it('a etapa de dados está na tela quando a cotação sai (é ela que paga a espera)', async () => {
    cotarInscricaoCheckout.mockResolvedValue(cotacaoOk());
    await montarNoStep0();
    await irParaDados();

    await waitFor(() => expect(cotarInscricaoCheckout).toHaveBeenCalledTimes(1));
    // O formulário de dados é o que a pessoa vê enquanto o round-trip acontece.
    expect(screen.getByLabelText(/CPF/i)).toBeTruthy();
  });

  it('o step 0 continua SEM cotar — explorar a oferta não custa uma chamada por clique', async () => {
    cotarInscricaoCheckout.mockResolvedValue(cotacaoOk());
    await montarNoStep0('5k');
    // Três trocas de modalidade: a assinatura de preço muda em cada uma.
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /10k/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /10k/i }));
    });
    await new Promise((r) => setTimeout(r, 300));
    expect(cotarInscricaoCheckout).not.toHaveBeenCalled();
  });

  it('o pré-aquecimento é silencioso: falha na cotação não pinta erro no formulário', async () => {
    cotarInscricaoCheckout.mockRejectedValue(new Error('function fria'));
    await montarNoStep0();
    await irParaDados();
    await waitFor(() => expect(cotarInscricaoCheckout).toHaveBeenCalledTimes(1));

    // Nada de "Calculando o total…", "Tentar novamente" ou mensagem de erro no
    // meio da coleta de dados — o estado de erro mora no bloco de totais do
    // PAGAR, que não existe nesta etapa.
    expect(screen.queryByText(/Calculando o total/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Tentar novamente/i })).toBeNull();
    expect(screen.queryByText(/function fria/i)).toBeNull();
    // E o avanço não fica bloqueado por causa dela.
    expect(
      (screen.getByRole('button', { name: /^Continuar$/i }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });
});

describe('S1216-T1 · RN-434 — o cupom manual entra no mesmo número de sequência', () => {
  it('resposta do cupom que chega DEPOIS de outra cotação ser pedida não aterrissa', async () => {
    // Cotação inicial da etapa de dados: resolve normalmente.
    cotarInscricaoCheckout.mockResolvedValue(cotacaoOk());
    await montarNoStep0('5k');
    await irParaDados();
    await waitFor(() => expect(cotarInscricaoCheckout).toHaveBeenCalledTimes(1));

    // O "Aplicar" do cupom fica PENDENTE: é a janela do defeito.
    let resolverCupom: ((v: unknown) => void) | undefined;
    cotarInscricaoCheckout.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolverCupom = res;
        }),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Voltar$/i }));
    });
    fireEvent.change(screen.getByLabelText('Código do cupom'), {
      target: { value: 'FLORIPA10' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Aplicar$/i }));
    });
    expect(resolverCupom).toBeDefined();

    // Enquanto o cupom está no ar, a pessoa troca de modalidade e volta para a
    // etapa de dados — o efeito pede OUTRA cotação e sobe o número de sequência.
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /10k/i }));
    });
    await irParaDados();
    await waitFor(() => expect(cotarInscricaoCheckout).toHaveBeenCalledTimes(3));

    // Só agora a resposta do cupom chega — para a seleção ABANDONADA.
    await act(async () => {
      resolverCupom?.(
        cotacaoOk({
          desconto: 500,
          valorFinal: 4500,
          totalCobrado: 4500,
          cupomAplicado: { codigo: 'FLORIPA10', desconto: 500 },
        }),
      );
    });

    // Ela não pode ter aterrissado: o cupom não se declara aplicado por uma
    // cotação que já não vale.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Voltar$/i }));
    });
    expect(screen.queryByText(/Cupom FLORIPA10 aplicado/i)).toBeNull();
    expect(screen.queryByText(/menos R\$/i)).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // ACHADOS-REV · DEF-2 — o buraco que o número de sequência sozinho não fecha.
  //
  // O caso acima troca de seleção E VOLTA À ETAPA DE DADOS, o que faz o efeito
  // de cotação pedir outra e subir o contador. No STEP 0 ninguém pede: o efeito
  // começa em `step >= 1` e sai pela porta de cima antes de tocar no contador.
  // E é no step 0 que o campo do cupom mora (D-4). Medido antes do fix, com
  // este mesmo roteiro: a tela declarava "Cupom FLORIPA10 aplicado — menos
  // R$ 500,00" sobre a 10k, com o desconto calculado para a 5k abandonada.
  //
  // A régua passou a ser a ASSINATURA de preço pedida × a vigente na volta —
  // ela não depende de haver uma segunda chamada. RN-434: "resposta que chega
  // depois de outra ter sido pedida é descartada, SEM EXCEÇÃO DE ORIGEM".
  // ---------------------------------------------------------------------------
  it('DEF-2: no step 0, trocar de modalidade descarta a resposta do cupom da seleção abandonada', async () => {
    await montarNoStep0('5k');

    let resolverCupom: ((v: unknown) => void) | undefined;
    cotarInscricaoCheckout.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolverCupom = res;
        }),
    );
    fireEvent.change(screen.getByLabelText('Código do cupom'), {
      target: { value: 'FLORIPA10' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Aplicar$/i }));
    });
    expect(resolverCupom).toBeDefined();

    // A pessoa troca de modalidade e CONTINUA no step 0 — nenhuma outra
    // cotação é pedida, porque cotar aqui é proibido (D-ACH-1).
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /10k/i }));
    });
    expect(cotarInscricaoCheckout).toHaveBeenCalledTimes(1);

    // A resposta chega agora, calculada para a 5k que já não está selecionada.
    await act(async () => {
      resolverCupom?.(
        cotacaoOk({
          desconto: 500,
          valorFinal: 4500,
          totalCobrado: 4500,
          cupomAplicado: { codigo: 'FLORIPA10', tipo: 'percentual', valor: 10 },
        }),
      );
    });

    // O número da seleção abandonada não pode estar na tela, e o cupom não
    // pode se declarar aplicado por uma cotação que já não vale.
    expect(screen.queryByText(/Cupom FLORIPA10 aplicado/i)).toBeNull();
    expect(screen.queryByText(/menos R\$ 500,00/i)).toBeNull();
    // O campo volta ao estado de digitação: a pessoa reaplica se quiser.
    expect(screen.getByLabelText('Código do cupom')).toBeTruthy();
  });

  it('sem concorrência, o cupom continua colando normalmente (a guarda não trava o caminho feliz)', async () => {
    cotarInscricaoCheckout.mockResolvedValue(cotacaoOk());
    await montarNoStep0('5k');

    cotarInscricaoCheckout.mockResolvedValueOnce(
      cotacaoOk({
        desconto: 500,
        valorFinal: 4500,
        totalCobrado: 4500,
        cupomAplicado: { codigo: 'FLORIPA10', desconto: 500 },
      }),
    );
    fireEvent.change(screen.getByLabelText('Código do cupom'), {
      target: { value: 'FLORIPA10' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Aplicar$/i }));
    });

    expect(screen.getByText(/Cupom FLORIPA10 aplicado/i)).toBeTruthy();
  });
});
