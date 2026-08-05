/**
 * codigoPedidoReserva.integration.test.ts — LEELA-S1228-T1 (RN-474/RN-475)
 *
 * Integração REAL no Firestore Emulator (lane BUILD-COD5A = 8781 via
 * emulators:exec + firebase.cod5a.json; honra LEELA_FS_EMU_PORT). O que esta
 * suíte prova, e que nenhum unit puro consegue provar:
 *
 *   1. ATOMICIDADE — pedido e reserva nascem no MESMO commit. Os dois estados
 *      proibidos pela RN-474 ("pedido sem código", "código sem pedido") são
 *      medidos nos dois sentidos, inclusive no caminho de FALHA.
 *   2. UNICIDADE por CHAVE PRIMÁRIA — com o RNG forçado a repetir o mesmo
 *      código, quem garante é a reserva, não o sorteio.
 *   3. RE-SORTEIO com TETO — colisão re-sorteia; teto estourado FALHA de forma
 *      explícita e NADA é escrito (nunca grava duplicado, nunca silencia).
 *   4. IDEMPOTÊNCIA — o mecanismo `chk-` de hoje NÃO regride: a mesma
 *      tentativa de compra (mesma `idempotencyKey`), em replay ou em corrida,
 *      produz UM pedido, UM código e UMA reserva.
 *   5. ESPELHO — cada inscrito do pedido carrega o mesmo código, imutável.
 *   6. RULES — `pedidoCodigos` é inacessível ao cliente pelo deny-by-default
 *      do arquivo REAL, sem nenhum `match` novo (a prova de que a lane não
 *      precisou editar `firestore.rules`).
 *
 * ⚠ PRÉ-REQUISITO: Firestore Emulator via `firebase emulators:exec`.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  gerarCodigoPedido,
  isCodigoPedidoValido,
  parseInscrito,
  parsePedido,
  TAMANHO_CODIGO_PEDIDO,
} from '@leela/core';
import {
  createInscricaoChargeCore,
  idsDoCheckout,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import {
  PEDIDO_CODIGOS_COL,
  TENTATIVAS_CODIGO_PEDIDO,
} from '../checkout/codigoPedidoReserva';
import { MockPaymentProvider } from '../payments/mockProvider';

const PROJECT_ID = 'demo-leela-cod5a';
const FIRESTORE_PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8781);
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';
const CPF_ANA = '529.982.247-25';
const CPF_BRUNO = '168.995.350-09';

process.env['CRM_ID_PEPPER'] = 'pepper-teste-cod5a';

// Comprador NOVO por teste: a trava de segunda cobrança PIX viva (RN-157)
// recusaria compras idênticas encadeadas do mesmo uid, e estes fixtures são
// idênticos de propósito. Mesma disciplina do checkout2Modelo.
let compradorUid = 'uid-cod5a-0';
let seqComprador = 0;
beforeEach(() => {
  seqComprador += 1;
  compradorUid = `uid-cod5a-${seqComprador}`;
});

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: FIRESTORE_PORT,
    },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `localhost:${FIRESTORE_PORT}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  await seedBase();
}, 30_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (dias: number): Timestamp =>
  Timestamp.fromDate(new Date(Date.now() + dias * DIA_MS));

async function seedBase(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID,
    nome: 'Castelo Produções',
    slug: TENANT_ID,
    status: 'ativo',
    ownerUid: 'uid-marina-castelo',
    tipo: 'produtor',
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 20 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1,
    atualizadoPor: 'seed',
    atualizadoEm: now,
  });
  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID,
    tenantId: TENANT_ID,
    organizadorId: 'uid-marina-castelo',
    nome: 'Meia de Floripa 2026',
    data: tsRel(45),
    local: 'Florianópolis/SC',
    modalidades: ['10k'],
    slug: EVENTO_ID,
    status: 'publicado',
    usaChip: true,
    qtdInscritos: 0,
    receitaConfirmada: 0,
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc('10k-l2'), {
    id: '10k-l2',
    tenantId: TENANT_ID,
    modalidade: '10k',
    ordem: 2,
    nome: 'Lote 2',
    inicioEm: tsRel(-1),
    fimEm: tsRel(30),
    quantidadeLimite: 500,
    preco: 189.9,
    vendidos: 40,
    criadoEm: now,
    atualizadoEm: now,
  });
  await batch.commit();
}

function inputDaCompra(key: string): CreateInscricaoChargeInput {
  return {
    eventoId: EVENTO_ID,
    inscritos: [
      {
        nome: 'Ana Atleta',
        email: 'ana@exemplo.com.br',
        cpf: CPF_ANA,
        modalidade: '10k',
        nascimento: '1990-05-17',
      },
      {
        nome: 'Bruno Convidado',
        email: 'bruno@exemplo.com.br',
        cpf: CPF_BRUNO,
        modalidade: '10k',
        nascimento: '1985-11-02',
      },
    ],
    responsavelIndex: 0,
    responsavel: {
      nome: 'Ana Atleta',
      email: 'ana@exemplo.com.br',
      telefone: '(48) 99999-0001',
    },
    endereco: {
      cep: '88015-600',
      logradouro: 'Rua Bocaiúva',
      bairro: 'Centro',
      cidade: 'Florianópolis',
      uf: 'SC',
      numero: '2468',
    },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
  };
}

/** RNG que produz SEMPRE o mesmo código — o forçador de colisão. */
function rngFixo(semente: number): () => number {
  return () => semente;
}

/**
 * RNG que produz `codigos[0]` nas primeiras `repetir` rodadas de sorteio e
 * depois `codigos[1]`. Cada código consome TAMANHO_CODIGO_PEDIDO chamadas.
 */
function rngEmSequencia(sementes: readonly number[]): () => number {
  let chamadas = 0;
  return () => {
    const rodada = Math.floor(chamadas / TAMANHO_CODIGO_PEDIDO);
    chamadas += 1;
    return sementes[Math.min(rodada, sementes.length - 1)] ?? 0.5;
  };
}

const caller = (): { uid: string; ehAnonimo: boolean } => ({
  uid: compradorUid,
  ehAnonimo: true,
});

async function lerReserva(codigo: string) {
  return db.collection(PEDIDO_CODIGOS_COL).doc(codigo).get();
}

async function contarReservas(): Promise<number> {
  const snap = await db.collection(PEDIDO_CODIGOS_COL).get();
  return snap.size;
}

// ---------------------------------------------------------------------------
// 1 · o código nasce com o pedido, no mesmo commit
// ---------------------------------------------------------------------------

describe('RN-474 — o código nasce na criação do pedido', () => {
  it('pedido criado carrega codigoPedido canônico E a reserva aponta de volta (atomicidade nos dois sentidos)', async () => {
    const r = await createInscricaoChargeCore(
      db,
      provider,
      inputDaCompra('cod5a-nasce-01'),
      caller()
    );

    const pedidoSnap = await db.collection('pedidos').doc(r.pedidoId).get();
    const pedido = parsePedido(r.pedidoId, pedidoSnap.data() ?? {});

    // (a) NÃO existe pedido sem código.
    expect(pedido.codigoPedido).toBeDefined();
    expect(isCodigoPedidoValido(pedido.codigoPedido)).toBe(true);
    expect(pedido.codigoPedido).toHaveLength(TAMANHO_CODIGO_PEDIDO);

    // (b) NÃO existe código sem pedido: a reserva existe e aponta para ELE.
    const reserva = await lerReserva(pedido.codigoPedido as string);
    expect(reserva.exists).toBe(true);
    expect(reserva.get('pedidoId')).toBe(r.pedidoId);

    // (c) O prefixo NÃO é gravado — ele é apresentação (decisão COD-4).
    expect(pedido.codigoPedido?.startsWith('PED-')).toBe(false);
    expect(reserva.id).toBe(pedido.codigoPedido);
  });

  it('cada inscrito do pedido carrega o MESMO código (espelho da RN-474, na mesma tx)', async () => {
    const r = await createInscricaoChargeCore(
      db,
      provider,
      inputDaCompra('cod5a-espelho-01'),
      caller()
    );
    const pedidoSnap = await db.collection('pedidos').doc(r.pedidoId).get();
    const codigo = pedidoSnap.get('codigoPedido') as string;

    expect(r.inscritoIds.length).toBe(2);
    for (const inscritoId of r.inscritoIds) {
      const snap = await db
        .doc(`eventos/${EVENTO_ID}/inscritos/${inscritoId}`)
        .get();
      // O parse do core prova que o espelho entrou no contrato tipado.
      const inscrito = parseInscrito(inscritoId, snap.data() ?? {});
      expect(inscrito.codigoPedido).toBe(codigo);
    }
  });

  it('dois pedidos distintos ganham códigos distintos e duas reservas', async () => {
    const antes = await contarReservas();
    const r1 = await createInscricaoChargeCore(
      db,
      provider,
      inputDaCompra('cod5a-dois-01'),
      caller()
    );
    seqComprador += 1;
    compradorUid = `uid-cod5a-${seqComprador}`;
    const r2 = await createInscricaoChargeCore(
      db,
      provider,
      inputDaCompra('cod5a-dois-02'),
      caller()
    );

    const c1 = (await db.collection('pedidos').doc(r1.pedidoId).get()).get(
      'codigoPedido'
    ) as string;
    const c2 = (await db.collection('pedidos').doc(r2.pedidoId).get()).get(
      'codigoPedido'
    ) as string;
    expect(c1).not.toBe(c2);
    expect(await contarReservas()).toBe(antes + 2);
  });
});

// ---------------------------------------------------------------------------
// 2 · unicidade por chave primária, com o sorteio sabotado
// ---------------------------------------------------------------------------

describe('RN-474 — quem garante a unicidade é a RESERVA, não o sorteio', () => {
  it('RNG forçado a repetir o código de outra compra ⇒ o segundo pedido NÃO nasce com ele', async () => {
    // Primeira compra com o RNG pregado: o código sai determinístico.
    const semente = 0.42;
    const codigoPregado = gerarCodigoPedido(rngFixo(semente));
    const r1 = await createInscricaoChargeCore(
      db,
      provider,
      inputDaCompra('cod5a-colide-01'),
      caller(),
      () => new Date(),
      rngFixo(semente)
    );
    const c1 = (await db.collection('pedidos').doc(r1.pedidoId).get()).get(
      'codigoPedido'
    ) as string;
    expect(c1).toBe(codigoPregado);

    // Segunda compra: o RNG insiste no MESMO código nas primeiras rodadas e
    // só então cede. O sorteio repetiu; a reserva é que decidiu.
    seqComprador += 1;
    compradorUid = `uid-cod5a-${seqComprador}`;
    const r2 = await createInscricaoChargeCore(
      db,
      provider,
      inputDaCompra('cod5a-colide-02'),
      caller(),
      () => new Date(),
      rngEmSequencia([semente, semente, semente, 0.77])
    );
    const c2 = (await db.collection('pedidos').doc(r2.pedidoId).get()).get(
      'codigoPedido'
    ) as string;

    expect(c2).not.toBe(c1);
    expect(isCodigoPedidoValido(c2)).toBe(true);
    // A reserva do primeiro segue apontando para o PRIMEIRO — ninguém a
    // sobrescreveu (`create`, nunca `set`).
    expect((await lerReserva(c1)).get('pedidoId')).toBe(r1.pedidoId);
    expect((await lerReserva(c2)).get('pedidoId')).toBe(r2.pedidoId);
  });

  it('TETO estourado ⇒ falha EXPLÍCITA e NADA escrito (nem pedido, nem pagamento, nem inscrito, nem reserva alheia tocada)', async () => {
    // Reserva ocupada por um pedido que não é este, e o RNG só sabe sortear
    // ela. As TENTATIVAS_CODIGO_PEDIDO passagens falham.
    const semente = 0.13;
    const ocupado = gerarCodigoPedido(rngFixo(semente));
    await db
      .collection(PEDIDO_CODIGOS_COL)
      .doc(ocupado)
      .set({ pedidoId: 'ped-de-outra-pessoa', criadoEm: FieldValue.serverTimestamp() });

    const reservasAntes = await contarReservas();
    const key = 'cod5a-teto-01';
    // Os ids são DETERMINÍSTICOS (é a idempotência do checkout) — dá para
    // provar a ausência doc a doc, e não por contagem aproximada.
    const { pedidoId, pagamentoId, inscritoIds } = idsDoCheckout(
      compradorUid,
      key,
      2
    );

    await expect(
      createInscricaoChargeCore(
        db,
        provider,
        inputDaCompra(key),
        caller(),
        () => new Date(),
        rngFixo(semente)
      )
    ).rejects.toThrow(/código da sua compra/i);

    // Nada escrito: nem pedido, nem pagamento, nem inscrito.
    expect((await db.collection('pedidos').doc(pedidoId).get()).exists).toBe(
      false
    );
    expect(
      (await db.collection('pagamentos').doc(pagamentoId).get()).exists
    ).toBe(false);
    for (const inscritoId of inscritoIds) {
      const snap = await db
        .doc(`eventos/${EVENTO_ID}/inscritos/${inscritoId}`)
        .get();
      expect(snap.exists).toBe(false);
    }
    // …e nenhuma reserva nova, com a alheia INTACTA.
    expect(await contarReservas()).toBe(reservasAntes);
    expect((await lerReserva(ocupado)).get('pedidoId')).toBe(
      'ped-de-outra-pessoa'
    );
  });

  it('o teto é 8 — e o sintoma que ele publica pede mais SÍMBOLO, não mais tentativa', () => {
    expect(TENTATIVAS_CODIGO_PEDIDO).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// 3 · a idempotência de hoje não regride
// ---------------------------------------------------------------------------

describe('RN-474 — a mesma tentativa de compra NÃO gera dois códigos', () => {
  it('REPLAY (mesma idempotencyKey, em sequência) ⇒ mesmo pedido, MESMO código, UMA reserva', async () => {
    const key = 'cod5a-replay-01';
    const antes = await contarReservas();

    const r1 = await createInscricaoChargeCore(
      db,
      provider,
      inputDaCompra(key),
      caller()
    );
    const c1 = (await db.collection('pedidos').doc(r1.pedidoId).get()).get(
      'codigoPedido'
    ) as string;

    // O replay usa um RNG DIFERENTE de propósito: se o código fosse re-sorteado
    // no caminho de replay, ele mudaria — e o e-mail já enviado passaria a
    // mentir. A porta que impede isso é o `tx.get(pedidoRef)` da tx de venda.
    const r2 = await createInscricaoChargeCore(
      db,
      provider,
      inputDaCompra(key),
      caller(),
      () => new Date(),
      rngFixo(0.9)
    );
    const c2 = (await db.collection('pedidos').doc(r2.pedidoId).get()).get(
      'codigoPedido'
    ) as string;

    expect(r2.pedidoId).toBe(r1.pedidoId);
    expect(c2).toBe(c1);
    expect(await contarReservas()).toBe(antes + 1);
  });

  it('CORRIDA (duas chamadas CONCORRENTES com a mesma chave) ⇒ 1 pedido, 1 código, 1 reserva', async () => {
    const key = 'cod5a-corrida-01';
    const antes = await contarReservas();

    const [a, b] = await Promise.all([
      createInscricaoChargeCore(db, provider, inputDaCompra(key), caller()),
      createInscricaoChargeCore(db, provider, inputDaCompra(key), caller()),
    ]);

    expect(a.pedidoId).toBe(b.pedidoId);
    const snap = await db.collection('pedidos').doc(a.pedidoId).get();
    const codigo = snap.get('codigoPedido') as string;
    expect(isCodigoPedidoValido(codigo)).toBe(true);

    // Exatamente UMA reserva nova, e ela é a deste pedido. Duas reservas aqui
    // significariam um código órfão — o segundo estado proibido da RN-474.
    expect(await contarReservas()).toBe(antes + 1);
    expect((await lerReserva(codigo)).get('pedidoId')).toBe(a.pedidoId);
  });

  it('o espelho do inscrito continua igual ao do pedido depois do replay (o código nunca muda)', async () => {
    const key = 'cod5a-replay-espelho-01';
    const r1 = await createInscricaoChargeCore(
      db,
      provider,
      inputDaCompra(key),
      caller()
    );
    await createInscricaoChargeCore(
      db,
      provider,
      inputDaCompra(key),
      caller(),
      () => new Date(),
      rngFixo(0.05)
    );
    const codigo = (await db.collection('pedidos').doc(r1.pedidoId).get()).get(
      'codigoPedido'
    ) as string;
    for (const inscritoId of r1.inscritoIds) {
      const snap = await db
        .doc(`eventos/${EVENTO_ID}/inscritos/${inscritoId}`)
        .get();
      expect(snap.get('codigoPedido')).toBe(codigo);
    }
  });
});

// ---------------------------------------------------------------------------
// 4 · a reserva é server-only — sem match, pelo deny-by-default
// ---------------------------------------------------------------------------

describe('RN-474 — `pedidoCodigos` é inacessível ao cliente (deny-by-default, sem `match` novo)', () => {
  const CODIGO_ALVO = 'A2B3C';

  async function clienteAnonimo(): Promise<Firestore> {
    return testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
  }
  async function clienteAutenticado(): Promise<Firestore> {
    return testEnv
      .authenticatedContext('uid-sondador', { role: 'athlete' })
      .firestore() as unknown as Firestore;
  }
  async function clienteOrganizador(): Promise<Firestore> {
    return testEnv
      .authenticatedContext('uid-marina-castelo', {
        role: 'tenant_owner',
        tenantId: TENANT_ID,
      })
      .firestore() as unknown as Firestore;
  }

  beforeAll(async () => {
    await db
      .collection(PEDIDO_CODIGOS_COL)
      .doc(CODIGO_ALVO)
      .set({ pedidoId: 'ped-alvo', criadoEm: FieldValue.serverTimestamp() });
  });

  it('anônimo NÃO lê a reserva', async () => {
    const fs = await clienteAnonimo();
    await assertFails(getDoc(doc(fs, `${PEDIDO_CODIGOS_COL}/${CODIGO_ALVO}`)));
  });

  it('atleta autenticado NÃO lê a reserva (o código não é chave de nada)', async () => {
    const fs = await clienteAutenticado();
    await assertFails(getDoc(doc(fs, `${PEDIDO_CODIGOS_COL}/${CODIGO_ALVO}`)));
  });

  it('nem o dono do tenant lê — a coleção é global e server-only', async () => {
    const fs = await clienteOrganizador();
    await assertFails(getDoc(doc(fs, `${PEDIDO_CODIGOS_COL}/${CODIGO_ALVO}`)));
  });

  it('ninguém ESCREVE — reservar o código de outra pessoa antes dela é o ataque', async () => {
    const fs = await clienteAutenticado();
    await assertFails(
      setDoc(doc(fs, `${PEDIDO_CODIGOS_COL}/ZZZZZ`), {
        pedidoId: 'ped-do-atacante',
      })
    );
    // …nem sobrescrever a reserva existente para roubá-la.
    await assertFails(
      setDoc(doc(fs, `${PEDIDO_CODIGOS_COL}/${CODIGO_ALVO}`), {
        pedidoId: 'ped-do-atacante',
      })
    );
  });

  it('a reserva segue intacta depois dos ataques (o Admin SDK a lê; o cliente, nunca)', async () => {
    expect((await lerReserva(CODIGO_ALVO)).get('pedidoId')).toBe('ped-alvo');
  });
});
