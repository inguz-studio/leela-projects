// =============================================================================
// functions/src/seed/registros.seed.ts
//
// Seed de ATLETAS mínimos + REGISTROS de ação da jornada (LEELA-S1307-T1 ·
// E13 adiantado · Onda 2 T2-L2 — decisão aberta nº 5 do brief: o auth/model
// do atleta é Onda 3; o backend de jornada é testado via seed no Emulator).
//
// Atletas = os MESMOS uids dos membros canônicos do clube CPS
// (membros.seed.ts) — Aline e Bruno registram ações na "Preparação Meia
// Floripa 2026" (desafio C · janela 2026-03-01..04-26).
//
// Registros determinísticos (docIds e datas fixos) desenhados para
// exercitar a RN-115:
//   - Aline 2026-03-02: correr + ler + meditar (3 pilares ⇒ +20% no dia)
//     e 5 dias distintos na semana 2026-W10 (⇒ +10% na semana, acumula);
//   - Bruno: 2 dias simples (sem bônus).
//
// A participação nasce AQUI via seedParticipantes (participantes.seed.ts —
// mesmo caminho privilegiado do entrarNoDesafio) e o agregado sai da MESMA
// rotina da Function (recomputarParticipacao) — nunca chumbado.
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { recomputarParticipacao } from '../jornada/onRegistroWrite';
import { assertEmulatorOnly } from './emulator-guard';
import { CLUBE_CPS_SLUG, seedClubes } from './clubes.seed';
import { seedDesafios } from './desafios.seed';
import { seedParticipantes } from './participantes.seed';

export const ATLETA_ALINE_UID = 'uid-aline-barros';
export const ATLETA_BRUNO_UID = 'uid-bruno-aguiar';
export const DESAFIO_SEED_ID = 'preparacao-meia-floripa';

interface RegistroSeedSpec {
  id: string;
  uid: string;
  acaoRef: string;
  pilar: 'fisico' | 'mental' | 'espiritual';
  quantidade: number;
  unidade: string;
  dataIso: string; // instante UTC fixo (determinístico)
  origem: 'manual' | 'assessoria';
}

/**
 * Semana 2026-W10 = 2026-03-02 (segunda) .. 2026-03-08 (domingo) — dentro
 * da janela do desafio (2026-03-01..2026-04-26).
 */
const REGISTROS_SEED: readonly RegistroSeedSpec[] = [
  // ── Aline · 2026-03-02 — 3 pilares no MESMO dia (+20%) ──────────────────
  { id: 'reg-aline-01', uid: ATLETA_ALINE_UID, acaoRef: 'correr', pilar: 'fisico', quantidade: 5, unidade: 'km', dataIso: '2026-03-02T10:00:00Z', origem: 'manual' },
  { id: 'reg-aline-02', uid: ATLETA_ALINE_UID, acaoRef: 'ler', pilar: 'mental', quantidade: 20, unidade: 'paginas', dataIso: '2026-03-02T21:00:00Z', origem: 'manual' },
  { id: 'reg-aline-03', uid: ATLETA_ALINE_UID, acaoRef: 'meditar', pilar: 'espiritual', quantidade: 10, unidade: 'min', dataIso: '2026-03-02T22:00:00Z', origem: 'manual' },
  // ── Aline · +4 dias na semana W10 (5 dias distintos ⇒ +10%) ─────────────
  { id: 'reg-aline-04', uid: ATLETA_ALINE_UID, acaoRef: 'caminhar', pilar: 'fisico', quantidade: 3, unidade: 'km', dataIso: '2026-03-03T10:00:00Z', origem: 'manual' },
  { id: 'reg-aline-05', uid: ATLETA_ALINE_UID, acaoRef: 'journaling', pilar: 'mental', quantidade: 1, unidade: 'sessoes', dataIso: '2026-03-04T10:00:00Z', origem: 'manual' },
  { id: 'reg-aline-06', uid: ATLETA_ALINE_UID, acaoRef: 'gratidao-diaria', pilar: 'espiritual', quantidade: 1, unidade: 'dias', dataIso: '2026-03-05T10:00:00Z', origem: 'manual' },
  { id: 'reg-aline-07', uid: ATLETA_ALINE_UID, acaoRef: 'correr', pilar: 'fisico', quantidade: 8, unidade: 'km', dataIso: '2026-03-06T10:00:00Z', origem: 'assessoria' },
  // ── Bruno · 2 dias simples (sem bônus) ───────────────────────────────────
  { id: 'reg-bruno-01', uid: ATLETA_BRUNO_UID, acaoRef: 'musculacao', pilar: 'fisico', quantidade: 1, unidade: 'sessoes', dataIso: '2026-03-10T10:00:00Z', origem: 'manual' },
  { id: 'reg-bruno-02', uid: ATLETA_BRUNO_UID, acaoRef: 'meditar', pilar: 'espiritual', quantidade: 20, unidade: 'min', dataIso: '2026-03-12T10:00:00Z', origem: 'manual' },
];

/** Atletas globais mínimos (`atletas/{uid}` — ADR-009: identidade global). */
const ATLETAS_SEED = [
  { uid: ATLETA_ALINE_UID, nome: 'Aline Barros', email: 'aline.barros@example.com', avatarInit: 'AB' },
  { uid: ATLETA_BRUNO_UID, nome: 'Bruno Aguiar', email: 'bruno.aguiar@example.com', avatarInit: 'BA' },
] as const;

/**
 * Popula atletas mínimos + registros da jornada e agrega a participação
 * pela MESMA rotina da Function. Idempotente: docIds/datas fixos; o
 * recompute converge sempre.
 */
export async function seedRegistros(
  db: admin.firestore.Firestore
): Promise<void> {
  assertEmulatorOnly('seedRegistros');

  // Pré-requisitos: clube + desafios canônicos + participações
  await seedClubes(db);
  await seedDesafios(db);
  await seedParticipantes(db);

  // Atletas pais mínimos (doc global — subcoleção registros mora nele)
  for (const atleta of ATLETAS_SEED) {
    const ref = db.collection('atletas').doc(atleta.uid);
    const snap = await ref.get();
    const data: Record<string, unknown> = {
      id: atleta.uid,
      nome: atleta.nome,
      email: atleta.email,
      avatarInit: atleta.avatarInit,
    };
    if (!snap.exists) data['criadoEm'] = FieldValue.serverTimestamp();
    await ref.set(data, { merge: true });
  }

  // Registros determinísticos
  const batch = db.batch();
  for (const spec of REGISTROS_SEED) {
    batch.set(
      db.collection('atletas').doc(spec.uid).collection('registros').doc(spec.id),
      {
        id: spec.id,
        acaoRef: spec.acaoRef,
        pilar: spec.pilar,
        quantidade: spec.quantidade,
        unidade: spec.unidade,
        data: Timestamp.fromDate(new Date(spec.dataIso)),
        origem: spec.origem,
        clubeId: CLUBE_CPS_SLUG,
        desafioId: DESAFIO_SEED_ID,
        criadoEm: Timestamp.fromDate(new Date(spec.dataIso)),
      }
    );
  }
  await batch.commit();

  // Agregação pela MESMA rotina da Function (o Emulator de testes não sobe
  // o Functions runtime — o seed materializa o efeito do trigger)
  for (const uid of [ATLETA_ALINE_UID, ATLETA_BRUNO_UID]) {
    await recomputarParticipacao(db, uid, CLUBE_CPS_SLUG, DESAFIO_SEED_ID);
  }

  console.log(
    `[seed] registros: ${REGISTROS_SEED.length} registros (Aline 7 · Bruno 2) ` +
      `no desafio ${DESAFIO_SEED_ID} — participação agregada via recompute`
  );
}

// ---------------------------------------------------------------------------
// Entry point (execução direta)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  seedRegistros(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
