// =============================================================================
// functions/src/platform/provisionTenant.ts
//
// Cloud Function callable: provisiona um tenant de ponta a ponta (RN-403).
//
// Fluxo atômico (aprovar produtor → conta isolada operável):
//   1. Autorização: SÓ platform_admin invoca (RN-401).
//   2. Validação pura do input (@leela/core validateProvisionInput).
//   3. Resolve/cria o usuário owner no Auth (idempotente por e-mail).
//   4. TRANSAÇÃO Firestore: tenants/{slug} (status ativo) + profissionais/
//      {ownerUid} + commercialTerms/current (versao 1) + snapshot v1.
//   5. Custom claims tenant_owner + tenantId (setTenantClaimsAdmin).
//   6. Falha no passo 5 → ROLLBACK COMPENSATÓRIO: desfaz TUDO que este
//      provisionamento criou (docs e usuário Auth) e restaura o estado
//      anterior do tenant quando era aprovação de `pending`. Nunca fica
//      tenant meio-provisionado (RN-403).
//      Fix review Onda1 #1: a falha pode ocorrer APÓS setCustomUserClaims
//      (ex.: revokeRefreshTokens cai) — a claim tenant_owner JÁ está gravada.
//      Para owner PRÉ-existente o rollback RESTAURA as claims anteriores
//      (snapshot capturado antes do passo 5), nunca deixa claim órfã que
//      viraria takeover cross-owner num re-provisionamento do mesmo slug.
//      Prova de ownership no replay é o doc tenants/{slug}.ownerUid no
//      Firestore — claim existente NUNCA é usada como prova.
//      Fix re-review R1: dentro do rollback, claims são neutralizadas ANTES
//      da deleção dos docs — morte parcial deixa no pior caso doc órfão
//      (recuperável por replay), nunca claim órfã (takeover).
//
// Idempotência / retry-safe:
//   - tenantId == slug (deterministico — ver core/platform/provisioning.ts):
//     o retry do mesmo pedido encontra o MESMO doc.
//   - Replay completo (tenant ativo + mesmo owner) → devolve sucesso com
//     `replay: true` e reaplica claims (cobre retry após falha pós-commit).
//   - Aprovação: tenant `pending` existente é promovido a `ativo`
//     (canTransition — RN-402) com owner/termos/claims completados.
//
// Conflitos (nunca sobrescreve silenciosamente):
//   - slug já ativo com OUTRO owner → already-exists.
//   - tenant suspenso → failed-precondition (reative via transitionTenant).
//   - owner já pertencente a OUTRO tenant → failed-precondition (um
//     profissional tem no máximo um tenant na V1).
//   - e-mail de conta com papel CONFLITANTE (athlete / platform_admin /
//     tenant_staff / promoter / tenant_owner de outro tenant) →
//     failed-precondition. Fix review Onda1 #2: o provisionamento NUNCA
//     converte papel de conta existente em tenant_owner silenciosamente
//     (typo de admin ou colisão atleta↔produtor não vira takeover de conta).
//     onda1-decisoes.md é omisso sobre conversão → rejeitar é o default
//     seguro. Conta pré-existente SEM role (ex.: criada pelo fluxo pending)
//     e tenant_owner do MESMO tenant (replay) seguem normalmente.
//     Exceção estreita (fix re-review #8): claim 'athlete' + doc
//     tenants/{slug} provando que o usuário é o owner DESTE tenant ativo =
//     rebaixamento pela corrida do trigger onCreateUser → segue como replay
//     e reaplica as claims corretas (auto-recuperação).
//     Fix review L2 #12: a exceção exige AUSÊNCIA do marcador
//     `demotedFromRole` (gravado por mergeTenantClaims quando o ADMIN
//     rebaixa deliberadamente a athlete). Sem o marcador, a demoção
//     deliberada era byte-idêntica à corrida e QUALQUER provisionTenant
//     futuro do slug re-elevava o owner como "claim repair". Demoção
//     deliberada agora é rejeitada com mensagem própria; re-elevação
//     suportada é via setTenantClaims (que limpa o marcador).
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  buildInitialTerms,
  canTransition,
  validateProvisionInput,
} from '@leela/core';
import type { AuthClaims, ProvisionInput, Role, TenantStatus } from '@leela/core';
import { setTenantClaimsAdmin } from './setTenantClaims';

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

export interface ProvisionResult {
  tenantId: string;
  ownerUid: string;
  /** true quando o pedido já estava integralmente provisionado (retry) */
  replay: boolean;
}

/** O que a transação criou/alterou — insumo do rollback compensatório. */
interface TxOutcome {
  replay: boolean;
  createdTenant: boolean;
  /** Snapshot anterior do tenant quando foi UPDATE (aprovação de pending) */
  previousTenantData: FirebaseFirestore.DocumentData | null;
  createdProfissional: boolean;
  createdTerms: boolean;
}

/** Dependências injetáveis — testes de rollback substituem setClaims. */
export interface ProvisionDeps {
  setClaims: (uid: string, role: Role, tenantId?: string) => Promise<void>;
}

const defaultDeps: ProvisionDeps = { setClaims: setTenantClaimsAdmin };

// ---------------------------------------------------------------------------
// Núcleo (testável com DI; o callable é um wrapper fino)
// ---------------------------------------------------------------------------

/**
 * Provisiona o tenant de ponta a ponta. Ver contrato no cabeçalho do arquivo.
 * Exportado para testes de integração (injeção de falha no passo de claims).
 */
export async function provisionTenantCore(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  rawInput: unknown,
  callerUid: string,
  deps: ProvisionDeps = defaultDeps
): Promise<ProvisionResult> {
  // ── Validação pura do input ────────────────────────────────────────────
  const input = rawInput as ProvisionInput;
  if (!input || typeof input !== 'object') {
    throw new https.HttpsError('invalid-argument', 'Input é obrigatório.');
  }
  const errors = validateProvisionInput(input);
  if (errors.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `ProvisionInput inválido: ${errors.join(' ')}`
    );
  }

  const tenantId = input.slug;

  // ── Resolver/criar owner no Auth (idempotente por e-mail) ──────────────
  let ownerUid: string;
  let ownerCreated = false;
  /**
   * true quando o provisionamento entrou pela exceção athlete+doc (claim
   * repair). A prova doc-proven-owner é lida FORA da transação — o flag
   * exige o RE-CHECK da prova dentro da tx (fix review L2 #29): sem ele,
   * um delete/transição concorrente do tenant entre a guarda e a tx
   * convertia rejeição em promoção athlete→owner sobre prova stale (a tx
   * caía no branch de CRIAÇÃO com o athlete como owner do tenant novo).
   */
  let viaClaimRepair = false;
  /**
   * Claims do owner ANTES deste provisionamento (null = sem claims).
   * Insumo do rollback compensatório (fix review Onda1 #1): se o setClaims
   * falhar DEPOIS de setCustomUserClaims (ex.: revokeRefreshTokens caiu),
   * a claim tenant_owner já foi gravada — o rollback restaura EXATAMENTE
   * este snapshot, nunca deixa claim órfã.
   */
  let previousClaims: object | null = null;
  let existingUser: admin.auth.UserRecord | null = null;
  try {
    existingUser = await auth.getUserByEmail(input.ownerEmail);
  } catch {
    existingUser = null;
  }
  if (existingUser) {
    ownerUid = existingUser.uid;
    previousClaims = existingUser.customClaims ?? null;

    // Guarda de reuso de conta (fix review Onda1 #2): conta pré-existente
    // com papel CONFLITANTE nunca é convertida em tenant_owner no caminho
    // feliz. Rejeitar é o default seguro (onda1-decisoes.md é omisso).
    //   - athlete / platform_admin / tenant_staff / promoter → rejeita;
    //   - tenant_owner de OUTRO tenant → rejeita (1 owner = 1 tenant, V1);
    //   - tenant_owner do MESMO tenant → segue (replay idempotente);
    //   - sem role → segue (conta pré-criada sem papel pode virar owner).
    const claims = (previousClaims ?? {}) as Partial<AuthClaims>;
    const conflictingRole =
      claims.role !== undefined &&
      (claims.role !== 'tenant_owner' || claims.tenantId !== tenantId);
    if (conflictingRole) {
      // Exceção ESTREITA (fix re-review #8): a corrida com o trigger
      // onCreateUser pode ter rebaixado a 'athlete' um owner recém-
      // provisionado (trigger é assíncrono, sem ordem garantida). Ownership
      // é provado pelo DOC tenants/{slug} (status ativo + ownerUid) — nunca
      // pela claim. Se o doc diz que ESTE usuário é o owner DESTE tenant e
      // a claim diz 'athlete' (o ÚNICO valor que a corrida produz), o
      // provisionamento segue: a transação detecta replay e REAPLICA as
      // claims corretas (auto-recuperação — sem isso o retry do admin era
      // rejeitado aqui e a recuperação exigia setTenantClaims manual).
      // Qualquer papel conflitante NÃO-athlete continua rejeitado: rebaixar
      // um platform_admin/staff silenciosamente seria pior que falhar.
      //
      // Fix review L2 #12: athlete com `demotedFromRole` presente é demoção
      // DELIBERADA do admin (mergeTenantClaims grava o marcador; a corrida
      // do trigger nunca o grava) — a exceção NÃO se aplica: re-elevar aqui
      // desfaria silenciosamente uma decisão administrativa. Rejeitar com
      // mensagem própria; o caminho suportado de re-elevação é
      // setTenantClaims (que limpa o marcador).
      const deliberatelyDemoted = claims.demotedFromRole !== undefined;
      let docProvenOwner = false;
      if (claims.role === 'athlete' && !deliberatelyDemoted) {
        const tenantSnap = await db.collection('tenants').doc(tenantId).get();
        docProvenOwner =
          tenantSnap.exists &&
          tenantSnap.get('status') === 'ativo' &&
          tenantSnap.get('ownerUid') === ownerUid;
      }
      if (!docProvenOwner) {
        if (claims.role === 'athlete' && deliberatelyDemoted) {
          throw new https.HttpsError(
            'failed-precondition',
            `E-mail '${input.ownerEmail}' pertence a um owner rebaixado ` +
              `DELIBERADAMENTE pelo admin (demotedFromRole=` +
              `'${claims.demotedFromRole}') — provisionamento não desfaz ` +
              'demoção deliberada. Re-eleve via setTenantClaims ou trate o ' +
              'tenant antes (RN-401).'
          );
        }
        throw new https.HttpsError(
          'failed-precondition',
          `E-mail '${input.ownerEmail}' já pertence a uma conta com papel ` +
            `'${claims.role}'${claims.tenantId ? ` (tenant '${claims.tenantId}')` : ''}` +
            ' — provisionamento não converte papel de conta existente. ' +
            'Use outro e-mail de owner ou trate a conta antes (RN-401).'
        );
      }
      viaClaimRepair = true;
      logger.warn('provision_tenant_claim_repair', {
        tenantId,
        ownerUid,
        staleRole: claims.role,
      });
    }
  } else {
    const created = await auth.createUser({
      email: input.ownerEmail,
      emailVerified: false,
      displayName: input.ownerNome ?? input.nome,
    });
    ownerUid = created.uid;
    ownerCreated = true;
  }

  const tenantRef = db.collection('tenants').doc(tenantId);
  const profRef = db.collection('profissionais').doc(ownerUid);
  const termsCol = tenantRef.collection('commercialTerms');
  const now = admin.firestore.FieldValue.serverTimestamp();

  // ── Transação: docs do tenant (tudo-ou-nada no Firestore) ──────────────
  let outcome: TxOutcome;
  try {
    outcome = await db.runTransaction<TxOutcome>(async (tx) => {
      const [tenantSnap, profSnap, termsSnap] = await Promise.all([
        tx.get(tenantRef),
        tx.get(profRef),
        tx.get(termsCol.doc('current')),
      ]);

      // TOCTOU da exceção athlete+doc (fix review L2 #29): a prova
      // doc-proven-owner foi lida FORA da tx. Se o tenant mudou entre a
      // guarda e a tx (delete/transição concorrente por outro admin), a
      // prova é stale — sem este re-check a tx caía no branch de CRIAÇÃO
      // e promovia o athlete a owner de um tenant NOVO.
      if (viaClaimRepair) {
        const stillProven =
          tenantSnap.exists &&
          (tenantSnap.get('status') as TenantStatus) === 'ativo' &&
          tenantSnap.get('ownerUid') === ownerUid;
        if (!stillProven) {
          throw new https.HttpsError(
            'failed-precondition',
            `Prova de ownership expirou durante o provisionamento: ` +
              `tenants/'${tenantId}' mudou entre a guarda e a transação ` +
              '(operação concorrente de outro admin). Reavalie o estado do ' +
              'tenant e repita a operação (RN-401).'
          );
        }
      }

      // Owner já pertence a OUTRO tenant → conflito (V1: 1 owner = 1 tenant)
      if (profSnap.exists) {
        const profTenant = profSnap.get('tenantId') as string | undefined;
        if (profTenant && profTenant !== tenantId) {
          throw new https.HttpsError(
            'failed-precondition',
            `Owner '${input.ownerEmail}' já pertence ao tenant '${profTenant}'.`
          );
        }
      }

      let createdTenant = false;
      let previousTenantData: FirebaseFirestore.DocumentData | null = null;

      if (tenantSnap.exists) {
        const status = tenantSnap.get('status') as TenantStatus;
        const currentOwner = tenantSnap.get('ownerUid') as string | undefined;

        if (status === 'ativo' && currentOwner === ownerUid) {
          // Replay integral (retry de pedido já concluído) — reaplicar
          // claims fora da tx cobre falha pós-commit do run anterior.
          return {
            replay: true,
            createdTenant: false,
            previousTenantData: null,
            createdProfissional: false,
            createdTerms: false,
          };
        }

        if (status === 'pending') {
          // Aprovação de pedido pending → ativo (RN-402 via canTransition)
          if (!canTransition(status, 'ativo')) {
            throw new https.HttpsError(
              'failed-precondition',
              `Transição inválida: '${status}' → 'ativo' (RN-402).`
            );
          }
          previousTenantData = tenantSnap.data() ?? null;
          tx.update(tenantRef, {
            status: 'ativo' satisfies TenantStatus,
            ownerUid,
            nome: input.nome,
            tipo: input.tipo,
            atualizadoEm: now,
            atualizadoPor: callerUid,
          });
        } else if (status === 'suspenso') {
          throw new https.HttpsError(
            'failed-precondition',
            `Tenant '${tenantId}' está suspenso — reative via transitionTenant (RN-402).`
          );
        } else {
          // ativo com outro owner → slug em uso
          throw new https.HttpsError(
            'already-exists',
            `Slug '${tenantId}' já está em uso por outro tenant ativo.`
          );
        }
      } else {
        // Criação do zero — tenant nasce ATIVO (aprovação implícita, RN-402)
        createdTenant = true;
        tx.set(tenantRef, {
          id: tenantId,
          nome: input.nome,
          slug: input.slug,
          status: 'ativo' satisfies TenantStatus,
          ownerUid,
          tipo: input.tipo,
          gmvAcumulado: 0,
          eventosAtivos: 0,
          criadoEm: now,
          atualizadoEm: now,
          atualizadoPor: callerUid,
        });
      }

      // Profissional owner (cria só se não existe — preserva perfil prévio)
      let createdProfissional = false;
      if (!profSnap.exists) {
        createdProfissional = true;
        tx.set(profRef, {
          id: ownerUid,
          tenantId,
          nome: input.ownerNome ?? input.nome,
          email: input.ownerEmail,
          papeis: ['organizador'],
          criadoEm: now,
          atualizadoEm: now,
        });
      }

      // Termos iniciais (versao 1 + snapshot imutável v1) — só se ausentes
      let createdTerms = false;
      if (!termsSnap.exists) {
        createdTerms = true;
        const termsPayload = {
          ...buildInitialTerms(input),
          versao: 1,
          atualizadoPor: callerUid,
          atualizadoEm: now,
        };
        tx.set(termsCol.doc('current'), termsPayload);
        tx.set(termsCol.doc('v1'), termsPayload);
      }

      return {
        replay: false,
        createdTenant,
        previousTenantData,
        createdProfissional,
        createdTerms,
      };
    });
  } catch (err) {
    // Transação falhou → nada foi gravado no Firestore; desfazer só o Auth.
    if (ownerCreated) {
      await auth.deleteUser(ownerUid).catch(() => undefined);
    }
    throw err;
  }

  // ── Claims (RN-401) + rollback compensatório em falha (RN-403) ─────────
  try {
    await deps.setClaims(ownerUid, 'tenant_owner', tenantId);
  } catch (claimErr) {
    await rollbackProvisioning(db, auth, {
      tenantRef,
      profRef,
      termsCol,
      outcome,
      ownerUid,
      ownerCreated,
      previousClaims,
    });
    logger.error('provision_tenant_rollback', {
      tenantId,
      ownerUid,
      reason: claimErr instanceof Error ? claimErr.message : String(claimErr),
    });
    throw new https.HttpsError(
      'internal',
      'Falha ao aplicar claims do owner — provisionamento revertido (RN-403).'
    );
  }

  logger.info('provision_tenant', {
    callerUid,
    tenantId,
    ownerUid,
    replay: outcome.replay,
  });

  return { tenantId, ownerUid, replay: outcome.replay };
}

/**
 * Rollback compensatório: apaga o que ESTE provisionamento criou e restaura
 * o snapshot anterior do tenant quando a operação era aprovação de pending.
 * Nunca toca em docs pré-existentes que não foram alterados.
 *
 * Claims (fix review Onda1 #1): a falha de setClaims pode ter acontecido
 * DEPOIS de setCustomUserClaims (revoke caiu / processo morreu no meio) —
 * a claim tenant_owner já estaria gravada. Para owner criado AQUI, o
 * deleteUser leva a claim junto; para owner PRÉ-existente, restauramos o
 * snapshot anterior das claims (não apenas delete) + revoke dos refresh
 * tokens. Sem isso, re-provisionar o mesmo slug para OUTRO owner daria ao
 * usuário da falha acesso de writer ao tenant novo (takeover cross-owner).
 *
 * ORDEM (fix re-review R1): claims Auth PRIMEIRO, docs Firestore depois.
 * Se o processo morrer entre os dois passos, o resíduo deve ser o inócuo:
 * doc órfão é recuperável — o retry do admin conclui como replay; claim
 * órfã é exatamente o takeover cross-owner do achado #1, e morte de
 * processo não deixa log (o alarme abaixo só cobre restore que LANÇA).
 * Por isso o owner criado neste run tem as claims LIMPAS já no passo 1
 * (o deleteUser, que também as levaria, só roda depois dos docs).
 */
async function rollbackProvisioning(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  ctx: {
    tenantRef: FirebaseFirestore.DocumentReference;
    profRef: FirebaseFirestore.DocumentReference;
    termsCol: FirebaseFirestore.CollectionReference;
    outcome: TxOutcome;
    ownerUid: string;
    ownerCreated: boolean;
    /** Claims do owner ANTES do provisionamento (null = sem claims). */
    previousClaims: object | null;
  }
): Promise<void> {
  const { tenantRef, profRef, termsCol, outcome, ownerUid, ownerCreated, previousClaims } = ctx;

  // ── 1. Claims Auth PRIMEIRO (fix re-review R1 — ordem importa) ──────────
  if (ownerCreated) {
    // Owner criado NESTE run: neutraliza as claims antes de tocar nos docs.
    // Morte após este passo deixa conta sem role + docs órfãos — estado que
    // o retry do admin conclui como replay (nunca claim stale).
    try {
      await auth.setCustomUserClaims(ownerUid, null);
    } catch (clearErr) {
      logger.error('provision_tenant_rollback_claims_clear_failed', {
        ownerUid,
        reason: clearErr instanceof Error ? clearErr.message : String(clearErr),
      });
    }
  } else {
    // Owner pré-existente: restaura o estado ANTERIOR das claims e revoga
    // refresh tokens (mata tokens eventualmente cunhados com a claim stale).
    try {
      await auth.setCustomUserClaims(ownerUid, previousClaims);
      await auth.revokeRefreshTokens(ownerUid);
    } catch (restoreErr) {
      // Falha aqui é ALARME (claim possivelmente órfã) — nunca engolir:
      // log estruturado de erro para runbook/observabilidade.
      logger.error('provision_tenant_rollback_claims_restore_failed', {
        ownerUid,
        reason:
          restoreErr instanceof Error ? restoreErr.message : String(restoreErr),
      });
    }
  }

  // ── 2. Docs Firestore ────────────────────────────────────────────────────
  const batch = db.batch();

  if (outcome.createdTenant) {
    batch.delete(tenantRef);
  } else if (outcome.previousTenantData) {
    // Aprovação de pending → restaura o doc exatamente como estava
    batch.set(tenantRef, outcome.previousTenantData);
  }
  if (outcome.createdProfissional) batch.delete(profRef);
  if (outcome.createdTerms) {
    batch.delete(termsCol.doc('current'));
    batch.delete(termsCol.doc('v1'));
  }
  await batch.commit();

  // ── 3. Usuário Auth criado neste run (claims já foram limpas no passo 1) ─
  if (ownerCreated) {
    await auth.deleteUser(ownerUid).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/**
 * `provisionTenant` — callable exposta ao back-office (L2).
 * Autorização: SÓ platform_admin (RN-401/403).
 */
export const provisionTenant = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }

  const callerClaims = context.auth.token as unknown as AuthClaims;
  if (callerClaims.role !== 'platform_admin') {
    throw new https.HttpsError(
      'permission-denied',
      'Apenas platform_admin provisiona tenants.'
    );
  }

  return provisionTenantCore(
    admin.firestore(),
    admin.auth(),
    data,
    context.auth.uid
  );
});
