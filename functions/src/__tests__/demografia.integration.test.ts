/**
 * demografia.integration.test.ts — LEELA-BEPEND-T1 (E11 §RN-820)
 *
 * `recomputarDemografiaEvento` (núcleo do gatilho onInscritoWriteDemografia)
 * contra o Firestore Emulator com docs REAIS + Security Rules da subcoleção
 * `demografia`. Aceites falsificáveis do brief:
 *   - agregação SEM PII: o doc materializado tem SÓ buckets — nenhuma data
 *     de nascimento, nenhum id/nome de inscrito (varredura das chaves);
 *   - só CONFIRMADOS contam (pendente/cancelado fora); inscrito sem [reg]
 *     cai em semNascimento/semGenero (honesto, nada fabricado);
 *   - IDEMPOTÊNCIA: recomputar 2× com o mesmo estado NÃO reescreve o doc
 *     (atualizadoEm intocado — recontagem determinística, não incremento);
 *   - ATAQUES (Rules): cliente NÃO cria/edita/deleta demografia/current
 *     (nem o owner, nem forjando contagens); leitura NEGADA a promoter,
 *     athlete e owner de OUTRO tenant; permitida a owner/staff do tenant
 *     dono e platform_admin.
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
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { recomputarDemografiaEvento } from '../analytics/agregarDemografia';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';
const STAFF_UID = 'uid-castelo-staff';
const PROMOTER_UID = 'uid-castelo-promoter';
const PASSO_OWNER_UID = 'uid-passo-owner';
const ADMIN_UID = 'uid-platform-admin';
const ATHLETE_UID = 'uid-atleta-global';

const EVENTO_ID = 'meia-floripa-2026';
// Data civil da prova: 2026-04-25 (12:00Z cai em 2026-04-25 no fuso do produto)
const DATA_EVENTO = Timestamp.fromDate(new Date('2026-04-25T12:00:00Z'));

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function inscrito(
  id: string,
  status: string,
  dadosPessoais?: Record<string, unknown>
) {
  return {
    id,
    tenantId: CASTELO_ID,
    atletaId: `atleta-${id}`,
    atletaNome: `Atleta ${id}`,
    kit: 'sem_kit',
    kitId: null,
    chipNumero: null,
    status,
    modalidade: '10k',
    tamanhos: {},
    ...(dadosPessoais !== undefined ? { dadosPessoais } : {}),
    criadoEm: Timestamp.now(),
    atualizadoEm: Timestamp.now(),
  };
}

/** [reg] completo (o que a Function do checkout grava) — PII de teste. */
function reg(nascimento: string, genero: string) {
  return {
    cpf: '529.982.247-25',
    telefone: '(48) 99999-0001',
    nascimento,
    genero,
    cidade: 'Florianópolis',
    uf: 'SC',
  };
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
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo', slug: PASSO_ID,
    status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('eventos').doc(EVENTO_ID), {
    id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Meia de Floripa 2026', slug: EVENTO_ID, status: 'publicado',
    data: DATA_EVENTO, local: 'Florianópolis', modalidades: ['10k', '21k'],
    percursos: [{ nome: '10k', preco: 120 }], usaChip: false,
    qtdInscritos: 0, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });

  const inscritosCol = adminDb.collection('eventos').doc(EVENTO_ID).collection('inscritos');
  // Confirmados COM [reg]
  batch.set(inscritosCol.doc('i1'), inscrito('i1', 'confirmado', reg('2000-01-01', 'feminino'))); // 26 → 25_34
  batch.set(inscritosCol.doc('i2'), inscrito('i2', 'confirmado', reg('2004-06-01', 'masculino'))); // 21 → 18_24
  batch.set(inscritosCol.doc('i3'), inscrito('i3', 'confirmado', reg('1980-04-25', 'feminino'))); // 46 → 45_54
  // Confirmado SEM [reg] (checkout mínimo E12)
  batch.set(inscritosCol.doc('i4'), inscrito('i4', 'confirmado'));
  // NÃO confirmados — ficam FORA da recontagem
  batch.set(inscritosCol.doc('i5'), inscrito('i5', 'pendente', reg('1990-01-01', 'masculino')));
  batch.set(inscritosCol.doc('i6'), inscrito('i6', 'cancelado', reg('1995-01-01', 'outro')));
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}
const ownerA = () => ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
const staffA = () => ctxAs(STAFF_UID, { role: 'tenant_staff', tenantId: CASTELO_ID });
const promoterA = () => ctxAs(PROMOTER_UID, { role: 'promoter', tenantId: CASTELO_ID });
const ownerB = () => ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
const platformAdmin = () => ctxAs(ADMIN_UID, { role: 'platform_admin' });
const athlete = () => ctxAs(ATHLETE_UID, { role: 'athlete' });

const P_DEMO = ['eventos', EVENTO_ID, 'demografia', 'current'] as const;

describe('recomputarDemografiaEvento — agregação real', () => {
  it('conta SÓ confirmados, bucketiza idade NA PROVA e gênero; sem [reg] → semDado', async () => {
    const contagens = await recomputarDemografiaEvento(adminDb, EVENTO_ID);
    expect(contagens).not.toBeNull();
    expect(contagens!.totalConfirmados).toBe(4); // i1..i4 (i5/i6 fora)
    expect(contagens!.faixasEtarias['25_34']).toBe(1);
    expect(contagens!.faixasEtarias['18_24']).toBe(1);
    expect(contagens!.faixasEtarias['45_54']).toBe(1);
    expect(contagens!.semNascimento).toBe(1); // i4
    expect(contagens!.porGenero.feminino).toBe(2);
    expect(contagens!.porGenero.masculino).toBe(1);
    expect(contagens!.semGenero).toBe(1); // i4
    expect(contagens!.referencia).toBe('2026-04-25');

    const snap = await adminDb.doc(P_DEMO.join('/')).get();
    expect(snap.exists).toBe(true);
    expect(snap.get('tenantId')).toBe(CASTELO_ID);
  });

  it('PII NUNCA no doc agregado: só buckets — nenhuma data/CPF/nome/id de inscrito', async () => {
    await recomputarDemografiaEvento(adminDb, EVENTO_ID);
    const snap = await adminDb.doc(P_DEMO.join('/')).get();
    const data = snap.data() as Record<string, unknown>;
    // Shape FECHADO: qualquer campo além destes é vazamento
    expect(Object.keys(data).sort()).toEqual([
      'atualizadoEm',
      'faixasEtarias',
      'porGenero',
      'referencia',
      'semGenero',
      'semNascimento',
      'tenantId',
      'totalConfirmados',
    ]);
    const json = JSON.stringify({ ...data, atualizadoEm: null });
    expect(json).not.toContain('2000-01-01'); // nascimento individual
    expect(json).not.toContain('529.982'); // CPF
    expect(json).not.toContain('Atleta'); // nome
    expect(json).not.toContain('i1'); // id de inscrito
  });

  it('IDEMPOTÊNCIA: recomputar 2× sem mudança ⇒ zero write (atualizadoEm intocado)', async () => {
    await recomputarDemografiaEvento(adminDb, EVENTO_ID);
    const antes = await adminDb.doc(P_DEMO.join('/')).get();
    const carimbo = (antes.get('atualizadoEm') as Timestamp).toMillis();

    await recomputarDemografiaEvento(adminDb, EVENTO_ID);
    const depois = await adminDb.doc(P_DEMO.join('/')).get();
    expect((depois.get('atualizadoEm') as Timestamp).toMillis()).toBe(carimbo);
  });

  it('flip confirmado→cancelado sai da recontagem no próximo recompute (reversão por construção)', async () => {
    await recomputarDemografiaEvento(adminDb, EVENTO_ID);
    await adminDb
      .doc(`eventos/${EVENTO_ID}/inscritos/i1`)
      .update({ status: 'cancelado' });
    const contagens = await recomputarDemografiaEvento(adminDb, EVENTO_ID);
    expect(contagens!.totalConfirmados).toBe(3);
    expect(contagens!.faixasEtarias['25_34']).toBe(0); // i1 saiu
  });

  it('evento inexistente → null (nada materializado)', async () => {
    expect(await recomputarDemografiaEvento(adminDb, 'evento-fantasma')).toBeNull();
  });
});

describe('Rules de demografia/current — ataques', () => {
  beforeEach(async () => {
    await recomputarDemografiaEvento(adminDb, EVENTO_ID);
  });

  it('owner/staff do tenant dono e platform_admin LEEM o agregado', async () => {
    await assertSucceeds(getDoc(doc(ownerA().firestore(), ...P_DEMO)));
    await assertSucceeds(getDoc(doc(staffA().firestore(), ...P_DEMO)));
    await assertSucceeds(getDoc(doc(platformAdmin().firestore(), ...P_DEMO)));
  });

  it('promoter, athlete, owner de OUTRO tenant e anônimo NÃO leem', async () => {
    await assertFails(getDoc(doc(promoterA().firestore(), ...P_DEMO)));
    await assertFails(getDoc(doc(athlete().firestore(), ...P_DEMO)));
    await assertFails(getDoc(doc(ownerB().firestore(), ...P_DEMO)));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), ...P_DEMO)));
  });

  it('NENHUM cliente escreve: owner forja contagens → NEGA (write:false)', async () => {
    await assertFails(
      updateDoc(doc(ownerA().firestore(), ...P_DEMO), { totalConfirmados: 9999 })
    );
    await assertFails(
      setDoc(doc(ownerA().firestore(), ...P_DEMO), {
        tenantId: CASTELO_ID,
        totalConfirmados: 9999,
      })
    );
    await assertFails(deleteDoc(doc(ownerA().firestore(), ...P_DEMO)));
  });

  it('platform_admin ESCREVE via catch-all (postura sistêmica vigente — paridade com financeiro/current)', async () => {
    // ACHADO DOCUMENTADO (não regressão deste lote): o catch-all
    // `match /{subcol}/{docId} { allow write: if isPlatformAdmin() }` das
    // subcoleções de eventos concede escrita de client SDK ao back-office em
    // QUALQUER subcoleção — inclusive nos agregados ∑ (financeiro,
    // comunicacoesResumo, demografia). O match explícito `write: if false`
    // não fecha isso: no OR de Rules basta UM match permitir. Endurecer =
    // decisão sistêmica (afetaria todos os agregados) — registrada no
    // report do LEELA-BEPEND; aqui provamos a paridade para o teste FALHAR
    // se a postura mudar sem atualizar a prova.
    await assertSucceeds(
      updateDoc(doc(platformAdmin().firestore(), ...P_DEMO), { semGenero: 0 })
    );
  });
});
