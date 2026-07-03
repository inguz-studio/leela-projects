// =============================================================================
// functions/src/auth/onCreateUser.ts
//
// Trigger: executa no primeiro login de qualquer usuário (Firebase Auth).
//
// Responsabilidades:
//   1. Cria o doc do usuário no Firestore (atletas/{uid} por default).
//   2. Seta o custom claim `role` com o valor default `athlete`.
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

  // ── 1. Criar doc do atleta ──────────────────────────────────────────────
  // Por default, todo novo usuário vira `atleta`.
  // Profissionais são promovidos via setTenantClaims (S1600-T2).
  //
  // Retry-safe (achado M5, review E00): triggers do Cloud Functions têm
  // entrega at-least-once. `create()` falha com ALREADY_EXISTS na segunda
  // entrega — capturamos e seguimos sem regravar `criadoEm`.
  const atletaRef = db.collection('atletas').doc(uid);

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

  // ── 2. Setar custom claim `role` ────────────────────────────────────────
  // O claim é lido pelas Security Rules e pela lógica de autorização dos apps.
  // tenantId é adicionado pelo setTenantClaims quando o profissional é vinculado
  // a um tenant; atletas não carregam tenantId (cross-tenant por design).
  await admin.auth().setCustomUserClaims(uid, {
    role: DEFAULT_ROLE,
  });

  // Log estruturado — visível no Cloud Logging e no Emulator UI
  logger.info('user_created', { uid, role: DEFAULT_ROLE, email });
});
