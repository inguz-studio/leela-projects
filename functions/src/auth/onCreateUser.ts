// =============================================================================
// functions/src/auth/onCreateUser.ts
//
// Trigger: executa no primeiro login de qualquer usuário (Firebase Auth).
//
// Responsabilidades:
//   1. Decide o papel ANTES de tocar no Firestore (fix review Onda1-L2 #28):
//      papéis profissionais existentes não ganham doc atletas/{uid}.
//   2. Cria o doc do usuário no Firestore (atletas/{uid}) só para usuários
//      athlete-bound (sem role ou já athlete).
//   3. Seta o custom claim `role` com o valor default `athlete` — SÓ quando
//      o usuário ainda não tem role (fix re-review #8: o trigger nunca
//      sobrescreve role existente).
//   4. Verificação pós-escrita (fix review Onda1-L2 #11): se o papel final
//      observado é 'athlete' mas o doc tenants/{slug} prova que o usuário é
//      owner de tenant ATIVO, o trigger perdeu a corrida com o provisionamento
//      e REPARA as claims (tenant_owner + tenantId) com log WARN distinguível.
//
// Papéis possíveis (ADR-009):
//   platform_admin | tenant_owner | tenant_staff | promoter | athlete
//
// O papel default é `athlete` — elevação de papel é feita server-side via
// setTenantClaims (task LEELA-S1600-T2) pelo platform_admin.
//
// IMPORTANTE: o token ID do usuário SÓ carrega o novo claim após refresh.
// O cliente deve chamar user.getIdTokenResult(forceRefresh: true) após
// ações que mudam o papel, ou aguardar o próximo login.
// =============================================================================

import * as admin from 'firebase-admin';
import { auth } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import type { RolePlataforma } from '@leela/core';

const DEFAULT_ROLE: RolePlataforma = 'athlete';

/**
 * Trigger executado na criação de cada usuário no Firebase Auth.
 * Usa Admin SDK — acesso privilegiado sem passar por Security Rules.
 */
export const onCreateUser = auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  const { uid, email, displayName } = user;

  // Derivar iniciais do nome para avatar fallback
  const avatarInit = displayName
    ? displayName
        .split(' ')
        .slice(0, 2)
        .map((part) => {
          const first = part[0];
          return first !== undefined ? first.toUpperCase() : '';
        })
        .join('')
    : (email?.[0]?.toUpperCase() ?? '?');

  const atletaRef = db.collection('atletas').doc(uid);

  // Corrida 3 vias rollback × trigger (fix review Onda1-L2 #27): o rollback
  // do provisionTenant pode DELETAR o usuário no meio deste trigger —
  // getUser/setCustomUserClaims lançam USER_NOT_FOUND. Sem tratamento:
  // 1 erro logado por ocorrência (sem failurePolicy = sem retry) +
  // atletas/{uid} órfão PERMANENTE. Usuário inexistente não tem claims a
  // setar: warn distinguível, limpa o doc (best-effort) e encerra limpo.
  try {
    // ── 1. Decidir o papel ANTES de criar doc (fix review Onda1-L2 #28) ───
    // O create incondicional dava doc atletas/{uid} a TODO owner provisionado
    // (poluição para E13/segmentação). Papel profissional já presente →
    // nenhum doc de atleta.
    //
    // CORRIDA com provisionTenant (fix re-review #8): triggers Auth têm
    // entrega assíncrona at-least-once SEM ordem garantida com o fluxo
    // chamador. O owner que provisionTenant cria via auth.createUser()
    // dispara ESTE trigger; se o trigger executar DEPOIS de
    // setTenantClaimsAdmin, gravar {role:'athlete'} incondicional rebaixava
    // o owner recém-provisionado. Por isso RE-LEMOS as claims atuais via
    // getUser — o payload `user` é snapshot da criação e nunca carrega
    // claims setadas depois dele.
    //
    // Janela residual do #28: trigger executando INTEIRO antes da escrita de
    // claims do provisionamento não vê role → cria o doc e o provisionamento
    // vence a corrida sem clobber → o doc fica. Inócuo (sem writer/leitor de
    // produção hoje); os demais caminhos são cobertos pelo skip abaixo e
    // pela limpeza no reparo do #11.
    const fresh = await admin.auth().getUser(uid);
    const currentClaims = (fresh.customClaims ?? {}) as Record<string, unknown>;
    const existingRole = currentClaims['role'];

    if (existingRole !== undefined && existingRole !== 'athlete') {
      // Elevação já aconteceu (ex.: provisionTenant venceu a corrida) — o
      // default NUNCA sobrescreve e profissional não ganha doc de atleta.
      logger.info('user_role_preserved', { uid, role: existingRole, email });
      return;
    }

    // ── 2. Criar doc do atleta (usuário athlete-bound) ────────────────────
    // Retry-safe (achado M5, review E00): triggers do Cloud Functions têm
    // entrega at-least-once. `create()` falha com ALREADY_EXISTS na segunda
    // entrega — capturamos e seguimos sem regravar `criadoEm`.
    try {
      await atletaRef.create({
        id: uid,
        nome: displayName ?? email ?? uid,
        email: email ?? '',
        avatarInit,
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      // gRPC code 6 = ALREADY_EXISTS — retry do trigger; doc já criado.
      if ((err as { code?: number }).code === 6) {
        logger.info('user_doc_already_exists', { uid });
      } else {
        throw err;
      }
    }

    // ── 3. Setar custom claim `role` default ──────────────────────────────
    // O claim é lido pelas Security Rules e pela lógica de autorização dos
    // apps. tenantId é adicionado pelo setTenantClaims quando o profissional
    // é vinculado a um tenant; atletas não carregam tenantId (cross-tenant
    // por design). Sem role → default 'athlete' por MERGE (claims não
    // relacionadas preservadas — mesma disciplina do fix R3).
    if (existingRole === undefined) {
      await admin.auth().setCustomUserClaims(uid, {
        ...currentClaims,
        role: DEFAULT_ROLE,
      });

      // Log estruturado — visível no Cloud Logging e no Emulator UI
      logger.info('user_created', { uid, role: DEFAULT_ROLE, email });
    } else {
      // Redelivery em usuário já athlete — claims intocadas. NÃO retornamos:
      // a verificação pós-escrita abaixo precisa rodar também aqui, senão um
      // crash entre a escrita do default e o check deixaria a demoção da
      // corrida permanente (a redelivery at-least-once é quem cura).
      logger.info('user_role_preserved', { uid, role: existingRole, email });
    }

    // ── 4. Verificação pós-escrita (fix review Onda1-L2 #11) ──────────────
    // A releitura do passo 1 fecha a corrida "provisionamento ANTES do
    // trigger", mas resta a janela getUser→setCustomUserClaims: se a escrita
    // do provisionamento cair NO MEIO, o default 'athlete' clobbera a claim
    // tenant_owner com provisionTenant JÁ retornado SUCESSO — lockout
    // silencioso, recuperação só manual. Quando a escrita do trigger é a
    // última, a transação do provisionamento (que grava tenants/{slug} ANTES
    // das claims) já commitou — o doc é o sinal confiável para detectar e
    // REPARAR aqui, espelhando a exceção doc-proven-owner do hotfix #8.
    await repairIfDemotedOwner(db, uid, atletaRef);
  } catch (err) {
    if (!isUserNotFound(err)) {
      throw err; // semântica atual preservada para qualquer outra falha
    }
    logger.warn('user_created_user_missing', { uid, email });
    // Best-effort: remove o doc deste run (ou órfão de entrega anterior).
    await atletaRef.delete().catch(() => undefined);
  }
});

/** Erro do Admin SDK Auth para usuário deletado (rollback venceu a corrida). */
function isUserNotFound(err: unknown): boolean {
  return (err as { code?: unknown }).code === 'auth/user-not-found';
}

/**
 * Auto-reparo da corrida trigger × provisionamento (achado #11):
 * papel final 'athlete' + doc tenants/{slug} com ownerUid == uid e status
 * 'ativo' = owner rebaixado pela janela do trigger → reaplica tenant_owner
 * + tenantId por MERGE e loga WARN distinguível (user_created_race_repaired).
 * O doc atletas/{uid} criado neste run é removido (owner não é atleta —
 * complemento do fix #28).
 *
 * NUNCA re-eleva demoção DELIBERADA: o marcador `demotedFromRole` (gravado
 * pela superfície admin em setTenantClaims — fix #12) prova intenção; o
 * trigger jamais o escreve, então athlete + marcador ≠ artefato da corrida.
 *
 * Query por igualdade única (ownerUid) — servida por índice single-field;
 * V1 garante 1 owner = 1 tenant. `status` é checado em código.
 */
async function repairIfDemotedOwner(
  db: admin.firestore.Firestore,
  uid: string,
  atletaRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  const owned = await db
    .collection('tenants')
    .where('ownerUid', '==', uid)
    .limit(1)
    .get();
  if (owned.empty) return; // atleta legítimo — caminho quente, 1 read

  const tenantDoc = owned.docs[0];
  if (tenantDoc === undefined || tenantDoc.get('status') !== 'ativo') return;

  // RE-LER claims frescas: se o provisionamento escreveu DEPOIS do default
  // do trigger, o papel já é tenant_owner e não há nada a reparar.
  const fresh = await admin.auth().getUser(uid);
  const claims = (fresh.customClaims ?? {}) as Record<string, unknown>;
  if (claims['role'] !== 'athlete') return;

  if (claims['demotedFromRole'] !== undefined) {
    // Demoção deliberada pelo admin (fix #12) — estado athlete é intencional.
    logger.info('user_created_demotion_preserved', {
      uid,
      tenantId: tenantDoc.id,
      demotedFromRole: claims['demotedFromRole'],
    });
    return;
  }

  await admin.auth().setCustomUserClaims(uid, {
    ...claims,
    role: 'tenant_owner',
    tenantId: tenantDoc.id,
  });
  logger.warn('user_created_race_repaired', {
    uid,
    tenantId: tenantDoc.id,
    staleRole: 'athlete',
  });

  // Owner reparado não é atleta — remove a poluição criada neste run (#28).
  await atletaRef.delete().catch(() => undefined);
}
