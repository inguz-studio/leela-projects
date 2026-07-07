// =============================================================================
// functions/src/clubs/exportClubeData.ts
//
// Exportação LGPD dos dados do clube (LEELA-E05 · S110-T2 · RN-144).
//
// Contrato (espelhado em packages/api-client/src/clubs.ts → exportarDadosClube):
//   `exportClubeData({ clubeId }) -> { exportId, expiraEm }`  (expiraEm = ISO)
//
// Por que Function (e não read direto do cliente):
//   - clube VIVO: o pacote cobre a árvore COMPLETA (subcoleções inclusas) —
//     o cliente não tem visão transversal garantida de todas as subcoleções;
//   - clube EXCLUÍDO (RN-144): os dados retidos vivem em
//     `clubesExcluidos/{clubeId}` — coleção SEM acesso de cliente (deny-by-
//     default nas Rules); a janela de 90 dias é imposta AQUI, no servidor
//     (guard `retencaoDisponivel`) — expirou, `failed-precondition`;
//   - o registro da solicitação precisa ser durável e auditável
//     (`exportsClube/{exportId}`, também Function-only).
//
// Autorização (idêntica a deleteClube — resolverClubeLgpd compartilhado):
//   - papel de escrita do tenant (tenant_owner | tenant_staff) via claims;
//   - clube do tenant do caller (cross-tenant/inexistente: MESMO
//     permission-denied, sem vazar existência);
//   - SÓ O OWNER do clube exporta (dados pessoais de membros — RN-144);
//   - tenant ativo (RN-402).
//
// Entrega do pacote (link por email — copy da tela S110-T2) é rotina futura
// de infraestrutura, como a purga física da retenção: este callable garante
// o guard de 90 dias, o registro durável da solicitação com o manifesto
// (origem + totalDocumentos) e o contrato `{ exportId, expiraEm }`. Replay/
// duplo clique cria NOVA solicitação (inofensivo — cada export é um pacote).
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
import {
  assertInputClubeLgpd,
  calcularExpiracaoRetencao,
  coletarArvoreClube,
  resolverClubeLgpd,
} from './deleteClube';

// ---------------------------------------------------------------------------
// Contrato (espelhado em packages/api-client/src/clubs.ts)
// ---------------------------------------------------------------------------

/** Espelha `ExportarDadosClubeResult` do api-client. */
export interface ExportClubeDataResult {
  /** Id do pacote de exportação (download posterior). */
  exportId: string;
  /** ISO da expiração do acesso ao export (retenção LGPD 90 dias — RN-144). */
  expiraEm: string;
}

// ---------------------------------------------------------------------------
// Guard puro da janela de retenção (unit-testável sem Emulator)
// ---------------------------------------------------------------------------

/**
 * Retenção ainda disponível? A janela LGPD fecha EXATAMENTE em `expiraEm`
 * (90 dias após a exclusão — RN-144); no instante `expiraEm` já NÃO há acesso.
 * @pure
 */
export function retencaoDisponivel(expiraEm: Date, agora: Date): boolean {
  return agora.getTime() < expiraEm.getTime();
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

/**
 * Registra a solicitação de exportação LGPD e devolve `{ exportId, expiraEm }`.
 * Ver contrato, autorização e guard de 90 dias no cabeçalho do arquivo.
 */
export async function exportClubeDataCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: ClubsCaller,
  agora: () => Date = () => new Date()
): Promise<ExportClubeDataResult> {
  const tenantId = assertTenantWriter(caller.claims);
  const input = assertInputClubeLgpd(rawInput);
  await assertTenantAtivo(db, tenantId);

  const estado = await resolverClubeLgpd(db, input.clubeId, tenantId, caller.uid);

  let origem: 'ativo' | 'retido';
  let expiraEm: Date;
  let totalDocumentos: number;

  if (estado.modo === 'ativo') {
    // Clube vivo: o export expira 90 dias após a SOLICITAÇÃO (mesma janela
    // RN-144). Manifesto conta o doc do clube + árvore completa existente.
    origem = 'ativo';
    expiraEm = calcularExpiracaoRetencao(agora());
    const documentos = await coletarArvoreClube(estado.clubeRef);
    totalDocumentos = documentos.filter((d) => d.dados !== null).length + 1;
  } else {
    // Clube excluído: o export NUNCA sobrevive à retenção — expira junto
    // com ela (expiraEm do PRIMEIRO delete; retries nunca deslizam a janela).
    const expiraEmRetencao = estado.retencao['expiraEm'] as
      | Timestamp
      | undefined;
    if (!expiraEmRetencao || !retencaoDisponivel(expiraEmRetencao.toDate(), agora())) {
      throw new https.HttpsError(
        'failed-precondition',
        'Retenção LGPD de 90 dias expirada — exportação indisponível (RN-144).'
      );
    }
    origem = 'retido';
    expiraEm = expiraEmRetencao.toDate();
    totalDocumentos =
      ((estado.retencao['totalDocumentos'] as number | undefined) ?? 0) + 1;
  }

  const exportRef = db.collection('exportsClube').doc();
  await exportRef.set({
    exportId: exportRef.id,
    clubeId: input.clubeId,
    tenantId,
    origem,
    solicitadoPor: caller.uid,
    solicitadoEm: Timestamp.fromDate(agora()),
    expiraEm: Timestamp.fromDate(expiraEm),
    totalDocumentos,
    status: 'solicitado',
  });

  logger.info('export_clube_data', {
    exportId: exportRef.id,
    clubeId: input.clubeId,
    tenantId,
    origem,
    totalDocumentos,
  });
  return { exportId: exportRef.id, expiraEm: expiraEm.toISOString() };
}

// ---------------------------------------------------------------------------
// Callable (wrapper fino — padrão criarEvento)
// ---------------------------------------------------------------------------

export const exportClubeData = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return exportClubeDataCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
