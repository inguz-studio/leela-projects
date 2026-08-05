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
// =============================================================================

import * as admin from 'firebase-admin';
import { runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { validarEmail, type EmailProvider } from '@leela/core';
import { selectEmailProvider } from '../email/selectEmailProvider';
import { renderRedefinirSenhaEmail } from '../email/templates';
import { consumirRateLimit, hashChave, type JanelaRateLimit } from '../shared/rateLimit';
import {
  actionCodeSettingsSenha,
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

/** Adapter default sobre `admin.auth()`. */
export function redefinicaoAuthAdmin(
  env: Record<string, string | undefined> = process.env
): RedefinicaoAuth {
  return {
    async gerarLinkRedefinicao(email, origem) {
      try {
        return await admin
          .auth()
          .generatePasswordResetLink(email, actionCodeSettingsSenha(origem, env));
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'auth/user-not-found' || code === 'auth/email-not-found') {
          return null;
        }
        // Domínio do `continueUrl` fora da allowlist de domínios autorizados do
        // Auth. Degradar para o link SEM `continueUrl` é melhor que deixar
        // alguém sem conseguir recuperar a conta por causa de configuração —
        // o `oobCode` é o que importa, e a reescrita para o painel acontece
        // depois de qualquer jeito. O WARN é o que faz alguém consertar.
        if (
          code === 'auth/invalid-continue-uri' ||
          code === 'auth/unauthorized-continue-uri' ||
          code === 'auth/missing-continue-uri'
        ) {
          logger.warn('reset_senha_continue_uri_recusada', { code });
          try {
            return await admin.auth().generatePasswordResetLink(email);
          } catch (err2) {
            const code2 = (err2 as { code?: string }).code;
            if (code2 === 'auth/user-not-found' || code2 === 'auth/email-not-found') {
              return null;
            }
            throw err2;
          }
        }
        throw err;
      }
    },
    async nomeDaConta(email) {
      try {
        return (await admin.auth().getUserByEmail(email)).displayName ?? '';
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
    logger.error('reset_senha_email_falhou', {
      err: err instanceof Error ? err.message : String(err),
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
  let desfecho: DesfechoRedefinicao = 'falha_envio';
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
    logger.error('reset_senha_falhou', {
      err: err instanceof Error ? err.message : String(err),
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
