/**
 * parceriasRules.test.ts — LEELA-S107-T1
 *
 * Integração (Firestore Emulator): Security Rules de
 * `clubes/{clubeId}/parcerias` + subcoleção `conversoes`.
 *
 * Cobre (RN-120/121/122/123/125):
 *   - comissão/termos/link/cupom são READ-ONLY para o clube: update que
 *     toca comissaoPct (ou qualquer campo espelhado) é negado;
 *   - agregados ∑ (conversoes, valorAReceber) só via Function;
 *   - evento_afiliado: cliente SÓ transiciona status (aceitar/recusar/
 *     pausar); create/delete de evento_afiliado negados ao cliente
 *     (convite nasce do organizador via Function; trilha financeira não
 *     some);
 *   - patrocinador: create/update/delete pelo tenant writer com shape
 *     (modelo comercial no enum; contrapartida ≥ 20 chars; valorAnual > 0
 *     quando financeiro);
 *   - subcoleção conversoes: leitura tenant; escrita de cliente negada;
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

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// ── Fixtures ──────────────────────────────────────────────────────────────
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';

const CLUBE_ID = 'clube-parcerias-castelo';
const EVENTO_PARCERIA_ID = 'parceria-evento-meia';
const PATROCINADOR_ID = 'parceria-cdl';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('parcerias — Rules (S107-T1)', () => {
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

    batch.set(adminDb.collection('clubes').doc(CLUBE_ID), {
      id: CLUBE_ID, tenantId: CASTELO_ID,
      nome: 'Clube Parcerias Castelo', slug: CLUBE_ID,
      visibilidade: 'privada', ownerId: MARINA_UID,
      codigoConvite: 'FGHJK', qtdMembrosAtivos: 0, qtdDesafiosAtivos: 0,
      criadoEm: now, atualizadoEm: now,
    });

    // Parceria evento_afiliado (como a Function/organizador escreveria)
    batch.set(parceriaAdminRef(EVENTO_PARCERIA_ID), {
      id: EVENTO_PARCERIA_ID, tenantId: CASTELO_ID,
      tipo: 'evento_afiliado', status: 'convite_pendente',
      eventoId: 'meia-floripa-2026', organizadorId: 'uid-organizador',
      programaAfiliacaoRef: 'eventos/meia-floripa-2026/programaAfiliacao/atual',
      comissaoPct: 10, cupom: 'CORRIDAPERFEITA10',
      linkMaster: 'beh.ro/mfl26?c=cps', janelaAtribuicaoDias: 7,
      termosEspelho: {
        criterioLiberacao: 'Após 28 Abr 2026',
        prazoRepasseDiasUteis: 10,
        tetoMensal: null,
      },
      conversoes: 28, valorAReceber: 528,
      criadoEm: now, atualizadoEm: now,
    });

    // Patrocinador existente
    batch.set(parceriaAdminRef(PATROCINADOR_ID), {
      id: PATROCINADOR_ID, tenantId: CASTELO_ID,
      tipo: 'patrocinador', status: 'ativa',
      nome: 'CDL Wellness', modeloComercial: 'financeiro',
      valorAnual: 12000,
      contrapartida: 'Logo em todos os desafios · 1 post mensal no app',
      criadoEm: now, atualizadoEm: now,
    });

    batch.set(
      parceriaAdminRef(EVENTO_PARCERIA_ID).collection('conversoes').doc('tx-1'),
      { id: 'tx-1', valorComissao: 18.5, clicadoEm: now, convertidoEm: now }
    );

    await batch.commit();
  }

  function parceriaAdminRef(id: string) {
    return adminDb
      .collection('clubes').doc(CLUBE_ID)
      .collection('parcerias').doc(id);
  }

  function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
    return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
  }

  function parceriaDoc(db: Firestore, id: string) {
    return doc(db, 'clubes', CLUBE_ID, 'parcerias', id);
  }

  const castelo = () =>
    dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
  const outroTenant = () =>
    dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });

  // ── Leitura ──────────────────────────────────────────────────────────────

  describe('leitura (tenant-only)', () => {
    it('membro do tenant dono lê parcerias e conversões', async () => {
      await assertSucceeds(getDoc(parceriaDoc(castelo(), EVENTO_PARCERIA_ID)));
      await assertSucceeds(
        getDoc(
          doc(castelo(), 'clubes', CLUBE_ID, 'parcerias', EVENTO_PARCERIA_ID, 'conversoes', 'tx-1')
        )
      );
    });

    it('outro tenant e anônimo NÃO leem', async () => {
      await assertFails(getDoc(parceriaDoc(outroTenant(), EVENTO_PARCERIA_ID)));
      const anon = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
      await assertFails(getDoc(parceriaDoc(anon, EVENTO_PARCERIA_ID)));
    });
  });

  // ── evento_afiliado: clube só transiciona status ─────────────────────────

  describe('evento_afiliado (comissão read-only — RN-120/122)', () => {
    it('aceitar parceria: status convite_pendente → ativa (permitido)', async () => {
      await assertSucceeds(
        updateDoc(parceriaDoc(castelo(), EVENTO_PARCERIA_ID), {
          status: 'ativa',
        })
      );
    });

    it('recusar/pausar: status → inativa (permitido)', async () => {
      await assertSucceeds(
        updateDoc(parceriaDoc(castelo(), EVENTO_PARCERIA_ID), {
          status: 'inativa',
        })
      );
    });

    it('clube tenta escrever comissaoPct → NEGADO (aceite RN-120/122)', async () => {
      await assertFails(
        updateDoc(parceriaDoc(castelo(), EVENTO_PARCERIA_ID), {
          comissaoPct: 50,
        })
      );
    });

    it('clube tenta editar termos espelhados/link/cupom → NEGADO', async () => {
      await assertFails(
        updateDoc(parceriaDoc(castelo(), EVENTO_PARCERIA_ID), {
          linkMaster: 'beh.ro/hackeado',
        })
      );
      await assertFails(
        updateDoc(parceriaDoc(castelo(), EVENTO_PARCERIA_ID), {
          termosEspelho: { criterioLiberacao: 'Imediata', prazoRepasseDiasUteis: 0, tetoMensal: null },
        })
      );
    });

    it('clube tenta inflar ∑ conversoes/valorAReceber → NEGADO', async () => {
      await assertFails(
        updateDoc(parceriaDoc(castelo(), EVENTO_PARCERIA_ID), {
          conversoes: 999,
        })
      );
      await assertFails(
        updateDoc(parceriaDoc(castelo(), EVENTO_PARCERIA_ID), {
          status: 'ativa', valorAReceber: 99999,
        })
      );
    });

    it('status fora do enum é NEGADO', async () => {
      await assertFails(
        updateDoc(parceriaDoc(castelo(), EVENTO_PARCERIA_ID), {
          status: 'renegociando',
        })
      );
    });

    it('cliente NÃO cria evento_afiliado (convite nasce do organizador)', async () => {
      await assertFails(
        setDoc(parceriaDoc(castelo(), 'parceria-evento-forjado'), {
          tenantId: CASTELO_ID, tipo: 'evento_afiliado',
          status: 'ativa', eventoId: 'evento-x', organizadorId: 'uid-x',
          programaAfiliacaoRef: 'eventos/evento-x/programaAfiliacao/atual',
          comissaoPct: 90, cupom: null, linkMaster: 'beh.ro/x',
          janelaAtribuicaoDias: 365,
          termosEspelho: { criterioLiberacao: 'Já', prazoRepasseDiasUteis: 0, tetoMensal: null },
          conversoes: 0, valorAReceber: 0,
        })
      );
    });

    it('cliente NÃO deleta evento_afiliado (trilha financeira)', async () => {
      await assertFails(deleteDoc(parceriaDoc(castelo(), EVENTO_PARCERIA_ID)));
    });
  });

  // ── patrocinador: CRUD do clube com shape ────────────────────────────────

  describe('patrocinador (RN-123)', () => {
    const patrocinadorValido = {
      tenantId: CASTELO_ID,
      tipo: 'patrocinador',
      status: 'ativa',
      nome: 'ACATE Run Club',
      modeloComercial: 'permuta',
      contrapartida: 'Desafio conjunto aberto a membros ACATE · co-branding',
    };

    it('tenant writer cria patrocinador válido (permuta)', async () => {
      await assertSucceeds(
        setDoc(parceriaDoc(castelo(), 'parceria-acate'), patrocinadorValido)
      );
    });

    it('financeiro exige valorAnual > 0', async () => {
      await assertSucceeds(
        setDoc(parceriaDoc(castelo(), 'parceria-fin'), {
          ...patrocinadorValido, modeloComercial: 'financeiro', valorAnual: 12000,
        })
      );
      await assertFails(
        setDoc(parceriaDoc(castelo(), 'parceria-fin-sem-valor'), {
          ...patrocinadorValido, modeloComercial: 'financeiro',
        })
      );
    });

    it('contrapartida < 20 chars é NEGADA (SPEC-02)', async () => {
      await assertFails(
        setDoc(parceriaDoc(castelo(), 'parceria-curta'), {
          ...patrocinadorValido, contrapartida: 'logo no site',
        })
      );
    });

    it('modelo comercial fora do enum é NEGADO (RN-123)', async () => {
      await assertFails(
        setDoc(parceriaDoc(castelo(), 'parceria-modelo-x'), {
          ...patrocinadorValido, modeloComercial: 'equity',
        })
      );
    });

    it('patrocinador NÃO nasce com campos de afiliação/∑ (fraude de shape)', async () => {
      await assertFails(
        setDoc(parceriaDoc(castelo(), 'parceria-hibrida'), {
          ...patrocinadorValido, comissaoPct: 10, valorAReceber: 1000,
        })
      );
    });

    it('update de patrocinador (desativar) permitido; delete também', async () => {
      await assertSucceeds(
        updateDoc(parceriaDoc(castelo(), PATROCINADOR_ID), { status: 'inativa' })
      );
      await assertSucceeds(deleteDoc(parceriaDoc(castelo(), PATROCINADOR_ID)));
    });

    it('promoter e cross-tenant NÃO escrevem', async () => {
      const promoter = dbAs('uid-promoter', { role: 'promoter', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(parceriaDoc(promoter, 'parceria-promoter'), patrocinadorValido)
      );
      await assertFails(
        updateDoc(parceriaDoc(outroTenant(), PATROCINADOR_ID), { status: 'inativa' })
      );
    });
  });

  // ── conversoes: escrita só via Function ──────────────────────────────────

  describe('subcoleção conversoes (∑ trail — só Function)', () => {
    it('cliente NÃO cria conversão (nem o próprio tenant)', async () => {
      await assertFails(
        setDoc(
          doc(castelo(), 'clubes', CLUBE_ID, 'parcerias', EVENTO_PARCERIA_ID, 'conversoes', 'tx-forjada'),
          { id: 'tx-forjada', valorComissao: 9999, clicadoEm: new Date(), convertidoEm: new Date() }
        )
      );
    });

    it('cliente NÃO deleta conversão registrada', async () => {
      await assertFails(
        deleteDoc(
          doc(castelo(), 'clubes', CLUBE_ID, 'parcerias', EVENTO_PARCERIA_ID, 'conversoes', 'tx-1')
        )
      );
    });
  });
});
