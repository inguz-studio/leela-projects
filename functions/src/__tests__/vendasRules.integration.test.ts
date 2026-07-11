/**
 * vendasRules.integration.test.ts — LEELA-S300-T1 (E04 · ADR-012)
 *
 * Integração (⚠️ EXIGE Firestore Emulator na 8080 — gate CONSOLIDADO do
 * maestro, NÃO roda no gate serial da task): Security Rules reais do kernel de
 * vendas (lotes/cupons/paginaVendas) sob `eventos/{id}`.
 *
 * Cobre:
 *   - LOTES: membro lê preço; cross-tenant não; `vendidos` só-Function
 *     (create 0, update intocado); congelamento comercial após venda do lote
 *     (RN-200/300 per-lote); writer edita lote sem venda; delete só sem venda.
 *   - CUPONS: leitura SÓ writer (promoter/membro NÃO lê — lição do catch-all
 *     A-T2, agora estendida a cupons); docId == codigo; `usos` só-Function.
 *   - PAGINA VENDAS: membro lê; `publicada`/`publicadaEm` só-Function.
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { seedEventos, MEIA_FLORIPA_ID } from '../seed/eventos.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo';
const PROMOTER_UID = 'uid-promoter-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';

const marina = { role: 'tenant_owner', tenantId: CASTELO_ID }; // writer
const promoter = { role: 'promoter', tenantId: CASTELO_ID }; // membro, não-writer
const passo = { role: 'tenant_owner', tenantId: PASSO_ID }; // cross-tenant

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

const jan = () => Timestamp.fromDate(new Date('2027-02-01T00:00:00-03:00'));
const fev = () => Timestamp.fromDate(new Date('2027-04-01T00:00:00-03:00'));

/** Payload de lote válido para create de cliente (sem vendidos). */
function lotePayload(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'novo-lote',
    tenantId: CASTELO_ID,
    modalidade: '5k',
    ordem: 9,
    nome: 'Lote Teste',
    inicioEm: jan(),
    fimEm: fev(),
    quantidadeLimite: 100,
    preco: 99,
    criadoEm: jan(),
    atualizadoEm: jan(),
    ...over,
  };
}

function cupomPayload(codigo: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: codigo,
    tenantId: CASTELO_ID,
    codigo,
    tipo: 'percentual',
    valor: 15,
    tetoUso: 50,
    inicioEm: jan(),
    fimEm: fev(),
    criadoEm: jan(),
    atualizadoEm: jan(),
    ...over,
  };
}

function paginaPayload(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'config2',
    tenantId: CASTELO_ID,
    eventoId: MEIA_FLORIPA_ID,
    secoes: [{ id: 'checkout', canal: 'sistema', ativa: true, travada: true }],
    seo: { titulo: 'T', descricao: 'D', slugAmigavel: '{DOMINIO_LEELA}/x' },
    criadoEm: jan(),
    atualizadoEm: jan(),
    ...over,
  };
}

async function seedTenantsBase(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo', slug: PASSO_ID,
    status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor', criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

const lote = (db: Firestore, id: string) => doc(db, 'eventos', MEIA_FLORIPA_ID, 'lotes', id);
const cupom = (db: Firestore, id: string) => doc(db, 'eventos', MEIA_FLORIPA_ID, 'cupons', id);
const pagina = (db: Firestore, id: string) => doc(db, 'eventos', MEIA_FLORIPA_ID, 'paginaVendas', id);

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_PATH, 'utf8'), host: 'localhost', port: 8080 },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
  await testEnv.clearFirestore();
  await seedTenantsBase();
  await seedEventos(adminDb); // grava eventos + lotes/cupons/paginaVendas
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('lotes — leitura e fronteira de venda (∑ só-Function)', () => {
  it('organizador (writer) e promoter (membro) leem o lote; cross-tenant não', async () => {
    await assertSucceeds(getDoc(lote(dbAs(MARINA_UID, marina), '5k-lote-1')));
    await assertSucceeds(getDoc(lote(dbAs(PROMOTER_UID, promoter), '5k-lote-1')));
    await assertFails(getDoc(lote(dbAs(PASSO_OWNER_UID, passo), '5k-lote-1')));
  });

  it('writer cria lote válido; create com vendidos > 0 é negado', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertSucceeds(setDoc(lote(db, 'novo-lote'), lotePayload()));
    await assertFails(setDoc(lote(db, 'lote-fraude'), lotePayload({ vendidos: 5 })));
  });

  it('promoter (não-writer) NÃO cria lote; tenantId divergente é negado', async () => {
    await assertFails(setDoc(lote(dbAs(PROMOTER_UID, promoter), 'x'), lotePayload()));
    await assertFails(setDoc(lote(dbAs(MARINA_UID, marina), 'y'), lotePayload({ tenantId: PASSO_ID })));
  });

  it('cliente NÃO escreve `vendidos` no update (só a Function de virada)', async () => {
    await assertFails(updateDoc(lote(dbAs(MARINA_UID, marina), '5k-lote-3'), { vendidos: 1 }));
  });

  it('lote VENDIDO congela preço/janela (RN-200/300 per-lote); lote sem venda edita', async () => {
    const db = dbAs(MARINA_UID, marina);
    // 5k-lote-1 tem vendidos = 150 (seed) → preço congelado
    await assertFails(updateDoc(lote(db, '5k-lote-1'), { preco: 1 }));
    // 5k-lote-3 tem vendidos = 0 → writer edita preço
    await assertSucceeds(updateDoc(lote(db, '5k-lote-3'), { preco: 95 }));
  });

  it('delete de lote com venda é negado; sem venda o writer deleta', async () => {
    const db = dbAs(MARINA_UID, marina);
    const { deleteDoc } = await import('firebase/firestore');
    await assertFails(deleteDoc(lote(db, '5k-lote-1'))); // vendidos > 0
    await assertSucceeds(deleteDoc(lote(db, '10k-lote-3'))); // vendidos 0
  });
});

describe('cupons — leitura SÓ writer (catch-all NÃO vaza — lição A-T2)', () => {
  it('organizador (writer) lê; promoter (membro) e cross-tenant NÃO leem', async () => {
    await assertSucceeds(getDoc(cupom(dbAs(MARINA_UID, marina), 'HEROI10')));
    await assertFails(getDoc(cupom(dbAs(PROMOTER_UID, promoter), 'HEROI10'))); // catch-all excluído
    await assertFails(getDoc(cupom(dbAs(PASSO_OWNER_UID, passo), 'HEROI10')));
  });

  it('writer cria cupom (docId == codigo); docId ≠ codigo e usos > 0 negados', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertSucceeds(setDoc(cupom(db, 'TESTE99'), cupomPayload('TESTE99')));
    await assertFails(setDoc(cupom(db, 'DIVERGE'), cupomPayload('OUTRO')));
    await assertFails(setDoc(cupom(db, 'USADO1'), cupomPayload('USADO1', { usos: 3 })));
  });

  it('percentual > 100 é negado; cliente NÃO escreve `usos` no update', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(cupom(db, 'BIG'), cupomPayload('BIG', { valor: 150 })));
    await assertFails(updateDoc(cupom(db, 'HEROI10'), { usos: 999 }));
  });

  it('código fora do padrão [A-Z0-9]{3,20} é negado (cupom morto — review A4)', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(cupom(db, 'heroi'), cupomPayload('heroi'))); // minúsculo
    await assertFails(setDoc(cupom(db, 'AÇÃO10'), cupomPayload('AÇÃO10'))); // acento
    await assertFails(setDoc(cupom(db, 'AB'), cupomPayload('AB'))); // curto demais
  });
});

describe('paginaVendas — publicação só-Function', () => {
  it('membro lê a config; cross-tenant não', async () => {
    await assertSucceeds(getDoc(pagina(dbAs(PROMOTER_UID, promoter), 'config')));
    await assertFails(getDoc(pagina(dbAs(PASSO_OWNER_UID, passo), 'config')));
  });

  it('create com publicada=true é negado; publicada=false (ausente) passa', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(pagina(db, 'config2'), paginaPayload({ publicada: true })));
    await assertSucceeds(setDoc(pagina(db, 'config2'), paginaPayload()));
  });

  it('cliente NÃO escreve `publicada`/`publicadaEm` no update', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(updateDoc(pagina(db, 'config'), { publicada: false }));
    await assertFails(updateDoc(pagina(db, 'config'), { publicadaEm: jan() }));
  });
});
