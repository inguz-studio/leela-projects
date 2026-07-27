/**
 * bankAccess.integration.test.ts — LEELA-E09s-L2-T5
 *
 * `getBankDetailsForPayoutCore` contra o Emulator (cifra REAL do T2 no
 * caminho — saveDadosBancariosCore semeia o envelope). Prova os aceites:
 *   - platform_admin recebe o número COMPLETO just-in-time (repasse
 *     'aprovado') e o acesso é REGISTRADO (quem/quando/qual repasse);
 *   - NÃO-admin (owner/staff) ⇒ permission-denied E acesso registrado
 *     (resultado 'negado_papel');
 *   - repasse fora de 'aprovado' ⇒ failed-precondition + registro;
 *   - blob adulterado ⇒ internal + registro 'erro_decifra', mensagem SEM
 *     payload;
 *   - a trilha `auditoriaAcessos` NUNCA contém o número em claro e NÃO é
 *     legível por cliente (deny-by-default nas Rules).
 *
 * Pré-requisito: Firestore Emulator na 8080 (via emulators:exec).
 */
import { randomBytes } from 'node:crypto';
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { collection, getDocs } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import type { AuthClaims } from '@leela/core';
import {
  AUDITORIA_ACESSOS_COL,
  getBankDetailsForPayoutCore,
} from '../finance/getBankDetailsForPayout';
import { saveDadosBancariosCore } from '../finance/saveDadosBancarios';
import { requestRepasseCore } from '../finance/requestRepasse';
import { approveRepasseCore } from '../finance/transicoesRepasse';
import { ENV_BANK_DATA_KEY } from '../finance/cifraDadosBancarios';
import type { FinanceCaller } from '../finance/atores';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const ADMIN_UID = 'uid-platform-admin';
const EVENTO_ID = 'meia-floripa-2026';
const CONTA_CLARO = '12345-6';
const PIX_CLARO = 'marina@gmail.com';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

const owner: FinanceCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
};
const staff: FinanceCaller = {
  uid: 'uid-staff',
  claims: { role: 'tenant_staff', tenantId: CASTELO_ID } as AuthClaims,
};
const platformAdmin: FinanceCaller = {
  uid: ADMIN_UID,
  claims: { role: 'platform_admin' } as AuthClaims,
};

async function seedCenarioComRepasseAprovado(): Promise<string> {
  await db.collection('tenants').doc(CASTELO_ID).set({
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: new Date(), atualizadoEm: new Date(),
  });
  await db.doc(`tenants/${CASTELO_ID}/commercialTerms/current`).set({
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1, atualizadoPor: ADMIN_UID, atualizadoEm: new Date(),
  });
  await db.collection('eventos').doc(EVENTO_ID).set({
    id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Meia Maratona Floripa 2026', status: 'publicado',
    criadoEm: new Date(), atualizadoEm: new Date(),
  });
  await db.doc(`eventos/${EVENTO_ID}/financeiro/current`).set({
    tenantId: CASTELO_ID, receitaBruta: 12000, taxaPct: 10.5,
    taxaValor: 2000, receitaLiquida: 10000,
    inscritos: { total: 0, porStatus: {}, porKit: {}, porModalidade: {} },
    atualizadoEm: new Date(),
  });
  // Cifra REAL do T2 no caminho (envelope de verdade, AAD = tenant)
  await saveDadosBancariosCore(db, {
    banco: '260 — Nubank', agencia: '0001', conta: CONTA_CLARO,
    tipo: 'corrente', pix: PIX_CLARO, titular: 'Marina Castelo',
    cpfCnpj: '123.456.789-12',
  }, owner);
  const { repasseId } = await requestRepasseCore(db, { valor: 5000, eventoId: EVENTO_ID }, owner);
  await approveRepasseCore(db, { tenantId: CASTELO_ID, repasseId }, platformAdmin);
  return repasseId;
}

async function lerAuditoria(): Promise<Record<string, unknown>[]> {
  const snap = await db.collection(AUDITORIA_ACESSOS_COL).get();
  return snap.docs.map((d) => d.data());
}

beforeAll(async () => {
  process.env[ENV_BANK_DATA_KEY] = randomBytes(32).toString('base64');
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
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('getBankDetailsForPayout — RN-354 auditado (aceite T5)', () => {
  it('admin recebe conta/PIX COMPLETOS de repasse aprovado; acesso REGISTRADO (quem/quando/qual)', async () => {
    const repasseId = await seedCenarioComRepasseAprovado();

    const resultado = await getBankDetailsForPayoutCore(
      db, { tenantId: CASTELO_ID, repasseId }, platformAdmin
    );

    expect(resultado.conta).toBe(CONTA_CLARO);
    expect(resultado.pix).toBe(PIX_CLARO);
    expect(resultado.titular).toBe('Marina Castelo');
    expect(resultado.avisoAuditoria).toContain('registrado');

    const trilha = await lerAuditoria();
    const concedido = trilha.find((r) => r['resultado'] === 'concedido');
    expect(concedido).toMatchObject({
      tipo: 'acesso_dados_bancarios',
      tenantId: CASTELO_ID,
      repasseId,
      uid: ADMIN_UID,
      papel: 'platform_admin',
    });
    expect(concedido?.['em']).toBeTruthy(); // quando
  });

  it('ATAQUE — owner e staff ⇒ permission-denied E acesso registrado (negado_papel)', async () => {
    const repasseId = await seedCenarioComRepasseAprovado();

    for (const caller of [owner, staff]) {
      await expect(
        getBankDetailsForPayoutCore(db, { tenantId: CASTELO_ID, repasseId }, caller)
      ).rejects.toMatchObject({ code: 'permission-denied' });
    }

    const trilha = await lerAuditoria();
    const negados = trilha.filter((r) => r['resultado'] === 'negado_papel');
    expect(negados).toHaveLength(2);
    expect(negados.map((r) => r['uid']).sort()).toEqual(
      [MARINA_UID, 'uid-staff'].sort()
    );
  });

  it('repasse fora de aprovado (solicitado) ⇒ failed-precondition + registro negado_estado', async () => {
    await seedCenarioComRepasseAprovado();
    const { repasseId: solicitadoId } = await requestRepasseCore(
      db, { valor: 100, eventoId: EVENTO_ID }, owner
    );
    await expect(
      getBankDetailsForPayoutCore(
        db, { tenantId: CASTELO_ID, repasseId: solicitadoId }, platformAdmin
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    const trilha = await lerAuditoria();
    expect(trilha.some((r) => r['resultado'] === 'negado_estado')).toBe(true);
  });

  it('blob adulterado ⇒ internal + registro erro_decifra; mensagem SEM payload', async () => {
    const repasseId = await seedCenarioComRepasseAprovado();
    await db.doc(`tenants/${CASTELO_ID}/dadosBancariosSecret/current`).update({
      authTag: Buffer.from(randomBytes(16)).toString('base64'),
    });

    let mensagem = '';
    try {
      await getBankDetailsForPayoutCore(
        db, { tenantId: CASTELO_ID, repasseId }, platformAdmin
      );
    } catch (err) {
      mensagem = err instanceof Error ? err.message : String(err);
      expect((err as { code?: string }).code).toBe('internal');
    }
    expect(mensagem).not.toBe('');
    expect(mensagem).not.toContain(CONTA_CLARO);
    expect(mensagem).not.toContain(PIX_CLARO);
    const trilha = await lerAuditoria();
    expect(trilha.some((r) => r['resultado'] === 'erro_decifra')).toBe(true);
  });

  it('a trilha NUNCA contém o número em claro; cliente NÃO lê auditoriaAcessos (Rules)', async () => {
    const repasseId = await seedCenarioComRepasseAprovado();
    await getBankDetailsForPayoutCore(
      db, { tenantId: CASTELO_ID, repasseId }, platformAdmin
    );

    const trilha = await lerAuditoria();
    const serializada = JSON.stringify(trilha);
    expect(serializada).not.toContain(CONTA_CLARO);
    expect(serializada).not.toContain(PIX_CLARO);

    // deny-by-default: nem o próprio admin lê a trilha via client SDK
    const adminClientDb = testEnv
      .authenticatedContext(ADMIN_UID, { role: 'platform_admin' })
      .firestore();
    await assertFails(getDocs(collection(adminClientDb, AUDITORIA_ACESSOS_COL)));
  });
});
