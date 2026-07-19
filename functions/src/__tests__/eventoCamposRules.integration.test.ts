/**
 * eventoCamposRules.integration.test.ts — LEELA-EVENTO-CAMPOS
 *
 * Integração (Emulator): Security Rules dos 3 campos novos do evento
 * (RN-153 capa/regulamento + RN-347 taxaModo).
 *
 * Cobre (por TENTATIVA DE QUEBRA — padrão eventosRules):
 *   - capa: http(s) passa; javascript:/data:/gigante NEGADAS (create e update)
 *   - regulamento: texto normal passa; acima de 50k NEGADO (anti doc-bomba)
 *   - taxaModo: enum fechado (create/update); null/lixo NEGADOS
 *   - RN-347: taxaModo CONGELA com venda (Meia Floripa, ∑ 453) — troca e
 *     remoção negadas; SEM venda (Maratona 2027, ∑ 0) troca livre
 *   - RN-200 NÃO congela capa/regulamento: editáveis mesmo COM venda
 *   - cross-tenant: owner de B não escreve os campos novos em evento de A
 *   - platform_admin segue com poder de correção (papel de plataforma)
 *
 * Pré-requisito: Firestore Emulator na porta 8080 (via emulators:exec).
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
import {
  deleteField,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  MARATONA_2027_ID,
  MEIA_FLORIPA_ID,
  seedEventos,
} from '../seed/eventos.seed';
import {
  clearFirestoreDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';
const PLATFORM_ADMIN_UID = 'uid-platform-admin';

const CAPA_OK = 'https://cdn.leela.run/capa-meia-floripa.jpg';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

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

// SUITE-STAB: clear+seed com triggers pausados + canários verificados.
beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
    await seedVerified(adminDb, testEnv, () => seedFixtures(), [
      `tenants/${CASTELO_ID}`,
      `tenants/${PASSO_ID}`,
      `eventos/${MEIA_FLORIPA_ID}`,
      `eventos/${MARATONA_2027_ID}`,
    ]);
  });
}, 30_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

async function seedFixtures(): Promise<void> {
  const now = FieldValue.serverTimestamp();
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
  await batch.commit();

  // Seed canônico (Meia Floripa COM venda ∑453; Maratona 2027 SEM venda ∑0)
  await seedEventos(adminDb);

  // Modo estampado no evento COM venda — alvo do teste de congelamento
  await adminDb.doc(`eventos/${MEIA_FLORIPA_ID}`).update({ taxaModo: 'incorporada' });
  await adminDb.doc(`eventos/${MARATONA_2027_ID}`).update({ taxaModo: 'incorporada' });
}

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}

function marinaDb(): Firestore {
  return ctxAs(MARINA_UID, {
    role: 'tenant_owner',
    tenantId: CASTELO_ID,
  }).firestore() as unknown as Firestore;
}

function passoDb(): Firestore {
  return ctxAs(PASSO_OWNER_UID, {
    role: 'tenant_owner',
    tenantId: PASSO_ID,
  }).firestore() as unknown as Firestore;
}

function novoEventoBase(id: string): Record<string, unknown> {
  return {
    id, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Corrida Nova', status: 'rascunho',
  };
}

// ── Capa (RN-153) ──────────────────────────────────────────────────────────

describe('capa — URL http(s) curta; javascript:/data: nunca entram', () => {
  it('create com capa https passa; update também (mesmo COM venda — RN-200 não congela)', async () => {
    const db = marinaDb();
    await assertSucceeds(
      setDoc(doc(db, 'eventos', 'com-capa'), {
        ...novoEventoBase('com-capa'),
        imagemUrl: CAPA_OK,
      })
    );
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), { imagemUrl: CAPA_OK })
    );
    const snap = await getDoc(doc(db, 'eventos', MEIA_FLORIPA_ID));
    expect(snap.data()?.['imagemUrl']).toBe(CAPA_OK);
  });

  it('capa null (remover) e capa via deleteField passam', async () => {
    const db = marinaDb();
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), { imagemUrl: null })
    );
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), { imagemUrl: deleteField() })
    );
  });

  it('javascript:/data:/relativa/número são NEGADAS no create', async () => {
    const db = marinaDb();
    for (const [id, url] of [
      ['capa-js', 'javascript:alert(document.cookie)'],
      ['capa-data', 'data:text/html;base64,PHNjcmlwdD4='],
      ['capa-rel', '/uploads/x.png'],
      ['capa-num', 42],
    ] as const) {
      await assertFails(
        setDoc(doc(db, 'eventos', id), {
          ...novoEventoBase(id),
          imagemUrl: url,
        })
      );
    }
  });

  it('capa javascript: e capa gigante (>2048) são NEGADAS no update', async () => {
    const db = marinaDb();
    await assertFails(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), {
        imagemUrl: 'javascript:alert(1)',
      })
    );
    await assertFails(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), {
        imagemUrl: `https://a.com/${'x'.repeat(2048)}`,
      })
    );
  });
});

// ── Regulamento (RN-153) ───────────────────────────────────────────────────

describe('regulamento — texto com teto; editável mesmo com venda', () => {
  it('texto normal passa no create e no update COM venda', async () => {
    const db = marinaDb();
    await assertSucceeds(
      setDoc(doc(db, 'eventos', 'com-regulamento'), {
        ...novoEventoBase('com-regulamento'),
        regulamento: 'Art. 1º — A prova acontece com chuva ou sol.',
      })
    );
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), {
        regulamento: 'Art. 2º — Retirada de kit mediante documento.',
      })
    );
  });

  it('regulamento acima de 50k é NEGADO (anti doc-bomba)', async () => {
    const db = marinaDb();
    const gigante = 'x'.repeat(50_001);
    await assertFails(
      setDoc(doc(db, 'eventos', 'regulamento-bomba'), {
        ...novoEventoBase('regulamento-bomba'),
        regulamento: gigante,
      })
    );
    await assertFails(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), { regulamento: gigante })
    );
  });

  it('regulamento não-string é NEGADO', async () => {
    const db = marinaDb();
    await assertFails(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), { regulamento: 42 })
    );
  });
});

// ── taxaModo (RN-347) ──────────────────────────────────────────────────────

describe('taxaModo — enum fechado + congela com venda (RN-347)', () => {
  it('create com modo válido passa; lixo e null NEGADOS', async () => {
    const db = marinaDb();
    await assertSucceeds(
      setDoc(doc(db, 'eventos', 'modo-ok'), {
        ...novoEventoBase('modo-ok'),
        taxaModo: 'repassada',
      })
    );
    await assertFails(
      setDoc(doc(db, 'eventos', 'modo-lixo'), {
        ...novoEventoBase('modo-lixo'),
        taxaModo: 'gratis',
      })
    );
    await assertFails(
      setDoc(doc(db, 'eventos', 'modo-null'), {
        ...novoEventoBase('modo-null'),
        taxaModo: null,
      })
    );
  });

  it('SEM venda (∑ 0): organizador troca o modo livremente', async () => {
    const db = marinaDb();
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MARATONA_2027_ID), { taxaModo: 'repassada' })
    );
    const snap = await getDoc(doc(db, 'eventos', MARATONA_2027_ID));
    expect(snap.data()?.['taxaModo']).toBe('repassada');
  });

  it('COM venda (∑ 453): trocar o modo é NEGADO — mexe em dinheiro vendido', async () => {
    const db = marinaDb();
    await assertFails(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), { taxaModo: 'repassada' })
    );
  });

  it('COM venda: REMOVER o campo (deleteField) também é NEGADO', async () => {
    const db = marinaDb();
    await assertFails(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), { taxaModo: deleteField() })
    );
  });

  it('COM venda: update de outros campos SEM tocar o modo segue passando', async () => {
    const db = marinaDb();
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), {
        local: 'Beira-Mar Norte, Florianópolis/SC',
      })
    );
    const snap = await getDoc(doc(db, 'eventos', MEIA_FLORIPA_ID));
    expect(snap.data()?.['taxaModo']).toBe('incorporada');
  });

  it('update para modo lixo é NEGADO mesmo sem venda', async () => {
    const db = marinaDb();
    await assertFails(
      updateDoc(doc(db, 'eventos', MARATONA_2027_ID), { taxaModo: 'meio-a-meio' })
    );
  });

  it('platform_admin PODE corrigir o modo com venda (papel de plataforma)', async () => {
    const db = ctxAs(PLATFORM_ADMIN_UID, {
      role: 'platform_admin',
    }).firestore() as unknown as Firestore;
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), { taxaModo: 'repassada' })
    );
  });
});

// ── Cross-tenant (ADR-009) ─────────────────────────────────────────────────

describe('campos novos — cross-tenant negado', () => {
  it('owner de B NÃO escreve capa/regulamento/taxaModo em evento de A', async () => {
    const db = passoDb();
    await assertFails(
      updateDoc(doc(db, 'eventos', MARATONA_2027_ID), { imagemUrl: CAPA_OK })
    );
    await assertFails(
      updateDoc(doc(db, 'eventos', MARATONA_2027_ID), { regulamento: 'hijack' })
    );
    await assertFails(
      updateDoc(doc(db, 'eventos', MARATONA_2027_ID), { taxaModo: 'repassada' })
    );
  });
});

// ── vendaSomentePorCupom (RN-303 · S1804 · review antagonista O3-L1 #1) ────

describe('vendaSomentePorCupom — owner-only + boolean estrito', () => {
  it('OWNER liga e desliga o modo cupom-only', async () => {
    const db = marinaDb();
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MARATONA_2027_ID), { vendaSomentePorCupom: true })
    );
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MARATONA_2027_ID), { vendaSomentePorCupom: false })
    );
  });

  it('STAFF NÃO toca o flag (abriria evento fechado — MAJOR da review)', async () => {
    await adminDb.doc(`eventos/${MEIA_FLORIPA_ID}`).update({ vendaSomentePorCupom: true });
    const staff = ctxAs('uid-castelo-staff', {
      role: 'tenant_staff',
      tenantId: CASTELO_ID,
    }).firestore() as unknown as Firestore;
    await assertFails(
      updateDoc(doc(staff, 'eventos', MEIA_FLORIPA_ID), { vendaSomentePorCupom: false })
    );
    // Staff segue editando campo NÃO-protegido (regressão: guarda é só do flag)
    await assertSucceeds(
      updateDoc(doc(staff, 'eventos', MEIA_FLORIPA_ID), { imagemUrl: CAPA_OK })
    );
  });

  it('lixo no flag (string/número) NEGADO no create e no update', async () => {
    const db = marinaDb();
    await assertFails(
      updateDoc(doc(db, 'eventos', MARATONA_2027_ID), { vendaSomentePorCupom: 'true' })
    );
    await assertFails(
      setDoc(doc(db, 'eventos', 'evento-cupom-lixo'), {
        ...novoEventoBase('evento-cupom-lixo'),
        vendaSomentePorCupom: 1,
      })
    );
  });

  it('cross-tenant: owner de B não toca o flag em evento de A', async () => {
    await assertFails(
      updateDoc(doc(passoDb(), 'eventos', MARATONA_2027_ID), { vendaSomentePorCupom: true })
    );
  });
});
