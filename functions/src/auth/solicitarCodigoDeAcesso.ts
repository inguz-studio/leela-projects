// =============================================================================
// functions/src/auth/solicitarCodigoDeAcesso.ts
//
// A callable que PEDE o código (S1229-T3 · RN-476 · RN-477 · RN-482).
//
// Superfície PÚBLICA, anônima, e que dispara e-mail. Quem chega aqui não tem
// sessão — é exatamente a pessoa que não consegue entrar.
//
// -----------------------------------------------------------------------------
// A PROPRIEDADE QUE CARREGA A TAREFA: NÃO EXISTE RAMO POR "TEM CONTA?"
// -----------------------------------------------------------------------------
// As duas portas do modal ("É meu primeiro acesso" e "Criar conta") chamam
// ESTA função com o mesmo payload e recebem a mesma resposta. Se cada porta
// respondesse conforme o que encontra, o modal viraria o oráculo mais barato
// possível: digite um endereço em cada uma e descubra quem já comprou na Leela.
//
// Por isso aqui não há — e não pode passar a haver — nenhuma consulta ao Auth
// ou ao Firestore perguntando se aquele endereço tem conta. A ausência desse
// ramo é o que faz a LATÊNCIA não distinguir os dois casos, e latência é o
// oráculo que sobra depois que as mensagens ficam iguais.
//
// ⚠ PARA QUEM FOR MEXER: qualquer `getUserByEmail`, `where('email','==',…)` ou
// leitura condicional acrescentada antes do envio reabre o oráculo, mesmo que a
// resposta continue idêntica. O ataque é medir a diferença de tempo entre
// endereço conhecido e endereço inventado, com amostra grande. O `solicitar-
// RedefinicaoSenha` precisa de um PISO de tempo porque ele TEM esse ramo (o
// adapter dele traduz a recusa do `generatePasswordResetLink` em `null` para
// conta inexistente — ver `classificarFalhaDeLink` em `linkDeAcao.ts`); aqui o
// piso é desnecessário porque o ramo não existe — e essa é uma propriedade a
// preservar, não uma economia a reverter.
//
// -----------------------------------------------------------------------------
// A ORDEM: GRAVA, DEPOIS ENVIA — E O QUE ACONTECE QUANDO O ENVIO FALHA
// -----------------------------------------------------------------------------
// O documento do código nasce ANTES do envio (RN-482). Provedor recusando, a
// chamada devolve ERRO EXPLÍCITO e marca o documento como morto. Devolver
// "enviamos" para quem nunca vai receber é o incidente de 04/08 servido de
// novo, e desta vez com uma credencial no meio.
//
// Sem provedor configurado (`BREVO_API_KEY` ausente ⇒ `selectEmailProvider`
// devolve null), a chamada recusa ANTES de começar — fail-closed no molde do
// e-mail 3. Aqui isso NÃO é oráculo: não depende do endereço, depende da
// configuração do servidor, e é igual para todo mundo.
//
// -----------------------------------------------------------------------------
// O LIMITADOR VEM PRIMEIRO
// -----------------------------------------------------------------------------
// Quem estoura não gasta sorteio, não gasta escrita e não gasta Brevo. E o
// estouro SOBE ao cliente com a frase única do `rateLimit.ts` — diferente do
// `solicitarRedefinicaoSenha`, que silencia o estouro para não virar oráculo de
// "este e-mail já foi tentado". A diferença é deliberada: lá a resposta é
// sempre `{ ok: true }` e um erro distinguível vazaria; aqui a tela TEM um
// estado próprio para "muitas tentativas" (tabela de estados da spec), a
// pessoa precisa saber que deve esperar, e o balde é do endereço que ela mesma
// acabou de digitar.
// =============================================================================

import * as admin from 'firebase-admin';
import { https, runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  CODIGO_ACESSO_TTL_MS,
  emailDeCodigoValido,
  normalizarEmailCodigo,
  type EmailProvider,
} from '@leela/core';
import { registrarIncidenteEmail } from '../email/incidenteEmail';
import { selectEmailProvider } from '../email/selectEmailProvider';
import { renderCodigoDeAcessoEmail } from '../email/templates';
import { consumirRateLimit } from '../shared/rateLimit';
import {
  emitirCodigoDeAcesso,
  janelasDoCodigo,
  matarCodigoDeAcesso,
} from './codigoDeAcesso';

export interface SolicitarCodigoResultado {
  ok: true;
  /** Minutos de validade — a tela mostra o mesmo número que o servidor aplica. */
  validadeMinutos: number;
}

/** Desfecho interno — para LOG e TESTE. A resposta é só `{ ok }`. */
export type DesfechoSolicitacao =
  | 'enviado'
  | 'email_invalido'
  | 'limite_estourado'
  | 'sem_provedor'
  | 'falha_envio';

const MINUTOS = Math.round(CODIGO_ACESSO_TTL_MS / 60_000);

/**
 * Núcleo, testável com Admin SDK contra o Emulator. A callable é wrapper fino.
 *
 * Lança `https.HttpsError` nos caminhos de erro — as três causas (endereço
 * inválido, limitador estourado, envio impossível) são distinguíveis entre si
 * de propósito, porque nenhuma delas depende de existir conta no endereço. O
 * que jamais pode ser distinguível é "tem conta" × "não tem".
 */
export async function solicitarCodigoDeAcessoCore(
  db: admin.firestore.Firestore,
  emailProvider: EmailProvider | null,
  rawInput: unknown,
  agora: Date = new Date()
): Promise<{ resultado: SolicitarCodigoResultado; desfecho: DesfechoSolicitacao }> {
  const input = rawInput as { email?: unknown } | null;
  if (!emailDeCodigoValido(input?.email)) {
    throw new https.HttpsError(
      'invalid-argument',
      'Informe um e-mail válido para receber o código.'
    );
  }
  const email = normalizarEmailCodigo(input?.email);

  // FAIL-CLOSED antes de qualquer trabalho: sem provedor não há como o código
  // chegar a ninguém, e gravar um digest que ninguém vai poder usar só deixa
  // lixo com prazo. Não depende do endereço ⇒ não é oráculo.
  if (emailProvider === null) {
    logger.error('codigo_acesso_sem_provedor');
    throw new https.HttpsError(
      'failed-precondition',
      'Não conseguimos enviar agora. Tente de novo em instantes.'
    );
  }

  // O balde ANTES do sorteio: quem estoura não gasta escrita nem Brevo. O
  // `consumirRateLimit` é fail-closed — infra fora do ar também nega.
  await consumirRateLimit(db, janelasDoCodigo(email), agora);

  // Daqui para baixo NÃO existe ramo que dependa de "tem conta?". Ler o Auth
  // aqui seria reabrir o oráculo pela latência.
  const { codigo } = await emitirCodigoDeAcesso(db, email, agora);

  try {
    const render = renderCodigoDeAcessoEmail({ codigo, validadeMinutos: MINUTOS });
    await emailProvider.sendTransactional({
      to: { email },
      assunto: render.assunto,
      html: render.html,
      texto: render.texto,
      tag: 'codigo-de-acesso',
    });
  } catch (err) {
    // RN-482: o envio falhou, então o documento morre e a chamada DIZ isso. A
    // pessoa pede de novo — não há repetição automática, pela mesma política
    // dos outros oito e-mails (no máximo uma vez).
    await matarCodigoDeAcesso(db, email, 'envio_falhou');
    // INCIDENTE, não linha de log (REV-CONTAS-MOTOR · DEF-3). Esta lane nasceu
    // com um `logger.error` cru aqui — sem o campo `alerta` que a política da
    // rodada casa —, e este é o ÚNICO e-mail da casa cuja falha deixa a pessoa
    // sem conseguir entrar. Era o incidente de 04/08 pronto para se repetir em
    // silêncio, agora com uma credencial no meio. Sem PII: nem endereço, nem
    // nome, nem o código.
    registrarIncidenteEmail('codigo_acesso_envio_falhou', {
      tipo: 'codigo_de_acesso',
      erro: err,
    });
    throw new https.HttpsError(
      'unavailable',
      'Não conseguimos enviar agora. Tente de novo em instantes.'
    );
  }

  // Sem PII no log (LGPD): o desfecho é categoria, nunca o endereço.
  logger.info('codigo_acesso_solicitado', { desfecho: 'enviado' });
  return {
    resultado: { ok: true, validadeMinutos: MINUTOS },
    desfecho: 'enviado',
  };
}

// ---------------------------------------------------------------------------
// Callable (PÚBLICA — quem pede o código não tem sessão)
// ---------------------------------------------------------------------------

export const solicitarCodigoDeAcesso = runWith({
  secrets: ['BREVO_API_KEY', 'CODIGO_ACESSO_PEPPER'],
}).https.onCall(async (data: unknown): Promise<SolicitarCodigoResultado> => {
  const { resultado } = await solicitarCodigoDeAcessoCore(
    admin.firestore(),
    selectEmailProvider(),
    data
  );
  return resultado;
});
