/**
 * comunicadosRules.test.ts — LEELA-S108-T1
 *
 * Integração (Firestore Emulator): Security Rules de
 * `clubes/{clubeId}/comunicados`.
 *
 * Cobre (RN-130/131/132/134/135):
 *   - campos de Function (alcance, aberturasPct, enviadoEm) e o status
 *     'enviado' são EXCLUSIVOS da Function de envio: cliente cria/edita
 *     apenas rascunho/agendado;
 *   - comunicado enviado é imutável/indeletável para o cliente;
 *   - shape: canal 1..2 dentro do enum; origem no enum; segmento com tipo
 *     válido; capa exige canal email (RN-135);
 *   - RBAC/isolamento: promoter não escreve; cross-tenant negado.
 *
 * Skip real (describe.skipIf) sem FIRESTORE_EMULATOR_HOST — padrão C1.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// ── Fixtures ──────────────────────────────────────────────────────────────
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';

const CLUBE_ID = 'clube-comunicados-castelo';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('comunicados — Rules (S108-T1)', () => {
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

    batch.set(adminDb.collection('clubes').doc(CLUBE_ID), {
      id: CLUBE_ID, tenantId: CASTELO_ID,
      nome: 'Clube Comunicados Castelo', slug: CLUBE_ID,
      visibilidade: 'privada', ownerId: MARINA_UID,
      codigoConvite: 'FGHJK', qtdMembrosAtivos: 0, qtdDesafiosAtivos: 0,
      criadoEm: now, atualizadoEm: now,
    });

    // Rascunho existente (edição) + enviado (imutável) — via Admin SDK
    batch.set(comunicadoAdminRef('rascunho-base'), {
      id: 'rascunho-base', tenantId: CASTELO_ID,
      titulo: 'Rascunho base', conteudo: 'Conteúdo em construção do clube.',
      canal: ['email'], origem: 'manual', status: 'rascunho',
      segmento: { tipo: 'todos' }, alcance: 0,
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(comunicadoAdminRef('enviado-base'), {
      id: 'enviado-base', tenantId: CASTELO_ID,
      titulo: 'Enviado base', conteudo: 'Comunicado que já saiu para a base.',
      canal: ['push'], origem: 'manual', status: 'enviado',
      segmento: { tipo: 'todos', tamanhoEstimado: 120 },
      alcance: 120, aberturasPct: 58, enviadoEm: now,
      criadoEm: now, atualizadoEm: now,
    });

    await batch.commit();
  }

  function comunicadoAdminRef(id: string) {
    return adminDb
      .collection('clubes').doc(CLUBE_ID)
      .collection('comunicados').doc(id);
  }

  function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
    return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
  }

  function comunicadoDoc(db: Firestore, id: string) {
    return doc(db, 'clubes', CLUBE_ID, 'comunicados', id);
  }

  const castelo = () =>
    dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });

  const comunicadoValido = {
    tenantId: CASTELO_ID,
    titulo: 'Treino de sábado',
    conteudo: 'Encontro às 7h na Lagoa da Conceição para treino conjunto.',
    canal: ['push', 'email'],
    origem: 'manual',
    status: 'rascunho',
    segmento: { tipo: 'todos' },
  };

  // ── Leitura ──────────────────────────────────────────────────────────────

  describe('leitura (tenant-only)', () => {
    it('membro do tenant lê; outro tenant e anônimo não', async () => {
      await assertSucceeds(getDoc(comunicadoDoc(castelo(), 'rascunho-base')));

      const outro = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(getDoc(comunicadoDoc(outro, 'rascunho-base')));

      const anon = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
      await assertFails(getDoc(comunicadoDoc(anon, 'rascunho-base')));
    });
  });

  // ── Create ───────────────────────────────────────────────────────────────

  describe('create (rascunho/agendado; campos de Function proibidos)', () => {
    it('tenant writer cria rascunho válido', async () => {
      await assertSucceeds(
        setDoc(comunicadoDoc(castelo(), 'novo-rascunho'), comunicadoValido)
      );
    });

    it('agendado válido também nasce do cliente', async () => {
      await assertSucceeds(
        setDoc(comunicadoDoc(castelo(), 'novo-agendado'), {
          ...comunicadoValido, status: 'agendado', agendadoPara: new Date(),
        })
      );
    });

    it("T9: 'agendado' SEM agendadoPara é NEGADO (espelho S6a — form valida, rule espelha)", async () => {
      await assertFails(
        setDoc(comunicadoDoc(castelo(), 'agendado-sem-data'), {
          ...comunicadoValido, status: 'agendado',
        })
      );
    });

    it('T11: título < 5 ou conteúdo < 10 chars é NEGADO (espelho mínimo RN-134/SPEC-02)', async () => {
      await assertFails(
        setDoc(comunicadoDoc(castelo(), 'titulo-curto'), {
          ...comunicadoValido, titulo: 'Oi',
        })
      );
      await assertFails(
        setDoc(comunicadoDoc(castelo(), 'conteudo-curto'), {
          ...comunicadoValido, conteudo: 'curto',
        })
      );
      await assertFails(
        setDoc(comunicadoDoc(castelo(), 'titulo-espacos'), {
          ...comunicadoValido, titulo: '        ',
        })
      );
    });

    it("cliente NÃO cria direto como 'enviado' (RN-130 — envio é da Function)", async () => {
      await assertFails(
        setDoc(comunicadoDoc(castelo(), 'enviado-forjado'), {
          ...comunicadoValido, status: 'enviado',
        })
      );
    });

    it('cliente NÃO carimba enviadoEm/alcance/aberturasPct', async () => {
      await assertFails(
        setDoc(comunicadoDoc(castelo(), 'fraude-1'), {
          ...comunicadoValido, enviadoEm: new Date(),
        })
      );
      await assertFails(
        setDoc(comunicadoDoc(castelo(), 'fraude-2'), {
          ...comunicadoValido, alcance: 5000,
        })
      );
      await assertFails(
        setDoc(comunicadoDoc(castelo(), 'fraude-3'), {
          ...comunicadoValido, aberturasPct: 100,
        })
      );
    });

    it('canal vazio ou fora do enum é NEGADO (RN-131)', async () => {
      await assertFails(
        setDoc(comunicadoDoc(castelo(), 'canal-vazio'), {
          ...comunicadoValido, canal: [],
        })
      );
      await assertFails(
        setDoc(comunicadoDoc(castelo(), 'canal-x'), {
          ...comunicadoValido, canal: ['sms'],
        })
      );
    });

    it('origem fora do enum é NEGADA (RN-132)', async () => {
      await assertFails(
        setDoc(comunicadoDoc(castelo(), 'origem-x'), {
          ...comunicadoValido, origem: 'bot',
        })
      );
    });

    it('capa em comunicado SÓ PUSH é NEGADA (RN-135)', async () => {
      await assertFails(
        setDoc(comunicadoDoc(castelo(), 'capa-push'), {
          ...comunicadoValido, canal: ['push'], capaUrl: 'https://cdn/img.jpg',
        })
      );
      // com email no mix, capa é válida
      await assertSucceeds(
        setDoc(comunicadoDoc(castelo(), 'capa-email'), {
          ...comunicadoValido, canal: ['email'], capaUrl: 'https://cdn/img.jpg',
        })
      );
    });

    it('promoter e cross-tenant NÃO criam', async () => {
      const promoter = dbAs('uid-promoter', { role: 'promoter', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(comunicadoDoc(promoter, 'de-promoter'), comunicadoValido)
      );

      const outro = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(
        setDoc(comunicadoDoc(outro, 'de-outro-tenant'), {
          ...comunicadoValido, tenantId: PASSO_ID,
        })
      );
    });
  });

  // ── Update / delete ──────────────────────────────────────────────────────

  describe('update/delete (enviado é imutável para o cliente)', () => {
    it('editar rascunho (título/conteúdo) → permitido', async () => {
      await assertSucceeds(
        updateDoc(comunicadoDoc(castelo(), 'rascunho-base'), {
          titulo: 'Rascunho revisado',
        })
      );
    });

    it('agendar rascunho (status rascunho→agendado) → permitido', async () => {
      await assertSucceeds(
        updateDoc(comunicadoDoc(castelo(), 'rascunho-base'), {
          status: 'agendado', agendadoPara: new Date(),
        })
      );
    });

    it('update para agendado SEM agendadoPara é NEGADO (espelho S6a no update)', async () => {
      await assertFails(
        updateDoc(comunicadoDoc(castelo(), 'rascunho-base'), {
          status: 'agendado',
        })
      );
    });

    it("cliente NÃO promove status para 'enviado' (só a Function)", async () => {
      await assertFails(
        updateDoc(comunicadoDoc(castelo(), 'rascunho-base'), {
          status: 'enviado',
        })
      );
    });

    it('cliente NÃO toca alcance/aberturasPct/enviadoEm no update', async () => {
      await assertFails(
        updateDoc(comunicadoDoc(castelo(), 'rascunho-base'), { alcance: 999 })
      );
    });

    it('comunicado ENVIADO é imutável para o cliente (nem rebaixar status)', async () => {
      await assertFails(
        updateDoc(comunicadoDoc(castelo(), 'enviado-base'), {
          status: 'rascunho',
        })
      );
      await assertFails(
        updateDoc(comunicadoDoc(castelo(), 'enviado-base'), {
          titulo: 'Reescrevendo a história',
        })
      );
    });

    it('deletar rascunho ok; deletar ENVIADO negado (trilha de comunicação)', async () => {
      await assertSucceeds(deleteDoc(comunicadoDoc(castelo(), 'rascunho-base')));
      await assertFails(deleteDoc(comunicadoDoc(castelo(), 'enviado-base')));
    });
  });
});
