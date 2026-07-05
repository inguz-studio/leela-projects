// Fix review Onda1 #34 — tradução de error.codes do criarEvento (WIKI §4).
import { describe, expect, it } from 'vitest';
import { toastErroCriarEvento } from '../erros';

/** Erro no shape do callable do firebase/functions (code prefixado). */
function erroCallable(code: string, message = ''): unknown {
  return { code: `functions/${code}`, message, name: 'FirebaseError' };
}

describe('toastErroCriarEvento', () => {
  it('failed-precondition (RN-402) → mensagem de conta inativa, sem retry cego', () => {
    const t = toastErroCriarEvento(erroCallable('failed-precondition'));
    expect(t.title).toContain('não pode criar eventos');
    expect(t.description).toContain('RN-402');
  });

  it('resource-exhausted → orienta a RENOMEAR (slug esgotado)', () => {
    const t = toastErroCriarEvento(erroCallable('resource-exhausted'));
    expect(t.description.toLowerCase()).toContain('renomeie');
  });

  it('invalid-argument → repassa o detalhe pt-BR do servidor sem o prefixo técnico', () => {
    const t = toastErroCriarEvento(
      erroCallable('invalid-argument', 'CriarEventoInput inválido: "data" deve ser hoje ou futura.')
    );
    expect(t.description).toBe('"data" deve ser hoje ou futura.');
    expect(t.description).not.toContain('CriarEventoInput');
  });

  it('invalid-argument sem detalhe → fallback acionável (data/preços)', () => {
    const t = toastErroCriarEvento(erroCallable('invalid-argument'));
    expect(t.description).toContain('data');
  });

  it('erro sem code (rede) → copy genérica original com retry', () => {
    const t = toastErroCriarEvento(new Error('backend off'));
    expect(t.title).toBe('Não foi possível criar o evento');
    expect(t.description).toContain('Tente novamente');
  });
});
