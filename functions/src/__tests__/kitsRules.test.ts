/**
 * kitsRules.test.ts — LEELA-S205-T1
 *
 * Integração (Emulator): Security Rules de `eventos/{id}/kits` e `itensKit`
 * + índice inverso "usado em" (syncItemUsadoEm — mesmo código da Function).
 *
 * Cobre (aceite E03-L1):
 *   - "Sem kit" com preço NEGATIVO persiste (RN-211)
 *   - Item em 2 kits lista "usado em" os 2 (RN-215) + idempotência do sync
 *   - Cross-tenant DENY: create E update E delete (kits e itensKit)
 *   - RBAC por papel (owner/staff escrevem; promoter/athlete não)
 *   - Shape: preco number, origem no enum, organizador sem logo (RN-214),
 *     `usadoEm` nunca escrito pelo cliente
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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { listarKits, listarItensKit, salvarKit } from '@leela/api-client';
import { seedEventos, MARATONA_2027_ID, MEIA_FLORIPA_ID } from '../seed/eventos.seed';
import { seedKits, KIT_SEEDS, ITEM_KIT_SEEDS } from '../seed/kits.seed';
import { syncItemUsadoEm, syncItensDoKit } from '../eventos/itemKitIndex';
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

afterAll(async () => {
  await testEnv?.cleanup();
});

function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
  return testEnv
    .authenticatedContext(uid, claims)
    .firestore() as unknown as Firestore;
}

const marinaClaims = { role: 'tenant_owner', tenantId: CASTELO_ID };
const staffClaims = { role: 'tenant_staff', tenantId: CASTELO_ID };
const promoterClaims = { role: 'promoter', tenantId: CASTELO_ID };
const passoClaims = { role: 'tenant_owner', tenantId: PASSO_ID };

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
    status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
  await seedEventos(adminDb);
  await seedKits(adminDb);
}

// SUITE-STAB: clear+seed com triggers pausados + canários verificados —
// full5 mostrava kit seedado sumindo (NOT_FOUND no update) e Service call
// error em get() de Rules sob o backlog de triggers de arquivos vizinhos.
const SEED_CANARIES = [
  `tenants/${CASTELO_ID}`,
  `tenants/${PASSO_ID}`,
  `eventos/${MEIA_FLORIPA_ID}`,
  `eventos/${MARATONA_2027_ID}`,
  `eventos/${MEIA_FLORIPA_ID}/kits/kit_ouro`,
  'itensKit/camiseta-tecnica',
];

beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
    await seedVerified(adminDb, testEnv, seedBase, SEED_CANARIES);
  });
}, 30_000);

/** Kit no evento COM venda (meia-floripa: 453) — estrutura CONGELADA (RN-200). */
function kitRef(db: Firestore, kitId: string) {
  return doc(db, 'eventos', MEIA_FLORIPA_ID, 'kits', kitId);
}

/** Kit no evento SEM venda (maratona-2027) — create/delete livres (RN-210). */
function kitRefSemVenda(db: Firestore, kitId: string) {
  return doc(db, 'eventos', MARATONA_2027_ID, 'kits', kitId);
}

function kitValido(overrides: Record<string, unknown> = {}) {
  return {
    id: 'kit-teste', tenantId: CASTELO_ID, nome: 'Kit Teste',
    preco: 10, capacidade: 50, modalidades: ['5k'],
    ...overrides,
  };
}

function itemValido(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-teste', tenantId: CASTELO_ID, eventoId: MEIA_FLORIPA_ID,
    nome: 'Squeeze do evento', tamanhado: false,
    origem: 'organizador', exibirLogo: false, kits: ['kit_basico'],
    ...overrides,
  };
}

// ── Seed canônico + RN-211 ────────────────────────────────────────────────

describe('kits canônicos e preço negativo (RN-210/211)', () => {
  it('seed tem 4 kits e "Sem kit" persiste com −15 (RN-211)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const kits = await listarKits(db, MEIA_FLORIPA_ID);
    expect(kits).toHaveLength(4);
    // orderBy preco desc → Sem kit por último
    expect(kits.map((k) => k.id)).toEqual(['kit_ouro', 'kit_prata', 'kit_basico', 'sem_kit']);
    expect(kits[3]?.preco).toBe(-15);
  });

  it('cliente CRIA kit com preço negativo e o valor persiste (RN-211)', async () => {
    // Evento SEM venda — com venda o create é negado pela RN-200 (review #04)
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(
      setDoc(kitRefSemVenda(db, 'sem_kit-vip'), kitValido({
        id: 'sem_kit-vip', nome: 'Sem kit VIP', preco: -25, modalidades: ['42k'],
      }))
    );
    const snap = await getDoc(kitRefSemVenda(db, 'sem_kit-vip'));
    expect(snap.data()?.['preco']).toBe(-25);
  });

  it('preco string é NEGADO (shape)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(kitRefSemVenda(db, 'kit-shape'), kitValido({ id: 'kit-shape', preco: '89' }))
    );
  });

  it('nome vazio é NEGADO (shape)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(kitRefSemVenda(db, 'kit-sem-nome'), kitValido({ id: 'kit-sem-nome', nome: '' }))
    );
  });
});

// ── R9-C: visão de compra do kit (RN-227/RN-230) ──────────────────────────

describe('kits — visão de compra: descricao/itens/imagemUrl (R9-C)', () => {
  it('owner salva kit COMPLETO via salvarKit (api-client) e o dado persiste', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(
      salvarKit(db, MARATONA_2027_ID, 'kit-visao', {
        tenantId: CASTELO_ID, nome: 'Kit Visão', preco: 30, capacidade: 100,
        modalidades: ['42k'],
        descricao: 'O kit completo da maratona.',
        itens: ['Camiseta técnica', 'Medalha de finisher'],
        imagemUrl: 'https://cdn.leela.com.br/kits/kit-visao.webp',
      })
    );
    const snap = await getDoc(kitRefSemVenda(db, 'kit-visao'));
    expect(snap.data()?.['descricao']).toBe('O kit completo da maratona.');
    expect(snap.data()?.['itens']).toEqual(['Camiseta técnica', 'Medalha de finisher']);
    expect(snap.data()?.['imagemUrl']).toBe('https://cdn.leela.com.br/kits/kit-visao.webp');
  });

  it('COM venda: update da VISÃO segue permitido (RN-200 congela só preco)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(
      updateDoc(kitRef(db, 'kit_ouro'), {
        descricao: 'Atualizada pós-venda.', itens: ['Camiseta'], imagemUrl: null,
      })
    );
  });

  it('descricao > 280 é NEGADA; descricao null (limpar) é permitida', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(kitRefSemVenda(db, 'kit-desc'), kitValido({
        id: 'kit-desc', descricao: 'x'.repeat(281),
      }))
    );
    await assertSucceeds(
      setDoc(kitRefSemVenda(db, 'kit-desc'), kitValido({ id: 'kit-desc', descricao: null }))
    );
  });

  it('itens fora de shape é NEGADO (não-lista; > 30 entradas)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(kitRefSemVenda(db, 'kit-itens'), kitValido({ id: 'kit-itens', itens: 'Camiseta' }))
    );
    await assertFails(
      setDoc(kitRefSemVenda(db, 'kit-itens'), kitValido({
        id: 'kit-itens', itens: Array.from({ length: 31 }, (_, i) => `Item ${i}`),
      }))
    );
  });

  it('imagemUrl fora de http(s) é NEGADA (javascript:/data:/relativa) — vira <img> público', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    for (const url of ['javascript:alert(1)', 'data:text/html,x', '/covers/kit.svg']) {
      await assertFails(
        setDoc(kitRefSemVenda(db, 'kit-img'), kitValido({ id: 'kit-img', imagemUrl: url }))
      );
    }
    // > 2048 também nega (anti doc-bomba, espelho da capa)
    await assertFails(
      setDoc(kitRefSemVenda(db, 'kit-img'), kitValido({
        id: 'kit-img', imagemUrl: `https://x.com/${'a'.repeat(2049)}`,
      }))
    );
    await assertSucceeds(
      setDoc(kitRefSemVenda(db, 'kit-img'), kitValido({
        id: 'kit-img', imagemUrl: 'https://cdn.leela.com.br/kits/ok.png',
      }))
    );
  });
});

// ── Cross-tenant + RBAC em kits ───────────────────────────────────────────

describe('kits — cross-tenant e RBAC (S205-T1)', () => {
  it('owner de B NÃO CRIA kit no evento de A (nem carimbando tenant de A)', async () => {
    // Evento SEM venda: a negação aqui é o cross-tenant, não a RN-200
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(
      setDoc(kitRefSemVenda(db, 'kit-hijack'), kitValido({ tenantId: PASSO_ID }))
    );
    await assertFails(
      setDoc(kitRefSemVenda(db, 'kit-hijack-2'), kitValido({ tenantId: CASTELO_ID }))
    );
  });

  it('owner de B NÃO ATUALIZA kit de A', async () => {
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(updateDoc(kitRef(db, 'kit_ouro'), { preco: 1 }));
  });

  it('owner de B NÃO DELETA kit de A', async () => {
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(deleteDoc(kitRef(db, 'kit_ouro')));
  });

  it('owner de B NÃO LÊ kits de A', async () => {
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(getDoc(kitRef(db, 'kit_ouro')));
  });

  it('tenantId de kit é IMUTÁVEL no update', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(updateDoc(kitRef(db, 'kit_ouro'), { tenantId: PASSO_ID }));
  });

  it('staff CRIA/ATUALIZA kit; promoter NÃO (RBAC)', async () => {
    const staffDb = dbAs('uid-staff-castelo', staffClaims);
    // Create no evento SEM venda (com venda a RN-200 congela — review #04)
    await assertSucceeds(
      setDoc(kitRefSemVenda(staffDb, 'kit-staff'), kitValido({ id: 'kit-staff' }))
    );
    // Update de campo ≠ preco segue permitido MESMO com venda
    await assertSucceeds(updateDoc(kitRef(staffDb, 'kit_ouro'), { capacidade: 90 }));

    const promoterDb = dbAs('uid-promoter-castelo', promoterClaims);
    await assertFails(
      setDoc(kitRefSemVenda(promoterDb, 'kit-promoter'), kitValido({ id: 'kit-promoter' }))
    );
    // promoter LÊ (é membro)
    await assertSucceeds(getDoc(kitRef(promoterDb, 'kit_ouro')));
  });

  it('SEM venda: owner cria e DELETA kit do próprio evento (RN-210 — 0..N kits)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(
      setDoc(kitRefSemVenda(db, 'kit-descartavel'), kitValido({ id: 'kit-descartavel' }))
    );
    await assertSucceeds(deleteDoc(kitRefSemVenda(db, 'kit-descartavel')));
  });
});

// ── RN-200: estrutura de kits CONGELADA com venda (review Onda1 #04) ──────
//
// Exploit fechado: `delete` + `setDoc` com preço novo (2 chamadas de client
// SDK) anulava o bloqueio de preço sem tocar Function. Antes deste fix, o
// teste desta suíte CONSAGRAVA o delete em evento vendido como caminho feliz.

describe('kits — delete+recreate anulava RN-200 (review #04)', () => {
  it('COM venda: owner NÃO deleta kit (era o greenlight do exploit)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(deleteDoc(kitRef(db, 'kit_basico')));
  });

  it('COM venda: owner NÃO cria kit novo (recreate com preço novo bloqueado)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(kitRef(db, 'kit_basico_2'), kitValido({ id: 'kit_basico_2', preco: 1 }))
    );
  });

  it('COM venda: staff também não deleta nem recria (papel de escrita não basta)', async () => {
    const db = dbAs('uid-staff-castelo', staffClaims);
    await assertFails(deleteDoc(kitRef(db, 'kit_prata')));
    await assertFails(
      setDoc(kitRef(db, 'kit_prata'), kitValido({ id: 'kit_prata', nome: 'Kit Prata', preco: 1 }))
    );
  });

  it('platform_admin segue operando kits mesmo com venda (papel de plataforma)', async () => {
    const db = dbAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      setDoc(kitRef(db, 'kit-admin'), kitValido({ id: 'kit-admin' }))
    );
    await assertSucceeds(deleteDoc(kitRef(db, 'kit-admin')));
  });
});

// ── itensKit: catálogo top-level ──────────────────────────────────────────

describe('itensKit — shape, RBAC e cross-tenant (S205-T1)', () => {
  it('catálogo canônico: 6 itens com badges de tipo/origem (RN-212/213)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const itens = await listarItensKit(db, {
      tenantId: CASTELO_ID, eventoId: MEIA_FLORIPA_ID,
    });
    expect(itens).toHaveLength(ITEM_KIT_SEEDS.length);
    expect(itens.filter((i) => i.tamanhado)).toHaveLength(1);
    expect(itens.filter((i) => i.origem === 'patrocinador')).toHaveLength(4);
  });

  it('owner CRIA item do organizador (logo false) — caminho feliz', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(setDoc(doc(db, 'itensKit', 'item-teste'), itemValido()));
  });

  it('item do ORGANIZADOR com exibirLogo=true é NEGADO (RN-214)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(doc(db, 'itensKit', 'item-logo-errado'), itemValido({
        id: 'item-logo-errado', exibirLogo: true,
      }))
    );
  });

  it('item PATROCINADO com exibirLogo=true é permitido (RN-214)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(
      setDoc(doc(db, 'itensKit', 'item-patrocinado'), itemValido({
        id: 'item-patrocinado', origem: 'patrocinador',
        marca: 'Olympikus', exibirLogo: true,
      }))
    );
  });

  it('origem fora do enum é NEGADA (RN-213)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(doc(db, 'itensKit', 'item-origem'), itemValido({
        id: 'item-origem', origem: 'loja',
      }))
    );
  });

  it('cliente NÃO CRIA item carimbando usadoEm (índice é da Function)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(doc(db, 'itensKit', 'item-usadoem'), itemValido({
        id: 'item-usadoem',
        usadoEm: [{ kitId: 'kit_ouro', nome: 'Kit Ouro' }],
      }))
    );
  });

  it('cliente NÃO TOCA usadoEm no update', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      updateDoc(doc(db, 'itensKit', 'camiseta-tecnica'), {
        usadoEm: [{ kitId: 'kit_ouro', nome: 'Hack' }],
      })
    );
  });

  it('cliente ATUALIZA kits[] do item sem tocar usadoEm (caminho feliz)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(
      updateDoc(doc(db, 'itensKit', 'camiseta-tecnica'), {
        kits: ['kit_prata', 'kit_basico', 'kit_ouro'],
      })
    );
  });

  it('cross-tenant: owner de B não cria/atualiza/deleta/lê item de A', async () => {
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    // B carimba o PRÓPRIO tenant mas aponta evento de A → coerência nega
    await assertFails(
      setDoc(doc(db, 'itensKit', 'item-b'), itemValido({ id: 'item-b', tenantId: PASSO_ID }))
    );
    await assertFails(
      updateDoc(doc(db, 'itensKit', 'camiseta-tecnica'), { nome: 'HIJACK' })
    );
    await assertFails(deleteDoc(doc(db, 'itensKit', 'camiseta-tecnica')));
    await assertFails(getDoc(doc(db, 'itensKit', 'camiseta-tecnica')));
  });

  it('item apontando evento INEXISTENTE é negado (coerência de tenant)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(doc(db, 'itensKit', 'item-orfao'), itemValido({
        id: 'item-orfao', eventoId: 'evento-fantasma',
      }))
    );
  });

  it('item sem eventoId é negado (shape)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const semEvento = itemValido({ id: 'item-sem-evento' });
    delete (semEvento as Record<string, unknown>)['eventoId'];
    await assertFails(setDoc(doc(db, 'itensKit', 'item-sem-evento'), semEvento));
  });

  it('query de itensKit SEM filtro de tenant é NEGADA (ADR-009)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      getDocs(query(collection(db, 'itensKit'), where('eventoId', '==', MEIA_FLORIPA_ID)))
    );
  });

  it('promoter NÃO escreve item; athlete não lê catálogo alheio', async () => {
    const promoterDb = dbAs('uid-promoter-castelo', promoterClaims);
    await assertFails(
      setDoc(doc(promoterDb, 'itensKit', 'item-promoter'), itemValido({ id: 'item-promoter' }))
    );
    const athleteDb = dbAs('uid-atleta', { role: 'athlete' });
    await assertFails(getDoc(doc(athleteDb, 'itensKit', 'camiseta-tecnica')));
  });

  it('platform_admin cruza tenants em itensKit', async () => {
    const db = dbAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(getDoc(doc(db, 'itensKit', 'camiseta-tecnica')));
  });
});

// ── Índice inverso "usado em" (RN-215) ────────────────────────────────────

describe('usadoEm — índice inverso N:N via sync (RN-215)', () => {
  it('item em 2 kits lista "usado em" os 2 (aceite L1)', async () => {
    const snap = await adminDb.collection('itensKit').doc('camiseta-tecnica').get();
    expect(snap.data()?.['usadoEm']).toEqual([
      { kitId: 'kit_prata', nome: 'Kit Prata' },
      { kitId: 'kit_basico', nome: 'Kit básico' },
    ]);
  });

  it('sync é IDEMPOTENTE: 2ª passada não escreve nada', async () => {
    // seedKits já materializou; nova passada deve ser 100% no-op
    for (const item of ITEM_KIT_SEEDS) {
      const escreveu = await syncItemUsadoEm(adminDb, item.id);
      expect(escreveu).toBe(false);
    }
  });

  it('mudar kits[] do item e ressincronizar recomputa o índice', async () => {
    const ref = adminDb.collection('itensKit').doc('viseira-tecnica');
    await ref.update({ kits: ['kit_ouro'] });
    const escreveu = await syncItemUsadoEm(adminDb, 'viseira-tecnica');
    expect(escreveu).toBe(true);
    const snap = await ref.get();
    expect(snap.data()?.['usadoEm']).toEqual([{ kitId: 'kit_ouro', nome: 'Kit Ouro' }]);
  });

  it('renomear kit e ressincronizar propaga o novo nome aos itens (gatilho 2)', async () => {
    await adminDb
      .collection('eventos').doc(MEIA_FLORIPA_ID)
      .collection('kits').doc('kit_prata')
      .update({ nome: 'Kit Prata Plus' });

    const n = await syncItensDoKit(adminDb, MEIA_FLORIPA_ID, 'kit_prata');
    expect(n).toBeGreaterThan(0);

    const snap = await adminDb.collection('itensKit').doc('camiseta-tecnica').get();
    expect(snap.data()?.['usadoEm']).toEqual([
      { kitId: 'kit_prata', nome: 'Kit Prata Plus' },
      { kitId: 'kit_basico', nome: 'Kit básico' },
    ]);
  });

  it('kit deletado sai do índice na ressincronização', async () => {
    await adminDb
      .collection('eventos').doc(MEIA_FLORIPA_ID)
      .collection('kits').doc('kit_basico')
      .delete();

    await syncItemUsadoEm(adminDb, 'camiseta-tecnica');
    const snap = await adminDb.collection('itensKit').doc('camiseta-tecnica').get();
    expect(snap.data()?.['usadoEm']).toEqual([
      { kitId: 'kit_prata', nome: 'Kit Prata' },
    ]);
  });

  it('seedKits é idempotente (rerun preserva contagens e índice)', async () => {
    await seedKits(adminDb);
    const kits = await adminDb
      .collection('eventos').doc(MEIA_FLORIPA_ID).collection('kits').get();
    expect(kits.size).toBe(KIT_SEEDS.length);
    const itens = await adminDb
      .collection('itensKit').where('eventoId', '==', MEIA_FLORIPA_ID).get();
    expect(itens.size).toBe(ITEM_KIT_SEEDS.length);
  });
});
