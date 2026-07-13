// =============================================================================
// functions/src/eventos/setClaimsEquipe.ts
//
// Cloud Function callable: atribui/troca/revoga o PAPEL de um membro na
// equipe de um evento (RN-320 · LEELA-S304-T1 · E04-L4), refletindo em
// custom claims `{ eventos: { [eventoId]: papel } }` (ADR-008).
//
// MERGE PRESERVADOR (padrão OBRIGATÓRIO herdado de `mergeTenantClaims` —
// functions/src/platform/setTenantClaims.ts): as claims são lidas do usuário
// e mescladas — NUNCA `setCustomUserClaims` com objeto cru. Este merge:
//   - preserva `role`/`tenantId`/`demotedFromRole` (claims de tenant, S1600);
//   - preserva papéis de OUTROS eventos dentro de `eventos`;
//   - na remoção, revoga SÓ a chave do evento; mapa vazio some inteiro
//     (token não carrega `eventos: {}` residual).
//
// AUTORIZAÇÃO (nunca confia no cliente):
//   - caller precisa ser platform_admin, OU writer do tenant dono do evento
//     (tenant_owner/tenant_staff), OU membro do evento com papel
//     organizador/administrador (claims — RN-401);
//   - ESCALADA BLOQUEADA (`podeGerirPapelEquipe`, puro e testado):
//       · conceder papel 'organizador' é EXCLUSIVO de platform_admin,
//         tenant_owner ou organizador atual (administrador/staff NÃO);
//       · mudar/remover quem JÁ é organizador idem;
//       · caller nunca gere o PRÓPRIO papel (auto-promoção) — exceto
//         platform_admin.
//
// PROPAGAÇÃO DE TOKEN (RN-401 — janela documentada):
//   `setCustomUserClaims` NÃO invalida o token ID vigente; ele vale até
//   expirar (~1h). Mitigação em DUAS camadas:
//     1. `revokeRefreshTokens(uid)` — o próximo refresh já vem sem/with o
//        papel novo; cliente deve chamar getIdTokenResult(true);
//     2. ÂNCORA NO DOC (fecha a janela nas Rules): toda concessão papel-based
//        das Rules confere `equipe/{uid}.status == 'ativo'` E
//        `equipe/{uid}.papel == claim` via get() — o doc é atualizado AQUI,
//        na MESMA operação; membro removido com token velho é negado
//        imediatamente, sem esperar a expiração.
//
// SINCRONIA DOC↔CLAIMS: o doc `eventos/{eventoId}/equipe/{uid}` (docId = uid,
// convenção da âncora) é upsertado na concessão (status 'ativo') e marcado
// 'removido' na revogação — sempre DEPOIS das claims, para que a âncora nunca
// autorize mais do que o token.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  isPapelEvento,
  papelNoEvento,
  type AuthClaims,
  type PapelEvento,
} from '@leela/core';
import type { EventoCaller } from './criarEvento';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface SetClaimsEquipeInput {
  /** Evento alvo (docId de `eventos`). */
  eventoId: string;
  /** uid Firebase Auth do MEMBRO alvo (nunca o doc — claims são por uid). */
  uid: string;
  /**
   * Papel a atribuir/trocar (RN-320) — `null` REVOGA o papel do evento
   * (remoção de membro). Ausente equivale a null.
   */
  papel?: PapelEvento | null;
  /** Nome de exibição p/ o doc quando o membro ainda não tem doc (opcional). */
  nome?: string;
}

export interface SetClaimsEquipeResult {
  success: true;
  eventoId: string;
  uid: string;
  /** Papel vigente após a operação (null = revogado). */
  papel: PapelEvento | null;
}

// ---------------------------------------------------------------------------
// Merge preservador (puro — exportado para teste unitário direto)
// ---------------------------------------------------------------------------

/**
 * Mescla o papel de UM evento nas claims atuais SEM destruir nada alheio:
 * `role`, `tenantId`, `demotedFromRole` e papéis de outros eventos atravessam
 * intactos (padrão `mergeTenantClaims` — nunca `set` cru). `papel: null`
 * remove SÓ a chave do evento; se o mapa `eventos` esvaziar, a chave some
 * inteira (nenhum resíduo `eventos: {}` no token). @pure
 */
export function mergeClaimsEquipe(
  current: object | null | undefined,
  eventoId: string,
  papel: PapelEvento | null
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(current ?? {}) };
  const atuais = merged['eventos'];
  const eventos: Record<string, unknown> = {
    ...(typeof atuais === 'object' && atuais !== null ? (atuais as object) : {}),
  };

  if (papel) {
    eventos[eventoId] = papel;
  } else {
    delete eventos[eventoId];
  }

  if (Object.keys(eventos).length > 0) {
    merged['eventos'] = eventos;
  } else {
    delete merged['eventos'];
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Guard de escalada (puro — exportado para teste unitário direto)
// ---------------------------------------------------------------------------

/** Como o caller está autorizado a gerir a equipe deste evento. */
export type GestorEquipe =
  | { via: 'platform_admin' }
  | { via: 'tenant'; role: 'tenant_owner' | 'tenant_staff' }
  | { via: 'papel'; papel: 'organizador' | 'administrador' };

/**
 * Resolve a autoridade de PLATAFORMA/TENANT do caller sobre a equipe do
 * evento — null quando não tem nenhuma. A autoridade via PAPEL de evento
 * (organizador/administrador) exige o eventoId e é resolvida no core (passo
 * 3), a partir do token (RN-401). @pure
 */
export function resolverGestorEquipe(
  caller: EventoCaller,
  eventoTenantId: string
): GestorEquipe | null {
  if (caller.claims.role === 'platform_admin') return { via: 'platform_admin' };
  if (
    (caller.claims.role === 'tenant_owner' || caller.claims.role === 'tenant_staff') &&
    caller.claims.tenantId === eventoTenantId
  ) {
    return { via: 'tenant', role: caller.claims.role };
  }
  return null;
}

/** Autoridades que podem tocar o papel 'organizador' (conceder OU remover). */
function autoridadeSobreOrganizador(gestor: GestorEquipe): boolean {
  return (
    gestor.via === 'platform_admin' ||
    (gestor.via === 'tenant' && gestor.role === 'tenant_owner') ||
    (gestor.via === 'papel' && gestor.papel === 'organizador')
  );
}

/**
 * O gestor pode aplicar `novoPapel` (null = revogar) a um alvo cujo papel
 * atual é `papelAtualAlvo`? Codifica as regras anti-escalada do E04-L4. @pure
 */
export function podeGerirPapelEquipe(params: {
  gestor: GestorEquipe;
  callerUid: string;
  alvoUid: string;
  papelAtualAlvo: PapelEvento | null;
  novoPapel: PapelEvento | null;
}): { ok: true } | { ok: false; motivo: string } {
  const { gestor, callerUid, alvoUid, papelAtualAlvo, novoPapel } = params;

  // Auto-gestão de papel = auto-promoção em potencial. Nem rebaixar a si
  // mesmo (deixaria evento sem organizador por engano). Só platform_admin.
  if (callerUid === alvoUid && gestor.via !== 'platform_admin') {
    return { ok: false, motivo: 'caller não pode alterar o próprio papel (auto-promoção)' };
  }

  // Conceder 'organizador' = transferir controle total (excluir evento,
  // financeiro, equipe). administrador e tenant_staff NÃO alcançam.
  if (novoPapel === 'organizador' && !autoridadeSobreOrganizador(gestor)) {
    return {
      ok: false,
      motivo: "conceder papel 'organizador' exige platform_admin, tenant_owner ou organizador",
    };
  }

  // Mexer em quem JÁ é organizador (rebaixar/remover) — mesma barreira;
  // sem ela, um administrador destituiria o dono do evento.
  if (papelAtualAlvo === 'organizador' && !autoridadeSobreOrganizador(gestor)) {
    return {
      ok: false,
      motivo: 'alterar/remover o organizador exige platform_admin, tenant_owner ou organizador',
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Core (testável in-process — padrão criarEventoCore)
// ---------------------------------------------------------------------------

export async function setClaimsEquipeCore(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  data: unknown,
  caller: EventoCaller
): Promise<SetClaimsEquipeResult> {
  // ── 1. Validação de input (fronteira de segurança do servidor) ─────────
  const input = data as SetClaimsEquipeInput;
  if (!input || typeof input.eventoId !== 'string' || !input.eventoId.trim()) {
    throw new https.HttpsError('invalid-argument', 'eventoId é obrigatório.');
  }
  if (typeof input.uid !== 'string' || !input.uid.trim()) {
    throw new https.HttpsError('invalid-argument', 'uid do membro é obrigatório.');
  }
  const papel: PapelEvento | null = input.papel ?? null;
  if (papel !== null && !isPapelEvento(papel)) {
    throw new https.HttpsError(
      'invalid-argument',
      `papel inválido (RN-320). Aceitos: organizador, administrador, operador, financeiro — ou null para revogar.`
    );
  }

  // ── 2. Evento existe? (também dá o tenant dono) ────────────────────────
  const eventoRef = db.collection('eventos').doc(input.eventoId);
  const eventoSnap = await eventoRef.get();
  if (!eventoSnap.exists) {
    throw new https.HttpsError('not-found', `Evento '${input.eventoId}' não encontrado.`);
  }
  const eventoTenantId = (eventoSnap.data() ?? {})['tenantId'] as string;

  // ── 3. Autoridade do caller (token, nunca input — RN-401) ──────────────
  let gestor = resolverGestorEquipe(caller, eventoTenantId);
  if (!gestor) {
    const papelCaller = papelNoEvento(caller.claims, input.eventoId);
    if (papelCaller === 'organizador' || papelCaller === 'administrador') {
      // ÂNCORA também no WRITE path (espelho de papelEventoAtivo das Rules):
      // um administrador REMOVIDO carrega o claim no token velho por até
      // ~1h — sem esta checagem ele seguiria gerindo a equipe na janela.
      // O doc `equipe/{uid}` precisa estar 'ativo' e com o MESMO papel.
      const ancoraSnap = await eventoRef.collection('equipe').doc(caller.uid).get();
      const ancora = ancoraSnap.data();
      if (
        ancoraSnap.exists &&
        ancora?.['status'] === 'ativo' &&
        ancora?.['papel'] === papelCaller
      ) {
        gestor = { via: 'papel', papel: papelCaller };
      }
    }
  }
  if (!gestor) {
    throw new https.HttpsError(
      'permission-denied',
      'Apenas platform_admin, gestão do tenant ou organizador/administrador do evento gerem a equipe.'
    );
  }

  // ── 4. Alvo existe no Auth ──────────────────────────────────────────────
  let alvo: admin.auth.UserRecord;
  try {
    alvo = await auth.getUser(input.uid);
  } catch {
    throw new https.HttpsError(
      'not-found',
      `Usuário '${input.uid}' não encontrado no Firebase Auth.`
    );
  }
  const papelAtualAlvo = papelNoEvento(
    alvo.customClaims as { eventos?: Record<string, unknown> } | undefined,
    input.eventoId
  );

  // ── 5. Anti-escalada (auto-promoção / organizador / cross-papel) ───────
  const veredicto = podeGerirPapelEquipe({
    gestor,
    callerUid: caller.uid,
    alvoUid: input.uid,
    papelAtualAlvo,
    novoPapel: papel,
  });
  if (!veredicto.ok) {
    throw new https.HttpsError('permission-denied', veredicto.motivo);
  }

  // ── 6. Claims: MERGE PRESERVADOR + revogação de refresh (RN-401) ───────
  const novasClaims = mergeClaimsEquipe(alvo.customClaims, input.eventoId, papel);
  await auth.setCustomUserClaims(input.uid, novasClaims);
  await auth.revokeRefreshTokens(input.uid);

  // ── 7. Âncora no doc — DEPOIS das claims (nunca autoriza além do token) ─
  const membroRef = eventoRef.collection('equipe').doc(input.uid);
  if (papel) {
    const membroSnap = await membroRef.get();
    const nomeDoc =
      input.nome?.trim() ||
      (membroSnap.exists ? undefined : alvo.displayName || alvo.email || input.uid);
    await membroRef.set(
      {
        tenantId: eventoTenantId,
        eventoId: input.eventoId,
        uid: input.uid,
        papel,
        status: 'ativo',
        ...(nomeDoc ? { nome: nomeDoc } : {}),
        ...(membroSnap.exists ? {} : { email: alvo.email ?? null, profId: null }),
        ...(membroSnap.exists && membroSnap.data()?.['convidadoEm']
          ? {}
          : { convidadoEm: FieldValue.serverTimestamp() }),
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    const membroSnap = await membroRef.get();
    if (membroSnap.exists) {
      await membroRef.set(
        { status: 'removido', atualizadoEm: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
  }

  logger.info('set_claims_equipe', {
    callerUid: caller.uid,
    gestorVia: gestor.via,
    eventoId: input.eventoId,
    alvoUid: input.uid,
    papelAnterior: papelAtualAlvo,
    papelNovo: papel,
  });

  return { success: true, eventoId: input.eventoId, uid: input.uid, papel };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/**
 * `setClaimsEquipe` — troca/atribuição/revogação de papel de equipe (E04-L4).
 * O cliente do membro afetado deve chamar `getIdTokenResult(true)` para
 * receber o token novo; a âncora no doc já corta o acesso do token velho.
 */
export const setClaimsEquipe = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return setClaimsEquipeCore(admin.firestore(), admin.auth(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
