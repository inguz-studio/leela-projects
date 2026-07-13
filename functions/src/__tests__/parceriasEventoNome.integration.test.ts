/**
 * parceriasEventoNome.integration.test.ts — LEELA-CONS-4-T2
 *
 * Integração (Firestore Emulator, Admin SDK direto — padrão triggers v1):
 * espelho do nome canônico do evento na parceria evento_afiliado
 * (sincronizarEventoNomeParcerias — functions/clubs/parceriasEspelho.ts).
 *
 * Cobre (postura CONS-4: denormalização idempotente, backfill re-executável):
 *   - backfill estampa eventoNome a partir de eventos/{id}.nome;
 *   - rerun converge para ZERO updates (idempotente por comparação);
 *   - rename do evento + sync por eventoId corrige SÓ as parcerias dele;
 *   - evento inexistente → doc INTOCADO (nunca apaga espelho nem inventa);
 *   - patrocinador nunca é tocado (query filtra tipo);
 *   - seedParcerias estampa os 5 nomes canônicos (HANDOFF-05).
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
import { sincronizarEventoNomeParcerias } from '../clubs/parceriasEspelho';
import { seedParcerias } from '../seed/parcerias.seed';
import { CLUBE_CPS_SLUG } from '../seed/clubes.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const CLUBE_ID = 'clube-espelho';
const TENANT_ID = 'castelo-producoes';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('parcerias — espelho eventoNome (CONS-4-T2)', () => {
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
      nome: 'Clube Espelho',
      visibilidade: 'privada',
      qtdMembrosAtivos: 0,
      qtdDesafiosAtivos: 0,
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  function parceriaRef(id: string) {
    return adminDb
      .collection('clubes').doc(CLUBE_ID)
      .collection('parcerias').doc(id);
  }

  async function criarAfiliada(
    id: string,
    eventoId: string,
    overrides: Record<string, unknown> = {}
  ): Promise<void> {
    await parceriaRef(id).set({
      id,
      tenantId: TENANT_ID,
      tipo: 'evento_afiliado',
      status: 'ativa',
      eventoId,
      organizadorId: 'uid-organizador',
      programaAfiliacaoRef: `eventos/${eventoId}/programaAfiliacao/atual`,
      comissaoPct: 10,
      cupom: null,
      linkMaster: `beh.ro/${eventoId}?c=cps`,
      janelaAtribuicaoDias: 7,
      termosEspelho: {
        criterioLiberacao: 'Após o evento',
        prazoRepasseDiasUteis: 10,
        tetoMensal: null,
      },
      conversoes: 0,
      valorAReceber: 0,
      ...overrides,
    });
  }

  async function criarEvento(id: string, nome: string): Promise<void> {
    await adminDb.collection('eventos').doc(id).set({
      id, nome, tenantId: 'tenant-organizador', status: 'publicado',
    });
  }

  it('backfill estampa eventoNome do evento; rerun é ZERO updates', async () => {
    await criarEvento('meia-floripa-2026', 'Meia Maratona Floripa 2026');
    await criarAfiliada('p-meia', 'meia-floripa-2026'); // sem eventoNome

    const r1 = await sincronizarEventoNomeParcerias(adminDb);
    expect(r1).toEqual({ examinadas: 1, atualizadas: 1, semEvento: 0 });
    expect((await parceriaRef('p-meia').get()).get('eventoNome')).toBe(
      'Meia Maratona Floripa 2026'
    );

    // Idempotência: reexecutar converge sem escrever nada
    const r2 = await sincronizarEventoNomeParcerias(adminDb);
    expect(r2).toEqual({ examinadas: 1, atualizadas: 0, semEvento: 0 });
  });

  it('rename do evento + sync por eventoId corrige SÓ as parcerias dele', async () => {
    await criarEvento('meia-floripa-2026', 'Meia Floripa (nome antigo)');
    await criarEvento('trail-ratones-2026', 'Trail Run Ratones 2026');
    await criarAfiliada('p-meia', 'meia-floripa-2026', {
      eventoNome: 'Meia Floripa (nome antigo)',
    });
    await criarAfiliada('p-ratones', 'trail-ratones-2026', {
      eventoNome: 'Trail Run Ratones 2026',
    });

    // Organizador renomeia o evento
    await adminDb.collection('eventos').doc('meia-floripa-2026').update({
      nome: 'Meia Maratona Floripa 2026',
    });

    const r = await sincronizarEventoNomeParcerias(adminDb, {
      eventoId: 'meia-floripa-2026',
    });
    expect(r).toEqual({ examinadas: 1, atualizadas: 1, semEvento: 0 });
    expect((await parceriaRef('p-meia').get()).get('eventoNome')).toBe(
      'Meia Maratona Floripa 2026'
    );
    // A parceria do OUTRO evento não foi examinada nem tocada
    expect((await parceriaRef('p-ratones').get()).get('eventoNome')).toBe(
      'Trail Run Ratones 2026'
    );
  });

  it('evento inexistente → parceria INTOCADA (nunca apaga espelho nem inventa)', async () => {
    await criarAfiliada('p-externa', 'evento-externo-2026', {
      eventoNome: 'Nome Já Estampado 2026',
    });
    await criarAfiliada('p-externa-sem-nome', 'evento-fantasma-2026');

    const r = await sincronizarEventoNomeParcerias(adminDb);
    expect(r).toEqual({ examinadas: 2, atualizadas: 0, semEvento: 2 });

    expect((await parceriaRef('p-externa').get()).get('eventoNome')).toBe(
      'Nome Já Estampado 2026'
    );
    expect(
      (await parceriaRef('p-externa-sem-nome').get()).get('eventoNome')
    ).toBeUndefined();
  });

  it('patrocinador nunca entra na sincronização (query filtra tipo)', async () => {
    await parceriaRef('p-patrocinador').set({
      id: 'p-patrocinador', tenantId: TENANT_ID,
      tipo: 'patrocinador', status: 'ativa',
      nome: 'CDL Wellness', modeloComercial: 'permuta',
      contrapartida: 'Logo em todos os desafios e posts mensais.',
    });

    const r = await sincronizarEventoNomeParcerias(adminDb);
    expect(r).toEqual({ examinadas: 0, atualizadas: 0, semEvento: 0 });
    expect(
      (await parceriaRef('p-patrocinador').get()).get('eventoNome')
    ).toBeUndefined();
  });

  it('seedParcerias estampa os 5 nomes canônicos (HANDOFF-05)', async () => {
    await seedParcerias(adminDb);

    const snap = await adminDb
      .collection('clubes').doc(CLUBE_CPS_SLUG)
      .collection('parcerias')
      .where('tipo', '==', 'evento_afiliado')
      .get();

    const nomes = new Map(
      snap.docs.map((d) => [d.get('eventoId'), d.get('eventoNome')])
    );
    expect(nomes.get('meia-floripa-2026')).toBe('Meia Maratona Floripa 2026');
    expect(nomes.get('trail-ratones-2026')).toBe('Trail Run Ratones 2026');
    expect(nomes.get('corrida-ponte-2026')).toBe('Corrida da Ponte 2026');
    expect(nomes.get('maratona-floripa-2027')).toBe('Maratona Floripa 2027');
    expect(nomes.get('acate-corporativo-2026')).toBe(
      'Desafio Corporativo ACATE 2026'
    );
  });
});
