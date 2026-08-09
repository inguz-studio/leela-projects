/**
 * promocaoProfissionalPonte.integration.test.ts — LEELA-S1234-T4 · A4
 *
 * A DEMONSTRAÇÃO QUE NUNCA TINHA ACONTECIDO.
 *
 * O commit da ponte (`35a85f04`) declara no próprio trailer, verbatim:
 *
 *   > Not-tested: A4 (demonstracao ponta a ponta em preview/seed) nao rodou -
 *   > deploy e proibido nesta lane. O callable nunca foi exercitado contra
 *   > emulator ou producao.
 *
 * Este arquivo é a primeira vez que a promoção roda contra um Firestore de
 * verdade. Até aqui, tudo o que se sabia dela vinha de teste com db falso —
 * e um db falso não tem transação, não tem `serverTimestamp` e não tem
 * trigger, que é exatamente onde moram as três coisas que a ponte promete.
 *
 * A TRAVESSIA, na ordem em que a participante a vive:
 *
 *   1. conta que já existe e é `athlete`, com `atletas/{uid}` gravado pelo
 *      trigger — a conta de quem comprou um ingresso e agora quer o painel;
 *   2. a promoção cria `profissionais/{uid}` em `aguardando_convite`, com o
 *      termo carimbado na versão da RN-466 e no instante do SERVIDOR;
 *   3. o papel `athlete` SOBREVIVE, e os dois documentos convivem sem se
 *      sobrescrever — é a metade da RN-450 que só um banco real prova;
 *   4. a promoção é IDEMPOTENTE: a segunda chamada não duplica, não corrompe
 *      e não recolhe consentimento já carimbado (RN-467);
 *   5. o código de convite resgata em cima do doc que a PONTE criou, e a
 *      conta ganha tenant, papel e `statusOnboarding: 'ativo'`.
 *
 * O QUE ESTE ARQUIVO NÃO PROVA, e está dito para ninguém confundir escopo:
 * o clique, a vitrine e o instante do aviso são tela, e vivem nas suítes de
 * componente da landing e do painel. Aqui é o servidor.
 *
 * ⛔ NÃO USA `clearFirestore` global: a suíte divide emulator com outros
 * arquivos e o clear de um apaga o seed do outro — vermelho de colisão é
 * indistinguível de regressão. Limpa só o que toca, e prefixa por execução.
 *
 * Pré-requisito: Firestore + Auth Emulator.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  COLECAO_CONVITES_ORGANIZADOR,
  TERMO_LGPD_FINALIDADE,
  TERMO_LGPD_VERSAO,
} from '@leela/core';
import {
  promoverParaProfissionalCore,
  type CallerPromocao,
} from '../platform/promoverParaProfissional';
import { resgatarConviteCore } from '../platform/resgatarConviteOrganizador';

const PROJECT_ID = 'demo-leela';

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

beforeAll(() => {
  process.env['FIRESTORE_EMULATOR_HOST'] ??= '127.0.0.1:8080';
  process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= '127.0.0.1:9099';
  if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
  db = admin.firestore();
  auth = admin.auth();
});

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

/** Prefixo por execução: o Auth Emulator sobrevive à limpeza do Firestore. */
const RUN = `ponte${Date.now().toString(36)}`;

async function limpar(): Promise<void> {
  for (const col of [COLECAO_CONVITES_ORGANIZADOR, 'profissionais', 'tenants', 'rateLimits']) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

/**
 * A participante como o produto a produz: conta Auth nomeada, claim `athlete`
 * e o doc `atletas/{uid}` que o trigger `onCreateUser` grava por conta própria.
 * O trigger não roda aqui (o emulator de functions não sobe nesta suíte), então
 * o efeito dele é reproduzido à mão — o ponto do caso é que a promoção NÃO
 * encosta neste documento, e para isso ele precisa existir antes.
 */
async function participanteLogada(sufixo: string): Promise<CallerPromocao & { email: string }> {
  const email = `participante-${RUN}-${sufixo}@demo-leela.dev`;
  const user = await auth.createUser({ email, password: 'segredo123', displayName: 'Ana Paula' });
  await auth.setCustomUserClaims(user.uid, { role: 'athlete' });
  await db.collection('atletas').doc(user.uid).set({
    id: user.uid,
    nome: 'Ana Paula',
    email,
    criadoEm: FieldValue.serverTimestamp(),
  });
  return {
    uid: user.uid,
    ehAnonimo: false,
    email,
    nome: 'Ana Paula',
    role: 'athlete',
    tenantId: null,
  };
}

beforeEach(async () => {
  await limpar();
});

describe('A4 · a travessia da ponte, contra o emulator', () => {
  it('a promoção cria `profissionais/{uid}` em aguardando_convite, carimbado pelo SERVIDOR', async () => {
    const ana = await participanteLogada('t1');
    const antes = Timestamp.now();

    const r = await promoverParaProfissionalCore(db, ana, { aceiteTermo: true });

    expect(r).toEqual({ statusOnboarding: 'aguardando_convite', jaExistia: false });

    const doc = await db.collection('profissionais').doc(ana.uid).get();
    expect(doc.exists).toBe(true);
    const d = doc.data() ?? {};
    expect(d['statusOnboarding']).toBe('aguardando_convite');
    expect(d['email']).toBe(ana.email);
    expect(d['nome']).toBe('Ana Paula');
    // A ponte não tem formulário: os dois campos nascem vazios de propósito.
    expect(d['telefone']).toBe('');
    expect(d['organizacao']).toBe('');
    // ⛔ A promoção NÃO ativa ninguém e NÃO concede tenant.
    expect(d['tenantId']).toBeUndefined();

    // O termo: versão e finalidade da RN-466, sem constante nova.
    const consentimento = d['consentimentoLgpd'] as Record<string, unknown>;
    expect(consentimento['versao']).toBe(TERMO_LGPD_VERSAO);
    expect(consentimento['finalidade']).toBe(TERMO_LGPD_FINALIDADE);

    // ⚔ O INSTANTE É DO SERVIDOR (RN-446). Um `serverTimestamp` resolvido vira
    // Timestamp de verdade na leitura; um carimbo do cliente não passaria por
    // aqui. É esta asserção que só um banco real sustenta.
    const aceitoEm = consentimento['aceitoEm'];
    expect(aceitoEm).toBeInstanceOf(Timestamp);
    expect((aceitoEm as Timestamp).toMillis()).toBeGreaterThanOrEqual(antes.toMillis() - 5_000);
    expect(doc.get('criadoEm')).toBeInstanceOf(Timestamp);
  });

  it('⚔ o papel `athlete` SOBREVIVE, e os dois documentos convivem', async () => {
    const ana = await participanteLogada('t2');

    await promoverParaProfissionalCore(db, ana, { aceiteTermo: true });

    // O documento de participante continua inteiro: a promoção não o toca.
    const atleta = await db.collection('atletas').doc(ana.uid).get();
    expect(atleta.exists).toBe(true);
    expect(atleta.get('nome')).toBe('Ana Paula');

    // E a claim de papel não foi mexida — a ponte não concede nada.
    const user = await auth.getUser(ana.uid);
    expect(user.customClaims).toEqual({ role: 'athlete' });
    expect(user.customClaims?.['tenantId']).toBeUndefined();

    // Os dois documentos existem lado a lado (RN-450).
    const prof = await db.collection('profissionais').doc(ana.uid).get();
    expect(prof.exists).toBe(true);
  });

  it('⚔ IDEMPOTÊNCIA · a mesma promoção duas vezes não duplica nem recarimba', async () => {
    const ana = await participanteLogada('t3');

    const primeira = await promoverParaProfissionalCore(db, ana, { aceiteTermo: true });
    const carimbo = (
      (await db.collection('profissionais').doc(ana.uid).get()).get('consentimentoLgpd') as {
        aceitoEm: Timestamp;
      }
    ).aceitoEm;

    const segunda = await promoverParaProfissionalCore(db, ana, { aceiteTermo: true });

    expect(primeira.jaExistia).toBe(false);
    expect(segunda.jaExistia).toBe(true);

    // Um doc, não dois.
    const todos = await db.collection('profissionais').where('id', '==', ana.uid).get();
    expect(todos.size).toBe(1);

    // ⛔ RN-467: consentimento carimbado não se recolhe. O instante é o MESMO.
    const depois = (
      (await db.collection('profissionais').doc(ana.uid).get()).get('consentimentoLgpd') as {
        aceitoEm: Timestamp;
      }
    ).aceitoEm;
    expect(depois.toMillis()).toBe(carimbo.toMillis());
  });

  it('⚔ DUPLO CLIQUE REAL · duas promoções concorrentes, um documento', async () => {
    // A trava da tela é um ref; esta é a segunda defesa, e ela é do banco. A
    // decisão "existe ou não" acontece DENTRO da transação — sem isso, as duas
    // chamadas leem "não existe" na mesma janela.
    const ana = await participanteLogada('t4');

    const [a, b] = await Promise.all([
      promoverParaProfissionalCore(db, ana, { aceiteTermo: true }),
      promoverParaProfissionalCore(db, ana, { aceiteTermo: true }),
    ]);

    expect([a.jaExistia, b.jaExistia].sort()).toEqual([false, true]);
    const todos = await db.collection('profissionais').where('id', '==', ana.uid).get();
    expect(todos.size).toBe(1);
  });

  it('o código de convite resgata EM CIMA do doc que a ponte criou, e destrava', async () => {
    const ana = await participanteLogada('t5');
    await promoverParaProfissionalCore(db, ana, { aceiteTermo: true });

    const codigo = 'PT23NE45';
    await db.collection(COLECAO_CONVITES_ORGANIZADOR).doc(codigo).set({
      codigo,
      status: 'ativo',
      criadoPor: 'uid-platform-admin',
      criadoEm: FieldValue.serverTimestamp(),
    });

    const { tenantId, replay } = await resgatarConviteCore(
      db,
      auth,
      { codigo },
      ana.uid,
      ana.email
    );

    expect(replay).toBe(false);
    expect(tenantId).toBeTruthy();

    const prof = await db.collection('profissionais').doc(ana.uid).get();
    expect(prof.get('statusOnboarding')).toBe('ativo');
    expect(prof.get('tenantId')).toBe(tenantId);

    // ⚔ O consentimento que a PONTE carimbou sobreviveu ao resgate — é a ponta
    // solta que a LGPD-1 persegue no caminho do cadastro.
    const consentimento = prof.get('consentimentoLgpd') as Record<string, unknown>;
    expect(consentimento['versao']).toBe(TERMO_LGPD_VERSAO);
    expect(consentimento['aceitoEm']).toBeInstanceOf(Timestamp);

    // A capacidade destravou: claim com tenant e papel de organizador.
    const user = await auth.getUser(ana.uid);
    expect(user.customClaims?.['tenantId']).toBe(tenantId);
    expect(user.customClaims?.['role']).toBe('tenant_owner');
  });

  it('⛔ a recusa da conta de plataforma vale contra o banco real, e não escreve nada', async () => {
    const admin1 = await participanteLogada('t6');
    const erro = await promoverParaProfissionalCore(
      db,
      { ...admin1, role: 'platform_admin' },
      { aceiteTermo: true }
    ).catch((e: { code?: string; details?: { motivo?: string } }) => e);

    expect((erro as { details?: { motivo?: string } }).details?.motivo).toBe('conta_de_plataforma');
    const doc = await db.collection('profissionais').doc(admin1.uid).get();
    expect(doc.exists).toBe(false);
  });

  it('⛔ aceite ausente e aceite datado pelo cliente não escrevem nada', async () => {
    const ana = await participanteLogada('t7');

    const semAceite = await promoverParaProfissionalCore(db, ana, {}).catch(
      (e: { details?: { motivo?: string } }) => e
    );
    expect((semAceite as { details?: { motivo?: string } }).details?.motivo).toBe('aceite_ausente');

    const datado = await promoverParaProfissionalCore(db, ana, {
      aceiteTermo: true,
      aceitoEm: new Date().toISOString(),
    }).catch((e: { details?: { motivo?: string } }) => e);
    expect((datado as { details?: { motivo?: string } }).details?.motivo).toBe(
      'aceite_datado_pelo_cliente'
    );

    expect((await db.collection('profissionais').doc(ana.uid).get()).exists).toBe(false);
  });
});
