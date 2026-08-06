/**
 * assessoriaParceira.integration.test.ts — LEELA-O3-L3B (E18 · S1800/S1801/
 * S1803 backend)
 *
 * Integração REAL no Emulator (Firestore 8080 + Auth 9099): cadastro/vínculo
 * de assessoria parceira, provisionamento no aceite e encerramento.
 *
 * Cobre (RN-360..365 + gate do maestro):
 *   - vínculo imediato (conta existe): clube parceiro + parceria 'ativa';
 *   - sem conta: parceria 'convite_pendente' + convite E05 (origem/
 *     parceriaRef/tokenAceiteHash/expiraEm) — token NUNCA persiste em claro;
 *   - dedupe POR CHAVE (RN-361): mesmo documento não duplica clube/parceria;
 *     reenvio re-emite token no MESMO convite;
 *   - documento com DV inválido barrado no servidor;
 *   - ATAQUES: promoter não cadastra; tenant suspenso não cadastra; troca de
 *     e-mail do responsável em parceria pendente é barrada;
 *   - Rules: escrita de cliente NEGADA na subcoleção parceirosAssessoria
 *     (até tenant_owner); leitura cross-tenant NEGADA; promoter NÃO lê
 *     (PII de documento); owner do tenant lê;
 *   - ACEITE (S1801-T3): conta + ownership + parceria 'ativa' atômico;
 *     IDEMPOTENTE (reexecutar não cria 2ª conta nem 2º clube); token errado
 *     é permission-denied OPACO; convite expirado → failed-precondition;
 *     conta pré-existente é VINCULADA sem troca de credencial; revogação
 *     concorrente vence o aceite (não ressuscita);
 *   - ENCERRAR (S1803): ativa→inativa com carimbos; replay idempotente;
 *     pendente→inativa cancela o convite e mata o aceite.
 *
 * Skip real (describe.skipIf) sem FIRESTORE_EMULATOR_HOST — padrão C1.
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
import * as admin from 'firebase-admin';
import { doc as clientDoc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import type { AuthClaims } from '@leela/core';
import {
  cadastrarAssessoriaCore,
  hashTokenAceite,
  ORIGEM_CONVITE_ASSESSORIA,
} from '../assessorias/cadastrarAssessoria';
import { provisionAssessoriaCore } from '../assessorias/provisionAssessoria';
import { encerrarParceriaCore } from '../assessorias/encerrarParceria';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const CASTELO_ID = 'castelo-producoes';
const OUTRO_ID = 'outro-tenant';
const MARINA_UID = 'uid-marina-castelo';
const AGORA = new Date('2026-07-17T12:00:00Z');

// CNPJ/CPF VÁLIDOS (DV correto)
const CNPJ_OK = '11.222.333/0001-81';
const CNPJ_KEY = '11222333000181';
const CPF_OK = '111.444.777-35';
const CPF_KEY = '11144477735';

const marina = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
};
const promoterCastelo = {
  uid: 'uid-promoter',
  claims: { role: 'promoter', tenantId: CASTELO_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

describe.skipIf(!hasEmulator)('assessorias parceiras — E18 backend (O3-L3B)', () => {
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
    // Ramo convite exige sandbox explícito (fix review #1 — em produção o
    // token não pode voltar ao organizador; gate fail-closed).
    process.env['LEELA_CONVITE_EXPOR_TOKEN'] = 'true';
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    const users = await auth.listUsers(1000);
    await Promise.all(users.users.map((u) => auth.deleteUser(u.uid)));
    await seedTenants();
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  async function seedTenants(): Promise<void> {
    const now = Timestamp.fromDate(AGORA);
    const batch = db.batch();
    batch.set(db.collection('tenants').doc(CASTELO_ID), {
      id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
      status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.collection('tenants').doc(OUTRO_ID), {
      id: OUTRO_ID, nome: 'Outro Tenant', slug: OUTRO_ID,
      status: 'ativo', ownerUid: 'uid-outro', tipo: 'produtor',
      criadoEm: now, atualizadoEm: now,
    });
    await batch.commit();
  }

  const inputBase = () => ({
    nome: 'Assessoria Correr Bem',
    documento: CNPJ_OK,
    responsavelEmail: 'Rodrigo@correrbem.dev',
  });

  const parceriaRef = (id: string = CNPJ_KEY) =>
    db.doc(`tenants/${CASTELO_ID}/parceirosAssessoria/${id}`);

  // ── S1800 · cadastro/vínculo ────────────────────────────────────────────

  it('vínculo IMEDIATO (conta existe): clube parceiro + parceria ativa, sem convite (RN-362)', async () => {
    const user = await auth.createUser({ email: 'rodrigo@correrbem.dev' });

    const r = await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);
    expect(r).toMatchObject({
      parceriaId: CNPJ_KEY,
      status: 'ativa',
      vinculoImediato: true,
      jaExistia: false,
    });
    expect(r.tokenAceite).toBeUndefined();

    const p = await parceriaRef().get();
    expect(p.get('status')).toBe('ativa');
    expect(p.get('responsavelUid')).toBe(user.uid);
    expect(p.get('responsavelEmail')).toBe('rodrigo@correrbem.dev');
    expect(p.get('documento')).toEqual({ tipo: 'cnpj', valor: CNPJ_KEY });

    const clube = await db.doc(`clubes/${r.clubeId}`).get();
    expect(clube.get('ehAssessoriaParceira')).toBe(true);
    expect(clube.get('parceiroDeTenant')).toBe(CASTELO_ID);
    expect(clube.get('tenantId')).toBe(CASTELO_ID);
    expect(clube.get('ownerId')).toBe(user.uid);
    expect(clube.get('categoria')).toBe('Assessoria esportiva');
    // PII (fix review #2): o clube (legível por membro/publicável) carrega
    // SÓ o documento MASCARADO; o completo vive na parceria writer-only.
    expect(clube.get('documento')).toBeUndefined();
    expect(clube.get('documentoMascarado')).toBe('***0181');

    // Sem convite no ramo imediato
    const convites = await db
      .collection(`clubes/${r.clubeId}/convites`).get();
    expect(convites.size).toBe(0);
  });

  it('SEM conta: parceria pendente + convite E05 com origem/parceriaRef/hash — token nunca em claro', async () => {
    const r = await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);
    expect(r.status).toBe('convite_pendente');
    expect(r.vinculoImediato).toBe(false);
    expect(r.tokenAceite).toBeTruthy();

    const conviteSnap = await db
      .doc(`clubes/${r.clubeId}/convites/rodrigo@correrbem.dev`).get();
    expect(conviteSnap.exists).toBe(true);
    expect(conviteSnap.get('origem')).toBe(ORIGEM_CONVITE_ASSESSORIA);
    expect(conviteSnap.get('parceriaRef')).toBe(parceriaRef().path);
    expect(conviteSnap.get('status')).toBe('pendente');
    // Só o HASH persiste (Schneier)
    expect(conviteSnap.get('tokenAceiteHash')).toBe(
      hashTokenAceite(r.tokenAceite as string)
    );
    expect(conviteSnap.get('tokenAceiteHash')).not.toBe(r.tokenAceite);
    expect(conviteSnap.get('expiraEm')).toBeTruthy();

    // Clube com ownership PROVISÓRIA do organizador até o aceite
    const clube = await db.doc(`clubes/${r.clubeId}`).get();
    expect(clube.get('ownerId')).toBe(MARINA_UID);
  });

  it('DEDUPE por documento (RN-361): recadastro de parceria ATIVA avisa e não duplica', async () => {
    await auth.createUser({ email: 'rodrigo@correrbem.dev' });
    const r1 = await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);
    const r2 = await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);

    expect(r2.jaExistia).toBe(true);
    expect(r2.clubeId).toBe(r1.clubeId);
    const clubes = await db.collection('clubes').get();
    expect(clubes.size).toBe(1);
    const parcerias = await db
      .collection(`tenants/${CASTELO_ID}/parceirosAssessoria`).get();
    expect(parcerias.size).toBe(1);
  });

  it('REENVIO (pendente): re-emite token no MESMO convite, nada duplica', async () => {
    const r1 = await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);
    const r2 = await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);

    expect(r2.jaExistia).toBe(true);
    expect(r2.tokenAceite).toBeTruthy();
    expect(r2.tokenAceite).not.toBe(r1.tokenAceite);

    const conviteSnap = await db
      .doc(`clubes/${r1.clubeId}/convites/rodrigo@correrbem.dev`).get();
    // hash é do token NOVO (o antigo morre)
    expect(conviteSnap.get('tokenAceiteHash')).toBe(
      hashTokenAceite(r2.tokenAceite as string)
    );
    expect((await db.collection('clubes').get()).size).toBe(1);
  });

  it('documento com DV inválido é barrado no SERVIDOR (RN-361)', async () => {
    await expect(
      cadastrarAssessoriaCore(
        db, auth,
        { ...inputBase(), documento: '11.222.333/0001-80' },
        marina, AGORA
      )
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    // CPF válido passa (11 dígitos)
    const r = await cadastrarAssessoriaCore(
      db, auth,
      { ...inputBase(), documento: CPF_OK },
      marina, AGORA
    );
    expect(r.parceriaId).toBe(CPF_KEY);
  });

  it('ATAQUES: promoter não cadastra; tenant suspenso não cadastra; troca de e-mail pendente barrada', async () => {
    await expect(
      cadastrarAssessoriaCore(db, auth, inputBase(), promoterCastelo, AGORA)
    ).rejects.toMatchObject({ code: 'permission-denied' });

    await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);
    await expect(
      cadastrarAssessoriaCore(
        db, auth,
        { ...inputBase(), responsavelEmail: 'outro@correrbem.dev' },
        marina, AGORA
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    await db.doc(`tenants/${CASTELO_ID}`).update({ status: 'suspenso' });
    await expect(
      cadastrarAssessoriaCore(
        db, auth,
        { ...inputBase(), documento: CPF_OK },
        marina, AGORA
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('GATE de produção (fix #1): sem sandbox, ramo convite é failed-precondition; vínculo imediato segue', async () => {
    delete process.env['LEELA_CONVITE_EXPOR_TOKEN'];
    try {
      // Sem conta → convite bloqueado (token não pode voltar ao organizador)
      await expect(
        cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA)
      ).rejects.toMatchObject({ code: 'failed-precondition' });
      expect((await db.collection('clubes').get()).size).toBe(0);

      // Com conta → vínculo imediato NÃO depende do gate
      await auth.createUser({ email: 'rodrigo@correrbem.dev' });
      const r = await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);
      expect(r.status).toBe('ativa');
    } finally {
      process.env['LEELA_CONVITE_EXPOR_TOKEN'] = 'true';
    }
  });

  it('conta criada DEPOIS do convite: recadastro VINCULA (ativa, sem novo token) — fix #1 corner', async () => {
    const r1 = await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);
    expect(r1.status).toBe('convite_pendente');

    const user = await auth.createUser({ email: 'rodrigo@correrbem.dev' });
    const r2 = await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);
    expect(r2).toMatchObject({
      status: 'ativa', vinculoImediato: true, jaExistia: true,
    });
    expect(r2.tokenAceite).toBeUndefined();

    const p = await parceriaRef().get();
    expect(p.get('responsavelUid')).toBe(user.uid);
    const clube = await db.doc(`clubes/${r1.clubeId}`).get();
    expect(clube.get('ownerId')).toBe(user.uid);
    const convite = await db
      .doc(`clubes/${r1.clubeId}/convites/rodrigo@correrbem.dev`).get();
    expect(convite.get('status')).toBe('cancelado');
  });

  it('Rules (fix #2/#5): cliente não planta nem adultera campos de assessoria no clube', async () => {
    const { clubeId } = await cadastrarPendente();
    const owner = testEnv
      .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
      .firestore();

    // Adulterar trust anchor do clube parceiro — NEGADO
    await assertFails(
      updateDoc(clientDoc(owner, `clubes/${clubeId}`), {
        documentoMascarado: '***9999',
      })
    );
    await assertFails(
      updateDoc(clientDoc(owner, `clubes/${clubeId}`), {
        ehAssessoriaParceira: false,
      })
    );
    // Plantar clube "parceiro" forjado pelo cliente — NEGADO
    await assertFails(
      setDoc(clientDoc(owner, 'clubes/forjado-parceiro'), {
        id: 'forjado-parceiro', tenantId: CASTELO_ID, nome: 'Forjado',
        descricao: '', slug: 'forjado-parceiro', categoria: 'Assessoria esportiva',
        modalidade: 'Corrida de rua',
        localizacao: { cidade: '', estado: '', online: true },
        ownerId: MARINA_UID, codigoConvite: 'AB2C3', visibilidade: 'privada',
        aprovacaoManual: false, modeloEntrada: 'gratuito',
        ehAssessoriaParceira: true, parceiroDeTenant: CASTELO_ID,
      })
    );
  });

  // ── Rules: parceirosAssessoria (PII — regra própria) ────────────────────

  it('Rules: escrita de cliente NEGADA (até owner); leitura writer-only e tenant-scoped', async () => {
    await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);
    const path = `tenants/${CASTELO_ID}/parceirosAssessoria/${CNPJ_KEY}`;

    const owner = testEnv
      .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
      .firestore();
    const promoter = testEnv
      .authenticatedContext('uid-promoter', { role: 'promoter', tenantId: CASTELO_ID })
      .firestore();
    const outro = testEnv
      .authenticatedContext('uid-outro', { role: 'tenant_owner', tenantId: OUTRO_ID })
      .firestore();

    // Owner LÊ o próprio tenant
    await assertSucceeds(getDoc(clientDoc(owner, path)));
    // Promoter NÃO lê (PII de documento — minimização)
    await assertFails(getDoc(clientDoc(promoter, path)));
    // Cross-tenant NÃO lê
    await assertFails(getDoc(clientDoc(outro, path)));
    // Escrita de cliente NEGADA — inclusive forjar status 'ativa'
    await assertFails(updateDoc(clientDoc(owner, path), { status: 'ativa' }));
    await assertFails(
      setDoc(clientDoc(owner, `tenants/${CASTELO_ID}/parceirosAssessoria/99988877700`), {
        tenantId: CASTELO_ID, status: 'ativa', nome: 'Forjada',
      })
    );
  });

  // ── S1801-T3 · aceite/provisionamento ───────────────────────────────────

  async function cadastrarPendente() {
    const r = await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);
    return { ...r, token: r.tokenAceite as string };
  }

  const aceite = (token: string, extra: Record<string, unknown> = {}) =>
    provisionAssessoriaCore(
      db, auth,
      {
        tenantId: CASTELO_ID,
        parceriaId: CNPJ_KEY,
        token,
        senha: 'senha-forte-8!',
        nome: 'Rodrigo Silva',
        ...extra,
      },
      AGORA
    );

  it('ACEITE feliz: conta criada + ownership do clube + parceria ativa + convite aceito (RN-363)', async () => {
    const { clubeId, token } = await cadastrarPendente();

    const r = await aceite(token);
    expect(r).toMatchObject({ ok: true, clubeId, replay: false });

    const user = await auth.getUserByEmail('rodrigo@correrbem.dev');
    const p = await parceriaRef().get();
    expect(p.get('status')).toBe('ativa');
    expect(p.get('responsavelUid')).toBe(user.uid);
    expect(p.get('aceitoEm')).toBeTruthy();

    const clube = await db.doc(`clubes/${clubeId}`).get();
    expect(clube.get('ownerId')).toBe(user.uid);

    const convite = await db
      .doc(`clubes/${clubeId}/convites/rodrigo@correrbem.dev`).get();
    expect(convite.get('status')).toBe('aceito');
  });

  it('ACEITE idempotente: reexecutar não cria 2ª conta nem 2º clube (aceite do épico)', async () => {
    const { token } = await cadastrarPendente();
    await aceite(token);
    const r2 = await aceite(token);
    expect(r2.replay).toBe(true);

    expect((await auth.listUsers(1000)).users.length).toBe(1);
    expect((await db.collection('clubes').get()).size).toBe(1);
    expect(
      (await db.collection(`tenants/${CASTELO_ID}/parceirosAssessoria`).get()).size
    ).toBe(1);
  });

  it('token ERRADO é permission-denied OPACO e nada muda', async () => {
    await cadastrarPendente();
    await expect(aceite('a'.repeat(64))).rejects.toMatchObject({
      code: 'permission-denied',
    });
    // Parceria inexistente = MESMO erro (não vaza existência de documento)
    await expect(
      provisionAssessoriaCore(
        db, auth,
        { tenantId: CASTELO_ID, parceriaId: '00000000000000', token: 'x' },
        AGORA
      )
    ).rejects.toMatchObject({ code: 'permission-denied' });

    const p = await parceriaRef().get();
    expect(p.get('status')).toBe('convite_pendente');
    expect((await auth.listUsers(1000)).users.length).toBe(0);
  });

  it('convite EXPIRADO → failed-precondition com caminho de reenvio', async () => {
    const { clubeId, token } = await cadastrarPendente();
    await db.doc(`clubes/${clubeId}/convites/rodrigo@correrbem.dev`).update({
      expiraEm: Timestamp.fromDate(new Date(AGORA.getTime() - 1000)),
    });
    await expect(aceite(token)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: expect.stringContaining('convite_expirado'),
    });
  });

  it('senha curta em conta NOVA → invalid-argument (mínimo 8)', async () => {
    const { token } = await cadastrarPendente();
    await expect(aceite(token, { senha: '1234567' })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('conta PRÉ-EXISTENTE é vinculada sem criar outra (e sem tocar credencial)', async () => {
    const { clubeId, token } = await cadastrarPendente();
    // Conta nasce entre o cadastro e o aceite (fluxo independente)
    const user = await auth.createUser({
      email: 'rodrigo@correrbem.dev',
      password: 'senha-original-x',
    });

    const r = await aceite(token, { senha: 'outra-senha-999!' });
    expect(r.replay).toBe(false);

    expect((await auth.listUsers(1000)).users.length).toBe(1);
    const p = await parceriaRef().get();
    expect(p.get('responsavelUid')).toBe(user.uid);
    const clube = await db.doc(`clubes/${clubeId}`).get();
    expect(clube.get('ownerId')).toBe(user.uid);
  });

  it('REVOGAÇÃO × aceite (corrida): parceria encerrada não ressuscita', async () => {
    const { token } = await cadastrarPendente();
    await encerrarParceriaCore(db, { parceriaId: CNPJ_KEY }, marina);

    await expect(aceite(token)).rejects.toMatchObject({
      code: 'failed-precondition',
    });
    const p = await parceriaRef().get();
    expect(p.get('status')).toBe('inativa');
    // Compensação: nenhuma conta órfã sobra do aceite frustrado
    expect((await auth.listUsers(1000)).users.length).toBe(0);
  });

  // ── S1803 · encerrar ────────────────────────────────────────────────────

  it('ENCERRAR ativa→inativa com carimbos; replay idempotente (RN-144)', async () => {
    await auth.createUser({ email: 'rodrigo@correrbem.dev' });
    await cadastrarAssessoriaCore(db, auth, inputBase(), marina, AGORA);

    const r1 = await encerrarParceriaCore(db, { parceriaId: CNPJ_KEY }, marina);
    expect(r1.statusAnterior).toBe('ativa');

    const p = await parceriaRef().get();
    expect(p.get('status')).toBe('inativa');
    expect(p.get('encerradaEm')).toBeTruthy();
    expect(p.get('encerradaPor')).toBe(MARINA_UID);

    const r2 = await encerrarParceriaCore(db, { parceriaId: CNPJ_KEY }, marina);
    expect(r2.statusAnterior).toBe('inativa'); // replay, sem re-carimbar

    // Doc RETIDO (RN-144) — encerrar nunca deleta
    expect(p.exists).toBe(true);
  });

  it('ENCERRAR pendente cancela o convite junto; cross-tenant é not-found', async () => {
    const { clubeId } = await cadastrarPendente();
    await encerrarParceriaCore(db, { parceriaId: CNPJ_KEY }, marina);

    const convite = await db
      .doc(`clubes/${clubeId}/convites/rodrigo@correrbem.dev`).get();
    expect(convite.get('status')).toBe('cancelado');

    // Caller de OUTRO tenant não enxerga a parceria (path-scoped)
    const outroCaller = {
      uid: 'uid-outro',
      claims: { role: 'tenant_owner', tenantId: OUTRO_ID } as AuthClaims,
    };
    await expect(
      encerrarParceriaCore(db, { parceriaId: CNPJ_KEY }, outroCaller)
    ).rejects.toMatchObject({ code: 'not-found' });
  });
});
