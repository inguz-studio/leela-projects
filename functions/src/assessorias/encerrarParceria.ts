// =============================================================================
// functions/src/assessorias/encerrarParceria.ts
//
// Cloud Function callable: encerra (revoga) uma parceria de assessoria
// (LEELA-E18 · S1803 backend · RN-144).
//
// Contrato: encerrarParceriaAssessoria({ parceriaId }) -> { ok, statusAnterior }
//
// MÁQUINA DE ESTADOS (core `podeTransicionarParceria` — fonte única):
//   convite_pendente → inativa (cancela antes do aceite)
//   ativa            → inativa (encerra parceria vigente)
//   inativa é TERMINAL — replay devolve ok idempotente (não re-carimba).
//
// EFEITOS DO ENCERRAMENTO:
//   - parceria: status='inativa' + encerradaEm/encerradaPor (trilha; o doc é
//     RETIDO — RN-144: retenção 90d; expurgo físico é rotina futura);
//   - convite pendente: status='cancelado' (o link de aceite morre — e o
//     provisionamento também re-checa a parceria na PRÓPRIA tx, cinto e
//     suspensório contra a corrida aceite×revogação);
//   - desconto: NADA a tocar no cupom — o checkout resolve cupom
//     `club_parceiro` exigindo parceria ATIVA (S1802-T2), então o desconto
//     morre por consequência, sem caminho paralelo (ADR-012);
//   - clube: FICA (vira clube comum sem condição; exclusão real é a máquina
//     `deleteClube` E05 com retenção própria — premissa registrada).
//
// TRANSACIONAL: leitura + transição na mesma tx — corrida com o aceite
// (provisionAssessoriaAccount) serializa: quem commitar primeiro vence e o
// outro enxerga o estado novo (fail-closed dos dois lados).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https, runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  COLECAO_PARCEIROS_ASSESSORIA,
  podeTransicionarParceria,
  type AuthClaims,
  type StatusParceriaAssessoria,
} from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from '../eventos/criarEvento';
import { mascararDocumento } from './cadastrarAssessoria';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface EncerrarParceriaInput {
  /** docId da parceria (= documento normalizado) */
  parceriaId: string;
}

export interface EncerrarParceriaResult {
  ok: true;
  /** Estado antes do encerramento ('inativa' = replay idempotente) */
  statusAnterior: StatusParceriaAssessoria;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function encerrarParceriaCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller
): Promise<EncerrarParceriaResult> {
  const tenantId = assertTenantWriter(caller.claims);

  const input = rawInput as Partial<EncerrarParceriaInput> | null;
  const parceriaId =
    typeof input?.parceriaId === 'string' ? input.parceriaId : '';
  if (parceriaId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"parceriaId" é obrigatório.');
  }

  await assertTenantAtivo(db, tenantId);

  const parceriaRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection(COLECAO_PARCEIROS_ASSESSORIA)
    .doc(parceriaId);

  const statusAnterior = await db.runTransaction<StatusParceriaAssessoria>(
    async (tx) => {
      const snap = await tx.get(parceriaRef);
      if (!snap.exists) {
        throw new https.HttpsError(
          'not-found',
          `Parceria '${mascararDocumento(parceriaId)}' não existe neste tenant.`
        );
      }
      const status = snap.get('status') as StatusParceriaAssessoria;

      // Replay idempotente: já encerrada → ok sem re-carimbar trilha.
      if (status === 'inativa') return status;

      if (!podeTransicionarParceria(status, 'inativa')) {
        throw new https.HttpsError(
          'failed-precondition',
          `Transição '${status}' → 'inativa' inválida (RN-123).`
        );
      }

      // Convite pendente morre junto (o link de aceite deixa de valer).
      // Disciplina de tx do Firestore: TODAS as leituras ANTES de qualquer
      // escrita — o convite é lido AQUI e escrito só se existir (doc ausente
      // não aborta o encerramento).
      let conviteRef: admin.firestore.DocumentReference | null = null;
      if (status === 'convite_pendente') {
        const clubeId = (snap.get('clubeRef') ?? '') as string;
        const emailKey = (snap.get('responsavelEmail') ?? '') as string;
        if (clubeId.length > 0 && emailKey.length > 0) {
          const ref = db
            .collection('clubes')
            .doc(clubeId)
            .collection('convites')
            .doc(emailKey);
          const conviteSnap = await tx.get(ref);
          if (conviteSnap.exists && conviteSnap.get('status') === 'pendente') {
            conviteRef = ref;
          }
        }
      }

      const now = FieldValue.serverTimestamp();
      tx.update(parceriaRef, {
        status: 'inativa',
        encerradaEm: now,
        encerradaPor: caller.uid,
        atualizadoEm: now,
      });
      if (conviteRef !== null) {
        tx.update(conviteRef, { status: 'cancelado', canceladoEm: now });
      }

      return status;
    }
  );

  logger.info('assessoria_parceria_encerrada', {
    tenantId,
    parceria: mascararDocumento(parceriaId),
    statusAnterior,
    por: caller.uid,
  });

  return { ok: true, statusAnterior };
}

// ---------------------------------------------------------------------------
// Callable (wrapper fino — padrão criarEvento)
// ---------------------------------------------------------------------------

// PIXREAL-FIX T5 (2026-08-04): BREVO_API_KEY faltava no runWith. O
// selectEmailProvider e fail-closed por contrato (RN-137), entao sem o binding
// esta funcao degradava para 'pendente_chave' em SILENCIO -- a tela confirmava
// a acao e o e-mail nunca saia. Guarda contra reincidencia:
// __tests__/secretsBinding.contract.test.ts
export const encerrarParceriaAssessoria = runWith({ secrets: ['BREVO_API_KEY'] }).https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }
    return encerrarParceriaCore(admin.firestore(), data, {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    });
  }
);
