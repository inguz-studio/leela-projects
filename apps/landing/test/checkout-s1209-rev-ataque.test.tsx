// =============================================================================
// REVIEW ANTAGONISTA do S1209-T2/T3 (lane S1209-REV · trace leela-build-2d6ee98d).
//
// Testes escritos para ATACAR as alegações do produtor, não para confirmá-las.
// Cada bloco abaixo nasceu de um vetor do brief da review:
//
//   1) relógio do comprador adiantado + servidor RECUSA a expiração
//      (failed-precondition) — a tela pode declarar morto um PIX que o
//      servidor diz estar VIVO? E daí liberar uma segunda cobrança?
//   2) o servidor ACEITA a expiração — o caminho legítimo continua inteiro.
//   3) clipboard indisponível/negado — o botão da chave morre em silêncio?
//   4) payload de PIX ausente — o toast diz "chave copiada" tendo copiado um
//      id interno de cobrança?
//   5) prefill × "eu também vou correr" desmarcado enquanto a resposta voa —
//      o CPF do COMPRADOR vaza para o card de um terceiro?
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EventoPublico } from '@/lib/tipos';

const loginAnonimo = vi.fn();
const cotarInscricaoCheckout = vi.fn();
const createInscricaoCharge = vi.fn();
const confirmarPagamentoSandbox = vi.fn();
const getCheckoutPrefill = vi.fn();
const expirarPixPendente = vi.fn();
const ensureLeela = vi.fn();

// S1209-PIXBE-T4: `expirarPixPendente` passou a ser re-exportado pela RAIZ do
// api-client (a ponte por subpath foi removida) — um mock só, como o resto.
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
import {
  PixCobranca,
  payloadPix,
} from '../app/(public)/[eventSlug]/inscricao/checkout/PixCobranca';
import { ToastProvider } from '../app/_ds/ds';

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

/** Cobrança do Mock. `expiraEmMillis` fica sob controle de cada ataque. */
function chargePix(expiraEmMillis: number | undefined): unknown {
  return {
    pedidoId: 'ped_1',
    pagamentoId: 'pag_1',
    inscritoIds: ['ins_1'],
    chargeId: 'chg_1',
    qrCode: 'PIX-PAYLOAD',
    ...(expiraEmMillis !== undefined ? { pixExpiraEmMillis: expiraEmMillis } : {}),
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
}

/** Erro de callable do Firebase — mesmo shape do SDK (`code` prefixado). */
function erroCallable(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

beforeEach(() => {
  vi.clearAllMocks();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  cotarInscricaoCheckout.mockResolvedValue(COTACAO);
  expirarPixPendente.mockResolvedValue({
    pedidoId: 'ped_1',
    statusPedido: 'cancelado',
    expirado: true,
    jaFinal: false,
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Driver do fluxo até a etapa de pagamento com o PIX já criado
// ---------------------------------------------------------------------------

async function montar(): Promise<void> {
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={{}} />);
  });
}

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
}

/** Leva o fluxo até o step 3 com os 2 aceites marcados (dispara o PIX). */
async function irAtePagamentoPix(): Promise<void> {
  await montar();
  fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
  });
  preencherDados();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
  });
  // DEC-0729: PAGAR é uma etapa só — sem "Ir para pagamento" no caminho.
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /gerar código pix/i })).toBeTruthy();
  });
  await act(async () => {
    for (const c of screen.getAllByRole('checkbox')) fireEvent.click(c);
  });
  await waitFor(() => {
    expect(createInscricaoCharge).toHaveBeenCalledTimes(1);
  });
}

// ---------------------------------------------------------------------------
// ATAQUE 1 — relógio do comprador ADIANTADO e o servidor RECUSA a expiração
// ---------------------------------------------------------------------------

describe('S1209-REV · ataque 1 — o servidor discorda do relógio do comprador', () => {
  beforeEach(() => {
    // Relógio do comprador ~31 min à frente: a cobrança que o servidor acabou
    // de criar com 30 min de vida já nasce "vencida" aos olhos deste cliente.
    createInscricaoCharge.mockResolvedValue(chargePix(Date.now() - 60_000));
    // O servidor confere o PRÓPRIO relógio e recusa: a cobrança está VIVA.
    expirarPixPendente.mockRejectedValue(
      erroCallable('functions/failed-precondition', 'PIX ainda não expirou.'),
    );
  });

  it('a tela pede ao servidor que materialize a expiração (não decide sozinha)', async () => {
    await irAtePagamentoPix();
    await waitFor(() => {
      expect(expirarPixPendente).toHaveBeenCalledWith({ pedidoId: 'ped_1' });
    });
  });

  it('servidor recusou ⇒ a tela NÃO pode declarar o PIX expirado', async () => {
    await irAtePagamentoPix();
    await waitFor(() => {
      expect(expirarPixPendente).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByText(/código pix expirado/i)).toBeNull();
    // "Nada foi cobrado de você" é falso enquanto a cobrança segue viva.
    expect(screen.queryByText(/nada foi cobrado de você/i)).toBeNull();
  });

  it('servidor recusou ⇒ a chave continua à mão (o PIX vivo não some da tela)', async () => {
    await irAtePagamentoPix();
    await waitFor(() => {
      expect(expirarPixPendente).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('PIX-PAYLOAD')).toBeTruthy();
    expect(screen.getByRole('button', { name: /copiar código/i })).toBeTruthy();
  });

  it('servidor recusou ⇒ NÃO existe atalho para uma SEGUNDA cobrança viva', async () => {
    await irAtePagamentoPix();
    await waitFor(() => {
      expect(expirarPixPendente).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByRole('button', { name: /gerar nova cobrança/i })).toBeNull();
    expect(createInscricaoCharge).toHaveBeenCalledTimes(1);
  });

  it('servidor recusou ⇒ o relógio local perde a palavra (nada de 00:00 na tela)', async () => {
    await irAtePagamentoPix();
    await waitFor(() => {
      expect(expirarPixPendente).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByTestId('pix-timer')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ATAQUE 2 — o caminho legítimo (servidor CONFIRMA) segue inteiro
// ---------------------------------------------------------------------------

describe('S1209-REV · ataque 2 — servidor confirma a expiração', () => {
  it('servidor cancelou ⇒ a tela expira e oferece cobrança NOVA', async () => {
    createInscricaoCharge.mockResolvedValue(chargePix(Date.now() - 60_000));
    expirarPixPendente.mockResolvedValue({
      pedidoId: 'ped_1',
      statusPedido: 'cancelado',
      expirado: true,
      jaFinal: false,
    });

    await irAtePagamentoPix();
    await waitFor(() => {
      expect(screen.getByText(/código pix expirado/i)).toBeTruthy();
    });
    expect(screen.queryByText('PIX-PAYLOAD')).toBeNull();
    expect(screen.getByRole('button', { name: /gerar nova cobrança/i })).toBeTruthy();
  });

  it('pedido já final (resposta idempotente) também expira a tela', async () => {
    createInscricaoCharge.mockResolvedValue(chargePix(Date.now() - 60_000));
    expirarPixPendente.mockResolvedValue({
      pedidoId: 'ped_1',
      statusPedido: 'cancelado',
      expirado: false,
      jaFinal: true,
    });

    await irAtePagamentoPix();
    await waitFor(() => {
      expect(screen.getByText(/código pix expirado/i)).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// ATAQUE 2b — expiração NÃO confirmada (rede caiu) e a pessoa pede outra
// ---------------------------------------------------------------------------

describe('S1209-REV · ataque 2b — cobrança nova sobre expiração não confirmada', () => {
  it('rede caiu na expiração ⇒ a segunda cobrança só nasce se o servidor confirmar o fim da primeira', async () => {
    createInscricaoCharge.mockResolvedValue(chargePix(Date.now() - 60_000));
    // 1ª tentativa: a chamada nem chega ao servidor.
    expirarPixPendente.mockRejectedValueOnce(erroCallable('functions/unavailable', 'offline'));

    await irAtePagamentoPix();
    await waitFor(() => {
      expect(screen.getByText(/código pix expirado/i)).toBeTruthy();
    });

    // 2ª tentativa (pré-voo do "gerar nova"): agora o servidor responde — e
    // diz que a cobrança antiga AINDA vale.
    expirarPixPendente.mockRejectedValue(
      erroCallable('functions/failed-precondition', 'PIX ainda não expirou.'),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /gerar nova cobrança/i }));
    });

    // Nenhuma segunda cobrança: seriam duas vivas no mesmo pedido.
    expect(createInscricaoCharge).toHaveBeenCalledTimes(1);
    // E a chave da cobrança viva volta para a tela.
    await waitFor(() => {
      expect(screen.getByText('PIX-PAYLOAD')).toBeTruthy();
    });
    expect(screen.queryByText(/código pix expirado/i)).toBeNull();
  });

  it('servidor confirma o fim no pré-voo ⇒ a cobrança nova nasce (o caminho legítimo não travou)', async () => {
    createInscricaoCharge.mockResolvedValue(chargePix(Date.now() - 60_000));
    expirarPixPendente.mockRejectedValueOnce(erroCallable('functions/unavailable', 'offline'));

    await irAtePagamentoPix();
    await waitFor(() => {
      expect(screen.getByText(/código pix expirado/i)).toBeTruthy();
    });

    // Agora a cobrança criada é uma com prazo de verdade.
    createInscricaoCharge.mockResolvedValue(chargePix(Date.now() + 30 * 60 * 1000));
    expirarPixPendente.mockResolvedValue({
      pedidoId: 'ped_1',
      statusPedido: 'cancelado',
      expirado: true,
      jaFinal: false,
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /gerar nova cobrança/i }));
    });

    await waitFor(() => {
      expect(createInscricaoCharge).toHaveBeenCalledTimes(2);
    });
    // RN-157: cobrança NOVA, chave de idempotência NOVA (nunca replay da velha).
    const chave1 = (createInscricaoCharge.mock.calls[0]![0] as { idempotencyKey: string })
      .idempotencyKey;
    const chave2 = (createInscricaoCharge.mock.calls[1]![0] as { idempotencyKey: string })
      .idempotencyKey;
    expect(chave2).not.toBe(chave1);
  });
});

// ---------------------------------------------------------------------------
// ATAQUE 3 — clipboard indisponível / negado
// ---------------------------------------------------------------------------

describe('S1209-REV · ataque 3 — a cópia da chave falha', () => {
  function renderPix(codigo = 'PIX-COPIA-E-COLA'): void {
    render(
      <ToastProvider>
        <PixCobranca codigo={codigo} expiraEmMillis={Date.now() + 30 * 60 * 1000} />
      </ToastProvider>,
    );
  }

  it('sem API de clipboard: o botão NÃO morre em silêncio', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    renderPix();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copiar código/i }));
    });

    // Sem Clipboard API e sem execCommand (jsdom), a cópia não aconteceu. O
    // clique não pode morrer em silêncio, e o toast não pode dizer que copiou.
    await waitFor(() => {
      expect(screen.getByText(/não conseguimos copiar/i)).toBeTruthy();
    });
    expect(screen.queryByText(/a chave para pagamento foi copiada/i)).toBeNull();
  });

  it('clipboard NEGADO: a tela não mente dizendo que copiou', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderPix();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copiar código/i }));
    });

    await waitFor(() => {
      expect(screen.queryByText(/não conseguimos copiar/i)).toBeTruthy();
    });
    expect(screen.queryByText(/a chave para pagamento foi copiada/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ATAQUE 4 — cobrança sem payload de PIX
// ---------------------------------------------------------------------------

describe('S1209-REV · ataque 4 — cobrança sem copia-e-cola', () => {
  it('sem qrCode e sem paymentUrl, o id interno NÃO vira "chave de pagamento"', () => {
    expect(payloadPix({ chargeId: 'chg_1' })).toBe('');
  });

  it('sem payload: nada de QR, de copia-e-cola nem de botão que promete copiar', async () => {
    render(
      <ToastProvider>
        <PixCobranca codigo={payloadPix({ chargeId: 'chg_1' })} />
      </ToastProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByRole('button', { name: /copiar código/i })).toBeNull();
    expect(screen.queryByText('chg_1')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ATAQUE 5 — prefill × "eu também vou correr" desmarcado durante a resposta
// ---------------------------------------------------------------------------

describe('S1209-REV · ataque 5 — o CPF do comprador no card de um terceiro', () => {
  it('desmarcar "eu também vou correr" antes da resposta NÃO preenche o card do atleta', async () => {
    let resolver: (v: unknown) => void = () => {};
    getCheckoutPrefill.mockReturnValue(
      new Promise((res) => {
        resolver = res;
      }),
    );

    await montar();
    fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    });

    // A pessoa decide que NÃO vai correr: o card 1 passa a ser de um terceiro.
    fireEvent.click(screen.getByLabelText(/eu também vou correr/i));
    expect(screen.getByRole('heading', { level: 3, name: /atleta 1/i })).toBeTruthy();

    // Só AGORA a resposta do prefill chega (rede lenta).
    await act(async () => {
      resolver({
        prefill: {
          nome: 'Ana Compradora',
          cpf: '52998224725',
          genero: 'feminino',
          nascimento: '1990-05-20',
          telefone: '11988887777',
        },
      });
    });

    // O CPF é a chave de identidade: ele não pode aterrissar no card de quem
    // não é o comprador.
    expect((screen.getAllByLabelText(/^cpf/i)[0]! as HTMLInputElement).value).toBe('');
    expect((screen.getAllByLabelText(/data de nascimento/i)[0]! as HTMLInputElement).value).toBe(
      '',
    );
  });
});

// ---------------------------------------------------------------------------
// S1209-PIXREV · ATAQUE 6 — a tela abre a SEGUNDA cobrança sem o servidor ter
// confirmado a morte da primeira.
//
// O fix `59f18ed` fechou o caminho ÓBVIO: o botão "gerar nova cobrança" exige
// confirmação do servidor antes de recomeçar. Mas o estado `contestado` NÃO é
// `expirado`, e o efeito que invalida a cobrança por mudança de preço zera
// `charge` + `chaveRef` e devolve `pixEstado` para 'vivo'. Com isso o efeito de
// auto-geração (guarda: `!pixExpirado`) recria a cobrança com chave NOVA.
//
// Por que isso é dinheiro: `contestado` é exatamente o estado em que o servidor
// disse "não consegui encerrar a cobrança no gateway — ela CONTINUA válida"
// (S1209-PIXBE-T3). A primeira segue pagável no banco do comprador.
//
// Este teste prova o lado da TELA (ela PEDE outra cobrança). O lado do
// SERVIDOR — que a trava CONCEDE, porque solta só pelo relógio — está provado
// em `functions/src/__tests__/pixArbitragem.ataque.integration.test.ts` (AT-5).
// Juntos fecham o achado A1 da review S1209-PIXREV.
// ---------------------------------------------------------------------------

// ⚠️ ESTE BLOCO MUDOU DE LADO EM PIX-CARRINHO-T1 (item 25 · DEC-0726B).
// Ele nasceu na review PROVANDO o achado A1 pelo lado da tela: no estado
// `contestado`, alternar PIX→Cartão→PIX fazia a tela pedir uma cobrança nova
// com o servidor jamais tendo confirmado o fim da primeira. A tela continua
// PEDINDO (ela não tem como saber, e nunca teve) — o que mudou é que o
// SERVIDOR agora NEGA. O roteiro do ataque é o mesmo, letra por letra; o que
// se prova agora é que a negativa chega ao comprador e nenhuma segunda
// cobrança aparece na tela.
describe('S1209-PIXREV · ataque 6 — segunda cobrança nascendo do estado "contestado"', () => {
  beforeEach(() => {
    // Cobrança já vencida pelo relógio deste aparelho ⇒ o timer zera sozinho.
    // A 1ª criação vinga; a 2ª é RECUSADA pelo servidor (T1), porque o
    // gateway segue recusando encerrar a primeira.
    createInscricaoCharge
      .mockResolvedValueOnce(chargePix(Date.now() - 60_000))
      .mockRejectedValue(
        erroCallable(
          'functions/failed-precondition',
          'A cobrança PIX anterior venceu, mas não conseguimos encerrá-la no provedor de pagamento — ela ainda pode ser aceita pelo seu banco.',
        ),
      );
    // O gateway RECUSOU o cancelamento: a cobrança CONTINUA válida (T3).
    expirarPixPendente.mockRejectedValue(
      erroCallable(
        'functions/failed-precondition',
        'Não foi possível encerrar a cobrança no provedor de pagamento — ela CONTINUA válida.',
      ),
    );
  });

  it('trocar a forma de pagamento e voltar ao PIX NÃO produz segunda cobrança — o servidor nega e a tela diz a verdade', async () => {
    await irAtePagamentoPix();
    await waitFor(() => {
      expect(expirarPixPendente).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });
    // Estado `contestado`: a chave voltou para a tela, nada foi declarado morto.
    expect(screen.queryByText(/código pix expirado/i)).toBeNull();
    expect(createInscricaoCharge).toHaveBeenCalledTimes(1);
    const chave1 = (createInscricaoCharge.mock.calls[0]?.[0] as { idempotencyKey: string })
      .idempotencyKey;

    // A pessoa mexe na forma de pagamento e volta ao PIX — nada proibido.
    // DEC-0729: os dois controles vivem na MESMA tela do pagamento, então o
    // vaivém não passa mais por outra etapa. O vetor de ataque é idêntico.
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    });

    // A tela PEDE a cobrança nova (chave de idempotência nova) — isso não
    // mudou, e não podia: nenhuma tela sabe o que o gateway respondeu.
    await waitFor(() => {
      expect(createInscricaoCharge).toHaveBeenCalledTimes(2);
    });
    const chave2 = (createInscricaoCharge.mock.calls[1]?.[0] as { idempotencyKey: string })
      .idempotencyKey;
    expect(chave2).not.toBe(chave1);

    // ✅ O QUE ESTE TESTE FIXA AGORA (T1): o SERVIDOR nega, e a tela mostra a
    // negativa em vez de um segundo QR. Nenhuma segunda cobrança existe.
    await waitFor(() => {
      expect(screen.getByText(/não conseguimos encerrá-la/i)).toBeTruthy();
    });
    expect(screen.queryByText('PIX-PAYLOAD')).toBeNull();
    // E a tela não inventa um fim que o servidor nunca confirmou.
    expect(screen.queryByText(/código pix expirado/i)).toBeNull();

    // A negativa também não vira loop: a tela não fica repetindo o pedido.
    await act(async () => {
      await Promise.resolve();
    });
    expect(createInscricaoCharge).toHaveBeenCalledTimes(2);
  });
});
