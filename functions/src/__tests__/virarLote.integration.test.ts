/**
 * virarLote.integration.test.ts — LEELA-S300-T2 (E04 · RN-300 · ADR-012)
 *
 * Integração + ATAQUES (⚠️ EXIGE Firestore Emulator na 8080): Function de
 * virada de lote contra docs REAIS (checkout de verdade incluído) e Security
 * Rules reais. Prova:
 *   - ACEITE RN-300: 100ª venda confirmada num lote `quantidadeLimite=100` →
 *     carimbo 'quantidade' + próximo da MESMA modalidade ativo (derivação do
 *     kernel); modalidade vizinha INTOCADA;
 *   - cron (data): `fimEm` no passado → carimbo 'data'; lotes futuros e
 *     eventos vizinhos intocados; re-scan é no-op;
 *   - IDEMPOTÊNCIA: reexecução não pula lote, não duplica encerramento, não
 *     regrava carimbo; virada dupla CONCORRENTE serializa (transação);
 *   - MONOTONIA: contador semeado sem pedidos por trás não regride (ratchet);
 *   - ESTORNO NÃO DEVOLVE VAGA: estornado segue contando (decisão registrada);
 *   - guard RN-200: preço de lote imutável no servidor com venda (evento OU
 *     lote); mesmo preço nunca bloqueado;
 *   - ATAQUES via Rules (cliente): forjar `encerradoEm`/`encerradoMotivo` no
 *     create e no update; forjar `vendidos`; edição legítima segue passando.
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
import {
  doc,
  setDoc,
  updateDoc,
  Timestamp as ClientTimestamp,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AuthClaims } from '@leela/core';
import { varrerViradasPorData, virarLote } from '../eventos/virarLote';
import { assertPrecoLoteEditavel } from '../eventos/guardPrecoLote';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import { estornarInscricaoCore } from '../checkout/estornarInscricao';
import { MockPaymentProvider } from '../payments/mockProvider';
import type { EventoCaller } from '../eventos/criarEvento';

const PROJECT_ID = 'demo-leela-virada';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const TENANT_ID = 'castelo-producoes';
const OUTRO_TENANT_ID = 'passo-certo';
const MARINA_UID = 'uid-marina';
const ANA_UID = 'uid-ana-atleta';

const EVENTO_VIRADA = 'evento-virada';
const EVENTO_CRON = 'evento-cron';
const EVENTO_CHECKOUT = 'evento-checkout';
const EVENTO_GUARD = 'evento-guard';

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

function loteRef(eventoId: string, loteId: string) {
  return db.doc(`eventos/${eventoId}/lotes/${loteId}`);
}

/** Semeia um evento do tenant castelo com os lotes dados. */
async function seedEvento(
  eventoId: string,
  modalidades: string[],
  lotes: {
    id: string;
    modalidade: string;
    ordem: number;
    inicioDias: number;
    fimDias: number;
    limite: number;
    preco: number;
    vendidos?: number;
  }[]
): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  const eventoRef = db.collection('eventos').doc(eventoId);
  batch.set(eventoRef, {
    id: eventoId,
    tenantId: TENANT_ID,
    organizadorId: MARINA_UID,
    nome: `Evento ${eventoId}`,
    data: tsRel(90),
    local: 'Florianópolis/SC',
    modalidades,
    slug: eventoId,
    status: 'publicado',
    usaChip: false,
    qtdInscritos: 0,
    receitaConfirmada: 0,
    criadoEm: now,
    atualizadoEm: now,
  });
  for (const l of lotes) {
    batch.set(eventoRef.collection('lotes').doc(l.id), {
      id: l.id,
      tenantId: TENANT_ID,
      modalidade: l.modalidade,
      ordem: l.ordem,
      nome: `Lote ${l.ordem}`,
      inicioEm: tsRel(l.inicioDias),
      fimEm: tsRel(l.fimDias),
      quantidadeLimite: l.limite,
      preco: l.preco,
      vendidos: l.vendidos ?? 0,
      criadoEm: now,
      atualizadoEm: now,
    });
  }
  await batch.commit();
}

/**
 * Fabrica N vendas CONFIRMADAS de um lote (pedido pago + inscritos
 * confirmados com a linha itens[].loteId — shape ADR-011 que o checkout
 * real escreve; o caso ponta a ponta usa o checkout de verdade abaixo).
 */
async function fabricarVendas(
  eventoId: string,
  modalidade: string,
  loteId: string,
  n: number,
  prefixo: string
): Promise<string[]> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  const eventoRef = db.collection('eventos').doc(eventoId);
  const pedidoId = `ped-${prefixo}`;
  const inscritoIds: string[] = [];
  const itens: Record<string, unknown>[] = [];
  for (let i = 0; i < n; i++) {
    const inscritoId = `insc-${prefixo}-${i + 1}`;
    inscritoIds.push(inscritoId);
    itens.push({ inscritoRef: inscritoId, loteId, valorBase: 75, valorFinal: 75 });
    batch.set(eventoRef.collection('inscritos').doc(inscritoId), {
      id: inscritoId,
      tenantId: TENANT_ID,
      atletaId: `${inscritoId}-atleta`,
      atletaNome: `Atleta ${i + 1}`,
      kit: 'sem_kit',
      status: 'confirmado',
      modalidade,
      pedidoRef: pedidoId,
      criadoEm: now,
      atualizadoEm: now,
    });
  }
  batch.set(db.collection('pedidos').doc(pedidoId), {
    id: pedidoId,
    tenantId: TENANT_ID,
    eventoId,
    inscritoRefs: inscritoIds,
    itens,
    status: 'pago',
    valorTotal: 75 * n,
    criadoEm: now,
    atualizadoEm: now,
  });
  await batch.commit();
  return inscritoIds;
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

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('tenants').doc(OUTRO_TENANT_ID), {
    id: OUTRO_TENANT_ID, nome: 'Passo Certo', slug: OUTRO_TENANT_ID,
    status: 'ativo', ownerUid: 'uid-passo-owner', tipo: 'promotor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
    anticipation: { disponivel: false }, communityMonthlyEnabled: false, saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });
  await batch.commit();

  // Evento da fronteira de QUANTIDADE: 5k com L1 (limite 100) + L2; 10k vizinha.
  await seedEvento(EVENTO_VIRADA, ['5k', '10k'], [
    { id: '5k-l1', modalidade: '5k', ordem: 1, inicioDias: -30, fimDias: 30, limite: 100, preco: 75 },
    { id: '5k-l2', modalidade: '5k', ordem: 2, inicioDias: 31, fimDias: 60, limite: 200, preco: 95 },
    { id: '10k-l1', modalidade: '10k', ordem: 1, inicioDias: -30, fimDias: 30, limite: 100, preco: 100 },
  ]);

  // Evento do CRON (data): 5k-c1 com fimEm no PASSADO; futuros intocáveis;
  // 10k-c1 com contador SEMEADO (monotonia — sem pedidos por trás).
  await seedEvento(EVENTO_CRON, ['5k', '10k'], [
    { id: '5k-c1', modalidade: '5k', ordem: 1, inicioDias: -30, fimDias: -1, limite: 100, preco: 60 },
    { id: '5k-c2', modalidade: '5k', ordem: 2, inicioDias: 1, fimDias: 30, limite: 100, preco: 80 },
    { id: '10k-c1', modalidade: '10k', ordem: 1, inicioDias: -30, fimDias: 30, limite: 100, preco: 90, vendidos: 40 },
  ]);

  // Evento do checkout REAL (estorno não devolve vaga).
  await seedEvento(EVENTO_CHECKOUT, ['5k', '10k'], [
    { id: '10k-ck1', modalidade: '10k', ordem: 1, inicioDias: -1, fimDias: 30, limite: 100, preco: 189.9 },
  ]);

  // Evento do guard RN-200.
  await seedEvento(EVENTO_GUARD, ['5k'], [
    { id: 'g-5k-l1', modalidade: '5k', ordem: 1, inicioDias: -1, fimDias: 30, limite: 50, preco: 50 },
  ]);
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// ACEITE RN-300 — fronteira exata de quantidade (100ª venda) + vizinhança
// ─────────────────────────────────────────────────────────────────────────────

describe('virada por QUANTIDADE — 100ª venda confirma o encerramento (RN-300/ADR-012)', () => {
  it('99/100: contador materializado, lote segue ativo, sem carimbo', async () => {
    await fabricarVendas(EVENTO_VIRADA, '5k', '5k-l1', 99, 'v99');
    const r = await virarLote(db, EVENTO_VIRADA);
    expect(r).not.toBeNull();
    expect(r!.viradas).toEqual([]);
    expect(r!.ativoPorModalidade['5k']).toBe('5k-l1');

    const doc99 = await loteRef(EVENTO_VIRADA, '5k-l1').get();
    expect(doc99.get('vendidos')).toBe(99);
    expect(doc99.get('encerradoEm')).toBeUndefined();
  });

  it('100ª venda: encerra por quantidade e o PRÓXIMO da modalidade assume', async () => {
    await fabricarVendas(EVENTO_VIRADA, '5k', '5k-l1', 1, 'v100');
    const r = await virarLote(db, EVENTO_VIRADA);

    expect(r!.viradas).toEqual([
      { loteId: '5k-l1', modalidade: '5k', ordem: 1, motivo: 'quantidade' },
    ]);
    // Hand-off ADR-012: L2 assume MESMO antes do próprio inicioEm.
    expect(r!.ativoPorModalidade['5k']).toBe('5k-l2');

    const l1 = await loteRef(EVENTO_VIRADA, '5k-l1').get();
    expect(l1.get('vendidos')).toBe(100);
    expect(l1.get('encerradoMotivo')).toBe('quantidade');
    expect(l1.get('encerradoEm')).toBeDefined();
  });

  it('modalidade VIZINHA intocada: 10k segue no L1, sem carimbo, contador zerado', async () => {
    const l10k = await loteRef(EVENTO_VIRADA, '10k-l1').get();
    expect(l10k.get('vendidos')).toBe(0);
    expect(l10k.get('encerradoEm')).toBeUndefined();
    const r = await virarLote(db, EVENTO_VIRADA);
    expect(r!.ativoPorModalidade['10k']).toBe('10k-l1');
  });

  it('IDEMPOTÊNCIA: reexecução não pula lote, não duplica, não regrava carimbo', async () => {
    const antes = await loteRef(EVENTO_VIRADA, '5k-l1').get();
    const carimboAntes = (antes.get('encerradoEm') as Timestamp).toMillis();

    const r = await virarLote(db, EVENTO_VIRADA);
    expect(r!.viradas).toEqual([]);
    expect(r!.contadoresAtualizados).toBe(0);
    expect(r!.ativoPorModalidade['5k']).toBe('5k-l2');

    const depois = await loteRef(EVENTO_VIRADA, '5k-l1').get();
    expect((depois.get('encerradoEm') as Timestamp).toMillis()).toBe(carimboAntes);
    expect(depois.get('vendidos')).toBe(100);
  });

  it('ATAQUE: virada dupla CONCORRENTE serializa — um único carimbo, contagem exata', async () => {
    const [r1, r2] = await Promise.all([
      virarLote(db, EVENTO_VIRADA),
      virarLote(db, EVENTO_VIRADA),
    ]);
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();

    const doc = await loteRef(EVENTO_VIRADA, '5k-l1').get();
    expect(doc.get('vendidos')).toBe(100); // recontagem absoluta — nunca 200
    expect(doc.get('encerradoMotivo')).toBe('quantidade');

    const r3 = await virarLote(db, EVENTO_VIRADA);
    expect(r3!.viradas).toEqual([]); // estado estável após a corrida
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cron — virada por DATA + monotonia do contador semeado
// ─────────────────────────────────────────────────────────────────────────────

describe('cron por DATA — fimEm no passado carimba; vizinhos e futuros intocados', () => {
  it('varredura encerra SÓ o lote expirado do evento certo', async () => {
    const r = await varrerViradasPorData(db);
    expect(r.eventosProcessados).toContain(EVENTO_CRON);
    // Evento da quantidade não tem lote com fimEm no passado — fora da varredura.
    expect(r.eventosProcessados).not.toContain(EVENTO_VIRADA);

    const c1 = await loteRef(EVENTO_CRON, '5k-c1').get();
    expect(c1.get('encerradoMotivo')).toBe('data');
    expect(c1.get('encerradoEm')).toBeDefined();

    const c2 = await loteRef(EVENTO_CRON, '5k-c2').get();
    expect(c2.get('encerradoEm')).toBeUndefined();

    const c10k = await loteRef(EVENTO_CRON, '10k-c1').get();
    expect(c10k.get('encerradoEm')).toBeUndefined();
  });

  it('hand-off pós-data: 5k ativa o c2; 10k segue no próprio lote', async () => {
    const r = await virarLote(db, EVENTO_CRON);
    expect(r!.ativoPorModalidade['5k']).toBe('5k-c2');
    expect(r!.ativoPorModalidade['10k']).toBe('10k-c1');
  });

  it('MONOTONIA: contador semeado (40, sem pedidos) não regride na recontagem', async () => {
    const c10k = await loteRef(EVENTO_CRON, '10k-c1').get();
    expect(c10k.get('vendidos')).toBe(40);
  });

  it('re-scan é no-op: candidato já carimbado é filtrado', async () => {
    const r = await varrerViradasPorData(db);
    expect(r.candidatos).toBeGreaterThanOrEqual(1); // 5k-c1 segue no corte por fimEm
    expect(r.eventosProcessados).toEqual([]); // mas já carimbado → nada a processar
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Checkout REAL — shape ADR-011 de verdade + estorno não devolve vaga
// ─────────────────────────────────────────────────────────────────────────────

describe('checkout real → contagem por linha do pedido; estorno NÃO devolve vaga', () => {
  let pedidoId = '';
  let inscritoIds: string[] = [];

  it('2 vendas confirmadas pelo webhook sandbox contam no lote da linha', async () => {
    const input: CreateInscricaoChargeInput = {
      eventoId: EVENTO_CHECKOUT,
      inscritos: [
        { nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25', modalidade: '10k' },
        { nome: 'Bia Lima', email: 'bia@exemplo.com', cpf: '529.982.247-25', modalidade: '10k' },
      ],
      responsavelIndex: 0,
      responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
      aceites: { termos: true, saude: true },
      forma: 'pix',
      parcelas: 1,
      idempotencyKey: 'virada-ck-0001',
    };
    const charge = await createInscricaoChargeCore(db, provider, input, { uid: ANA_UID });
    await confirmarPagamentoSandboxCore(db, provider, { pedidoId: charge.pedidoId }, { uid: ANA_UID });
    pedidoId = charge.pedidoId;
    inscritoIds = charge.inscritoIds;

    const r = await virarLote(db, EVENTO_CHECKOUT);
    expect(r!.ativoPorModalidade['10k']).toBe('10k-ck1');
    const lote = await loteRef(EVENTO_CHECKOUT, '10k-ck1').get();
    expect(lote.get('vendidos')).toBe(2);
  });

  it('estorno de 1 inscrito: vaga NÃO volta (estornado segue contando)', async () => {
    await estornarInscricaoCore(
      db,
      provider,
      { pedidoId, inscritoId: inscritoIds[0]!, motivo: 'Teste de virada — estorno' },
      organizador
    );
    const r = await virarLote(db, EVENTO_CHECKOUT);
    expect(r!.contadoresAtualizados).toBe(0);
    const lote = await loteRef(EVENTO_CHECKOUT, '10k-ck1').get();
    expect(lote.get('vendidos')).toBe(2); // decisão registrada: ratchet
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Guard RN-200 — preço de lote imutável no servidor com venda
// ─────────────────────────────────────────────────────────────────────────────

describe('assertPrecoLoteEditavel — RN-200 no caminho Function/admin', () => {
  it('sem venda: mudança de preço passa', async () => {
    await expect(
      assertPrecoLoteEditavel(db, EVENTO_GUARD, 'g-5k-l1', 65)
    ).resolves.toBeUndefined();
  });

  it('evento com venda: MESMO preço nunca é bloqueado', async () => {
    await db.doc(`eventos/${EVENTO_GUARD}`).update({ qtdInscritos: 5 });
    await expect(
      assertPrecoLoteEditavel(db, EVENTO_GUARD, 'g-5k-l1', 50)
    ).resolves.toBeUndefined();
  });

  it('evento com venda: mudança de preço → failed-precondition (RN-200)', async () => {
    await expect(
      assertPrecoLoteEditavel(db, EVENTO_GUARD, 'g-5k-l1', 65)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('evento zerado mas LOTE com venda própria → failed-precondition (ADR-012)', async () => {
    await db.doc(`eventos/${EVENTO_GUARD}`).update({ qtdInscritos: 0 });
    await db.doc(`eventos/${EVENTO_GUARD}/lotes/g-5k-l1`).update({ vendidos: 3 });
    await expect(
      assertPrecoLoteEditavel(db, EVENTO_GUARD, 'g-5k-l1', 65)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('lote inexistente → not-found (nunca falha aberto)', async () => {
    await expect(
      assertPrecoLoteEditavel(db, EVENTO_GUARD, 'lote-fantasma', 65)
    ).rejects.toMatchObject({ code: 'not-found' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ATAQUES via Rules — cliente NUNCA escreve carimbos de virada
// ─────────────────────────────────────────────────────────────────────────────

describe('Rules — carimbos de virada são só-Function (CAMPOS_FUNCTION_LOTE)', () => {
  const marina = { role: 'tenant_owner', tenantId: TENANT_ID };
  const cTs = (dias: number) =>
    ClientTimestamp.fromDate(new Date(Date.now() + dias * DIA_MS));

  const loteLimpo = (id: string, ordem: number) => ({
    id,
    tenantId: TENANT_ID,
    modalidade: '10k',
    ordem,
    nome: `Lote ${ordem}`,
    inicioEm: cTs(61),
    fimEm: cTs(90),
    quantidadeLimite: 50,
    preco: 120,
    vendidos: 0,
    criadoEm: ClientTimestamp.now(),
    atualizadoEm: ClientTimestamp.now(),
  });

  it('ATAQUE: create de lote PRÉ-ENCERRADO (encerradoEm forjado) → NEGADO', async () => {
    const cli = dbAs(MARINA_UID, marina);
    await assertFails(
      setDoc(doc(cli, `eventos/${EVENTO_VIRADA}/lotes/forja-1`), {
        ...loteLimpo('forja-1', 7),
        encerradoEm: ClientTimestamp.now(),
      })
    );
  });

  it('ATAQUE: create com encerradoMotivo forjado → NEGADO', async () => {
    const cli = dbAs(MARINA_UID, marina);
    await assertFails(
      setDoc(doc(cli, `eventos/${EVENTO_VIRADA}/lotes/forja-2`), {
        ...loteLimpo('forja-2', 8),
        encerradoMotivo: 'quantidade',
      })
    );
  });

  it('regressão: create LIMPO do writer segue permitido', async () => {
    const cli = dbAs(MARINA_UID, marina);
    await assertSucceeds(
      setDoc(doc(cli, `eventos/${EVENTO_VIRADA}/lotes/limpo-1`), loteLimpo('limpo-1', 9))
    );
  });

  it('ATAQUE: update forjando encerradoEm num lote SEM venda → NEGADO', async () => {
    const cli = dbAs(MARINA_UID, marina);
    await assertFails(
      updateDoc(doc(cli, `eventos/${EVENTO_VIRADA}/lotes/10k-l1`), {
        encerradoEm: ClientTimestamp.now(),
      })
    );
  });

  it('ATAQUE: update forjando encerradoMotivo → NEGADO', async () => {
    const cli = dbAs(MARINA_UID, marina);
    await assertFails(
      updateDoc(doc(cli, `eventos/${EVENTO_VIRADA}/lotes/10k-l1`), {
        encerradoMotivo: 'data',
      })
    );
  });

  it('ATAQUE (regressão S300-T1): update forjando vendidos → NEGADO', async () => {
    const cli = dbAs(MARINA_UID, marina);
    await assertFails(
      updateDoc(doc(cli, `eventos/${EVENTO_VIRADA}/lotes/10k-l1`), { vendidos: 99 })
    );
  });

  it('edição legítima (nome) em lote JÁ CARIMBADO pela Function segue passando', async () => {
    // 5k-l1 foi encerrado pela Function (vendidos=100): campos comerciais
    // congelam (RN-200 per-lote), mas `nome` não é comercial e os carimbos
    // não são tocados — o freeze por diff não pode virar cadeado total.
    const cli = dbAs(MARINA_UID, marina);
    await assertSucceeds(
      updateDoc(doc(cli, `eventos/${EVENTO_VIRADA}/lotes/5k-l1`), {
        nome: 'Lote 1 — esgotado',
      })
    );
  });
});
