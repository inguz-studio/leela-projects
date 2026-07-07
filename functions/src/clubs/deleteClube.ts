// =============================================================================
// functions/src/clubs/deleteClube.ts
//
// Exclusão IRREVERSÍVEL do clube em cascata (LEELA-E05 · S110-T2 · RN-144).
//
// Contrato (espelhado em packages/api-client/src/clubs.ts → deletarClube):
//   `deleteClube({ clubeId }) -> { deletado: true }`
//
// Por que Function (e não delete direto do cliente):
//   - cascata completa: doc do clube + TODAS as subcoleções (membros,
//     permissoesAdmin, desafios + junção acoes, parcerias + conversoes —
//     incluindo os campos espelhados RN-120/122 —, comunicados, convites);
//     delete de doc no Firestore NÃO apaga subcoleções;
//   - retenção LGPD: snapshot integral dos dados fica disponível para
//     exportação por 90 dias após a exclusão (RN-144) em
//     `clubesExcluidos/{clubeId}` (+ subcoleção `documentos`) — coleção SEM
//     acesso de cliente (Rules negam; só as Functions via Admin SDK);
//   - as Rules de `clubes/{id}` NEGAM delete do cliente (endurecidas nesta
//     task) — não existe caminho de exclusão que pule a retenção.
//
// Autorização (nunca confia no cliente):
//   - papel de escrita do tenant (tenant_owner | tenant_staff) via claims;
//   - clube precisa pertencer ao tenant do caller (cross-tenant nega, sem
//     vazar existência — padrão assertClubeDoTenant);
//   - SÓ O OWNER DO CLUBE (clube.ownerId == caller.uid) exclui — papel de
//     escrita do tenant NÃO basta (ação irreversível, §2.15 + RN-144);
//   - tenant ativo (RN-402 — Admin SDK bypassa Rules, a Function reverifica).
//
// Idempotência / replay-safe (padrão provisionTenant — batches):
//   - ordem durável: o snapshot de retenção é COMMITADO antes de qualquer
//     delete; o doc do clube é deletado por ÚLTIMO (existência do doc ==
//     exclusão em andamento; ausência + retenção == concluída);
//   - chaves de snapshot determinísticas (caminho URL-encoded) — replay
//     regrava por cima, nunca duplica; docs já deletados num run anterior
//     permanecem no snapshot (união entre runs — nada se perde);
//   - replay pós-conclusão (clube ausente + retenção do mesmo owner/tenant)
//     devolve sucesso sem tocar na retenção (deletadoEm/expiraEm LGPD são
//     do PRIMEIRO delete, nunca deslizam num retry).
//
// A purga física da retenção após os 90 dias é rotina futura (cron) — o
// guard de acesso vive em exportClubeData (retencaoDisponivel).
// =============================================================================

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import type { AuthClaims } from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
} from '../eventos/criarEvento';
import type { ClubsCaller } from './membrosMutations';

// ---------------------------------------------------------------------------
// Contratos (espelhados em packages/api-client/src/clubs.ts)
// ---------------------------------------------------------------------------

export interface DeleteClubeInput {
  clubeId: string;
}

/** Espelha `DeletarClubeResult` do api-client. */
export interface DeleteClubeResult {
  deletado: true;
}

// ---------------------------------------------------------------------------
// Constantes e helpers puros (unit-testáveis sem Emulator)
// ---------------------------------------------------------------------------

/** Retenção LGPD pós-exclusão (RN-144). */
export const RETENCAO_LGPD_DIAS = 90;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Expiração da retenção LGPD: exatamente 90 dias após a exclusão (RN-144).
 * @pure
 */
export function calcularExpiracaoRetencao(deletadoEm: Date): Date {
  return new Date(deletadoEm.getTime() + RETENCAO_LGPD_DIAS * MS_POR_DIA);
}

/**
 * Chave determinística do doc de snapshot a partir do caminho relativo
 * (ex.: 'membros/m1', 'desafios/d1/acoes/a1'). URL-encoding é bijetivo —
 * caminhos distintos nunca colidem e replay regrava a MESMA chave.
 * @pure
 */
export function chaveSnapshot(caminho: string): string {
  return encodeURIComponent(caminho);
}

/** Valida o input bruto `{ clubeId }` (compartilhado com exportClubeData). */
export function assertInputClubeLgpd(raw: unknown): DeleteClubeInput {
  const input = raw as Partial<DeleteClubeInput> | null | undefined;
  if (!input || typeof input.clubeId !== 'string' || input.clubeId.length === 0) {
    throw new https.HttpsError(
      'invalid-argument',
      'Input inválido: clubeId é obrigatório.'
    );
  }
  return { clubeId: input.clubeId };
}

// ---------------------------------------------------------------------------
// Resolução do estado LGPD do clube (compartilhada com exportClubeData)
// ---------------------------------------------------------------------------

export type ClubeLgpdEstado =
  | {
      modo: 'ativo';
      clubeRef: admin.firestore.DocumentReference;
      clube: admin.firestore.DocumentData;
    }
  | {
      modo: 'retido';
      retencaoRef: admin.firestore.DocumentReference;
      retencao: admin.firestore.DocumentData;
    };

/**
 * Resolve o clube como VIVO ou RETIDO (pós-exclusão, RN-144), aplicando as
 * guardas de tenant e de owner. Cross-tenant e clube inexistente devolvem o
 * MESMO permission-denied (não vaza existência — padrão assertClubeDoTenant);
 * caller do tenant que não é o owner do clube recebe a negativa explícita.
 */
export async function resolverClubeLgpd(
  db: admin.firestore.Firestore,
  clubeId: string,
  tenantId: string,
  callerUid: string
): Promise<ClubeLgpdEstado> {
  const negarClube = (): never => {
    throw new https.HttpsError(
      'permission-denied',
      `Clube '${clubeId}' não pertence ao seu tenant.`
    );
  };
  const negarOwner = (): never => {
    throw new https.HttpsError(
      'permission-denied',
      'Apenas o owner do clube executa esta operação (RN-144).'
    );
  };

  const clubeRef = db.collection('clubes').doc(clubeId);
  const clubeSnap = await clubeRef.get();
  if (clubeSnap.exists) {
    if (clubeSnap.get('tenantId') !== tenantId) negarClube();
    if (clubeSnap.get('ownerId') !== callerUid) negarOwner();
    return { modo: 'ativo', clubeRef, clube: clubeSnap.data() ?? {} };
  }

  const retencaoRef = db.collection('clubesExcluidos').doc(clubeId);
  const retencaoSnap = await retencaoRef.get();
  if (!retencaoSnap.exists || retencaoSnap.get('tenantId') !== tenantId) {
    negarClube();
  }
  if (retencaoSnap.get('ownerId') !== callerUid) negarOwner();
  return { modo: 'retido', retencaoRef, retencao: retencaoSnap.data() ?? {} };
}

// ---------------------------------------------------------------------------
// Travessia da árvore do clube (compartilhada com exportClubeData)
// ---------------------------------------------------------------------------

export interface DocDaArvore {
  /** Caminho RELATIVO ao doc do clube — ex.: 'desafios/d1/acoes/a1'. */
  caminho: string;
  ref: admin.firestore.DocumentReference;
  /** null = doc "fantasma" (não existe, mas tem subcoleções) — só se deleta. */
  dados: admin.firestore.DocumentData | null;
}

/**
 * Coleta RECURSIVAMENTE todos os docs sob o doc do clube, qualquer que seja
 * a subcoleção (membros, permissoesAdmin, desafios/acoes, parcerias/
 * conversoes, comunicados, convites e futuras) — LGPD exige a árvore
 * COMPLETA, não uma lista hardcoded. `listDocuments` inclui docs fantasma
 * (pais órfãos com subcoleções), que entram na deleção mas não no snapshot.
 */
export async function coletarArvoreClube(
  clubeRef: admin.firestore.DocumentReference
): Promise<DocDaArvore[]> {
  const encontrados: DocDaArvore[] = [];

  async function percorrer(
    ref: admin.firestore.DocumentReference,
    prefixo: string
  ): Promise<void> {
    const colecoes = await ref.listCollections();
    for (const col of colecoes) {
      const [snap, refs] = await Promise.all([col.get(), col.listDocuments()]);
      const existentes = new Map(snap.docs.map((d) => [d.id, d.data()]));
      for (const docRef of refs) {
        const caminho = `${prefixo}${col.id}/${docRef.id}`;
        encontrados.push({
          caminho,
          ref: docRef,
          dados: existentes.get(docRef.id) ?? null,
        });
        await percorrer(docRef, `${caminho}/`);
      }
    }
  }

  await percorrer(clubeRef, '');
  return encontrados;
}

/** Limite prático por WriteBatch (máximo do Firestore é 500). */
const BATCH_MAX = 400;

/** Aplica operações em batches sequenciais de até BATCH_MAX escritas. */
async function commitEmBatches(
  db: admin.firestore.Firestore,
  ops: Array<(batch: admin.firestore.WriteBatch) => void>
): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_MAX) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + BATCH_MAX)) op(batch);
    await batch.commit();
  }
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

/**
 * Exclui o clube em cascata com retenção LGPD de 90 dias (RN-144).
 * Ver contrato e garantias de replay no cabeçalho do arquivo.
 */
export async function deleteClubeCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: ClubsCaller,
  agora: () => Date = () => new Date()
): Promise<DeleteClubeResult> {
  const tenantId = assertTenantWriter(caller.claims);
  const input = assertInputClubeLgpd(rawInput);
  await assertTenantAtivo(db, tenantId);

  const estado = await resolverClubeLgpd(db, input.clubeId, tenantId, caller.uid);
  if (estado.modo === 'retido') {
    // Replay pós-conclusão: exclusão já concluída num run anterior. Retenção
    // fica INTOCADA — deletadoEm/expiraEm LGPD são do primeiro delete.
    logger.info('delete_clube_replay', { clubeId: input.clubeId, tenantId });
    return { deletado: true };
  }

  const { clubeRef, clube } = estado;
  const documentos = await coletarArvoreClube(clubeRef);

  // ── 1. Snapshot de retenção DURÁVEL antes de qualquer delete ────────────
  // Chaves determinísticas: replay regrava por cima; docs deletados num run
  // anterior permanecem (união entre runs — nunca perde dado retido).
  const retencaoRef = db.collection('clubesExcluidos').doc(input.clubeId);
  const snapshotCol = retencaoRef.collection('documentos');
  await commitEmBatches(
    db,
    documentos
      .filter((d) => d.dados !== null)
      .map((d) => (batch: admin.firestore.WriteBatch) => {
        batch.set(snapshotCol.doc(chaveSnapshot(d.caminho)), {
          caminho: d.caminho,
          dados: d.dados,
        });
      })
  );

  // Marcador de retenção: criado UMA vez (replay de run interrompido no meio
  // da deleção preserva deletadoEm/expiraEm originais — janela LGPD estável).
  const retencaoSnap = await retencaoRef.get();
  if (!retencaoSnap.exists) {
    const deletadoEm = agora();
    await retencaoRef.set({
      clubeId: input.clubeId,
      tenantId,
      ownerId: clube['ownerId'] ?? null,
      nome: clube['nome'] ?? null,
      clube,
      deletadoPor: caller.uid,
      deletadoEm: Timestamp.fromDate(deletadoEm),
      expiraEm: Timestamp.fromDate(
        calcularExpiracaoRetencao(deletadoEm)
      ),
      totalDocumentos: documentos.filter((d) => d.dados !== null).length,
    });
  }

  // ── 2. Deleção em cascata: subárvore primeiro, doc do clube por ÚLTIMO ──
  // (a existência do doc do clube é o sinal de "exclusão em andamento" que
  // torna o replay de um run morto no meio capaz de CONCLUIR o trabalho).
  await commitEmBatches(
    db,
    documentos.map((d) => (batch: admin.firestore.WriteBatch) => {
      batch.delete(d.ref);
    })
  );
  await clubeRef.delete();

  logger.info('delete_clube', {
    clubeId: input.clubeId,
    tenantId,
    totalDocumentos: documentos.length,
  });
  return { deletado: true };
}

// ---------------------------------------------------------------------------
// Callable (wrapper fino — padrão criarEvento)
// ---------------------------------------------------------------------------

export const deleteClube = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return deleteClubeCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
