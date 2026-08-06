// =============================================================================
// functions/src/affiliation/provisionAfiliado.ts
//
// Cloud Function callable PÚBLICA: aceite do convite de influenciador PF
// (LEELA-R9E · S-R9-11-T6 · RN-316 — REUSO da disciplina E18/S1801-T3).
//
// Contrato (página de aceite da landing):
//   provisionAfiliadoAccount({ eventoId, afiliadoId, token, senha?, nome? })
//     -> { ok: true, eventoId, afiliadoId, replay }
//
// REUSO PROVADO POR LEITURA (brief do maestro — mesma disciplina do
// provisionAssessoriaAccount `9e7e017`/`6eecc2b` + rate-limit R2 `964cae2`):
//   1. TOKEN é a credencial: SHA-256 comparado em TEMPO CONSTANTE com o hash
//      persistido; sem token válido NADA além de 'permission-denied' opaco
//      (não vaza existência/estado do convite — chamada é pública).
//   2. Conta Auth por e-mail: cria QUANDO NÃO EXISTE (senha do aceite);
//      existente = VINCULA sem tocar credencial (token de convite nunca
//      troca senha — anti-takeover).
//   3. TRANSAÇÃO anti-TOCTOU: re-lê o afiliado FRESCO — inativação
//      concorrente pelo organizador não é atropelada; dois aceites
//      concorrentes do MESMO responsável = replay, não erro.
//   4. IDEMPOTENTE: afiliado já 'ativo' com o MESMO uid → replay=true.
//   5. COMPENSAÇÃO: conta criada NESTE run + tx falhou → deleteUser.
//   6. RATE-LIMIT R2 (failures-only, keyed no ALVO real eventoId/afiliadoId):
//      SÓ a falha de token alimenta o balde; aceite legítimo NUNCA consome
//      (zero DoS da vítima); mesmos limites do aceite E18 (30/15min).
//
// PII/LGPD: logs sem e-mail/documento (só eventoId/afiliadoId/uid).
// =============================================================================

import * as admin from 'firebase-admin';
import { createHash, timingSafeEqual } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { https, runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  COLECAO_AFILIADOS,
  SENHA_MIN,
  exigenciaDeSenha,
  senhaValida,
} from '@leela/core';
import {
  ACEITE_JANELA_MS,
  ACEITE_LIMITE_POR_ALVO,
} from '../assessorias/provisionAssessoria';
import {
  consumirRateLimit,
  hashChave,
  type JanelaRateLimit,
} from '../shared/rateLimit';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface ProvisionAfiliadoInput {
  eventoId: string;
  /** docId do afiliado (== refCodigo — veio no link do convite). */
  afiliadoId: string;
  /** Token de aceite do link (o doc guarda só o hash). */
  token: string;
  /** Senha da conta NOVA (ignorada quando a conta já existe). */
  senha?: string;
  /** Nome de exibição (fallback: nome do afiliado). */
  nome?: string;
}

export interface ProvisionAfiliadoResult {
  ok: true;
  eventoId: string;
  afiliadoId: string;
  /** true = aceite já estava integralmente provisionado (retry). */
  replay: boolean;
}

/**
 * Piso da senha desta porta — APELIDO da política da casa, não um número dela.
 *
 * Nasceu como `8` literal aqui, e o api-client copiou o número "como espelho de
 * premissa". Dois espelhos de uma premissa são duas autoridades esperando para
 * divergir: no dia em que o piso subir num, o outro continua aceitando o que o
 * primeiro recusa, e a pessoa é barrada por uma régua que a tela não mostrou.
 * Continua exportado porque o api-client o importa; o valor vem do core.
 */
export const SENHA_MIN_AFILIADO = SENHA_MIN;

/** Comparação em tempo constante de hashes hex (mesmo comprimento). */
function tokenConfere(tokenInput: string, hashPersistido: unknown): boolean {
  if (typeof hashPersistido !== 'string' || hashPersistido.length !== 64) {
    return false;
  }
  const hashInput = createHash('sha256').update(tokenInput, 'utf8').digest('hex');
  return timingSafeEqual(
    Buffer.from(hashInput, 'utf8'),
    Buffer.from(hashPersistido, 'utf8')
  );
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function provisionAfiliadoCore(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  rawInput: unknown,
  agora: Date = new Date()
): Promise<ProvisionAfiliadoResult> {
  const input = rawInput as Partial<ProvisionAfiliadoInput> | null;
  const eventoId = typeof input?.eventoId === 'string' ? input.eventoId : '';
  const afiliadoId = typeof input?.afiliadoId === 'string' ? input.afiliadoId : '';
  const token = typeof input?.token === 'string' ? input.token : '';
  if (eventoId.length === 0 || afiliadoId.length === 0 || token.length === 0) {
    throw new https.HttpsError(
      'invalid-argument',
      'eventoId, afiliadoId e token são obrigatórios.'
    );
  }

  const afiliadoRef = db
    .collection('eventos')
    .doc(eventoId)
    .collection(COLECAO_AFILIADOS)
    .doc(afiliadoId);
  const afiliadoSnap = await afiliadoRef.get();

  // Fail-closed OPACO até o token validar (padrão E18): afiliado
  // inexistente, tipo errado e token errado são INDISTINGUÍVEIS.
  const NEGADO = new https.HttpsError('permission-denied', 'Convite inválido.');
  if (!afiliadoSnap.exists) throw NEGADO;
  if (afiliadoSnap.get('tipo') !== 'pessoa_fisica') throw NEGADO;
  const emailKey = (afiliadoSnap.get('responsavelEmail') ?? '') as string;
  if (emailKey.length === 0) throw NEGADO;
  if (!tokenConfere(token, afiliadoSnap.get('tokenAceiteHash'))) {
    logger.warn('afiliado_aceite_token_invalido', { eventoId, afiliadoId });
    throw NEGADO;
  }

  // ── Token validado — estados agora podem ser honestos ────────────────────
  const status = afiliadoSnap.get('status') as string;

  let uid: string;
  let contaCriadaNesteRun = false;
  let contaExiste = true;
  try {
    uid = (await auth.getUserByEmail(emailKey)).uid;
  } catch {
    contaExiste = false;
    uid = '';
  }

  // Replay integral: afiliado ativo com o MESMO responsável.
  if (status === 'ativo') {
    const uidAtual = (afiliadoSnap.get('responsavelUid') ?? '') as string;
    if (contaExiste && uidAtual === uid) {
      logger.info('afiliado_aceite_replay', { eventoId, afiliadoId, uid });
      return { ok: true, eventoId, afiliadoId, replay: true };
    }
    throw new https.HttpsError(
      'failed-precondition',
      'Convite já foi aceito — nada a fazer.'
    );
  }
  if (status !== 'convite_pendente') {
    throw new https.HttpsError(
      'failed-precondition',
      'Convite não está aguardando aceite (cancelado ou encerrado).'
    );
  }

  // Expiração (estado honesto + caminho de reenvio pelo organizador).
  const expiraEm = afiliadoSnap.get('expiraEm') as
    | { toMillis?: () => number }
    | undefined;
  if (
    typeof expiraEm?.toMillis === 'function' &&
    expiraEm.toMillis() <= agora.getTime()
  ) {
    throw new https.HttpsError(
      'failed-precondition',
      'convite_expirado: peça um reenvio ao organizador.'
    );
  }

  // Conta NOVA exige senha; conta EXISTENTE nunca tem credencial tocada.
  if (!contaExiste) {
    const senha = typeof input?.senha === 'string' ? input.senha : '';
    // Política inteira (comprimento + número + especial), e AQUI é onde ela
    // vale de verdade: esta porta cria a conta pelo Admin SDK, então o
    // navegador não tem como passar por cima. A mesma frase da tela sai no
    // erro — `exigenciaDeSenha()` é a fonte única das duas.
    if (!senhaValida(senha)) {
      throw new https.HttpsError(
        'invalid-argument',
        `Senha é obrigatória para criar a conta. ${exigenciaDeSenha()}`
      );
    }
    const displayName =
      typeof input?.nome === 'string' && input.nome.trim().length > 0
        ? input.nome.trim()
        : ((afiliadoSnap.get('nome') ?? emailKey) as string);
    try {
      const created = await auth.createUser({
        email: emailKey,
        password: senha,
        emailVerified: false,
        displayName,
      });
      uid = created.uid;
      contaCriadaNesteRun = true;
    } catch (err) {
      // Corrida de dois aceites concorrentes (fix O3-L3B #4 herdado): o
      // perdedor do createUser vincula em vez de subir 'internal'.
      if ((err as { code?: unknown }).code === 'auth/email-already-exists') {
        uid = (await auth.getUserByEmail(emailKey)).uid;
      } else {
        throw err;
      }
    }
    // Papel: default 'athlete' nasce do trigger onCreateUser (nenhuma claim
    // de tenant é concedida pelo aceite — o dashboard lê via reader/Rules
    // fail-closed RN-318).
  }

  // ── Transação: ativa o afiliado + vincula a conta (anti-TOCTOU) ──────────
  let replayConcorrente = false;
  try {
    replayConcorrente = await db.runTransaction<boolean>(async (tx) => {
      const fresco = await tx.get(afiliadoRef);
      if (!fresco.exists || fresco.get('status') !== 'convite_pendente') {
        if (
          fresco.exists &&
          fresco.get('status') === 'ativo' &&
          fresco.get('responsavelUid') === uid
        ) {
          return true; // replay concorrente — estado já correto
        }
        throw new https.HttpsError(
          'failed-precondition',
          'Convite deixou de estar pendente durante o aceite (operação ' +
            'concorrente) — estado não foi alterado.'
        );
      }
      tx.update(afiliadoRef, {
        status: 'ativo',
        responsavelUid: uid,
        aceitoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      return false;
    });
  } catch (err) {
    if (contaCriadaNesteRun) {
      await auth.deleteUser(uid).catch(() => undefined);
    }
    throw err;
  }

  logger.info('afiliado_aceite_provisionado', {
    eventoId,
    afiliadoId,
    uid,
    contaCriada: contaCriadaNesteRun,
  });

  return { ok: true, eventoId, afiliadoId, replay: replayConcorrente };
}

// ---------------------------------------------------------------------------
// Rate-limit (REUSO R2 — failures-only, keyed no ALVO real)
// ---------------------------------------------------------------------------

/** Janela por ALVO (o convite REAL) — chave hasheada, sem dado cru. */
export function janelaDoAlvoAfiliado(rawInput: unknown): JanelaRateLimit {
  const input = rawInput as Partial<ProvisionAfiliadoInput> | null;
  const eventoId = typeof input?.eventoId === 'string' ? input.eventoId : '';
  const afiliadoId = typeof input?.afiliadoId === 'string' ? input.afiliadoId : '';
  return {
    chave: `aceite-afiliado:${hashChave(`${eventoId}/${afiliadoId}`)}`,
    limite: ACEITE_LIMITE_POR_ALVO,
    janelaMs: ACEITE_JANELA_MS,
  };
}

/** Núcleo COM rate-limit (testável no emulator; a callable é wrapper fino). */
export async function provisionAfiliadoComRateLimit(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  rawInput: unknown,
  agora: Date = new Date()
): Promise<ProvisionAfiliadoResult> {
  try {
    return await provisionAfiliadoCore(db, auth, rawInput, agora);
  } catch (err) {
    // Só a FALHA de token (permission-denied) conta — mesmo desenho R2:
    // aceite legítimo nunca toca o balde; erro de usuário não pune.
    if (err instanceof https.HttpsError && err.code === 'permission-denied') {
      await consumirRateLimit(db, [janelaDoAlvoAfiliado(rawInput)], agora);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Callable (PÚBLICA — o influenciador ainda não tem conta; token é credencial)
// ---------------------------------------------------------------------------

// PIXREAL-FIX T5 (2026-08-04): BREVO_API_KEY faltava no runWith. O
// selectEmailProvider e fail-closed por contrato (RN-137), entao sem o binding
// esta funcao degradava para 'pendente_chave' em SILENCIO -- a tela confirmava
// a acao e o e-mail nunca saia. Guarda contra reincidencia:
// __tests__/secretsBinding.contract.test.ts
export const provisionAfiliadoAccount = runWith({ secrets: ['BREVO_API_KEY'] }).https.onCall(async (data: unknown) => {
  return provisionAfiliadoComRateLimit(admin.firestore(), admin.auth(), data);
});
