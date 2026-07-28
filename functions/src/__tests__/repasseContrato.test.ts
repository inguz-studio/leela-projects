// =============================================================================
// repasseContrato.test.ts — LEELA-CAIXASIMPLES-REV (review antagonista)
//
// O contrato do `requestRepasse` mora em DOIS lugares: a callable
// (`functions/src/finance/requestRepasse.ts`, autoridade) e o wrapper tipado
// que o painel chama (`@leela/api-client`). A DEC-0727C mexeu na callable —
// `eventoId` virou OBRIGATÓRIO (RN-369) e a resposta passou a carregar
// `disponivelDoEvento` (RN-368) — e o espelho do cliente ficou para trás:
// continuava anunciando `eventoId?` opcional com `eventoId: string | null` na
// volta, e não declarava o campo novo.
//
// Por que isso é dinheiro e não cosmética de tipo: `eventoId?` opcional é uma
// PROMESSA de que existe um caminho sem evento. Quem programar contra o
// api-client (outro app, um script, a próxima tela) chama sem o campo, compila
// verde e só descobre no runtime, com `invalid-argument`, que a regra do dono
// fechou aquele caminho. E `disponivelDoEvento` ausente do tipo faz o painel
// ter de dar um segundo round-trip para saber quanto sobrou no evento, pelo
// número que a própria resposta já traz.
//
// Este arquivo trava os dois lados um contra o outro. Ele MORDE no
// `type-check` (a comparação é de TIPO, não de valor) — se alguém mudar a
// callable sem mudar o espelho, ou vice-versa, o build para aqui e não numa
// tela do organizador.
// =============================================================================

import { describe, expect, it } from 'vitest';
import type {
  RequestRepasseInput as ClienteInput,
  RequestRepasseResult as ClienteResult,
  CancelRepasseInput as ClienteCancelInput,
  CancelRepasseResult as ClienteCancelResult,
} from '@leela/api-client';
import type {
  RequestRepasseInput as ServidorInput,
  RequestRepasseResult as ServidorResult,
  CancelRepasseInput as ServidorCancelInput,
  CancelRepasseResult as ServidorCancelResult,
} from '../finance/requestRepasse';

/** `true` só quando os dois tipos são MUTUAMENTE atribuíveis (espelho exato). */
type Espelho<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// As quatro asserções abaixo são o teste. Um espelho quebrado vira `false`, e
// `false` não é atribuível a `true` — erro de compilação, com o nome da linha
// dizendo qual dos contratos saiu de sincronia.
const inputEspelhado: Espelho<ServidorInput, ClienteInput> = true;
const resultEspelhado: Espelho<ServidorResult, ClienteResult> = true;
const cancelInputEspelhado: Espelho<ServidorCancelInput, ClienteCancelInput> = true;
const cancelResultEspelhado: Espelho<ServidorCancelResult, ClienteCancelResult> = true;

describe('contrato requestRepasse — callable × @leela/api-client', () => {
  it('os quatro contratos são espelho EXATO (falha no type-check, não em produção)', () => {
    expect([
      inputEspelhado,
      resultEspelhado,
      cancelInputEspelhado,
      cancelResultEspelhado,
    ]).toEqual([true, true, true, true]);
  });

  it('RN-369: `eventoId` é obrigatório dos DOIS lados', () => {
    // Se o espelho do cliente voltar a `eventoId?`, este objeto deixa de ser
    // atribuível ao tipo do servidor e o type-check acusa.
    const doCliente: ClienteInput = { valor: 100, eventoId: 'meia-floripa-2026' };
    const paraOServidor: ServidorInput = doCliente;
    expect(paraOServidor.eventoId).toBe('meia-floripa-2026');
  });

  it('RN-368: a resposta carrega o disponível do evento nos DOIS lados', () => {
    const doServidor: ServidorResult = {
      repasseId: 'rep-1',
      estado: 'solicitado',
      valor: 100,
      disponivel: 8400,
      eventoId: 'meia-floripa-2026',
      disponivelDoEvento: 8400,
    };
    const paraOCliente: ClienteResult = doServidor;
    expect(paraOCliente.disponivelDoEvento).toBe(8400);
  });
});
