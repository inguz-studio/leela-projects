/**
 * entregaFunctions.integration.test.ts — LEELA-S204-T2
 *
 * Integração REAL no Emulator (Firestore, Admin SDK): Functions
 * `vincularChip` + `registrarEntrega` (RN-205/206/207) + hardening das
 * Rules de `chipNumero` (escrita exclusiva de Function).
 *
 * Cobre (aceite E03-L2):
 *   - chip livre grava; chip em OUTRO atleta sem flag → { conflito };
 *     com flag `sobrescrever` reatribui atomicamente (RN-206)
 *   - vincular o MESMO chip de novo é idempotente (sem escrita)
 *   - `usaChip=false` suprime chip (RN-207) — vincular vira erro explícito
 *   - `registrarEntrega` idempotente = presença (RN-205): kitEntregueEm +
 *     checkinEm juntos; retry não duplica nem altera carimbos
 *   - sem_kit → só checkinEm; kit antecipado → preserva kitEntregueEm
 *   - Rules: cliente NÃO cria inscrito com chip preenchido nem toca
 *     chipNumero no update (senão o conflito RN-206 seria contornável)
 *
 * Regressão B1 (QA leela-build-2d6ee98d): `vincularChip` quebrava DENTRO do
 * Functions Emulator com `admin.firestore.FieldValue` undefined (Proxy do
 * firebase-tools ≥15 — ver comentário no import modular de vincularChip.ts).
 * Este suite roda o core IN-PROCESS (o Proxy não existe aqui), então o teste
 * do vínculo normal afirma que `atualizadoEm` materializa como Timestamp real
 * — se o serverTimestamp() do import modular regredir, falha aqui; o caminho
 * proxiado do emulador é coberto pelo probe HTTP do preview (RN-206 via
 * callable, não 500).
 *
 * Pré-requisito: Firestore Emulator (8080) via emulators:exec.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { doc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import { vincularChipCore } from '../eventos/vincularChip';
import { registrarEntregaCore } from '../eventos/registrarEntrega';
import type { EventoCaller } from '../eventos/criarEvento';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';

const EVENTO_CHIP = 'meia-floripa-2026'; // usaChip=true
const EVENTO_SEM_CHIP = 'corrida-sem-chip-2027'; // usaChip=false

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

const marina: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID },
};
const passoOwner: EventoCaller = {
  uid: PASSO_OWNER_UID,
  claims: { role: 'tenant_owner', tenantId: PASSO_ID },
};
const athlete: EventoCaller = { uid: 'uid-atleta', claims: { role: 'athlete' } };

async function expectHttpsError(
  promise: Promise<unknown>,
  code: string
): Promise<void> {
  try {
    await promise;
    expect.unreachable(`esperava HttpsError '${code}'`);
  } catch (err) {
    expect(err).toBeInstanceOf(https.HttpsError);
    expect((err as https.HttpsError).code).toBe(code);
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

function inscritoDoc(overrides: Record<string, unknown> = {}) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  return {
    tenantId: CASTELO_ID,
    atletaId: 'atleta-x',
    atletaNome: 'Atleta X',
    kit: 'kit_prata',
    chipNumero: null,
    status: 'confirmado',
    modalidade: '10k',
    criadoEm: now,
    atualizadoEm: now,
    ...overrides,
  };
}

async function seedBase(): Promise<void> {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
    status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('eventos').doc(EVENTO_CHIP), {
    id: EVENTO_CHIP, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Meia Maratona Floripa 2026',
    data: admin.firestore.Timestamp.fromDate(new Date('2026-04-27T07:00:00-03:00')),
    local: 'Florianópolis/SC', modalidades: ['5k', '10k', '21k'],
    slug: EVENTO_CHIP, status: 'publicado', usaChip: true,
    qtdInscritos: 4, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('eventos').doc(EVENTO_SEM_CHIP), {
    id: EVENTO_SEM_CHIP, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Corrida Sem Chip 2027',
    data: admin.firestore.Timestamp.fromDate(new Date('2027-03-10T07:00:00-03:00')),
    local: 'Florianópolis/SC', modalidades: ['5k'],
    slug: EVENTO_SEM_CHIP, status: 'publicado', usaChip: false,
    qtdInscritos: 1, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
  });

  const inscritos = adminDb
    .collection('eventos').doc(EVENTO_CHIP).collection('inscritos');
  batch.set(inscritos.doc('insc-ana'), inscritoDoc({
    atletaId: 'atleta-ana', atletaNome: 'Ana Souza',
  }));
  batch.set(inscritos.doc('insc-bruno'), inscritoDoc({
    atletaId: 'atleta-bruno', atletaNome: 'Bruno Lima',
  }));
  batch.set(inscritos.doc('insc-semkit'), inscritoDoc({
    atletaId: 'atleta-carla', atletaNome: 'Carla Dias',
    kit: 'sem_kit', modalidade: '5k',
  }));
  batch.set(inscritos.doc('insc-pendente'), inscritoDoc({
    atletaId: 'atleta-davi', atletaNome: 'Davi Rocha', status: 'pendente',
  }));
  batch.set(inscritos.doc('insc-cancelado'), inscritoDoc({
    atletaId: 'atleta-eva', atletaNome: 'Eva Pinto', status: 'cancelado',
  }));

  const inscritosSemChip = adminDb
    .collection('eventos').doc(EVENTO_SEM_CHIP).collection('inscritos');
  batch.set(inscritosSemChip.doc('insc-livre'), inscritoDoc({
    atletaId: 'atleta-livre', atletaNome: 'Livre Silva', modalidade: '5k',
  }));

  await batch.commit();
}

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedBase();
});

function inscritoRef(inscritoId: string, eventoId = EVENTO_CHIP) {
  return adminDb
    .collection('eventos').doc(eventoId)
    .collection('inscritos').doc(inscritoId);
}

// ── vincularChip (RN-206/207) ──────────────────────────────────────────────

describe('vincularChipCore — vínculo, conflito e reatribuição (RN-206)', () => {
  it('chip LIVRE grava no inscrito (normalizado)', async () => {
    const res = await vincularChipCore(
      adminDb,
      { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana', chip: ' chip-8891 ' },
      marina
    );
    expect(res).toEqual({ ok: true, chip: 'CHIP-8891' });
    const snap = await inscritoRef('insc-ana').get();
    expect(snap.get('chipNumero')).toBe('CHIP-8891');
    // Regressão B1: serverTimestamp() do import modular firebase-admin/firestore
    // precisa materializar um Timestamp real no doc (não undefined/erro).
    expect(snap.get('atualizadoEm')).toBeInstanceOf(admin.firestore.Timestamp);
  });

  it('mesmo chip no MESMO inscrito é idempotente (jaVinculado)', async () => {
    await vincularChipCore(
      adminDb,
      { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana', chip: 'CHIP-8891' },
      marina
    );
    const antes = await inscritoRef('insc-ana').get();
    const res = await vincularChipCore(
      adminDb,
      { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana', chip: 'CHIP-8891' },
      marina
    );
    expect(res).toEqual({ ok: true, chip: 'CHIP-8891', jaVinculado: true });
    const depois = await inscritoRef('insc-ana').get();
    expect(depois.get('atualizadoEm')).toEqual(antes.get('atualizadoEm')); // sem escrita
  });

  it('chip em OUTRO atleta sem flag → { conflito } e NADA muda (RN-206)', async () => {
    await vincularChipCore(
      adminDb,
      { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana', chip: 'CHIP-8891' },
      marina
    );
    const res = await vincularChipCore(
      adminDb,
      { eventoId: EVENTO_CHIP, inscritoId: 'insc-bruno', chip: 'CHIP-8891' },
      marina
    );
    expect(res).toEqual({
      ok: false,
      conflito: { inscritoId: 'insc-ana', atletaNome: 'Ana Souza' },
    });
    // ninguém perdeu nem ganhou chip
    expect((await inscritoRef('insc-ana').get()).get('chipNumero')).toBe('CHIP-8891');
    expect((await inscritoRef('insc-bruno').get()).get('chipNumero')).toBeNull();
  });

  it('com sobrescrever=true REATRIBUI atomicamente (RN-206)', async () => {
    await vincularChipCore(
      adminDb,
      { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana', chip: 'CHIP-8891' },
      marina
    );
    const res = await vincularChipCore(
      adminDb,
      {
        eventoId: EVENTO_CHIP, inscritoId: 'insc-bruno',
        chip: 'CHIP-8891', sobrescrever: true,
      },
      marina
    );
    expect(res).toEqual({ ok: true, chip: 'CHIP-8891', reatribuido: true });
    // o chip nunca fica em dois atletas
    expect((await inscritoRef('insc-ana').get()).get('chipNumero')).toBeNull();
    expect((await inscritoRef('insc-bruno').get()).get('chipNumero')).toBe('CHIP-8891');
  });

  it('usaChip=false → failed-precondition (passo suprimido — RN-207)', async () => {
    await expectHttpsError(
      vincularChipCore(
        adminDb,
        { eventoId: EVENTO_SEM_CHIP, inscritoId: 'insc-livre', chip: 'CHIP-1' },
        marina
      ),
      'failed-precondition'
    );
  });

  it('pendente e cancelado NÃO são atendidos no balcão', async () => {
    await expectHttpsError(
      vincularChipCore(
        adminDb,
        { eventoId: EVENTO_CHIP, inscritoId: 'insc-pendente', chip: 'CHIP-2' },
        marina
      ),
      'failed-precondition'
    );
    await expectHttpsError(
      vincularChipCore(
        adminDb,
        { eventoId: EVENTO_CHIP, inscritoId: 'insc-cancelado', chip: 'CHIP-3' },
        marina
      ),
      'failed-precondition'
    );
  });

  it('chip inválido → invalid-argument (vazio, chars proibidos, >32)', async () => {
    for (const chip of ['', '  ', 'chip 1', 'x'.repeat(33)]) {
      await expectHttpsError(
        vincularChipCore(
          adminDb,
          { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana', chip },
          marina
        ),
        'invalid-argument'
      );
    }
  });

  it('cross-tenant e athlete → permission-denied (RN-400/401)', async () => {
    await expectHttpsError(
      vincularChipCore(
        adminDb,
        { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana', chip: 'CHIP-9' },
        passoOwner
      ),
      'permission-denied'
    );
    await expectHttpsError(
      vincularChipCore(
        adminDb,
        { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana', chip: 'CHIP-9' },
        athlete
      ),
      'permission-denied'
    );
  });

  it('inscrito/evento inexistente → not-found', async () => {
    await expectHttpsError(
      vincularChipCore(
        adminDb,
        { eventoId: EVENTO_CHIP, inscritoId: 'nao-existe', chip: 'CHIP-9' },
        marina
      ),
      'not-found'
    );
    await expectHttpsError(
      vincularChipCore(
        adminDb,
        { eventoId: 'nao-existe', inscritoId: 'insc-ana', chip: 'CHIP-9' },
        marina
      ),
      'not-found'
    );
  });
});

// ── registrarEntrega (RN-205) ──────────────────────────────────────────────

describe('registrarEntregaCore — retirar kit = presença (RN-205)', () => {
  it('atendimento completo: kitEntregueEm + checkinEm setados JUNTOS', async () => {
    await vincularChipCore(
      adminDb,
      { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana', chip: 'CHIP-8891' },
      marina
    );
    const res = await registrarEntregaCore(
      adminDb,
      { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana' },
      marina
    );
    expect(res).toEqual({ ok: true, jaRegistrado: false });

    const snap = await inscritoRef('insc-ana').get();
    expect(snap.get('kitEntregueEm')).toBeTruthy();
    expect(snap.get('checkinEm')).toBeTruthy();
  });

  it('IDEMPOTENTE: repetir não duplica nem altera carimbos (aceite L2)', async () => {
    await vincularChipCore(
      adminDb,
      { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana', chip: 'CHIP-8891' },
      marina
    );
    await registrarEntregaCore(
      adminDb, { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana' }, marina
    );
    const antes = await inscritoRef('insc-ana').get();

    const res = await registrarEntregaCore(
      adminDb, { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana' }, marina
    );
    expect(res).toEqual({ ok: true, jaRegistrado: true });

    const depois = await inscritoRef('insc-ana').get();
    expect(depois.get('kitEntregueEm')).toEqual(antes.get('kitEntregueEm'));
    expect(depois.get('checkinEm')).toEqual(antes.get('checkinEm'));
  });

  it('sem_kit: registra SÓ presença (checkinEm) — sem kitEntregueEm', async () => {
    await vincularChipCore(
      adminDb,
      { eventoId: EVENTO_CHIP, inscritoId: 'insc-semkit', chip: 'CHIP-77' },
      marina
    );
    const res = await registrarEntregaCore(
      adminDb, { eventoId: EVENTO_CHIP, inscritoId: 'insc-semkit' }, marina
    );
    expect(res.ok).toBe(true);

    const snap = await inscritoRef('insc-semkit').get();
    expect(snap.get('checkinEm')).toBeTruthy();
    expect(snap.get('kitEntregueEm')).toBeUndefined();
  });

  it('evento usa chip e inscrito SEM chip → failed-precondition', async () => {
    await expectHttpsError(
      registrarEntregaCore(
        adminDb, { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana' }, marina
      ),
      'failed-precondition'
    );
  });

  it('evento SEM chip fecha atendimento direto (RN-207 por omissão)', async () => {
    const res = await registrarEntregaCore(
      adminDb, { eventoId: EVENTO_SEM_CHIP, inscritoId: 'insc-livre' }, marina
    );
    expect(res).toEqual({ ok: true, jaRegistrado: false });
    const snap = await inscritoRef('insc-livre', EVENTO_SEM_CHIP).get();
    expect(snap.get('checkinEm')).toBeTruthy();
    expect(snap.get('kitEntregueEm')).toBeTruthy();
  });

  it('kit ANTECIPADO: preserva kitEntregueEm original, só seta checkinEm', async () => {
    const entregaAntecipada = admin.firestore.Timestamp.fromDate(
      new Date('2026-04-20T14:00:00-03:00')
    );
    await inscritoRef('insc-bruno').update({
      kitEntregueEm: entregaAntecipada,
      chipNumero: 'CHIP-55',
    });

    const res = await registrarEntregaCore(
      adminDb, { eventoId: EVENTO_CHIP, inscritoId: 'insc-bruno' }, marina
    );
    expect(res).toEqual({ ok: true, jaRegistrado: false });

    const snap = await inscritoRef('insc-bruno').get();
    expect(snap.get('kitEntregueEm')).toEqual(entregaAntecipada); // intacto
    expect(snap.get('checkinEm')).toBeTruthy();
  });

  it('pendente/cancelado não retiram kit; cross-tenant negado', async () => {
    await expectHttpsError(
      registrarEntregaCore(
        adminDb, { eventoId: EVENTO_CHIP, inscritoId: 'insc-pendente' }, marina
      ),
      'failed-precondition'
    );
    await expectHttpsError(
      registrarEntregaCore(
        adminDb, { eventoId: EVENTO_CHIP, inscritoId: 'insc-ana' }, passoOwner
      ),
      'permission-denied'
    );
  });
});

// ── Rules: chipNumero é escrita exclusiva de Function ──────────────────────

describe('Rules — chipNumero fora do alcance do cliente (S204-T2)', () => {
  const marinaClaims = { role: 'tenant_owner', tenantId: CASTELO_ID };

  function clientDb(): Firestore {
    return testEnv
      .authenticatedContext(MARINA_UID, marinaClaims)
      .firestore() as unknown as Firestore;
  }

  it('cliente NÃO cria inscrito com chip preenchido (só null — RN-203)', async () => {
    const db = clientDb();
    await assertFails(
      setDoc(doc(db, 'eventos', EVENTO_CHIP, 'inscritos', 'insc-chip-forjado'), {
        id: 'insc-chip-forjado', tenantId: CASTELO_ID,
        atletaId: 'a', atletaNome: 'Forjador', kit: 'kit_basico',
        chipNumero: 'CHIP-FORJADO', status: 'confirmado', modalidade: '5k',
      })
    );
    // com chip null segue permitido (contrato do create preservado)
    await assertSucceeds(
      setDoc(doc(db, 'eventos', EVENTO_CHIP, 'inscritos', 'insc-chip-null'), {
        id: 'insc-chip-null', tenantId: CASTELO_ID,
        atletaId: 'a', atletaNome: 'Ok', kit: 'kit_basico',
        chipNumero: null, status: 'confirmado', modalidade: '5k',
      })
    );
  });

  it('cliente NÃO escreve chipNumero no update (senão RN-206 é contornável)', async () => {
    const db = clientDb();
    await assertFails(
      updateDoc(doc(db, 'eventos', EVENTO_CHIP, 'inscritos', 'insc-ana'), {
        chipNumero: 'CHIP-BYPASS',
      })
    );
    // nem para "limpar" um chip JÁ vinculado (vínculo via Function/Admin —
    // null→null seria no-op e não prova nada)
    await inscritoRef('insc-ana').update({ chipNumero: 'CHIP-8891' });
    await assertFails(
      updateDoc(doc(db, 'eventos', EVENTO_CHIP, 'inscritos', 'insc-ana'), {
        chipNumero: null,
      })
    );
    // outros campos seguem editáveis
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', EVENTO_CHIP, 'inscritos', 'insc-ana'), {
        modalidade: '21k',
      })
    );
  });
});
