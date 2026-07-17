/**
 * campanhasRules.integration.test.ts — LEELA-S401-T1 (E06-L1-T2)
 *
 * Integração (Firestore Emulator): Security Rules de
 * `eventos/{eventoId}/campanhas` + api-client (listarCampanhas por estado)
 * + seed canônico.
 *
 * Cobre (aceites do brief E06-L1-T2 + postura antagonista):
 *   - leitura/escrita NEGADAS a não-membro do tenant (cross-tenant) e anônimo;
 *   - cliente que cria com status 'enviado' OU com alcance != 0 /
 *     enviadoEm / aberturasPct é NEGADO (espelho CAMPOS_FUNCTION_COMUNICADO);
 *   - update que toca alcance/enviadoEm/aberturasPct é negado;
 *   - campanha enviada é imutável/indeletável para cliente;
 *   - capaUrl sem email no canal → shape inválido (RN-135);
 *   - segmento 'por_engajamento' → NEGADO (corte 5 — fora do enum do evento);
 *   - promoter (membro sem papel de escrita) lê mas NÃO escreve;
 *   - seed: 3 campanhas canônicas (1 enviada 48 · 1 agendada · 1 rascunho).
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
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
import { listarCampanhas } from '@leela/api-client';
import {
  ALCANCE_KIT_PRONTO_SEED,
  seedCampanhas,
  TOTAL_CAMPANHAS_SEED,
} from '../seed/campanhas.seed';
import { MEIA_FLORIPA_ID } from '../seed/eventos.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// ── Fixtures ──────────────────────────────────────────────────────────────
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';
const PROMOTER_UID = 'uid-promoter-castelo';

const EVENTO_ID = 'evento-campanhas-castelo';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('campanhas — Rules + api-client (S401-T1)', () => {
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

    batch.set(adminDb.collection('eventos').doc(EVENTO_ID), {
      id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
      nome: 'Evento Campanhas Castelo', slug: EVENTO_ID,
      status: 'publicado', qtdInscritos: 0, receitaConfirmada: 0,
      criadoEm: now, atualizadoEm: now,
    });

    // Rascunho existente (edição) + enviada (imutável) — via Admin SDK
    batch.set(campanhaAdminRef('rascunho-base'), {
      id: 'rascunho-base', tenantId: CASTELO_ID,
      titulo: 'Rascunho base', conteudo: 'Conteúdo em construção do evento.',
      canal: ['email'], origem: 'manual', status: 'rascunho',
      segmento: { tipo: 'todos_inscritos' }, alcance: 0,
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(campanhaAdminRef('enviada-base'), {
      id: 'enviada-base', tenantId: CASTELO_ID,
      titulo: 'Enviada base', conteudo: 'Campanha que já saiu para a base.',
      canal: ['push'], origem: 'manual', status: 'enviado',
      segmento: { tipo: 'por_kit', referencia: 'kit_ouro', tamanhoEstimado: 48 },
      alcance: 48, enviadoEm: now,
      criadoEm: now, atualizadoEm: now,
    });

    await batch.commit();
  }

  function campanhaAdminRef(id: string) {
    return adminDb
      .collection('eventos').doc(EVENTO_ID)
      .collection('campanhas').doc(id);
  }

  function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
    return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
  }

  function campanhaDoc(db: Firestore, id: string) {
    return doc(db, 'eventos', EVENTO_ID, 'campanhas', id);
  }

  const castelo = () =>
    dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
  const outroTenant = () =>
    dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
  const promoter = () =>
    dbAs(PROMOTER_UID, { role: 'promoter', tenantId: CASTELO_ID });

  const campanhaValida = {
    tenantId: CASTELO_ID,
    titulo: 'Cupom para amigos',
    conteudo: 'Use o cupom AMIGOCPS e ganhe desconto na inscrição.',
    canal: ['push', 'email'],
    origem: 'manual',
    status: 'rascunho',
    segmento: { tipo: 'por_modalidade', referencia: '21k' },
  };

  // ── Leitura ──────────────────────────────────────────────────────────────

  describe('leitura (tenant do evento pai)', () => {
    it('membro do tenant lê; outro tenant e anônimo NÃO (aceite do brief)', async () => {
      await assertSucceeds(getDoc(campanhaDoc(castelo(), 'rascunho-base')));
      await assertSucceeds(getDoc(campanhaDoc(promoter(), 'rascunho-base')));

      await assertFails(getDoc(campanhaDoc(outroTenant(), 'rascunho-base')));

      const anon = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
      await assertFails(getDoc(campanhaDoc(anon, 'rascunho-base')));
    });
  });

  // ── Create ───────────────────────────────────────────────────────────────

  describe('create (rascunho/agendado; campos de Function proibidos)', () => {
    it('tenant writer cria rascunho válido', async () => {
      await assertSucceeds(
        setDoc(campanhaDoc(castelo(), 'nova-rascunho'), campanhaValida)
      );
    });

    it('agendado válido nasce do cliente (com agendadoPara timestamp)', async () => {
      await assertSucceeds(
        setDoc(campanhaDoc(castelo(), 'nova-agendada'), {
          ...campanhaValida,
          status: 'agendado',
          agendadoPara: new Date(Date.now() + 3 * 86_400_000),
        })
      );
    });

    it('ATAQUE: criar direto com status enviado → NEGADO (RN-130)', async () => {
      await assertFails(
        setDoc(campanhaDoc(castelo(), 'forja-envio'), {
          ...campanhaValida,
          status: 'enviado',
        })
      );
    });

    it('ATAQUE: alcance != 0 / enviadoEm / aberturasPct no create → NEGADOS', async () => {
      await assertFails(
        setDoc(campanhaDoc(castelo(), 'forja-alcance'), {
          ...campanhaValida,
          alcance: 453,
        })
      );
      await assertFails(
        setDoc(campanhaDoc(castelo(), 'forja-carimbo'), {
          ...campanhaValida,
          enviadoEm: new Date(),
        })
      );
      await assertFails(
        setDoc(campanhaDoc(castelo(), 'forja-aberturas'), {
          ...campanhaValida,
          aberturasPct: 99,
        })
      );
    });

    it('ATAQUE cross-tenant: writer de OUTRO tenant não cria no evento alheio', async () => {
      await assertFails(
        setDoc(campanhaDoc(outroTenant(), 'invasao'), {
          ...campanhaValida,
          tenantId: PASSO_ID, // carimba o próprio tenant num evento alheio
        })
      );
      await assertFails(
        setDoc(campanhaDoc(outroTenant(), 'invasao-2'), campanhaValida)
      );
    });

    it('promoter (sem papel de escrita) não cria', async () => {
      await assertFails(
        setDoc(campanhaDoc(promoter(), 'promoter-cria'), campanhaValida)
      );
    });

    it('shape: capa sem email (RN-135), por_engajamento (corte 5), agendado sem data → NEGADOS', async () => {
      await assertFails(
        setDoc(campanhaDoc(castelo(), 'capa-push'), {
          ...campanhaValida,
          canal: ['push'],
          capaUrl: 'https://cdn/capa.png',
        })
      );
      await assertFails(
        setDoc(campanhaDoc(castelo(), 'seg-engajamento'), {
          ...campanhaValida,
          segmento: { tipo: 'por_engajamento', referencia: '7d' },
        })
      );
      await assertFails(
        setDoc(campanhaDoc(castelo(), 'agendada-sem-data'), {
          ...campanhaValida,
          status: 'agendado',
        })
      );
      await assertFails(
        setDoc(campanhaDoc(castelo(), 'seg-sem-ref'), {
          ...campanhaValida,
          segmento: { tipo: 'por_kit' },
        })
      );
    });
  });

  // ── Update / Delete ─────────────────────────────────────────────────────

  describe('update/delete (enviada é trilha imutável)', () => {
    it('writer edita rascunho sem tocar campos de Function', async () => {
      await assertSucceeds(
        updateDoc(campanhaDoc(castelo(), 'rascunho-base'), {
          titulo: 'Rascunho base revisado',
        })
      );
    });

    it('ATAQUE: update tocando alcance / enviadoEm → NEGADO', async () => {
      await assertFails(
        updateDoc(campanhaDoc(castelo(), 'rascunho-base'), { alcance: 10 })
      );
      await assertFails(
        updateDoc(campanhaDoc(castelo(), 'rascunho-base'), {
          enviadoEm: new Date(),
        })
      );
    });

    it('ATAQUE: promover rascunho a enviado via update → NEGADO', async () => {
      await assertFails(
        updateDoc(campanhaDoc(castelo(), 'rascunho-base'), {
          status: 'enviado',
        })
      );
    });

    it('campanha enviada: update e delete NEGADOS até para o owner', async () => {
      await assertFails(
        updateDoc(campanhaDoc(castelo(), 'enviada-base'), {
          titulo: 'Reescrevendo a história',
        })
      );
      await assertFails(deleteDoc(campanhaDoc(castelo(), 'enviada-base')));
    });

    it('rascunho é deletável pelo writer; por outro tenant NÃO', async () => {
      await assertFails(deleteDoc(campanhaDoc(outroTenant(), 'rascunho-base')));
      await assertSucceeds(deleteDoc(campanhaDoc(castelo(), 'rascunho-base')));
    });
  });

  // ── Decisão 17 (RN-136): 'vencido' é TERMINAL e exclusivo do cron ───────

  describe('vencida (RN-136 — decisão 17): terminal, exclusiva de Function', () => {
    async function seedVencida(): Promise<void> {
      const now = FieldValue.serverTimestamp();
      await campanhaAdminRef('vencida-base').set({
        id: 'vencida-base', tenantId: CASTELO_ID,
        titulo: 'Vencida base', conteudo: 'Agendamento que passou do prazo.',
        canal: ['email'], origem: 'manual', status: 'vencido',
        segmento: { tipo: 'todos_inscritos' }, alcance: 0,
        agendadoPara: new Date(Date.now() - 86_400_000),
        vencidoEm: now, criadoEm: now, atualizadoEm: now,
      });
    }

    it('ATAQUE: criar direto com status vencido OU com vencidoEm → NEGADO', async () => {
      await assertFails(
        setDoc(campanhaDoc(castelo(), 'forja-vencida'), {
          ...campanhaValida,
          status: 'vencido',
          agendadoPara: new Date(Date.now() - 86_400_000),
          vencidoEm: new Date(),
        })
      );
      await assertFails(
        setDoc(campanhaDoc(castelo(), 'forja-vencido-em'), {
          ...campanhaValida,
          vencidoEm: new Date(),
        })
      );
    });

    it('ATAQUE: update tocando vencidoEm em rascunho → NEGADO', async () => {
      await assertFails(
        updateDoc(campanhaDoc(castelo(), 'rascunho-base'), {
          vencidoEm: new Date(),
        })
      );
    });

    it('vencida é TERMINAL: reviver (update p/ agendado/rascunho) e delete NEGADOS até para o owner; leitura de membro OK', async () => {
      await seedVencida();
      await assertSucceeds(getDoc(campanhaDoc(castelo(), 'vencida-base')));
      // Reviver para agendado com data nova — NEGADO (reagendar = decisão
      // futura do Vitor; hoje o estado congela)
      await assertFails(
        updateDoc(campanhaDoc(castelo(), 'vencida-base'), {
          status: 'agendado',
          agendadoPara: new Date(Date.now() + 86_400_000),
        })
      );
      await assertFails(
        updateDoc(campanhaDoc(castelo(), 'vencida-base'), {
          status: 'rascunho',
        })
      );
      await assertFails(
        updateDoc(campanhaDoc(castelo(), 'vencida-base'), {
          titulo: 'Título novo em vencida',
        })
      );
      await assertFails(deleteDoc(campanhaDoc(castelo(), 'vencida-base')));
    });
  });

  // ── api-client + seed ────────────────────────────────────────────────────

  describe('api-client listarCampanhas + seed canônico', () => {
    it('lista por estado com parse fail-fast (query single-field)', async () => {
      const db = castelo();
      const enviadas = await listarCampanhas(db, EVENTO_ID, 'enviado');
      expect(enviadas.map((c) => c.id)).toEqual(['enviada-base']);
      expect(enviadas[0]?.alcance).toBe(48);

      const todas = await listarCampanhas(db, EVENTO_ID);
      expect(todas).toHaveLength(2);
    });

    it('seedCampanhas cria as 3 canônicas da Meia Floripa (kit pronto → 48)', async () => {
      await seedCampanhas(adminDb);

      const snap = await adminDb
        .collection('eventos').doc(MEIA_FLORIPA_ID)
        .collection('campanhas').get();
      expect(snap.size).toBe(TOTAL_CAMPANHAS_SEED);

      const kit = snap.docs.find((d) => d.id === 'kit-pronto-retirada');
      expect(kit?.get('status')).toBe('enviado');
      expect(kit?.get('alcance')).toBe(ALCANCE_KIT_PRONTO_SEED);
      expect(kit?.get('segmento')?.referencia).toBe('kit_ouro');

      // Idempotente: rerun não duplica nem muda contagem
      await seedCampanhas(adminDb);
      const snap2 = await adminDb
        .collection('eventos').doc(MEIA_FLORIPA_ID)
        .collection('campanhas').get();
      expect(snap2.size).toBe(TOTAL_CAMPANHAS_SEED);
    });
  });
});
