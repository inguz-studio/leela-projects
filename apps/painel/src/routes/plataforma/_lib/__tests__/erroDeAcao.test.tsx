// =============================================================================
// O caminho do erro nas telas de plataforma que escrevem (POLIMENTO-0728 · T3).
//
// A ESTORNO-REV consertou este defeito na fila de estornos (`8f82588`) e
// DECLAROU no trailer que ele vivia igual em `RepassesAdminRoute` e
// `PlanosRoute` (E-4). São dois defeitos empilhados:
//
//   1. LEITURA VELHA. O handler lia `acoes.error` — estado de React do render
//      em que ele FOI CRIADO. O `setState` do catch só aparece no render
//      SEGUINTE, então na PRIMEIRA falha o toast saía com descrição vazia e
//      nas seguintes mostrava o erro ANTERIOR.
//   2. FRASE TROCADA. `platformErrorMessage` substituía a recusa do servidor
//      pelo texto genérico de plataforma ("e-mail com papel conflitante…") —
//      texto de outra tela, que numa fila de dinheiro manda o operador
//      procurar no lugar errado.
//
// Estas provas prendem os dois pela borda que o handler enxerga.
// =============================================================================

import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mensagemDaRecusa, platformErrorMessage } from '../errors';

const mocks = vi.hoisted(() => ({
  approveRepasse: vi.fn(),
  rejectRepasse: vi.fn(),
  markRepassePago: vi.fn(),
  setRetencaoRepasse: vi.fn(),
  aplicarPlano: vi.fn(),
  savePlanoCobranca: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  approveRepasse: mocks.approveRepasse,
  rejectRepasse: mocks.rejectRepasse,
  markRepassePago: mocks.markRepassePago,
  setRetencaoRepasse: mocks.setRetencaoRepasse,
  aplicarPlano: mocks.aplicarPlano,
  savePlanoCobranca: mocks.savePlanoCobranca,
  getLeelaDb: () => ({}),
  getLeelaFunctions: () => ({}),
}));

// As queries do gateway não participam do caminho do erro de AÇÃO.
vi.mock('../../../../lib/query/queries', () => ({
  repassesFilaAdminQuery: () => ({ queryKey: ['fila'], queryFn: async () => [] }),
  commercialTermsQuery: () => ({ queryKey: ['terms'], queryFn: async () => null }),
  planosCobrancaQuery: () => ({ queryKey: ['planos'], queryFn: async () => [] }),
}));

const { useRepasseAdminActions } = await import('../../repasses/_data/repassesAdmin');
const { usePlanoActions } = await import('../../planos/_data/planos');

/** Erro no formato que o callable do Firebase entrega à tela. */
function erroDeCallable(code: string, message: string): Error {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

const MSG_SALDO =
  'Saldo disponível insuficiente: R$ 1.200,00 pedidos contra R$ 800,00 ' +
  'liberados (RN-351). Parte da receita ainda está na janela de liberação.';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('back-office de repasses · a recusa do servidor chega ao handler', () => {
  it('PRIMEIRA falha: `error` de estado ainda está vazio, `ultimoErro()` já tem a frase', async () => {
    mocks.approveRepasse.mockRejectedValue(
      erroDeCallable('functions/failed-precondition', MSG_SALDO),
    );
    const { result } = renderHook(() => useRepasseAdminActions());

    // O que o HANDLER enxerga logo depois do await — o cenário exato do bug.
    let visto: { doEstado: Error | null; doRef: Error | null } | null = null;
    await act(async () => {
      const acoes = result.current;
      await acoes.approve('castelo', 'rep-1');
      visto = { doEstado: acoes.error, doRef: acoes.ultimoErro() };
    });

    // Leitura velha: `null` na primeira falha (era daí que vinha o toast mudo).
    expect(visto!.doEstado).toBeNull();
    // Espelho síncrono: a frase do servidor, na mesma volta do catch.
    expect(visto!.doRef?.message).toBe(MSG_SALDO);
    expect(mensagemDaRecusa(visto!.doRef)).toBe(MSG_SALDO);
  });

  it('SEGUNDA falha diferente: a leitura velha mostraria o erro ANTERIOR', async () => {
    const primeiro = erroDeCallable('functions/failed-precondition', MSG_SALDO);
    const segundo = erroDeCallable('functions/permission-denied', 'Sua conta perdeu o papel de admin.');
    mocks.approveRepasse.mockRejectedValueOnce(primeiro).mockRejectedValueOnce(segundo);
    const { result } = renderHook(() => useRepasseAdminActions());

    await act(async () => {
      await result.current.approve('castelo', 'rep-1');
    });

    let visto: { doEstado: Error | null; doRef: Error | null } | null = null;
    await act(async () => {
      const acoes = result.current; // render pós-primeira falha: error = primeiro
      await acoes.approve('castelo', 'rep-2');
      visto = { doEstado: acoes.error, doRef: acoes.ultimoErro() };
    });

    expect(visto!.doEstado?.message).toBe(MSG_SALDO); // o erro de ONTEM
    expect(visto!.doRef?.message).toBe('Sua conta perdeu o papel de admin.');
  });

  it('sucesso limpa o espelho — nenhum erro fantasma sobra para a próxima ação', async () => {
    mocks.rejectRepasse.mockRejectedValueOnce(erroDeCallable('functions/internal', 'INTERNAL'));
    mocks.rejectRepasse.mockResolvedValueOnce({ estado: 'recusado' });
    const { result } = renderHook(() => useRepasseAdminActions());

    await act(async () => {
      await result.current.reject('castelo', 'rep-1');
    });
    expect(result.current.ultimoErro()).not.toBeNull();

    await act(async () => {
      const acoes = result.current;
      const ok = await acoes.reject('castelo', 'rep-2');
      expect(ok).not.toBeNull();
      expect(acoes.ultimoErro()).toBeNull();
    });
  });

  it('rejeição que não é Error vira Error — a tela nunca recebe `[object Object]` cru', async () => {
    mocks.setRetencaoRepasse.mockRejectedValue({ code: 'functions/invalid-argument' });
    const { result } = renderHook(() => useRepasseAdminActions());

    await act(async () => {
      const acoes = result.current;
      await acoes.setRetencao('castelo', 200);
      expect(acoes.ultimoErro()).toBeInstanceOf(Error);
    });
  });
});

describe('catálogo de planos · a validação do servidor chega ao handler', () => {
  const MSG_PLANO = 'Taxa fixa acima do teto permitido (TAXA_FIXO_CENTAVOS_MAX).';

  it('salvar recusado: a frase do core aparece já na primeira falha', async () => {
    mocks.savePlanoCobranca.mockRejectedValue(new Error(MSG_PLANO));
    const { result } = renderHook(() => usePlanoActions());

    await act(async () => {
      const acoes = result.current;
      const ok = await acoes.salvar('plano-x', {} as never);
      expect(ok).toBe(false);
      expect(acoes.error).toBeNull(); // leitura velha
      expect(mensagemDaRecusa(acoes.ultimoErro())).toBe(MSG_PLANO);
    });
  });

  it('aplicar recusado por permissão: frase do servidor, não o texto de tenant', async () => {
    const msg = 'Aplicar plano exige papel de administrador da plataforma.';
    mocks.aplicarPlano.mockRejectedValue(erroDeCallable('functions/permission-denied', msg));
    const { result } = renderHook(() => usePlanoActions());

    await act(async () => {
      const acoes = result.current;
      await acoes.aplicar('castelo', 'plano-x');
      expect(mensagemDaRecusa(acoes.ultimoErro())).toBe(msg);
      // O genérico DIRIA outra coisa — é essa troca que o fix mata.
      expect(platformErrorMessage(acoes.ultimoErro())).not.toBe(msg);
    });
  });
});

describe('mensagemDaRecusa · a frase do servidor, com rede', () => {
  it('prefere a mensagem do servidor quando ela existe', () => {
    expect(mensagemDaRecusa(erroDeCallable('functions/failed-precondition', MSG_SALDO))).toBe(
      MSG_SALDO,
    );
  });

  it("'INTERNAL' não é frase de operador — cai na rede genérica", () => {
    expect(mensagemDaRecusa(erroDeCallable('functions/internal', 'INTERNAL'))).toMatch(
      /tente novamente em instantes/i,
    );
    expect(mensagemDaRecusa(erroDeCallable('functions/internal', 'internal'))).toMatch(
      /tente novamente em instantes/i,
    );
  });

  it('mensagem vazia ou ausente cai na rede genérica, nunca em silêncio', () => {
    expect(mensagemDaRecusa(erroDeCallable('functions/permission-denied', '   '))).toMatch(
      /permiss[ãa]o/i,
    );
    expect(mensagemDaRecusa({ code: 'functions/already-exists' })).toMatch(/slug/i);
  });

  it('null/undefined seguem devolvendo string vazia (não há erro a exibir)', () => {
    expect(mensagemDaRecusa(null)).toBe('');
    expect(mensagemDaRecusa(undefined)).toBe('');
  });

  it('o mapeador genérico segue INTACTO — as telas que dependem dele não mudaram', () => {
    expect(platformErrorMessage(erroDeCallable('functions/failed-precondition', MSG_SALDO))).toMatch(
      /papel conflitante/i,
    );
  });
});
