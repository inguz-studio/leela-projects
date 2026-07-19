/**
 * requestRefund.integration.test.ts — LEELA-S904-T1/T2/T3 (RN-338/339/340/341/342)
 * (⚠️ EXIGE Firestore Emulator 8080.)
 *
 * Máquina de reembolso ponta a ponta contra o Emulator + Rules REAIS:
 *   - ROTEAMENTO (S305): dentro da janela ⇒ aprovado_auto + estorno NA HORA
 *     (CDC Art. 49); fora da janela ⇒ em_analise; corte ⇒ bloqueado (nada criado);
 *   - DECISÃO: aprovar ⇒ estorno via FABLE-B ⇒ estornado; recusar ⇒ terminal
 *     (sem dinheiro, não reabre);
 *   - DINHEIRO: reusa o primitivo idempotente (valor da linha rateada, receita
 *     revertida, ledger FABLE-B) — replay NÃO duplica refund/reversão;
 *   - TRILHA RN-341: transicoes[] append-only por transição;
 *   - NOTIFICAÇÕES RN-342: organizador na abertura + atleta por transição,
 *     registradas idempotentes no log FABLE-G;
 *   - GUARDS/ATAQUES: athlete/promoter/cross-tenant negados; pedido não pago;
 *     inscrito fora do pedido; Rules — cliente NÃO escreve `reembolsos`
 *     (nem owner), athlete NÃO lê, gestão lê.
 *
 * Comando: npx firebase-tools@13 emulators:exec --only firestore --project demo-leela \
 *   "npx vitest run src/__tests__/requestRefund.integration.test.ts"
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteDoc, doc, getDoc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AuthClaims } from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
  type CreateInscricaoChargeResult,
} from '../checkout/createInscricaoCharge';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import { ESTORNOS_SUBCOL } from '../checkout/estornarInscricao';
import {
  decideRefundCore,
  REEMBOLSOS_SUBCOL,
  requestRefundCore,
} from '../finance/requestRefund';
import { MockPaymentProvider } from '../payments/mockProvider';
import type { EventoCaller } from '../eventos/criarEvento';

const PROJECT_ID = 'demo-leela-refund';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const TENANT_ID = 'castelo-producoes';
const OUTRO_TENANT_ID = 'passo-certo';
const EVENTO_ID = 'meia-floripa-2026';
const ANA_UID = 'uid-ana-atleta';
const MARINA_UID = 'uid-marina';

const organizador: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: TENANT_ID } as AuthClaims,
};
const staffOutroTenant: EventoCaller = {
  uid: 'uid-passo-owner',
  claims: { role: 'tenant_owner', tenantId: OUTRO_TENANT_ID } as AuthClaims,
};
const athlete: EventoCaller = {
  uid: ANA_UID,
  claims: { role: 'athlete' } as AuthClaims,
};
const promoter: EventoCaller = {
  uid: 'uid-prom',
  claims: { role: 'promoter', tenantId: TENANT_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp =>
  Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

async function seed(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('tenants').doc(OUTRO_TENANT_ID), {
    id: OUTRO_TENANT_ID, nome: 'Passo Certo Eventos', slug: OUTRO_TENANT_ID,
    status: 'ativo', ownerUid: 'uid-passo-owner', tipo: 'promotor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
    anticipation: { disponivel: false }, communityMonthlyEnabled: false, saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });
  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: MARINA_UID,
    nome: 'Meia Maratona Floripa 2026', data: tsRel(45), local: 'Florianópolis/SC',
    modalidades: ['5k', '10k', '21k'], slug: EVENTO_ID, status: 'publicado', usaChip: true,
    qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc('10k-l2'), {
    id: '10k-l2', tenantId: TENANT_ID, modalidade: '10k', ordem: 2, nome: 'Lote 2',
    inicioEm: tsRel(-1), fimEm: tsRel(30), quantidadeLimite: 100, preco: 189.9, vendidos: 40,
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('cupons').doc('HEROI10'), {
    id: 'HEROI10', tenantId: TENANT_ID, codigo: 'HEROI10', tipo: 'percentual', valor: 10,
    tetoUso: 100, inicioEm: tsRel(-1), fimEm: tsRel(30), usos: 0, criadoEm: now, atualizadoEm: now,
  });
  // SEM doc de politicaVendas: defaults legais (7d arrependimento / corte 48h)
  await batch.commit();
}

/** Cria um pedido (N inscritos 10k) e o confirma via sandbox. */
async function criarPedidoPago(
  key: string,
  n: number,
  cupomCodigo?: string
): Promise<CreateInscricaoChargeResult> {
  const input: CreateInscricaoChargeInput = {
    eventoId: EVENTO_ID,
    inscritos: Array.from({ length: n }, (_, i) => ({
      nome: `Atleta ${key} ${i + 1}`,
      email: `a${i + 1}.${key}@exemplo.com`,
      cpf: '529.982.247-25',
      modalidade: '10k',
    })),
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    ...(cupomCodigo !== undefined ? { cupomCodigo } : {}),
    idempotencyKey: key,
  };
  const charge = await createInscricaoChargeCore(db, provider, input, { uid: ANA_UID });
  await confirmarPagamentoSandboxCore(db, provider, { pedidoId: charge.pedidoId }, { uid: ANA_UID });
  return charge;
}

/** Backdata a compra (compradoEm) — força o roteamento fora da janela. */
async function backdatarPedido(pedidoId: string, dias: number): Promise<void> {
  await db.doc(`pedidos/${pedidoId}`).update({ criadoEm: tsRel(-dias) });
}

const reembolsoRefDe = (inscritoId: string) =>
  db.doc(`eventos/${EVENTO_ID}/${REEMBOLSOS_SUBCOL}/${inscritoId}`);

async function receitaConfirmada(): Promise<number> {
  return (await db.doc(`eventos/${EVENTO_ID}`).get()).get('receitaConfirmada') as number;
}

/** Nº de registros no log de comunicação referentes a um inscrito/uid. */
async function comunicacoesDe(ref: string): Promise<number> {
  const snap = await db
    .collection(`eventos/${EVENTO_ID}/comunicacoes`)
    .where('destinatario.ref', '==', ref)
    .get();
  return snap.size;
}

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
  db = admin.firestore();
  await testEnv.clearFirestore();
  await seed();
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

// ─────────────────────────────────────────────────────────────────────────────
// aprovado_auto (janela de arrependimento) — grupo com cupom, dinheiro exato
// ─────────────────────────────────────────────────────────────────────────────

describe('aprovado_auto — dentro da janela (RN-338/CDC Art. 49)', () => {
  const KEY = 'refund-auto-0001';
  let pedidoId = '';
  let pagamentoId = '';
  let inscritoIds: string[] = [];
  let receitaBase = 0;

  beforeAll(async () => {
    const charge = await criarPedidoPago(KEY, 3, 'HEROI10');
    pedidoId = charge.pedidoId;
    pagamentoId = charge.pagamentoId;
    inscritoIds = charge.inscritoIds;
    receitaBase = await receitaConfirmada(); // 3×189,90 −10% = 512,73
    expect(receitaBase).toBe(512.73);
  }, 60_000);

  it('abre + roteia aprovado_auto + EXECUTA o estorno na hora (linha rateada)', async () => {
    const alvo = inscritoIds[1]!;
    const r = await requestRefundCore(db, provider, {
      pedidoId, inscritoId: alvo, motivo: 'Atleta desistiu (arrependimento)',
    }, organizador);

    expect(r.estado).toBe('estornado');
    expect(r.replay).toBe(false);
    expect(r.valorEstornado).toBe(170.91); // 189,90 − rateio do cupom
    expect(r.refundId).toBeTruthy();

    // Reembolso: doc com trilha completa solicitado→aprovado_auto→estornado
    const snap = await reembolsoRefDe(alvo).get();
    expect(snap.get('estado')).toBe('estornado');
    expect(snap.get('valorSolicitado')).toBe(170.91);
    expect(snap.get('valorEstornado')).toBe(170.91);
    expect(snap.get('refundId')).toBe(r.refundId);
    expect(snap.get('origem')).toBe('organizador');
    const transicoes = snap.get('transicoes') as Array<{ de: string; para: string; por: string }>;
    expect(transicoes.map((t) => `${t.de}>${t.para}`)).toEqual([
      'solicitado>aprovado_auto',
      'aprovado_auto>estornado',
    ]);

    // Dinheiro: FABLE-B fez o serviço (inscrito, receita, ledger)
    const inscrito = await db.doc(`eventos/${EVENTO_ID}/inscritos/${alvo}`).get();
    expect(inscrito.get('status')).toBe('estornado');
    expect(await receitaConfirmada()).toBe(341.82);
    const ledger = await db.doc(`pagamentos/${pagamentoId}/${ESTORNOS_SUBCOL}/${alvo}`).get();
    expect(ledger.get('status')).toBe('aprovado');

    // Notificações RN-342: organizador (abertura) + atleta (recibo,
    // aprovado-auto, estornado)
    expect(await comunicacoesDe(MARINA_UID)).toBe(1);
    expect(await comunicacoesDe(alvo)).toBe(3);
  });

  it('ISOLAMENTO ADR-011: os outros 2 inscritos e o pedido seguem intactos', async () => {
    for (const id of [inscritoIds[0]!, inscritoIds[2]!]) {
      const snap = await db.doc(`eventos/${EVENTO_ID}/inscritos/${id}`).get();
      expect(snap.get('status')).toBe('confirmado');
      expect((await reembolsoRefDe(id).get()).exists).toBe(false);
    }
    expect((await db.doc(`pedidos/${pedidoId}`).get()).get('status')).toBe('pago');
  });

  it('REPLAY idempotente: repetir NÃO duplica dinheiro nem notificação', async () => {
    const alvo = inscritoIds[1]!;
    const r = await requestRefundCore(db, provider, {
      pedidoId, inscritoId: alvo, motivo: 'Retry da mesma solicitação',
    }, organizador);
    expect(r.estado).toBe('estornado');
    expect(r.replay).toBe(true);
    expect(await receitaConfirmada()).toBe(341.82);
    const transicoes = (await reembolsoRefDe(alvo).get()).get('transicoes') as unknown[];
    expect(transicoes).toHaveLength(2); // trilha NÃO cresce no replay
    expect(await comunicacoesDe(alvo)).toBe(3);
    expect(await comunicacoesDe(MARINA_UID)).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// em_analise (fora da janela) — decidir: recusar (terminal) e aprovar (executa)
// ─────────────────────────────────────────────────────────────────────────────

describe('em_analise — fora da janela (RN-340) + decisão do organizador', () => {
  it('recusar: terminal, sem dinheiro, NÃO reabre; aprovar depois falha', async () => {
    const charge = await criarPedidoPago('refund-rec-0001', 1);
    await backdatarPedido(charge.pedidoId, 10); // compra há 10d > janela 7d
    const alvo = charge.inscritoIds[0]!;
    const receitaAntes = await receitaConfirmada();

    const r = await requestRefundCore(db, provider, {
      pedidoId: charge.pedidoId, inscritoId: alvo, motivo: 'Mudou de ideia tarde',
    }, organizador);
    expect(r.estado).toBe('em_analise');

    const d = await decideRefundCore(db, provider, {
      eventoId: EVENTO_ID, inscritoId: alvo, decisao: 'recusar', motivo: 'Fora da política',
    }, organizador);
    expect(d.estado).toBe('recusado');

    // Sem dinheiro movido; inscrito segue confirmado
    expect(await receitaConfirmada()).toBe(receitaAntes);
    const inscrito = await db.doc(`eventos/${EVENTO_ID}/inscritos/${alvo}`).get();
    expect(inscrito.get('status')).toBe('confirmado');
    const snap = await reembolsoRefDe(alvo).get();
    expect(snap.get('estado')).toBe('recusado');
    expect(snap.get('decididoPor')).toBe(MARINA_UID);
    expect(snap.get('motivoDecisao')).toBe('Fora da política');

    // Terminal: reabrir falha; aprovar depois de recusado falha (RN-341)
    await expect(
      requestRefundCore(db, provider, {
        pedidoId: charge.pedidoId, inscritoId: alvo, motivo: 'Tentando de novo',
      }, organizador)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(
      decideRefundCore(db, provider, {
        eventoId: EVENTO_ID, inscritoId: alvo, decisao: 'aprovar',
      }, organizador)
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    // Notificações: recibo + em-analise + recusado ao atleta; 1 ao organizador
    expect(await comunicacoesDe(alvo)).toBe(3);
  });

  it('aprovar: em_analise → aprovado → estorno FABLE-B → estornado', async () => {
    const charge = await criarPedidoPago('refund-apr-0001', 2);
    await backdatarPedido(charge.pedidoId, 10);
    const alvo = charge.inscritoIds[0]!;
    const receitaAntes = await receitaConfirmada();

    const r = await requestRefundCore(db, provider, {
      pedidoId: charge.pedidoId, inscritoId: alvo, motivo: 'Lesionado, sem prova',
    }, organizador);
    expect(r.estado).toBe('em_analise');

    const d = await decideRefundCore(db, provider, {
      eventoId: EVENTO_ID, inscritoId: alvo, decisao: 'aprovar',
    }, organizador);
    expect(d.estado).toBe('estornado');
    expect(d.valorEstornado).toBe(189.9);
    expect(d.refundId).toBeTruthy();

    const snap = await reembolsoRefDe(alvo).get();
    const transicoes = snap.get('transicoes') as Array<{ de: string; para: string }>;
    expect(transicoes.map((t) => `${t.de}>${t.para}`)).toEqual([
      'solicitado>em_analise',
      'em_analise>aprovado',
      'aprovado>estornado',
    ]);

    // L3 (review): retry da decisão bem-sucedida = replay limpo, nunca erro
    const dReplay = await decideRefundCore(db, provider, {
      eventoId: EVENTO_ID, inscritoId: alvo, decisao: 'aprovar',
    }, organizador);
    expect(dReplay.estado).toBe('estornado');
    expect(dReplay.replay).toBe(true);
    expect(await receitaConfirmada()).toBe(receitaAntes - 189.9);
    // O outro inscrito do pedido segue intacto (ADR-011)
    const outro = await db.doc(`eventos/${EVENTO_ID}/inscritos/${charge.inscritoIds[1]!}`).get();
    expect(outro.get('status')).toBe('confirmado');
    // Notificações: recibo + em-analise + aprovado + estornado
    expect(await comunicacoesDe(alvo)).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// bloqueado_corte (RN-339) — nada criado
// ─────────────────────────────────────────────────────────────────────────────

describe('bloqueado_corte — solicitação a ≤48h do evento (RN-339)', () => {
  it('rejeita a abertura e NÃO cria reembolso', async () => {
    const charge = await criarPedidoPago('refund-corte-0001', 1);
    const alvo = charge.inscritoIds[0]!;
    // Evento daqui a 24h (< corte 48h) — muda e RESTAURA no fim
    await db.doc(`eventos/${EVENTO_ID}`).update({ data: tsRel(1) });
    try {
      await expect(
        requestRefundCore(db, provider, {
          pedidoId: charge.pedidoId, inscritoId: alvo, motivo: 'Em cima da hora',
        }, organizador)
      ).rejects.toMatchObject({ code: 'failed-precondition' });
      expect((await reembolsoRefDe(alvo).get()).exists).toBe(false);
      expect(await comunicacoesDe(alvo)).toBe(0);
    } finally {
      await db.doc(`eventos/${EVENTO_ID}`).update({ data: tsRel(45) });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Guards de papel/tenant/estado + ataques via Rules
// ─────────────────────────────────────────────────────────────────────────────

describe('guards e ataques', () => {
  let pedidoId = '';
  let alvo = '';

  beforeAll(async () => {
    const charge = await criarPedidoPago('refund-guard-0001', 1);
    pedidoId = charge.pedidoId;
    alvo = charge.inscritoIds[0]!;
  }, 60_000);

  it('papel: athlete e promoter NÃO abrem nem decidem (permission-denied)', async () => {
    for (const caller of [athlete, promoter]) {
      await expect(
        requestRefundCore(db, provider, { pedidoId, inscritoId: alvo, motivo: 'hack' }, caller)
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        decideRefundCore(db, provider, {
          eventoId: EVENTO_ID, inscritoId: alvo, decisao: 'aprovar',
        }, caller)
      ).rejects.toMatchObject({ code: 'permission-denied' });
    }
  });

  it('cross-tenant: owner de OUTRO tenant não abre nem decide (RN-400)', async () => {
    await expect(
      requestRefundCore(db, provider, {
        pedidoId, inscritoId: alvo, motivo: 'ataque cross-tenant',
      }, staffOutroTenant)
    ).rejects.toMatchObject({ code: 'permission-denied' });
    // L1 (review): a porta de DECISÃO também nega cross-tenant — precisa de
    // um reembolso existente do tenant A para o owner de B atacar.
    const charge = await criarPedidoPago('refund-xtenant-0001', 1);
    await backdatarPedido(charge.pedidoId, 10);
    await requestRefundCore(db, provider, {
      pedidoId: charge.pedidoId, inscritoId: charge.inscritoIds[0]!, motivo: 'base p/ ataque',
    }, organizador);
    await expect(
      decideRefundCore(db, provider, {
        eventoId: EVENTO_ID, inscritoId: charge.inscritoIds[0]!, decisao: 'aprovar',
      }, staffOutroTenant)
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('estado/vínculo: pedido não pago, inscrito de outro pedido, motivo inválido', async () => {
    // Pedido pendente (charge criada sem confirmar)
    const pendente = await createInscricaoChargeCore(db, provider, {
      eventoId: EVENTO_ID,
      inscritos: [{ nome: 'Pend Ente', email: 'p@e.com', cpf: '529.982.247-25', modalidade: '10k' }],
      responsavelIndex: 0,
      responsavel: { nome: 'Pend Ente', email: 'p@e.com' },
      aceites: { termos: true, saude: true },
      forma: 'pix', parcelas: 1, idempotencyKey: 'refund-pend-0001',
    }, { uid: ANA_UID });
    await expect(
      requestRefundCore(db, provider, {
        pedidoId: pendente.pedidoId, inscritoId: pendente.inscritoIds[0]!, motivo: 'não pago',
      }, organizador)
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    // Inscrito que NÃO pertence ao pedido (ADR-011)
    await expect(
      requestRefundCore(db, provider, {
        pedidoId, inscritoId: pendente.inscritoIds[0]!, motivo: 'linha alheia',
      }, organizador)
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    // Motivo curto
    await expect(
      requestRefundCore(db, provider, { pedidoId, inscritoId: alvo, motivo: 'x' }, organizador)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('Rules: cliente NÃO escreve reembolsos (nem owner); athlete NÃO lê; gestão lê', async () => {
    // Semeia um reembolso de verdade para o teste de leitura
    await requestRefundCore(db, provider, {
      pedidoId, inscritoId: alvo, motivo: 'Base p/ ataque de Rules',
    }, organizador);

    const ownerDb = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: TENANT_ID });
    const athleteDb = dbAs(ANA_UID, { role: 'athlete' });
    const caminho = ['eventos', EVENTO_ID, REEMBOLSOS_SUBCOL, alvo] as const;

    // Escrita de cliente: negada para TODOS (owner incluso)
    await assertFails(setDoc(doc(ownerDb, ...caminho), { estado: 'estornado' }));
    await assertFails(updateDoc(doc(ownerDb, ...caminho), { estado: 'estornado' }));
    await assertFails(deleteDoc(doc(ownerDb, ...caminho)));
    await assertFails(
      setDoc(doc(athleteDb, 'eventos', EVENTO_ID, REEMBOLSOS_SUBCOL, 'forjado'), {
        estado: 'estornado', valorEstornado: 99999,
      })
    );

    // Leitura: gestão sim; athlete não
    await assertSucceeds(getDoc(doc(ownerDb, ...caminho)));
    await assertFails(getDoc(doc(athleteDb, ...caminho)));
  });
});
