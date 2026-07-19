/**
 * estornarInscricao.e2e.review.test.ts — REVIEW ANTAGONISTA DE DINHEIRO
 * [LEELA-E04-REFUND-REVIEW] · fecha a lacuna declarada do E04-REFUND-UI
 * ("caminho real do callable não exercido").
 *
 * E2E REAL da fiação de dinheiro (⚠️ EXIGE Firestore 8080 + Auth 9099):
 *
 *   wrapper `estornarInscricao` do @leela/api-client (o MESMO código que o
 *   painel usa — alias p/ packages/api-client/src)
 *     → firebase/functions httpsCallable (protocolo callable de verdade,
 *       Authorization: Bearer <token REAL do Auth Emulator com claims>)
 *     → handler https.onCall REAL de functions/src/checkout/estornarInscricao
 *       (hospedado in-process numa porta EFÊMERA de 127.0.0.1 — a regra de
 *       memória proíbe o Functions Emulator; portas 8080/9099 intocadas,
 *       preview do usuário 8180/9198/5273 intocado)
 *     → firebase-admin → Firestore Emulator.
 *
 * Único stand-in vs produção: o supervisor HTTP (in-process em vez do
 * Functions Emulator). Bytes do wrapper, protocolo, verificação de token,
 * guards, saga e Firestore são os REAIS.
 *
 * ATAQUES exercitados pela superfície do CLIENTE (o que a UI pode mandar):
 *   - valor devolvido == pedido.itens[].valorFinal EXATO (linha rateada);
 *   - replay → duplicado, dinheiro NÃO dobra (gateway conferido);
 *   - motivo <3 chars → invalid-argument, zero efeito;
 *   - payload FORJADO com canais de valor (valor/amount/valorCentavos) →
 *     campos ignorados, estorno sai pelo valor DO SERVIDOR;
 *   - inscrito de outro pedido, pedido não-pago → failed-precondition;
 *   - cross-tenant e athlete → permission-denied, zero efeito;
 *   - estorno integral → pagamento 'estornado', charge 'refunded', receita 0;
 *   - sem login → unauthenticated.
 */

import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getApps, deleteApp } from 'firebase/app';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  estornarInscricao as estornarViaWrapper,
  getLeelaAuth,
  initLeela,
  type EstornarInscricaoInput,
} from '@leela/api-client';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
  type CreateInscricaoChargeResult,
} from '../checkout/createInscricaoCharge';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import {
  ESTORNOS_SUBCOL,
  estornarInscricao as estornarCallable,
} from '../checkout/estornarInscricao';
import { mockPaymentProvider } from '../payments/mockProvider';

// PRECISA ser o projectId do DEMO_CONFIG do api-client (o wrapper roda com o
// app client 'demo-leela'); admin usa o MESMO p/ token aud + namespace.
const PROJECT_ID = 'demo-leela';

const TENANT_ID = 'castelo-producoes';
const OUTRO_TENANT_ID = 'passo-certo';
const EVENTO_ID = 'meia-floripa-e2e-review';
const SENHA = 'senha-e2e-review-123';

const MARINA = { uid: 'uid-marina-e2e', email: 'marina.e2e@castelo.test' };
const RIVAL = { uid: 'uid-rival-e2e', email: 'rival.e2e@passo.test' };
const ATLETA = { uid: 'uid-atleta-e2e', email: 'ana.e2e@atleta.test' };

let db: admin.firestore.Firestore;
let server: Server | null = null;

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp =>
  Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

// ---------------------------------------------------------------------------
// Host in-process do callable REAL (express vem de dentro do firebase-functions
// — pnpm não hoisteia; createRequire resolve pelo pacote que o declara).
// ---------------------------------------------------------------------------

interface ExpressApp {
  use(mw: unknown): void;
  all(path: string, handler: (req: unknown, res: unknown) => void): void;
  listen(port: number, host: string, cb: () => void): Server;
}
interface ExpressModule {
  (): ExpressApp;
  json(): unknown;
}

function subirServidorDoCallable(): Promise<number> {
  const requireLocal = createRequire(resolve(process.cwd(), 'package.json'));
  // 'firebase-functions' não exporta ./package.json — resolve o ENTRY e cria
  // um require de lá (de dentro do pacote, 'express' é dependência direta).
  const ffEntry = requireLocal.resolve('firebase-functions');
  const express = createRequire(ffEntry)('express') as ExpressModule;

  const handler = estornarCallable as unknown as (
    req: unknown,
    res: unknown
  ) => void | Promise<void>;

  const app = express();
  app.use(express.json());
  app.all('*', (req, res) => {
    void handler(req, res);
  });

  return new Promise<number>((resolveP) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server?.address();
      resolveP(typeof addr === 'object' && addr ? addr.port : 0);
    });
  });
}

// ---------------------------------------------------------------------------
// Seed (espelho da suíte FABLE-B) + pedidos pagos via core com o MESMO
// provider singleton que o callable usa (selectPaymentProvider → mock).
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: MARINA.uid, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('tenants').doc(OUTRO_TENANT_ID), {
    id: OUTRO_TENANT_ID, nome: 'Passo Certo Eventos', slug: OUTRO_TENANT_ID,
    status: 'ativo', ownerUid: RIVAL.uid, tipo: 'promotor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
    anticipation: { disponivel: false }, communityMonthlyEnabled: false, saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });
  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: MARINA.uid,
    nome: 'Meia Floripa E2E Review', data: tsRel(45), local: 'Florianópolis/SC',
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

async function criarPedido(
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
  return createInscricaoChargeCore(db, mockPaymentProvider, input, { uid: ATLETA.uid });
}

async function criarPedidoPago(
  key: string,
  n: number,
  cupomCodigo?: string
): Promise<CreateInscricaoChargeResult> {
  const charge = await criarPedido(key, n, cupomCodigo);
  await confirmarPagamentoSandboxCore(
    db,
    mockPaymentProvider,
    { pedidoId: charge.pedidoId },
    { uid: ATLETA.uid }
  );
  return charge;
}

async function receitaConfirmada(): Promise<number> {
  return (await db.doc(`eventos/${EVENTO_ID}`).get()).get('receitaConfirmada') as number;
}

async function statusInscrito(inscritoId: string): Promise<string> {
  const snap = await db.doc(`eventos/${EVENTO_ID}/inscritos/${inscritoId}`).get();
  return snap.get('status') as string;
}

/** Linha do inscrito no pedido — a fonte de verdade do valor (RN-337). */
async function valorFinalDaLinha(pedidoId: string, inscritoId: string): Promise<number> {
  const snap = await db.doc(`pedidos/${pedidoId}`).get();
  const itens = snap.get('itens') as Array<{ inscritoRef: string; valorFinal: number }>;
  const item = itens.find((i) => i.inscritoRef === inscritoId);
  if (!item) throw new Error(`linha do inscrito ${inscritoId} não existe no pedido`);
  return item.valorFinal;
}

async function loginAs(email: string): Promise<void> {
  await signOut(getLeelaAuth()).catch(() => undefined);
  await signInWithEmailAndPassword(getLeelaAuth(), email, SENHA);
}

interface ErroCallable { code: string; message: string }

/** Captura o erro do callable (ou falha se a chamada for ACEITA). */
async function capturarErro(p: Promise<unknown>): Promise<ErroCallable> {
  try {
    await p;
  } catch (err) {
    const e = err as { code?: unknown; message?: unknown };
    return {
      code: typeof e.code === 'string' ? e.code : '',
      message: typeof e.message === 'string' ? e.message : '',
    };
  }
  throw new Error('Esperava erro do callable — a chamada foi ACEITA (buraco de segurança).');
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

beforeAll(async () => {
  process.env['FIRESTORE_EMULATOR_HOST'] ??= '127.0.0.1:8080';
  process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= '127.0.0.1:9099';
  process.env['GCLOUD_PROJECT'] ??= PROJECT_ID;

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();

  await seed();

  // Usuários REAIS no Auth Emulator com claims REAIS (o token do wrapper
  // carrega role/tenantId — é ISSO que assertTenantWriter lê no servidor).
  await admin.auth().createUser({ uid: MARINA.uid, email: MARINA.email, password: SENHA });
  await admin.auth().setCustomUserClaims(MARINA.uid, {
    role: 'tenant_owner', tenantId: TENANT_ID,
  });
  await admin.auth().createUser({ uid: RIVAL.uid, email: RIVAL.email, password: SENHA });
  await admin.auth().setCustomUserClaims(RIVAL.uid, {
    role: 'tenant_owner', tenantId: OUTRO_TENANT_ID,
  });
  await admin.auth().createUser({ uid: ATLETA.uid, email: ATLETA.email, password: SENHA });
  await admin.auth().setCustomUserClaims(ATLETA.uid, { role: 'athlete' });

  const porta = await subirServidorDoCallable();
  initLeela({
    useEmulator: true,
    emulatorHost: '127.0.0.1',
    emulatorPorts: { functions: porta },
  });
}, 120_000);

afterAll(async () => {
  await signOut(getLeelaAuth()).catch(() => undefined);
  await Promise.all(getApps().map((a) => deleteApp(a).catch(() => undefined)));
  await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
  await Promise.all(admin.apps.map((a) => a?.delete().catch(() => undefined)));
});

// ---------------------------------------------------------------------------
// E2E — a fiação de DINHEIRO que a UI declarou, exercitada de verdade
// ---------------------------------------------------------------------------

describe('E2E wrapper→callable — estorno por inscrito (grupo de 3 com cupom)', () => {
  const KEY = 'e2e-review-grupo-01';
  let pedidoId = '';
  let pagamentoId = '';
  let inscritoIds: string[] = [];
  let refundIdDoPrimeiro = '';
  let chargeId = '';

  beforeAll(async () => {
    const charge = await criarPedidoPago(KEY, 3, 'HEROI10');
    pedidoId = charge.pedidoId;
    pagamentoId = charge.pagamentoId;
    inscritoIds = charge.inscritoIds;
    chargeId = (await db.doc(`pagamentos/${pagamentoId}`).get())
      .get('gatewayChargeId') as string;
    // Baseline: 3 × 189,90 = 569,70 − 10% = 512,73
    expect(charge.valores.valorFinal).toBe(512.73);
    expect(await receitaConfirmada()).toBe(512.73);
    await loginAs(MARINA.email);
  }, 120_000);

  it('devolve EXATAMENTE itens[].valorFinal da linha; demais inscritos intactos; receita revertida', async () => {
    const alvo = inscritoIds[1]!;
    const linha = await valorFinalDaLinha(pedidoId, alvo);
    expect(linha).toBe(170.91); // 189,90 − rateio do cupom — o que a UI exibe

    const r = await estornarViaWrapper({
      pedidoId,
      inscritoId: alvo,
      motivo: 'E2E review: atleta desistiu',
    });

    // O valor que o Toast exibe (res.valorEstornado) == a linha do backend
    expect(r.duplicado).toBe(false);
    expect(r.valorEstornado).toBe(linha);
    expect(r.pagamentoEstornadoIntegral).toBe(false);
    expect(r.refundId).toBeTruthy();
    refundIdDoPrimeiro = r.refundId;

    // Efeitos no banco: flip do alvo, ISOLAMENTO dos irmãos, receita exata
    expect(await statusInscrito(alvo)).toBe('estornado');
    expect(await statusInscrito(inscritoIds[0]!)).toBe('confirmado');
    expect(await statusInscrito(inscritoIds[2]!)).toBe('confirmado');
    expect(await receitaConfirmada()).toBe(341.82); // 512,73 − 170,91
    const pag = await db.doc(`pagamentos/${pagamentoId}`).get();
    expect(pag.get('estornadoTotal')).toBe(170.91);
    expect(pag.get('status')).toBe('confirmado'); // parcial: pagamento vivo
    expect((await db.doc(`pedidos/${pedidoId}`).get()).get('status')).toBe('pago');

    // Gateway: UM refund do valor exato em centavos
    expect(mockPaymentProvider.getCharge(chargeId)?.refundedAmount).toBe(17091);
  });

  it('replay do MESMO estorno → duplicado, dinheiro NÃO dobra (gateway conferido)', async () => {
    const alvo = inscritoIds[1]!;
    const r = await estornarViaWrapper({
      pedidoId,
      inscritoId: alvo,
      motivo: 'E2E review: replay do mesmo estorno',
    });
    expect(r.duplicado).toBe(true);
    expect(r.valorEstornado).toBe(170.91);
    expect(r.refundId).toBe(refundIdDoPrimeiro);

    expect(await receitaConfirmada()).toBe(341.82); // NÃO re-reverteu
    expect((await db.doc(`pagamentos/${pagamentoId}`).get()).get('estornadoTotal')).toBe(170.91);
    expect(mockPaymentProvider.getCharge(chargeId)?.refundedAmount).toBe(17091); // NÃO dobrou
  });

  it('motivo curto (<3 chars) → invalid-argument e ZERO efeito', async () => {
    const alvo = inscritoIds[0]!;
    const erro = await capturarErro(
      estornarViaWrapper({ pedidoId, inscritoId: alvo, motivo: 'ab' })
    );
    expect(erro.code).toBe('functions/invalid-argument');
    expect(erro.message).toMatch(/motivo/i);

    expect(await statusInscrito(alvo)).toBe('confirmado');
    expect(await receitaConfirmada()).toBe(341.82);
    const ledger = await db
      .doc(`pagamentos/${pagamentoId}/${ESTORNOS_SUBCOL}/${alvo}`).get();
    expect(ledger.exists).toBe(false);
  });

  it('FORJA: payload com canais de valor (valor/amount/valorCentavos) é IGNORADO — estorna a linha do servidor', async () => {
    const alvo = inscritoIds[0]!;
    const payloadForjado = {
      pedidoId,
      inscritoId: alvo,
      motivo: 'E2E review: forja de valor no payload',
      valor: 0.01,
      valorCentavos: 1,
      amount: 1,
      valorEstornado: 0.01,
    } as unknown as EstornarInscricaoInput;

    const r = await estornarViaWrapper(payloadForjado);

    // O servidor decidiu o valor: a LINHA inteira, não os R$ 0,01 forjados
    expect(r.valorEstornado).toBe(170.91);
    expect(await receitaConfirmada()).toBe(170.91); // 341,82 − 170,91
    const ledger = await db
      .doc(`pagamentos/${pagamentoId}/${ESTORNOS_SUBCOL}/${alvo}`).get();
    expect(ledger.get('valor')).toBe(170.91); // ledger congela o valor REAL
    expect(mockPaymentProvider.getCharge(chargeId)?.refundedAmount).toBe(34182);
  });

  it('inscrito de OUTRO pedido → failed-precondition, sem ledger', async () => {
    const outro = await criarPedidoPago('e2e-review-solo-01', 1);
    const alheio = outro.inscritoIds[0]!;
    const erro = await capturarErro(
      estornarViaWrapper({
        pedidoId, // pedido do grupo…
        inscritoId: alheio, // …inscrito do pedido solo
        motivo: 'E2E review: inscrito alheio',
      })
    );
    expect(erro.code).toBe('functions/failed-precondition');
    expect(await statusInscrito(alheio)).toBe('confirmado');
    const ledger = await db
      .doc(`pagamentos/${pagamentoId}/${ESTORNOS_SUBCOL}/${alheio}`).get();
    expect(ledger.exists).toBe(false);
  });

  it('pedido NÃO-pago → failed-precondition', async () => {
    const pendente = await criarPedido('e2e-review-pendente-01', 1);
    const erro = await capturarErro(
      estornarViaWrapper({
        pedidoId: pendente.pedidoId,
        inscritoId: pendente.inscritoIds[0]!,
        motivo: 'E2E review: pedido pendente',
      })
    );
    expect(erro.code).toBe('functions/failed-precondition');
  });

  it('CROSS-TENANT: organizador de outro tenant → permission-denied, zero efeito', async () => {
    await loginAs(RIVAL.email);
    const alvo = inscritoIds[2]!;
    const erro = await capturarErro(
      estornarViaWrapper({ pedidoId, inscritoId: alvo, motivo: 'E2E review: rival ataca' })
    );
    expect(erro.code).toBe('functions/permission-denied');
    expect(await statusInscrito(alvo)).toBe('confirmado');
    const ledger = await db
      .doc(`pagamentos/${pagamentoId}/${ESTORNOS_SUBCOL}/${alvo}`).get();
    expect(ledger.exists).toBe(false);
  });

  it('ATHLETE → permission-denied (RN-401)', async () => {
    await loginAs(ATLETA.email);
    const erro = await capturarErro(
      estornarViaWrapper({
        pedidoId,
        inscritoId: inscritoIds[2]!,
        motivo: 'E2E review: atleta tenta estornar',
      })
    );
    expect(erro.code).toBe('functions/permission-denied');
  });

  it('estorno INTEGRAL (3/3): pagamento → estornado, charge → refunded, receita do pedido zerada', async () => {
    await loginAs(MARINA.email);
    const alvo = inscritoIds[2]!;
    const r = await estornarViaWrapper({
      pedidoId,
      inscritoId: alvo,
      motivo: 'E2E review: fecha o grupo',
    });
    expect(r.duplicado).toBe(false);
    expect(r.valorEstornado).toBe(170.91);
    expect(r.pagamentoEstornadoIntegral).toBe(true);

    const pag = await db.doc(`pagamentos/${pagamentoId}`).get();
    expect(pag.get('estornadoTotal')).toBe(512.73);
    expect(pag.get('status')).toBe('estornado');
    // Sobra na receita SÓ o pedido solo pago no teste do inscrito alheio
    expect(await receitaConfirmada()).toBe(189.9);
    const charge = mockPaymentProvider.getCharge(chargeId);
    expect(charge?.refundedAmount).toBe(51273);
    expect(charge?.status).toBe('refunded');
  });

  it('sem login → unauthenticated', async () => {
    await signOut(getLeelaAuth());
    const erro = await capturarErro(
      estornarViaWrapper({
        pedidoId,
        inscritoId: inscritoIds[0]!,
        motivo: 'E2E review: sem token',
      })
    );
    expect(erro.code).toBe('functions/unauthenticated');
  });
});
