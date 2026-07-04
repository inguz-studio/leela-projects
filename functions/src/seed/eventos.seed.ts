// =============================================================================
// functions/src/seed/eventos.seed.ts
//
// Seed dos eventos canônicos para o Emulator (LEELA-S200-T1 · E03).
// Mocks canônicos de HANDOFF-05 — reusar exatamente, nunca inventar:
//   1. Meia Maratona Floripa 2026 — `meia-floripa-2026`, 27 Abr 2026,
//      Marina Castelo (Castelo Produções), 453 inscritos, R$ 85.617,
//      modalidades 5k/10k/21k, usaChip=true, status publicado.
//   2. Maratona Floripa 2027 — `maratona-floripa-2027`, 25 Abr 2027,
//      mesma organizadora, rascunho (sem vendas).
//
// Agregados ∑ (qtdInscritos/receitaConfirmada) entram AQUI via Admin SDK
// (bypassa Rules) — em produção só a Cloud Function os mantém.
// NÃO executar em produção (assertEmulatorOnly).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { assertEmulatorOnly } from './emulator-guard';
import { CASTELO_TENANT_ID, MARINA_CASTELO_UID } from './tenants.seed';

export const MEIA_FLORIPA_ID = 'meia-floripa-2026';
export const MARATONA_2027_ID = 'maratona-floripa-2027';

export interface EventoSeed {
  id: string;
  tenantId: string;
  organizadorId: string;
  nome: string;
  /** Data da prova (ISO — convertida para Timestamp no seed) */
  data: string;
  local: string;
  modalidades: string[];
  slug: string;
  status: 'rascunho' | 'publicado' | 'ao_vivo' | 'encerrado';
  usaChip: boolean;
  /** Agregado ∑ — seed via Admin SDK; produção = só Function */
  qtdInscritos: number;
  /** Agregado ∑ — seed via Admin SDK; produção = só Function */
  receitaConfirmada: number;
}

export const EVENTO_SEEDS: EventoSeed[] = [
  {
    id: MEIA_FLORIPA_ID,
    tenantId: CASTELO_TENANT_ID,
    organizadorId: MARINA_CASTELO_UID,
    nome: 'Meia Maratona Floripa 2026',
    data: '2026-04-27T07:00:00-03:00',
    local: 'Florianópolis/SC',
    modalidades: ['5k', '10k', '21k'],
    slug: MEIA_FLORIPA_ID,
    status: 'publicado',
    usaChip: true,
    qtdInscritos: 453,
    receitaConfirmada: 85617,
  },
  {
    id: MARATONA_2027_ID,
    tenantId: CASTELO_TENANT_ID,
    organizadorId: MARINA_CASTELO_UID,
    nome: 'Maratona Floripa 2027',
    data: '2027-04-25T07:00:00-03:00',
    local: 'Florianópolis/SC',
    modalidades: ['42k'],
    slug: MARATONA_2027_ID,
    status: 'rascunho',
    usaChip: true,
    qtdInscritos: 0,
    receitaConfirmada: 0,
  },
];

/**
 * Popula a coleção `eventos` no Firestore (Emulator).
 * Idempotente — docIds fixos + set com merge; `criadoEm` só na criação (F8).
 */
export async function seedEventos(db: admin.firestore.Firestore): Promise<void> {
  assertEmulatorOnly('seedEventos');

  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  for (const evento of EVENTO_SEEDS) {
    const ref = db.collection('eventos').doc(evento.id);
    const snap = await ref.get();

    const data: Record<string, unknown> = {
      id: evento.id,
      tenantId: evento.tenantId,
      organizadorId: evento.organizadorId,
      nome: evento.nome,
      data: admin.firestore.Timestamp.fromDate(new Date(evento.data)),
      local: evento.local,
      modalidades: evento.modalidades,
      slug: evento.slug,
      status: evento.status,
      usaChip: evento.usaChip,
      qtdInscritos: evento.qtdInscritos,
      receitaConfirmada: evento.receitaConfirmada,
      atualizadoEm: now,
    };

    // criadoEm só na criação — rerun não regrava (F8)
    if (!snap.exists) {
      data['criadoEm'] = now;
    }

    batch.set(ref, data, { merge: true });
  }

  await batch.commit();
  console.log(
    '[seed] eventos: Meia Maratona Floripa 2026 (publicado, 453/R$85.617) + Maratona Floripa 2027 (rascunho)'
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
  seedEventos(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
