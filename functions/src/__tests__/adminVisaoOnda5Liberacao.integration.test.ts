/**
 * adminVisaoOnda5Liberacao.integration.test.ts — ADMIN-VISAO onda 5 ·
 * S1615-T3 · RN-548 · RN-551
 *
 * A prova que a RN-548 cobra por escrito: **as duas portas terminam no mesmo
 * estado terminal, comparado CAMPO A CAMPO**. Código (RN-414) e liberação
 * direta rodam de verdade, contra o Firestore + Auth Emulator, e o que sai dos
 * dois lados é conferido doc a doc e claim a claim.
 *
 * O que fica IGUAL, e é o contrato:
 *   - `tenants/{slug}`: status, tipo, e o vínculo com o owner;
 *   - `profissionais/{uid}`: `tenantId`, `statusOnboarding: 'ativo'`, `papeis`;
 *   - claims: `tenant_owner` + `tenantId`;
 *   - `commercialTerms/current` e o snapshot `v1`.
 *
 * O que fica DIFERENTE de propósito, e é RASTRO e não estado:
 *   - `tenants/{slug}.atualizadoPor` — no resgate é a própria pessoa; na porta
 *     administrativa é o ADMINISTRADOR, porque foi ele quem agiu (RN-551);
 *   - o livro `auditoriaAcessos`, onde só a porta administrativa escreve o ato
 *     com `porta: 'liberacao_direta'` (o convite queimado, RN-447, continua
 *     sendo o rastro do código).
 *
 * Pré-requisito: Firestore + Auth Emulator. Rodar na raiz com
 * `firebase emulators:exec --only firestore,auth "<comando>"`.
 *
 * ⚠️ NÃO EXECUTADO na máquina que escreveu este arquivo: `firebase-tools` exige
 * JDK 21+ e o JDK instalado é o 17 (`firebase-tools no longer supports Java
 * version before 21`). As guardas, as recusas nomeadas e o rastro estão
 * provados sem emulator em `adminVisaoOnda5Liberacao.test.ts`; o que só este
 * arquivo prova é a IGUALDADE dos dois desfechos.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  COLECAO_CONVITES_ORGANIZADOR,
  TERMO_LGPD_FINALIDADE,
  TERMO_LGPD_VERSAO,
} from '@leela/core';
import { resgatarConviteCore } from '../platform/resgatarConviteOrganizador';
import {
  liberarAcessoOrganizadorCore,
  PORTA_LIBERACAO_DIRETA,
  TIPO_ACESSO_LIBERACAO,
} from '../platform/liberarAcessoOrganizador';
import { AUDITORIA_ACESSOS_COL } from '../shared/auditoriaAcessos';

const PROJECT_ID = 'demo-leela';
const ADMIN_UID = 'uid-platform-admin-onda5';
const CODIGO_OK = 'AB23CD45';

type Raw = Record<string, unknown>;

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

/** Prefixo único por execução — o Auth Emulator sobrevive ao clear. */
const RUN = Date.now().toString(36);

beforeAll(() => {
  process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
  process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= 'localhost:9099';
  if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
  db = admin.firestore();
  auth = admin.auth();
});

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

async function limpar(): Promise<void> {
  for (const col of [
    COLECAO_CONVITES_ORGANIZADOR,
    'profissionais',
    'tenants',
    'rateLimits',
    AUDITORIA_ACESSOS_COL,
  ]) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

beforeEach(async () => {
  await limpar();
});

/** A conta como o produto a cria: claim `athlete` + doc de auto-cadastro. */
async function contaRecemCadastrada(
  sufixo: string,
  organizacao: string
): Promise<{ uid: string; email: string }> {
  const email = `organizador-${RUN}-${sufixo}@demo-leela.dev`;
  const user = await auth.createUser({ email, password: 'segredo123' });
  await auth.setCustomUserClaims(user.uid, { role: 'athlete' });
  await db.collection('profissionais').doc(user.uid).set({
    id: user.uid,
    nome: `Organizador ${sufixo}`,
    email,
    telefone: '48999998888',
    organizacao,
    statusOnboarding: 'aguardando_convite',
    consentimentoLgpd: {
      versao: TERMO_LGPD_VERSAO,
      finalidade: TERMO_LGPD_FINALIDADE,
      aceitoEm: FieldValue.serverTimestamp(),
    },
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
  return { uid: user.uid, email };
}

/**
 * Campos que MUDAM legitimamente entre duas contas diferentes (identidade,
 * relógio) ou que são o RASTRO da porta. Tudo o mais tem de bater.
 */
const IGNORADOS_TENANT = new Set([
  'id',
  'nome',
  'slug',
  'ownerUid',
  'criadoEm',
  'atualizadoEm',
  // Rastro da porta (RN-551), não estado: no resgate é a pessoa, aqui é o admin.
  'atualizadoPor',
]);

const IGNORADOS_PROFISSIONAL = new Set([
  'id',
  'nome',
  'email',
  'telefone',
  'organizacao',
  'tenantId',
  'consentimentoLgpd',
  'criadoEm',
  'atualizadoEm',
]);

function semAsChaves(data: Raw, ignoradas: Set<string>): Raw {
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => !ignoradas.has(k))
  );
}

describe('RN-548 — as duas portas, um destino só', () => {
  it('código e liberação direta produzem o MESMO estado terminal, campo a campo', async () => {
    // ── Porta 1: o código (RN-414) ────────────────────────────────────────
    const pelaPorta = await contaRecemCadastrada('codigo', 'Castelo Producoes');
    await db.collection(COLECAO_CONVITES_ORGANIZADOR).doc(CODIGO_OK).set({
      codigo: CODIGO_OK,
      status: 'ativo',
      criadoPor: ADMIN_UID,
      criadoEm: FieldValue.serverTimestamp(),
    });
    const r1 = await resgatarConviteCore(
      db,
      auth,
      { codigo: CODIGO_OK },
      pelaPorta.uid,
      pelaPorta.email
    );

    // ── Porta 2: a liberação administrativa (RN-548) ──────────────────────
    const peloPortao = await contaRecemCadastrada('direta', 'Passo Certo');
    const r2 = await liberarAcessoOrganizadorCore(
      db,
      auth,
      { contaUid: peloPortao.uid },
      { uid: ADMIN_UID, claims: { role: 'platform_admin' } as never }
    );

    // ── tenants/{slug} ────────────────────────────────────────────────────
    const [t1, t2] = await Promise.all([
      db.collection('tenants').doc(r1.tenantId).get(),
      db.collection('tenants').doc(r2.tenantId).get(),
    ]);
    expect(semAsChaves(t1.data() ?? {}, IGNORADOS_TENANT)).toEqual(
      semAsChaves(t2.data() ?? {}, IGNORADOS_TENANT)
    );
    expect(t1.get('status')).toBe('ativo');
    expect(t2.get('status')).toBe('ativo');
    expect(t1.get('ownerUid')).toBe(pelaPorta.uid);
    expect(t2.get('ownerUid')).toBe(peloPortao.uid);

    // ── profissionais/{uid} ───────────────────────────────────────────────
    const [p1, p2] = await Promise.all([
      db.collection('profissionais').doc(pelaPorta.uid).get(),
      db.collection('profissionais').doc(peloPortao.uid).get(),
    ]);
    expect(semAsChaves(p1.data() ?? {}, IGNORADOS_PROFISSIONAL)).toEqual(
      semAsChaves(p2.data() ?? {}, IGNORADOS_PROFISSIONAL)
    );
    expect(p1.get('statusOnboarding')).toBe('ativo');
    expect(p2.get('statusOnboarding')).toBe('ativo');
    expect(p1.get('papeis')).toEqual(['organizador']);
    expect(p2.get('papeis')).toEqual(['organizador']);
    expect(p1.get('tenantId')).toBe(r1.tenantId);
    expect(p2.get('tenantId')).toBe(r2.tenantId);

    // O consentimento carimbado no cadastro sobrevive às DUAS portas.
    expect(p1.get('consentimentoLgpd')).toBeTruthy();
    expect(p2.get('consentimentoLgpd')).toBeTruthy();

    // ── claims ────────────────────────────────────────────────────────────
    const [u1, u2] = await Promise.all([
      auth.getUser(pelaPorta.uid),
      auth.getUser(peloPortao.uid),
    ]);
    expect(u1.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: r1.tenantId,
    });
    expect(u2.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: r2.tenantId,
    });

    // ── termos comerciais ─────────────────────────────────────────────────
    const [ct1, ct2] = await Promise.all([
      db.doc(`tenants/${r1.tenantId}/commercialTerms/current`).get(),
      db.doc(`tenants/${r2.tenantId}/commercialTerms/current`).get(),
    ]);
    const IGNORADOS_TERMOS = new Set(['atualizadoPor', 'atualizadoEm']);
    expect(semAsChaves(ct1.data() ?? {}, IGNORADOS_TERMOS)).toEqual(
      semAsChaves(ct2.data() ?? {}, IGNORADOS_TERMOS)
    );
    expect(ct1.get('versao')).toBe(1);
    expect(ct2.get('versao')).toBe(1);
    const v1 = await db.doc(`tenants/${r2.tenantId}/commercialTerms/v1`).get();
    expect(v1.exists).toBe(true);
  });

  it('a porta administrativa carimba o ADMIN em `atualizadoPor` — é rastro, não estado (RN-551)', async () => {
    const conta = await contaRecemCadastrada('rastro', 'Trilha Sul');

    const r = await liberarAcessoOrganizadorCore(
      db,
      auth,
      { contaUid: conta.uid },
      { uid: ADMIN_UID, claims: { role: 'platform_admin' } as never }
    );

    const t = await db.collection('tenants').doc(r.tenantId).get();
    expect(t.get('atualizadoPor')).toBe(ADMIN_UID);
    expect(t.get('ownerUid')).toBe(conta.uid);
  });

  it('o ato entra no livro `auditoriaAcessos` com a porta nomeada (RN-551)', async () => {
    const conta = await contaRecemCadastrada('livro', 'Norte Runners');

    const r = await liberarAcessoOrganizadorCore(
      db,
      auth,
      { contaUid: conta.uid },
      { uid: ADMIN_UID, claims: { role: 'platform_admin' } as never }
    );

    const snap = await db
      .collection(AUDITORIA_ACESSOS_COL)
      .where('tipo', '==', TIPO_ACESSO_LIBERACAO)
      .get();
    expect(snap.size).toBe(1);
    expect(snap.docs[0]?.data()).toMatchObject({
      porta: PORTA_LIBERACAO_DIRETA,
      uid: ADMIN_UID,
      contaUid: conta.uid,
      tenantId: r.tenantId,
      resultado: 'concedido',
    });
  });

  it('replay: liberar duas vezes a MESMA conta é idempotente e não cria segundo tenant', async () => {
    const conta = await contaRecemCadastrada('replay', 'Duas Vezes');

    const primeira = await liberarAcessoOrganizadorCore(
      db,
      auth,
      { contaUid: conta.uid },
      { uid: ADMIN_UID, claims: { role: 'platform_admin' } as never }
    );

    // A conta já é `tenant_owner` agora — a régua de elegibilidade recusa, e a
    // recusa é NOMEADA. É o comportamento certo para o operador: a segunda
    // tentativa não é um erro obscuro, é "essa conta já tem acesso".
    await expect(
      liberarAcessoOrganizadorCore(
        db,
        auth,
        { contaUid: conta.uid },
        { uid: ADMIN_UID, claims: { role: 'platform_admin' } as never }
      )
    ).rejects.toMatchObject({ details: { motivo: 'conta_inelegivel' } });

    const tenants = await db.collection('tenants').get();
    expect(tenants.size).toBe(1);
    expect(tenants.docs[0]?.id).toBe(primeira.tenantId);
  });
});
