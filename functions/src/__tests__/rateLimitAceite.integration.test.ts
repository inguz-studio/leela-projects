/**
 * rateLimitAceite.integration.test.ts — LEELA-R2-RATELIMIT (E18 · aceite)
 *
 * Integração REAL no Emulator (Firestore 8080 + Auth 9099): rate-limit
 * FAILURES-ONLY, keyed no ALVO real, da callable PÚBLICA
 * `provisionAssessoriaAccount`.
 *
 * Desenho endurecido pós-review antagonista (ver provisionAssessoria.ts):
 *   - SEM chave por IP/origem (premissa de infra não verificável → bypass
 *     silencioso; DoS de vizinho de NAT). Throttle volumétrico = borda.
 *   - Balde por ALVO (convite real `tenantId/parceriaId`): SÓ a FALHA de
 *     validação de token (`permission-denied`) alimenta, DEPOIS do core.
 *   - Aceite legítimo (token válido → sucesso/replay) NUNCA consome → zero
 *     DoS da vítima. Erro de usuário (senha curta) também não conta.
 *
 * Cobre:
 *   - estouro do balde (LIMITE consumos passam, o seguinte nega genérico);
 *   - janela DESLIZANTE expira e volta a aceitar; negativa não estende;
 *   - baldes de alvo independentes;
 *   - FAIL-CLOSED: erro de infra na transação NEGA (`resource-exhausted`);
 *   - brute-force bounded (30 token-errado → 31º `resource-exhausted`) E a
 *     vítima com token VÁLIDO NÃO é bloqueada (o aceite não toca o balde);
 *   - typo de senha (invalid-argument) NÃO enche o balde;
 *   - Rules: `rateLimits` ilegível/inescrevível por client (admin incluso).
 *
 * Skip real (describe.skipIf) sem FIRESTORE_EMULATOR_HOST — padrão C1.
 */
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { doc as clientDoc, getDoc, setDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import {
  clearFirestoreDrained,
  deleteAllUsersDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';
import { cadastrarAssessoriaCore } from '../assessorias/cadastrarAssessoria';
import {
  ACEITE_JANELA_MS,
  ACEITE_LIMITE_POR_ALVO,
  janelaDoAlvo,
  provisionAssessoriaComRateLimit,
} from '../assessorias/provisionAssessoria';
import {
  COLECAO_RATE_LIMITS,
  consumirRateLimit,
} from '../shared/rateLimit';
import type { AuthClaims } from '@leela/core';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const AGORA = new Date('2026-07-18T12:00:00Z');

const CNPJ_OK = '11.222.333/0001-81';
const CNPJ_KEY = '11222333000181';

const marina = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

describe.skipIf(!hasEmulator)('rate-limit do aceite público (LEELA-R2)', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
        host: 'localhost',
        port: Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080),
      },
    });
    if (!admin.apps.length) {
      process.env['FIRESTORE_EMULATOR_HOST'] = `localhost:${process.env['LEELA_FS_EMU_PORT'] ?? '8080'}`;
      process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= `localhost:${process.env['LEELA_AUTH_EMU_PORT'] ?? '9099'}`;
      admin.initializeApp({ projectId: PROJECT_ID });
    }
    db = admin.firestore();
    auth = admin.auth();
    process.env['LEELA_CONVITE_EXPOR_TOKEN'] = 'true';
  });

  // SUITE-STAB: clear+seed com triggers pausados + canário verificado.
  beforeEach(async () => {
    await withTriggersPaused(async () => {
      await clearFirestoreDrained(testEnv);
      await deleteAllUsersDrained(auth);
      await seedVerified(
        db,
        testEnv,
        async () => {
          await db.collection('tenants').doc(CASTELO_ID).set({
            id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
            status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
            criadoEm: Timestamp.fromDate(AGORA), atualizadoEm: Timestamp.fromDate(AGORA),
          });
        },
        [`tenants/${CASTELO_ID}`]
      );
    });
  }, 30_000);

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  const alvoInput = { tenantId: CASTELO_ID, parceriaId: CNPJ_KEY };

  async function cadastrarPendente() {
    const r = await cadastrarAssessoriaCore(
      db, auth,
      {
        nome: 'Assessoria Correr Bem',
        documento: CNPJ_OK,
        responsavelEmail: 'rodrigo@correrbem.dev',
      },
      marina,
      AGORA
    );
    return { ...r, token: r.tokenAceite as string };
  }

  const inputAceite = (token: string, extra: Record<string, unknown> = {}) => ({
    tenantId: CASTELO_ID,
    parceriaId: CNPJ_KEY,
    token,
    senha: 'senha-forte-8!',
    ...extra,
  });

  // ── consumirRateLimit (núcleo) ──────────────────────────────────────────

  it('estouro do balde: LIMITE consumos passam, o seguinte nega resource-exhausted', async () => {
    const janela = [janelaDoAlvo(alvoInput)];
    for (let i = 0; i < ACEITE_LIMITE_POR_ALVO; i++) {
      await consumirRateLimit(db, janela, AGORA);
    }
    await expect(
      consumirRateLimit(db, janela, AGORA)
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
  });

  it('janela DESLIZA: expira e volta a aceitar; negativa não estende a janela', async () => {
    const janela = [janelaDoAlvo(alvoInput)];
    for (let i = 0; i < ACEITE_LIMITE_POR_ALVO; i++) {
      await consumirRateLimit(db, janela, AGORA);
    }
    // Ainda dentro da janela (14 min): segue negado
    const aos14min = new Date(AGORA.getTime() + 14 * 60_000);
    await expect(
      consumirRateLimit(db, janela, aos14min)
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
    // Janela vencida (15 min + 1 ms): aceita — prova que a NEGATIVA dos 14 min
    // não apendou marco (sem lockout permanente).
    const depoisDaJanela = new Date(AGORA.getTime() + ACEITE_JANELA_MS + 1);
    await expect(
      consumirRateLimit(db, janela, depoisDaJanela)
    ).resolves.toBeUndefined();
  });

  it('baldes de ALVO independentes: outro convite não é afetado', async () => {
    const bloqueado = [janelaDoAlvo(alvoInput)];
    for (let i = 0; i < ACEITE_LIMITE_POR_ALVO; i++) {
      await consumirRateLimit(db, bloqueado, AGORA);
    }
    await expect(
      consumirRateLimit(db, bloqueado, AGORA)
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
    await expect(
      consumirRateLimit(
        db,
        [janelaDoAlvo({ tenantId: CASTELO_ID, parceriaId: 'outra-parceria' })],
        AGORA
      )
    ).resolves.toBeUndefined();
  });

  it('FAIL-CLOSED: erro de infra na transação NEGA (resource-exhausted)', async () => {
    const dbQuebrado = {
      collection: () => ({ doc: (id: string) => ({ id }) }),
      runTransaction: async () => {
        throw new Error('infra indisponível');
      },
    } as unknown as admin.firestore.Firestore;
    await expect(
      consumirRateLimit(dbQuebrado, [janelaDoAlvo(alvoInput)], AGORA)
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
  });

  // ── Fiação no aceite (provisionAssessoriaComRateLimit) ──────────────────

  it('brute-force BOUNDED + vítima NÃO bloqueada: 30 token-errado → resource-exhausted; token válido ainda aceita', async () => {
    const { clubeId, token } = await cadastrarPendente();

    // 30 tentativas de token ERRADO contra o convite real: opacas
    // (permission-denied), cada uma consome 1 do balde por ALVO.
    for (let i = 0; i < ACEITE_LIMITE_POR_ALVO; i++) {
      await expect(
        provisionAssessoriaComRateLimit(db, auth, inputAceite('a'.repeat(64)), AGORA)
      ).rejects.toMatchObject({ code: 'permission-denied' });
    }
    // 31ª falha: balde no teto → resource-exhausted genérico (opaco).
    await expect(
      provisionAssessoriaComRateLimit(db, auth, inputAceite('b'.repeat(64)), AGORA)
    ).rejects.toMatchObject({ code: 'resource-exhausted' });

    // A VÍTIMA com token VÁLIDO NÃO é bloqueada pelo balde saturado de falhas
    // (o aceite legítimo nunca toca o contador) — fix F2-02/#1.
    const r = await provisionAssessoriaComRateLimit(
      db, auth, inputAceite(token), AGORA
    );
    expect(r).toMatchObject({ ok: true, clubeId, replay: false });
  });

  it('typo de senha (invalid-argument) NÃO enche o balde: sem DoS por erro de usuário', async () => {
    const { token } = await cadastrarPendente();
    // Muitas tentativas de senha curta (token VÁLIDO, conta nova): o core
    // valida o token e só então barra a senha → invalid-argument, NÃO conta.
    for (let i = 0; i < ACEITE_LIMITE_POR_ALVO + 5; i++) {
      await expect(
        provisionAssessoriaComRateLimit(db, auth, inputAceite(token, { senha: '123' }), AGORA)
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    }
    // Token válido + senha ok ainda aceita (balde nunca encheu).
    const r = await provisionAssessoriaComRateLimit(
      db, auth, inputAceite(token), AGORA
    );
    expect(r.ok).toBe(true);
  });

  it('fluxo LEGÍTIMO não consome o balde: aceite feliz + replay idempotente', async () => {
    const { clubeId, token } = await cadastrarPendente();
    const r1 = await provisionAssessoriaComRateLimit(
      db, auth, inputAceite(token), AGORA
    );
    expect(r1).toMatchObject({ ok: true, clubeId, replay: false });
    const r2 = await provisionAssessoriaComRateLimit(
      db, auth, inputAceite(token), AGORA
    );
    expect(r2.replay).toBe(true);
    // O balde do alvo segue vazio: consumir LIMITE vezes ainda cabe.
    const janela = [janelaDoAlvo(alvoInput)];
    for (let i = 0; i < ACEITE_LIMITE_POR_ALVO; i++) {
      await consumirRateLimit(db, janela, AGORA);
    }
    await expect(
      consumirRateLimit(db, janela, AGORA)
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
  });

  // ── Rules: contadores invisíveis/intocáveis para client SDK ─────────────

  it('Rules: rateLimits é ilegível e inescrevível por client (platform_admin incluso)', async () => {
    const janela = janelaDoAlvo(alvoInput);
    await consumirRateLimit(db, [janela], AGORA);
    const path = `${COLECAO_RATE_LIMITS}/${janela.chave}`;

    const ownerDb = testEnv
      .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
      .firestore();
    const adminClientDb = testEnv
      .authenticatedContext('uid-platform-admin', { role: 'platform_admin' })
      .firestore();
    const anonDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(clientDoc(ownerDb, path)));
    await assertFails(getDoc(clientDoc(anonDb, path)));
    await assertFails(getDoc(clientDoc(adminClientDb, path)));
    // Auto-reset do próprio limite: NEGADO
    await assertFails(setDoc(clientDoc(adminClientDb, path), { marcos: [] }));
    await assertFails(setDoc(clientDoc(anonDb, path), { marcos: [] }));
  });
});
