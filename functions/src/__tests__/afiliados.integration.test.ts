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
import type { AuthClaims } from '@leela/core';
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
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { cotarInscricaoCheckoutCore } from '../checkout/cotarInscricaoCheckout';
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

  beforeEach(async () => {
    await testEnv.clearFirestore();
    const users = await auth.listUsers(1000);
    await Promise.all(users.users.map((u) => auth.deleteUser(u.uid)));
    await seed();
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
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
    ...extra,
  });

  const caller = { uid: 'uid-ana' };

  async function confirmarPedido(pedidoId: string, eventId: string): Promise<void> {
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
    await processarWebhookPagamento(db, provider, payload);
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

  it('C6: PF com conta JÁ existente no cadastro = vínculo imediato (sem convite/token)', async () => {
    const user = await auth.createUser({ email: 'dioney@exemplo.com' });
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

  it('C8 (fix review): reenvio quando o e-mail vigente JÁ tem conta = vínculo imediato no update (token morto)', async () => {
    const tokenAntigo = await convitePF();
    const user = await auth.createUser({ email: 'dioney@exemplo.com' });
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
    const r2 = await createInscricaoChargeCore(
      db, provider,
      chargeInput('chave-ref-00000003', { ref: { codigo: 'INATIVO1' } }),
      caller
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
});
