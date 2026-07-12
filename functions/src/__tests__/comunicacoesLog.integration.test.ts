/**
 * comunicacoesLog.integration.test.ts — LEELA-FABLE-G-T1
 *
 * Integração (Emulator): LOG DE COMUNICAÇÃO
 * `eventos/{eventoId}/comunicacoes` + agregado `comunicacoesResumo/current`.
 *
 * Cobre:
 *   - registrarComunicacao: cria `enfileirado` + IDEMPOTÊNCIA RN-219
 *     (reprocesso → ja_registrada, UM doc só, inalterado);
 *   - aplicarEventoProvedorNoLog: enviado→entregue→aberto; fora de ordem
 *     (entregue depois de aberto = só carimbo); reaplicação = sem_mudanca;
 *     falhou não sobrescreve aberto;
 *   - resumo ∑: recomputação full idempotente (re-run = mesmos números);
 *   - localizarPorProviderMessageId;
 *   - Rules (PII): leitura SÓ owner/staff/platform_admin — promoter,
 *     athlete-com-claim, cross-tenant e anônimo NEGADOS; escrita de cliente
 *     NEGADA (create/update/delete) até para o owner — ATAQUES de forja de
 *     status/abertura e de supressão de envio;
 *   - api-client: listarComunicacoesDoInscrito (só do inscrito, DESC) +
 *     getResumoComunicacoes.
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
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import {
  getResumoComunicacoes,
  listarComunicacoesDoInscrito,
} from '@leela/api-client';
import { logComunicacaoDocId, parseLogComunicacao } from '@leela/core';
import {
  aplicarEventoProvedorNoLog,
  jaComunicado,
  localizarPorProviderMessageId,
  registrarComunicacao,
} from '../eventos/logComunicacao';
import { recomputarResumoComunicacoes } from '../eventos/agregarComunicacoes';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';
const PLATFORM_ADMIN_UID = 'uid-platform-admin';

const MEIA_FLORIPA_ID = 'meia-floripa-2026';
const EVENTO_PASSO = 'trail-ratones-2026';

const INSC_A = 'insc-0001';
const INSC_B = 'insc-0002';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

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

afterAll(async () => {
  await testEnv?.cleanup();
});

function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

const marinaClaims = { role: 'tenant_owner', tenantId: CASTELO_ID };
const staffClaims = { role: 'tenant_staff', tenantId: CASTELO_ID };
const promoterClaims = { role: 'promoter', tenantId: CASTELO_ID };
const passoClaims = { role: 'tenant_owner', tenantId: PASSO_ID };

async function seedBase(): Promise<void> {
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
  });
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
    status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor',
  });
  batch.set(adminDb.collection('eventos').doc(MEIA_FLORIPA_ID), {
    id: MEIA_FLORIPA_ID, tenantId: CASTELO_ID,
    organizadorId: MARINA_UID, nome: 'Meia Maratona Floripa 2026',
    status: 'publicado',
  });
  batch.set(adminDb.collection('eventos').doc(EVENTO_PASSO), {
    id: EVENTO_PASSO, tenantId: PASSO_ID,
    organizadorId: PASSO_OWNER_UID, nome: 'Trail Run Ratones 2026',
    status: 'publicado',
  });
  await batch.commit();
}

function paramsIngresso(inscritoId: string) {
  return {
    destinatario: { tipo: 'inscrito' as const, ref: inscritoId },
    canal: 'email' as const,
    tipo: 'ingresso' as const,
    assunto: 'Seu ingresso — Meia Maratona Floripa 2026',
    templateRef: 'email-ingresso-v1',
  };
}

function logRefAdmin(eventoId: string, comunicacaoId: string) {
  return adminDb
    .collection('eventos').doc(eventoId)
    .collection('comunicacoes').doc(comunicacaoId);
}

// ─────────────────────────────────────────────────────────────────────────
// registrarComunicacao — markSent idempotente (RN-219)
// ─────────────────────────────────────────────────────────────────────────
describe('registrarComunicacao (RN-219 — idempotência por docId)', () => {
  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedBase();
  });

  it('cria o log `enfileirado` com tenantId do EVENTO PAI e shape canônico', async () => {
    const res = await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, paramsIngresso(INSC_A));
    expect(res).toEqual({
      registrada: true,
      motivo: 'ok',
      comunicacaoId: `${INSC_A}_ingresso_email`,
    });

    const snap = await logRefAdmin(MEIA_FLORIPA_ID, res.comunicacaoId).get();
    expect(snap.exists).toBe(true);
    const log = parseLogComunicacao(snap.id, snap.data() as Record<string, unknown>);
    expect(log.tenantId).toBe(CASTELO_ID); // do pai, não do chamador
    expect(log.eventoId).toBe(MEIA_FLORIPA_ID);
    expect(log.status).toBe('enfileirado');
    expect(log.chave).toBe('ingresso');
    expect(log.templateRef).toBe('email-ingresso-v1');
  });

  it('REPROCESSO do webhook → ja_registrada, UM doc só, inalterado (RN-219)', async () => {
    const t0 = new Date('2026-07-12T10:00:00Z');
    const primeira = await registrarComunicacao(
      adminDb, MEIA_FLORIPA_ID, paramsIngresso(INSC_A), t0
    );
    expect(primeira.registrada).toBe(true);

    const antes = await logRefAdmin(MEIA_FLORIPA_ID, primeira.comunicacaoId).get();

    // Reprocesso: mesmo inscrito/tipo/canal → MESMO docId → colide
    const segunda = await registrarComunicacao(
      adminDb, MEIA_FLORIPA_ID, paramsIngresso(INSC_A), new Date('2026-07-12T11:00:00Z')
    );
    expect(segunda).toEqual({
      registrada: false,
      motivo: 'ja_registrada',
      comunicacaoId: primeira.comunicacaoId,
    });

    const depois = await logRefAdmin(MEIA_FLORIPA_ID, primeira.comunicacaoId).get();
    expect(depois.data()).toEqual(antes.data()); // doc INALTERADO

    const todos = await adminDb
      .collection('eventos').doc(MEIA_FLORIPA_ID)
      .collection('comunicacoes').get();
    expect(todos.size).toBe(1); // um doc só
  });

  it('destinatários/canais distintos NÃO colidem; jaComunicado responde', async () => {
    await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, paramsIngresso(INSC_A));
    await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, {
      ...paramsIngresso(INSC_A),
      canal: 'push' as const,
      assunto: 'Ingresso disponível',
    });
    await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, paramsIngresso(INSC_B));

    const todos = await adminDb
      .collection('eventos').doc(MEIA_FLORIPA_ID)
      .collection('comunicacoes').get();
    expect(todos.size).toBe(3);

    expect(await jaComunicado(adminDb, MEIA_FLORIPA_ID, INSC_A, 'ingresso', 'email')).toBe(true);
    expect(await jaComunicado(adminDb, MEIA_FLORIPA_ID, INSC_B, 'ingresso', 'push')).toBe(false);
  });

  it('evento inexistente → evento_inexistente, nada gravado', async () => {
    const res = await registrarComunicacao(adminDb, 'evento-fantasma', paramsIngresso(INSC_A));
    expect(res.registrada).toBe(false);
    expect(res.motivo).toBe('evento_inexistente');
    const snap = await logRefAdmin('evento-fantasma', res.comunicacaoId).get();
    expect(snap.exists).toBe(false);
  });

  it('campanha: chave = campanhaRef; campanhas distintas geram docs distintos', async () => {
    const base = {
      destinatario: { tipo: 'inscrito' as const, ref: INSC_A },
      canal: 'push' as const,
      tipo: 'campanha' as const,
      assunto: 'Kit pronto para retirada',
    };
    const r1 = await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, {
      ...base, chaveRef: 'camp-kit-pronto',
    });
    const r2 = await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, {
      ...base, chaveRef: 'camp-boas-vindas', assunto: 'Boas-vindas',
    });
    expect(r1.registrada).toBe(true);
    expect(r2.registrada).toBe(true);
    expect(r1.comunicacaoId).not.toBe(r2.comunicacaoId);

    const snap = await logRefAdmin(MEIA_FLORIPA_ID, r1.comunicacaoId).get();
    expect(snap.get('campanhaRef')).toBe('camp-kit-pronto');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// aplicarEventoProvedorNoLog — webhooks at-least-once, fora de ordem
// ─────────────────────────────────────────────────────────────────────────
describe('aplicarEventoProvedorNoLog (merge monotônico)', () => {
  let comunicacaoId: string;

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedBase();
    const res = await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, paramsIngresso(INSC_A));
    comunicacaoId = res.comunicacaoId;
  });

  const em = (iso: string) =>
    admin.firestore.Timestamp.fromDate(new Date(iso));

  it('enviado → entregue → aberto com carimbos e providerMessageId', async () => {
    const r1 = await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, comunicacaoId, {
      tipo: 'enviado', em: em('2026-07-12T10:01:00Z'), providerMessageId: 'pm-abc',
    });
    expect(r1).toEqual({ atualizada: true, motivo: 'ok' });

    const r2 = await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, comunicacaoId, {
      tipo: 'entregue', em: em('2026-07-12T10:02:00Z'),
    });
    expect(r2.atualizada).toBe(true);

    const r3 = await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, comunicacaoId, {
      tipo: 'aberto', em: em('2026-07-12T10:30:00Z'),
    });
    expect(r3.atualizada).toBe(true);

    const snap = await logRefAdmin(MEIA_FLORIPA_ID, comunicacaoId).get();
    const log = parseLogComunicacao(snap.id, snap.data() as Record<string, unknown>);
    expect(log.status).toBe('aberto');
    expect(log.providerMessageId).toBe('pm-abc');
    expect(log.enviadoEm).toBeDefined();
    expect(log.entregueEm).toBeDefined();
    expect(log.abertoEm).toBeDefined();
  });

  it('REAPLICAR o mesmo webhook → sem_mudanca (idempotente, carimbo não move)', async () => {
    await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, comunicacaoId, {
      tipo: 'enviado', em: em('2026-07-12T10:01:00Z'), providerMessageId: 'pm-abc',
    });
    const antes = (await logRefAdmin(MEIA_FLORIPA_ID, comunicacaoId).get()).data();

    const replay = await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, comunicacaoId, {
      tipo: 'enviado', em: em('2026-07-12T12:00:00Z'), providerMessageId: 'pm-abc',
    });
    expect(replay).toEqual({ atualizada: false, motivo: 'sem_mudanca' });

    const depois = (await logRefAdmin(MEIA_FLORIPA_ID, comunicacaoId).get()).data();
    expect(depois).toEqual(antes);
  });

  it('FORA DE ORDEM: aberto antes de entregue; entregue depois só carimba', async () => {
    await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, comunicacaoId, {
      tipo: 'aberto', em: em('2026-07-12T10:30:00Z'),
    });
    let log = parseLogComunicacao(
      comunicacaoId,
      (await logRefAdmin(MEIA_FLORIPA_ID, comunicacaoId).get()).data() as Record<string, unknown>
    );
    expect(log.status).toBe('aberto');
    expect(log.enviadoEm).toBeDefined(); // backfill do invariante

    const tardio = await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, comunicacaoId, {
      tipo: 'entregue', em: em('2026-07-12T10:05:00Z'),
    });
    expect(tardio.atualizada).toBe(true); // carimbo entra…
    log = parseLogComunicacao(
      comunicacaoId,
      (await logRefAdmin(MEIA_FLORIPA_ID, comunicacaoId).get()).data() as Record<string, unknown>
    );
    expect(log.status).toBe('aberto'); // …sem regredir o status
    expect(log.entregueEm).toBeDefined();
  });

  it('falhou NÃO sobrescreve aberto (não retro-falha)', async () => {
    await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, comunicacaoId, {
      tipo: 'aberto', em: em('2026-07-12T10:30:00Z'),
    });
    const res = await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, comunicacaoId, {
      tipo: 'falhou', em: em('2026-07-12T10:31:00Z'), falhaMotivo: 'bounce',
    });
    expect(res).toEqual({ atualizada: false, motivo: 'sem_mudanca' });
  });

  it('log inexistente → nao_encontrada', async () => {
    const res = await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, 'nao-existe', {
      tipo: 'enviado', em: em('2026-07-12T10:00:00Z'),
    });
    expect(res).toEqual({ atualizada: false, motivo: 'nao_encontrada' });
  });

  it('localizarPorProviderMessageId acha o doc (correlação de webhook)', async () => {
    await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, comunicacaoId, {
      tipo: 'enviado', em: em('2026-07-12T10:01:00Z'), providerMessageId: 'pm-xyz',
    });
    expect(
      await localizarPorProviderMessageId(adminDb, MEIA_FLORIPA_ID, 'pm-xyz')
    ).toBe(comunicacaoId);
    expect(
      await localizarPorProviderMessageId(adminDb, MEIA_FLORIPA_ID, 'pm-outra')
    ).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Resumo ∑ — recomputação full idempotente (padrão agregarFinanceiro)
// ─────────────────────────────────────────────────────────────────────────
describe('recomputarResumoComunicacoes (∑ idempotente)', () => {
  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedBase();
  });

  it('conta por status/canal/tipo a partir da fonte', async () => {
    // 2 ingressos email (A aberto, B enfileirado) + 1 campanha push (falhou)
    const a = await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, paramsIngresso(INSC_A));
    await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, paramsIngresso(INSC_B));
    const c = await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, {
      destinatario: { tipo: 'inscrito' as const, ref: INSC_A },
      canal: 'push' as const,
      tipo: 'campanha' as const,
      chaveRef: 'camp-kit-pronto',
      assunto: 'Kit pronto para retirada',
    });
    const em = admin.firestore.Timestamp.fromDate(new Date('2026-07-12T10:30:00Z'));
    await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, a.comunicacaoId, {
      tipo: 'aberto', em,
    });
    await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, c.comunicacaoId, {
      tipo: 'falhou', em, falhaMotivo: 'push_token_invalido',
    });

    const resumo = await recomputarResumoComunicacoes(adminDb, MEIA_FLORIPA_ID);
    expect(resumo).not.toBeNull();
    expect(resumo?.tenantId).toBe(CASTELO_ID);
    expect(resumo?.total).toBe(3);
    expect(resumo?.porStatus).toEqual({
      enfileirado: 1, enviado: 0, entregue: 0, aberto: 1, falhou: 1,
    });
    expect(resumo?.porCanal).toEqual({ push: 1, email: 2 });
    expect(resumo?.porTipo).toEqual({ ingresso: 2, campanha: 1, transacional: 0 });
  });

  it('REPROCESSAR N vezes produz o MESMO doc (nada acumula)', async () => {
    await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, paramsIngresso(INSC_A));

    const r1 = await recomputarResumoComunicacoes(adminDb, MEIA_FLORIPA_ID);
    const r2 = await recomputarResumoComunicacoes(adminDb, MEIA_FLORIPA_ID);
    const r3 = await recomputarResumoComunicacoes(adminDb, MEIA_FLORIPA_ID);
    expect(r2).toEqual(r1);
    expect(r3).toEqual(r1);
    expect(r1?.total).toBe(1);

    const doc = await adminDb
      .collection('eventos').doc(MEIA_FLORIPA_ID)
      .collection('comunicacoesResumo').doc('current').get();
    expect(doc.get('total')).toBe(1);
  });

  it('evento inexistente → null (nada a manter)', async () => {
    expect(await recomputarResumoComunicacoes(adminDb, 'evento-fantasma')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Rules — PII: leitura de GESTÃO; escrita de cliente NUNCA
// ─────────────────────────────────────────────────────────────────────────
describe('rules do log de comunicação (PII — FABLE-G)', () => {
  let comunicacaoId: string;

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedBase();
    const res = await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, paramsIngresso(INSC_A));
    comunicacaoId = res.comunicacaoId;
    await recomputarResumoComunicacoes(adminDb, MEIA_FLORIPA_ID);
    // log no evento do OUTRO tenant (prova de isolamento nos dois sentidos)
    await registrarComunicacao(adminDb, EVENTO_PASSO, paramsIngresso('insc-passo-1'));
  });

  function refLog(db: Firestore, eventoId: string, id: string) {
    return doc(db, 'eventos', eventoId, 'comunicacoes', id);
  }

  // ── Leitura ─────────────────────────────────────────────────────────────

  it('owner LÊ o log do próprio evento (gestão)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(getDoc(refLog(db, MEIA_FLORIPA_ID, comunicacaoId)));
  });

  it('staff LÊ (writer do tenant)', async () => {
    const db = dbAs('uid-staff-castelo', staffClaims);
    await assertSucceeds(getDoc(refLog(db, MEIA_FLORIPA_ID, comunicacaoId)));
  });

  it('promoter NÃO lê — PII fora do papel (taxonomia de inscritos/pedidos)', async () => {
    const db = dbAs('uid-promoter-castelo', promoterClaims);
    await assertFails(getDoc(refLog(db, MEIA_FLORIPA_ID, comunicacaoId)));
  });

  it('athlete COM claim do tenant NÃO lê (nem o log da PRÓPRIA inscrição nesta fase)', async () => {
    const db = dbAs(INSC_A, { role: 'athlete', tenantId: CASTELO_ID });
    await assertFails(getDoc(refLog(db, MEIA_FLORIPA_ID, comunicacaoId)));
  });

  it('owner de OUTRO tenant NÃO lê (cross-tenant deny, dois sentidos)', async () => {
    const passoDb = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(getDoc(refLog(passoDb, MEIA_FLORIPA_ID, comunicacaoId)));
    await assertFails(
      getDocs(collection(passoDb, 'eventos', MEIA_FLORIPA_ID, 'comunicacoes'))
    );
    const marinaDb = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      getDoc(refLog(marinaDb, EVENTO_PASSO, 'insc-passo-1_ingresso_email'))
    );
  });

  it('anônimo NÃO lê', async () => {
    const db = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
    await assertFails(getDoc(refLog(db, MEIA_FLORIPA_ID, comunicacaoId)));
  });

  it('platform_admin LÊ cross-tenant (supervisão)', async () => {
    const db = dbAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(getDoc(refLog(db, MEIA_FLORIPA_ID, comunicacaoId)));
    await assertSucceeds(
      getDoc(refLog(db, EVENTO_PASSO, 'insc-passo-1_ingresso_email'))
    );
  });

  // ── Escrita: NUNCA pelo cliente (write false) ───────────────────────────

  it('ATAQUE: owner NÃO CRIA log (fabricar comunicação/suprimir envio devido)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(refLog(db, MEIA_FLORIPA_ID, logComunicacaoDocId(INSC_B, 'ingresso', 'email')), {
        tenantId: CASTELO_ID,
        eventoId: MEIA_FLORIPA_ID,
        destinatario: { tipo: 'inscrito', ref: INSC_B },
        canal: 'email', tipo: 'ingresso', chave: 'ingresso',
        status: 'enfileirado',
        assunto: 'forjado',
        enfileiradoEm: new Date(),
      })
    );
  });

  it('ATAQUE: owner NÃO forja status "aberto" (abertura que não houve)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      updateDoc(refLog(db, MEIA_FLORIPA_ID, comunicacaoId), {
        status: 'aberto', abertoEm: new Date(), enviadoEm: new Date(),
      })
    );
  });

  it('ATAQUE: owner NÃO DELETA log (apagar trilha de comunicação)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(deleteDoc(refLog(db, MEIA_FLORIPA_ID, comunicacaoId)));
  });

  it('ATAQUE: promoter e athlete NÃO escrevem (nem create nem update)', async () => {
    const promoterDb = dbAs('uid-promoter-castelo', promoterClaims);
    await assertFails(
      updateDoc(refLog(promoterDb, MEIA_FLORIPA_ID, comunicacaoId), { status: 'falhou' })
    );
    const athleteDb = dbAs(INSC_A, { role: 'athlete', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(refLog(athleteDb, MEIA_FLORIPA_ID, 'forjado_ingresso_email'), {
        tenantId: CASTELO_ID, status: 'enfileirado',
      })
    );
  });

  // ── Resumo ∑ ────────────────────────────────────────────────────────────

  it('resumo: owner LÊ; promoter NÃO; cliente NÃO escreve', async () => {
    const ownerDb = dbAs(MARINA_UID, marinaClaims);
    const resumoRef = (db: Firestore) =>
      doc(db, 'eventos', MEIA_FLORIPA_ID, 'comunicacoesResumo', 'current');

    await assertSucceeds(getDoc(resumoRef(ownerDb)));

    const promoterDb = dbAs('uid-promoter-castelo', promoterClaims);
    await assertFails(getDoc(resumoRef(promoterDb)));

    await assertFails(
      updateDoc(resumoRef(ownerDb), { total: 999 }) // contagem forjada
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// api-client — as duas visões consultáveis do agregado único
// ─────────────────────────────────────────────────────────────────────────
describe('api-client: visão por inscrito + resumo por evento', () => {
  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedBase();

    // INSC_A: ingresso email (t0) + campanha push (t1, aberta)
    await registrarComunicacao(
      adminDb, MEIA_FLORIPA_ID, paramsIngresso(INSC_A),
      new Date('2026-07-12T10:00:00Z')
    );
    const camp = await registrarComunicacao(adminDb, MEIA_FLORIPA_ID, {
      destinatario: { tipo: 'inscrito' as const, ref: INSC_A },
      canal: 'push' as const,
      tipo: 'campanha' as const,
      chaveRef: 'camp-kit-pronto',
      assunto: 'Kit pronto para retirada',
    }, new Date('2026-07-12T11:00:00Z'));
    await aplicarEventoProvedorNoLog(adminDb, MEIA_FLORIPA_ID, camp.comunicacaoId, {
      tipo: 'aberto',
      em: admin.firestore.Timestamp.fromDate(new Date('2026-07-12T11:30:00Z')),
    });
    // INSC_B: só ingresso (não pode vazar na lista de A)
    await registrarComunicacao(
      adminDb, MEIA_FLORIPA_ID, paramsIngresso(INSC_B),
      new Date('2026-07-12T10:05:00Z')
    );
    await recomputarResumoComunicacoes(adminDb, MEIA_FLORIPA_ID);
  });

  it('listarComunicacoesDoInscrito: SÓ do inscrito, mais recente primeiro, com status real', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const logs = await listarComunicacoesDoInscrito(db, MEIA_FLORIPA_ID, INSC_A);

    expect(logs).toHaveLength(2);
    expect(logs.every((l) => l.destinatario.ref === INSC_A)).toBe(true);
    // DESC por enfileiradoEm: campanha (11:00) antes do ingresso (10:00)
    expect(logs[0]?.tipo).toBe('campanha');
    expect(logs[0]?.status).toBe('aberto');
    expect(logs[1]?.tipo).toBe('ingresso');
    expect(logs[1]?.status).toBe('enfileirado');
  });

  it('getResumoComunicacoes lê o ∑ do evento; evento sem resumo → null', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const resumo = await getResumoComunicacoes(db, MEIA_FLORIPA_ID);
    expect(resumo?.total).toBe(3);
    expect(resumo?.porTipo.campanha).toBe(1);

    const passoDb = dbAs(PASSO_OWNER_UID, passoClaims);
    expect(await getResumoComunicacoes(passoDb, EVENTO_PASSO)).toBeNull();
  });
});
