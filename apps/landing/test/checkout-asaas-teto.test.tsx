// =============================================================================
// checkout-asaas-teto.test.tsx — a FACE do teto de 15s para quem compra
// (DEC-0727 · item 28 · lane ASAAS-TETO · trace leela-build-2d6ee98d).
//
// Decisão do dono, verbatim: *"Aceito o teto de 15s, de aguardar o asaas."* +
// *"confirmo a sugestao de falar 'processando pagamento'. Isso pode se
// aplicar para cartao e pix."*
//
// O que estes testes fixam, e por que cada um é sobre dinheiro:
//
//   1) O teto estourado NÃO é erro. A cobrança pode ter nascido no gateway e
//      a resposta não ter voltado — o estado é DESCONHECIDO. Uma tela que diz
//      "não foi possível criar a cobrança" mente numa direção; uma que diz
//      "pago" mente na outra. A única saída honesta é "processando pagamento".
//   2) PIX **e** cartão. A decisão é explícita nos dois meios, e um dos dois
//      caminhos passa pela confirmação, não pela criação — logo são dois
//      pontos de código, não um.
//   3) O retry é REPLAY: a mesma `idempotencyKey`. É ela que impede que
//      "tentar de novo" sobre um estado desconhecido vire cobrança dupla.
//   4) Nada de auto-retry. O teto custa 15s por chamada; uma tela que
//      re-tentasse sozinha empilharia esperas sobre uma cobrança que talvez
//      já exista.
//   5) O reconhecimento é por MOTIVO TIPADO, e um erro qualquer NÃO pode ser
//      confundido com "gateway sem resposta" (regressão de um defeito real
//      desta lane — ver o bloco 5).
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MOTIVO_GATEWAY_SEM_RESPOSTA } from '@leela/core';
import type { EventoPublico } from '@/lib/tipos';

const loginAnonimo = vi.fn();
const cotarInscricaoCheckout = vi.fn();
const createInscricaoCharge = vi.fn();
const confirmarPagamentoSandbox = vi.fn();
const getCheckoutPrefill = vi.fn();
const expirarPixPendente = vi.fn();
const ensureLeela = vi.fn();

vi.mock('@leela/api-client', () => ({
  loginAnonimo: (...a: unknown[]) => loginAnonimo(...a),
  cotarInscricaoCheckout: (...a: unknown[]) => cotarInscricaoCheckout(...a),
  createInscricaoCharge: (...a: unknown[]) => createInscricaoCharge(...a),
  confirmarPagamentoSandbox: (...a: unknown[]) => confirmarPagamentoSandbox(...a),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
  expirarPixPendente: (...a: unknown[]) => expirarPixPendente(...a),
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

const CHARGE = {
  pedidoId: 'ped_1',
  pagamentoId: 'pag_1',
  inscritoIds: ['ins_1'],
  chargeId: 'chg_1',
  qrCode: 'PIX-PAYLOAD',
  pixExpiraEmMillis: Date.now() + 30 * 60_000,
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

/**
 * O erro EXATO que a Function devolve quando o teto de 15s estoura: código
 * `deadline-exceeded` (o SDK prefixa com `functions/`) e o motivo TIPADO no
 * `details` — o mesmo contrato de `MOTIVO_PIX_PENDENTE_ATIVO`.
 */
function erroTeto(): Error {
  return Object.assign(
    new Error(
      'Processando pagamento: o provedor não respondeu no tempo esperado e ' +
        'ainda não sabemos se a cobrança foi criada.',
    ),
    {
      code: 'functions/deadline-exceeded',
      details: {
        motivo: MOTIVO_GATEWAY_SEM_RESPOSTA,
        pedidoId: 'ped_1',
        pagamentoId: 'pag_1',
        idempotencyKey: 'chk-abc',
      },
    },
  );
}

/** Erro de callable genérico (sem `details`) — o controle do bloco 5. */
function erroCallable(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

beforeEach(() => {
  vi.clearAllMocks();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  cotarInscricaoCheckout.mockResolvedValue(COTACAO);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Driver do fluxo
// ---------------------------------------------------------------------------

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

/** Até a etapa de pagamento, na forma pedida, com os dois aceites marcados. */
async function irAtePagamento(forma: 'pix' | 'cartao'): Promise<void> {
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
  // DEC-0729: resumo e pagamento viraram UMA etapa (PAGAR) — o botão "Ir para
  // pagamento" deixou de existir. O segundo "Continuar" já aterrissa aqui, com
  // o resumo e o meio de pagamento na mesma tela.
  await waitFor(() => {
    expect(screen.getByText(/^Seu pedido$/)).toBeTruthy();
  });
  // S1217-T2 · RN-440: nenhuma forma vem pré-selecionada — escolher é o gesto
  // que faz o instrumento aparecer (e, no PIX, a cobrança nascer).
  if (forma === 'pix') {
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /gerar código pix/i })).toBeTruthy();
    });
  }
  if (forma === 'cartao') {
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });
    // CKUX-REV: trocar de meio pede uma cotação NOVA, e enquanto ela está no
    // ar o botão de pagar não oferece o total antigo (ele diz "Atualizando o
    // total…" e fica desabilitado). Esperar aqui é o que o comprador faz: só
    // dá para pagar depois que o valor está na tela.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^pagar/i })).toBeTruthy();
    });
  }
  // S1217-T1 · RN-438: os aceites deixaram de existir nesta etapa — eles são
  // marcados na etapa de inscrição, dentro do preencherDados.
}

/** O bloco de espera, pelo papel de STATUS (nunca de alerta). */
function blocoProcessando(): HTMLElement | null {
  return screen.queryByRole('status');
}

// ---------------------------------------------------------------------------
// 1. PIX — o teto estoura na CRIAÇÃO da cobrança
// ---------------------------------------------------------------------------

describe('DEC-0727 · PIX: teto de 15s na criação da cobrança', () => {
  beforeEach(() => {
    createInscricaoCharge.mockRejectedValue(erroTeto());
  });

  it('mostra "processando pagamento" — a frase que o dono escolheu', async () => {
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(createInscricaoCharge).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText(/processando pagamento/i)).toBeTruthy();
    });
  });

  it('NÃO afirma fracasso: nem "não foi possível criar a cobrança", nem alerta vermelho', async () => {
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    // A cobrança PODE existir no gateway. Declarar fracasso aqui é a mentira
    // que empurra o comprador a abrir uma segunda.
    expect(screen.queryByText(/não foi possível criar a cobrança/i)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('NÃO afirma sucesso: sem QR, sem chave copiável, sem tela de confirmação', async () => {
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    expect(screen.queryByText('PIX-PAYLOAD')).toBeNull();
    expect(screen.queryByRole('button', { name: /copiar código/i })).toBeNull();
    expect(screen.queryByText(/inscrição confirmada/i)).toBeNull();
  });

  it('diz a verdade sobre o estado DESCONHECIDO e proíbe a segunda cobrança', async () => {
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    const texto = blocoProcessando()!.textContent ?? '';
    // Estas três ideias são o contrato de honestidade da tela: não sabemos,
    // não abra outra, tentar de novo é seguro.
    expect(texto).toMatch(/ainda não sabemos/i);
    expect(texto).toMatch(/não abra outra/i);
    expect(texto).toMatch(/mesma cobrança/i);
  });

  it('é anunciado como STATUS (aria-live polite), nunca com a urgência de um erro', async () => {
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    // `alert` é assertivo e é o canal de RECUSA desta tela. Anunciar uma
    // espera com a mesma urgência treina a pessoa a ignorar as duas.
    expect(blocoProcessando()!.getAttribute('aria-live')).toBe('polite');
    expect(blocoProcessando()!.getAttribute('role')).toBe('status');
  });

  it('não vaza jargão técnico para quem está comprando', async () => {
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    const tela = document.body.textContent ?? '';
    for (const jargao of [
      'deadline-exceeded',
      'AsaasTimeoutError',
      'INTERNAL',
      'gateway_sem_resposta',
      '15000',
      'AbortController',
    ]) {
      expect(tela).not.toContain(jargao);
    }
  });

  it('NÃO re-tenta sozinho: uma chamada, e a retomada é um clique', async () => {
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    await act(async () => {
      await Promise.resolve();
    });
    // Auto-retry aqui empilharia esperas de 15s sobre uma cobrança que talvez
    // JÁ exista — e o comprador pagaria a conta em tempo e em risco.
    expect(createInscricaoCharge).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeTruthy();
  });

  it('RETRY é REPLAY: a mesma idempotencyKey volta ao servidor', async () => {
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    const chave1 = (createInscricaoCharge.mock.calls[0]?.[0] as { idempotencyKey: string })
      .idempotencyKey;

    createInscricaoCharge.mockResolvedValue(CHARGE);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    });
    await waitFor(() => {
      expect(createInscricaoCharge).toHaveBeenCalledTimes(2);
    });
    const chave2 = (createInscricaoCharge.mock.calls[1]?.[0] as { idempotencyKey: string })
      .idempotencyKey;

    // Chave nova aqui seria pedido novo — e, com a cobrança anterior possivelmente
    // criada no gateway, DUAS cobranças vivas. A igualdade é a defesa.
    expect(chave2).toBe(chave1);
  });

  it('retry que vinga limpa a espera e entrega o PIX (o caminho feliz não travou)', async () => {
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    createInscricaoCharge.mockResolvedValue(CHARGE);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    });
    await waitFor(() => {
      expect(screen.getByText('PIX-PAYLOAD')).toBeTruthy();
    });
    expect(blocoProcessando()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Cartão — o teto estoura na CONFIRMAÇÃO
// ---------------------------------------------------------------------------

describe('DEC-0727 · cartão: o teto vale para o outro meio também', () => {
  it('teto na CRIAÇÃO ⇒ "processando pagamento" (não erro)', async () => {
    createInscricaoCharge.mockRejectedValue(erroTeto());
    await irAtePagamento('cartao');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^pagar/i }));
    });
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    expect(screen.getByText(/processando pagamento/i)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('retry depois de teto na CONFIRMAÇÃO re-tenta a CONFIRMAÇÃO (não um botão morto)', async () => {
    // Com a cobrança já na mão, o que faltou foi confirmar. Um retry que
    // chamasse "criar" receberia a cobrança de cache e a tela ficaria parada
    // no mesmo aviso — a pessoa clicaria num botão que não faz nada.
    createInscricaoCharge.mockResolvedValue(CHARGE);
    confirmarPagamentoSandbox.mockRejectedValueOnce(erroTeto());
    await irAtePagamento('cartao');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^pagar/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeTruthy();
    });

    confirmarPagamentoSandbox.mockResolvedValue({
      pedidoId: 'ped_1',
      statusPedido: 'pago',
      statusPagamento: 'confirmado',
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    });
    await waitFor(() => {
      expect(confirmarPagamentoSandbox).toHaveBeenCalledTimes(2);
    });
    // E a criação NÃO foi repetida: a cobrança já existia.
    expect(createInscricaoCharge).toHaveBeenCalledTimes(1);
  });

  it('teto na CONFIRMAÇÃO ⇒ "processando pagamento", e a tela NÃO declara pago nem falho', async () => {
    // Caminho exclusivo do cartão: a cobrança nasce e é a confirmação que
    // estoura. São dois pontos de código distintos — por isso dois testes.
    createInscricaoCharge.mockResolvedValue(CHARGE);
    confirmarPagamentoSandbox.mockRejectedValue(erroTeto());
    await irAtePagamento('cartao');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^pagar/i }));
    });
    await waitFor(() => {
      expect(confirmarPagamentoSandbox).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    expect(screen.queryByText(/não foi possível confirmar o pagamento/i)).toBeNull();
    expect(screen.queryByText(/inscrição confirmada/i)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. A ESPERA LONGA (a chamada ainda no ar) fala a MESMA frase
// ---------------------------------------------------------------------------

describe('DEC-0727 · a espera longa (até 15s por chamada) também é "processando pagamento"', () => {
  it('chamada em voo ⇒ status de processamento, e nenhum botão de retry (não duplica a requisição)', async () => {
    // Chamada que não volta: é o que o comprador vive enquanto o gateway
    // consome os 15s do teto.
    createInscricaoCharge.mockReturnValue(new Promise<never>(() => {}));
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(createInscricaoCharge).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    expect(blocoProcessando()!.textContent ?? '').toMatch(/processando pagamento/i);
    // Oferecer "tentar novamente" com a requisição no ar convidaria a segunda
    // chamada — e duas criações concorrentes é o cenário do carrinho travado.
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Estilo: só token do DS (regra inviolável de UI do projeto)
// ---------------------------------------------------------------------------

describe('DEC-0727 · o bloco de espera não tem estilo fora de token', () => {
  it('zero cor literal e zero style inline — o par de contraste é o do DS (feedback-info)', async () => {
    createInscricaoCharge.mockRejectedValue(erroTeto());
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    const bloco = blocoProcessando()!;
    const classes = bloco.className;
    // Os três tokens do par AA já coberto pelo gate de contraste do DS
    // (`feedback-info-fg` × `feedback-info-surface`, texto 4.5:1;
    // `feedback-info` × `surface-base`, não-texto 3:1).
    expect(classes).toContain('bg-feedback-info-surface');
    expect(classes).toContain('border-feedback-info');
    expect(bloco.querySelector('.text-feedback-info-fg')).not.toBeNull();
    // Nada de hex, rgb ou valor arbitrário do Tailwind em nenhum descendente.
    for (const el of [bloco, ...Array.from(bloco.querySelectorAll('*'))]) {
      const cls = (el as HTMLElement).className;
      const clsTexto = typeof cls === 'string' ? cls : '';
      expect(clsTexto).not.toMatch(/\[#|rgb\(|hsl\(/i);
      expect((el as HTMLElement).getAttribute('style')).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// 5. REGRESSÃO · o reconhecimento não pode ser guloso
//
// Defeito REAL desta lane, não hipótese: a primeira versão comparava
// `err.details?.motivo === MOTIVO_GATEWAY_SEM_RESPOSTA` sem checar o tipo.
// Com o `dist` de `@leela/core` defasado a constante chegou `undefined`, e
// `undefined === undefined` fez TODO erro do checkout virar "processando
// pagamento" — inclusive a recusa da segunda cobrança PIX, que é justamente a
// informação que o comprador precisa ler. Uma suíte da landing quebrou e
// entregou o bug; estes testes o prendem.
// ---------------------------------------------------------------------------

describe('DEC-0727 · regressão: erro comum NÃO pode se disfarçar de "gateway sem resposta"', () => {
  it('failed-precondition SEM details ⇒ alerta de erro, com a mensagem do servidor', async () => {
    createInscricaoCharge.mockRejectedValue(
      erroCallable('functions/failed-precondition', 'O lote deste evento fechou.'),
    );
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
    expect(screen.getByRole('alert').textContent).toContain('O lote deste evento fechou.');
    expect(blocoProcessando()).toBeNull();
    expect(screen.queryByText(/processando pagamento/i)).toBeNull();
  });

  it('erro com details mas com OUTRO motivo ⇒ segue sendo erro', async () => {
    createInscricaoCharge.mockRejectedValue(
      Object.assign(new Error('Já existe uma cobrança PIX aberta.'), {
        code: 'functions/failed-precondition',
        details: { motivo: 'pix_pendente_ativo', pedidoId: 'ped_0' },
      }),
    );
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
    expect(screen.getByRole('alert').textContent).toContain('Já existe uma cobrança PIX aberta.');
    expect(blocoProcessando()).toBeNull();
  });

  it('erro SEM code e SEM details (falha de rede crua) ⇒ erro, não espera', async () => {
    createInscricaoCharge.mockRejectedValue(new Error('Network request failed'));
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
    expect(blocoProcessando()).toBeNull();
  });

  it('o MOTIVO tipado sozinho já reconhece (canal 1), mesmo sem o code esperado', async () => {
    // Contrato ao contrário do bloco anterior: `details.motivo` é a leitura
    // BOA; o `code` é só a rede de segurança. Um proxy que reescreva o código
    // não pode custar a honestidade da tela.
    createInscricaoCharge.mockRejectedValue(
      Object.assign(new Error('Processando pagamento.'), {
        code: 'functions/unknown',
        details: { motivo: MOTIVO_GATEWAY_SEM_RESPOSTA, pedidoId: 'ped_1' },
      }),
    );
    await irAtePagamento('pix');
    await waitFor(() => {
      expect(blocoProcessando()).not.toBeNull();
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
