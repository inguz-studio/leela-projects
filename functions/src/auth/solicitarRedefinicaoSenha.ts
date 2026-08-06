// =============================================================================
// functions/src/auth/solicitarRedefinicaoSenha.ts
//
// "Esqueci minha senha" passa a ser NOSSO (lane IDENTIDADE-EMAIL · trace
// leela-build-2d6ee98d).
//
// ANTES: `/recuperar-senha` chamava `sendPasswordResetEmail` no cliente e quem
// enviava era o Firebase, com o template padrão dele — remetente
// `noreply@leela-hub.firebaseapp.com`, layout genérico, idioma decidido no
// Console. Era o e-mail que um cliente novo vê PRIMEIRO e o único dos oito
// que não tinha nada da Leela.
//
// AGORA: o Firebase só GERA o link (`generatePasswordResetLink` — oobCode
// single-use do próprio Auth, nunca token inventado aqui) e quem envia somos
// nós, pela Brevo, com o template da casa. É exatamente o caminho que
// `garantirContaSemFriccao` já usa para "conta criada, defina a senha", e que
// prova que este desenho funciona.
//
// -----------------------------------------------------------------------------
// ANTI-ENUMERAÇÃO (a propriedade que a tela já tinha e não pode perder)
// -----------------------------------------------------------------------------
// 1. RESPOSTA IDÊNTICA sempre: `{ ok: true }`, exista ou não a conta. Nenhum
//    código de erro distingue os dois casos — nem `not-found`, nem
//    `invalid-argument` para e-mail sem conta.
// 2. TEMPO IDÊNTICO. Aqui está a parte que uma implementação ingênua erra: a
//    conta que existe paga uma chamada à Brevo (centenas de ms) e a que não
//    existe retorna na hora. A diferença é medível de fora e vira oráculo tão
//    bom quanto uma mensagem. Por isso os DOIS caminhos são acolchoados até um
//    piso fixo (`PISO_RESPOSTA_MS`) antes de responder.
// 3. RATE LIMIT por e-mail HASHEADO. Sem ele, o endpoint vira bomba de e-mail
//    contra uma caixa alheia. O estouro devolve a MESMA resposta neutra em vez
//    de `resource-exhausted`: um erro distinguível diria "este e-mail já foi
//    tentado", que é um oráculo mais fraco mas ainda é um oráculo.
// 4. NENHUM e-mail em log (LGPD) — só o hash da chave de balde e o desfecho.
//
// FAIL-CLOSED DO E-MAIL (RN-137): sem `BREVO_API_KEY` o `selectEmailProvider`
// devolve null. Aqui isso é registrado como pendência no log e a resposta segue
// neutra — a tela não pode virar detector de configuração do servidor.
//
// -----------------------------------------------------------------------------
// O QUE 05/08 ENSINOU (lane DIAG-SENHA · trace leela-pixreal-diag-20260804)
// -----------------------------------------------------------------------------
// Às 11:43:11Z de 2026-08-05 esta function falhou para um pedido REAL com
// `INTERNAL ASSERT FAILED: Unable to create the email action link` e gravou
// `desfecho: falha_envio`. Três defeitos num só evento, e os três estão
// consertados aqui:
//
//   1. O ramo "conta não existe" era inalcançável. O projeto tem proteção de
//      enumeração ligada no Auth, e com ela o endereço desconhecido volta como
//      assert do SDK, não como `auth/user-not-found`. A tradução agora mora em
//      `classificarFalhaDeLink` (`linkDeAcao.ts`), que conhece os dois dialetos.
//   2. O rótulo mentia. `falha_envio` era o valor INICIAL da variável, então
//      toda exceção — inclusive a do Auth, antes de existir e-mail — saía
//      acusando o provedor. Agora existe `erro_inesperado`.
//   3. Ninguém foi avisado. Os dois `logger.error` deste arquivo passaram a
//      registrar INCIDENTE (`incidenteEmail.ts`), com o campo `alerta` que a
//      política do Cloud Logging casa. A falha foi descoberta um dia depois,
//      por uma lane de deploy que foi ler o log por outro motivo.
// =============================================================================

import * as admin from 'firebase-admin';
import { runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { validarEmail, type EmailProvider } from '@leela/core';
import { selectEmailProvider } from '../email/selectEmailProvider';
import { renderRedefinirSenhaEmail } from '../email/templates';
import { consumirRateLimit, hashChave, type JanelaRateLimit } from '../shared/rateLimit';
import { registrarIncidenteEmail } from '../email/incidenteEmail';
import {
  actionCodeSettingsSenha,
  classificarFalhaDeLink,
  ORIGEM_PADRAO,
  origemDeLinkValida,
  reescreverParaTelaDeSenha,
  type OrigemLinkSenha,
} from './linkDeAcao';

/**
 * Piso de tempo de resposta, em ms. Cobre com folga o caminho caro (Auth +
 * Brevo) na p50 e é curto o bastante para a tela não parecer travada. O piso é
 * o que iguala os dois caminhos; sem ele o tempo é o vazamento.
 */
export const PISO_RESPOSTA_MS = 1_200;

/** 5 pedidos por hora para o MESMO e-mail — mata a bomba de e-mail. */
export const LIMITE_POR_EMAIL = 5;
export const JANELA_MS = 60 * 60_000;

/** Janela por e-mail HASHEADO (nunca o e-mail cru como docId). @pure */
export function janelaDoEmail(email: string): JanelaRateLimit {
  return {
    chave: `reset-senha:${hashChave(email)}`,
    limite: LIMITE_POR_EMAIL,
    janelaMs: JANELA_MS,
  };
}

/** Porta mínima do Auth que o fluxo usa (injetável nos testes). */
export interface RedefinicaoAuth {
  /**
   * Link oficial de redefinição; `null` quando a conta não existe.
   *
   * A ORIGEM entra aqui (S1223-T2 · RN-453) porque é ela que decide o domínio
   * do `continueUrl`: o comprador aterrissa na landing, o organizador no
   * painel. O mesmo e-mail de "esqueci minha senha" sai das duas casas.
   */
  gerarLinkRedefinicao(
    email: string,
    origem: OrigemLinkSenha
  ): Promise<string | null>;
  /** Nome de exibição da conta, quando houver. */
  nomeDaConta(email: string): Promise<string>;
}

/**
 * O pedaço do Admin SDK que o adapter usa. Existe como COSTURA (F1 da lane
 * DIAG-SENHA): a tradução de erro do Auth em desfecho é onde o defeito de
 * 05/08 morava, e ela não tinha um único teste porque `admin.auth()` é global.
 * O default é o SDK de verdade — produção não enxerga diferença.
 */
export interface AuthSdkDeLinkSenha {
  /** `generatePasswordResetLink`; sem `settings` = sem `continueUrl`. */
  gerarLink(
    email: string,
    settings?: { url: string; handleCodeInApp: false }
  ): Promise<string>;
  /** `getUserByEmail(...).displayName`. */
  nomeExibicao(email: string): Promise<string>;
}

/** A costura ligada no Admin SDK real. */
export function authSdkDeLinkSenhaAdmin(): AuthSdkDeLinkSenha {
  return {
    async gerarLink(email, settings) {
      return settings === undefined
        ? admin.auth().generatePasswordResetLink(email)
        : admin.auth().generatePasswordResetLink(email, settings);
    },
    async nomeExibicao(email) {
      return (await admin.auth().getUserByEmail(email)).displayName ?? '';
    },
  };
}

/** Adapter default sobre `admin.auth()`. */
export function redefinicaoAuthAdmin(
  env: Record<string, string | undefined> = process.env,
  sdk: AuthSdkDeLinkSenha = authSdkDeLinkSenhaAdmin()
): RedefinicaoAuth {
  return {
    async gerarLinkRedefinicao(email, origem) {
      try {
        return await sdk.gerarLink(email, actionCodeSettingsSenha(origem, env));
      } catch (err) {
        const causa = classificarFalhaDeLink(err);
        // `sem_conta` cobre os dois dialetos do Auth: o `auth/user-not-found`
        // clássico e o assert de "sem oobLink" que a proteção de enumeração
        // do projeto produz desde que foi ligada (ver `linkDeAcao.ts`). Sem
        // este ramo, endereço desconhecido vira exceção e o pedido legítimo
        // morre junto com ele.
        if (causa === 'sem_conta') return null;
        // Domínio do `continueUrl` fora da allowlist de domínios autorizados do
        // Auth. Degradar para o link SEM `continueUrl` é melhor que deixar
        // alguém sem conseguir recuperar a conta por causa de configuração —
        // o `oobCode` é o que importa, e a reescrita para o painel acontece
        // depois de qualquer jeito. O WARN é o que faz alguém consertar.
        if (causa === 'continue_uri_recusada') {
          logger.warn('reset_senha_continue_uri_recusada', {
            code: (err as { code?: string }).code,
          });
          try {
            return await sdk.gerarLink(email);
          } catch (err2) {
            if (classificarFalhaDeLink(err2) === 'sem_conta') return null;
            throw err2;
          }
        }
        throw err;
      }
    },
    async nomeDaConta(email) {
      try {
        return await sdk.nomeExibicao(email);
      } catch {
        return '';
      }
    },
  };
}

export interface SolicitarRedefinicaoResultado {
  /** SEMPRE `true`. O campo existe para o cliente ter o que checar. */
  ok: true;
}

/** Desfecho interno — só para log/teste, NUNCA para a resposta. */
export type DesfechoRedefinicao =
  | 'enviado'
  | 'conta_inexistente'
  | 'email_invalido'
  | 'pendente_chave'
  | 'falha_envio'
  /**
   * Exceção que não é falha de ENVIO (DIAG-SENHA). O desfecho existe porque a
   * ausência dele custou o diagnóstico de 05/08: o wrapper inicializava a
   * variável em `falha_envio`, então qualquer exceção antes da Brevo — a do
   * Auth, inclusive — era registrada com o rótulo de "a Brevo recusou". Quem
   * lesse o log iria caçar a chave do provedor, que estava perfeita.
   */
  | 'erro_inesperado'
  | 'limite_estourado';

/**
 * Núcleo, sem o acolchoamento de tempo (o wrapper cuida disso). Devolve o
 * desfecho REAL para teste e log; a callable descarta e responde neutro.
 */
export async function solicitarRedefinicaoCore(
  db: admin.firestore.Firestore,
  auth: RedefinicaoAuth,
  emailProvider: EmailProvider | null,
  rawInput: unknown,
  agora: Date = new Date()
): Promise<DesfechoRedefinicao> {
  const input = rawInput as { email?: unknown; origem?: unknown } | null;
  // Origem desconhecida ou ausente cai no default (organizador), que é o
  // comportamento anterior a esta task. O campo é uma DICA de destino, nunca
  // uma credencial: escolher errado só troca a casa em que a pessoa aterrissa,
  // e o `oobCode` continua sendo o que autoriza.
  const origem: OrigemLinkSenha = origemDeLinkValida(input?.origem)
    ? input.origem
    : ORIGEM_PADRAO;
  const bruto = typeof input?.email === 'string' ? input.email.trim() : '';
  if (bruto.length === 0 || bruto.length > 254 || !validarEmail(bruto)) {
    return 'email_invalido';
  }
  const email = bruto.toLowerCase();

  // Balde ANTES de qualquer trabalho: quem estoura não gasta Auth nem Brevo.
  try {
    await consumirRateLimit(db, [janelaDoEmail(email)], agora);
  } catch {
    // `resource-exhausted` (ou infra fora do ar, fail-closed) NÃO sobe para o
    // cliente: erro distinguível é oráculo. Silencia e segue neutro.
    logger.info('reset_senha_limite', { chave: janelaDoEmail(email).chave });
    return 'limite_estourado';
  }

  const link = await auth.gerarLinkRedefinicao(email, origem);
  if (link === null) return 'conta_inexistente';
  if (emailProvider === null) {
    // Fail-closed RN-137: pendência observável, resposta intocada.
    logger.warn('reset_senha_pendente_chave');
    return 'pendente_chave';
  }

  const nome = await auth.nomeDaConta(email);
  try {
    const rendered = renderRedefinirSenhaEmail({
      nomeUsuario: nome,
      linkRedefinirSenha: reescreverParaTelaDeSenha(link, origem),
    });
    await emailProvider.sendTransactional({
      to: { email, ...(nome.length > 0 ? { nome } : {}) },
      assunto: rendered.assunto,
      html: rendered.html,
      texto: rendered.texto,
      tag: 'redefinir-senha',
    });
    return 'enviado';
  } catch (err) {
    // DIAG-SENHA: falha de envio transacional é INCIDENTE, no molde da
    // rodada (`incidenteEmail.ts`) — mesmo nome de evento de sempre, agora
    // com o campo `alerta` que a política do Cloud Logging casa. Sem PII.
    registrarIncidenteEmail('reset_senha_email_falhou', {
      tipo: 'redefinir_senha',
      erro: err,
    });
    return 'falha_envio';
  }
}

/** Espera até o piso de tempo, para o desfecho não vazar pelo relógio. */
export async function acolchoarAte(
  inicioMs: number,
  pisoMs: number = PISO_RESPOSTA_MS,
  agoraMs: () => number = Date.now
): Promise<void> {
  const falta = pisoMs - (agoraMs() - inicioMs);
  if (falta > 0) await new Promise((r) => setTimeout(r, falta));
}

/**
 * Núcleo COM tempo constante. Resposta e duração idênticas nos dois caminhos.
 */
export async function solicitarRedefinicaoComTempoConstante(
  db: admin.firestore.Firestore,
  auth: RedefinicaoAuth,
  emailProvider: EmailProvider | null,
  rawInput: unknown,
  agora: Date = new Date(),
  /** Só o teste encurta o piso — em produção o valor é `PISO_RESPOSTA_MS`. */
  pisoMs: number = PISO_RESPOSTA_MS
): Promise<SolicitarRedefinicaoResultado> {
  const inicio = Date.now();
  // O default é `erro_inesperado`, não `falha_envio`: só chega aqui quem
  // LANÇOU, e lançar antes da Brevo não é a Brevo recusando (DIAG-SENHA).
  let desfecho: DesfechoRedefinicao = 'erro_inesperado';
  try {
    desfecho = await solicitarRedefinicaoCore(
      db,
      auth,
      emailProvider,
      rawInput,
      agora
    );
  } catch (err) {
    // Falha inesperada também responde neutro: um 500 só para conta existente
    // seria o mesmo oráculo por outro caminho.
    //
    // MAS RESPONDER NEUTRO NÃO É NÃO CONTAR (DIAG-SENHA). Foi exatamente
    // assim que 05/08 passou despercebido: a pessoa recebeu `{ ok: true }`,
    // não recebeu e-mail nenhum, e o log ficou sem o campo que dispara
    // alerta. O incidente usa o MESMO `alerta` dos outros e-mails — uma
    // política só cobre a casa toda —, e o `tipo` diz qual caminho morreu.
    registrarIncidenteEmail('reset_senha_falhou', {
      tipo: 'redefinir_senha',
      erro: err,
    });
  }
  // Sem PII (LGPD): o desfecho é categoria, nunca o e-mail.
  logger.info('reset_senha', { desfecho });
  await acolchoarAte(inicio, pisoMs);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Callable (PÚBLICA — quem esqueceu a senha não tem sessão)
// ---------------------------------------------------------------------------

export const solicitarRedefinicaoSenha = runWith({
  secrets: ['BREVO_API_KEY'],
}).https.onCall(async (data: unknown) => {
  return solicitarRedefinicaoComTempoConstante(
    admin.firestore(),
    redefinicaoAuthAdmin(),
    selectEmailProvider(),
    data
  );
});
