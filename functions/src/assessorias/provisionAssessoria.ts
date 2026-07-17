// =============================================================================
// functions/src/assessorias/provisionAssessoria.ts
//
// Cloud Function callable PÚBLICA: aceite do convite de assessoria parceira
// (LEELA-E18 · S1801-T3 · RN-363).
//
// Contrato (página de aceite da landing — S1801-T2):
//   provisionAssessoriaAccount({ tenantId, parceriaId, token, senha, nome? })
//     -> { ok: true, clubeId, replay }
//
// FLUXO ATÔMICO/IDEMPOTENTE (o único risco real do épico — spec S1801):
//   1. Localiza parceria (`tenants/{t}/parceirosAssessoria/{id}`) e o convite
//      (`clubes/{clubeRef}/convites/{emailKey}`, origem='assessoria_parceira').
//   2. TOKEN é a credencial (Schneier): SHA-256 do input comparado em TEMPO
//      CONSTANTE com o hash persistido — SEM token válido, NENHUMA informação
//      além de 'permission-denied' (não vaza existência/estado do convite).
//      Só APÓS o token validar é que estado/expiração são reportados.
//   3. Convite expirado (expiraEm <= agora) → failed-precondition
//      'convite_expirado' (a landing mostra o estado + caminho de reenvio).
//   4. Conta Auth por e-mail: cria QUANDO NÃO EXISTE (senha do aceite);
//      quando JÁ EXISTE, VINCULA sem tocar credenciais — o token de convite
//      NUNCA troca senha de conta existente (seria takeover por link).
//      Papel: o default 'athlete' nasce do trigger onCreateUser (premissa
//      registrada: papel restrito; superfície de painel do responsável é
//      story futura — nenhuma claim de tenant é concedida aqui).
//   5. TRANSAÇÃO: re-lê parceria+convite FRESCOS (anti-TOCTOU — revogação
//      concorrente pelo organizador NÃO é atropelada) e grava: parceria →
//      'ativa' + responsavelUid + aceitoEm; clube.ownerId → responsável
//      (fecha a ownership provisória do cadastro); convite → 'aceito'.
//   6. IDEMPOTENTE: reexecutar o aceite (parceria já 'ativa' com o MESMO
//      responsável) devolve replay=true — não cria segunda conta, não cria
//      segundo clube, não regrava carimbos (aceite do épico).
//   7. COMPENSAÇÃO: conta criada NESTE run + transação falhou → deleteUser
//      (nunca fica conta órfã sem vínculo; retry recomeça limpo).
//
// PII/LGPD: logs sem e-mail/documento (só tenantId/clubeId/uid).
// =============================================================================

import * as admin from 'firebase-admin';
import { createHash, timingSafeEqual } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { COLECAO_PARCEIROS_ASSESSORIA } from '@leela/core';
import {
  ORIGEM_CONVITE_ASSESSORIA,
} from './cadastrarAssessoria';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface ProvisionAssessoriaInput {
  tenantId: string;
  /** docId da parceria (= documento normalizado — veio no link) */
  parceriaId: string;
  /** Token de aceite do link (o doc guarda só o hash) */
  token: string;
  /** Senha da conta NOVA (ignorada quando a conta já existe) */
  senha?: string;
  /** Nome de exibição do responsável (fallback: nome da assessoria) */
  nome?: string;
}

export interface ProvisionAssessoriaResult {
  ok: true;
  clubeId: string;
  /** true = aceite já estava integralmente provisionado (retry) */
  replay: boolean;
}

/** Senha mínima da conta nova (premissa — acima do mínimo 6 do Firebase). */
export const SENHA_MIN = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

export async function provisionAssessoriaCore(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  rawInput: unknown,
  agora: Date = new Date()
): Promise<ProvisionAssessoriaResult> {
  const input = rawInput as Partial<ProvisionAssessoriaInput> | null;
  const tenantId = typeof input?.tenantId === 'string' ? input.tenantId : '';
  const parceriaId = typeof input?.parceriaId === 'string' ? input.parceriaId : '';
  const token = typeof input?.token === 'string' ? input.token : '';
  if (tenantId.length === 0 || parceriaId.length === 0 || token.length === 0) {
    throw new https.HttpsError(
      'invalid-argument',
      'tenantId, parceriaId e token são obrigatórios.'
    );
  }

  const parceriaRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection(COLECAO_PARCEIROS_ASSESSORIA)
    .doc(parceriaId);
  const parceriaSnap = await parceriaRef.get();

  // Fail-closed OPACO até o token validar: convite inexistente, parceria
  // inexistente e token errado são INDISTINGUÍVEIS para quem não tem o link
  // (não vaza se um documento está cadastrado — chamada é pública).
  const NEGADO = new https.HttpsError(
    'permission-denied',
    'Convite inválido.'
  );
  if (!parceriaSnap.exists) throw NEGADO;

  const clubeId = (parceriaSnap.get('clubeRef') ?? '') as string;
  const emailKey = (parceriaSnap.get('responsavelEmail') ?? '') as string;
  if (clubeId.length === 0 || emailKey.length === 0) throw NEGADO;

  const clubeRef = db.collection('clubes').doc(clubeId);
  const conviteRef = clubeRef.collection('convites').doc(emailKey);
  const conviteSnap = await conviteRef.get();
  if (!conviteSnap.exists) throw NEGADO;
  if (conviteSnap.get('origem') !== ORIGEM_CONVITE_ASSESSORIA) throw NEGADO;
  if (conviteSnap.get('parceriaRef') !== parceriaRef.path) throw NEGADO;
  if (!tokenConfere(token, conviteSnap.get('tokenAceiteHash'))) {
    // Log de tentativa inválida (detecção de brute-force) — sem PII.
    logger.warn('assessoria_aceite_token_invalido', { tenantId, clubeId });
    throw NEGADO;
  }

  // ── Token validado — estados agora podem ser honestos ────────────────────
  const statusParceria = parceriaSnap.get('status') as string;

  // Conta do responsável (idempotente por e-mail — RN-363)
  let uid: string;
  let contaCriadaNesteRun = false;
  let contaExiste = true;
  try {
    uid = (await auth.getUserByEmail(emailKey)).uid;
  } catch {
    contaExiste = false;
    uid = '';
  }

  // Replay integral: parceria ativa com o MESMO responsável já provisionado.
  if (statusParceria === 'ativa') {
    const uidAtual = (parceriaSnap.get('responsavelUid') ?? '') as string;
    if (contaExiste && uidAtual === uid) {
      logger.info('assessoria_aceite_replay', { tenantId, clubeId, uid });
      return { ok: true, clubeId, replay: true };
    }
    // Ativa mas com outro vínculo — estado que o aceite não resolve.
    throw new https.HttpsError(
      'failed-precondition',
      'Parceria já está ativa — nada a aceitar.'
    );
  }
  if (statusParceria !== 'convite_pendente') {
    throw new https.HttpsError(
      'failed-precondition',
      'Parceria não está aguardando aceite (convite cancelado ou encerrado).'
    );
  }

  // Expiração (RN da story: expirado → estado + caminho de reenvio)
  const expiraEm = conviteSnap.get('expiraEm') as
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

  // Conta NOVA exige senha; conta EXISTENTE nunca tem credencial tocada
  // (token de convite não é prova de posse da conta — anti-takeover).
  if (!contaExiste) {
    const senha = typeof input?.senha === 'string' ? input.senha : '';
    if (senha.length < SENHA_MIN) {
      throw new https.HttpsError(
        'invalid-argument',
        `Senha é obrigatória para criar a conta (mínimo ${SENHA_MIN} caracteres).`
      );
    }
    const displayName =
      typeof input?.nome === 'string' && input.nome.trim().length > 0
        ? input.nome.trim()
        : ((parceriaSnap.get('nome') ?? emailKey) as string);
    const created = await auth.createUser({
      email: emailKey,
      password: senha,
      emailVerified: false,
      displayName,
    });
    uid = created.uid;
    contaCriadaNesteRun = true;
    // Papel: default 'athlete' nasce do trigger onCreateUser (premissa —
    // nenhuma claim de tenant é concedida pelo aceite).
  }

  // ── Transação: ativa parceria + fecha ownership + carimba convite ────────
  try {
    await db.runTransaction(async (tx) => {
      const [pFresco, cFresco, clubeFresco] = await Promise.all([
        tx.get(parceriaRef),
        tx.get(conviteRef),
        tx.get(clubeRef),
      ]);

      // Anti-TOCTOU: revogação/encerramento concorrente vence — o aceite
      // NUNCA ressuscita parceria que deixou de estar pendente.
      if (!pFresco.exists || pFresco.get('status') !== 'convite_pendente') {
        throw new https.HttpsError(
          'failed-precondition',
          'Parceria deixou de estar pendente durante o aceite (operação ' +
            'concorrente) — estado não foi alterado.'
        );
      }
      if (!cFresco.exists || cFresco.get('status') !== 'pendente') {
        throw new https.HttpsError(
          'failed-precondition',
          'Convite deixou de estar pendente durante o aceite.'
        );
      }
      if (!clubeFresco.exists) {
        throw new https.HttpsError(
          'internal',
          'Clube parceiro ausente — estado incoerente (RN-360).'
        );
      }

      const now = FieldValue.serverTimestamp();
      tx.update(parceriaRef, {
        status: 'ativa',
        responsavelUid: uid,
        aceitoEm: now,
        atualizadoEm: now,
      });
      // Ownership provisória (cadastro) → responsável (RN-363)
      tx.update(clubeRef, { ownerId: uid, atualizadoEm: now });
      tx.update(conviteRef, { status: 'aceito', aceitoEm: now });
    });
  } catch (err) {
    // Compensação: conta criada NESTE run sem vínculo efetivado → remove
    // (retry recomeça limpo; conta pré-existente NUNCA é tocada).
    if (contaCriadaNesteRun) {
      await auth.deleteUser(uid).catch(() => undefined);
    }
    throw err;
  }

  logger.info('assessoria_aceite_provisionado', {
    tenantId,
    clubeId,
    uid,
    contaCriada: contaCriadaNesteRun,
  });

  return { ok: true, clubeId, replay: false };
}

// ---------------------------------------------------------------------------
// Callable (PÚBLICA — o responsável ainda não tem conta; token é a credencial)
// ---------------------------------------------------------------------------

export const provisionAssessoriaAccount = https.onCall(
  async (data: unknown) => {
    return provisionAssessoriaCore(admin.firestore(), admin.auth(), data);
  }
);
