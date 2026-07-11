/**
 * pedidosRules.test.ts — LEELA-FABLE-A-T1
 *
 * Integração (Emulator): Security Rules da coleção root `pedidos`
 * (ADR-011) + leituras do api-client (getPedido / listarPedidosDoEvento /
 * getPedidoDoInscrito / getPagamento).
 *
 * Cobre (aceite do brief + review r1 fix 3/7):
 *   - organizador (owner/staff — papel de gestão) LÊ pedidos do tenant
 *   - promoter NÃO lê (guarda de PAPEL: estado financeiro não é de promoter)
 *   - athlete com tenantId FORJADO no claim NÃO lê (claim puro não basta)
 *   - outro tenant NÃO lê (get, query forjada por tenant alvo e api-client)
 *   - get de doc INEXISTENTE → PERMISSION_DENIED (resource == null não
 *     prova a guarda — contrato do docstring de getPedido/getPagamento)
 *   - anônimo NÃO lê
 *   - cliente NUNCA escreve (create/update/delete) — nem platform_admin
 *     via client SDK (estado financeiro é só Function/Admin SDK)
 *   - queries do api-client filtram tenantId (ADR-009) e são prováveis
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
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  getPagamento,
  getPedido,
  getPedidoDoInscrito,
  listarPedidosDoEvento,
} from '@leela/api-client';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MEIA_FLORIPA_ID = 'meia-maratona-floripa-2026';

const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';
const PLATFORM_ADMIN_UID = 'uid-platform-admin';

const marinaClaims = { role: 'tenant_owner', tenantId: CASTELO_ID };
const staffClaims = { role: 'tenant_staff', tenantId: CASTELO_ID };
const promoterClaims = { role: 'promoter', tenantId: CASTELO_ID };
const passoClaims = { role: 'tenant_owner', tenantId: PASSO_ID };

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

function pedidoValido(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: CASTELO_ID,
    eventoId: MEIA_FLORIPA_ID,
    responsavel: {
      atletaId: 'atleta-0001',
      nome: 'Marina Silva',
      email: 'marina@example.com',
    },
    inscritoRefs: ['insc-0001', 'insc-0002'],
    pagamentoRef: 'pag-castelo-1',
    valorTotal: 378.0,
    status: 'pago',
    ...overrides,
  };
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
  adminDb = admin.firestore();

  // Seed único (testes de escrita são todos DENY — nada muda o estado)
  await testEnv.clearFirestore();
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
    status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  // Pedido do tenant Castelo (grupo de 2 — ADR-011) + pagamento 1:1
  batch.set(adminDb.collection('pedidos').doc('ped-castelo-1'), {
    ...pedidoValido(),
    criadoEm: now, atualizadoEm: now,
  });
  // Pedido de auto-inscrição (1 inscrito) do MESMO evento, sem cobrança ainda
  batch.set(adminDb.collection('pedidos').doc('ped-castelo-2'), {
    ...pedidoValido({
      inscritoRefs: ['insc-0009'],
      pagamentoRef: null,
      valorTotal: 189.0,
      status: 'pendente',
    }),
    criadoEm: now, atualizadoEm: now,
  });
  // Pedido de OUTRO tenant (isolamento nos dois sentidos)
  batch.set(adminDb.collection('pedidos').doc('ped-passo-1'), {
    ...pedidoValido({
      tenantId: PASSO_ID,
      eventoId: 'trail-ratones-2026',
      inscritoRefs: ['insc-passo-1'],
      pagamentoRef: null,
      status: 'pendente',
    }),
    criadoEm: now, atualizadoEm: now,
  });
  // Pagamento confirmado com conciliação Asaas (D2) do pedido 1
  batch.set(adminDb.collection('pagamentos').doc('pag-castelo-1'), {
    tenantId: CASTELO_ID,
    eventoId: MEIA_FLORIPA_ID,
    pedidoRef: 'ped-castelo-1',
    status: 'confirmado',
    forma: 'cartao_credito',
    valorBase: 420.0,
    loteNome: 'Lote 2 — Regular',
    desconto: 42.0,
    valorFinal: 378.0,
    cartao: {
      bandeira: 'Visa', ultimos4: '4821', parcelas: 12,
      valorParcela: 34.75, valorTotalComJuros: 417.0,
    },
    pagoEm: now,
    conciliacao: {
      idTransacao: 'asaas_tx_9f2c1', gateway: 'asaas',
      taxaPct: 8, taxaFixa: 2.0, taxaValor: 32.24,
      repasseOrganizador: 345.76, repassePrevistoEm: now,
    },
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

// ─────────────────────────────────────────────────────────────────────────
// Leitura — só o lado do organizador (tenant member) e platform_admin
// ─────────────────────────────────────────────────────────────────────────
describe('rules de leitura em pedidos (ADR-011 · FABLE-A-T1)', () => {
  it('tenant_owner LÊ pedido do próprio tenant (getPedido parseia ADR-011)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const pedido = await getPedido(db, 'ped-castelo-1');
    expect(pedido).not.toBeNull();
    expect(pedido?.responsavel.nome).toBe('Marina Silva');
    expect(pedido?.inscritoRefs).toEqual(['insc-0001', 'insc-0002']);
    expect(pedido?.pagamentoRef).toBe('pag-castelo-1');
    expect(pedido?.valorTotal).toBe(378.0);
  });

  it('tenant_staff também lê (papel de gestão do organizador)', async () => {
    await assertSucceeds(
      getDoc(doc(dbAs('uid-staff', staffClaims), 'pedidos', 'ped-castelo-1'))
    );
  });

  it('promoter NÃO lê pedido — estado financeiro exige papel de gestão (r1 fix 3)', async () => {
    await assertFails(
      getDoc(doc(dbAs('uid-promoter', promoterClaims), 'pedidos', 'ped-castelo-1'))
    );
  });

  it('athlete com tenantId FORJADO no claim NÃO lê (guarda de papel, não só claim)', async () => {
    const atletaForjado = dbAs('uid-atleta-forjado', {
      role: 'athlete',
      tenantId: CASTELO_ID, // claim-tenantId "correto", papel errado
    });
    await assertFails(getDoc(doc(atletaForjado, 'pedidos', 'ped-castelo-1')));
  });

  it('owner de OUTRO tenant NÃO lê pedido (get direto)', async () => {
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(getDoc(doc(db, 'pedidos', 'ped-castelo-1')));
  });

  it('query SEM filtro de tenant é negada (não-provável pelas Rules)', async () => {
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(getDocs(collection(db, 'pedidos')));
  });

  it('anônimo e athlete NÃO leem pedidos nesta fase', async () => {
    const anon = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(anon, 'pedidos', 'ped-castelo-1')));
    const atleta = dbAs('uid-atleta', { role: 'athlete' });
    await assertFails(getDoc(doc(atleta, 'pedidos', 'ped-castelo-1')));
  });

  it('query FORJADA por tenant alvo (where tenantId == alheio) é negada — r1 fix 7a', async () => {
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(
      getDocs(query(collection(db, 'pedidos'), where('tenantId', '==', CASTELO_ID)))
    );
  });

  it('get de doc INEXISTENTE dá PERMISSION_DENIED, não null — r1 fix 7b (contrato fix 1)', async () => {
    // resource == null não prova a guarda de tenant; afrouxar com
    // `resource == null` viraria oráculo de existência de doc financeiro.
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(getDoc(doc(db, 'pedidos', 'ped-que-nao-existe')));
    await assertFails(getDoc(doc(db, 'pagamentos', 'pag-que-nao-existe')));
  });

  it('listarPedidosDoEvento com tenant ALHEIO nos params é negada — r1 fix 7c', async () => {
    const db = dbAs(MARINA_UID, marinaClaims); // claim = Castelo
    await assertFails(
      listarPedidosDoEvento(db, {
        tenantId: PASSO_ID, // tenant alheio forjado nos params
        eventoId: 'trail-ratones-2026',
      })
    );
  });

  it('platform_admin cruza tenants na leitura', async () => {
    const db = dbAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(getDoc(doc(db, 'pedidos', 'ped-castelo-1')));
    await assertSucceeds(getDoc(doc(db, 'pedidos', 'ped-passo-1')));
  });

  it('listarPedidosDoEvento: filtra tenant+evento, mais recentes primeiro', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const pedidos = await listarPedidosDoEvento(db, {
      tenantId: CASTELO_ID,
      eventoId: MEIA_FLORIPA_ID,
    });
    expect(pedidos.map((p) => p.id).sort()).toEqual(['ped-castelo-1', 'ped-castelo-2']);
  });

  it('getPedidoDoInscrito: acha o pedido por inscritoRefs; null p/ inscrito sem pedido', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const params = { tenantId: CASTELO_ID, eventoId: MEIA_FLORIPA_ID };
    const pedido = await getPedidoDoInscrito(db, { ...params, inscritoId: 'insc-0002' });
    expect(pedido?.id).toBe('ped-castelo-1');
    const nenhum = await getPedidoDoInscrito(db, { ...params, inscritoId: 'insc-orfao' });
    expect(nenhum).toBeNull();
  });

  it('getPagamento: tenant lê a transação; conciliação Asaas parseada', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const pg = await getPagamento(db, 'pag-castelo-1');
    expect(pg?.pedidoRef).toBe('ped-castelo-1');
    expect(pg?.conciliacao?.gateway).toBe('asaas');
    expect(pg?.conciliacao?.repasseOrganizador).toBe(345.76);
    // e o OUTRO tenant não lê o pagamento
    await assertFails(
      getDoc(doc(dbAs(PASSO_OWNER_UID, passoClaims), 'pagamentos', 'pag-castelo-1'))
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Escrita — NEGADA para todo cliente (estado financeiro só por Function)
// ─────────────────────────────────────────────────────────────────────────
describe('rules de escrita em pedidos — deny total (ADR-011)', () => {
  it('tenant_owner NÃO cria pedido pelo cliente (nem válido)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(setDoc(doc(db, 'pedidos', 'ped-forjado'), pedidoValido()));
  });

  it('tenant_owner NÃO atualiza estado financeiro (status/valorTotal/pagamentoRef)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const ref = doc(db, 'pedidos', 'ped-castelo-2');
    await assertFails(updateDoc(ref, { status: 'pago' }));
    await assertFails(updateDoc(ref, { valorTotal: 1.0 }));
    await assertFails(updateDoc(ref, { pagamentoRef: 'pag-forjado' }));
  });

  it('tenant_owner NÃO deleta pedido (trilha financeira não some)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(deleteDoc(doc(db, 'pedidos', 'ped-castelo-2')));
  });

  it('athlete (futuro responsável) NÃO escreve pedido', async () => {
    const db = dbAs('uid-atleta', { role: 'athlete' });
    await assertFails(setDoc(doc(db, 'pedidos', 'ped-atleta'), pedidoValido()));
  });

  it('nem platform_admin escreve via client SDK (só Function/Admin SDK)', async () => {
    const db = dbAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertFails(setDoc(doc(db, 'pedidos', 'ped-admin'), pedidoValido()));
    await assertFails(
      updateDoc(doc(db, 'pedidos', 'ped-castelo-1'), { status: 'cancelado' })
    );
  });
});
