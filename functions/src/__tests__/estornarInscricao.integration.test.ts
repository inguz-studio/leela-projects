/**
 * estornarInscricao.integration.test.ts — LEELA-FABLE-B (ADR-011 · RN-337/341)
 *
 * Integração + ATAQUES (⚠️ EXIGE Firestore Emulator na 8080): estorno POR
 * INSCRITO do pedido em grupo contra o MockPaymentProvider e as Security
 * Rules REAIS. Prova:
 *   - caminho feliz: flip confirmado→estornado + reversão da receita pelo
 *     valor da LINHA (com desconto rateado) + ledger de auditoria;
 *   - ISOLAMENTO: os demais inscritos do pedido ficam intactos;
 *   - IDEMPOTÊNCIA: reexecutar o MESMO estorno não duplica refund/reversão;
 *   - crash-recovery: ledger 'pendente' órfão (crash entre TX1 e refund) é
 *     retomado sem refund duplicado (valor CONGELADO do ledger);
 *   - estorno integral: Σ estornos == valorFinal → pagamento 'estornado';
 *   - guards: athlete/promoter/cross-tenant negados; pedido não pago,
 *     inscrito cancelado, inscrito de outro pedido, motivo ausente;
 *   - ATAQUES via Rules (cliente): forjar status 'estornado', forjar
 *     estornadoEm, ressuscitar inscrito estornado, escrever no ledger.
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
import { parseInscrito, roundMoney, type AuthClaims } from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
  type CreateInscricaoChargeResult,
} from '../checkout/createInscricaoCharge';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import {
  ESTORNOS_SUBCOL,
  estornarInscricaoCore,
} from '../checkout/estornarInscricao';
import { MockPaymentProvider } from '../payments/mockProvider';
import type { EventoCaller } from '../eventos/criarEvento';

const PROJECT_ID = 'demo-leela-estorno';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const TENANT_ID = 'castelo-producoes';
const OUTRO_TENANT_ID = 'passo-certo';
const EVENTO_ID = 'meia-floripa-2026';
const ANA_UID = 'uid-ana-atleta';
const MARINA_UID = 'uid-marina';

/** Organizador do tenant dono (papel de escrita — RN-401). */
const organizador: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: TENANT_ID } as AuthClaims,
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

/** Seed espelho da suíte S1203 (+ segundo tenant p/ guard cross-tenant). */
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
  await batch.commit();
}

/** Cria um pedido (N inscritos 10k) e o confirma via webhook sandbox. */
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
    forma: 'pix',
    parcelas: 1,
    ...(cupomCodigo !== undefined ? { cupomCodigo } : {}),
    idempotencyKey: key,
  };
  const charge = await createInscricaoChargeCore(db, provider, input, { uid: ANA_UID });
  await confirmarPagamentoSandboxCore(db, provider, { pedidoId: charge.pedidoId }, { uid: ANA_UID });
  return charge;
}

async function receitaConfirmada(): Promise<number> {
  return (await db.doc(`eventos/${EVENTO_ID}`).get()).get('receitaConfirmada') as number;
}

function inscritoRefDe(inscritoId: string) {
  return db.doc(`eventos/${EVENTO_ID}/inscritos/${inscritoId}`);
}

function ledgerRefDe(pagamentoId: string, inscritoId: string) {
  return db.doc(`pagamentos/${pagamentoId}/${ESTORNOS_SUBCOL}/${inscritoId}`);
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
});

// ─────────────────────────────────────────────────────────────────────────────
// Caminho feliz · isolamento · idempotência (pedido em grupo COM cupom —
// o valor da linha carrega o desconto RATEADO: 189,90 − 18,99 = 170,91)
// ─────────────────────────────────────────────────────────────────────────────

describe('estorno por inscrito — grupo de 3 com cupom (ADR-011/RN-341)', () => {
  const KEY = 'estorno-grupo-0001';
  let pedidoId = '';
  let pagamentoId = '';
  let inscritoIds: string[] = [];

  beforeAll(async () => {
    const charge = await criarPedidoPago(KEY, 3, 'HEROI10');
    pedidoId = charge.pedidoId;
    pagamentoId = charge.pagamentoId;
    inscritoIds = charge.inscritoIds;
    // Baseline: 3 × 189,90 = 569,70 − 10% = 512,73 confirmados na receita
    expect(charge.valores.valorFinal).toBe(512.73);
    expect(await receitaConfirmada()).toBe(512.73);
  }, 60_000);

  it('estorna UM inscrito: flip + carimbo + reversão EXATA da linha rateada', async () => {
    const alvo = inscritoIds[1]!;
    const r = await estornarInscricaoCore(db, provider, {
      pedidoId, inscritoId: alvo, motivo: 'Atleta desistiu da prova',
    }, organizador);

    expect(r.duplicado).toBe(false);
    expect(r.valorEstornado).toBe(170.91); // 189,90 − rateio do cupom (18,99)
    expect(r.refundId).toBeTruthy();
    expect(r.pagamentoEstornadoIntegral).toBe(false);

    // Inscrito estornado + carimbo, e o doc PASSA no parse de coerência
    const snap = await inscritoRefDe(alvo).get();
    expect(snap.get('status')).toBe('estornado');
    expect(snap.get('estornadoEm')).toBeTruthy();
    expect(() => parseInscrito(snap.id, snap.data() as Record<string, unknown>)).not.toThrow();

    // Receita revertida EXATAMENTE pela linha (512,73 − 170,91 = 341,82)
    expect(await receitaConfirmada()).toBe(341.82);

    // Pagamento acumula o estornado e segue confirmado (parcial no grupo)
    const pag = await db.doc(`pagamentos/${pagamentoId}`).get();
    expect(pag.get('estornadoTotal')).toBe(170.91);
    expect(pag.get('status')).toBe('confirmado');

    // Gateway estornou UMA vez o valor exato da linha (centavos)
    const chargeId = pag.get('gatewayChargeId') as string;
    expect(provider.getCharge(chargeId)?.refundedAmount).toBe(17091);
  });

  it('ISOLAMENTO: os outros 2 inscritos do pedido seguem confirmados', async () => {
    for (const id of [inscritoIds[0]!, inscritoIds[2]!]) {
      const snap = await inscritoRefDe(id).get();
      expect(snap.get('status')).toBe('confirmado');
      expect(snap.get('estornadoEm')).toBeUndefined();
    }
    // Pedido segue 'pago' — estorno NUNCA opera no pedido inteiro (ADR-011)
    expect((await db.doc(`pedidos/${pedidoId}`).get()).get('status')).toBe('pago');
  });

  it('AUDITORIA: ledger registra quem/quando/quanto/motivo + prova do gateway', async () => {
    const ledger = await ledgerRefDe(pagamentoId, inscritoIds[1]!).get();
    expect(ledger.exists).toBe(true);
    expect(ledger.get('status')).toBe('aprovado');
    expect(ledger.get('solicitadoPor')).toBe(MARINA_UID); // quem
    expect(ledger.get('motivo')).toBe('Atleta desistiu da prova'); // motivo
    expect(ledger.get('valor')).toBe(170.91); // quanto (R$)
    expect(ledger.get('valorCentavos')).toBe(17091); // quanto (borda gateway)
    expect(ledger.get('refundId')).toBeTruthy(); // prova do gateway
    expect(ledger.get('criadoEm')).toBeTruthy(); // quando (compromisso)
    expect(ledger.get('processadoEm')).toBeTruthy(); // quando (efeito)
    expect(ledger.get('pedidoId')).toBe(pedidoId);
    expect(ledger.get('tenantId')).toBe(TENANT_ID);
  });

  it('IDEMPOTÊNCIA: reexecutar o MESMO estorno não duplica NADA', async () => {
    const alvo = inscritoIds[1]!;
    const r = await estornarInscricaoCore(db, provider, {
      pedidoId, inscritoId: alvo, motivo: 'Retry do mesmo estorno',
    }, organizador);

    expect(r.duplicado).toBe(true);
    expect(r.valorEstornado).toBe(170.91);

    // Receita NÃO re-reverteu; gateway NÃO re-estornou; acumulado intacto
    expect(await receitaConfirmada()).toBe(341.82);
    const pag = await db.doc(`pagamentos/${pagamentoId}`).get();
    expect(pag.get('estornadoTotal')).toBe(170.91);
    const chargeId = pag.get('gatewayChargeId') as string;
    expect(provider.getCharge(chargeId)?.refundedAmount).toBe(17091);
    // E o motivo ORIGINAL da auditoria não foi sobrescrito pelo retry
    const ledger = await ledgerRefDe(pagamentoId, alvo).get();
    expect(ledger.get('motivo')).toBe('Atleta desistiu da prova');
  });

  it('estornar os DEMAIS → pagamento integralmente estornado; receita da venda zerada', async () => {
    const r1 = await estornarInscricaoCore(db, provider, {
      pedidoId, inscritoId: inscritoIds[0]!, motivo: 'Cancelamento do grupo',
    }, organizador);
    expect(r1.pagamentoEstornadoIntegral).toBe(false);

    const r2 = await estornarInscricaoCore(db, provider, {
      pedidoId, inscritoId: inscritoIds[2]!, motivo: 'Cancelamento do grupo',
    }, organizador);
    expect(r2.pagamentoEstornadoIntegral).toBe(true);

    expect(await receitaConfirmada()).toBe(0); // 341,82 − 170,91 − 170,91
    const pag = await db.doc(`pagamentos/${pagamentoId}`).get();
    expect(pag.get('estornadoTotal')).toBe(512.73);
    expect(pag.get('status')).toBe('estornado'); // confirmado → estornado (matriz)
    const chargeId = pag.get('gatewayChargeId') as string;
    expect(provider.getCharge(chargeId)?.status).toBe('refunded');
    expect(provider.getCharge(chargeId)?.refundedAmount).toBe(51273);
  });

  it('após o integral, replay de qualquer inscrito segue idempotente (não erro)', async () => {
    const r = await estornarInscricaoCore(db, provider, {
      pedidoId, inscritoId: inscritoIds[0]!, motivo: 'Retry pós-integral',
    }, organizador);
    expect(r.duplicado).toBe(true);
    expect(await receitaConfirmada()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Crash-recovery (at-least-once): ledger 'pendente' órfão é retomado
// ─────────────────────────────────────────────────────────────────────────────

describe('crash-recovery — ledger pendente (crash entre TX1 e refund)', () => {
  it('retoma a saga com o valor CONGELADO, sem refund duplicado', async () => {
    const charge = await criarPedidoPago('estorno-crash-0001', 1);
    const receitaAntes = await receitaConfirmada();
    const inscritoId = charge.inscritoIds[0]!;
    const pag = await db.doc(`pagamentos/${charge.pagamentoId}`).get();
    const chargeId = pag.get('gatewayChargeId') as string;

    // Simula o crash APÓS TX1: compromisso persistido, refund nunca disparado
    await ledgerRefDe(charge.pagamentoId, inscritoId).set({
      pedidoId: charge.pedidoId, inscritoId, eventoId: EVENTO_ID, tenantId: TENANT_ID,
      chargeId, valor: 189.9, valorCentavos: 18990,
      motivo: 'Compromisso órfão de crash', solicitadoPor: MARINA_UID,
      status: 'pendente', criadoEm: FieldValue.serverTimestamp(),
    });

    const r = await estornarInscricaoCore(db, provider, {
      pedidoId: charge.pedidoId, inscritoId, motivo: 'Retry pós-crash',
    }, organizador);

    expect(r.duplicado).toBe(false);
    expect(r.valorEstornado).toBe(189.9); // congelado no ledger
    expect(r.pagamentoEstornadoIntegral).toBe(true); // pedido de 1 inscrito
    expect((await inscritoRefDe(inscritoId).get()).get('status')).toBe('estornado');
    expect(await receitaConfirmada()).toBe(roundMoney(receitaAntes - 189.9));
    expect(provider.getCharge(chargeId)?.refundedAmount).toBe(18990); // UMA vez
    expect((await ledgerRefDe(charge.pagamentoId, inscritoId).get()).get('status')).toBe('aprovado');
  }, 60_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// Guards (Schneier) — papel, tenant, estado
// ─────────────────────────────────────────────────────────────────────────────

describe('guards do estorno — quem NÃO pode e o que NÃO estorna', () => {
  let pedidoId = '';
  let inscritoId = '';

  beforeAll(async () => {
    const charge = await criarPedidoPago('estorno-guards-0001', 1);
    pedidoId = charge.pedidoId;
    inscritoId = charge.inscritoIds[0]!;
  }, 60_000);

  const inputValido = () => ({ pedidoId, inscritoId, motivo: 'Teste de guard' });

  it('athlete NÃO estorna (permission-denied — RN-401)', async () => {
    await expect(
      estornarInscricaoCore(db, provider, inputValido(), {
        uid: ANA_UID, claims: { role: 'athlete' } as AuthClaims,
      })
    ).rejects.toThrow(/RN-401/);
  });

  it('promoter NÃO estorna, mesmo com tenantId do tenant dono', async () => {
    await expect(
      estornarInscricaoCore(db, provider, inputValido(), {
        uid: 'uid-promoter', claims: { role: 'promoter', tenantId: TENANT_ID } as AuthClaims,
      })
    ).rejects.toThrow(/RN-401/);
  });

  it('organizador de OUTRO tenant NÃO estorna pedido alheio (RN-400)', async () => {
    await expect(
      estornarInscricaoCore(db, provider, inputValido(), {
        uid: 'uid-passo-owner',
        claims: { role: 'tenant_owner', tenantId: OUTRO_TENANT_ID } as AuthClaims,
      })
    ).rejects.toThrow(/outro tenant/);
  });

  it('motivo ausente → invalid-argument (auditoria é obrigatória)', async () => {
    await expect(
      estornarInscricaoCore(db, provider, { pedidoId, inscritoId }, organizador)
    ).rejects.toThrow(/motivo/);
  });

  it('pedido NÃO pago (pendente) → failed-precondition', async () => {
    const input: CreateInscricaoChargeInput = {
      eventoId: EVENTO_ID,
      inscritos: [{ nome: 'Beto Pendente', email: 'beto@exemplo.com', cpf: '529.982.247-25', modalidade: '10k' }],
      responsavelIndex: 0,
      responsavel: { nome: 'Beto Pendente', email: 'beto@exemplo.com' },
      forma: 'pix', parcelas: 1, idempotencyKey: 'estorno-pendente-0001',
    };
    const charge = await createInscricaoChargeCore(db, provider, input, { uid: ANA_UID });
    await expect(
      estornarInscricaoCore(db, provider, {
        pedidoId: charge.pedidoId, inscritoId: charge.inscritoIds[0]!, motivo: 'Guard pendente',
      }, organizador)
    ).rejects.toThrow(/só pedido pago/);
  });

  it('inscrito CANCELADO não estorna (não há devolução sem pagamento vigente)', async () => {
    const charge = await criarPedidoPago('estorno-cancelado-0001', 2);
    const alvo = charge.inscritoIds[1]!;
    await inscritoRefDe(alvo).update({ status: 'cancelado' });
    await expect(
      estornarInscricaoCore(db, provider, {
        pedidoId: charge.pedidoId, inscritoId: alvo, motivo: 'Guard cancelado',
      }, organizador)
    ).rejects.toThrow(/só inscrição\s+confirmada/);
  });

  it('inscrito de OUTRO pedido → failed-precondition (linha não pertence)', async () => {
    await expect(
      estornarInscricaoCore(db, provider, {
        pedidoId, inscritoId: 'ped-alheio-i1', motivo: 'Guard pertence',
      }, organizador)
    ).rejects.toThrow(/não pertence ao pedido/);
  });

  it('ATAQUE: campo "valor" no input é ignorado — estorno sai pela linha do servidor', async () => {
    const charge = await criarPedidoPago('estorno-valor-0001', 1);
    const r = await estornarInscricaoCore(db, provider, {
      pedidoId: charge.pedidoId, inscritoId: charge.inscritoIds[0]!,
      motivo: 'Ataque de valor', valor: 0.01, amount: 1,
    }, organizador);
    expect(r.valorEstornado).toBe(189.9); // pedido.itens[] — nunca o cliente
    const pag = await db.doc(`pagamentos/${charge.pagamentoId}`).get();
    expect(provider.getCharge(pag.get('gatewayChargeId') as string)?.refundedAmount).toBe(18990);
  }, 60_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// Ataques via Rules — cliente NUNCA escreve estado de estorno
// ─────────────────────────────────────────────────────────────────────────────

describe('Rules — status/campos de estorno são writer-only (Function)', () => {
  const marinaClaims = { role: 'tenant_owner', tenantId: TENANT_ID };
  let pedidoId = '';
  let pagamentoId = '';
  let confirmadoId = '';
  let estornadoId = '';

  beforeAll(async () => {
    const charge = await criarPedidoPago('estorno-rules-0001', 2);
    pedidoId = charge.pedidoId;
    pagamentoId = charge.pagamentoId;
    confirmadoId = charge.inscritoIds[0]!;
    estornadoId = charge.inscritoIds[1]!;
    await estornarInscricaoCore(db, provider, {
      pedidoId, inscritoId: estornadoId, motivo: 'Setup dos testes de Rules',
    }, organizador);
  }, 60_000);

  const inscritoDoc = (fs: Firestore, id: string) =>
    doc(fs, 'eventos', EVENTO_ID, 'inscritos', id);
  const ledgerDoc = (fs: Firestore, id: string) =>
    doc(fs, 'pagamentos', pagamentoId, ESTORNOS_SUBCOL, id);

  it('CONTROLE: organizador ainda atualiza status DENTRO do enum de cliente', async () => {
    // Prova que os denies abaixo vêm da TRAVA do estorno, não de quebra geral
    const fs = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(updateDoc(inscritoDoc(fs, confirmadoId), { atletaNome: 'Atleta Renomeado' }));
  });

  it('ATAQUE: forjar status "estornado" via cliente → NEGADO (fora do enum)', async () => {
    const fs = dbAs(MARINA_UID, marinaClaims);
    await assertFails(updateDoc(inscritoDoc(fs, confirmadoId), { status: 'estornado' }));
  });

  it('ATAQUE: forjar carimbo estornadoEm via cliente → NEGADO (campo de Function)', async () => {
    const fs = dbAs(MARINA_UID, marinaClaims);
    await assertFails(updateDoc(inscritoDoc(fs, confirmadoId), { estornadoEm: new Date() }));
  });

  it('ATAQUE: ressuscitar inscrito estornado (status → confirmado) → NEGADO', async () => {
    const fs = dbAs(MARINA_UID, marinaClaims);
    await assertFails(updateDoc(inscritoDoc(fs, estornadoId), { status: 'confirmado' }));
  });

  it('ATAQUE: doc estornado é CONGELADO para cliente (qualquer update) → NEGADO', async () => {
    const fs = dbAs(MARINA_UID, marinaClaims);
    await assertFails(updateDoc(inscritoDoc(fs, estornadoId), { atletaNome: 'Fantasma' }));
  });

  it('ATAQUE: apagar inscrito estornado (delete+recreate limparia a marca) → NEGADO', async () => {
    const fs = dbAs(MARINA_UID, marinaClaims);
    await assertFails(deleteDoc(inscritoDoc(fs, estornadoId)));
  });

  it('ATAQUE: criar/alterar/apagar o ledger de estorno via cliente → NEGADO', async () => {
    const fs = dbAs(MARINA_UID, marinaClaims);
    await assertFails(setDoc(ledgerDoc(fs, confirmadoId), {
      tenantId: TENANT_ID, valor: 99999, valorCentavos: 9999900,
      status: 'aprovado', motivo: 'forjado', solicitadoPor: MARINA_UID,
    }));
    await assertFails(updateDoc(ledgerDoc(fs, estornadoId), { valor: 99999 }));
    await assertFails(deleteDoc(ledgerDoc(fs, estornadoId)));
  });

  it('LEITURA do ledger: organizador dono lê a auditoria; athlete NÃO', async () => {
    const fsDono = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(getDoc(ledgerDoc(fsDono, estornadoId)));
    const fsAtleta = dbAs(ANA_UID, { role: 'athlete' });
    await assertFails(getDoc(ledgerDoc(fsAtleta, estornadoId)));
  });

  it('ATAQUE: escrever pagamentos.estornadoTotal via cliente → NEGADO (write false)', async () => {
    const fs = dbAs(MARINA_UID, marinaClaims);
    await assertFails(updateDoc(doc(fs, 'pagamentos', pagamentoId), { estornadoTotal: 0 }));
  });
});
