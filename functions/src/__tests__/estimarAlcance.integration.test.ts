/**
 * estimarAlcance.integration.test.ts — LEELA-E06-L2-T1
 *
 * Integração (Firestore Emulator, Admin SDK direto — padrão triggers v1):
 * callable de estimativa de alcance de segmento de campanha do evento.
 *
 * Cobre (aceites do brief E06-L2-T1 + postura antagonista):
 *   - por_kit=kit_ouro → conta inscritos do kit com status ATIVO
 *     (não-cancelado E não-estornado — `inscritoAtivo`);
 *   - por_modalidade=21k → conta os do percurso; por_status=pendente →
 *     conta os pendentes; todos_inscritos → todos os ativos;
 *   - referência sem match → 0; referência fora do enum → invalid-argument;
 *   - por_engajamento → invalid-argument (corte 5);
 *   - cross-tenant → permission-denied; athlete (sem papel de escrita) →
 *     permission-denied;
 *   - coerência com o seed canônico dos 453 (esperado DERIVADO do gerador
 *     puro — nunca número mágico).
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
import { FieldValue } from 'firebase-admin/firestore';
import { inscritoAtivo, type AuthClaims } from '@leela/core';
import { estimarAlcanceCore } from '../eventos/estimarAlcance';
import {
  gerarInscritosSeed,
  seedInscritos,
} from '../seed/inscritos.seed';
import { MEIA_FLORIPA_ID } from '../seed/eventos.seed';
import { seedEventos } from '../seed/eventos.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'evento-alcance';

const marina = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('estimarAlcance — count() por segmento (E06-L2-T1)', () => {
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

  /**
   * Fixture controlada (12 inscritos):
   *   kit_ouro:  3 confirmados 21k · 1 pendente 21k · 1 CANCELADO 21k
   *   kit_prata: 2 confirmados 10k · 1 ESTORNADO 10k
   *   sem_kit:   2 confirmados 5k · 1 pendente 5k · 1 CANCELADO 5k
   * Ativos = 9 (exclui 2 cancelados + 1 estornado).
   */
  async function seedFixtures(): Promise<void> {
    const now = FieldValue.serverTimestamp();
    const batch = adminDb.batch();

    batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
      id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
      status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(adminDb.collection('eventos').doc(EVENTO_ID), {
      id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
      nome: 'Evento Alcance', slug: EVENTO_ID, status: 'publicado',
      qtdInscritos: 0, receitaConfirmada: 0,
      criadoEm: now, atualizadoEm: now,
    });

    const specs: Array<[string, string, string, string]> = [
      ['i01', 'kit_ouro', '21k', 'confirmado'],
      ['i02', 'kit_ouro', '21k', 'confirmado'],
      ['i03', 'kit_ouro', '21k', 'confirmado'],
      ['i04', 'kit_ouro', '21k', 'pendente'],
      ['i05', 'kit_ouro', '21k', 'cancelado'],
      ['i06', 'kit_prata', '10k', 'confirmado'],
      ['i07', 'kit_prata', '10k', 'confirmado'],
      ['i08', 'kit_prata', '10k', 'estornado'],
      ['i09', 'sem_kit', '5k', 'confirmado'],
      ['i10', 'sem_kit', '5k', 'confirmado'],
      ['i11', 'sem_kit', '5k', 'pendente'],
      ['i12', 'sem_kit', '5k', 'cancelado'],
    ];
    for (const [id, kit, modalidade, status] of specs) {
      batch.set(
        adminDb.collection('eventos').doc(EVENTO_ID)
          .collection('inscritos').doc(id),
        {
          id, tenantId: CASTELO_ID, atletaId: `atleta-${id}`,
          atletaNome: `Atleta ${id}`, kit, chipNumero: null,
          status, modalidade, tamanhos: {},
          criadoEm: now, atualizadoEm: now,
        }
      );
    }

    await batch.commit();
  }

  const estimar = (segmento: unknown, caller = marina, eventoId = EVENTO_ID) =>
    estimarAlcanceCore(adminDb, { eventoId, segmento }, caller);

  // ── Semântica por segmento ───────────────────────────────────────────────

  it('por_kit=kit_ouro conta SÓ ativos do kit (exclui cancelado)', async () => {
    const r = await estimar({ tipo: 'por_kit', referencia: 'kit_ouro' });
    expect(r.tamanho).toBe(4); // 3 confirmados + 1 pendente; cancelado fora
  });

  it('por_kit=kit_prata exclui estornado (inscritoAtivo é a fonte)', async () => {
    const r = await estimar({ tipo: 'por_kit', referencia: 'kit_prata' });
    expect(r.tamanho).toBe(2);
  });

  it('por_modalidade=21k conta os ativos do percurso', async () => {
    const r = await estimar({ tipo: 'por_modalidade', referencia: '21k' });
    expect(r.tamanho).toBe(4);
  });

  it('por_status=pendente conta os pendentes (filtro É o status)', async () => {
    const r = await estimar({ tipo: 'por_status', referencia: 'pendente' });
    expect(r.tamanho).toBe(2);
  });

  it('todos_inscritos conta todos os não-cancelados/não-estornados', async () => {
    const r = await estimar({ tipo: 'todos_inscritos' });
    expect(r.tamanho).toBe(9);
  });

  it('referência sem match → 0 (não erro)', async () => {
    const r = await estimar({ tipo: 'por_modalidade', referencia: '42k' });
    expect(r.tamanho).toBe(0);
  });

  // ── Entrada inválida (fail-fast, sem PII) ────────────────────────────────

  it('referência fora do enum (kit_diamante) → invalid-argument', async () => {
    await expect(
      estimar({ tipo: 'por_kit', referencia: 'kit_diamante' })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('por_engajamento → invalid-argument (corte 5 — fora da taxonomia V1)', async () => {
    await expect(
      estimar({ tipo: 'por_engajamento', referencia: '7d' })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('segmento ausente e eventoId vazio → invalid-argument', async () => {
    await expect(estimar(undefined)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    await expect(
      estimar({ tipo: 'todos_inscritos' }, marina, '')
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  // ── Autorização (RN-400/401) ─────────────────────────────────────────────

  it('ATAQUE cross-tenant: writer de outro tenant → permission-denied', async () => {
    const invasor = {
      uid: 'uid-passo-owner',
      claims: { role: 'tenant_owner', tenantId: 'passo-certo' } as AuthClaims,
    };
    await expect(
      estimar({ tipo: 'todos_inscritos' }, invasor)
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('athlete (sem papel de escrita) → permission-denied', async () => {
    const atleta = {
      uid: 'uid-atleta',
      claims: { role: 'athlete' } as AuthClaims,
    };
    await expect(
      estimar({ tipo: 'todos_inscritos' }, atleta)
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('evento inexistente → not-found', async () => {
    await expect(
      estimar({ tipo: 'todos_inscritos' }, marina, 'evento-fantasma')
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  // ── Coerência com o seed canônico (453) ──────────────────────────────────

  it('bate com o gerador puro dos 453 canônicos (por_kit e todos)', async () => {
    await seedEventos(adminDb);
    await seedInscritos(adminDb);

    const canonicos = gerarInscritosSeed();
    const esperadoOuro = canonicos.filter(
      (i) => i.kit === 'kit_ouro' && inscritoAtivo({ status: i.status })
    ).length;
    const esperadoTodos = canonicos.filter((i) =>
      inscritoAtivo({ status: i.status })
    ).length;

    const ouro = await estimar(
      { tipo: 'por_kit', referencia: 'kit_ouro' },
      marina,
      MEIA_FLORIPA_ID
    );
    const todos = await estimar(
      { tipo: 'todos_inscritos' },
      marina,
      MEIA_FLORIPA_ID
    );

    expect(ouro.tamanho).toBe(esperadoOuro);
    expect(todos.tamanho).toBe(esperadoTodos);
  });
});
