// =============================================================================
// functions/src/clubs/enviarConvites.ts
//
// Envio de convites por email (LEELA-E05 · contrato do modal S104-T1).
//
// Contrato: `enviarConvites({ clubeId, emails[] }) -> { enviados, total }`.
//
// RN-106 — 1 a 50 emails por envio; validação REAL no servidor via
// `validarConvite` (@leela/core — a mesma pura que o modal usa como UX).
//
// Persistência: `clubes/{clubeId}/convites/{emailKey}` (docId = email em
// minúsculas — email não contém '/'). Reenviar para o mesmo email é
// idempotente: regrava `enviadoEm` (reenvio), preserva `criadoEm`.
// O disparo físico do email é integração futura (fora do escopo da story) —
// esta rotina é a máquina de estados auditável do convite.
//
// Rules: a subcoleção `convites` cai no catch-all de `clubes/{clubeId}`
// (leitura tenant-only; escrita de cliente NEGADA) — só esta Function grava.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import type { AuthClaims } from '@leela/core';
import { validarConvite } from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
} from '../eventos/criarEvento';
import { assertClubeDoTenant, type ClubsCaller } from './membrosMutations';

// ---------------------------------------------------------------------------
// Contratos (espelhados em packages/api-client/src/clubs.ts)
// ---------------------------------------------------------------------------

export interface EnviarConvitesInput {
  clubeId: string;
  /** 1..50 emails (RN-106) — o servidor revalida e deduplica */
  emails: string[];
}

export interface EnviarConvitesResult {
  /** Convites efetivamente gravados (após dedupe case-insensitive) */
  enviados: number;
  /** Total de emails recebidos no input */
  total: number;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function enviarConvitesCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: ClubsCaller
): Promise<EnviarConvitesResult> {
  const tenantId = assertTenantWriter(caller.claims);

  const input = rawInput as Partial<EnviarConvitesInput> | null | undefined;
  if (
    !input ||
    typeof input.clubeId !== 'string' ||
    input.clubeId.length === 0 ||
    !Array.isArray(input.emails) ||
    input.emails.some((e) => typeof e !== 'string')
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      'Input inválido: clubeId e emails[] são obrigatórios.'
    );
  }

  // RN-106 — mesma validação pura do modal, agora como fronteira de segurança
  const resultado = validarConvite(input.emails);
  if (!resultado.valido) {
    throw new https.HttpsError(
      'invalid-argument',
      `Convite inválido (RN-106): ${resultado.erros.join(' ')}`
    );
  }

  await assertTenantAtivo(db, tenantId);
  const clubeRef = await assertClubeDoTenant(db, input.clubeId, tenantId);

  // Dedupe case-insensitive preservando a 1ª ocorrência (mesma regra do modal)
  const vistos = new Set<string>();
  const unicos: string[] = [];
  for (const email of input.emails) {
    const chave = email.trim().toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    unicos.push(chave);
  }

  const now = FieldValue.serverTimestamp();
  const convitesRef = clubeRef.collection('convites');

  // ≤ 50 docs (RN-106) — loop de get+set é aceitável e preserva criadoEm
  for (const email of unicos) {
    const ref = convitesRef.doc(email);
    const snap = await ref.get();
    const data: Record<string, unknown> = {
      email,
      tenantId,
      status: 'pendente',
      convidadoPor: caller.uid,
      enviadoEm: now,
    };
    if (!snap.exists) data['criadoEm'] = now;
    await ref.set(data, { merge: true });
  }

  return { enviados: unicos.length, total: resultado.total };
}

// ---------------------------------------------------------------------------
// Callable (wrapper fino — padrão criarEvento)
// ---------------------------------------------------------------------------

export const enviarConvites = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return enviarConvitesCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
