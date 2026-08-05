/**
 * codigoPedidoReserva.attack.test.ts — REVIEW ANTAGONISTA da S1228-T1
 * (lane REV-COD5A · RN-474/RN-475).
 *
 * O que esta suíte ataca, e que a suíte do construtor NÃO cobria:
 *
 *   A1. Concorrência ACIMA de duas chamadas com a MESMA chave (declarado
 *       `Not-tested` no commit `3acc6877`). Oito ao mesmo tempo.
 *   A2. Concorrência com chaves DISTINTAS num espaço de código artificialmente
 *       minúsculo — o cenário em que a reserva é a ÚNICA coisa entre duas
 *       compras e o mesmo código. Invariante medida em massa: nenhum código
 *       repetido, nenhum pedido sem código, nenhuma reserva sem pedido.
 *   A3. Reserva plantada À MÃO com shape errado (`{}`, `pedidoId` numérico,
 *       `pedidoId: null`). O sorteio só olha `exists` — tem de DESVIAR, não
 *       quebrar, e não pode adotar o doc torto.
 *   A4. O ramo `(b)` do `catch` de ALREADY_EXISTS — a reserva colidindo ENTRE
 *       a leitura e o commit, com o pedido inexistente. O construtor o
 *       declarou `Not-tested` ("exigiria um seam que não existe"). O seam
 *       existe: um Proxy sobre a `Transaction` cria o doc fora de banda
 *       DEPOIS que a tx o leu como livre e ANTES do commit. Nenhuma linha de
 *       produção muda para isso.
 *   A5. A LACUNA DAS RULES do Achado 2, medida em vez de declarada: o
 *       organizador (isTenantWriter) tentava plantar `codigoPedido` num
 *       inscrito pelo client SDK e conseguia. A lane FIX-D1 acrescentou o
 *       campo às duas listas `hasAny` e o bloco virou o que prometia ser: o
 *       TRIPWIRE das Rules do espelho, medido contra o arquivo REAL.
 *
 * ⚠ PRÉ-REQUISITO: Firestore Emulator próprio da lane de review
 * (`firebase.revcod5a.json` — firestore 8881, auth 9881, host IPv4).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { doc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { isCodigoPedidoValido, parseInscrito, parsePedido } from '@leela/core';
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

const PROJECT_ID = 'demo-leela-revcod5a';
const FIRESTORE_PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8881);
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';
const CPF_ANA = '529.982.247-25';
const CPF_BRUNO = '168.995.350-09';

process.env['CRM_ID_PEPPER'] = 'pepper-teste-revcod5a';

let compradorUid = 'uid-rev-0';
let seqComprador = 0;
beforeEach(() => {
  seqComprador += 1;
  compradorUid = `uid-rev-${seqComprador}`;
});

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: FIRESTORE_PORT,
    },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `127.0.0.1:${FIRESTORE_PORT}`;
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

const callerDe = (uid: string): { uid: string; ehAnonimo: boolean } => ({
  uid,
  ehAnonimo: true,
});

/**
 * RNG que percorre `sementes` uma por RODADA de sorteio (cada código consome
 * 5 chamadas) e trava na última — o forçador de espaço minúsculo.
 */
function rngPorRodada(sementes: readonly number[]): () => number {
  let chamadas = 0;
  return () => {
    const rodada = Math.floor(chamadas / 5);
    chamadas += 1;
    return sementes[Math.min(rodada, sementes.length - 1)] ?? 0.5;
  };
}

/** A semente `s` constante produz um código de 5 símbolos determinístico. */
function codigoDaSemente(s: number): string {
  const ALF = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const i = Math.floor(Math.min(Math.max(s, 0), 1 - Number.EPSILON) * 31);
  return (ALF[i] ?? 'A').repeat(5);
}

async function contarReservas(): Promise<number> {
  return (await db.collection(PEDIDO_CODIGOS_COL).get()).size;
}

// ---------------------------------------------------------------------------
// A1 · concorrência ACIMA de duas com a MESMA chave (Not-tested do construtor)
// ---------------------------------------------------------------------------

describe('A1 — oito chamadas CONCORRENTES com a mesma chave', () => {
  it('produz UM pedido, UM código, UMA reserva e o espelho coerente', async () => {
    const uid = compradorUid;
    const key = 'chk-a1-oito';
    const antes = await contarReservas();

    const resultados = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        createInscricaoChargeCore(
          db,
          provider,
          inputDaCompra(key),
          callerDe(uid)
        )
      )
    );

    const { pedidoId, inscritoIds } = idsDoCheckout(uid, key, 2);
    const pedidoSnap = await db.collection('pedidos').doc(pedidoId).get();
    expect(pedidoSnap.exists).toBe(true);
    const pedido = parsePedido(pedidoSnap.id, pedidoSnap.data() ?? {});
    expect(isCodigoPedidoValido(pedido.codigoPedido)).toBe(true);

    // UMA reserva nova, e ela aponta de volta para ESTE pedido.
    expect((await contarReservas()) - antes).toBe(1);
    const reserva = await db
      .collection(PEDIDO_CODIGOS_COL)
      .doc(pedido.codigoPedido as string)
      .get();
    expect(reserva.exists).toBe(true);
    expect(reserva.get('pedidoId')).toBe(pedidoId);

    // Espelho: todo inscrito carrega o MESMO código do pedido.
    for (const iid of inscritoIds) {
      const s = await db
        .doc(`eventos/${EVENTO_ID}/inscritos/${iid}`)
        .get();
      expect(s.exists).toBe(true);
      expect(parseInscrito(s.id, s.data() ?? {}).codigoPedido).toBe(
        pedido.codigoPedido
      );
    }

    // Quem venceu devolveu o MESMO pedido; ninguém devolveu um segundo.
    const ok = resultados.filter((r) => r.status === 'fulfilled');
    expect(ok.length).toBeGreaterThan(0);
    for (const r of ok) {
      expect(
        (r as PromiseFulfilledResult<{ pedidoId: string }>).value.pedidoId
      ).toBe(pedidoId);
    }
  }, 60_000);
});

// ---------------------------------------------------------------------------
// A2 · concorrência com chaves DISTINTAS num espaço de código minúsculo
// ---------------------------------------------------------------------------

describe('A2 — seis compras distintas disputando DOIS códigos possíveis', () => {
  it('nenhum código repetido, nenhum pedido sem código, nenhuma reserva sem pedido', async () => {
    // Espaço artificialmente reduzido a 2 códigos: a reserva é a ÚNICA coisa
    // entre duas compras e o mesmo código. Sem ela, 6 compras sairiam com no
    // máximo 2 códigos distintos e quatro pessoas ditariam o código alheio.
    const sementes = [0.0, 0.05] as const;
    const N = 6;
    const uids = Array.from({ length: N }, (_, i) => `uid-a2-${i}`);

    const resultados = await Promise.allSettled(
      uids.map((uid, i) =>
        createInscricaoChargeCore(
          db,
          provider,
          inputDaCompra(`chk-a2-${i}`),
          callerDe(uid),
          () => new Date(),
          rngPorRodada(sementes)
        )
      )
    );

    const codigos: string[] = [];
    for (let i = 0; i < N; i++) {
      const { pedidoId } = idsDoCheckout(uids[i] as string, `chk-a2-${i}`, 2);
      const snap = await db.collection('pedidos').doc(pedidoId).get();
      if (!snap.exists) {
        // Compra recusada: NADA pode ter sobrado dela.
        expect(resultados[i]?.status).toBe('rejected');
        continue;
      }
      const p = parsePedido(snap.id, snap.data() ?? {});
      // Estado proibido nº 1: pedido SEM código.
      expect(isCodigoPedidoValido(p.codigoPedido)).toBe(true);
      codigos.push(p.codigoPedido as string);
      // A reserva do código existe e é DESTE pedido.
      const r = await db
        .collection(PEDIDO_CODIGOS_COL)
        .doc(p.codigoPedido as string)
        .get();
      expect(r.exists).toBe(true);
      expect(r.get('pedidoId')).toBe(pedidoId);
    }

    // Estado proibido nº 2 (o que o código existe para não ter): duas compras
    // vivas com o MESMO código.
    expect(new Set(codigos).size).toBe(codigos.length);
    // Com 2 códigos possíveis e teto 8, no máximo 2 compras sobrevivem.
    expect(codigos.length).toBeLessThanOrEqual(sementes.length);
    expect(codigos.length).toBeGreaterThan(0);
  }, 90_000);
});

// ---------------------------------------------------------------------------
// A3 · reserva plantada À MÃO com shape errado
// ---------------------------------------------------------------------------

describe('A3 — reserva com shape torto no caminho do sorteio', () => {
  it.each([
    ['doc vazio', {}, 0.1, 0.15],
    ['pedidoId numérico', { pedidoId: 42 }, 0.2, 0.25],
    ['pedidoId nulo', { pedidoId: null }, 0.3, 0.35],
    ['campo alheio', { lixo: 'x', criadoEm: 'ontem' }, 0.4, 0.45],
  ])(
    'DESVIA de %s em vez de quebrar ou adotar o doc torto',
    async (nome, shape, semOcupada, semLivre) => {
      const ocupado = codigoDaSemente(semOcupada as number);
      const livre = codigoDaSemente(semLivre as number);
      await db.collection(PEDIDO_CODIGOS_COL).doc(ocupado).set(shape as object);

      const uid = compradorUid;
      const key = `chk-a3-${String(nome).replace(/\W+/g, '')}`;
      const res = await createInscricaoChargeCore(
        db,
        provider,
        inputDaCompra(key),
        callerDe(uid),
        () => new Date(),
        rngPorRodada([semOcupada as number, semLivre as number])
      );

      const snap = await db.collection('pedidos').doc(res.pedidoId).get();
      const p = parsePedido(snap.id, snap.data() ?? {});
      expect(p.codigoPedido).toBe(livre);
      expect(p.codigoPedido).not.toBe(ocupado);
      // O doc torto continua torto — o checkout não o sobrescreveu.
      const torto = await db.collection(PEDIDO_CODIGOS_COL).doc(ocupado).get();
      expect(torto.exists).toBe(true);
      expect(torto.get('pedidoId')).not.toBe(res.pedidoId);
    },
    60_000
  );
});

// ---------------------------------------------------------------------------
// A4 · o ramo (b) do catch — colisão da reserva ENTRE a leitura e o commit
// ---------------------------------------------------------------------------

/**
 * A JANELA REAL É IRREPRODUZÍVEL NO EMULATOR — e a tentativa deixou prova:
 * criar `pedidoCodigos/{codigo}` fora de banda DEPOIS que a transação já o leu
 * trava por 60s, porque o emulator serializa a escrita contra o lock da tx
 * aberta. Nenhum teste força o instante entre a leitura e o commit.
 *
 * O que É testável, e é o que decide o desfecho, é o CONTRATO DO `catch`:
 * ALREADY_EXISTS no commit da tx da VENDA, com e sem o pedido no lugar. Este
 * proxy injeta exatamente esse erro — e só na tx da venda, identificada pelo
 * corpo do callback, para o teste não passar de graça em outra transação.
 *
 * `rodarAntes: true` = o ramo (a) real: o concorrente de MESMA chave venceu e
 * gravou tudo, e é ESTA tentativa que recebe o ALREADY_EXISTS.
 */
function dbComAlreadyExistsNaVenda(
  real: admin.firestore.Firestore,
  opts: { rodarAntes: boolean; achou: { venda: boolean } }
): admin.firestore.Firestore {
  let jaDisparou = false;
  return new Proxy(real, {
    get(alvo, prop, receiver) {
      if (prop === 'runTransaction') {
        return async (...args: unknown[]): Promise<unknown> => {
          const chamar = (
            alvo.runTransaction as unknown as (
              ...a: unknown[]
            ) => Promise<unknown>
          ).bind(alvo);
          const corpo = String(args[0]);
          const ehVenda =
            !jaDisparou && corpo.includes('sortearCodigoPedidoNaTx');
          if (!ehVenda) return chamar(...args);
          jaDisparou = true;
          opts.achou.venda = true;
          if (opts.rodarAntes) await chamar(...args);
          const err = new Error('ALREADY_EXISTS: entity already exists');
          (err as { code?: number }).code = 6;
          throw err;
        };
      }
      const v = Reflect.get(alvo, prop, receiver);
      return typeof v === 'function' ? v.bind(alvo) : v;
    },
  });
}

describe('A4 — o contrato do `catch` de ALREADY_EXISTS (Achado 1)', () => {
  it('ramo (b) — pedido AUSENTE ⇒ o erro SOBE; a venda nunca é dada como criada', async () => {
    const uid = compradorUid;
    const key = 'chk-a4-sem-pedido';
    const antes = await contarReservas();
    const achou = { venda: false };

    await expect(
      createInscricaoChargeCore(
        dbComAlreadyExistsNaVenda(db, { rodarAntes: false, achou }),
        provider,
        inputDaCompra(key),
        callerDe(uid)
      )
    ).rejects.toThrow();
    // O erro tem de ter sido injetado NA TX DA VENDA — sem isto o teste
    // passaria de graça em qualquer outra transação do fluxo.
    expect(achou.venda).toBe(true);

    const { pedidoId, pagamentoId, inscritoIds } = idsDoCheckout(uid, key, 2);
    expect((await db.collection('pedidos').doc(pedidoId).get()).exists).toBe(
      false
    );
    expect(
      (await db.collection('pagamentos').doc(pagamentoId).get()).exists
    ).toBe(false);
    for (const iid of inscritoIds) {
      expect(
        (await db.doc(`eventos/${EVENTO_ID}/inscritos/${iid}`).get()).exists
      ).toBe(false);
    }
    expect(await contarReservas()).toBe(antes);
  }, 60_000);

  it('ramo (a) — concorrente de MESMA chave venceu ⇒ engole, UM código, UMA reserva', async () => {
    const uid = compradorUid;
    const key = 'chk-a4-com-pedido';
    const antes = await contarReservas();
    const achou = { venda: false };

    // A tx da venda COMMITA (é o concorrente de mesma chave vencendo) e só
    // então esta tentativa recebe o ALREADY_EXISTS. É o ramo (a) literal.
    const res = await createInscricaoChargeCore(
      dbComAlreadyExistsNaVenda(db, { rodarAntes: true, achou }),
      provider,
      inputDaCompra(key),
      callerDe(uid)
    );
    expect(achou.venda).toBe(true);

    const { pedidoId } = idsDoCheckout(uid, key, 2);
    expect(res.pedidoId).toBe(pedidoId);
    const snap = await db.collection('pedidos').doc(pedidoId).get();
    const codigo = parsePedido(snap.id, snap.data() ?? {}).codigoPedido;
    expect(isCodigoPedidoValido(codigo)).toBe(true);
    // UMA reserva nova, e ela é a do código do pedido — nunca duas.
    expect((await contarReservas()) - antes).toBe(1);
    expect(
      (
        await db
          .collection(PEDIDO_CODIGOS_COL)
          .doc(codigo as string)
          .get()
      ).get('pedidoId')
    ).toBe(pedidoId);
  }, 60_000);
});

// ---------------------------------------------------------------------------
// A6 · a trava de PIX viva no meio (2ª metade do vetor 10, não coberta)
// ---------------------------------------------------------------------------

describe('A6 — chaves DISTINTAS do mesmo comprador com a trava PIX no meio', () => {
  it('a compra recusada pela trava NÃO consome código nem deixa reserva', async () => {
    const uid = compradorUid;
    const primeira = await createInscricaoChargeCore(
      db,
      provider,
      inputDaCompra('chk-a6-um'),
      callerDe(uid)
    );
    const snap = await db.collection('pedidos').doc(primeira.pedidoId).get();
    const codigo = parsePedido(snap.id, snap.data() ?? {}).codigoPedido;
    expect(isCodigoPedidoValido(codigo)).toBe(true);
    const reservasDepoisDaPrimeira = await contarReservas();

    // Mesmo comprador, MESMO carrinho, chave NOVA: a trava de segunda
    // cobrança PIX viva (RN-157) recusa ANTES do sorteio. Se a recusa
    // acontecesse depois, o código ficaria queimado sem venda — uma reserva
    // órfã por tentativa bloqueada.
    await expect(
      createInscricaoChargeCore(
        db,
        provider,
        inputDaCompra('chk-a6-dois'),
        callerDe(uid)
      )
    ).rejects.toThrow();

    expect(await contarReservas()).toBe(reservasDepoisDaPrimeira);
    const { pedidoId: segundoId } = idsDoCheckout(uid, 'chk-a6-dois', 2);
    expect((await db.collection('pedidos').doc(segundoId).get()).exists).toBe(
      false
    );
    // E o código da primeira segue intacto — a tentativa barrada não o move.
    const snap2 = await db.collection('pedidos').doc(primeira.pedidoId).get();
    expect(parsePedido(snap2.id, snap2.data() ?? {}).codigoPedido).toBe(codigo);
  }, 60_000);
});

// ---------------------------------------------------------------------------
// A5 · a lacuna das Rules do Achado 2, MEDIDA contra o arquivo real
// ---------------------------------------------------------------------------

describe('A5 — `codigoPedido` do inscrito está nas Rules (D-1 fechado)', () => {
  const INSCRITO_ID = 'insc-a5-plantado';

  async function comoDono(): Promise<Firestore> {
    return testEnv
      .authenticatedContext('uid-marina-castelo', {
        role: 'tenant_owner',
        tenantId: TENANT_ID,
      })
      .firestore() as unknown as Firestore;
  }

  const inscritoBase = {
    tenantId: TENANT_ID,
    atletaNome: 'Plantado',
    modalidade: '10k',
    status: 'pendente',
    kit: 'sem_kit',
  };

  it('o organizador NÃO cria inscrito com `codigoPedido` plantado — as Rules negam', async () => {
    const cli = await comoDono();
    // Prova de contraste: `codigoIngresso` (que sempre esteve nas Rules) é
    // negado…
    await assertFails(
      setDoc(doc(cli, `eventos/${EVENTO_ID}/inscritos/${INSCRITO_ID}-ing`), {
        ...inscritoBase,
        codigoIngresso: 'ABCDE',
      })
    );
    // …e `codigoPedido` é negado JUNTO desde a lane FIX-D1, que o acrescentou
    // a `semCamposDeFunctionInscrito`. Este par de asserções é o TRIPWIRE das
    // Rules: se o create de `codigoPedido` voltar a passar, alguém tirou o
    // campo da lista e o espelho da busca (RN-475) virou adulterável de novo.
    await assertFails(
      setDoc(doc(cli, `eventos/${EVENTO_ID}/inscritos/${INSCRITO_ID}`), {
        ...inscritoBase,
        codigoPedido: 'X2Y3Z',
      })
    );
  });

  it('e NÃO altera o `codigoPedido` de um inscrito existente — o espelho é intocável', async () => {
    // O doc entra pelo Admin SDK: o create de cliente agora é negado, e sem um
    // inscrito REAL o `assertFails` do update passaria de graça (update em doc
    // inexistente é negado por ausência, não pela regra que se quer medir).
    const ref = db.doc(`eventos/${EVENTO_ID}/inscritos/${INSCRITO_ID}`);
    await ref.set({
      ...inscritoBase,
      codigoPedido: 'X2Y3Z',
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    const cli = await comoDono();
    const refCli = doc(cli, `eventos/${EVENTO_ID}/inscritos/${INSCRITO_ID}`);
    // Controle positivo: o MESMO cliente escreve no MESMO doc quando não toca
    // o campo — o `assertFails` abaixo mede `camposDeFunctionIntocados`, e não
    // falta de permissão de escrita no inscrito.
    await assertSucceeds(updateDoc(refCli, { status: 'confirmado' }));
    await assertFails(updateDoc(refCli, { codigoPedido: 'W9V8U' }));
  });

  it('o teto de tentativas continua sendo 8 (fronteira da spec)', () => {
    expect(TENTATIVAS_CODIGO_PEDIDO).toBe(8);
  });
});
