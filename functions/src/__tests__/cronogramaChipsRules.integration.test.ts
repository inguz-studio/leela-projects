/**
 * cronogramaChipsRules.integration.test.ts — LEELA-FABLE-F-T1
 *
 * ⚠ GATE CONSOLIDADO (maestro): exige Firestore Emulator na porta 8080
 * (via emulators:exec) — NÃO roda no gate determinístico local do lote.
 *
 * Integração (Emulator): Security Rules dos campos novos do `Evento` —
 * `janelasEntrega` (cronograma de entrega) e `faixaChips`.
 *
 * Cobre:
 *   - organizador (tenant_owner) ESCREVE cronograma + faixa válidos
 *     (decisão F-T1: campos do organizador via cliente — padrão vigente dos
 *     campos descritivos do evento);
 *   - shape negado: faixa invertida/float/chave extra/não-map; cronograma
 *     não-lista; cronograma acima do teto (30);
 *   - NENHUMA rule afrouxada: agregados ∑ e `status` seguem intocáveis
 *     mesmo num write com cronograma válido; cross-tenant e promoter
 *     seguem negados; create ainda nasce 'rascunho';
 *   - seed de preview da Meia parseia no core (contrato seed ↔ parseEvento).
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
import { doc, getDoc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { parseEvento, type JanelaEntrega } from '@leela/core';
import { MEIA_FLORIPA_ID, seedEventos } from '../seed/eventos.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';
const PROMOTER_UID = 'uid-promoter-castelo';

const ARENA = 'Arena Meia Floripa — Beira-Mar Norte';
const JANELAS_VALIDAS: JanelaEntrega[] = [
  { dia: '2026-04-25', horaInicio: '10:00', horaFim: '20:00', local: ARENA },
  { dia: '2026-04-26', horaInicio: '10:00', horaFim: '18:00', local: ARENA },
];
const FAIXA_VALIDA = { inicio: 8001, fim: 8600 };

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

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedFixtures();
});

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

  // Seed canônico (Meia Floripa 2026 — inclui cronograma + faixa do F-T1)
  await seedEventos(adminDb);
}

function ctxDb(uid: string, claims: Record<string, unknown>): Firestore {
  return testEnv
    .authenticatedContext(uid, claims)
    .firestore() as unknown as Firestore;
}

function marinaDb(): Firestore {
  return ctxDb(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
}

const meiaRef = (db: Firestore) => doc(db, 'eventos', MEIA_FLORIPA_ID);

// ── Seed de preview ↔ contrato do core ─────────────────────────────────────

describe('seed de preview do F-T1 (Meia Floripa)', () => {
  it('grava cronograma + faixa e o parseEvento do core aceita', async () => {
    const snap = await adminDb.collection('eventos').doc(MEIA_FLORIPA_ID).get();
    const evento = parseEvento(snap.id, snap.data() ?? {});
    expect(evento.janelasEntrega).toHaveLength(3);
    expect(evento.janelasEntrega?.[0]?.dia).toBe('2026-04-25');
    expect(evento.faixaChips).toEqual({ inicio: 8001, fim: 8600 });
  });
});

// ── Escrita do organizador (decisão F-T1) ──────────────────────────────────

describe('organizador escreve cronograma + faixa (padrão vigente do evento)', () => {
  it('update com janelasEntrega + faixaChips válidos SUCEDE', async () => {
    await assertSucceeds(
      updateDoc(meiaRef(marinaDb()), {
        janelasEntrega: JANELAS_VALIDAS,
        faixaChips: FAIXA_VALIDA,
      })
    );
  });

  it('faixaChips: null explícito (desconfigurar) SUCEDE', async () => {
    await assertSucceeds(updateDoc(meiaRef(marinaDb()), { faixaChips: null }));
  });

  it('create de evento com cronograma válido nasce rascunho e SUCEDE', async () => {
    await assertSucceeds(
      setDoc(doc(marinaDb(), 'eventos', 'corrida-nova-2027'), {
        id: 'corrida-nova-2027', tenantId: CASTELO_ID,
        organizadorId: MARINA_UID, nome: 'Corrida Nova 2027',
        data: new Date('2027-03-01T07:00:00-03:00'),
        local: 'Florianópolis/SC', modalidades: ['5k'],
        slug: 'corrida-nova-2027', status: 'rascunho', usaChip: true,
        qtdInscritos: 0, receitaConfirmada: 0,
        janelasEntrega: JANELAS_VALIDAS, faixaChips: FAIXA_VALIDA,
        criadoEm: new Date(), atualizadoEm: new Date(),
      })
    );
  });
});

// ── Shape negado ────────────────────────────────────────────────────────────

describe('shape dos campos novos (defesa em profundidade)', () => {
  it('faixa invertida (fim < início) NEGADA', async () => {
    await assertFails(
      updateDoc(meiaRef(marinaDb()), { faixaChips: { inicio: 8600, fim: 8001 } })
    );
  });

  it('faixa com float NEGADA (is int)', async () => {
    await assertFails(
      updateDoc(meiaRef(marinaDb()), { faixaChips: { inicio: 8001.5, fim: 8600 } })
    );
  });

  it('faixa com chave extra NEGADA (hasOnly)', async () => {
    await assertFails(
      updateDoc(meiaRef(marinaDb()), {
        faixaChips: { inicio: 8001, fim: 8600, sobra: true },
      })
    );
  });

  it('faixa não-map e faixa incompleta NEGADAS', async () => {
    await assertFails(updateDoc(meiaRef(marinaDb()), { faixaChips: '8001-8600' }));
    await assertFails(updateDoc(meiaRef(marinaDb()), { faixaChips: { inicio: 8001 } }));
  });

  it('janelasEntrega não-lista NEGADA', async () => {
    await assertFails(updateDoc(meiaRef(marinaDb()), { janelasEntrega: 'amanhã' }));
  });

  it('janelasEntrega acima do teto (31 > 30) NEGADA', async () => {
    const bomba = Array.from({ length: 31 }, (_, i) => ({
      dia: '2026-04-25', horaInicio: '10:00', horaFim: '20:00', local: `Tenda ${i}`,
    }));
    await assertFails(updateDoc(meiaRef(marinaDb()), { janelasEntrega: bomba }));
  });
});

// ── Nenhuma rule afrouxada ──────────────────────────────────────────────────

describe('guardas existentes seguem valendo (zero afrouxamento)', () => {
  it('cronograma válido NÃO abre brecha para tocar agregados ∑', async () => {
    await assertFails(
      updateDoc(meiaRef(marinaDb()), {
        janelasEntrega: JANELAS_VALIDAS,
        qtdInscritos: 9999,
      })
    );
  });

  it('cronograma válido NÃO abre brecha para tocar status (ADR-005)', async () => {
    await assertFails(
      updateDoc(meiaRef(marinaDb()), {
        janelasEntrega: JANELAS_VALIDAS,
        status: 'encerrado',
      })
    );
  });

  it('writer de OUTRO tenant não escreve cronograma (ADR-009)', async () => {
    const passoDb = ctxDb(PASSO_OWNER_UID, {
      role: 'tenant_owner',
      tenantId: PASSO_ID,
    });
    await assertFails(
      updateDoc(meiaRef(passoDb), { janelasEntrega: JANELAS_VALIDAS })
    );
  });

  it('promoter (membro sem papel de escrita) não escreve cronograma', async () => {
    const promoterDb = ctxDb(PROMOTER_UID, {
      role: 'promoter',
      tenantId: CASTELO_ID,
    });
    await assertFails(
      updateDoc(meiaRef(promoterDb), { janelasEntrega: JANELAS_VALIDAS })
    );
  });

  it('membro do tenant segue LENDO o evento com os campos novos', async () => {
    const snap = await assertSucceeds(getDoc(meiaRef(marinaDb())));
    expect(snap.exists()).toBe(true);
    expect(snap.data()?.['faixaChips']).toEqual({ inicio: 8001, fim: 8600 });
  });
});
