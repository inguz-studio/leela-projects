/**
 * sorteioCodigoVenda.integration.test.ts — RN-474 · achado da lane BUILD-5B
 *
 * Integração REAL no Firestore Emulator da lane BUILD-A4 (`firebase.a4.json`
 * — firestore 8983; honra `LEELA_FS_EMU_PORT`).
 *
 * O QUE ESTA SUÍTE PROVA, e por que ela precisou existir:
 *
 * O commit `d36afb64` trocou o sorteio dos códigos que a pessoa DITA por
 * entropia do sistema (`packages/core/src/aleatorio.ts`), porque o PRNG do V8
 * tem estado recuperável a partir de poucas saídas. A BUILD-5B mediu e achou o
 * furo: a troca NÃO chegava ao caminho da venda. A cadeia
 * `createInscricaoChargeCore` → `criarDocsDeCheckout` → `sortearCodigoPedidoNaTx`
 * → `gerarCodigoPedido(random)` empurrava `random` explicitamente até o fim, e
 * os três pontos tinham `= Math.random` como default de parâmetro. Como a
 * callable nunca passa nada, o default era, na prática, a fonte de TODA venda:
 * o sorteio criptográfico ficava inerte justamente onde importa.
 *
 * O caso 1 é o que falha antes da correção: com `Math.random` PREGADO numa
 * fonte determinística, o código da compra sai exatamente igual ao que essa
 * fonte produz — prova de que era ela quem sorteava. Depois da correção o
 * `undefined` atravessa a cadeia e `gerarCodigoPedido` cai na entropia do
 * sistema, que o pregamento de `Math.random` não alcança.
 *
 * O caso 2 é o contrapeso: a INJEÇÃO continua funcionando. É ela que os testes
 * de colisão usam para forçar o mesmo código duas vezes, e uma correção que a
 * matasse trocaria um defeito por outro.
 *
 * ⚠ PRÉ-REQUISITO: Firestore Emulator via `firebase emulators:exec`.
 */

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  ALFABETO_CODIGO_PEDIDO,
  gerarCodigoPedido,
  isCodigoPedidoValido,
} from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { PEDIDO_CODIGOS_COL } from '../checkout/codigoPedidoReserva';
import { MockPaymentProvider } from '../payments/mockProvider';

const PROJECT_ID = 'demo-leela-a4-sorteio';

process.env['CRM_ID_PEPPER'] = 'pepper-teste-a4-sorteio';

const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-sorteio-2026';

/**
 * Duas fontes PREGADAS, cada uma com um código próprio e previsível.
 *
 * Os códigos saem de `gerarCodigoPedido`, nunca escritos à mão: trocar o
 * alfabeto ou o comprimento não pode desalinhar silenciosamente a prova.
 */
const FONTE_ZERO = (): number => 0;
const FONTE_MEIO = (): number => 0.5;
const CODIGO_DA_FONTE_ZERO = gerarCodigoPedido(FONTE_ZERO);
const CODIGO_DA_FONTE_MEIO = gerarCodigoPedido(FONTE_MEIO);

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: 'localhost',
      port: Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080),
    },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      `localhost:${process.env['LEELA_FS_EMU_PORT'] ?? '8080'}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  await seedBase();
}, 30_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (deltaDias: number): Timestamp =>
  Timestamp.fromDate(new Date(Date.now() + deltaDias * DIA_MS));

async function seedBase(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: 'uid-marina-castelo', tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 20 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });
  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-marina-castelo',
    nome: 'Meia do Sorteio 2026',
    data: tsRel(45), local: 'Florianópolis/SC',
    modalidades: ['10k'],
    slug: EVENTO_ID, status: 'publicado', usaChip: true,
    qtdInscritos: 0, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc('10k-l1'), {
    id: '10k-l1', tenantId: TENANT_ID, modalidade: '10k', ordem: 1,
    nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(30),
    quantidadeLimite: 500, preco: 189.9, vendidos: 10,
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

const CPFS = [
  '529.982.247-25',
  '111.444.777-35',
  '390.533.447-05',
  '418.529.630-42',
];

function inputSolo(key: string, cpf: string): CreateInscricaoChargeInput {
  return {
    eventoId: EVENTO_ID,
    inscritos: [
      {
        nome: 'Pessoa do Sorteio',
        email: `sorteio.${key}@exemplo.com.br`,
        cpf,
        modalidade: '10k',
      },
    ],
    responsavelIndex: 0,
    responsavel: {
      nome: 'Pessoa do Sorteio',
      email: `sorteio.${key}@exemplo.com.br`,
    },
    endereco: {
      cep: '88015-600', logradouro: 'Rua Bocaiúva', bairro: 'Centro',
      cidade: 'Florianópolis', uf: 'SC', numero: '100',
    },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
  };
}

async function codigoDoPedido(pedidoId: string): Promise<unknown> {
  return (await db.collection('pedidos').doc(pedidoId).get()).get(
    'codigoPedido'
  );
}

// ---------------------------------------------------------------------------

describe('RN-474 — o sorteio do código da venda usa a entropia do sistema', () => {
  it('1 · com `Math.random` PREGADO, a venda NÃO produz o código dessa fonte', async () => {
    // O pregamento é global e curto: só a chamada da venda roda debaixo dele,
    // e o `finally` devolve a fonte original mesmo se a venda lançar.
    const original = Math.random;
    let pedidoId: string;
    try {
      Math.random = FONTE_ZERO;
      const r = await createInscricaoChargeCore(
        db, provider, inputSolo('a4-sorteio-default', CPFS[0] as string),
        { uid: 'anon-a4-sorteio-1', ehAnonimo: true }
      );
      pedidoId = r.pedidoId;
    } finally {
      Math.random = original;
    }

    const codigo = await codigoDoPedido(pedidoId);
    // ⚔ ESTA é a linha que fica vermelha sem a correção dos defaults: com o
    // `= Math.random` na cadeia, o código sai EXATAMENTE igual ao da fonte
    // pregada, provando que era ela quem sorteava a compra de verdade.
    expect(codigo).not.toBe(CODIGO_DA_FONTE_ZERO);
    expect(isCodigoPedidoValido(codigo)).toBe(true);
    // E o código sorteado é do alfabeto da RN-474, símbolo a símbolo.
    for (const s of String(codigo)) {
      expect(ALFABETO_CODIGO_PEDIDO).toContain(s);
    }
  });

  it('2 · a INJEÇÃO continua viva: fonte passada explicitamente decide o código', async () => {
    // É o seam que os testes de colisão usam. Uma correção que o matasse
    // trocaria um defeito por outro.
    const r = await createInscricaoChargeCore(
      db, provider, inputSolo('a4-sorteio-injetado', CPFS[1] as string),
      { uid: 'anon-a4-sorteio-2', ehAnonimo: true },
      () => new Date(),
      FONTE_MEIO
    );
    expect(await codigoDoPedido(r.pedidoId)).toBe(CODIGO_DA_FONTE_MEIO);
  });

  it('3 · a reserva por chave primária acompanha o código sorteado pelo sistema', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, inputSolo('a4-sorteio-reserva', CPFS[2] as string),
      { uid: 'anon-a4-sorteio-3', ehAnonimo: true }
    );
    const codigo = String(await codigoDoPedido(r.pedidoId));
    expect(isCodigoPedidoValido(codigo)).toBe(true);

    const reserva = await db.collection(PEDIDO_CODIGOS_COL).doc(codigo).get();
    expect(reserva.exists).toBe(true);
    expect(reserva.get('pedidoId')).toBe(r.pedidoId);
  });

  it('4 · duas vendas seguidas, sem injeção, não repetem o código', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, inputSolo('a4-sorteio-segunda', CPFS[3] as string),
      { uid: 'anon-a4-sorteio-4', ehAnonimo: true }
    );
    const codigos = new Set<string>();
    for (const doc of (await db.collection('pedidos').get()).docs) {
      const c = doc.get('codigoPedido') as string | undefined;
      if (typeof c === 'string') codigos.add(c);
    }
    expect(codigos.size).toBe((await db.collection('pedidos').get()).size);
    expect(isCodigoPedidoValido(await codigoDoPedido(r.pedidoId))).toBe(true);
  });
});
