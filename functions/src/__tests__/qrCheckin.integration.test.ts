/**
 * qrCheckin.integration.test.ts — LEELA-S208-T3 (RN-221/222)
 *
 * Integração REAL no Emulator (Firestore, Admin SDK): Function
 * `registrarCheckinCore` — check-in por QR assinado, na transação.
 *
 * ⚠ PRÉ-REQUISITO: Firestore Emulator (8080) via `firebase emulators:exec`
 *   — este arquivo pertence ao GATE CONSOLIDADO do maestro (o gate local do
 *   FABLE-C-T1 roda só os units de qrToken.test.ts, sem emulator).
 *
 * Cobre (aceite S208 / brief FABLE-C-T1):
 *   - caminho válido: seta APENAS `checkinEm` (kit antecipado NÃO reabre
 *     `kitEntregueEm` — RN-222); `kitEntregueEm` preexistente é preservado
 *   - replay: 2º scan → `already-exists` (QR_JA_UTILIZADO), carimbo intacto
 *   - corrida: N check-ins simultâneos → exatamente 1 efetiva (transação)
 *   - QR adulterado / de outro evento / de outro tenant → erros DISTINTOS
 *   - cancelado / pendente / inexistente / token re-emitido → recusa
 *   - fail-closed: sem keyring → failed-precondition (QR_NAO_CONFIGURADO)
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import {
  clearFirestoreDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';
import { registrarCheckinCore } from '../eventos/registrarCheckin';
import { assinarQrToken, type QrKeyring } from '../eventos/qrToken';
import type { EventoCaller } from '../eventos/criarEvento';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';

const EVENTO_A = 'meia-floripa-2026';
const EVENTO_B = 'corrida-sem-chip-2027';

const RING: QrKeyring = {
  ativo: 'k1',
  chaves: { k1: Buffer.alloc(32, 7) },
};

const marina: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID },
};
const passoOwner: EventoCaller = {
  uid: 'uid-passo-owner',
  claims: { role: 'tenant_owner', tenantId: PASSO_ID },
};

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function tokenDe(inscritoId: string, eventoId = EVENTO_A, tenantId = CASTELO_ID): string {
  return assinarQrToken({ inscritoId, eventoId, tenantId }, RING);
}

async function expectHttpsError(
  promise: Promise<unknown>,
  code: string,
  codigo?: string
): Promise<void> {
  try {
    await promise;
    expect.unreachable(`esperava HttpsError '${code}'`);
  } catch (err) {
    expect(err).toBeInstanceOf(https.HttpsError);
    expect((err as https.HttpsError).code).toBe(code);
    if (codigo !== undefined) {
      const details = (err as https.HttpsError).details as Record<string, unknown>;
      expect(details['codigo']).toBe(codigo);
    }
  }
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function inscritoDoc(inscritoId: string, overrides: Record<string, unknown> = {}) {
  const now = FieldValue.serverTimestamp();
  return {
    tenantId: CASTELO_ID,
    atletaId: `atleta-${inscritoId}`,
    atletaNome: `Atleta ${inscritoId}`,
    kit: 'kit_prata',
    chipNumero: null,
    status: 'confirmado',
    modalidade: '10k',
    criadoEm: now,
    atualizadoEm: now,
    qrToken: tokenDe(inscritoId),
    ingressoEmitidoEm: now,
    ...overrides,
  };
}

async function seedBase(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
    status: 'ativo', ownerUid: 'uid-passo-owner', tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('eventos').doc(EVENTO_A), {
    id: EVENTO_A, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Meia Maratona Floripa 2026',
    data: Timestamp.fromDate(new Date('2026-04-27T07:00:00-03:00')),
    local: 'Florianópolis/SC', modalidades: ['5k', '10k', '21k'],
    slug: EVENTO_A, status: 'publicado', usaChip: true,
    qtdInscritos: 5, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('eventos').doc(EVENTO_B), {
    id: EVENTO_B, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Corrida Sem Chip 2027',
    data: Timestamp.fromDate(new Date('2027-03-10T07:00:00-03:00')),
    local: 'Florianópolis/SC', modalidades: ['5k'],
    slug: EVENTO_B, status: 'publicado', usaChip: false,
    qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
  });

  const inscritos = adminDb
    .collection('eventos').doc(EVENTO_A).collection('inscritos');
  batch.set(inscritos.doc('insc-ana'), inscritoDoc('insc-ana'));
  batch.set(
    inscritos.doc('insc-antecipado'),
    inscritoDoc('insc-antecipado', {
      // kit entregue dias antes (correios) — RN-222: QR na largada seta SÓ checkinEm
      kitEntregueEm: Timestamp.fromDate(new Date('2026-04-20T10:00:00-03:00')),
    })
  );
  batch.set(
    inscritos.doc('insc-cancelado'),
    inscritoDoc('insc-cancelado', { status: 'cancelado' })
  );
  batch.set(
    inscritos.doc('insc-pendente'),
    inscritoDoc('insc-pendente', { status: 'pendente' })
  );
  // ingresso NUNCA emitido: doc sem qrToken/ingressoEmitidoEm
  const semIngresso = inscritoDoc('insc-sem-ingresso') as Record<string, unknown>;
  delete semIngresso['qrToken'];
  delete semIngresso['ingressoEmitidoEm'];
  batch.set(inscritos.doc('insc-sem-ingresso'), semIngresso);
  await batch.commit();
}

// SUITE-STAB: clear+seed com triggers pausados + canários verificados.
beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
    await seedVerified(adminDb, testEnv, seedBase, [
      `tenants/${CASTELO_ID}`,
      `eventos/${EVENTO_A}`,
      `eventos/${EVENTO_A}/inscritos/insc-ana`,
      `eventos/${EVENTO_A}/inscritos/insc-sem-ingresso`,
      `eventos/${EVENTO_B}`,
    ]);
  });
}, 30_000);

function inscritoRef(inscritoId: string, eventoId = EVENTO_A) {
  return adminDb
    .collection('eventos').doc(eventoId)
    .collection('inscritos').doc(inscritoId);
}

// ── caminho válido (RN-222) ────────────────────────────────────────────────

describe('registrarCheckinCore — caminho válido', () => {
  it('seta APENAS checkinEm; kitEntregueEm permanece ausente', async () => {
    const res = await registrarCheckinCore(
      adminDb,
      { eventoId: EVENTO_A, qrToken: tokenDe('insc-ana') },
      marina,
      RING
    );
    expect(res.ok).toBe(true);
    expect(res.inscritoId).toBe('insc-ana');
    const snap = await inscritoRef('insc-ana').get();
    expect(snap.get('checkinEm')).toBeInstanceOf(Timestamp);
    expect(snap.get('kitEntregueEm')).toBeUndefined();
  });

  it('kit ANTECIPADO: checkinEm entra e kitEntregueEm NÃO é tocado (RN-222)', async () => {
    const antes = await inscritoRef('insc-antecipado').get();
    const kitEntregueAntes = (antes.get('kitEntregueEm') as Timestamp).toMillis();

    await registrarCheckinCore(
      adminDb,
      { eventoId: EVENTO_A, qrToken: tokenDe('insc-antecipado') },
      marina,
      RING
    );
    const depois = await inscritoRef('insc-antecipado').get();
    expect(depois.get('checkinEm')).toBeInstanceOf(Timestamp);
    expect((depois.get('kitEntregueEm') as Timestamp).toMillis()).toBe(kitEntregueAntes);
  });
});

// ── replay e corrida (RN-221/222) ──────────────────────────────────────────

describe('registrarCheckinCore — replay e corrida', () => {
  it('2º scan → already-exists QR_JA_UTILIZADO; carimbo NÃO muda', async () => {
    await registrarCheckinCore(
      adminDb,
      { eventoId: EVENTO_A, qrToken: tokenDe('insc-ana') },
      marina,
      RING
    );
    const primeiro = ((await inscritoRef('insc-ana').get()).get('checkinEm') as Timestamp).toMillis();

    await expectHttpsError(
      registrarCheckinCore(
        adminDb,
        { eventoId: EVENTO_A, qrToken: tokenDe('insc-ana') },
        marina,
        RING
      ),
      'already-exists',
      'QR_JA_UTILIZADO'
    );
    const segundo = ((await inscritoRef('insc-ana').get()).get('checkinEm') as Timestamp).toMillis();
    expect(segundo).toBe(primeiro); // idempotente-negativo: zero writes
  });

  it('corrida: 3 scans simultâneos → exatamente 1 efetiva (transação)', async () => {
    const chamada = () =>
      registrarCheckinCore(
        adminDb,
        { eventoId: EVENTO_A, qrToken: tokenDe('insc-ana') },
        marina,
        RING
      );
    const resultados = await Promise.allSettled([chamada(), chamada(), chamada()]);
    const ok = resultados.filter((r) => r.status === 'fulfilled');
    const falhas = resultados.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );
    expect(ok).toHaveLength(1);
    expect(falhas).toHaveLength(2);
    for (const f of falhas) {
      expect((f.reason as https.HttpsError).code).toBe('already-exists');
    }
    const snap = await inscritoRef('insc-ana').get();
    expect(snap.get('checkinEm')).toBeInstanceOf(Timestamp);
  });
});

// ── rejeições distintas (aceite S208) ──────────────────────────────────────

describe('registrarCheckinCore — rejeições', () => {
  it('QR adulterado (assinatura inválida) → permission-denied QR_ADULTERADO', async () => {
    const adulterado = tokenDe('insc-ana').slice(0, -4) + 'AAAA';
    await expectHttpsError(
      registrarCheckinCore(
        adminDb,
        { eventoId: EVENTO_A, qrToken: adulterado },
        marina,
        RING
      ),
      'permission-denied',
      'QR_ADULTERADO'
    );
    const snap = await inscritoRef('insc-ana').get();
    expect(snap.get('checkinEm')).toBeUndefined();
  });

  it('QR de OUTRO evento → failed-precondition QR_OUTRO_EVENTO', async () => {
    await expectHttpsError(
      registrarCheckinCore(
        adminDb,
        // token emitido para o EVENTO_A, escaneado no balcão do EVENTO_B
        { eventoId: EVENTO_B, qrToken: tokenDe('insc-ana') },
        marina,
        RING
      ),
      'failed-precondition',
      'QR_OUTRO_EVENTO'
    );
  });

  it('staff de OUTRO tenant escaneia → permission-denied (RN-400)', async () => {
    await expectHttpsError(
      registrarCheckinCore(
        adminDb,
        { eventoId: EVENTO_A, qrToken: tokenDe('insc-ana') },
        passoOwner,
        RING
      ),
      'permission-denied'
    );
  });

  it('cancelado → INSCRITO_CANCELADO; pendente → INSCRITO_NAO_CONFIRMADO', async () => {
    await expectHttpsError(
      registrarCheckinCore(
        adminDb,
        { eventoId: EVENTO_A, qrToken: tokenDe('insc-cancelado') },
        marina,
        RING
      ),
      'failed-precondition',
      'INSCRITO_CANCELADO'
    );
    await expectHttpsError(
      registrarCheckinCore(
        adminDb,
        { eventoId: EVENTO_A, qrToken: tokenDe('insc-pendente') },
        marina,
        RING
      ),
      'failed-precondition',
      'INSCRITO_NAO_CONFIRMADO'
    );
  });

  it('token assinado mas SEM ingresso emitido no doc → QR_ADULTERADO', async () => {
    await expectHttpsError(
      registrarCheckinCore(
        adminDb,
        { eventoId: EVENTO_A, qrToken: tokenDe('insc-sem-ingresso') },
        marina,
        RING
      ),
      'permission-denied',
      'QR_ADULTERADO'
    );
  });

  it('inscrito inexistente → not-found INSCRITO_NAO_ENCONTRADO', async () => {
    await expectHttpsError(
      registrarCheckinCore(
        adminDb,
        { eventoId: EVENTO_A, qrToken: tokenDe('insc-fantasma') },
        marina,
        RING
      ),
      'not-found',
      'INSCRITO_NAO_ENCONTRADO'
    );
  });

  it('sem keyring configurado → fail-closed QR_NAO_CONFIGURADO', async () => {
    await expectHttpsError(
      registrarCheckinCore(
        adminDb,
        { eventoId: EVENTO_A, qrToken: tokenDe('insc-ana') },
        marina,
        null
      ),
      'failed-precondition',
      'QR_NAO_CONFIGURADO'
    );
  });
});
