/**
 * parceriasAggregates.test.ts — LEELA-S107-T1
 *
 * Integração (Firestore Emulator, Admin SDK direto — padrão triggers v1):
 * registrarConversao + recontarConversoes SEM subir o Functions emulator.
 *
 * Cobre (aceites do brief/spec):
 *   - conversão fora da janela de atribuição NÃO incrementa (RN-125);
 *   - reprocessar a MESMA conversão não duplica (dedup por conversaoId);
 *   - agregados ∑ conversoes/valorAReceber por recontagem (count + sum);
 *   - seedParcerias: 8 parcerias canônicas (3 eventos ativos + 2 convites
 *     + 3 patrocinadores), idempotente.
 *
 * Skip real (describe.skipIf) sem FIRESTORE_EMULATOR_HOST — padrão C1.
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import {
  recontarConversoes,
  registrarConversao,
} from '../clubs/onConversao';
import {
  TOTAL_PARCERIAS_SEED,
  seedParcerias,
} from '../seed/parcerias.seed';
import { CLUBE_CPS_SLUG } from '../seed/clubes.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const DIA_MS = 24 * 60 * 60 * 1000;
const CLUBE_ID = 'clube-conversoes';
const TENANT_ID = 'castelo-producoes';
const PARCERIA_ID = 'parceria-evento-teste';

const CLIQUE = new Date('2026-04-01T12:00:00Z');

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('parcerias — conversões (S107-T1)', () => {
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
    await adminDb.collection('clubes').doc(CLUBE_ID).set({
      id: CLUBE_ID,
      tenantId: TENANT_ID,
      nome: 'Clube Conversões',
      visibilidade: 'privada',
      qtdMembrosAtivos: 0,
      qtdDesafiosAtivos: 0,
    });
    await parceriaRef().set({
      id: PARCERIA_ID,
      tenantId: TENANT_ID,
      tipo: 'evento_afiliado',
      status: 'ativa',
      eventoId: 'evento-teste',
      organizadorId: 'uid-organizador',
      programaAfiliacaoRef: 'eventos/evento-teste/programaAfiliacao/atual',
      comissaoPct: 10,
      cupom: 'CUPOM10',
      linkMaster: 'beh.ro/teste?c=cps',
      janelaAtribuicaoDias: 7,
      termosEspelho: {
        criterioLiberacao: 'Após o evento',
        prazoRepasseDiasUteis: 10,
        tetoMensal: null,
      },
      conversoes: 0,
      valorAReceber: 0,
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  function parceriaRef() {
    return adminDb
      .collection('clubes')
      .doc(CLUBE_ID)
      .collection('parcerias')
      .doc(PARCERIA_ID);
  }

  function conversao(id: string, diasDepoisDoClique: number, valor = 18.5) {
    return {
      clubId: CLUBE_ID,
      parceriaId: PARCERIA_ID,
      conversaoId: id,
      valorComissao: valor,
      clicadoEm: CLIQUE,
      convertidoEm: new Date(CLIQUE.getTime() + diasDepoisDoClique * DIA_MS),
    };
  }

  // ── registrarConversao ───────────────────────────────────────────────────

  it('conversão dentro da janela registra e agrega (count + sum)', async () => {
    const r1 = await registrarConversao(adminDb, conversao('tx-1', 2, 18.5));
    const r2 = await registrarConversao(adminDb, conversao('tx-2', 5, 21.5));
    expect(r1).toEqual({ registrada: true, motivo: 'ok' });
    expect(r2).toEqual({ registrada: true, motivo: 'ok' });

    const parceria = await parceriaRef().get();
    expect(parceria.get('conversoes')).toBe(2);
    expect(parceria.get('valorAReceber')).toBe(40);
  });

  it('conversão FORA da janela não registra nem incrementa (RN-125)', async () => {
    const r = await registrarConversao(adminDb, conversao('tx-fora', 8));
    expect(r).toEqual({ registrada: false, motivo: 'fora_da_janela' });

    const parceria = await parceriaRef().get();
    expect(parceria.get('conversoes')).toBe(0);
    expect(parceria.get('valorAReceber')).toBe(0);

    const docs = await parceriaRef().collection('conversoes').get();
    expect(docs.size).toBe(0);
  });

  it('limite da janela é inclusivo: exatamente 7 dias ainda atribui', async () => {
    const r = await registrarConversao(adminDb, conversao('tx-limite', 7));
    expect(r.registrada).toBe(true);
  });

  it('reprocessar a MESMA conversão não duplica (retry de webhook)', async () => {
    await registrarConversao(adminDb, conversao('tx-retry', 1, 30));
    const retry1 = await registrarConversao(adminDb, conversao('tx-retry', 1, 30));
    const retry2 = await registrarConversao(adminDb, conversao('tx-retry', 1, 30));

    expect(retry1).toEqual({ registrada: false, motivo: 'duplicada' });
    expect(retry2.motivo).toBe('duplicada');

    const parceria = await parceriaRef().get();
    expect(parceria.get('conversoes')).toBe(1);
    expect(parceria.get('valorAReceber')).toBe(30);
  });

  it('parceria patrocinador/inexistente não aceita conversão', async () => {
    await adminDb
      .collection('clubes').doc(CLUBE_ID)
      .collection('parcerias').doc('parceria-patrocinador')
      .set({
        id: 'parceria-patrocinador', tenantId: TENANT_ID,
        tipo: 'patrocinador', status: 'ativa',
        nome: 'CDL', modeloComercial: 'permuta',
        contrapartida: 'co-branding em campanhas do clube',
      });

    const emPatrocinador = await registrarConversao(adminDb, {
      ...conversao('tx-x', 1),
      parceriaId: 'parceria-patrocinador',
    });
    expect(emPatrocinador.motivo).toBe('parceria_invalida');

    const inexistente = await registrarConversao(adminDb, {
      ...conversao('tx-y', 1),
      parceriaId: 'parceria-fantasma',
    });
    expect(inexistente.motivo).toBe('parceria_invalida');
  });

  it('recontarConversoes corrige agregado adulterado (auto-heal)', async () => {
    await registrarConversao(adminDb, conversao('tx-1', 1, 10));
    // adultera o agregado por fora
    await parceriaRef().update({ conversoes: 99, valorAReceber: 9999 });

    const corrigiu = await recontarConversoes(adminDb, CLUBE_ID, PARCERIA_ID);
    expect(corrigiu).toBe(true);

    const parceria = await parceriaRef().get();
    expect(parceria.get('conversoes')).toBe(1);
    expect(parceria.get('valorAReceber')).toBe(10);

    // 2ª recontagem imediata é no-op
    expect(await recontarConversoes(adminDb, CLUBE_ID, PARCERIA_ID)).toBe(false);
  });

  // ── seedParcerias ────────────────────────────────────────────────────────

  describe('seedParcerias (canônico HANDOFF-05)', () => {
    it('cria 8 parcerias: 3 eventos ativos + 2 convites + 3 patrocinadores', async () => {
      await seedParcerias(adminDb);

      const parcerias = await adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .collection('parcerias')
        .get();
      expect(parcerias.size).toBe(TOTAL_PARCERIAS_SEED);

      const eventos = parcerias.docs.filter(
        (d) => d.get('tipo') === 'evento_afiliado'
      );
      const patrocinadores = parcerias.docs.filter(
        (d) => d.get('tipo') === 'patrocinador'
      );
      expect(eventos).toHaveLength(5);
      expect(patrocinadores).toHaveLength(3);

      const convites = eventos.filter(
        (d) => d.get('status') === 'convite_pendente'
      );
      expect(convites).toHaveLength(2);

      // Performance canônica da Meia Floripa (aceite S107-T2)
      const meia = parcerias.docs.find(
        (d) => d.id === 'parceria-meia-floripa-2026'
      );
      expect(meia?.data()).toMatchObject({
        comissaoPct: 10,
        cupom: 'CORRIDAPERFEITA10',
        linkMaster: 'beh.ro/mfl26?c=cps',
        janelaAtribuicaoDias: 7,
        conversoes: 28,
        valorAReceber: 528,
      });

      // CDL financeiro R$ 12.000/ano (RN-123)
      const cdl = parcerias.docs.find((d) => d.id === 'parceria-cdl-wellness');
      expect(cdl?.data()).toMatchObject({
        modeloComercial: 'financeiro',
        valorAnual: 12000,
      });
    });

    it('rerun é idempotente', async () => {
      await seedParcerias(adminDb);
      await seedParcerias(adminDb);

      const parcerias = await adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .collection('parcerias')
        .get();
      expect(parcerias.size).toBe(TOTAL_PARCERIAS_SEED);
    });
  });
});
