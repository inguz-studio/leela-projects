/**
 * resgateConvite.integration.test.ts — LEELA-S1609-T1
 *
 * A jornada que o pacote inteiro existe para entregar: código válido destrava
 * o painel em UMA ação. E os quatro ataques que a review antagonista vai
 * cobrar (enumeração, corrida de uso único, bypass de rate-limit, claim
 * forjada) exercitados aqui contra o Emulator.
 *
 * Cobre:
 *   - resgate válido: tenant provisionado + claims + código carimbado;
 *   - a conta nasce `athlete` (default do onCreateUser) e AINDA ASSIM é
 *     promovida — sem isso o produto inteiro emperrava no último passo;
 *   - o doc `profissionais/{uid}` do cadastro é COMPLETADO (tenantId +
 *     statusOnboarding: 'ativo'), preservando o consentimento carimbado;
 *   - recusa ÚNICA e genérica: inexistente × usado × revogado × expirado
 *     devolvem a MESMA mensagem e o MESMO código de erro;
 *   - duplo resgate concorrente: um vence, o outro recebe a recusa genérica;
 *   - 6ª tentativa na janela de uma hora é recusada (RN-415);
 *   - replay: reexecutar o mesmo código pela MESMA conta devolve replay=true;
 *   - código revogado depois de usado não desfaz o tenant.
 *
 * Pré-requisito: Firestore + Auth Emulator (via emulators:exec).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  COLECAO_CONVITES_ORGANIZADOR,
  ERRO_RESGATE_CONVITE,
  LIMITE_RESGATE_CONVITE,
  TERMO_LGPD_FINALIDADE,
  TERMO_LGPD_VERSAO,
} from '@leela/core';
import { resgatarConviteCore } from '../platform/resgatarConviteOrganizador';

const PROJECT_ID = 'demo-leela';

const CODIGO_OK = 'AB23CD45';
const CODIGO_SEGUNDO = 'PQ23RS45';

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

interface ContaTeste {
  uid: string;
  email: string;
}

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

/** Limpa as coleções que este arquivo toca (sem clearFirestore global). */
async function limpar(): Promise<void> {
  for (const col of [
    COLECAO_CONVITES_ORGANIZADOR,
    'profissionais',
    'tenants',
    'rateLimits',
  ]) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

/**
 * Prefixo único por execução: o Auth Emulator sobrevive ao `clearFirestore`
 * (contas não são docs), então e-mail fixo colidiria no rerun dentro da mesma
 * sessão de emulator. Varrer e apagar TODOS os usuários no `beforeEach` seria
 * a alternativa — e é justamente ela que derruba o emulator por carga
 * (cada delete/create dispara o trigger `onCreateUser`).
 */
const RUN = Date.now().toString(36);

/**
 * Cria a conta EXATAMENTE como o produto cria: usuário Auth com claim
 * `athlete` (o default que o `onCreateUser` grava) + doc de auto-cadastro.
 */
async function contaRecemCadastrada(
  sufixo: string,
  organizacao = 'Castelo Producoes'
): Promise<ContaTeste> {
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

async function criarConvite(
  codigo: string,
  extra: Record<string, unknown> = {}
): Promise<void> {
  await db
    .collection(COLECAO_CONVITES_ORGANIZADOR)
    .doc(codigo)
    .set({
      codigo,
      status: 'ativo',
      criadoPor: 'uid-platform-admin',
      criadoEm: FieldValue.serverTimestamp(),
      ...extra,
    });
}

/** Captura o erro de uma promessa (ou `null` se ela resolveu). */
async function erroDe(p: Promise<unknown>): Promise<{ code?: string; message?: string } | null> {
  try {
    await p;
    return null;
  } catch (err) {
    return err as { code?: string; message?: string };
  }
}

beforeEach(async () => {
  await limpar();
});

describe('resgate — caminho feliz (RN-414)', () => {
  it('destrava em UMA ação: tenant + claims + código carimbado', async () => {
    const conta = await contaRecemCadastrada('feliz');
    await criarConvite(CODIGO_OK);

    const res = await resgatarConviteCore(db, auth, { codigo: CODIGO_OK }, conta.uid, conta.email);

    expect(res.replay).toBe(false);
    expect(res.tenantId).toBe('castelo-producoes');

    const tenant = await db.collection('tenants').doc(res.tenantId).get();
    expect(tenant.exists).toBe(true);
    expect(tenant.get('status')).toBe('ativo');
    expect(tenant.get('ownerUid')).toBe(conta.uid);
    expect(tenant.get('tipo')).toBe('produtor');

    const user = await auth.getUser(conta.uid);
    expect(user.customClaims?.['role']).toBe('tenant_owner');
    expect(user.customClaims?.['tenantId']).toBe(res.tenantId);

    const convite = await db.collection(COLECAO_CONVITES_ORGANIZADOR).doc(CODIGO_OK).get();
    expect(convite.get('status')).toBe('usado');
    expect(convite.get('usadoPor')).toBe(conta.uid);
    expect(convite.get('tenantId')).toBe(res.tenantId);
    expect(convite.get('usadoEm')).toBeTruthy();
  });

  it('completa o doc do cadastro sem apagar o consentimento (RN-403/412)', async () => {
    const conta = await contaRecemCadastrada('perfil');
    await criarConvite(CODIGO_OK);
    await resgatarConviteCore(db, auth, { codigo: CODIGO_OK }, conta.uid, conta.email);

    const prof = await db.collection('profissionais').doc(conta.uid).get();
    expect(prof.get('tenantId')).toBe('castelo-producoes');
    expect(prof.get('statusOnboarding')).toBe('ativo');
    expect(prof.get('papeis')).toEqual(['organizador']);
    // A prova do aceite sobrevive ao provisionamento.
    expect(prof.get('consentimentoLgpd').versao).toBe(TERMO_LGPD_VERSAO);
    expect(prof.get('telefone')).toBe('48999998888');
  });

  it('aceita o código digitado com hífen, espaço e minúscula (RN-413)', async () => {
    const conta = await contaRecemCadastrada('normaliza');
    await criarConvite(CODIGO_OK);
    const res = await resgatarConviteCore(
      db,
      auth,
      { codigo: ' ab23-cd45 ' },
      conta.uid,
      conta.email
    );
    expect(res.tenantId).toBe('castelo-producoes');
  });

  it('slug já em uso ganha desempate numérico', async () => {
    const primeira = await contaRecemCadastrada('slug1');
    const segunda = await contaRecemCadastrada('slug2');
    await criarConvite(CODIGO_OK);
    await criarConvite(CODIGO_SEGUNDO);

    const a = await resgatarConviteCore(db, auth, { codigo: CODIGO_OK }, primeira.uid, primeira.email);
    const b = await resgatarConviteCore(
      db,
      auth,
      { codigo: CODIGO_SEGUNDO },
      segunda.uid,
      segunda.email
    );
    expect(a.tenantId).toBe('castelo-producoes');
    expect(b.tenantId).toBe('castelo-producoes-2');
  });

  it('replay: a MESMA conta reexecutando o MESMO código não recebe erro', async () => {
    const conta = await contaRecemCadastrada('replay');
    await criarConvite(CODIGO_OK);
    const primeiro = await resgatarConviteCore(db, auth, { codigo: CODIGO_OK }, conta.uid, conta.email);
    const segundo = await resgatarConviteCore(db, auth, { codigo: CODIGO_OK }, conta.uid, conta.email);
    expect(segundo.replay).toBe(true);
    expect(segundo.tenantId).toBe(primeiro.tenantId);
  });
});

describe('resgate — recusa ÚNICA e genérica (RN-414 · anti-enumeração)', () => {
  it('inexistente, usado, revogado e expirado dão a MESMA resposta', async () => {
    const dono = await contaRecemCadastrada('dono');
    await criarConvite('EF67GH89');
    await resgatarConviteCore(db, auth, { codigo: 'EF67GH89' }, dono.uid, dono.email);

    await criarConvite('JK23MN45', { status: 'revogado' });
    await criarConvite('TU23VW45', {
      expiraEm: admin.firestore.Timestamp.fromMillis(Date.now() - 60_000),
    });

    const respostas: Array<{ code?: string; message?: string }> = [];
    for (const codigo of ['ZZ23ZZ45', 'EF67GH89', 'JK23MN45', 'TU23VW45', 'nao-e-codigo']) {
      const conta = await contaRecemCadastrada(`enum-${codigo}`);
      const erro = await erroDe(resgatarConviteCore(db, auth, { codigo }, conta.uid, conta.email));
      expect(erro).not.toBeNull();
      respostas.push(erro!);
    }

    const codes = new Set(respostas.map((r) => r.code));
    const mensagens = new Set(respostas.map((r) => r.message));
    expect(codes).toEqual(new Set(['permission-denied']));
    expect(mensagens.size).toBe(1);
    expect([...mensagens][0]).toContain(ERRO_RESGATE_CONVITE);
  });

  it('código de OUTRA conta não vira replay (só quem usou tem replay)', async () => {
    const dono = await contaRecemCadastrada('dono2');
    await criarConvite(CODIGO_OK);
    await resgatarConviteCore(db, auth, { codigo: CODIGO_OK }, dono.uid, dono.email);

    const intruso = await contaRecemCadastrada('intruso');
    const erro = await erroDe(
      resgatarConviteCore(db, auth, { codigo: CODIGO_OK }, intruso.uid, intruso.email)
    );
    expect(erro?.code).toBe('permission-denied');
    // E o intruso não ganhou tenant nenhum.
    const user = await auth.getUser(intruso.uid);
    expect(user.customClaims?.['tenantId']).toBeUndefined();
  });
});

describe('resgate — corrida de uso único (RN-414)', () => {
  it('duplo resgate concorrente: um vence, o outro recebe a recusa genérica', async () => {
    const a = await contaRecemCadastrada('corrida-a', 'Organizacao A');
    const b = await contaRecemCadastrada('corrida-b', 'Organizacao B');
    await criarConvite(CODIGO_OK);

    const [r1, r2] = await Promise.allSettled([
      resgatarConviteCore(db, auth, { codigo: CODIGO_OK }, a.uid, a.email),
      resgatarConviteCore(db, auth, { codigo: CODIGO_OK }, b.uid, b.email),
    ]);

    const vencedores = [r1, r2].filter((r) => r.status === 'fulfilled');
    const perdedores = [r1, r2].filter((r) => r.status === 'rejected');
    expect(vencedores).toHaveLength(1);
    expect(perdedores).toHaveLength(1);
    const motivo = (perdedores[0] as PromiseRejectedResult).reason as { code?: string };
    expect(motivo.code).toBe('permission-denied');

    const convite = await db.collection(COLECAO_CONVITES_ORGANIZADOR).doc(CODIGO_OK).get();
    expect(convite.get('status')).toBe('usado');
  });
});

describe('resgate — teto de tentativas (RN-415)', () => {
  it('a 6ª tentativa na janela de uma hora é recusada', async () => {
    const conta = await contaRecemCadastrada('rate');
    const erros: Array<{ code?: string }> = [];
    for (let i = 0; i < LIMITE_RESGATE_CONVITE + 1; i++) {
      const erro = await erroDe(
        resgatarConviteCore(db, auth, { codigo: 'ZZ23ZZ45' }, conta.uid, conta.email)
      );
      erros.push(erro ?? {});
    }
    // As 5 primeiras recusam pelo código; a 6ª recusa pelo TETO.
    expect(erros.slice(0, LIMITE_RESGATE_CONVITE).every((e) => e.code === 'permission-denied')).toBe(
      true
    );
    expect(erros[LIMITE_RESGATE_CONVITE]?.code).toBe('resource-exhausted');
  });

  it('o teto é POR CONTA — o vizinho não é punido', async () => {
    const cheia = await contaRecemCadastrada('rate-cheia');
    for (let i = 0; i < LIMITE_RESGATE_CONVITE + 1; i++) {
      await erroDe(resgatarConviteCore(db, auth, { codigo: 'ZZ23ZZ45' }, cheia.uid, cheia.email));
    }
    const vizinha = await contaRecemCadastrada('rate-vizinha');
    await criarConvite(CODIGO_OK);
    const res = await resgatarConviteCore(db, auth, { codigo: CODIGO_OK }, vizinha.uid, vizinha.email);
    expect(res.replay).toBe(false);
  });
});

describe('resgate — revogação depois do uso (RN-413)', () => {
  it('revogar não desfaz o tenant já provisionado', async () => {
    const conta = await contaRecemCadastrada('revoga');
    await criarConvite(CODIGO_OK);
    const res = await resgatarConviteCore(db, auth, { codigo: CODIGO_OK }, conta.uid, conta.email);

    // Admin SDK bypassa Rules — simula o pior caso (alguém marcando revogado
    // por fora). O tenant e as claims seguem de pé.
    await db
      .collection(COLECAO_CONVITES_ORGANIZADOR)
      .doc(CODIGO_OK)
      .update({ status: 'revogado' });

    const tenant = await db.collection('tenants').doc(res.tenantId).get();
    expect(tenant.get('status')).toBe('ativo');
    const user = await auth.getUser(conta.uid);
    expect(user.customClaims?.['tenantId']).toBe(res.tenantId);
  });
});
