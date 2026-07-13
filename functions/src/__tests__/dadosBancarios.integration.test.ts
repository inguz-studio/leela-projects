/**
 * dadosBancarios.integration.test.ts — LEELA-E09s-L2-T2
 *
 * `saveDadosBancariosCore` contra o Firestore Emulator. Prova os aceites:
 *   - grava `dadosBancarios/current` SÓ mascarado e
 *     `dadosBancariosSecret/current` cifrado (RN-354);
 *   - o secret NÃO é legível por cliente (owner incluso); o mascarado É
 *     legível pelo owner (Rules reais — regressão L1);
 *   - retorno ao cliente = APENAS mascarado; nenhum dado em claro persiste
 *     em NENHUM dos docs;
 *   - reenvio sobrescreve idempotente PRESERVANDO criadoEm;
 *   - staff/athlete ⇒ permission-denied (owner-only — minimização LGPD);
 *   - sem BANK_DATA_KEY ⇒ failed-precondition e ZERO escrita (fail-closed);
 *   - input inválido ⇒ invalid-argument.
 *
 * Pré-requisito: Firestore Emulator na 8080 (via emulators:exec).
 */
import { randomBytes } from 'node:crypto';
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
import type { AuthClaims } from '@leela/core';
import {
  decifrarDadosBancarios,
  ENV_BANK_DATA_KEY,
  type EnvelopeCifrado,
} from '../finance/cifraDadosBancarios';
import { saveDadosBancariosCore } from '../finance/saveDadosBancarios';
import type { FinanceCaller } from '../finance/atores';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';

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
const athlete: FinanceCaller = {
  uid: 'uid-atleta',
  claims: { role: 'athlete' } as AuthClaims,
};

const INPUT = {
  banco: '260 — Nubank',
  agencia: '0001',
  conta: '12345-6',
  tipo: 'corrente',
  pix: 'marina@gmail.com',
  titular: 'Marina Castelo',
  cpfCnpj: '123.456.789-12',
};

const P_PUBLICO = `tenants/${CASTELO_ID}/dadosBancarios/current`;
const P_SECRET = `tenants/${CASTELO_ID}/dadosBancariosSecret/current`;

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
  await db.collection('tenants').doc(CASTELO_ID).set({
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: new Date(), atualizadoEm: new Date(),
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('saveDadosBancarios — RN-354 (aceite T2)', () => {
  it('grava mascarado + secret cifrado; retorno = SÓ mascarado; nada em claro persiste', async () => {
    const resultado = await saveDadosBancariosCore(db, INPUT, owner);

    expect(resultado.dadosBancarios.contaMascarada).toBe('****3456');
    expect(resultado.dadosBancarios.pixMascarado).toBe('***@g***.com');
    expect(JSON.stringify(resultado)).not.toContain('12345-6');
    expect(JSON.stringify(resultado)).not.toContain('marina@gmail.com');

    const publico = (await db.doc(P_PUBLICO).get()).data()!;
    expect(publico['contaMascarada']).toBe('****3456');
    expect(publico['cpfCnpjMascarado']).toBe('***.***.***-12');
    const publicoJson = JSON.stringify(publico);
    expect(publicoJson).not.toContain('12345-6');
    expect(publicoJson).not.toContain('marina@gmail.com');
    expect(publicoJson).not.toContain('12345678912'); // CPF completo NUNCA persiste

    const secret = (await db.doc(P_SECRET).get()).data()!;
    expect(secret['algoritmo']).toBe('aes-256-gcm');
    expect(JSON.stringify(secret)).not.toContain('12345-6'); // cifrado, não em claro
    const decifrado = decifrarDadosBancarios(
      secret as unknown as EnvelopeCifrado,
      CASTELO_ID
    );
    expect(decifrado).toEqual({ conta: '12345-6', pix: 'marina@gmail.com' });
  });

  it('Rules (regressão L1): owner LÊ o mascarado; secret NEGADO até para o owner', async () => {
    await saveDadosBancariosCore(db, INPUT, owner);
    const ownerDb = testEnv
      .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
      .firestore();
    await assertSucceeds(getDoc(doc(ownerDb, P_PUBLICO)));
    await assertFails(getDoc(doc(ownerDb, P_SECRET)));
  });

  it('reenvio sobrescreve idempotente PRESERVANDO criadoEm', async () => {
    await saveDadosBancariosCore(db, INPUT, owner);
    const antes = (await db.doc(P_PUBLICO).get()).data()!;

    await saveDadosBancariosCore(db, { ...INPUT, conta: '99887-1' }, owner);
    const depois = (await db.doc(P_PUBLICO).get()).data()!;

    expect(depois['criadoEm']).toEqual(antes['criadoEm']); // preservado
    expect(depois['contaMascarada']).toBe('****8871'); // sobrescrito
    const secret = (await db.doc(P_SECRET).get()).data()!;
    expect(
      decifrarDadosBancarios(secret as unknown as EnvelopeCifrado, CASTELO_ID).conta
    ).toBe('99887-1');
  });

  it('ATAQUE — staff e athlete NÃO cadastram (owner-only, minimização LGPD)', async () => {
    await expect(saveDadosBancariosCore(db, INPUT, staff)).rejects.toMatchObject({
      code: 'permission-denied',
    });
    await expect(saveDadosBancariosCore(db, INPUT, athlete)).rejects.toMatchObject({
      code: 'permission-denied',
    });
    expect((await db.doc(P_PUBLICO).get()).exists).toBe(false);
  });

  it('FAIL-CLOSED — sem BANK_DATA_KEY: failed-precondition e ZERO escrita', async () => {
    const backup = process.env[ENV_BANK_DATA_KEY];
    delete process.env[ENV_BANK_DATA_KEY];
    try {
      await expect(saveDadosBancariosCore(db, INPUT, owner)).rejects.toMatchObject({
        code: 'failed-precondition',
      });
      expect((await db.doc(P_PUBLICO).get()).exists).toBe(false);
      expect((await db.doc(P_SECRET).get()).exists).toBe(false);
    } finally {
      process.env[ENV_BANK_DATA_KEY] = backup;
    }
  });

  it('input inválido ⇒ invalid-argument (lista de erros acionável)', async () => {
    await expect(
      saveDadosBancariosCore(db, { ...INPUT, conta: '12' }, owner)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});
