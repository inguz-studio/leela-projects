// =============================================================================
// functions/src/perfil/salvarPerfil.ts
//
// REGISTRY do perfil público / link-in-bio (E17 · S1700-T1 + DN-1, Onda 3).
// Escrita EXCLUSIVA desta Function — as Rules de `perfis/{handle}` dizem
// `write: if false` para TODO cliente. Motivo (Kleppmann): unicidade global
// case-insensitive, imutabilidade do handle e a lista de reservados são
// invariantes de REGISTRO — check-then-act que Rules não serializam.
//
// Invariantes garantidas AQUI (e provadas no emulator):
//   1. docId = handle NORMALIZADO minúsculo (normalizarHandle) → dois casings
//      do mesmo handle colidem no MESMO doc (unicidade case-insensitive
//      estrutural, RN-160).
//   2. Handle IMUTÁVEL: não existe rename; o tenant tem NO MÁXIMO 1 perfil
//      nesta onda (DN-1 organizador-only) — criar um segundo handle com o
//      mesmo tenant é negado (failed-precondition).
//   3. Reservados (HANDLES_RESERVADOS) nunca são registrados.
//   4. Colisão: handle já registrado por OUTRO tenant → already-exists.
//   5. Update só toca campos editáveis (nome/bio/avatarUrl/imagemUrl/
//      visibilidade/linksExternos); handle/tipo/ownerUid/tenantId/criadoEm
//      são preservados sempre.
//
// Transacional: get do doc + query "perfis do tenant" + write rodam numa
// runTransaction (dois creates concorrentes do mesmo handle serializam; o
// perdedor cai no ramo de colisão).
//
// PII (Schneier): o perfil público NÃO carrega PII (nome público + bio são
// conteúdo editorial do organizador); `ownerUid`/`tenantId` ficam no doc mas
// NUNCA saem na projeção pública (projetarPerfilPublico — allowlist). Logs
// sem PII: só tenantId/handle/flags.
//
// Autorização: papel de escrita do tenant (RN-401) + tenant ativo (RN-402) —
// mesmo padrão das callables de eventos (assertTenantWriter/assertTenantAtivo).
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { FieldValue } from 'firebase-admin/firestore';
import {
  COLECAO_PERFIS,
  normalizarHandle,
  validarPerfilInput,
  type AuthClaims,
  type LinkExternoPerfil,
  type PerfilInput,
  type VisibilidadePerfil,
} from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from '../eventos/criarEvento';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface SalvarPerfilResult {
  ok: true;
  /** Handle normalizado efetivamente gravado (docId) */
  handle: string;
  /** true = perfil criado agora; false = update do perfil existente */
  criado: boolean;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function salvarPerfilCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller,
  agora: Date = new Date()
): Promise<SalvarPerfilResult> {
  const tenantId = assertTenantWriter(caller.claims);

  const erros = validarPerfilInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `PerfilInput inválido: ${erros.join(' · ')}`
    );
  }
  const input = rawInput as PerfilInput;

  // normalizarHandle nunca é null aqui (validarPerfilInput já barrou), mas o
  // narrow explícito mantém o compilador e o invariante honestos.
  const handle = normalizarHandle(input.handle);
  if (handle === null) {
    throw new https.HttpsError('invalid-argument', 'handle é obrigatório.');
  }

  await assertTenantAtivo(db, tenantId);

  const perfisCol = db.collection(COLECAO_PERFIS);
  const perfilRef = perfisCol.doc(handle);

  // Campos EDITÁVEIS. No CREATE, opcional ausente simplesmente não entra;
  // no UPDATE, ausente é REMOVIDO (o formulário manda o estado completo —
  // limpar a bio de verdade limpa o doc). FieldValue.delete() só é legal em
  // update(), por isso os dois shapes.
  const base = {
    nome: input.nome,
    visibilidade: input.visibilidade satisfies VisibilidadePerfil,
    atualizadoEm: agora,
  };
  const editaveisCreate = {
    ...base,
    ...(input.bio !== undefined ? { bio: input.bio } : {}),
    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    ...(input.imagemUrl !== undefined ? { imagemUrl: input.imagemUrl } : {}),
    ...(input.linksExternos !== undefined
      ? { linksExternos: input.linksExternos satisfies LinkExternoPerfil[] }
      : {}),
  };
  const editaveisUpdate = {
    ...base,
    bio: input.bio !== undefined ? input.bio : FieldValue.delete(),
    avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : FieldValue.delete(),
    imagemUrl: input.imagemUrl !== undefined ? input.imagemUrl : FieldValue.delete(),
    linksExternos:
      input.linksExternos !== undefined
        ? (input.linksExternos satisfies LinkExternoPerfil[])
        : FieldValue.delete(),
  };

  const resultado = await db.runTransaction<SalvarPerfilResult>(async (tx) => {
    const [snap, meusPerfis] = await Promise.all([
      tx.get(perfilRef),
      tx.get(perfisCol.where('tenantId', '==', tenantId).limit(1)),
    ]);

    if (snap.exists) {
      // Doc do handle existe: ou é o MEU perfil (update), ou colisão.
      if (snap.get('tenantId') !== tenantId) {
        throw new https.HttpsError(
          'already-exists',
          `handle "@${handle}" já está em uso (RN-160).`
        );
      }
      tx.update(perfilRef, editaveisUpdate);
      return { ok: true, handle, criado: false };
    }

    // Handle livre — mas o tenant só pode ter 1 perfil e o handle é IMUTÁVEL:
    // se o tenant já tem perfil sob OUTRO handle, este create é um rename
    // disfarçado → negado (RN-160).
    if (!meusPerfis.empty) {
      const handleAtual = meusPerfis.docs[0]?.id ?? '';
      throw new https.HttpsError(
        'failed-precondition',
        `handle é imutável (RN-160): este organizador já tem o perfil "@${handleAtual}".`
      );
    }

    tx.set(perfilRef, {
      handle,
      tipo: 'organizador', // DN-1: organizador-only nesta onda
      ownerUid: caller.uid,
      tenantId,
      ...editaveisCreate,
      criadoEm: agora,
    });
    return { ok: true, handle, criado: true };
  });

  // Sem PII no log — handle/tenant são identificadores de marca (LGPD)
  logger.info('perfil_salvo', {
    tenantId,
    handle: resultado.handle,
    criado: resultado.criado,
  });

  return resultado;
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `salvarPerfil` — registry do perfil público (o editor do painel consome). */
export const salvarPerfil = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return salvarPerfilCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
