/**
 * afiliados.integration.test.ts — LEELA-R9E · S-R9-11 (RN-313..319)
 * (⚠️ EXIGE Firestore + Auth no Emulator — projectId demo-leela; porta via
 * LEELA_FS_EMU_PORT, lane R9-E = 8480/9598.)
 *
 * Integração REAL: salvarAfiliado (unicidade por chave + amarração de cupom)
 * · provisionAfiliadoAccount (aceite PF, token opaco, rate-limit R2) ·
 * atribuição no checkout (?ref → carimbo → conversão na confirmação,
 * idempotente) · gate de desconto RN-315 (mínimo de inscrições, sem
 * retroativo) · Rules (escrita negada; leitura RN-318/319; cupom.afiliadoRef
 * intocável).
 *
 * Comando (lane R9-E):
 *   npx firebase-tools@13 emulators:exec --only firestore,auth \
 *     --project demo-leela --config firebase.r6.json \
 *     "cd functions && LEELA_FS_EMU_PORT=8480 npx vitest run src/__tests__/afiliados.integration.test.ts"
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
import {
  doc as clientDoc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  AuthClaims,
  EmailProvider,
  SendTransactionalParams,
} from '@leela/core';
import { chaveAvisoMarco, logComunicacaoDocId } from '@leela/core';
import {
  clearFirestoreDrained,
  deleteAllUsersDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';
import { salvarAfiliadoCore } from '../affiliation/salvarAfiliado';
import {
  provisionAfiliadoComRateLimit,
  provisionAfiliadoCore,
} from '../affiliation/provisionAfiliado';
import {
  ACEITE_LIMITE_POR_ALVO,
} from '../assessorias/provisionAssessoria';
import {
  getAfiliadosDoTenantCore,
  getMinhasAfiliacoesCore,
} from '../affiliation/readers';
import { registrarRepasseComissaoCore } from '../affiliation/registrarRepasse';
import { chaveAvisoRepasse } from '../affiliation/avisoAfiliado';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { cotarInscricaoCheckoutCore } from '../checkout/cotarInscricaoCheckout';
import { estornarInscricaoCore } from '../checkout/estornarInscricao';
import { processarWebhookPagamento } from '../checkout/webhookPagamento';
import { MockPaymentProvider, buildMockWebhookPayload } from '../payments/mockProvider';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
// Porta da LANE: honra LEELA_FS_EMU_PORT e cai no host que o próprio
// `emulators:exec` injeta (FIRESTORE_EMULATOR_HOST) — a lane R9-E roda em
// 8480/9598 (firebase.r6.json); 8180/9198 é o preview do Vitor, intocável.
const FS_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8080
);

const CASTELO_ID = 'castelo-producoes';
const OUTRO_ID = 'outro-tenant';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'meia-afiliados';
const FACE = 200;
const DIA_MS = 24 * 60 * 60 * 1000;
const AGORA = new Date();
const tsRel = (d: number): Timestamp =>
  Timestamp.fromDate(new Date(AGORA.getTime() + d * DIA_MS));

const marina = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;
const provider = new MockPaymentProvider();

describe.skipIf(!hasEmulator)('afiliados/influenciadores — R9-E (S-R9-11)', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
        host: 'localhost',
        port: FS_PORT,
      },
    });
    if (!admin.apps.length) {
      process.env['FIRESTORE_EMULATOR_HOST'] = `localhost:${FS_PORT}`;
      admin.initializeApp({ projectId: PROJECT_ID });
    }
    db = admin.firestore();
    auth = admin.auth();
    delete process.env['ASAAS_API_KEY'];
    delete process.env['BREVO_API_KEY'];
    // Ramo convite PF sem EmailProvider exige o flag (padrão E18)
    process.env['LEELA_CONVITE_EXPOR_TOKEN'] = 'true';
  }, 30_000);

  // SUITE-STAB: clear+seed com triggers pausados + canários verificados —
  // o backlog de onInscritoWrite* de arquivos vizinhos engolia o seed
  // (full5: "Evento 'meia-afiliados' não existe neste tenant").
  const SEED_CANARIES = [
    `tenants/${CASTELO_ID}`,
    `tenants/${OUTRO_ID}`,
    `tenants/${CASTELO_ID}/commercialTerms/current`,
    `eventos/${EVENTO_ID}`,
    `eventos/${EVENTO_ID}/lotes/l1`,
    `eventos/${EVENTO_ID}/cupons/FLORIPA10OFF`,
    'clubes/floripa-run',
  ];

  beforeEach(async () => {
    await withTriggersPaused(async () => {
      await clearFirestoreDrained(testEnv);
      await deleteAllUsersDrained(auth);
      await seedVerified(db, testEnv, seed, SEED_CANARIES);
    });
  }, 30_000);

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  async function seed(): Promise<void> {
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    for (const [tid, owner] of [
      [CASTELO_ID, MARINA_UID],
      [OUTRO_ID, 'uid-outro'],
    ] as const) {
      batch.set(db.collection('tenants').doc(tid), {
        id: tid, nome: tid, slug: tid, status: 'ativo', ownerUid: owner,
        tipo: 'produtor', criadoEm: now, atualizadoEm: now,
      });
      batch.set(db.doc(`tenants/${tid}/commercialTerms/current`), {
        platformFeePct: 10,
        installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
        anticipation: { disponivel: false }, communityMonthlyEnabled: false,
        saasMonthlyFee: 0, versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
      });
    }
    const eventoRef = db.collection('eventos').doc(EVENTO_ID);
    batch.set(eventoRef, {
      id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: 'uid-org',
      nome: 'Meia dos Afiliados', data: tsRel(45), local: 'Floripa/SC',
      modalidades: ['10k'], slug: EVENTO_ID, status: 'publicado',
      usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(eventoRef.collection('lotes').doc('l1'), {
      id: 'l1', tenantId: CASTELO_ID, modalidade: '10k', ordem: 1,
      nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(30),
      quantidadeLimite: 100, preco: FACE, vendidos: 0,
      criadoEm: now, atualizadoEm: now,
    });
    // Clube p/ afiliado tipo clube (dono = uid-clube-owner)
    batch.set(db.collection('clubes').doc('floripa-run'), {
      id: 'floripa-run', tenantId: CASTELO_ID, nome: 'Floripa Run',
      descricao: '', slug: 'floripa-run', categoria: 'Assessoria',
      modalidade: 'Corrida', localizacao: { cidade: 'Floripa', estado: 'SC', online: false },
      ownerId: 'uid-clube-owner', codigoConvite: 'AB2C3',
      visibilidade: 'privada', aprovacaoManual: false, modeloEntrada: 'gratuito',
      qtdMembrosAtivos: 0, qtdDesafiosAtivos: 0, criadoEm: now, atualizadoEm: now,
    });
    // Cupom GERAL do evento (p/ amarração)
    batch.set(eventoRef.collection('cupons').doc('FLORIPA10OFF'), {
      id: 'FLORIPA10OFF', tenantId: CASTELO_ID, codigo: 'FLORIPA10OFF',
      tipo: 'percentual', valor: 10, tetoUso: null,
      inicioEm: tsRel(-1), fimEm: tsRel(30), usos: 0,
      criadoEm: now, atualizadoEm: now,
    });
    await batch.commit();
  }

  const chargeInput = (
    key: string,
    extra: Partial<CreateInscricaoChargeInput> = {}
  ): CreateInscricaoChargeInput => ({
    eventoId: EVENTO_ID,
    inscritos: [
      { nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25', modalidade: '10k' },
    ],
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
    ...extra,
  });

  const caller = { uid: 'uid-ana' };

  async function confirmarPedido(
    pedidoId: string,
    eventId: string,
    // S706-T1: provedor de e-mail INJETADO (zero rede real). Ausente = null,
    // que é o estado fail-closed de produção hoje (sem BREVO_API_KEY).
    emailProvider: EmailProvider | null = null
  ): Promise<void> {
    const pagamentoId = (
      await db.doc(`pedidos/${pedidoId}`).get()
    ).get('pagamentoRef') as string;
    const pagSnap = await db.doc(`pagamentos/${pagamentoId}`).get();
    const payload = buildMockWebhookPayload('charge.confirmed', {
      chargeId: pagSnap.get('gatewayChargeId') as string,
      orderId: pedidoId,
      amount: pagSnap.get('gatewayAmountCentavos') as number,
      eventId,
    });
    await processarWebhookPagamento(db, provider, payload, { emailProvider });
  }

  // ── A · salvarAfiliado ───────────────────────────────────────────────────

  it('A1: cria afiliado clube ATIVO (docId=refCodigo, ∑ zerados, responsavelUid=dono do clube) e upserta', async () => {
    const r = await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run',
      refCodigo: 'floripa10', clubeRef: 'floripa-run', minimoInscricoes: 2,
    }, marina);
    expect(r).toMatchObject({
      afiliadoId: 'FLORIPA10', refCodigo: 'FLORIPA10', status: 'ativo', jaExistia: false,
    });
    const doc = await db.doc(`eventos/${EVENTO_ID}/afiliados/FLORIPA10`).get();
    expect(doc.get('conversoes')).toBe(0);
    expect(doc.get('valorAtribuido')).toBe(0);
    expect(doc.get('minimoInscricoes')).toBe(2);
    expect(doc.get('responsavelUid')).toBe('uid-clube-owner');
    expect(doc.get('janelaAtribuicaoDias')).toBe(7);

    const r2 = await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run Coletivo',
      refCodigo: 'FLORIPA10', clubeRef: 'floripa-run', minimoInscricoes: null,
    }, marina);
    expect(r2.jaExistia).toBe(true);
    const doc2 = await db.doc(`eventos/${EVENTO_ID}/afiliados/FLORIPA10`).get();
    expect(doc2.get('nome')).toBe('Floripa Run Coletivo');
    expect(doc2.get('minimoInscricoes')).toBeNull();
  });

  it('A2: refCodigo colidindo com afiliado de OUTRO tipo → failed-precondition', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run', refCodigo: 'REF1234X',
    }, marina);
    await expect(
      salvarAfiliadoCore(db, {
        eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: 'Dioney',
        refCodigo: 'REF1234X', responsavelEmail: 'dioney@exemplo.com',
      }, marina)
    ).rejects.toThrow(/outro tipo/);
  });

  it('A3: PF sem conta → convite_pendente + token (flag emulator); doc guarda SÓ o hash; documento SÓ mascarado', async () => {
    const r = await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: 'Dioney Galharte',
      refCodigo: 'DIONEY10', responsavelEmail: 'Dioney@Exemplo.com',
      documento: '529.982.247-25',
    }, marina);
    expect(r.status).toBe('convite_pendente');
    expect(r.tokenAceite).toHaveLength(64);
    const doc = await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).get();
    expect(doc.get('responsavelEmail')).toBe('dioney@exemplo.com');
    expect(doc.get('tokenAceiteHash')).toHaveLength(64);
    expect(doc.get('tokenAceiteHash')).not.toBe(r.tokenAceite);
    expect(doc.get('documentoMascarado')).toBe('***4725');
    expect(JSON.stringify(doc.data())).not.toContain('52998224725');
  });

  it('A4: amarração de cupom — grava afiliadoRef na MESMA tx; escopado E18 recusa; cupom de OUTRO afiliado recusa; null desamarra', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run',
      refCodigo: 'FLORIPA10', cupomCodigo: 'floripa10off',
    }, marina);
    const cupom = await db.doc(`eventos/${EVENTO_ID}/cupons/FLORIPA10OFF`).get();
    expect(cupom.get('afiliadoRef')).toBe('FLORIPA10');

    // Cupom já amarrado não é sequestrável por outro afiliado
    await expect(
      salvarAfiliadoCore(db, {
        eventoId: EVENTO_ID, tipo: 'clube', nome: 'Outro Clube',
        refCodigo: 'OUTRO999', cupomCodigo: 'FLORIPA10OFF',
      }, marina)
    ).rejects.toThrow(/vinculado a outro afiliado/);

    // Cupom escopado (E18) nunca é amarrável
    await db.doc(`eventos/${EVENTO_ID}/cupons/PARCEIRO15`).set({
      id: 'PARCEIRO15', tenantId: CASTELO_ID, codigo: 'PARCEIRO15',
      tipo: 'percentual', valor: 15, tetoUso: null,
      inicioEm: tsRel(-1), fimEm: tsRel(30), usos: 0,
      escopo: 'club_parceiro', clubeRef: 'x', parceriaRef: `tenants/${CASTELO_ID}/parceirosAssessoria/x`,
      criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp(),
    });
    await expect(
      salvarAfiliadoCore(db, {
        eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run',
        refCodigo: 'FLORIPA10', cupomCodigo: 'PARCEIRO15',
      }, marina)
    ).rejects.toThrow(/escopado/);

    // null desamarra (limpa o cupom anterior)
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run',
      refCodigo: 'FLORIPA10', cupomCodigo: null,
    }, marina);
    const cupomDepois = await db.doc(`eventos/${EVENTO_ID}/cupons/FLORIPA10OFF`).get();
    expect(cupomDepois.get('afiliadoRef')).toBeUndefined();
  });

  it('A5: caller sem papel de escrita → permission-denied; evento de outro tenant → not-found', async () => {
    await expect(
      salvarAfiliadoCore(db, {
        eventoId: EVENTO_ID, tipo: 'clube', nome: 'X', refCodigo: 'AAAA1111',
      }, { uid: 'u', claims: { role: 'promoter', tenantId: CASTELO_ID } as AuthClaims })
    ).rejects.toThrow(/RN-401/);
    await expect(
      salvarAfiliadoCore(db, {
        eventoId: EVENTO_ID, tipo: 'clube', nome: 'X', refCodigo: 'AAAA1111',
      }, { uid: 'u', claims: { role: 'tenant_owner', tenantId: OUTRO_ID } as AuthClaims })
    ).rejects.toThrow(/não existe neste tenant/);
  });

  // ── B · Rules (client SDK) ───────────────────────────────────────────────

  it('B1/B2: escrita de cliente NEGADA (afiliado + ∑ + conversões); leitura RN-318/319', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: 'Dioney',
      refCodigo: 'DIONEY10', responsavelEmail: 'dioney@exemplo.com',
    }, marina);
    await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).update({
      responsavelUid: 'uid-dioney', status: 'ativo',
    });
    await db
      .doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10/conversoes/ped-1`)
      .set({ id: 'ped-1', pedidoRef: 'ped-1', valor: 200, qtdInscricoes: 1,
        clicadoEm: tsRel(-1), convertidoEm: FieldValue.serverTimestamp(),
        criadoEm: FieldValue.serverTimestamp() });

    const path = `eventos/${EVENTO_ID}/afiliados/DIONEY10`;
    const owner = testEnv
      .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
      .firestore();
    const dioney = testEnv.authenticatedContext('uid-dioney', {}).firestore();
    const intruso = testEnv.authenticatedContext('uid-intruso', {}).firestore();
    const outroTenant = testEnv
      .authenticatedContext('uid-outro', { role: 'tenant_owner', tenantId: OUTRO_ID })
      .firestore();

    // Leitura: writer do tenant ✔ · o PRÓPRIO PF ✔ · intruso/cross-tenant ✘
    await assertSucceeds(getDoc(clientDoc(owner, path)));
    await assertSucceeds(getDoc(clientDoc(dioney, path)));
    await assertFails(getDoc(clientDoc(intruso, path)));
    await assertFails(getDoc(clientDoc(outroTenant, path)));

    // Conversões espelham
    await assertSucceeds(getDoc(clientDoc(owner, `${path}/conversoes/ped-1`)));
    await assertSucceeds(getDoc(clientDoc(dioney, `${path}/conversoes/ped-1`)));
    await assertFails(getDoc(clientDoc(intruso, `${path}/conversoes/ped-1`)));

    // Escrita: NEGADA até para o writer do tenant (Function-only)
    await assertFails(updateDoc(clientDoc(owner, path), { conversoes: 999 }));
    await assertFails(updateDoc(clientDoc(dioney, path), { valorAtribuido: 999 }));
    await assertFails(
      setDoc(clientDoc(owner, `eventos/${EVENTO_ID}/afiliados/FORJADO1`), {
        id: 'FORJADO1', tenantId: CASTELO_ID, eventoId: EVENTO_ID,
        tipo: 'clube', status: 'ativo', nome: 'Forjado', refCodigo: 'FORJADO1',
        janelaAtribuicaoDias: 7, minimoInscricoes: null, cupomCodigo: null,
        conversoes: 0, valorAtribuido: 0,
      })
    );
    await assertFails(
      setDoc(clientDoc(owner, `${path}/conversoes/forjada`), { valor: 1 })
    );
    await assertFails(deleteDoc(clientDoc(owner, path)));
  });

  it('B3: cliente não seta/toca/deleta afiliadoRef de cupom', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run',
      refCodigo: 'FLORIPA10', cupomCodigo: 'FLORIPA10OFF',
    }, marina);
    const owner = testEnv
      .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
      .firestore();
    const cupomPath = `eventos/${EVENTO_ID}/cupons/FLORIPA10OFF`;

    // update tocando afiliadoRef → nega
    await assertFails(updateDoc(clientDoc(owner, cupomPath), { afiliadoRef: 'OUTRO999' }));
    await assertFails(updateDoc(clientDoc(owner, cupomPath), { afiliadoRef: null }));
    // delete de cupom amarrado → nega (órfão de gate)
    await assertFails(deleteDoc(clientDoc(owner, cupomPath)));
    // create de cupom novo JÁ com afiliadoRef → nega (Date: client SDK
    // converte; Timestamp do admin não passa no setDoc de cliente)
    await assertFails(
      setDoc(clientDoc(owner, `eventos/${EVENTO_ID}/cupons/NOVOCUP10`), {
        id: 'NOVOCUP10', tenantId: CASTELO_ID, codigo: 'NOVOCUP10',
        tipo: 'percentual', valor: 10, tetoUso: null,
        inicioEm: new Date(AGORA.getTime() - DIA_MS),
        fimEm: new Date(AGORA.getTime() + 30 * DIA_MS),
        usos: 0, afiliadoRef: 'FLORIPA10',
      })
    );
    // regressão: o MESMO cupom SEM afiliadoRef é criável pelo canal vigente
    await assertSucceeds(
      setDoc(clientDoc(owner, `eventos/${EVENTO_ID}/cupons/NOVOCUP10`), {
        id: 'NOVOCUP10', tenantId: CASTELO_ID, codigo: 'NOVOCUP10',
        tipo: 'percentual', valor: 10, tetoUso: null,
        inicioEm: new Date(AGORA.getTime() - DIA_MS),
        fimEm: new Date(AGORA.getTime() + 30 * DIA_MS),
        usos: 0,
      })
    );
  });

  // ── C · provisionAfiliadoAccount (aceite PF) ─────────────────────────────

  async function convitePF(): Promise<string> {
    const r = await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: 'Dioney Galharte',
      refCodigo: 'DIONEY10', responsavelEmail: 'dioney@exemplo.com',
    }, marina);
    return r.tokenAceite as string;
  }

  it('C1: aceite feliz cria conta + ativa + vincula; replay idempotente', async () => {
    const token = await convitePF();
    const r = await provisionAfiliadoCore(db, auth, {
      eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', token, senha: 'senha-forte-123',
    });
    expect(r).toMatchObject({ ok: true, afiliadoId: 'DIONEY10', replay: false });
    const user = await auth.getUserByEmail('dioney@exemplo.com');
    const doc = await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).get();
    expect(doc.get('status')).toBe('ativo');
    expect(doc.get('responsavelUid')).toBe(user.uid);

    const r2 = await provisionAfiliadoCore(db, auth, {
      eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', token, senha: 'senha-forte-123',
    });
    expect(r2.replay).toBe(true);
    expect((await auth.listUsers(1000)).users).toHaveLength(1);
  });

  it('C2: token errado/afiliado inexistente → permission-denied OPACO idêntico', async () => {
    await convitePF();
    const e1 = (await provisionAfiliadoCore(db, auth, {
      eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', token: 'a'.repeat(64), senha: 'senha-forte-123',
    }).catch((e) => e)) as { code: string; message: string };
    const e2 = (await provisionAfiliadoCore(db, auth, {
      eventoId: EVENTO_ID, afiliadoId: 'NAOEXISTE', token: 'a'.repeat(64), senha: 'senha-forte-123',
    }).catch((e) => e)) as { code: string; message: string };
    expect(e1.code).toBe('permission-denied');
    expect(e2.code).toBe('permission-denied');
    expect(e1.message).toBe(e2.message); // indistinguíveis (oráculo fechado)
  });

  it('C3: convite expirado → failed-precondition com caminho de reenvio', async () => {
    const token = await convitePF();
    await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).update({
      expiraEm: Timestamp.fromDate(new Date(AGORA.getTime() - DIA_MS)),
    });
    await expect(
      provisionAfiliadoCore(db, auth, {
        eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', token, senha: 'senha-forte-123',
      })
    ).rejects.toThrow(/convite_expirado/);
  });

  it('C4: rate-limit R2 — 30 falhas de token enchem o balde; 31ª = resource-exhausted; vítima com token VÁLIDO ainda aceita', async () => {
    const token = await convitePF();
    const input = (t: string) => ({
      eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', token: t, senha: 'senha-forte-123',
    });
    for (let i = 0; i < ACEITE_LIMITE_POR_ALVO; i++) {
      const e = (await provisionAfiliadoComRateLimit(db, auth, input('b'.repeat(64)))
        .catch((err) => err)) as { code: string };
      expect(e.code).toBe('permission-denied');
    }
    const estourado = (await provisionAfiliadoComRateLimit(db, auth, input('b'.repeat(64)))
      .catch((err) => err)) as { code: string };
    expect(estourado.code).toBe('resource-exhausted');
    // Vítima com o token certo NÃO está bloqueada (failures-only)
    const r = await provisionAfiliadoComRateLimit(db, auth, input(token));
    expect(r.ok).toBe(true);
  });

  it('C5: conta criada DEPOIS do convite é VINCULADA no aceite sem tocar credencial', async () => {
    // Convite primeiro (sem conta), conta nasce depois, aceite vincula.
    const token = await convitePF();
    const antes = await auth.createUser({
      email: 'dioney@exemplo.com', password: 'senha-original-1',
    });
    const r = await provisionAfiliadoCore(db, auth, {
      eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', token, senha: 'outra-senha-999',
    });
    expect(r.replay).toBe(false);
    const depois = await auth.getUser(antes.uid);
    // Credencial intocada (token de convite nunca troca senha — anti-takeover)
    expect(depois.passwordHash).toBe(
      (await auth.getUserByEmail('dioney@exemplo.com')).passwordHash
    );
    expect((await auth.listUsers(1000)).users).toHaveLength(1);
    const doc = await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).get();
    expect(doc.get('responsavelUid')).toBe(antes.uid);
    expect(doc.get('status')).toBe('ativo');
  });

  it('C6: PF com conta VERIFICADA no cadastro = vínculo imediato (sem convite/token)', async () => {
    // Fix Finding 2: vínculo imediato SÓ com emailVerified.
    const user = await auth.createUser({ email: 'dioney@exemplo.com', emailVerified: true });
    const r = await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: 'Dioney',
      refCodigo: 'DIONEY10', responsavelEmail: 'dioney@exemplo.com',
    }, marina);
    expect(r.status).toBe('ativo');
    expect(r.tokenAceite).toBeUndefined();
    const doc = await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).get();
    expect(doc.get('responsavelUid')).toBe(user.uid);
    expect(doc.get('tokenAceiteHash')).toBeUndefined();
  });

  it('C6b (fix Finding 2 — anti pre-hijack): conta NÃO-verificada NÃO vincula; cai no convite', async () => {
    // Atacante "squata" o e-mail da vítima (conta não-verificada). O cadastro
    // do organizador NÃO deve dar papel de influenciador à conta do atacante —
    // cai no ramo CONVITE (token = prova de posse da caixa).
    await auth.createUser({ email: 'dioney@exemplo.com', emailVerified: false });
    const r = await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: 'Dioney',
      refCodigo: 'DIONEY10', responsavelEmail: 'dioney@exemplo.com',
    }, marina);
    expect(r.status).toBe('convite_pendente');
    expect(r.tokenAceite).toHaveLength(64);
    const doc = await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).get();
    expect(doc.get('responsavelUid')).toBeUndefined();
    expect(doc.get('tokenAceiteHash')).toHaveLength(64);
  });

  it('C7 (fix review): reenvio com e-mail CORRIGIDO persiste o e-mail no doc e mata o token antigo', async () => {
    const tokenAntigo = await convitePF();
    // Organizadora corrige o e-mail do convite (typo) — reenvio
    const r = await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: 'Dioney Galharte',
      refCodigo: 'DIONEY10', responsavelEmail: 'dioney.certo@exemplo.com',
    }, marina);
    expect(r.jaExistia).toBe(true);
    const doc = await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).get();
    // Doc converge para o endereço que REALMENTE recebeu o convite
    expect(doc.get('responsavelEmail')).toBe('dioney.certo@exemplo.com');
    // Link antigo (entregue ao endereço errado) morreu
    await expect(
      provisionAfiliadoCore(db, auth, {
        eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', token: tokenAntigo,
        senha: 'senha-forte-123',
      })
    ).rejects.toThrow(/Convite inválido/);
    // Token novo aceita e cria a conta NO E-MAIL CORRIGIDO
    const rAceite = await provisionAfiliadoCore(db, auth, {
      eventoId: EVENTO_ID, afiliadoId: 'DIONEY10',
      token: r.tokenAceite as string, senha: 'senha-forte-123',
    });
    expect(rAceite.ok).toBe(true);
    const user = await auth.getUserByEmail('dioney.certo@exemplo.com');
    expect(
      (await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).get()).get('responsavelUid')
    ).toBe(user.uid);
  });

  it('C8 (fix review): reenvio quando o e-mail vigente JÁ tem conta VERIFICADA = vínculo imediato no update (token morto)', async () => {
    const tokenAntigo = await convitePF();
    const user = await auth.createUser({ email: 'dioney@exemplo.com', emailVerified: true });
    const r = await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: 'Dioney Galharte',
      refCodigo: 'DIONEY10', responsavelEmail: 'dioney@exemplo.com',
    }, marina);
    expect(r.status).toBe('ativo');
    expect(r.tokenAceite).toBeUndefined();
    const doc = await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).get();
    expect(doc.get('responsavelUid')).toBe(user.uid);
    expect(doc.get('tokenAceiteHash')).toBeUndefined();
    expect(doc.get('expiraEm')).toBeUndefined();
    // Token antigo não ressuscita o convite
    await expect(
      provisionAfiliadoCore(db, auth, {
        eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', token: tokenAntigo,
        senha: 'senha-forte-123',
      })
    ).rejects.toThrow(/já foi aceito|Convite inválido/);
  });

  // ── D · Atribuição no checkout + conversão + gate RN-315 ─────────────────

  it('D1: ?ref válido carimba pagamento.afiliado; confirmação registra conversão + ∑; replay não duplica', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run', refCodigo: 'FLORIPA10',
    }, marina);
    const r = await createInscricaoChargeCore(
      db, provider,
      chargeInput('chave-ref-00000001', {
        ref: { codigo: 'floripa10', clicadoEmMillis: AGORA.getTime() - DIA_MS },
      }),
      caller
    );
    const pag = await db.doc(`pagamentos/${r.pagamentoId}`).get();
    expect(pag.get('afiliado')).toMatchObject({
      afiliadoId: 'FLORIPA10', refCodigo: 'FLORIPA10', origem: 'ref',
    });

    await confirmarPedido(r.pedidoId, 'evt-af-1');
    const af = await db.doc(`eventos/${EVENTO_ID}/afiliados/FLORIPA10`).get();
    expect(af.get('conversoes')).toBe(1);
    expect(af.get('valorAtribuido')).toBe(r.valores.valorFinal);
    const conv = await db
      .doc(`eventos/${EVENTO_ID}/afiliados/FLORIPA10/conversoes/${r.pedidoId}`)
      .get();
    expect(conv.exists).toBe(true);
    expect(conv.get('qtdInscricoes')).toBe(1);
    expect(JSON.stringify(conv.data())).not.toContain('ana@exemplo.com');

    // Replay da MESMA entrega + entrega NOVA sobre estado final: ∑ intacto
    await confirmarPedido(r.pedidoId, 'evt-af-1');
    await confirmarPedido(r.pedidoId, 'evt-af-2');
    const af2 = await db.doc(`eventos/${EVENTO_ID}/afiliados/FLORIPA10`).get();
    expect(af2.get('conversoes')).toBe(1);
  });

  it('D2: ref desconhecido/afiliado inativo NÃO bloqueia a venda (atribuição descartada)', async () => {
    const r = await createInscricaoChargeCore(
      db, provider,
      chargeInput('chave-ref-00000002', { ref: { codigo: 'NAOEXIST' } }),
      caller
    );
    expect(r.pedidoId).toBeTruthy();
    const pag = await db.doc(`pagamentos/${r.pagamentoId}`).get();
    expect(pag.get('afiliado')).toBeUndefined();

    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Inativo', refCodigo: 'INATIVO1',
      status: 'inativo',
    }, marina);
    // S1209-PIXBE-T2: comprador DISTINTO na segunda compra. A trava de
    // segunda cobrança PIX viva (RN-157) recusa dois pedidos do mesmo
    // comprador com o MESMO carrinho enquanto o primeiro está no prazo —
    // e `ref` (atribuição de marketing) não faz parte da identidade do
    // carrinho DE PROPÓSITO, senão `?ref=` viraria o atalho para escapar
    // dela. O que este teste afirma (ref inválido não atribui) é idêntico.
    const r2 = await createInscricaoChargeCore(
      db, provider,
      chargeInput('chave-ref-00000003', { ref: { codigo: 'INATIVO1' } }),
      { uid: `${caller.uid}-d2b` }
    );
    const pag2 = await db.doc(`pagamentos/${r2.pagamentoId}`).get();
    expect(pag2.get('afiliado')).toBeUndefined();
  });

  it('D3: clique FORA da janela não atribui (RN-313)', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run',
      refCodigo: 'FLORIPA10', janelaAtribuicaoDias: 7,
    }, marina);
    const r = await createInscricaoChargeCore(
      db, provider,
      chargeInput('chave-ref-00000004', {
        ref: { codigo: 'FLORIPA10', clicadoEmMillis: AGORA.getTime() - 8 * DIA_MS },
      }),
      caller
    );
    const pag = await db.doc(`pagamentos/${r.pagamentoId}`).get();
    expect(pag.get('afiliado')).toBeUndefined();
  });

  it('D4: gate RN-315 — cupom amarrado FECHADO abaixo do mínimo (cotação e cobrança), abre ao cruzar; sem retroativo', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run',
      refCodigo: 'FLORIPA10', cupomCodigo: 'FLORIPA10OFF', minimoInscricoes: 2,
    }, marina);

    // Abaixo do mínimo: cupom indisponível (opaco) — cotação E cobrança
    await expect(
      cotarInscricaoCheckoutCore(db, {
        eventoId: EVENTO_ID,
        itens: [{ modalidade: '10k' }],
        forma: 'pix', parcelas: 1, cupomCodigo: 'FLORIPA10OFF',
      })
    ).rejects.toThrow(/indisponível/);
    await expect(
      createInscricaoChargeCore(
        db, provider,
        chargeInput('chave-gate-00000001', { cupomCodigo: 'FLORIPA10OFF' }),
        caller
      )
    ).rejects.toThrow(/indisponível/);

    // 2 conversões pelo LINK (rastreiam mesmo sem desconto — RN-315)
    for (const [i, key] of ['chave-gate-00000002', 'chave-gate-00000003'].entries()) {
      const r = await createInscricaoChargeCore(
        db, provider,
        chargeInput(key, { ref: { codigo: 'FLORIPA10' } }),
        { uid: `uid-comprador-${i}` }
      );
      await confirmarPedido(r.pedidoId, `evt-gate-${i}`);
    }
    const af = await db.doc(`eventos/${EVENTO_ID}/afiliados/FLORIPA10`).get();
    expect(af.get('conversoes')).toBe(2);

    // Cruzou o mínimo: cupom aplica; pagamento carrega cupom + atribuição 'cupom'
    const rCom = await createInscricaoChargeCore(
      db, provider,
      chargeInput('chave-gate-00000004', { cupomCodigo: 'FLORIPA10OFF' }),
      caller
    );
    expect(rCom.valores.desconto).toBeGreaterThan(0);
    const pag = await db.doc(`pagamentos/${rCom.pagamentoId}`).get();
    expect(pag.get('cupom.codigo')).toBe('FLORIPA10OFF');
    expect(pag.get('afiliado')).toMatchObject({ afiliadoId: 'FLORIPA10', origem: 'cupom' });
  });

  it('D5 (fix Finding 1b): estorno DECREMENTA a conversão do afiliado — o gate RN-315 volta a fechar', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run',
      refCodigo: 'FLORIPA10', cupomCodigo: 'FLORIPA10OFF', minimoInscricoes: 1,
    }, marina);

    // 1 conversão pelo link → cruza o mínimo (gate abre)
    const r = await createInscricaoChargeCore(
      db, provider,
      chargeInput('chave-refund-0000001', { ref: { codigo: 'FLORIPA10' } }),
      caller
    );
    await confirmarPedido(r.pedidoId, 'evt-refund-1');
    const afAntes = await db.doc(`eventos/${EVENTO_ID}/afiliados/FLORIPA10`).get();
    expect(afAntes.get('conversoes')).toBe(1);
    // gate aberto: cupom aplica
    const rCom = await createInscricaoChargeCore(
      db, provider,
      chargeInput('chave-refund-0000002', { cupomCodigo: 'FLORIPA10OFF' }),
      caller
    );
    expect(rCom.valores.desconto).toBeGreaterThan(0);

    // Estorna a inscrição atribuída → conversão decrementa, conversão some
    const est = await estornarInscricaoCore(db, provider, {
      pedidoId: r.pedidoId, inscritoId: r.inscritoIds[0]!, motivo: 'Estorno de teste do gate',
    }, marina);
    expect(est.duplicado).toBe(false);
    const afDepois = await db.doc(`eventos/${EVENTO_ID}/afiliados/FLORIPA10`).get();
    expect(afDepois.get('conversoes')).toBe(0);
    expect(afDepois.get('valorAtribuido')).toBe(0);
    const conv = await db
      .doc(`eventos/${EVENTO_ID}/afiliados/FLORIPA10/conversoes/${r.pedidoId}`)
      .get();
    expect(conv.exists).toBe(false);

    // Gate voltou a FECHAR: cupom indisponível de novo (opaco)
    await expect(
      createInscricaoChargeCore(
        db, provider,
        chargeInput('chave-refund-0000003', { cupomCodigo: 'FLORIPA10OFF' }),
        caller
      )
    ).rejects.toThrow(/indisponível/);

    // Idempotência: reexecutar o estorno não re-decrementa (∑ intacto)
    await estornarInscricaoCore(db, provider, {
      pedidoId: r.pedidoId, inscritoId: r.inscritoIds[0]!, motivo: 'Estorno de teste do gate',
    }, marina);
    const afReplay = await db.doc(`eventos/${EVENTO_ID}/afiliados/FLORIPA10`).get();
    expect(afReplay.get('conversoes')).toBe(0);
  });

  // ── E · Readers (RN-318/319) ─────────────────────────────────────────────

  it('E1: getMinhasAfiliacoes devolve SÓ as afiliações do uid (projeção sem PII de comprador); organizador lista as do tenant', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run',
      refCodigo: 'FLORIPA10', clubeRef: 'floripa-run',
    }, marina);
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: 'Dioney',
      refCodigo: 'DIONEY10', responsavelEmail: 'dioney@exemplo.com',
    }, marina);
    await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).update({
      responsavelUid: 'uid-dioney', status: 'ativo',
    });
    const r = await createInscricaoChargeCore(
      db, provider,
      chargeInput('chave-reader-0000001', { ref: { codigo: 'DIONEY10' } }),
      caller
    );
    await confirmarPedido(r.pedidoId, 'evt-reader-1');

    const minhas = await getMinhasAfiliacoesCore(db, 'uid-dioney');
    expect(minhas.afiliacoes).toHaveLength(1);
    expect(minhas.afiliacoes[0]).toMatchObject({
      refCodigo: 'DIONEY10', conversoes: 1, eventoNome: 'Meia dos Afiliados',
      // T-extra TAMANHOS-GRADE (E08-PROMOTOR): slug projetado → o painel do
      // promotor copia o LINK completo `{landing}/{slug}?ref=`.
      eventoSlug: EVENTO_ID,
    });
    expect(minhas.afiliacoes[0]?.ultimasConversoes).toHaveLength(1);
    expect(JSON.stringify(minhas)).not.toContain('ana@exemplo.com');
    expect(JSON.stringify(minhas)).not.toContain('529.982');

    // Dono do clube vê a afiliação do clube (RN-319 lado clube)
    const doClube = await getMinhasAfiliacoesCore(db, 'uid-clube-owner');
    expect(doClube.afiliacoes.map((a) => a.refCodigo)).toEqual(['FLORIPA10']);

    // Organizador: os 2 afiliados do tenant; filtro por evento respeitado
    const doTenant = await getAfiliadosDoTenantCore(db, marina.claims, {});
    expect(doTenant.afiliados).toHaveLength(2);
    const outroTenant = await getAfiliadosDoTenantCore(
      db,
      { role: 'tenant_owner', tenantId: OUTRO_ID } as AuthClaims,
      {}
    );
    expect(outroTenant.afiliados).toHaveLength(0);
  });

  // ── F · Comissão FASE 2 (COMF2 — dinheiro) ───────────────────────────────

  const afPath = `eventos/${EVENTO_ID}/afiliados/FLORIPA10`;

  async function converterViaRef(
    key: string,
    eventId: string,
    extra: Partial<CreateInscricaoChargeInput> = {}
  ) {
    const r = await createInscricaoChargeCore(
      db, provider,
      chargeInput(key, { ref: { codigo: 'FLORIPA10' }, ...extra }),
      caller
    );
    await confirmarPedido(r.pedidoId, eventId);
    return r;
  }

  it('F1: comissão PERCENTUAL acumula cent-exato na confirmação; config congelada na conversão; replay não duplica', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run', refCodigo: 'FLORIPA10',
      comissao: { tipo: 'percentual', percentual: 10.25 },
    }, marina);

    const r = await converterViaRef('chave-com-00000001', 'evt-com-1');
    // 10,25% de R$ 200,00 = 2050 centavos exatos = R$ 20,50
    const esperada = Math.round(Math.round(r.valores.valorFinal * 100) * 1025 / 10_000) / 100;
    const af = await db.doc(afPath).get();
    expect(af.get('comissaoAcumulada')).toBe(esperada);
    expect(af.get('comissaoRepassada') ?? 0).toBe(0);

    const conv = await db.doc(`${afPath}/conversoes/${r.pedidoId}`).get();
    expect(conv.get('comissao')).toBe(esperada);
    expect(conv.get('comissaoConfig')).toEqual({ tipo: 'percentual', percentual: 10.25 });

    // Replay (mesma entrega + entrega nova): ∑ de dinheiro INTACTO
    await confirmarPedido(r.pedidoId, 'evt-com-1');
    await confirmarPedido(r.pedidoId, 'evt-com-1b');
    const af2 = await db.doc(afPath).get();
    expect(af2.get('comissaoAcumulada')).toBe(esperada);
  });

  it('F2: comissão VALOR_FIXO conta POR INSCRIÇÃO (pedido de 2 = 2×); afiliado sem comissão acumula 0', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run', refCodigo: 'FLORIPA10',
      comissao: { tipo: 'valor_fixo', valorPorInscricao: 15.5 },
    }, marina);
    const r = await converterViaRef('chave-com-00000002', 'evt-com-2', {
      inscritos: [
        { nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25', modalidade: '10k' },
        { nome: 'Beto Lima', email: 'beto@exemplo.com', cpf: '111.444.777-35', modalidade: '10k' },
      ],
    });
    const af = await db.doc(afPath).get();
    expect(af.get('conversoes')).toBe(2);
    expect(af.get('comissaoAcumulada')).toBe(31);
    const conv = await db.doc(`${afPath}/conversoes/${r.pedidoId}`).get();
    expect(conv.get('comissao')).toBe(31);

    // Afiliado SEM comissão (R9-E intacto): conversão registra, comissão 0
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Sem Comissão', refCodigo: 'SEMCOM01',
    }, marina);
    const r2 = await createInscricaoChargeCore(
      db, provider,
      chargeInput('chave-com-00000003', { ref: { codigo: 'SEMCOM01' } }),
      caller
    );
    await confirmarPedido(r2.pedidoId, 'evt-com-3');
    const af2 = await db.doc(`eventos/${EVENTO_ID}/afiliados/SEMCOM01`).get();
    expect(af2.get('conversoes')).toBe(1);
    expect(af2.get('comissaoAcumulada')).toBe(0);
  });

  it('F3 (anti-forja de percentual pós-venda): mudar a config NÃO recalcula o acumulado; estorno decrementa pela config CONGELADA', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run', refCodigo: 'FLORIPA10',
      comissao: { tipo: 'percentual', percentual: 10 },
    }, marina);
    const r1 = await converterViaRef('chave-forja-0000001', 'evt-forja-1');
    const comissao1 = Math.round(Math.round(r1.valores.valorFinal * 100) * 1000 / 10_000) / 100;
    expect((await db.doc(afPath).get()).get('comissaoAcumulada')).toBe(comissao1);

    // Organizador sobe para 50% DEPOIS da venda
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run', refCodigo: 'FLORIPA10',
      comissao: { tipo: 'percentual', percentual: 50 },
    }, marina);
    // Acumulado da venda antiga INTACTO
    expect((await db.doc(afPath).get()).get('comissaoAcumulada')).toBe(comissao1);

    // Venda NOVA usa 50%; a antiga segue congelada em 10%
    const r2 = await converterViaRef('chave-forja-0000002', 'evt-forja-2');
    const comissao2 = Math.round(Math.round(r2.valores.valorFinal * 100) * 5000 / 10_000) / 100;
    expect((await db.doc(afPath).get()).get('comissaoAcumulada')).toBe(
      Math.round((comissao1 + comissao2) * 100) / 100
    );

    // Estorno da venda ANTIGA devolve os 10% congelados (não 50%)
    await estornarInscricaoCore(db, provider, {
      pedidoId: r1.pedidoId, inscritoId: r1.inscritoIds[0]!, motivo: 'Estorno anti-forja',
    }, marina);
    const af = await db.doc(afPath).get();
    expect(af.get('comissaoAcumulada')).toBe(comissao2);
  });

  it('F4: estorno PARCIAL decrementa a fatia exata; integral zera e apaga a conversão; replay não re-decrementa', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run', refCodigo: 'FLORIPA10',
      comissao: { tipo: 'valor_fixo', valorPorInscricao: 15.5 },
    }, marina);
    const r = await converterViaRef('chave-est-00000001', 'evt-est-1', {
      inscritos: [
        { nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25', modalidade: '10k' },
        { nome: 'Beto Lima', email: 'beto@exemplo.com', cpf: '111.444.777-35', modalidade: '10k' },
      ],
    });
    expect((await db.doc(afPath).get()).get('comissaoAcumulada')).toBe(31);

    // Estorno do 1º inscrito: conversão restante recomputada pela config congelada
    await estornarInscricaoCore(db, provider, {
      pedidoId: r.pedidoId, inscritoId: r.inscritoIds[0]!, motivo: 'Estorno parcial',
    }, marina);
    const afParcial = await db.doc(afPath).get();
    expect(afParcial.get('comissaoAcumulada')).toBe(15.5);
    const convParcial = await db.doc(`${afPath}/conversoes/${r.pedidoId}`).get();
    expect(convParcial.get('qtdInscricoes')).toBe(1);
    expect(convParcial.get('comissao')).toBe(15.5);

    // Estorno do 2º: doc some, ∑ zera
    await estornarInscricaoCore(db, provider, {
      pedidoId: r.pedidoId, inscritoId: r.inscritoIds[1]!, motivo: 'Estorno integral',
    }, marina);
    const afTotal = await db.doc(afPath).get();
    expect(afTotal.get('comissaoAcumulada')).toBe(0);
    expect((await db.doc(`${afPath}/conversoes/${r.pedidoId}`).get()).exists).toBe(false);

    // Replay dos DOIS estornos: nada re-decrementa (guarda do ledger)
    await estornarInscricaoCore(db, provider, {
      pedidoId: r.pedidoId, inscritoId: r.inscritoIds[0]!, motivo: 'replay',
    }, marina);
    await estornarInscricaoCore(db, provider, {
      pedidoId: r.pedidoId, inscritoId: r.inscritoIds[1]!, motivo: 'replay',
    }, marina);
    expect((await db.doc(afPath).get()).get('comissaoAcumulada')).toBe(0);
  });

  it('F5: repasse manual — guarda de saldo, idempotência por repasseId, extrato no reader e saldo NEGATIVO honesto pós-estorno', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: 'Dioney', refCodigo: 'DIONEY10',
      responsavelEmail: 'dioney@exemplo.com',
      comissao: { tipo: 'valor_fixo', valorPorInscricao: 15.5 },
    }, marina);
    await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).update({
      responsavelUid: 'uid-dioney', status: 'ativo',
    });
    const r = await createInscricaoChargeCore(
      db, provider,
      chargeInput('chave-rep-00000001', { ref: { codigo: 'DIONEY10' } }),
      caller
    );
    await confirmarPedido(r.pedidoId, 'evt-rep-1');

    // valor > saldo nega; não cent-exato nega; ≤ 0 nega
    await expect(
      registrarRepasseComissaoCore(db, {
        eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', repasseId: 'rep-000000001', valor: 100,
      }, marina)
    ).rejects.toThrow(/excede o saldo/);
    await expect(
      registrarRepasseComissaoCore(db, {
        eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', repasseId: 'rep-000000001', valor: 10.005,
      }, marina)
    ).rejects.toThrow(/cent-exato/);
    await expect(
      registrarRepasseComissaoCore(db, {
        eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', repasseId: 'rep-000000001', valor: -5,
      }, marina)
    ).rejects.toThrow(/cent-exato/);

    // Registro feliz + replay do MESMO repasseId (double-click) = 1 débito só
    const ok = await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', repasseId: 'rep-000000001',
      valor: 10, observacao: 'Pix 18/07',
    }, marina);
    expect(ok.duplicado).toBe(false);
    expect(ok.saldoComissao).toBe(5.5);
    const replay = await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', repasseId: 'rep-000000001', valor: 10,
    }, marina);
    expect(replay.duplicado).toBe(true);
    expect(replay.saldoComissao).toBe(5.5);
    expect(
      (await db.doc(`eventos/${EVENTO_ID}/afiliados/DIONEY10`).get()).get('comissaoRepassada')
    ).toBe(10);

    // Sem papel de escrita / tenant errado: nega
    await expect(
      registrarRepasseComissaoCore(db, {
        eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', repasseId: 'rep-000000002', valor: 1,
      }, { uid: 'uid-intruso', claims: {} as AuthClaims })
    ).rejects.toThrow();
    await expect(
      registrarRepasseComissaoCore(db, {
        eventoId: EVENTO_ID, afiliadoId: 'DIONEY10', repasseId: 'rep-000000003', valor: 1,
      }, { uid: 'uid-outro', claims: { role: 'tenant_owner', tenantId: OUTRO_ID } as AuthClaims })
    ).rejects.toThrow(/não existe neste tenant/);

    // Reader do PRÓPRIO afiliado: saldo + extrato (conversão com comissão, repasse)
    const minhas = await getMinhasAfiliacoesCore(db, 'uid-dioney');
    expect(minhas.afiliacoes[0]).toMatchObject({
      comissaoAcumulada: 15.5, comissaoRepassada: 10, saldoComissao: 5.5,
      comissao: { tipo: 'valor_fixo', valorPorInscricao: 15.5 },
    });
    expect(minhas.afiliacoes[0]?.ultimasConversoes[0]?.comissao).toBe(15.5);
    expect(minhas.afiliacoes[0]?.ultimosRepasses).toHaveLength(1);
    expect(minhas.afiliacoes[0]?.ultimosRepasses[0]).toMatchObject({
      valor: 10, observacao: 'Pix 18/07',
    });
    expect(JSON.stringify(minhas)).not.toContain('ana@exemplo.com');

    // Estorno DEPOIS do repasse: saldo fica NEGATIVO (dívida honesta, sem clamp)
    await estornarInscricaoCore(db, provider, {
      pedidoId: r.pedidoId, inscritoId: r.inscritoIds[0]!, motivo: 'Estorno pós-repasse',
    }, marina);
    const depois = await getMinhasAfiliacoesCore(db, 'uid-dioney');
    expect(depois.afiliacoes[0]?.comissaoAcumulada).toBe(0);
    expect(depois.afiliacoes[0]?.saldoComissao).toBe(-10);
  });

  // ── S705-T1 · RN-385 — o buraco de prova que a F5 não cobria ─────────────
  // A F5 prova UM repasse contra o saldo (teto, cent-exatidão, replay). O que
  // faltava é a composição: DOIS parciais consecutivos contra o MESMO saldo,
  // onde o segundo tem de enxergar o saldo JÁ decrementado pelo primeiro.
  // Sem esta prova, um repasse que lê o saldo original passaria despercebido
  // e o afiliado receberia duas vezes o que o organizador devia uma.
  it('F5b (S705-T1 · RN-385): dois parciais consecutivos — o 2º respeita o saldo JÁ decrementado; teto recalculado; estorno pós-parcial sem clamp', async () => {
    // Saldo 30 por afiliado: valor_fixo de 30 × 1 inscrição do pedido.
    async function afiliadoComSaldo30(
      refCodigo: string,
      uid: string,
      chaveCharge: string,
      eventId: string
    ): Promise<{ pedidoId: string; inscritoIds: string[] }> {
      await salvarAfiliadoCore(db, {
        eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: `PF ${refCodigo}`,
        refCodigo, responsavelEmail: `${refCodigo.toLowerCase()}@exemplo.com`,
        comissao: { tipo: 'valor_fixo', valorPorInscricao: 30 },
      }, marina);
      await db.doc(`eventos/${EVENTO_ID}/afiliados/${refCodigo}`).update({
        responsavelUid: uid, status: 'ativo',
      });
      const r = await createInscricaoChargeCore(
        db, provider, chargeInput(chaveCharge, { ref: { codigo: refCodigo } }), caller
      );
      await confirmarPedido(r.pedidoId, eventId);
      const afil = await db.doc(`eventos/${EVENTO_ID}/afiliados/${refCodigo}`).get();
      expect(afil.get('comissaoAcumulada')).toBe(30);
      return { pedidoId: r.pedidoId, inscritoIds: r.inscritoIds };
    }

    // ── Caso 1 · 30 → parcial 10 → parcial 15 = saldo 5, ∑ 25, DUAS linhas ──
    await afiliadoComSaldo30('PARCIALA', 'uid-parcial-a', 'chave-par-00000001', 'evt-par-a1');

    const p1 = await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'PARCIALA', repasseId: 'rep-parcial-a-01',
      valor: 10, observacao: 'Pix 1/2',
    }, marina);
    expect(p1.duplicado).toBe(false);
    expect(p1.saldoComissao).toBe(20);

    const p2 = await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'PARCIALA', repasseId: 'rep-parcial-a-02',
      valor: 15, observacao: 'Pix 2/2',
    }, marina);
    expect(p2.duplicado).toBe(false);
    expect(p2.saldoComissao).toBe(5);

    const afilA = await db.doc(`eventos/${EVENTO_ID}/afiliados/PARCIALA`).get();
    expect(afilA.get('comissaoAcumulada')).toBe(30);
    expect(afilA.get('comissaoRepassada')).toBe(25);

    // Ledger: DUAS linhas próprias (o parcial não vira um total somado) —
    // é a projeção que o extrato dos dois lados consome (S705-T3).
    const ledgerA = await db
      .collection(`eventos/${EVENTO_ID}/afiliados/PARCIALA/repasses`)
      .get();
    expect(ledgerA.size).toBe(2);
    expect(ledgerA.docs.map((d) => d.get('valor')).sort((a, b) => a - b)).toEqual([10, 15]);
    expect(ledgerA.docs.map((d) => d.id).sort()).toEqual([
      'rep-parcial-a-01', 'rep-parcial-a-02',
    ]);

    // O reader do PRÓPRIO afiliado enxerga as duas linhas com valor e nota
    // próprios — e nada de terceiro (RN-318).
    const minhasA = await getMinhasAfiliacoesCore(db, 'uid-parcial-a');
    expect(minhasA.afiliacoes[0]).toMatchObject({
      comissaoAcumulada: 30, comissaoRepassada: 25, saldoComissao: 5,
    });
    expect(minhasA.afiliacoes[0]?.ultimosRepasses).toHaveLength(2);
    expect(
      minhasA.afiliacoes[0]?.ultimosRepasses.map((r) => r.valor).sort((a, b) => a - b)
    ).toEqual([10, 15]);
    expect(JSON.stringify(minhasA)).not.toContain('ana@exemplo.com');

    // Um 3º parcial de 5 fecha o saldo em ZERO (o caminho de aceite da
    // história: "segundo repasse do resto é aceito e o saldo vai a zero").
    const p3 = await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'PARCIALA', repasseId: 'rep-parcial-a-03', valor: 5,
    }, marina);
    expect(p3.saldoComissao).toBe(0);

    // ── Caso 2 · 30 → parcial 10 → 21 RECUSADO (teto = saldo decrementado) ──
    const pedidoB = await afiliadoComSaldo30(
      'PARCIALB', 'uid-parcial-b', 'chave-par-00000002', 'evt-par-b1'
    );
    await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'PARCIALB', repasseId: 'rep-parcial-b-01', valor: 10,
    }, marina);
    // 21 cabia no saldo ORIGINAL (30) e NÃO cabe no vigente (20): se a guarda
    // lesse o saldo pré-parcial, este repasse passaria e o organizador pagaria
    // 31 por uma dívida de 30.
    await expect(
      registrarRepasseComissaoCore(db, {
        eventoId: EVENTO_ID, afiliadoId: 'PARCIALB', repasseId: 'rep-parcial-b-02', valor: 21,
      }, marina)
    ).rejects.toThrow(/excede o saldo/);
    const afilB = await db.doc(`eventos/${EVENTO_ID}/afiliados/PARCIALB`).get();
    expect(afilB.get('comissaoRepassada')).toBe(10);
    const ledgerB = await db
      .collection(`eventos/${EVENTO_ID}/afiliados/PARCIALB/repasses`)
      .get();
    expect(ledgerB.size).toBe(1); // a recusa não deixa rastro no ledger
    const minhasB = await getMinhasAfiliacoesCore(db, 'uid-parcial-b');
    expect(minhasB.afiliacoes[0]?.saldoComissao).toBe(20);

    // ── Caso 3 · estorno DEPOIS do parcial: config CONGELADA, sem clamp ─────
    // Trocar a config de comissão antes do estorno é a armadilha: o estorno
    // tem de decrementar os 30 CONGELADOS na conversão, não os 5 de agora.
    await db.doc(`eventos/${EVENTO_ID}/afiliados/PARCIALB`).update({
      comissao: { tipo: 'valor_fixo', valorPorInscricao: 5 },
    });
    await estornarInscricaoCore(db, provider, {
      pedidoId: pedidoB.pedidoId, inscritoId: pedidoB.inscritoIds[0]!,
      motivo: 'Estorno pós-parcial',
    }, marina);
    const depoisB = await getMinhasAfiliacoesCore(db, 'uid-parcial-b');
    // 30 congelados saem inteiros; os 10 já repassados viram dívida honesta.
    expect(depoisB.afiliacoes[0]?.comissaoAcumulada).toBe(0);
    expect(depoisB.afiliacoes[0]?.comissaoRepassada).toBe(10);
    expect(depoisB.afiliacoes[0]?.saldoComissao).toBe(-10);
    // Dívida NÃO se quita por registro: saldo negativo recusa qualquer valor.
    await expect(
      registrarRepasseComissaoCore(db, {
        eventoId: EVENTO_ID, afiliadoId: 'PARCIALB', repasseId: 'rep-parcial-b-03', valor: 1,
      }, marina)
    ).rejects.toThrow(/excede o saldo/);
  });

  it('F6: Rules — repasses/∑ de comissão Function-only; leitura só organizador do tenant + o PRÓPRIO afiliado', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: 'Dioney', refCodigo: 'DIONEY10',
      responsavelEmail: 'dioney@exemplo.com',
      comissao: { tipo: 'percentual', percentual: 10 },
    }, marina);
    const path = `eventos/${EVENTO_ID}/afiliados/DIONEY10`;
    await db.doc(path).update({ responsavelUid: 'uid-dioney', status: 'ativo' });
    await db.doc(`${path}/repasses/rep-000000001`).set({
      id: 'rep-000000001', valor: 10, observacao: null,
      registradoPorUid: MARINA_UID, criadoEm: FieldValue.serverTimestamp(),
    });

    const owner = testEnv
      .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
      .firestore();
    const dioney = testEnv.authenticatedContext('uid-dioney', {}).firestore();
    const intruso = testEnv.authenticatedContext('uid-intruso', {}).firestore();
    const outroTenant = testEnv
      .authenticatedContext('uid-outro', { role: 'tenant_owner', tenantId: OUTRO_ID })
      .firestore();
    const repassePath = `${path}/repasses/rep-000000001`;

    // Leitura: organizador ✔ · o PRÓPRIO ✔ · intruso/cross-tenant ✘
    await assertSucceeds(getDoc(clientDoc(owner, repassePath)));
    await assertSucceeds(getDoc(clientDoc(dioney, repassePath)));
    await assertFails(getDoc(clientDoc(intruso, repassePath)));
    await assertFails(getDoc(clientDoc(outroTenant, repassePath)));

    // Escrita: NEGADA para todos (forjar repasse zeraria dívida real)
    await assertFails(
      setDoc(clientDoc(owner, `${path}/repasses/forjado-01`), { valor: 999 })
    );
    await assertFails(updateDoc(clientDoc(owner, repassePath), { valor: 0.01 }));
    await assertFails(deleteDoc(clientDoc(owner, repassePath)));
    await assertFails(
      setDoc(clientDoc(dioney, `${path}/repasses/forjado-02`), { valor: 999 })
    );

    // ∑ de comissão e config: intocáveis por cliente (writer incluso)
    await assertFails(updateDoc(clientDoc(owner, path), { comissaoAcumulada: 9999 }));
    await assertFails(updateDoc(clientDoc(dioney, path), { comissaoRepassada: 0 }));
    await assertFails(
      updateDoc(clientDoc(dioney, path), { comissao: { tipo: 'percentual', percentual: 90 } })
    );
  });

  // ── G · S706-T1 · RN-386 — avisos ao afiliado ────────────────────────────
  // Zero rede real: o EmailProvider é INJETADO. `BREVO_API_KEY` segue apagada
  // no beforeAll, então o caminho de produção de hoje continua fail-closed.

  /** Provider espião — captura o que teria saído. */
  function providerEspiao(): {
    provider: EmailProvider;
    enviados: SendTransactionalParams[];
  } {
    const enviados: SendTransactionalParams[] = [];
    return {
      enviados,
      provider: {
        name: 'espiao',
        async sendTransactional(params) {
          enviados.push(params);
          return { ok: true, messageId: `msg-${enviados.length}` };
        },
      },
    };
  }

  /** Provider que SEMPRE falha — prova que o dinheiro não depende do e-mail. */
  const providerQuebrado: EmailProvider = {
    name: 'quebrado',
    async sendTransactional() {
      throw new Error('SMTP fora do ar');
    },
  };

  const logDoc = (chave: string, ref = 'AVISADO1'): string =>
    logComunicacaoDocId(ref, chave, 'email');

  async function afiliadoComComissao(
    refCodigo: string,
    uid: string,
    valorPorInscricao: number
  ): Promise<void> {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'pessoa_fisica', nome: 'Teo Avisado',
      refCodigo, responsavelEmail: 'teo@exemplo.com',
      comissao: { tipo: 'valor_fixo', valorPorInscricao },
    }, marina);
    await db.doc(`eventos/${EVENTO_ID}/afiliados/${refCodigo}`).update({
      responsavelUid: uid, status: 'ativo',
    });
  }

  it('G1: repasse dispara UM aviso; replay do mesmo repasseId não dispara segundo', async () => {
    await afiliadoComComissao('AVISADO1', 'uid-teo', 30);
    const r = await createInscricaoChargeCore(
      db, provider, chargeInput('chave-avi-00000001', { ref: { codigo: 'AVISADO1' } }), caller
    );
    await confirmarPedido(r.pedidoId, 'evt-avi-1');

    const { provider: espiao, enviados } = providerEspiao();
    const ok = await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'AVISADO1', repasseId: 'rep-aviso-0001',
      valor: 10, observacao: 'Pix 28/07',
    }, marina, espiao);
    expect(ok.duplicado).toBe(false);
    expect(enviados).toHaveLength(1);

    // Conteúdo: valor repassado, evento e o que RESTA (o parcial sem o resto
    // faria o afiliado achar que a conta fechou).
    const corpo = `${enviados[0]!.assunto} ${enviados[0]!.texto}`;
    expect(corpo).toContain('10,00');
    expect(corpo).toContain('Meia dos Afiliados');
    expect(corpo).toContain('20,00'); // saldo restante (30 − 10)
    expect(enviados[0]!.to.email).toBe('teo@exemplo.com');

    // O log guarda assunto e templateRef — NUNCA o corpo (PII mínima).
    const chave = chaveAvisoRepasse('rep-aviso-0001');
    const logSnap = await db.doc(
      `eventos/${EVENTO_ID}/comunicacoes/${logDoc(chave)}`
    ).get();
    expect(logSnap.exists).toBe(true);
    expect(logSnap.get('destinatario')).toEqual({ tipo: 'afiliado', ref: 'AVISADO1' });
    expect(logSnap.get('templateRef')).toBe('avisoRepasseComissao');
    expect(logSnap.get('assunto')).toContain('Repasse de comissão registrado');
    for (const proibido of ['corpo', 'conteudo', 'html', 'body']) {
      expect(logSnap.get(proibido)).toBeUndefined();
    }

    // Replay do MESMO repasseId: nenhum segundo aviso (o docId já existe).
    const replay = await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'AVISADO1', repasseId: 'rep-aviso-0001', valor: 10,
    }, marina, espiao);
    expect(replay.duplicado).toBe(true);
    expect(enviados).toHaveLength(1);

    // Um repasse DIFERENTE avisa de novo — a chave é por repasse, não por afiliado.
    await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'AVISADO1', repasseId: 'rep-aviso-0002', valor: 5,
    }, marina, espiao);
    expect(enviados).toHaveLength(2);
  });

  it('G2: provedor de e-mail fora do ar NÃO reverte o repasse; a falha fica no log', async () => {
    await afiliadoComComissao('AVISADO1', 'uid-teo', 30);
    const r = await createInscricaoChargeCore(
      db, provider, chargeInput('chave-avi-00000002', { ref: { codigo: 'AVISADO1' } }), caller
    );
    await confirmarPedido(r.pedidoId, 'evt-avi-2');

    const ok = await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'AVISADO1', repasseId: 'rep-aviso-0003', valor: 12,
    }, marina, providerQuebrado);

    // O dinheiro registrado é o mesmo: o aviso é consequência, não etapa.
    expect(ok.ok).toBe(true);
    expect(ok.saldoComissao).toBe(18);
    expect(
      (await db.doc(`eventos/${EVENTO_ID}/afiliados/AVISADO1`).get()).get('comissaoRepassada')
    ).toBe(12);
    expect(
      (await db.collection(`eventos/${EVENTO_ID}/afiliados/AVISADO1/repasses`).get()).size
    ).toBe(1);

    const logSnap = await db.doc(
      `eventos/${EVENTO_ID}/comunicacoes/${logDoc(chaveAvisoRepasse('rep-aviso-0003'))}`
    ).get();
    expect(logSnap.get('status')).toBe('falhou');
    expect(logSnap.get('falhaMotivo')).toBe('provider_erro');

    // Sem chave de e-mail (produção hoje): NADA é registrado — registrar
    // queimaria a chave de um envio que nunca existiu.
    await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'AVISADO1', repasseId: 'rep-aviso-0004', valor: 1,
    }, marina, null);
    expect(
      (await db.doc(
        `eventos/${EVENTO_ID}/comunicacoes/${logDoc(chaveAvisoRepasse('rep-aviso-0004'))}`
      ).get()).exists
    ).toBe(false);
  });

  it('G3: marco — primeira comissão avisa; dentro da faixa não; faixa cruzada avisa uma vez; recruzar NÃO reavisa', async () => {
    await afiliadoComComissao('AVISADO1', 'uid-teo', 40);
    const { provider: espiao, enviados } = providerEspiao();

    const venda = async (
      chave: string,
      eventId: string
    ): Promise<{ pedidoId: string; inscritoIds: string[] }> => {
      const r = await createInscricaoChargeCore(
        db, provider, chargeInput(chave, { ref: { codigo: 'AVISADO1' } }), caller
      );
      await confirmarPedido(r.pedidoId, eventId, espiao);
      return { pedidoId: r.pedidoId, inscritoIds: r.inscritoIds };
    };

    // 0 → 40: primeira comissão do afiliado no evento.
    await venda('chave-mar-00000001', 'evt-mar-1');
    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.assunto).toContain('primeira comissão');
    expect(
      (await db.doc(
        `eventos/${EVENTO_ID}/comunicacoes/${logDoc(chaveAvisoMarco(0))}`
      ).get()).exists
    ).toBe(true);

    // 40 → 80: mesma faixa, nenhuma notícia.
    await venda('chave-mar-00000002', 'evt-mar-2');
    expect(enviados).toHaveLength(1);

    // 80 → 120: cruza os R$ 100 — avisa uma vez.
    const terceira = await venda('chave-mar-00000003', 'evt-mar-3');
    expect(enviados).toHaveLength(2);
    expect(enviados[1]!.assunto).toContain('100,00');
    expect(enviados[1]!.texto).toContain('120,00'); // acumulado
    expect(
      (await db.doc(
        `eventos/${EVENTO_ID}/comunicacoes/${logDoc(chaveAvisoMarco(100))}`
      ).get()).exists
    ).toBe(true);

    // Estorno derruba para 80: marco atravessado PARA BAIXO não avisa nada.
    await estornarInscricaoCore(db, provider, {
      pedidoId: terceira.pedidoId, inscritoId: terceira.inscritoIds[0]!,
      motivo: 'Estorno pós-marco',
    }, marina);
    expect(
      (await db.doc(`eventos/${EVENTO_ID}/afiliados/AVISADO1`).get()).get('comissaoAcumulada')
    ).toBe(80);
    expect(enviados).toHaveLength(2);

    // Venda nova traz de volta a 120: a faixa já foi avisada e NÃO rearma.
    await venda('chave-mar-00000004', 'evt-mar-4');
    expect(
      (await db.doc(`eventos/${EVENTO_ID}/afiliados/AVISADO1`).get()).get('comissaoAcumulada')
    ).toBe(120);
    expect(enviados).toHaveLength(2);

    // Nenhum aviso carrega identidade de comprador (RN-318/RN-172).
    const tudo = JSON.stringify(enviados);
    expect(tudo).not.toContain('ana@exemplo.com');
    expect(tudo).not.toContain('Ana Souza');
    expect(tudo).not.toContain('529.982.247-25');
  });

  it('G4: afiliado sem e-mail (clube) não gera aviso nem registro — e a venda segue', async () => {
    await salvarAfiliadoCore(db, {
      eventoId: EVENTO_ID, tipo: 'clube', nome: 'Floripa Run',
      clubeRef: 'floripa-run', refCodigo: 'CLUBEAVI',
      comissao: { tipo: 'valor_fixo', valorPorInscricao: 40 },
    }, marina);
    await db.doc(`eventos/${EVENTO_ID}/afiliados/CLUBEAVI`).update({ status: 'ativo' });
    const { provider: espiao, enviados } = providerEspiao();
    const r = await createInscricaoChargeCore(
      db, provider, chargeInput('chave-avi-00000009', { ref: { codigo: 'CLUBEAVI' } }), caller
    );
    await confirmarPedido(r.pedidoId, 'evt-avi-9', espiao);

    expect(
      (await db.doc(`eventos/${EVENTO_ID}/afiliados/CLUBEAVI`).get()).get('comissaoAcumulada')
    ).toBe(40);
    expect(enviados).toHaveLength(0);
    expect(
      (await db.collection(`eventos/${EVENTO_ID}/comunicacoes`).get()).size
    ).toBe(0);
  });

  // ── H · E08-REV (review antagonista) — o que a G1..G4 não cobria ────────
  // Três buracos de prova que a review encontrou nos vetores de ataque: o
  // replay ADULTERADO (o e-mail podia contar uma história diferente do
  // extrato), o recruzamento REPETIDO da mesma faixa (um e-mail por venda
  // seria ruído em cima de dinheiro), e o servidor SOZINHO contra valores
  // adversariais (a tela é conveniência; a lei é a transação).

  it('H1: replay com input ADULTERADO avisa com o valor do LEDGER, não do input', async () => {
    await afiliadoComComissao('AVISADO1', 'uid-teo', 30);
    const r = await createInscricaoChargeCore(
      db, provider, chargeInput('chave-rev-00000001', { ref: { codigo: 'AVISADO1' } }), caller
    );
    await confirmarPedido(r.pedidoId, 'evt-rev-1');

    // 1ª passagem SEM provedor: o dinheiro entra, o aviso não acontece e —
    // crucial — a chave NÃO é queimada.
    const p1 = await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'AVISADO1', repasseId: 'rev-replay-0001',
      valor: 10, observacao: 'Pix real',
    }, marina, null);
    expect(p1.duplicado).toBe(false);
    expect(p1.saldoComissao).toBe(20);
    expect(
      (await db.doc(
        `eventos/${EVENTO_ID}/comunicacoes/${logDoc(chaveAvisoRepasse('rev-replay-0001'))}`
      ).get()).exists
    ).toBe(false);

    // 2ª passagem: MESMO repasseId, valor ADULTERADO para 25.
    const { provider: espiao, enviados } = providerEspiao();
    const p2 = await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'AVISADO1', repasseId: 'rev-replay-0001',
      valor: 25, observacao: 'Pix adulterado',
    }, marina, espiao);
    expect(p2.duplicado).toBe(true);
    expect(p2.saldoComissao).toBe(20); // o ledger não mudou

    expect(enviados).toHaveLength(1);
    const corpo = `${enviados[0]!.assunto} ${enviados[0]!.texto}`;
    expect(corpo).toContain('10,00');  // valor do LEDGER
    expect(corpo).not.toContain('25,00'); // NUNCA o do input
    expect(corpo).toContain('20,00');  // saldo restante real

    // Ledger continua com o valor original e uma linha só.
    const led = await db.collection(
      `eventos/${EVENTO_ID}/afiliados/AVISADO1/repasses`
    ).get();
    expect(led.size).toBe(1);
    expect(led.docs[0]!.get('valor')).toBe(10);
    expect(led.docs[0]!.get('observacao')).toBe('Pix real');

    // 3ª passagem: já avisado ⇒ nenhum segundo e-mail.
    await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'AVISADO1', repasseId: 'rev-replay-0001',
      valor: 25,
    }, marina, espiao);
    expect(enviados).toHaveLength(1);
  });

  it('H2: recruzar a MESMA faixa 3× cala; um marco NOVO ainda avisa', async () => {
    await afiliadoComComissao('AVISADO1', 'uid-teo', 40);
    const { provider: espiao, enviados } = providerEspiao();
    let n = 0;
    const venda = async (): Promise<{ pedidoId: string; inscritoIds: string[] }> => {
      n += 1;
      const r = await createInscricaoChargeCore(
        db, provider,
        chargeInput(`chave-revb-0000000${n}`, { ref: { codigo: 'AVISADO1' } }),
        caller
      );
      await confirmarPedido(r.pedidoId, `evt-revb-${n}`, espiao);
      return r;
    };
    const acumulada = async (): Promise<number> =>
      (await db.doc(`eventos/${EVENTO_ID}/afiliados/AVISADO1`).get())
        .get('comissaoAcumulada') as number;

    await venda();                    // 40  → marco-primeira
    expect(enviados).toHaveLength(1);
    await venda();                    // 80  → silêncio
    const v3 = await venda();         // 120 → marco-100
    expect(enviados).toHaveLength(2);

    // 1º recruzamento
    await estornarInscricaoCore(db, provider, {
      pedidoId: v3.pedidoId, inscritoId: v3.inscritoIds[0]!, motivo: 'recruz 1',
    }, marina);
    expect(await acumulada()).toBe(80);
    const v4 = await venda();         // 120 de novo
    expect(enviados).toHaveLength(2);

    // 2º recruzamento
    await estornarInscricaoCore(db, provider, {
      pedidoId: v4.pedidoId, inscritoId: v4.inscritoIds[0]!, motivo: 'recruz 2',
    }, marina);
    expect(await acumulada()).toBe(80);
    const v5 = await venda();         // 120
    expect(enviados).toHaveLength(2);

    // 3º recruzamento
    await estornarInscricaoCore(db, provider, {
      pedidoId: v5.pedidoId, inscritoId: v5.inscritoIds[0]!, motivo: 'recruz 3',
    }, marina);
    await venda();                    // 120
    expect(enviados).toHaveLength(2);

    // Marco NOVO: 120 → 160 → 200 cruza os R$ 200 e avisa UMA vez.
    await venda();                    // 160
    expect(enviados).toHaveLength(2);
    await venda();                    // 200
    expect(await acumulada()).toBe(200);
    expect(enviados).toHaveLength(3);
    expect(enviados[2]!.assunto).toContain('200,00');
    expect(
      (await db.doc(
        `eventos/${EVENTO_ID}/comunicacoes/${logDoc(chaveAvisoMarco(200))}`
      ).get()).exists
    ).toBe(true);
    // Exatamente 3 comunicações no evento — uma por faixa única.
    expect((await db.collection(`eventos/${EVENTO_ID}/comunicacoes`).get()).size).toBe(3);
  });

  it('H3: com a tela FORA do circuito, o core recusa sozinho e não deixa rastro', async () => {
    await afiliadoComComissao('AVISADO1', 'uid-teo', 30);
    const r = await createInscricaoChargeCore(
      db, provider, chargeInput('chave-revc-00000001', { ref: { codigo: 'AVISADO1' } }), caller
    );
    await confirmarPedido(r.pedidoId, 'evt-revc-1');

    const ataques: [string, unknown, RegExp][] = [
      ['zero', 0, /cent-exato maior que zero/],
      ['negativo', -10, /cent-exato maior que zero/],
      ['tres casas', 10.005, /cent-exato maior que zero/],
      ['acima do teto', 30.01, /excede o saldo/],
      ['muito acima do teto', 999999, /excede o saldo/],
      ['NaN', Number.NaN, /cent-exato maior que zero/],
      ['string', '10', /cent-exato maior que zero/],
      ['nulo', null, /cent-exato maior que zero/],
      ['infinito', Number.POSITIVE_INFINITY, /cent-exato maior que zero/],
    ];
    let i = 0;
    for (const [nome, valor, esperado] of ataques) {
      i += 1;
      await expect(
        registrarRepasseComissaoCore(db, {
          eventoId: EVENTO_ID, afiliadoId: 'AVISADO1',
          repasseId: `rev-ataque-000${i}`, valor,
        } as never, marina, null),
        nome
      ).rejects.toThrow(esperado);
    }
    // Nenhuma recusa deixou linha no ledger nem mexeu no ∑.
    expect(
      (await db.collection(`eventos/${EVENTO_ID}/afiliados/AVISADO1/repasses`).get()).size
    ).toBe(0);
    expect(
      (await db.doc(`eventos/${EVENTO_ID}/afiliados/AVISADO1`).get()).get('comissaoRepassada')
    ).toBe(0);

    // O ATAQUE A da tela (1.500 → 1.5): o core ACEITA, porque 1,50 é dinheiro
    // legítimo. O servidor não pode salvar de erro de digitação — só a tela.
    const ok = await registrarRepasseComissaoCore(db, {
      eventoId: EVENTO_ID, afiliadoId: 'AVISADO1', repasseId: 'rev-ataque-mil5', valor: 1.5,
    }, marina, null);
    expect(ok.duplicado).toBe(false);
    expect(ok.saldoComissao).toBe(28.5);
  });
});
