/**
 * clubsMutations.integration.test.ts — LEELA-E05 (contrato das telas L3)
 *
 * Integração REAL no Emulator (Firestore, Admin SDK): Functions
 * `removerMembro`, `transferirPropriedade` (tela de membros §2.15) e
 * `enviarConvites` (modal S104-T1 — RN-106 no servidor).
 *
 * Cobre:
 *   - removerMembro: remove + recontagem ∑ qtdMembrosAtivos; owner NÃO é
 *     removível; not-found; cross-tenant/papéis sem escrita negados;
 *     tenant suspenso bloqueado (RN-402)
 *   - transferirPropriedade: troca atômica (clube.ownerId + papel novo owner
 *     + rebaixamento do anterior); transferir para o próprio owner falha
 *   - enviarConvites: grava convites deduplicados; reenvio idempotente;
 *     0 e 51 emails → invalid-argument (RN-106); formato inválido rejeita;
 *     cliente NÃO escreve na subcoleção convites (Rules catch-all)
 *
 * Skip real (describe.skipIf) sem FIRESTORE_EMULATOR_HOST — padrão C1.
 */
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import {
  removerMembroCore,
  transferirPropriedadeCore,
  type ClubsCaller,
} from '../clubs/membrosMutations';
import { enviarConvitesCore } from '../clubs/enviarConvites';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// ── Fixtures ──────────────────────────────────────────────────────────────
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const SUSPENSO_ID = 'tenant-suspenso';

const MARINA_UID = 'uid-marina-castelo';
const CLUBE_ID = 'clube-membros-castelo';
const CLUBE_SUSPENSO_ID = 'clube-do-suspenso';

const marina: ClubsCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID },
};
const staffCastelo: ClubsCaller = {
  uid: 'uid-staff-castelo',
  claims: { role: 'tenant_staff', tenantId: CASTELO_ID },
};
const passoOwner: ClubsCaller = {
  uid: 'uid-passo-owner',
  claims: { role: 'tenant_owner', tenantId: PASSO_ID },
};
const athlete: ClubsCaller = {
  uid: 'uid-atleta',
  claims: { role: 'athlete' },
};
const promoter: ClubsCaller = {
  uid: 'uid-promoter',
  claims: { role: 'promoter', tenantId: CASTELO_ID },
};
const ownerSuspenso: ClubsCaller = {
  uid: 'uid-suspenso-owner',
  claims: { role: 'tenant_owner', tenantId: SUSPENSO_ID },
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

async function expectHttpsError(
  promise: Promise<unknown>,
  code: string,
  contains?: string
): Promise<void> {
  try {
    await promise;
    expect.unreachable(`esperava HttpsError '${code}'`);
  } catch (err) {
    expect(err).toBeInstanceOf(https.HttpsError);
    const httpsErr = err as https.HttpsError;
    expect(httpsErr.code).toBe(code);
    if (contains) expect(httpsErr.message).toContain(contains);
  }
}

describe.skipIf(!hasEmulator)('clubs — mutations de membros e convites', () => {
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
    const batch = db.batch();

    batch.set(db.collection('tenants').doc(CASTELO_ID), {
      id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
      status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.collection('tenants').doc(PASSO_ID), {
      id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
      status: 'ativo', ownerUid: passoOwner.uid, tipo: 'promotor',
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.collection('tenants').doc(SUSPENSO_ID), {
      id: SUSPENSO_ID, nome: 'Tenant Suspenso', slug: SUSPENSO_ID,
      status: 'suspenso', ownerUid: ownerSuspenso.uid, tipo: 'produtor',
      criadoEm: now, atualizadoEm: now,
    });

    // Agregado deliberadamente ERRADO (99) — a mutation deve recontar
    batch.set(db.collection('clubes').doc(CLUBE_ID), {
      id: CLUBE_ID, tenantId: CASTELO_ID,
      nome: 'Clube Membros Castelo', slug: CLUBE_ID,
      visibilidade: 'privada', ownerId: MARINA_UID,
      codigoConvite: 'FGHJK', qtdMembrosAtivos: 99, qtdDesafiosAtivos: 0,
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.collection('clubes').doc(CLUBE_SUSPENSO_ID), {
      id: CLUBE_SUSPENSO_ID, tenantId: SUSPENSO_ID,
      nome: 'Clube do Suspenso', slug: CLUBE_SUSPENSO_ID,
      visibilidade: 'privada', ownerId: ownerSuspenso.uid,
      codigoConvite: 'MNPQR', qtdMembrosAtivos: 0, qtdDesafiosAtivos: 0,
      criadoEm: now, atualizadoEm: now,
    });

    const membros = db.collection('clubes').doc(CLUBE_ID).collection('membros');
    batch.set(membros.doc('membro-marina'), {
      id: 'membro-marina', tenantId: CASTELO_ID,
      atletaId: MARINA_UID, atletaNome: 'Marina Castelo',
      papel: 'owner', entrouVia: 'codigo', status: 'ativo',
      entrouEm: now, criadoEm: now, atualizadoEm: now,
    });
    batch.set(membros.doc('membro-ana'), {
      id: 'membro-ana', tenantId: CASTELO_ID,
      atletaId: 'uid-ana', atletaNome: 'Ana Prado',
      papel: 'membro', entrouVia: 'convite', status: 'ativo',
      entrouEm: now, criadoEm: now, atualizadoEm: now,
    });
    batch.set(membros.doc('membro-bia'), {
      id: 'membro-bia', tenantId: CASTELO_ID,
      atletaId: 'uid-bia', atletaNome: 'Bia Ramos',
      papel: 'admin', entrouVia: 'link', status: 'novo',
      entrouEm: now, criadoEm: now, atualizadoEm: now,
    });

    batch.set(
      db.collection('clubes').doc(CLUBE_SUSPENSO_ID)
        .collection('membros').doc('membro-x'),
      {
        id: 'membro-x', tenantId: SUSPENSO_ID,
        atletaId: 'uid-x', atletaNome: 'Xavier',
        papel: 'membro', entrouVia: 'codigo', status: 'ativo',
        entrouEm: now, criadoEm: now, atualizadoEm: now,
      }
    );

    await batch.commit();
  }

  function membroRef(id: string) {
    return db.collection('clubes').doc(CLUBE_ID).collection('membros').doc(id);
  }

  // ── removerMembro ────────────────────────────────────────────────────────

  describe('removerMembro (§2.15)', () => {
    it('tenant writer remove membro e o ∑ qtdMembrosAtivos é RECONTADO', async () => {
      const r = await removerMembroCore(
        db, { clubeId: CLUBE_ID, membroId: 'membro-ana' }, marina
      );
      expect(r).toEqual({ removido: true });

      expect((await membroRef('membro-ana').get()).exists).toBe(false);
      // sobraram marina (ativo) + bia (novo) → recontagem corrige 99 → 2
      const clube = await db.collection('clubes').doc(CLUBE_ID).get();
      expect(clube.get('qtdMembrosAtivos')).toBe(2);
    });

    it('staff do tenant também remove (papel de escrita)', async () => {
      const r = await removerMembroCore(
        db, { clubeId: CLUBE_ID, membroId: 'membro-bia' }, staffCastelo
      );
      expect(r.removido).toBe(true);
    });

    it('OWNER não é removível → failed-precondition (transferir antes)', async () => {
      await expectHttpsError(
        removerMembroCore(
          db, { clubeId: CLUBE_ID, membroId: 'membro-marina' }, marina
        ),
        'failed-precondition',
        'transfira a propriedade'
      );
      expect((await membroRef('membro-marina').get()).exists).toBe(true);
    });

    it('membro inexistente → not-found', async () => {
      await expectHttpsError(
        removerMembroCore(
          db, { clubeId: CLUBE_ID, membroId: 'fantasma' }, marina
        ),
        'not-found'
      );
    });

    it('cross-tenant, athlete e promoter → permission-denied', async () => {
      await expectHttpsError(
        removerMembroCore(
          db, { clubeId: CLUBE_ID, membroId: 'membro-ana' }, passoOwner
        ),
        'permission-denied'
      );
      await expectHttpsError(
        removerMembroCore(
          db, { clubeId: CLUBE_ID, membroId: 'membro-ana' }, athlete
        ),
        'permission-denied'
      );
      await expectHttpsError(
        removerMembroCore(
          db, { clubeId: CLUBE_ID, membroId: 'membro-ana' }, promoter
        ),
        'permission-denied'
      );
      expect((await membroRef('membro-ana').get()).exists).toBe(true);
    });

    it('tenant suspenso → failed-precondition (RN-402)', async () => {
      await expectHttpsError(
        removerMembroCore(
          db, { clubeId: CLUBE_SUSPENSO_ID, membroId: 'membro-x' }, ownerSuspenso
        ),
        'failed-precondition'
      );
    });

    it('input inválido → invalid-argument', async () => {
      await expectHttpsError(
        removerMembroCore(db, { clubeId: CLUBE_ID }, marina),
        'invalid-argument'
      );
    });
  });

  // ── transferirPropriedade ────────────────────────────────────────────────

  describe('transferirPropriedade (§2.15)', () => {
    it('troca atômica: ownerId + papel do novo owner + rebaixa o anterior', async () => {
      const r = await transferirPropriedadeCore(
        db, { clubeId: CLUBE_ID, membroId: 'membro-ana' }, marina
      );
      expect(r).toEqual({
        novoOwnerUid: 'uid-ana',
        ownerAnteriorMembroId: 'membro-marina',
      });

      const clube = await db.collection('clubes').doc(CLUBE_ID).get();
      expect(clube.get('ownerId')).toBe('uid-ana');
      expect((await membroRef('membro-ana').get()).get('papel')).toBe('owner');
      expect((await membroRef('membro-marina').get()).get('papel')).toBe('admin');
    });

    it('transferir para quem JÁ é owner → failed-precondition', async () => {
      await expectHttpsError(
        transferirPropriedadeCore(
          db, { clubeId: CLUBE_ID, membroId: 'membro-marina' }, marina
        ),
        'failed-precondition',
        'já é o owner'
      );
    });

    it('membro inexistente → not-found; cross-tenant → permission-denied', async () => {
      await expectHttpsError(
        transferirPropriedadeCore(
          db, { clubeId: CLUBE_ID, membroId: 'fantasma' }, marina
        ),
        'not-found'
      );
      await expectHttpsError(
        transferirPropriedadeCore(
          db, { clubeId: CLUBE_ID, membroId: 'membro-ana' }, passoOwner
        ),
        'permission-denied'
      );
    });
  });

  // ── enviarConvites ───────────────────────────────────────────────────────

  describe('enviarConvites (RN-106)', () => {
    function convitesRef() {
      return db.collection('clubes').doc(CLUBE_ID).collection('convites');
    }

    it('grava convites deduplicados (case-insensitive) com convidadoPor', async () => {
      const r = await enviarConvitesCore(
        db,
        { clubeId: CLUBE_ID, emails: ['ana@ex.com', 'Bia@ex.com', 'ANA@ex.com'] },
        marina
      );
      expect(r).toEqual({ enviados: 2, total: 3 });

      const docs = await convitesRef().get();
      expect(docs.size).toBe(2);
      const ana = await convitesRef().doc('ana@ex.com').get();
      expect(ana.data()).toMatchObject({
        email: 'ana@ex.com',
        tenantId: CASTELO_ID,
        status: 'pendente',
        convidadoPor: MARINA_UID,
      });
    });

    it('reenvio para o mesmo email é idempotente (1 doc, criadoEm preservado)', async () => {
      await enviarConvitesCore(
        db, { clubeId: CLUBE_ID, emails: ['ana@ex.com'] }, marina
      );
      const criadoEm = (await convitesRef().doc('ana@ex.com').get()).get('criadoEm');

      await enviarConvitesCore(
        db, { clubeId: CLUBE_ID, emails: ['ana@ex.com'] }, marina
      );
      const docs = await convitesRef().get();
      expect(docs.size).toBe(1);
      expect(
        (await convitesRef().doc('ana@ex.com').get()).get('criadoEm')
      ).toEqual(criadoEm);
    });

    it('0 emails e 51 emails → invalid-argument (aceite RN-106)', async () => {
      await expectHttpsError(
        enviarConvitesCore(db, { clubeId: CLUBE_ID, emails: [] }, marina),
        'invalid-argument'
      );
      const cinquentaEUm = Array.from(
        { length: 51 }, (_, i) => `pessoa${i}@ex.com`
      );
      await expectHttpsError(
        enviarConvitesCore(
          db, { clubeId: CLUBE_ID, emails: cinquentaEUm }, marina
        ),
        'invalid-argument',
        'RN-106'
      );
    });

    it('50 emails exatos passam (limite inclusivo)', async () => {
      const cinquenta = Array.from(
        { length: 50 }, (_, i) => `pessoa${i}@ex.com`
      );
      const r = await enviarConvitesCore(
        db, { clubeId: CLUBE_ID, emails: cinquenta }, marina
      );
      expect(r.enviados).toBe(50);
    });

    it('email com formato inválido → invalid-argument', async () => {
      await expectHttpsError(
        enviarConvitesCore(
          db, { clubeId: CLUBE_ID, emails: ['sem-arroba'] }, marina
        ),
        'invalid-argument'
      );
    });

    it('cross-tenant → permission-denied; suspenso → failed-precondition', async () => {
      await expectHttpsError(
        enviarConvitesCore(
          db, { clubeId: CLUBE_ID, emails: ['a@ex.com'] }, passoOwner
        ),
        'permission-denied'
      );
      await expectHttpsError(
        enviarConvitesCore(
          db, { clubeId: CLUBE_SUSPENSO_ID, emails: ['a@ex.com'] }, ownerSuspenso
        ),
        'failed-precondition'
      );
    });

    it('Rules: cliente NÃO escreve NEM lê a subcoleção convites (canário flipado LEELA-R2)', async () => {
      // CANÁRIO FLIPADO (LEELA-R2, par do flip de demografia em 19c8afe):
      // o catch-all de clubes fechou — `convites` carrega hash do token de
      // aceite (E18) + e-mail, e a leitura de membro minava o fail-closed
      // do pre-hijack (9e7e017). Nenhuma superfície de client lê convites
      // (painel usa mutations/Functions); listar convites um dia = Function
      // com projeção ou match próprio SEM tokenAceiteHash + teste.
      await enviarConvitesCore(
        db, { clubeId: CLUBE_ID, emails: ['ana@ex.com'] }, marina
      );

      const clienteCastelo = testEnv
        .authenticatedContext(MARINA_UID, {
          role: 'tenant_owner',
          tenantId: CASTELO_ID,
        })
        .firestore() as unknown as Firestore;

      await assertFails(
        getDoc(doc(clienteCastelo, 'clubes', CLUBE_ID, 'convites', 'ana@ex.com'))
      );
      await assertFails(
        setDoc(
          doc(clienteCastelo, 'clubes', CLUBE_ID, 'convites', 'forjado@ex.com'),
          { email: 'forjado@ex.com', status: 'pendente' }
        )
      );
    });
  });
});
