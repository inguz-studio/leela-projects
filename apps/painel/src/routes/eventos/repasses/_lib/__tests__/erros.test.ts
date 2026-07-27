// =============================================================================
// Tradução dos erros das callables de repasse (§2.12). O caso novo é o guard
// por evento (RN-368): o servidor manda um `details` TIPADO com quanto aquele
// evento comporta, e a UI tem de dizer o número em vez da frase genérica —
// com dois tetos diferentes em jogo (evento e conta), "excede o disponível"
// manda o organizador adivinhar qual dos dois estourou.
//
// `details` vem da REDE: os testes cobrem também o payload torto, porque uma
// frase de dinheiro montada sobre `undefined` é pior que a genérica.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { repasseErrorMessage } from '../erros';

/** Erro de callable como o Firebase entrega (code + details opcional). */
function erroCallable(code: string, details?: unknown): unknown {
  return { code, message: 'ignorado', ...(details !== undefined ? { details } : {}) };
}

const GENERICA =
  'Solicitação recusada pelo servidor: o valor excede o disponível, ou o termo comercial/dados bancários ainda não estão prontos.';

describe('repasseErrorMessage — guard por evento (RN-368)', () => {
  it('com details tipado: a frase carrega o disponível DAQUELE evento', () => {
    const msg = repasseErrorMessage(
      erroCallable('functions/failed-precondition', {
        motivo: 'repasse_excede_evento',
        eventoId: 'meia-floripa-2026',
        disponivelDoEvento: 8500,
        valorSolicitado: 9000,
      }),
      'solicitacao',
    );
    expect(msg).toMatch(/^Este evento tem R\$\s*8\.500,00 disponíveis para repasse/);
    expect(msg).toContain('excede o liberado dele');
  });

  it('centavos preservados — a frase é lida contra o extrato', () => {
    const msg = repasseErrorMessage(
      erroCallable('functions/failed-precondition', {
        motivo: 'repasse_excede_evento',
        eventoId: 'e1',
        disponivelDoEvento: 3200.55,
        valorSolicitado: 4000,
      }),
      'solicitacao',
    );
    expect(msg).toMatch(/R\$\s*3\.200,55/);
  });

  it('failed-precondition SEM details (outro motivo) → frase genérica', () => {
    expect(
      repasseErrorMessage(erroCallable('functions/failed-precondition'), 'solicitacao'),
    ).toBe(GENERICA);
  });

  it('details torto ou de outro motivo NÃO vira frase de dinheiro', () => {
    const tortos = [
      { motivo: 'outra_coisa', disponivelDoEvento: 10 },
      { motivo: 'repasse_excede_evento' }, // sem número
      { motivo: 'repasse_excede_evento', disponivelDoEvento: 'oito mil' },
      { motivo: 'repasse_excede_evento', disponivelDoEvento: Number.NaN },
      'string crua',
      null,
    ];
    for (const details of tortos) {
      expect(
        repasseErrorMessage(erroCallable('functions/failed-precondition', details), 'solicitacao'),
      ).toBe(GENERICA);
    }
  });

  it('o contexto "dados" não é contaminado pelo guard de solicitação', () => {
    expect(
      repasseErrorMessage(
        erroCallable('functions/failed-precondition', {
          motivo: 'repasse_excede_evento',
          disponivelDoEvento: 8500,
        }),
        'dados',
      ),
    ).toBe('Não foi possível salvar os dados bancários agora. Tente novamente em instantes.');
  });
});

describe('repasseErrorMessage — os outros códigos seguem intactos', () => {
  it('invalid-argument (eventoId ausente — RN-369) → revisão de campos', () => {
    expect(repasseErrorMessage(erroCallable('functions/invalid-argument'), 'solicitacao')).toBe(
      'Dados inválidos. Revise os campos e tente novamente.',
    );
  });

  it('permission-denied e desconhecido', () => {
    expect(repasseErrorMessage(erroCallable('functions/permission-denied'), 'solicitacao')).toBe(
      'Sua conta não tem permissão para esta ação de repasse.',
    );
    expect(repasseErrorMessage(erroCallable('functions/internal'), 'solicitacao')).toBe(
      'Não foi possível concluir a ação. Tente novamente em instantes.',
    );
  });

  it('sem erro → string vazia', () => {
    expect(repasseErrorMessage(null, 'solicitacao')).toBe('');
    expect(repasseErrorMessage(undefined, 'dados')).toBe('');
  });
});
