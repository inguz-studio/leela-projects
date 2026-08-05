// =============================================================================
// @leela/api-client — o código de seis dígitos das duas portas da landing
// (SPEC-CONTAS-LANDING · RN-476 a RN-482).
//
// POR QUE UM ARQUIVO PRÓPRIO, e não mais um bloco em `auth.ts`: as duas telas
// novas (`/primeiro-acesso` e `/criar-conta`) consomem UMA máquina, e ela é
// distinta do login e da recuperação por link. Misturá-la ali produziria um
// arquivo em que "esqueci minha senha" e "primeiro acesso por código" moram
// coladas — e elas são justamente as duas superfícies que o CONTA-1 pergunta
// ao dono se devem conviver.
//
// A REGRA QUE ATRAVESSA TUDO (RN-477): as duas portas chamam as MESMAS
// callables com o MESMO payload. O que muda por porta é a moldura, a copy e o
// campo de nome — nunca o que o servidor faz. Nenhuma tela pode dizer "você não
// tem conta" nem "e-mail já cadastrado": as duas frases são o oráculo voltando
// pela janela, e nenhuma delas existe neste pacote.
// =============================================================================

import { httpsCallable } from 'firebase/functions';
import { getLeelaFunctions } from './firebase';

export interface SolicitarCodigoResultado {
  ok: true;
  /** Minutos de validade — a tela mostra o mesmo número que o servidor aplica. */
  validadeMinutos: number;
}

/**
 * Pede o código de seis dígitos para um endereço (RN-476).
 *
 * A resposta é a mesma exista ou não conta no endereço, e o tempo também: o
 * servidor não consulta "existe conta?" antes de enviar. A tela mostra a frase
 * única — *"Se este endereço puder receber um código, ele já saiu."* — nos
 * quatro desfechos.
 *
 * ERROS que o chamador distingue (nenhum deles depende de existir conta):
 *   · `invalid-argument`  → endereço mal formado (a tela já barra antes);
 *   · `resource-exhausted`→ limitador por ALVO estourou (3/15min, 10/24h). A
 *     frase é a do `rateLimit.ts`: "Muitas tentativas. Tente novamente em
 *     alguns minutos.";
 *   · `unavailable` / `failed-precondition` → o e-mail NÃO saiu (provedor
 *     recusou ou não está configurado). A tela é honesta e não finge que saiu
 *     — é a doutrina de 04/08, e aqui ela vale com uma credencial no meio.
 */
export async function solicitarCodigoDeAcesso(
  email: string
): Promise<SolicitarCodigoResultado> {
  const fn = httpsCallable<{ email: string }, SolicitarCodigoResultado>(
    getLeelaFunctions(),
    'solicitarCodigoDeAcesso'
  );
  const { data } = await fn({ email });
  return data;
}
