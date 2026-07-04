// =============================================================================
// functions/src/seed/membros.seed.ts
//
// Seed dos membros canônicos do clube Corrida Perfeita Sul (LEELA-S103-T1).
// NÃO executar em produção (guard assertEmulatorOnly local — o guard
// compartilhado de seed/emulator-guard.ts pertence ao lote E16-L1; quando
// ele for commitado, unificar num follow-up).
//
// 6 membros determinísticos (docIds fixos) cobrindo os 3 status da RN-102:
//   ativo   — Felipe (owner), Camila, Renata (admin), Aline
//   novo    — Bruno (entrou há 2 dias)
//   inativo — Sérgio (última atividade há 60 dias)
//
// Idempotente: rerun PRESERVA entrouEm/ultimaAtividadeEm/entrouVia dos docs
// existentes e recalcula `status` a partir das datas preservadas (RN-102 —
// mesma derivação da Cloud Function). O agregado ∑ `qtdMembrosAtivos` é
// mantido pela MESMA rotina de recontagem da Function (recontarMembrosAtivos),
// nunca por valor chumbado.
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { derivarStatus, type EntradaVia, type PapelMembro } from '@leela/core';
import { recontarMembrosAtivos } from '../clubs/membrosAggregates';
import {
  CLUBE_CPS_SLUG,
  CORRIDA_PERFEITA_TENANT_ID,
  FELIPE_MARTINS_UID,
  seedClubes,
} from './clubes.seed';

/** Total de membros canônicos semeados */
export const TOTAL_MEMBROS_SEED = 6;

/** Quantos contam no agregado ∑ qtdMembrosAtivos (não-inativos: ativo+novo) */
export const QTD_MEMBROS_ATIVOS_SEED = 5;

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Guard anti-produção (padrão F5 — review S1600): seed SÓ roda no Emulator.
 */
function assertEmulatorOnly(): void {
  const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
  const projectId =
    process.env['GCLOUD_PROJECT'] ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';

  if (!emulatorHost && !projectId.startsWith('demo-')) {
    throw new Error(
      '[seed] BLOQUEADO: seedMembros só roda no Emulator. ' +
        'Defina FIRESTORE_EMULATOR_HOST (ou use um projectId demo-*). ' +
        'NUNCA execute este seed contra produção.'
    );
  }
}

interface MembroSeedSpec {
  id: string;
  atletaId: string;
  atletaNome: string;
  papel: PapelMembro;
  entrouVia: EntradaVia;
  /** Dias atrás em que entrou no clube (relativo a `agora`) */
  entrouDiasAtras: number;
  /** Dias atrás da última atividade — null = nunca registrou */
  ultimaAtividadeDiasAtras: number | null;
}

/** Specs canônicas — status esperado deriva das datas (RN-102). */
const MEMBROS_SEED: readonly MembroSeedSpec[] = [
  {
    id: 'membro-felipe-martins',
    atletaId: FELIPE_MARTINS_UID,
    atletaNome: 'Felipe Martins',
    papel: 'owner',
    entrouVia: 'link',
    entrouDiasAtras: 900, // fundador — clube existe desde 2022
    ultimaAtividadeDiasAtras: 1,
  },
  {
    id: 'membro-camila-duarte',
    atletaId: 'uid-camila-duarte',
    atletaNome: 'Camila Duarte',
    papel: 'membro',
    entrouVia: 'codigo',
    entrouDiasAtras: 90,
    ultimaAtividadeDiasAtras: 3,
  },
  {
    id: 'membro-renata-lopes',
    atletaId: 'uid-renata-lopes',
    atletaNome: 'Renata Lopes',
    papel: 'admin',
    entrouVia: 'convite',
    entrouDiasAtras: 200,
    ultimaAtividadeDiasAtras: 10,
  },
  {
    id: 'membro-aline-barros',
    atletaId: 'uid-aline-barros',
    atletaNome: 'Aline Barros',
    papel: 'membro',
    entrouVia: 'codigo',
    entrouDiasAtras: 45,
    ultimaAtividadeDiasAtras: 20,
  },
  {
    id: 'membro-bruno-aguiar',
    atletaId: 'uid-bruno-aguiar',
    atletaNome: 'Bruno Aguiar',
    papel: 'membro',
    entrouVia: 'link',
    entrouDiasAtras: 2, // < 7 dias → novo (RN-102)
    ultimaAtividadeDiasAtras: null,
  },
  {
    id: 'membro-sergio-tavares',
    atletaId: 'uid-sergio-tavares',
    atletaNome: 'Sérgio Tavares',
    papel: 'membro',
    entrouVia: 'codigo',
    entrouDiasAtras: 120,
    ultimaAtividadeDiasAtras: 60, // ≥ 30 dias → inativo (RN-102)
  },
];

/**
 * Popula os membros canônicos do clube CPS + reconta o agregado ∑.
 * Garante o clube pai primeiro (seedClubes é idempotente).
 */
export async function seedMembros(
  db: admin.firestore.Firestore,
  agora: Date = new Date()
): Promise<void> {
  assertEmulatorOnly();

  await seedClubes(db); // pai primeiro — tenant + clube (idempotente)

  const membrosCol = db
    .collection('clubes')
    .doc(CLUBE_CPS_SLUG)
    .collection('membros');

  for (const spec of MEMBROS_SEED) {
    const ref = membrosCol.doc(spec.id);
    const snap = await ref.get();

    // Datas: rerun PRESERVA as existentes (idempotência de conteúdo);
    // primeira criação deriva das specs relativas a `agora`.
    let entrouEm: Date;
    let ultimaAtividadeEm: Date | null;
    if (snap.exists) {
      entrouEm = (snap.get('entrouEm') as admin.firestore.Timestamp).toDate();
      const ua = snap.get('ultimaAtividadeEm') as
        | admin.firestore.Timestamp
        | undefined;
      ultimaAtividadeEm = ua ? ua.toDate() : null;
    } else {
      entrouEm = new Date(agora.getTime() - spec.entrouDiasAtras * DIA_MS);
      ultimaAtividadeEm =
        spec.ultimaAtividadeDiasAtras === null
          ? null
          : new Date(
              agora.getTime() - spec.ultimaAtividadeDiasAtras * DIA_MS
            );
    }

    const data: Record<string, unknown> = {
      id: spec.id,
      tenantId: CORRIDA_PERFEITA_TENANT_ID,
      atletaId: spec.atletaId,
      atletaNome: spec.atletaNome,
      papel: spec.papel,
      entrouVia: spec.entrouVia,
      entrouEm: admin.firestore.Timestamp.fromDate(entrouEm),
      // status SEMPRE derivado por data — mesma função pura da Function (RN-102)
      status: derivarStatus(entrouEm, ultimaAtividadeEm, agora),
    };
    if (ultimaAtividadeEm) {
      data['ultimaAtividadeEm'] =
        admin.firestore.Timestamp.fromDate(ultimaAtividadeEm);
    }

    await ref.set(data, { merge: true });
  }

  // Agregado ∑ via a MESMA recontagem da Cloud Function (idempotente)
  await recontarMembrosAtivos(db, CLUBE_CPS_SLUG);

  console.log(
    `[seed] membros: ${TOTAL_MEMBROS_SEED} membros canônicos no clube ` +
      `${CLUBE_CPS_SLUG} (${QTD_MEMBROS_ATIVOS_SEED} não-inativos)`
  );
}

// ---------------------------------------------------------------------------
// Entry point (execução direta)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      process.env['FIRESTORE_EMULATOR_HOST'] ?? 'localhost:8080';
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  seedMembros(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
