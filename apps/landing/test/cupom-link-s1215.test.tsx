// =============================================================================
// PROVA da S1215-T2 (RN-430 · D-KC-7/D-KC-8) — o cupom do link atravessa a
// jornada, e a linha de desconto diz de onde ele veio.
//
// O que estava quebrado antes desta task: o `?ref=` sobrevivia à navegação
// (RefTracker o guarda), o cupom não. Quem chegava pelo link do afiliado, abria
// o regulamento e voltava, mantinha a atribuição e pagava CHEIO.
//
// O que este arquivo prova:
//   1. a captura por evento, com a disciplina do `ref` (1ª captura vence no
//      mesmo código; código diferente sobrescreve; storage podre não vaza);
//   2. o checkout SEM cupom na URL puxa o que ficou guardado;
//   3. a URL vence o storage (clique de agora > clique de antes);
//   4. `?c=` entra como apelido (RN-429);
//   5. a marca "(desconto aplicado)" acende para o cupom do LINK e cala para o
//      digitado à mão — e em nenhum dos dois casos a interface soma um centavo.
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

vi.mock('@/lib/leelaClient', () => ({
  ensureLeela: (...a: unknown[]) => ensureLeela(...a),
}));

// Querystring controlável para montar o `CupomTracker` (client component que
// lê `useSearchParams`).
let queryAtual = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => queryAtual,
}));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';
import { StepResumo } from '../app/(public)/[eventSlug]/inscricao/checkout/StepResumo';
import {
  chaveCupomStorage,
  CupomTracker,
  lerCupomCapturado,
} from '../app/(public)/[eventSlug]/CupomTracker';

const SLUG = 'corrida-teste';

const evento = {
  slug: SLUG,
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
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  ensureLeela.mockReturnValue(undefined);
});

afterEach(cleanup);

/** Grava uma captura como o `CupomTracker` grava. */
function guardarCupom(codigo: string, millis = 1_700_000_000_000): void {
  window.localStorage.setItem(
    chaveCupomStorage(SLUG),
    JSON.stringify({ codigo, capturadoEmMillis: millis }),
  );
}

async function montar(atribuicao: { cupom?: string; ref?: string } = {}): Promise<void> {
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={atribuicao} />);
  });
}

function escolherModalidade(): void {
  fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
}

// ---------------------------------------------------------------------------

/** Monta o tracker com a querystring dada, como a página do evento faz. */
async function visitar(query: string): Promise<void> {
  queryAtual = new URLSearchParams(query);
  await act(async () => {
    render(<CupomTracker slug={SLUG} />);
  });
  cleanup();
}

describe('S1215-T2 · a captura do cupom do link (RN-430/429)', () => {
  it('captura o `?cupom=` e normaliza para maiúsculo', async () => {
    await visitar('cupom=floripa10');
    expect(lerCupomCapturado(SLUG)?.codigo).toBe('FLORIPA10');
  });

  it('aceita o apelido `?c=` — link já impresso continua valendo (RN-429)', async () => {
    await visitar('c=heroi10');
    expect(lerCupomCapturado(SLUG)?.codigo).toBe('HEROI10');
  });

  it('MESMO código revisitado preserva a captura mais ANTIGA', async () => {
    await visitar('cupom=FLORIPA10');
    const primeira = lerCupomCapturado(SLUG)!;
    await new Promise((r) => setTimeout(r, 5));
    await visitar('cupom=FLORIPA10');
    expect(lerCupomCapturado(SLUG)).toEqual(primeira);
  });

  it('código DIFERENTE sobrescreve — o último link é o que vale', async () => {
    await visitar('cupom=ANTIGO10');
    await visitar('cupom=NOVO20');
    expect(lerCupomCapturado(SLUG)?.codigo).toBe('NOVO20');
  });

  it('visita sem cupom não apaga nem inventa captura', async () => {
    await visitar('cupom=FLORIPA10');
    await visitar('utm_source=instagram');
    expect(lerCupomCapturado(SLUG)?.codigo).toBe('FLORIPA10');
  });

  it('código podre na URL não é capturado', async () => {
    for (const q of ['cupom=a', 'cupom=%20%20', 'c=x']) {
      window.localStorage.clear();
      await visitar(q);
      expect(lerCupomCapturado(SLUG)).toBeNull();
    }
  });

  it('storage indisponível degrada em silêncio — a jornada não quebra', async () => {
    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error('QuotaExceeded');
    };
    await expect(visitar('cupom=FLORIPA10')).resolves.toBeUndefined();
    window.localStorage.setItem = original;
  });
});

describe('S1215-T2 · a guarda do cupom por evento (RN-430)', () => {
  it('lê a captura gravada e normaliza o código', () => {
    guardarCupom('floripa10');
    expect(lerCupomCapturado(SLUG)).toEqual({
      codigo: 'FLORIPA10',
      capturadoEmMillis: 1_700_000_000_000,
    });
  });

  it('captura de OUTRO evento não vaza para este', () => {
    window.localStorage.setItem(
      chaveCupomStorage('outro-evento'),
      JSON.stringify({ codigo: 'FLORIPA10', capturadoEmMillis: 1 }),
    );
    expect(lerCupomCapturado(SLUG)).toBeNull();
  });

  it('valor plantado à mão no storage não vira cupomCodigo torto', () => {
    for (const podre of [
      '{"codigo":"COM ESPACO","capturadoEmMillis":1}',
      '{"codigo":"A","capturadoEmMillis":1}',
      '{"codigo":"FLORIPA10"}',
      '{"codigo":"FLORIPA10","capturadoEmMillis":0}',
      '{"codigo":42,"capturadoEmMillis":1}',
      'nao e json',
    ]) {
      window.localStorage.setItem(chaveCupomStorage(SLUG), podre);
      expect(lerCupomCapturado(SLUG)).toBeNull();
    }
  });
});

describe('S1215-T2 · o cupom do link sobrevive à navegação', () => {
  it('SEM cupom na URL, o checkout aplica o que ficou guardado', async () => {
    cotarInscricaoCheckout.mockResolvedValue(
      cotacaoOk({ desconto: 500, cupomAplicado: { codigo: 'FLORIPA10' } }),
    );
    guardarCupom('FLORIPA10');
    await montar(); // nada na querystring — é o caso do "abriu o regulamento e voltou"
    await act(async () => {
      escolherModalidade();
    });

    await waitFor(() => {
      expect(cotarInscricaoCheckout).toHaveBeenCalledWith(
        expect.objectContaining({ cupomCodigo: 'FLORIPA10' }),
      );
    });
    expect(await screen.findByText(/cupom floripa10 aplicado/i)).toBeTruthy();
  });

  it('a URL VENCE o storage: clique de agora sobre clique de antes', async () => {
    cotarInscricaoCheckout.mockResolvedValue(
      cotacaoOk({ desconto: 800, cupomAplicado: { codigo: 'NOVO20' } }),
    );
    guardarCupom('ANTIGO10');
    await montar({ cupom: 'NOVO20' });
    await act(async () => {
      escolherModalidade();
    });

    await waitFor(() => {
      expect(cotarInscricaoCheckout).toHaveBeenCalledWith(
        expect.objectContaining({ cupomCodigo: 'NOVO20' }),
      );
    });
    const codigos = cotarInscricaoCheckout.mock.calls
      .map((c) => (c[0] as { cupomCodigo?: string }).cupomCodigo)
      .filter((c): c is string => typeof c === 'string');
    expect(codigos).not.toContain('ANTIGO10');
  });

  it('sem captura e sem URL, nada de cupom viaja — visita normal não muda', async () => {
    cotarInscricaoCheckout.mockResolvedValue(cotacaoOk());
    await montar();
    await act(async () => {
      escolherModalidade();
    });

    // Sem cupom, o step 0 nem cota (é o auto-apply que força a 1ª cotação).
    // O que importa provar: NENHUMA chamada leva `cupomCodigo`.
    for (const call of cotarInscricaoCheckout.mock.calls) {
      expect((call[0] as { cupomCodigo?: string }).cupomCodigo).toBeUndefined();
    }
  });

  it('remover o cupom do link não o traz de volta pelo storage', async () => {
    cotarInscricaoCheckout.mockResolvedValue(
      cotacaoOk({ desconto: 500, cupomAplicado: { codigo: 'FLORIPA10' } }),
    );
    guardarCupom('FLORIPA10');
    await montar();
    await act(async () => {
      escolherModalidade();
    });
    await screen.findByText(/cupom floripa10 aplicado/i);

    const antes = cotarInscricaoCheckout.mock.calls.length;
    cotarInscricaoCheckout.mockResolvedValue(cotacaoOk());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /remover/i }));
    });

    // NADA re-aplica o código: o storage é lido uma única vez, na montagem, e
    // o `cupomDoLink` foi desligado junto com o aplicado.
    for (const call of cotarInscricaoCheckout.mock.calls.slice(antes)) {
      expect((call[0] as { cupomCodigo?: string }).cupomCodigo).toBeUndefined();
    }
    // NOTA (defeito PRÉ-EXISTENTE, não desta task): no step 0 o "Remover" não
    // re-cota, então o `CupomCampo` continua exibindo "Cupom X aplicado" com
    // base na cotação velha. Vale igual para o cupom que vem por `?cupom=` na
    // URL desde a S1209 — está registrado no handoff, não foi introduzido aqui.
  });
});

describe('S1215-T2 · a marca "(desconto aplicado)" (D-KC-8)', () => {
  const propsBase = {
    cotando: false,
    erroCotacao: null,
    onTentarCotacao: () => {},
    linhas: [{ titulo: 'Atleta 1', kitLabel: '5k' }],
    cupomInput: '',
    onCupomInput: () => {},
    onAplicarCupom: () => {},
    onRemoverCupom: () => {},
    aplicandoCupom: false,
    erroCupomUrl: null,
    taxaRepassada: true,
    forma: 'pix' as const,
    onForma: () => {},
    parcelas: 1,
    onParcelas: () => {},
  };

  const cotacaoComDesconto = cotacaoOk({
    desconto: 500,
    valorFinal: 4500,
    totalCobrado: 4500,
    totalAVista: 4500,
    cupomAplicado: { codigo: 'FLORIPA10' },
  }) as never;

  it('cupom do LINK: a linha de desconto diz que o desconto está aplicado', () => {
    render(<StepResumo {...propsBase} cotacao={cotacaoComDesconto} descontoVeioDoLink />);
    expect(screen.getByText(/\(desconto aplicado\)/i)).toBeTruthy();
    expect(screen.getByText(/cupom FLORIPA10 do seu link/i)).toBeTruthy();
  });

  it('cupom DIGITADO: a marca não aparece — o campo já disse "aplicado"', () => {
    render(<StepResumo {...propsBase} cotacao={cotacaoComDesconto} />);
    expect(screen.queryByText(/\(desconto aplicado\)/i)).toBeNull();
  });

  it('a marca é exibição: os números continuam sendo os do servidor', () => {
    render(<StepResumo {...propsBase} cotacao={cotacaoComDesconto} descontoVeioDoLink />);
    // Base 5000, desconto 500, total 4500 — os TRÊS vieram da cotação. A marca
    // não alterou nenhum (o espaço do `R$` é NBSP do Intl, daí o `\s`).
    expect(screen.getAllByText(/^R\$\s5\.000,00$/).length).toBeGreaterThan(0);
    expect(screen.getByText(/−\sR\$\s500,00/)).toBeTruthy();
    expect(screen.getAllByText(/R\$\s4\.500,00/).length).toBeGreaterThan(0);
  });
});
