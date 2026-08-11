// =============================================================================
// PROVA do S1209-T4 (trace leela-build-2d6ee98d · decisão D-2) + o payload de
// ponta a ponta que fecha o T3 (gênero por inscrito chegando ao servidor).
//
//   D-2 — a compra para várias pessoas é uma PILHA DE CARDS, um por atleta,
//         com um botão "+ Adicionar atleta". Adicionar cria um card novo;
//         remover tira o card certo e reindexa os erros junto (sem isso o
//         erro do atleta 3 passaria a acusar o atleta 2).
//   T3  — o gênero escolhido por atleta viaja no createInscricaoCharge; quem
//         não escolheu nada não manda campo nenhum.
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
  // DUAS modalidades desde a Onda 1 do cânone: com uma só, a auto-seleção de
  // opção única preenche a modalidade de TODO atleta no mount, e o erro
  // "escolha uma modalidade" — que é o que o caso de reindexação precisa ver —
  // não teria como aparecer. O evento com duas modalidades preserva o cenário;
  // nenhuma asserção foi afrouxada.
  modalidades: [
    { nome: '5k', precoVigente: 5000 },
    { nome: '10k', precoVigente: 8000 },
  ],
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

const COTACAO = {
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
};

beforeEach(() => {
  vi.clearAllMocks();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  cotarInscricaoCheckout.mockResolvedValue(COTACAO);
  createInscricaoCharge.mockResolvedValue({
    pedidoId: 'ped_1',
    pagamentoId: 'pag_1',
    inscritoIds: ['ins_1', 'ins_2'],
    chargeId: 'chg_1',
    qrCode: 'PIX-PAYLOAD',
    pixExpiraEmMillis: Date.now() + 30 * 60 * 1000,
    statusPedido: 'pendente',
    valores: {
      valorBase: 10000,
      desconto: 0,
      valorFinal: 10000,
      taxaServico: 0,
      totalCobrado: 10000,
      parcelas: 1,
      valorParcela: 10000,
    },
  });
});

afterEach(cleanup);

async function montar(): Promise<void> {
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={{}} />);
  });
}

function cardsDeAtleta(): HTMLElement[] {
  return screen.getAllByRole('heading', { level: 3 });
}

describe('S1209-T4 · D-2 — um card por atleta e "+ adicionar atleta"', () => {
  it('começa com UM card (o comprador) e o botão de adicionar', async () => {
    await montar();
    expect(cardsDeAtleta().map((h) => h.textContent)).toEqual(['Você']);
    expect(screen.getByRole('button', { name: /adicionar participante/i })).toBeTruthy();
  });

  it('adicionar cria um card novo por atleta', async () => {
    await montar();
    fireEvent.click(screen.getByRole('button', { name: /adicionar participante/i }));
    expect(cardsDeAtleta().map((h) => h.textContent)).toEqual(['Você', 'Participante 1']);

    fireEvent.click(screen.getByRole('button', { name: /adicionar participante/i }));
    expect(cardsDeAtleta().map((h) => h.textContent)).toEqual(['Você', 'Participante 1', 'Participante 2']);
  });

  it('o card do comprador NÃO tem remover; os demais têm', async () => {
    await montar();
    expect(screen.queryByRole('button', { name: /remover você/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /adicionar participante/i }));
    expect(screen.getByRole('button', { name: /remover participante 1/i })).toBeTruthy();
  });

  it('remover tira o card e renumera os que ficam', async () => {
    await montar();
    fireEvent.click(screen.getByRole('button', { name: /adicionar participante/i }));
    fireEvent.click(screen.getByRole('button', { name: /adicionar participante/i }));
    expect(cardsDeAtleta()).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: /remover participante 1/i }));
    expect(cardsDeAtleta().map((h) => h.textContent)).toEqual(['Você', 'Participante 1']);
  });

  it('remover NÃO deixa o erro de um atleta acusando outro (reindexa junto)', async () => {
    await montar();
    fireEvent.click(screen.getByRole('button', { name: /adicionar participante/i }));
    fireEvent.click(screen.getByRole('button', { name: /adicionar participante/i }));

    // O comprador escolhe a modalidade; os dois novos ficam sem. Avançar
    // acusa erro nos atletas 1 e 2.
    fireEvent.click(screen.getAllByRole('radio', { name: /5k/i })[0]!);
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getAllByText(/escolha uma modalidade/i)).toHaveLength(2);

    // Remover o atleta 1 tem de levar o erro DELE embora — sobra 1 erro, o do
    // atleta que continua sem modalidade.
    fireEvent.click(screen.getByRole('button', { name: /remover participante 1/i }));
    expect(screen.getAllByText(/escolha uma modalidade/i)).toHaveLength(1);
  });
});

describe('S1209-T3/T4 · payload — gênero por inscrito chega ao servidor', () => {
  /** Preenche o step 1 inteiro (comprador + 2º atleta + endereço). */
  function preencherDados(): void {
    // [0] = responsável (que também corre, "Você"); [1] = 2º atleta.
    const nomes = screen.getAllByLabelText(/nome completo/i);
    const emails = screen.getAllByLabelText(/^e-mail/i);
    const cpfs = screen.getAllByLabelText(/^cpf/i);
    const nascimentos = screen.getAllByLabelText(/data de nascimento/i);
    const generos = screen.getAllByLabelText(/gênero/i);

    fireEvent.change(nomes[0]!, { target: { value: 'Ana Corredora' } });
    fireEvent.change(emails[0]!, { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '11988887777' } });

    fireEvent.change(cpfs[0]!, { target: { value: '529.982.247-25' } });
    fireEvent.change(nascimentos[0]!, { target: { value: '20/05/1990' } });
    fireEvent.change(generos[0]!, { target: { value: 'feminino' } });

    // 2º atleta: nome/e-mail próprios; gênero deliberadamente NÃO escolhido.
    fireEvent.change(nomes[1]!, { target: { value: 'Beto Corredor' } });
    fireEvent.change(emails[1]!, { target: { value: 'beto@example.com' } });
    fireEvent.change(cpfs[1]!, { target: { value: '111.444.777-35' } });
    fireEvent.change(nascimentos[1]!, { target: { value: '10/02/1988' } });

    fireEvent.change(screen.getByLabelText(/^cep/i), { target: { value: '01310100' } });
    fireEvent.change(screen.getByLabelText(/logradouro/i), {
      target: { value: 'Av. Paulista' },
    });
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

  it('gênero escolhido sobe; gênero não escolhido NÃO vira "nao_informado" no caminho', async () => {
    await montar();

    // Step 0: 2 atletas, ambos no 5k.
    fireEvent.click(screen.getByRole('button', { name: /adicionar participante/i }));
    for (const radio of screen.getAllByRole('radio', { name: /5k/i })) {
      fireEvent.click(radio);
    }
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    });

    // Step 1: dados dos dois + endereço.
    preencherDados();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    });

    // Step 2 (PAGAR). S1217-T1/T2 · RN-438/RN-440: os aceites vieram da etapa
    // de inscrição e nenhuma forma vem pré-selecionada — a cobrança PIX nasce
    // da ESCOLHA do PIX, que é o único gesto que falta aqui.
    await waitFor(() => {
      expect(screen.getByText(/^Seu pedido$/)).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    });
    // C3-0803: a cobrança PIX nasce no CLIQUE do botão, não na escolha do meio.
    // O botão só destrava com o total na tela (item 64 · CKUX-REV).
    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: /gerar código pix/i }) as HTMLButtonElement)
          .disabled,
      ).toBe(false);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /gerar código pix/i }));
    });
    await waitFor(() => {
      expect(createInscricaoCharge).toHaveBeenCalledTimes(1);
    });

    const payload = createInscricaoCharge.mock.calls[0]![0] as {
      inscritos: { nome: string; genero?: string }[];
    };
    expect(payload.inscritos).toHaveLength(2);
    expect(payload.inscritos[0]!.genero).toBe('feminino');
    expect(payload.inscritos[1]).not.toHaveProperty('genero');
  });
});
