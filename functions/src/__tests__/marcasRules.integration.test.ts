/**
 * marcasRules.integration.test.ts — LEELA-R9E · S-R9-12-T1 (RN-171/123)
 * (⚠️ EXIGE Firestore no Emulator — lane R9-E = LEELA_FS_EMU_PORT=8480.)
 *
 * FIX pós-review antagonista (R9-E-ret): o gate do lote pede prova de
 * emulator das Rules OWNER-ONLY de `profissionais/{profId}/marcas` — a
 * suíte não existia. Ataques cobertos:
 *   M1. Dono faz CRUD com shape válido (financeiro e permuta).
 *   M2. OUTRO usuário autenticado não lê, não escreve, não deleta a lista
 *       alheia (valores de patrocínio = dado sensível de negociação).
 *   M3. Shape inválido morre na Rule mesmo vindo do DONO (financeiro sem
 *       valorAnual>0; permuta com contrapartida < 20; logoUrl javascript:).
 *   M4. Writer do MESMO tenant que não é o dono também não lê (owner-only
 *       de verdade, não tenant-wide).
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
  doc as clientDoc,
  deleteDoc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const FS_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8080
);

const DONO_UID = 'uid-marina-castelo';
const INTRUSO_UID = 'uid-intruso';
const COLEGA_UID = 'uid-colega-mesmo-tenant';
const PATH = `profissionais/${DONO_UID}/marcas/cdl-wellness`;

const MARCA_FINANCEIRO_OK = {
  nome: 'CDL Wellness',
  modeloComercial: 'financeiro',
  valorAnual: 12000,
  status: 'ativa',
};
const CONTRA = 'Logo no kit e no pórtico de largada';

let testEnv: RulesTestEnvironment;

describe.skipIf(!hasEmulator)('Rules — marcas owner-only (S-R9-12)', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
        host: 'localhost',
        port: FS_PORT,
      },
    });
  }, 30_000);

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  const dono = () =>
    testEnv
      .authenticatedContext(DONO_UID, { role: 'tenant_owner', tenantId: 'castelo-producoes' })
      .firestore();
  const intruso = () => testEnv.authenticatedContext(INTRUSO_UID, {}).firestore();
  const colega = () =>
    testEnv
      .authenticatedContext(COLEGA_UID, { role: 'tenant_owner', tenantId: 'castelo-producoes' })
      .firestore();

  it('M1: dono cria (financeiro e permuta), lê, atualiza e deleta', async () => {
    await assertSucceeds(setDoc(clientDoc(dono(), PATH), MARCA_FINANCEIRO_OK));
    await assertSucceeds(
      setDoc(clientDoc(dono(), `profissionais/${DONO_UID}/marcas/permuta-x`), {
        nome: 'Permuta X',
        modeloComercial: 'permuta',
        contrapartida: CONTRA,
        status: 'ativa',
        logoUrl: 'https://storage.googleapis.com/leela/marcas/x.png',
      })
    );
    await assertSucceeds(getDoc(clientDoc(dono(), PATH)));
    await assertSucceeds(
      updateDoc(clientDoc(dono(), PATH), { ...MARCA_FINANCEIRO_OK, status: 'inativa' })
    );
    await assertSucceeds(deleteDoc(clientDoc(dono(), PATH)));
  });

  it('M2/M4: intruso E colega do mesmo tenant não leem/escrevem/deletam', async () => {
    await assertSucceeds(setDoc(clientDoc(dono(), PATH), MARCA_FINANCEIRO_OK));
    for (const outro of [intruso(), colega()]) {
      await assertFails(getDoc(clientDoc(outro, PATH)));
      await assertFails(
        setDoc(clientDoc(outro, PATH), { ...MARCA_FINANCEIRO_OK, nome: 'Forjada' })
      );
      await assertFails(updateDoc(clientDoc(outro, PATH), { valorAnual: 1 }));
      await assertFails(deleteDoc(clientDoc(outro, PATH)));
    }
  });

  it('M3: shape inválido morre na Rule mesmo do dono', async () => {
    // financeiro sem valorAnual
    await assertFails(
      setDoc(clientDoc(dono(), PATH), {
        nome: 'CDL',
        modeloComercial: 'financeiro',
        status: 'ativa',
      })
    );
    // permuta com contrapartida curta
    await assertFails(
      setDoc(clientDoc(dono(), PATH), {
        nome: 'CDL',
        modeloComercial: 'permuta',
        contrapartida: 'curta',
        status: 'ativa',
      })
    );
    // logoUrl fora de http(s) — javascript: nunca entra (vira <img> público)
    await assertFails(
      setDoc(clientDoc(dono(), PATH), {
        ...MARCA_FINANCEIRO_OK,
        logoUrl: 'javascript:alert(1)',
      })
    );
    // modelo fora do enum
    await assertFails(
      setDoc(clientDoc(dono(), PATH), {
        nome: 'CDL',
        modeloComercial: 'doacao',
        status: 'ativa',
      })
    );
  });
});
