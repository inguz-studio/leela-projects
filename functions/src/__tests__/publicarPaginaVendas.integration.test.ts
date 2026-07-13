/**
 * publicarPaginaVendas.integration.test.ts — LEELA-S300-T2 (E04 · lacuna #1 T3)
 *
 * Integração + ATAQUES (⚠️ EXIGE Firestore Emulator na 8080): callables
 * `publicarPaginaVendas`/`despublicarPaginaVendas` (núcleo) contra Rules
 * reais. O contrato vem do seam do api-client
 * (`packages/api-client/src/eventos/paginaVendas.ts`): `{eventoId} ->
 * {publicada}`. Prova:
 *   - completude server-side: página inexistente, SEO incompleto e página
 *     CORROMPIDA (checkout destravado via Admin) → failed-precondition;
 *   - publicar → flag + carimbo; IDEMPOTENTE (replay não regrava carimbo);
 *   - despublicar → rascunho; `publicadaEm` PRESERVADO (histórico);
 *   - autorização: promoter e cross-tenant negados; tenant inativo negado
 *     (RN-402); input inválido negado;
 *   - ATAQUES via Rules: cliente NUNCA escreve `publicada`/`publicadaEm`
 *     (create true, update flip) — mas edição de CONTEÚDO segue passando
 *     mesmo com a página publicada (seam salvarConteudoPaginaVendas).
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp as clientServerTimestamp,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { secoesVendasPadrao, type AuthClaims } from '@leela/core';
import {
  despublicarPaginaVendasCore,
  publicarPaginaVendasCore,
} from '../eventos/publicarPaginaVendas';
import type { EventoCaller } from '../eventos/criarEvento';

const PROJECT_ID = 'demo-leela-pagina-vendas';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const TENANT_ID = 'castelo-producoes';
const OUTRO_TENANT_ID = 'passo-certo';
const TENANT_INATIVO_ID = 'gelo-eventos';
const MARINA_UID = 'uid-marina';

const EVENTO_OK = 'evento-pv';
const EVENTO_INCOMPLETO = 'evento-pv-incompleto';
const EVENTO_SEM_PAGINA = 'evento-pv-sem-pagina';
const EVENTO_CORROMPIDO = 'evento-pv-corrompido';

const organizador: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: TENANT_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

function paginaRef(eventoId: string) {
  return db.doc(`eventos/${eventoId}/paginaVendas/config`);
}

async function seedEventoComPagina(
  eventoId: string,
  pagina: Record<string, unknown> | null
): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  const eventoRef = db.collection('eventos').doc(eventoId);
  batch.set(eventoRef, {
    id: eventoId,
    tenantId: TENANT_ID,
    organizadorId: MARINA_UID,
    nome: `Evento ${eventoId}`,
    data: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 3600 * 1000)),
    local: 'Florianópolis/SC',
    modalidades: ['5k', '10k'],
    slug: eventoId,
    status: 'publicado',
    usaChip: false,
    qtdInscritos: 0,
    receitaConfirmada: 0,
    criadoEm: now,
    atualizadoEm: now,
  });
  if (pagina !== null) {
    batch.set(eventoRef.collection('paginaVendas').doc('config'), {
      id: 'config',
      tenantId: TENANT_ID,
      eventoId,
      publicada: false,
      criadoEm: now,
      atualizadoEm: now,
      ...pagina,
    });
  }
  await batch.commit();
}

const seoCompleto = {
  titulo: 'Meia Floripa 2026',
  descricao: 'A meia mais bonita do Brasil.',
  slugAmigavel: '{DOMINIO_LEELA}/meia-floripa-2026',
};

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
  db = admin.firestore();
  await testEnv.clearFirestore();

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('tenants').doc(OUTRO_TENANT_ID), {
    id: OUTRO_TENANT_ID, nome: 'Passo Certo', slug: OUTRO_TENANT_ID,
    status: 'ativo', ownerUid: 'uid-passo-owner', tipo: 'promotor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('tenants').doc(TENANT_INATIVO_ID), {
    id: TENANT_INATIVO_ID, nome: 'Gelo Eventos', slug: TENANT_INATIVO_ID,
    status: 'suspenso', ownerUid: 'uid-gelo-owner', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();

  await seedEventoComPagina(EVENTO_OK, {
    secoes: secoesVendasPadrao(),
    seo: seoCompleto,
  });
  await seedEventoComPagina(EVENTO_INCOMPLETO, {
    secoes: secoesVendasPadrao(),
    seo: { ...seoCompleto, titulo: '   ', descricao: '' },
  });
  await seedEventoComPagina(EVENTO_SEM_PAGINA, null);
  // Página CORROMPIDA: checkout destravado — só Admin consegue gravar isso
  // (a Rule não valida a lista; o parse do kernel é a rede de segurança).
  await seedEventoComPagina(EVENTO_CORROMPIDO, {
    secoes: secoesVendasPadrao().map((s) =>
      s.id === 'checkout' ? { ...s, travada: false, ativa: false } : s
    ),
    seo: seoCompleto,
  });
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// Completude server-side (nunca confia no cliente)
// ─────────────────────────────────────────────────────────────────────────────

describe('publicar — completude validada no servidor', () => {
  it('página inexistente → failed-precondition', async () => {
    await expect(
      publicarPaginaVendasCore(db, { eventoId: EVENTO_SEM_PAGINA }, organizador)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('SEO incompleto (titulo/descricao vazios) → failed-precondition com a lista', async () => {
    await expect(
      publicarPaginaVendasCore(db, { eventoId: EVENTO_INCOMPLETO }, organizador)
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      message: expect.stringContaining('seo.titulo'),
    });
  });

  it('página corrompida (checkout destravado) → failed-precondition (parse do kernel)', async () => {
    await expect(
      publicarPaginaVendasCore(db, { eventoId: EVENTO_CORROMPIDO }, organizador)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('evento inexistente → not-found; input sem eventoId → invalid-argument', async () => {
    await expect(
      publicarPaginaVendasCore(db, { eventoId: 'evento-fantasma' }, organizador)
    ).rejects.toMatchObject({ code: 'not-found' });
    await expect(
      publicarPaginaVendasCore(db, {}, organizador)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Publicar/despublicar — flag de Function, idempotência, histórico
// ─────────────────────────────────────────────────────────────────────────────

describe('publicar/despublicar — carimbo exclusivo de Function', () => {
  let publicadaEmOriginal = 0;

  it('página completa publica: flag true + publicadaEm carimbado', async () => {
    const r = await publicarPaginaVendasCore(db, { eventoId: EVENTO_OK }, organizador);
    expect(r).toEqual({ publicada: true });

    const snap = await paginaRef(EVENTO_OK).get();
    expect(snap.get('publicada')).toBe(true);
    expect(snap.get('publicadaEm')).toBeDefined();
    publicadaEmOriginal = (snap.get('publicadaEm') as Timestamp).toMillis();
  });

  it('IDEMPOTENTE: republicar devolve o mesmo estado SEM regravar o carimbo', async () => {
    const r = await publicarPaginaVendasCore(db, { eventoId: EVENTO_OK }, organizador);
    expect(r).toEqual({ publicada: true });

    const snap = await paginaRef(EVENTO_OK).get();
    expect((snap.get('publicadaEm') as Timestamp).toMillis()).toBe(publicadaEmOriginal);
  });

  it('despublicar volta a rascunho e PRESERVA publicadaEm (histórico)', async () => {
    const r = await despublicarPaginaVendasCore(db, { eventoId: EVENTO_OK }, organizador);
    expect(r).toEqual({ publicada: false });

    const snap = await paginaRef(EVENTO_OK).get();
    expect(snap.get('publicada')).toBe(false);
    expect((snap.get('publicadaEm') as Timestamp).toMillis()).toBe(publicadaEmOriginal);
  });

  it('IDEMPOTENTE: despublicar de novo é replay sem efeito', async () => {
    const r = await despublicarPaginaVendasCore(db, { eventoId: EVENTO_OK }, organizador);
    expect(r).toEqual({ publicada: false });
  });

  it('republicar depois de despublicar funciona (ciclo completo)', async () => {
    const r = await publicarPaginaVendasCore(db, { eventoId: EVENTO_OK }, organizador);
    expect(r).toEqual({ publicada: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Autorização — papel, tenant, RN-400/402
// ─────────────────────────────────────────────────────────────────────────────

describe('autorização — hoje = tenant writer (matriz S304 vem depois)', () => {
  it('promoter (membro não-writer) → permission-denied', async () => {
    const promoter: EventoCaller = {
      uid: 'uid-promoter',
      claims: { role: 'promoter', tenantId: TENANT_ID } as AuthClaims,
    };
    await expect(
      publicarPaginaVendasCore(db, { eventoId: EVENTO_OK }, promoter)
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('writer de OUTRO tenant → permission-denied (RN-400)', async () => {
    const invasor: EventoCaller = {
      uid: 'uid-passo-owner',
      claims: { role: 'tenant_owner', tenantId: OUTRO_TENANT_ID } as AuthClaims,
    };
    await expect(
      publicarPaginaVendasCore(db, { eventoId: EVENTO_OK }, invasor)
    ).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(
      despublicarPaginaVendasCore(db, { eventoId: EVENTO_OK }, invasor)
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('tenant INATIVO → failed-precondition (RN-402)', async () => {
    const congelado: EventoCaller = {
      uid: 'uid-gelo-owner',
      claims: { role: 'tenant_owner', tenantId: TENANT_INATIVO_ID } as AuthClaims,
    };
    await expect(
      publicarPaginaVendasCore(db, { eventoId: EVENTO_OK }, congelado)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ATAQUES via Rules — cliente nunca escreve a flag; conteúdo segue editável
// ─────────────────────────────────────────────────────────────────────────────

describe('Rules — publicada/publicadaEm congelados para o cliente (S300-T1+T2)', () => {
  const marina = { role: 'tenant_owner', tenantId: TENANT_ID };

  it('ATAQUE: update flipando `publicada` direto → NEGADO', async () => {
    const cli = dbAs(MARINA_UID, marina);
    await assertFails(
      updateDoc(doc(cli, `eventos/${EVENTO_INCOMPLETO}/paginaVendas/config`), {
        publicada: true,
      })
    );
  });

  it('ATAQUE: update forjando `publicadaEm` → NEGADO', async () => {
    const cli = dbAs(MARINA_UID, marina);
    await assertFails(
      updateDoc(doc(cli, `eventos/${EVENTO_INCOMPLETO}/paginaVendas/config`), {
        publicadaEm: clientServerTimestamp(),
      })
    );
  });

  it('ATAQUE: create já-publicado (`publicada: true`) → NEGADO', async () => {
    const cli = dbAs(MARINA_UID, marina);
    await assertFails(
      setDoc(doc(cli, `eventos/${EVENTO_SEM_PAGINA}/paginaVendas/config`), {
        id: 'config',
        tenantId: TENANT_ID,
        eventoId: EVENTO_SEM_PAGINA,
        secoes: secoesVendasPadrao(),
        seo: seoCompleto,
        publicada: true,
        criadoEm: clientServerTimestamp(),
        atualizadoEm: clientServerTimestamp(),
      })
    );
  });

  it('regressão: create RASCUNHO limpo do writer segue permitido', async () => {
    const cli = dbAs(MARINA_UID, marina);
    await assertSucceeds(
      setDoc(doc(cli, `eventos/${EVENTO_SEM_PAGINA}/paginaVendas/config`), {
        id: 'config',
        tenantId: TENANT_ID,
        eventoId: EVENTO_SEM_PAGINA,
        secoes: secoesVendasPadrao(),
        seo: seoCompleto,
        publicada: false,
        criadoEm: clientServerTimestamp(),
        atualizadoEm: clientServerTimestamp(),
      })
    );
  });

  it('conteúdo (seo) segue editável pelo writer MESMO com a página publicada', async () => {
    // EVENTO_OK terminou o ciclo acima PUBLICADO — o seam de conteúdo
    // (salvarConteudoPaginaVendas) não pode quebrar pós-publicação.
    const cli = dbAs(MARINA_UID, marina);
    await assertSucceeds(
      updateDoc(doc(cli, `eventos/${EVENTO_OK}/paginaVendas/config`), {
        seo: { ...seoCompleto, descricao: 'Descrição revisada pós-publicação.' },
        atualizadoEm: clientServerTimestamp(),
      })
    );
  });
});
