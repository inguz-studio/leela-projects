/**
 * setClaimsEquipe.integration.test.ts — LEELA-S304-T1 (Emulator · Firestore
 * 8080 + Auth 9099)
 *
 * Function `setClaimsEquipeCore` REAL contra os emuladores (in-process,
 * padrão criarEventoCore/vincularChipCore):
 *
 *   - MERGE PRESERVADOR provado com claims PRÉ-EXISTENTES: role/tenantId e
 *     papéis de OUTROS eventos atravessam intactos (aceite E04-L4);
 *   - troca de papel; remoção revoga SÓ o evento; último evento remove a
 *     chave `eventos` inteira;
 *   - âncora doc↔claims em sincronia (status ativo/removido);
 *   - TOKEN VELHO pós-remoção: prova de Rules com claims stale → NEGA;
 *   - ATAQUES: auto-promoção, escalada administrador→organizador via
 *     payload, destituição do organizador por administrador, caller de
 *     outro tenant, administrador REMOVIDO com token velho, papel de
 *     plataforma no payload, alvo/evento inexistentes.
 *
 * Pré-requisito: emulators:exec --only firestore,auth (portas default).
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
import { doc, getDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import type { AuthClaims } from '@leela/core';
import { setClaimsEquipeCore } from '../eventos/setClaimsEquipe';
import type { EventoCaller } from '../eventos/criarEvento';
import { seedTenants, CASTELO_TENANT_ID, MARINA_CASTELO_UID } from '../seed/tenants.seed';
import { seedEventos, MEIA_FLORIPA_ID, MARATONA_2027_ID } from '../seed/eventos.seed';
import { seedEquipeDocs } from '../seed/equipe.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const EV = MEIA_FLORIPA_ID;
const PASSO_ID = 'passo-certo';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;
let adminAuth: admin.auth.Auth;

const marina: EventoCaller = {
  uid: MARINA_CASTELO_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_TENANT_ID },
};
const staffCastelo: EventoCaller = {
  uid: 'uid-staff-castelo',
  claims: { role: 'tenant_staff', tenantId: CASTELO_TENANT_ID },
};
const passoOwner: EventoCaller = {
  uid: 'uid-passo-owner',
  claims: { role: 'tenant_owner', tenantId: PASSO_ID },
};
const organizadorPapel: EventoCaller = {
  uid: 'uid-equipe-organizador',
  claims: { role: 'athlete', eventos: { [EV]: 'organizador' } } as AuthClaims,
};
const administradorPapel: EventoCaller = {
  uid: 'uid-equipe-administrador',
  claims: { role: 'athlete', eventos: { [EV]: 'administrador' } } as AuthClaims,
};

async function expectHttpsError(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    expect.unreachable(`esperava HttpsError '${code}'`);
  } catch (err) {
    expect(err).toBeInstanceOf(https.HttpsError);
    expect((err as https.HttpsError).code).toBe(code);
  }
}

/** Cria (idempotente) usuário no Auth Emulator e aplica claims EXATAS. */
async function comUsuario(uid: string, claims: object | null): Promise<void> {
  try {
    await adminAuth.getUser(uid);
  } catch {
    await adminAuth.createUser({ uid, email: `${uid}@demo-leela.dev` });
  }
  await adminAuth.setCustomUserClaims(uid, claims);
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
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= 'localhost:9099';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
  adminAuth = admin.auth();
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedTenants(adminDb);
  await seedEventos(adminDb);
  await seedEquipeDocs(adminDb);
});

// ---------------------------------------------------------------------------
// Merge preservador + sincronia doc↔claims
// ---------------------------------------------------------------------------

describe('setClaimsEquipeCore — merge preservador (aceite E04-L4)', () => {
  it('concede papel SEM apagar claims de tenant nem de OUTROS eventos', async () => {
    const alvo = 'uid-alvo-merge';
    await comUsuario(alvo, {
      role: 'athlete',
      eventos: { [MARATONA_2027_ID]: 'operador' },
    });

    const res = await setClaimsEquipeCore(
      adminDb,
      adminAuth,
      { eventoId: EV, uid: alvo, papel: 'financeiro' },
      marina
    );
    expect(res).toEqual({ success: true, eventoId: EV, uid: alvo, papel: 'financeiro' });

    const user = await adminAuth.getUser(alvo);
    expect(user.customClaims).toEqual({
      role: 'athlete', // claim de plataforma INTACTA
      eventos: {
        [MARATONA_2027_ID]: 'operador', // outro evento INTACTO
        [EV]: 'financeiro', // concedido
      },
    });
    // revogação de refresh tokens aconteceu (propagação RN-401)
    expect(user.tokensValidAfterTime).toBeDefined();

    // âncora criada: doc equipe/{uid} ativo com o papel
    const ancora = await adminDb
      .collection('eventos')
      .doc(EV)
      .collection('equipe')
      .doc(alvo)
      .get();
    expect(ancora.exists).toBe(true);
    expect(ancora.data()?.['status']).toBe('ativo');
    expect(ancora.data()?.['papel']).toBe('financeiro');
    expect(ancora.data()?.['tenantId']).toBe(CASTELO_TENANT_ID);
  });

  it('claims de TENANT do alvo atravessam intactas (contratado externo)', async () => {
    const alvo = 'uid-alvo-outro-tenant';
    await comUsuario(alvo, { role: 'tenant_owner', tenantId: PASSO_ID });

    await setClaimsEquipeCore(
      adminDb,
      adminAuth,
      { eventoId: EV, uid: alvo, papel: 'financeiro' },
      marina
    );
    const user = await adminAuth.getUser(alvo);
    expect(user.customClaims).toEqual({
      role: 'tenant_owner',
      tenantId: PASSO_ID, // NUNCA tocado pelo canal de equipe
      eventos: { [EV]: 'financeiro' },
    });
  });

  it('TROCA de papel substitui só a chave do evento; âncora acompanha', async () => {
    const alvo = 'uid-alvo-troca';
    await comUsuario(alvo, {
      role: 'athlete',
      eventos: { [MARATONA_2027_ID]: 'operador' },
    });
    await setClaimsEquipeCore(
      adminDb,
      adminAuth,
      { eventoId: EV, uid: alvo, papel: 'financeiro' },
      marina
    );
    await setClaimsEquipeCore(
      adminDb,
      adminAuth,
      { eventoId: EV, uid: alvo, papel: 'operador' },
      marina
    );

    const user = await adminAuth.getUser(alvo);
    expect((user.customClaims as AuthClaims).eventos).toEqual({
      [MARATONA_2027_ID]: 'operador',
      [EV]: 'operador',
    });
    const ancora = await adminDb
      .collection('eventos')
      .doc(EV)
      .collection('equipe')
      .doc(alvo)
      .get();
    expect(ancora.data()?.['papel']).toBe('operador');
    expect(ancora.data()?.['status']).toBe('ativo');
  });

  it('REMOÇÃO revoga só o evento; âncora vira "removido"; token velho NEGA nas Rules', async () => {
    const alvo = 'uid-alvo-remocao';
    await comUsuario(alvo, {
      role: 'athlete',
      eventos: { [MARATONA_2027_ID]: 'operador' },
    });
    await setClaimsEquipeCore(
      adminDb,
      adminAuth,
      { eventoId: EV, uid: alvo, papel: 'financeiro' },
      marina
    );
    // financeiro/current p/ provar a leitura antes/depois
    await adminDb.collection('eventos').doc(EV).collection('financeiro').doc('current').set({
      tenantId: CASTELO_TENANT_ID,
      receitaBruta: 1,
      atualizadoEm: Timestamp.now(),
    });

    // ANTES da remoção o membro lê o financeiro (claims + âncora vivas)
    const claimsVivas = { role: 'athlete', eventos: { [EV]: 'financeiro' } };
    await assertSucceeds(
      getDoc(
        doc(
          testEnv.authenticatedContext(alvo, claimsVivas).firestore(),
          'eventos',
          EV,
          'financeiro',
          'current'
        )
      )
    );

    const res = await setClaimsEquipeCore(
      adminDb,
      adminAuth,
      { eventoId: EV, uid: alvo, papel: null },
      marina
    );
    expect(res.papel).toBeNull();

    // claims: SÓ o evento revogado; o outro evento permanece
    const user = await adminAuth.getUser(alvo);
    expect(user.customClaims).toEqual({
      role: 'athlete',
      eventos: { [MARATONA_2027_ID]: 'operador' },
    });

    // âncora marcada 'removido' (trilha preservada)
    const ancora = await adminDb
      .collection('eventos')
      .doc(EV)
      .collection('equipe')
      .doc(alvo)
      .get();
    expect(ancora.data()?.['status']).toBe('removido');

    // TOKEN VELHO (claims stale ainda com financeiro): janela FECHADA pela
    // âncora — Rules negam já, sem esperar a expiração (~1h) do token ID.
    await assertFails(
      getDoc(
        doc(
          testEnv.authenticatedContext(alvo, claimsVivas).firestore(),
          'eventos',
          EV,
          'financeiro',
          'current'
        )
      )
    );
  });

  it('remoção do ÚLTIMO evento não deixa resíduo `eventos: {}` no token', async () => {
    const alvo = 'uid-alvo-ultimo';
    await comUsuario(alvo, { role: 'athlete' });
    await setClaimsEquipeCore(
      adminDb,
      adminAuth,
      { eventoId: EV, uid: alvo, papel: 'operador' },
      marina
    );
    await setClaimsEquipeCore(
      adminDb,
      adminAuth,
      { eventoId: EV, uid: alvo, papel: null },
      marina
    );
    const user = await adminAuth.getUser(alvo);
    expect(user.customClaims).toEqual({ role: 'athlete' });
  });
});

// ---------------------------------------------------------------------------
// Autoridade — quem pode gerir
// ---------------------------------------------------------------------------

describe('setClaimsEquipeCore — autoridade do caller', () => {
  it('organizador e administrador (papel de evento, âncora viva) concedem papéis comuns', async () => {
    const alvo1 = 'uid-alvo-por-organizador';
    const alvo2 = 'uid-alvo-por-administrador';
    await comUsuario(alvo1, { role: 'athlete' });
    await comUsuario(alvo2, { role: 'athlete' });

    await setClaimsEquipeCore(
      adminDb,
      adminAuth,
      { eventoId: EV, uid: alvo1, papel: 'operador' },
      organizadorPapel
    );
    await setClaimsEquipeCore(
      adminDb,
      adminAuth,
      { eventoId: EV, uid: alvo2, papel: 'financeiro' },
      administradorPapel
    );
    expect(((await adminAuth.getUser(alvo1)).customClaims as AuthClaims).eventos).toEqual({
      [EV]: 'operador',
    });
    expect(((await adminAuth.getUser(alvo2)).customClaims as AuthClaims).eventos).toEqual({
      [EV]: 'financeiro',
    });
  });

  it('tenant_staff do tenant dono concede papéis comuns (writer)', async () => {
    const alvo = 'uid-alvo-por-staff';
    await comUsuario(alvo, { role: 'athlete' });
    await setClaimsEquipeCore(
      adminDb,
      adminAuth,
      { eventoId: EV, uid: alvo, papel: 'operador' },
      staffCastelo
    );
    expect(((await adminAuth.getUser(alvo)).customClaims as AuthClaims).eventos).toEqual({
      [EV]: 'operador',
    });
  });
});

// ---------------------------------------------------------------------------
// Ataques
// ---------------------------------------------------------------------------

describe('setClaimsEquipeCore — ataques (postura antagonista)', () => {
  it('AUTO-PROMOÇÃO: caller nunca muda o próprio papel (nem organizador)', async () => {
    await comUsuario(administradorPapel.uid, administradorPapel.claims as object);
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: EV, uid: administradorPapel.uid, papel: 'organizador' },
        administradorPapel
      ),
      'permission-denied'
    );
    await comUsuario(organizadorPapel.uid, organizadorPapel.claims as object);
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: EV, uid: organizadorPapel.uid, papel: 'financeiro' },
        organizadorPapel
      ),
      'permission-denied'
    );
  });

  it("ESCALADA via payload: administrador NÃO concede 'organizador' a comparsa", async () => {
    const comparsa = 'uid-comparsa';
    await comUsuario(comparsa, { role: 'athlete' });
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: EV, uid: comparsa, papel: 'organizador' },
        administradorPapel
      ),
      'permission-denied'
    );
    // staff também não transfere controle total
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: EV, uid: comparsa, papel: 'organizador' },
        staffCastelo
      ),
      'permission-denied'
    );
    // tenant_owner PODE (dono do tenant do evento)
    await setClaimsEquipeCore(
      adminDb,
      adminAuth,
      { eventoId: EV, uid: comparsa, papel: 'organizador' },
      marina
    );
    expect(((await adminAuth.getUser(comparsa)).customClaims as AuthClaims).eventos).toEqual(
      { [EV]: 'organizador' }
    );
  });

  it('DESTITUIÇÃO: administrador não rebaixa/remove o organizador atual', async () => {
    const dono = 'uid-dono-do-evento';
    await comUsuario(dono, { role: 'athlete', eventos: { [EV]: 'organizador' } });
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: EV, uid: dono, papel: 'operador' },
        administradorPapel
      ),
      'permission-denied'
    );
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: EV, uid: dono, papel: null },
        administradorPapel
      ),
      'permission-denied'
    );
  });

  it('CROSS-TENANT: gestor de outro tenant não gere equipe deste evento', async () => {
    const alvo = 'uid-alvo-cross';
    await comUsuario(alvo, { role: 'athlete' });
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: EV, uid: alvo, papel: 'operador' },
        passoOwner
      ),
      'permission-denied'
    );
  });

  it('athlete sem papel e papel de evento NÃO-gestor são negados', async () => {
    const alvo = 'uid-alvo-x';
    await comUsuario(alvo, { role: 'athlete' });
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: EV, uid: alvo, papel: 'operador' },
        { uid: 'uid-qualquer', claims: { role: 'athlete' } }
      ),
      'permission-denied'
    );
    // operador tem papel no evento mas NÃO gere equipe (matriz: equipe=false)
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: EV, uid: alvo, papel: 'operador' },
        {
          uid: 'uid-equipe-operador',
          claims: { role: 'athlete', eventos: { [EV]: 'operador' } } as AuthClaims,
        }
      ),
      'permission-denied'
    );
  });

  it('ADMINISTRADOR REMOVIDO com token velho não gere mais (âncora no write path)', async () => {
    // remove a âncora do administrador (Function teria feito isso ao removê-lo)
    await adminDb
      .collection('eventos')
      .doc(EV)
      .collection('equipe')
      .doc(administradorPapel.uid)
      .set({ status: 'removido', atualizadoEm: Timestamp.now() }, { merge: true });

    const alvo = 'uid-alvo-stale-admin';
    await comUsuario(alvo, { role: 'athlete' });
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: EV, uid: alvo, papel: 'operador' },
        administradorPapel // claims do token VELHO ainda dizem administrador
      ),
      'permission-denied'
    );
  });

  it('payload não escala para papel de PLATAFORMA nem aceita papel fora do enum', async () => {
    const alvo = 'uid-alvo-enum';
    await comUsuario(alvo, { role: 'athlete' });
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: EV, uid: alvo, papel: 'platform_admin' },
        marina
      ),
      'invalid-argument'
    );
    await expectHttpsError(
      setClaimsEquipeCore(adminDb, adminAuth, { eventoId: EV, uid: alvo, papel: 'root' }, marina),
      'invalid-argument'
    );
  });

  it('evento inexistente e alvo inexistente → not-found; input vazio → invalid-argument', async () => {
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: 'evento-fantasma', uid: 'uid-x', papel: 'operador' },
        marina
      ),
      'not-found'
    );
    await expectHttpsError(
      setClaimsEquipeCore(
        adminDb,
        adminAuth,
        { eventoId: EV, uid: 'uid-nunca-criado-no-auth', papel: 'operador' },
        marina
      ),
      'not-found'
    );
    await expectHttpsError(
      setClaimsEquipeCore(adminDb, adminAuth, {}, marina),
      'invalid-argument'
    );
  });
});
