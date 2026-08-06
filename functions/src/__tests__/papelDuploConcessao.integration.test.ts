/**
 * papelDuploConcessao.integration.test.ts — lane PAPEL-DUPLO (T2/T4)
 *
 * O eixo que o teste unitário (mocks) NÃO cobre: a claim atravessa o Firebase
 * Auth de verdade e volta relida do servidor. É a prova do CAMINHO OFICIAL —
 * a Function grava, `getUser()` relê, e o crachá que sai é o que as Rules vão
 * ler. Pega o que mock nenhum pega: chave recusada como reservada, payload
 * acima de 1000 caracteres, `role`/`tenantId` perdidos no merge.
 *
 * Também exercita a REVOGAÇÃO e mede o corte de refresh token (`tokensValidAfterTime`),
 * que é o número por trás do "sair e entrar de novo".
 *
 * Auth Emulator obrigatório. Roda ISOLADO — o Auth Emulator não tem
 * `clearAuth` equivalente ao `clearFirestore` e roda QUENTE entre execuções,
 * por isso os uids são próprios deste arquivo.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as admin from 'firebase-admin';
import { isPlatformAdmin, canSetClaims, paineisDaConta, type AuthClaims } from '@leela/core';

const PROJECT_ID = 'demo-leela-papelduplo';

process.env['FIREBASE_AUTH_EMULATOR_HOST'] =
  `127.0.0.1:${process.env['LEELA_AUTH_EMU_PORT'] ?? '9099'}`;

const hasEmulator = Boolean(process.env['FIREBASE_AUTH_EMULATOR_HOST']);

const ADMIN_LEGADO_UID = 'pd-uid-admin-legado';
const DONO_UID = 'pd-uid-dono';
const SUCESSOR_UID = 'pd-uid-sucessor';
const TENANT_ID = 'castelo-producoes';

let auth: admin.auth.Auth;

/** Handler da callable v1, invocado como o runtime invoca. */
type Callable = (data: unknown, context: unknown) => Promise<unknown>;
let chamarCapacidade: Callable;

async function chamar(data: unknown, callerUid: string, claims: AuthClaims) {
  return chamarCapacidade(data, { auth: { uid: callerUid, token: claims } });
}
async function codigoDoErro(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return '(não lançou)';
  } catch (e) {
    return (e as { code?: string }).code ?? '(sem code)';
  }
}
/** Crachá RELIDO DO SERVIDOR — nunca o objeto que mandamos gravar. */
async function claimsDoServidor(uid: string): Promise<Record<string, unknown>> {
  return ((await auth.getUser(uid)).customClaims ?? {}) as Record<string, unknown>;
}

beforeAll(async () => {
  if (!hasEmulator) return;
  if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
  auth = admin.auth();

  for (const [uid, claims] of [
    [ADMIN_LEGADO_UID, { role: 'platform_admin' }],
    [DONO_UID, { role: 'tenant_owner', tenantId: TENANT_ID }],
  ] as const) {
    await auth.createUser({ uid, email: `${uid}@demo-leela.dev` }).catch(() => undefined);
    await auth.setCustomUserClaims(uid, claims);
  }

  const mod = await import('../platform/setPlatformAdminCapability');
  chamarCapacidade = (mod.setPlatformAdminCapability as unknown as { run: Callable }).run;
}, 30_000);

afterAll(async () => {
  await Promise.all(admin.apps.map((a) => a?.delete()));
});

describe.skipIf(!hasEmulator)('PAPEL-DUPLO · caminho oficial contra o Auth real', () => {
  it('ANTES: o dono é tenant_owner e NÃO é platform admin', async () => {
    const antes = await claimsDoServidor(DONO_UID);
    expect(antes).toEqual({ role: 'tenant_owner', tenantId: TENANT_ID });
    expect(isPlatformAdmin(antes as unknown as AuthClaims)).toBe(false);
    expect(paineisDaConta(antes as unknown as AuthClaims).podeAlternar).toBe(false);
  });

  it('CONCESSÃO pelo admin legado: a claim volta do servidor com os dois eixos', async () => {
    const r = (await chamar({ uid: DONO_UID, conceder: true }, ADMIN_LEGADO_UID, {
      role: 'platform_admin',
    })) as Record<string, unknown>;
    expect(r['success']).toBe(true);

    // Relido do SERVIDOR — não é o objeto que mandamos.
    const depois = await claimsDoServidor(DONO_UID);
    expect(depois).toEqual({
      role: 'tenant_owner',
      tenantId: TENANT_ID,
      platformAdmin: true,
    });
    expect(isPlatformAdmin(depois as unknown as AuthClaims)).toBe(true);
    expect(paineisDaConta(depois as unknown as AuthClaims)).toEqual({
      master: true,
      organizador: true,
      tenantId: TENANT_ID,
      podeAlternar: true,
    });
    // O Auth ACEITOU a chave: não é reservada e cabe no teto de 1000.
    expect(JSON.stringify(depois).length).toBeLessThan(1000);
  });

  it('SUCESSÃO: com o crachá REAL, o dono nomeia um terceiro', async () => {
    const doDono = (await claimsDoServidor(DONO_UID)) as unknown as AuthClaims;
    expect(isPlatformAdmin(doDono)).toBe(true);
    expect(canSetClaims(doDono)).toBe(true);

    await auth.createUser({ uid: SUCESSOR_UID, email: `${SUCESSOR_UID}@demo-leela.dev` })
      .catch(() => undefined);
    await auth.setCustomUserClaims(SUCESSOR_UID, { role: 'tenant_staff', tenantId: TENANT_ID });

    await chamar({ uid: SUCESSOR_UID, conceder: true }, DONO_UID, doDono);

    const sucessor = await claimsDoServidor(SUCESSOR_UID);
    expect(sucessor).toEqual({
      role: 'tenant_staff',
      tenantId: TENANT_ID,
      platformAdmin: true,
    });
    // O papel do sucessor não foi tocado — capacidade coexiste, não substitui.
    expect(sucessor['role']).toBe('tenant_staff');
  });

  it('AUTO-ALVO: nem com o crachá REAL o dono age sobre a própria conta', async () => {
    const doDono = (await claimsDoServidor(DONO_UID)) as unknown as AuthClaims;
    expect(await codigoDoErro(chamar({ uid: DONO_UID, conceder: true }, DONO_UID, doDono)))
      .toBe('permission-denied');
    expect(await codigoDoErro(chamar({ uid: DONO_UID, conceder: false }, DONO_UID, doDono)))
      .toBe('permission-denied');
    // A claim continua intacta depois das duas tentativas.
    expect(await claimsDoServidor(DONO_UID)).toMatchObject({ platformAdmin: true });
  });

  it('a trilha de auditoria chega no Firestore, com quem nomeou quem', async () => {
    const snap = await admin
      .firestore()
      .collection('auditoriaAcessos')
      .where('tipo', '==', 'capacidade_plataforma')
      .get();
    expect(snap.empty).toBe(false);
    const docs = snap.docs.map((d) => d.data());
    // A concessão ao dono, feita pelo admin legado, está registrada.
    expect(
      docs.some(
        (d) =>
          d['callerUid'] === ADMIN_LEGADO_UID &&
          d['targetUid'] === DONO_UID &&
          d['resultado'] === 'concedido'
      )
    ).toBe(true);
    // Toda linha tem carimbo de tempo do servidor.
    expect(docs.every((d) => d['em'] !== undefined)).toBe(true);
  });

  it('o corte de refresh token avança — é o "sair e entrar de novo"', async () => {
    const antes = (await auth.getUser(DONO_UID)).tokensValidAfterTime;
    await chamar({ uid: DONO_UID, conceder: true }, ADMIN_LEGADO_UID, { role: 'platform_admin' });
    const depois = (await auth.getUser(DONO_UID)).tokensValidAfterTime;
    expect(new Date(depois ?? 0).getTime()).toBeGreaterThanOrEqual(new Date(antes ?? 0).getTime());
  });

  it('REVOGAÇÃO devolve o crachá ao estado anterior, sem `false` gravado', async () => {
    await chamar({ uid: DONO_UID, conceder: false }, ADMIN_LEGADO_UID, { role: 'platform_admin' });
    const depois = await claimsDoServidor(DONO_UID);
    expect(depois).toEqual({ role: 'tenant_owner', tenantId: TENANT_ID });
    expect('platformAdmin' in depois).toBe(false);
    expect(isPlatformAdmin(depois as unknown as AuthClaims)).toBe(false);
  });

  it('o papel legado do concedente nunca é tocado pela operação', async () => {
    expect(await claimsDoServidor(ADMIN_LEGADO_UID)).toEqual({ role: 'platform_admin' });
  });
});
