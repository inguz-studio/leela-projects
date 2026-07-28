/**
 * emitirIngressos.integration.test.ts — LEELA-S1206-T5 (RN-218 + RN-396)
 *
 * Integração REAL no Emulator (Firestore, Admin SDK): emissão do ingresso na
 * confirmação — `qrToken` assinado + código identificador legível.
 *
 * Cobre os aceites literais do E12/S1206 (complemento SPECS-0728):
 *   - pedido de 3 inscritos: cada um ganha token E código DISTINTOS;
 *   - webhook reprocessado: nem o token nem o código mudam (idempotência);
 *   - dois inscritos do mesmo evento NUNCA colidem — inclusive com o RNG
 *     forçado a repetir o mesmo código (a reserva por chave primária é que
 *     garante, não o sorteio);
 *   - o código NÃO é credencial: `registrarCheckinCore` o recusa;
 *   - inscrito não confirmado não recebe ingresso (RN-218);
 *   - sem keyring, a emissão não acontece e a compra segue intocada.
 *
 * ⚠ PRÉ-REQUISITO: Firestore Emulator (8080) via `firebase emulators:exec`.
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
import { FieldValue } from 'firebase-admin/firestore';
import {
  ALFABETO_CODIGO_INGRESSO,
  TAMANHO_CODIGO_INGRESSO,
  isCodigoIngressoValido,
} from '@leela/core';
import {
  INGRESSO_CODIGOS_SUBCOL,
  emitirIngressosDoPedido,
} from '../eventos/emitirIngressos';
import { registrarCheckinCore } from '../eventos/registrarCheckin';
import type { EventoCaller } from '../eventos/criarEvento';
import type { QrKeyring } from '../eventos/qrToken';
import { clearFirestoreDrained, withTriggersPaused } from './helpers/stability';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'meia-floripa-2026';
const PEDIDO_ID = 'ped-ingqr-1';

const RING: QrKeyring = { ativo: 'k1', chaves: { k1: Buffer.alloc(32, 7) } };

const MARINA: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID },
};

const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

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
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function inscritoDoc(id: string, overrides: Record<string, unknown> = {}) {
  const now = FieldValue.serverTimestamp();
  return {
    id,
    tenantId: CASTELO_ID,
    atletaId: `atleta-${id}`,
    atletaNome: `Atleta ${id}`,
    kit: 'kit_prata',
    chipNumero: null,
    status: 'confirmado',
    modalidade: '10k',
    tamanhos: {},
    pedidoRef: PEDIDO_ID,
    ehResponsavel: id === 'insc-1',
    criadoEm: now,
    atualizadoEm: now,
    ...overrides,
  };
}

async function semear(
  inscritos: readonly string[],
  overridesPorInscrito: Record<string, Record<string, unknown>> = {},
  statusPedido = 'pago'
): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID,
    nome: 'Castelo Produções',
    slug: CASTELO_ID,
    status: 'ativo',
    ownerUid: MARINA_UID,
    tipo: 'produtor',
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(adminDb.collection('eventos').doc(EVENTO_ID), {
    id: EVENTO_ID,
    tenantId: CASTELO_ID,
    nome: 'Meia Maratona Floripa 2026',
    slug: EVENTO_ID,
    status: 'publicado',
    usaChip: false,
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(adminDb.collection('pedidos').doc(PEDIDO_ID), {
    id: PEDIDO_ID,
    tenantId: CASTELO_ID,
    eventoId: EVENTO_ID,
    status: statusPedido,
    inscritoRefs: [...inscritos],
    responsavel: {
      nome: 'Marina Compradora',
      email: 'marina@exemplo.test',
      atletaId: 'atleta-insc-1',
    },
    criadoEm: now,
    atualizadoEm: now,
  });
  for (const id of inscritos) {
    batch.set(
      adminDb.collection('eventos').doc(EVENTO_ID).collection('inscritos').doc(id),
      inscritoDoc(id, overridesPorInscrito[id] ?? {})
    );
  }
  await batch.commit();
}

async function lerInscrito(id: string): Promise<admin.firestore.DocumentData> {
  const snap = await adminDb
    .collection('eventos')
    .doc(EVENTO_ID)
    .collection('inscritos')
    .doc(id)
    .get();
  return snap.data() ?? {};
}

beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
  });
});

describe.skipIf(!hasEmulator)('emitirIngressosDoPedido — S1206-T5 (RN-218/396)', () => {
  it('pedido de 3 inscritos: cada um ganha token E código distintos', async () => {
    const ids = ['insc-1', 'insc-2', 'insc-3'];
    await semear(ids);

    const r = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);

    expect(r.processado).toBe(true);
    expect(r.emitidos).toBe(3);
    expect(r.jaEmitidos).toBe(0);
    expect(r.falhas).toBe(0);
    expect(r.ingressos).toHaveLength(3);

    const codigos = new Set<string>();
    const tokens = new Set<string>();
    for (const id of ids) {
      const doc = await lerInscrito(id);
      expect(typeof doc['qrToken']).toBe('string');
      expect((doc['qrToken'] as string).startsWith('LLQR1.k1.')).toBe(true);
      expect(isCodigoIngressoValido(doc['codigoIngresso'])).toBe(true);
      expect(doc['ingressoEmitidoEm']).toBeTruthy();
      codigos.add(doc['codigoIngresso'] as string);
      tokens.add(doc['qrToken'] as string);
    }
    expect(codigos.size).toBe(3);
    expect(tokens.size).toBe(3);

    // Uma reserva por código emitido (a chave primária da unicidade).
    const reservas = await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection(INGRESSO_CODIGOS_SUBCOL)
      .get();
    expect(reservas.size).toBe(3);
    for (const doc of reservas.docs) {
      expect(codigos.has(doc.id)).toBe(true);
      expect(doc.get('eventoId')).toBe(EVENTO_ID);
    }
  });

  it('o código sai no alfabeto sem ambíguos e no tamanho da constante', async () => {
    await semear(['insc-1']);
    await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const codigo = (await lerInscrito('insc-1'))['codigoIngresso'] as string;
    expect(codigo).toHaveLength(TAMANHO_CODIGO_INGRESSO);
    for (const ch of codigo) {
      expect(ALFABETO_CODIGO_INGRESSO.includes(ch)).toBe(true);
    }
  });

  it('REPROCESSO do webhook: nem token nem código mudam, e nada é reescrito', async () => {
    const ids = ['insc-1', 'insc-2'];
    await semear(ids);

    await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const antes = await Promise.all(ids.map(lerInscrito));

    const r2 = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    expect(r2.emitidos).toBe(0);
    expect(r2.jaEmitidos).toBe(2);

    const depois = await Promise.all(ids.map(lerInscrito));
    for (let i = 0; i < ids.length; i++) {
      expect(depois[i]?.['qrToken']).toBe(antes[i]?.['qrToken']);
      expect(depois[i]?.['codigoIngresso']).toBe(antes[i]?.['codigoIngresso']);
      // Carimbo intocado: o replay não reescreveu o doc.
      expect(depois[i]?.['ingressoEmitidoEm']?.toMillis()).toBe(
        antes[i]?.['ingressoEmitidoEm']?.toMillis()
      );
    }
    // Nenhuma reserva a mais.
    const reservas = await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection(INGRESSO_CODIGOS_SUBCOL)
      .get();
    expect(reservas.size).toBe(2);
  });

  it('ATAQUE do sorteio: RNG que repete o MESMO código não faz dois inscritos colidirem', async () => {
    const ids = ['insc-1', 'insc-2'];
    await semear(ids);

    // RNG viciado: sempre o mesmo sorteio. Sem a reserva por chave primária,
    // os dois inscritos sairiam com o código idêntico e o balcão chamaria a
    // pessoa errada. Com ela, o segundo esgota as tentativas e fica SEM
    // código — falha honesta e recuperável, nunca duplicata silenciosa.
    const rngViciado = (): number => 0.5;
    const r = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING, rngViciado);

    expect(r.emitidos).toBe(1);
    expect(r.falhas).toBe(1);

    const a = await lerInscrito('insc-1');
    const b = await lerInscrito('insc-2');
    expect(isCodigoIngressoValido(a['codigoIngresso'])).toBe(true);
    expect(b['codigoIngresso']).toBeUndefined();
    expect(a['codigoIngresso']).not.toBe(b['codigoIngresso']);

    // O que ficou de fora é curável: com RNG normal a próxima passagem fecha.
    const r2 = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    expect(r2.falhas).toBe(0);
    const b2 = await lerInscrito('insc-2');
    expect(isCodigoIngressoValido(b2['codigoIngresso'])).toBe(true);
    expect(b2['codigoIngresso']).not.toBe(a['codigoIngresso']);
    // E o primeiro não foi tocado.
    expect((await lerInscrito('insc-1'))['codigoIngresso']).toBe(
      a['codigoIngresso']
    );
  });

  it('o CÓDIGO não é credencial: check-in com ele é recusado (RN-396)', async () => {
    await semear(['insc-1']);
    await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const doc = await lerInscrito('insc-1');
    const codigo = doc['codigoIngresso'] as string;

    // Apresentar o código no lugar do token: o parse estrutural recusa antes
    // de qualquer verificação de assinatura (fail-closed).
    await expect(
      registrarCheckinCore(
        adminDb,
        { eventoId: EVENTO_ID, qrToken: codigo },
        MARINA,
        RING
      )
    ).rejects.toThrow();

    // O carimbo de presença NÃO existe: nada foi registrado por código.
    expect((await lerInscrito('insc-1'))['checkinEm']).toBeUndefined();

    // E o token de verdade continua funcionando — a recusa é do código, não
    // uma quebra do caminho legítimo.
    await registrarCheckinCore(
      adminDb,
      { eventoId: EVENTO_ID, qrToken: doc['qrToken'] as string },
      MARINA,
      RING
    );
    expect((await lerInscrito('insc-1'))['checkinEm']).toBeTruthy();
  });

  it('inscrito NÃO confirmado não recebe ingresso (RN-218 — emissão pós-pagamento)', async () => {
    await semear(['insc-1', 'insc-2', 'insc-3'], {
      'insc-2': { status: 'pendente' },
      'insc-3': { status: 'cancelado' },
    });

    const r = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    expect(r.emitidos).toBe(1);
    expect(r.ingressos.map((i) => i.inscritoId)).toEqual(['insc-1']);

    expect((await lerInscrito('insc-2'))['codigoIngresso']).toBeUndefined();
    expect((await lerInscrito('insc-2'))['qrToken']).toBeUndefined();
    expect((await lerInscrito('insc-3'))['codigoIngresso']).toBeUndefined();
  });

  it('doc que já tem token e não tem código recebe SÓ o código, e o token é preservado', async () => {
    await semear(['insc-1']);
    // Simula o estado do seed antigo / emissão interrompida no meio.
    await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const tokenOriginal = (await lerInscrito('insc-1'))['qrToken'] as string;
    const emitidoEmOriginal = (await lerInscrito('insc-1'))['ingressoEmitidoEm'];
    await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('inscritos')
      .doc('insc-1')
      .update({ codigoIngresso: FieldValue.delete() });

    const r = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    expect(r.emitidos).toBe(1);

    const doc = await lerInscrito('insc-1');
    // O token emitido NUNCA é re-assinado: quem já tem o QR no celular
    // continua com o QR válido (a comparação do balcão é byte a byte).
    expect(doc['qrToken']).toBe(tokenOriginal);
    expect(isCodigoIngressoValido(doc['codigoIngresso'])).toBe(true);
    // Nem o carimbo da emissão original é remexido.
    expect(doc['ingressoEmitidoEm']?.toMillis()).toBe(
      emitidoEmOriginal?.toMillis()
    );
  });

  it('pedido não pago não emite (a emissão é pós-pagamento)', async () => {
    await semear(['insc-1'], {}, 'aguardando_pagamento');
    const r = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    expect(r.processado).toBe(false);
    expect(r.motivo).toBe('pedido_nao_pago');
    expect((await lerInscrito('insc-1'))['qrToken']).toBeUndefined();
  });

  it('inscrito de OUTRO pedido na lista não sai com ingresso (defesa em profundidade)', async () => {
    // Achado 4 da INGQR-REV: a emissão varria `inscritoRefs` sem conferir o
    // `pedidoRef` de volta. Hoje inexplorável pela borda (`pedidos` é
    // `write: false` para cliente e a lista só é escrita pela Function do
    // checkout), mas uma lista corrompida faria o inscrito alheio sair com
    // ingresso emitido E com o QR dentro do e-mail de um terceiro.
    await semear(['insc-1', 'insc-2'], {
      'insc-2': { pedidoRef: 'ped-de-outra-pessoa' },
    });

    const r = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);

    expect(r.emitidos).toBe(1);
    expect(r.rejeitados).toBe(1);
    // Recusa NÃO é falha: falha é pendência que a varredura re-tenta, e
    // re-tentar não conserta lista corrompida (item 54 · RN-382).
    expect(r.falhas).toBe(0);

    // Nem ingresso, nem lugar no e-mail: `ingressos` é o insumo do template.
    expect(r.ingressos.map((i) => i.inscritoId)).toEqual(['insc-1']);
    const alheio = await lerInscrito('insc-2');
    expect(alheio['qrToken']).toBeUndefined();
    expect(alheio['codigoIngresso']).toBeUndefined();
    expect(alheio['ingressoEmitidoEm']).toBeUndefined();

    // E nenhuma reserva de código foi queimada em nome dele.
    const reservas = await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection(INGRESSO_CODIGOS_SUBCOL)
      .get();
    expect(reservas.size).toBe(1);
  });

  it('SEM keyring: nada é emitido e a compra segue intocada (fail-closed)', async () => {
    await semear(['insc-1']);
    const r = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, null);
    expect(r.processado).toBe(false);
    expect(r.motivo).toBe('sem_keyring');

    const inscrito = await lerInscrito('insc-1');
    // Nem meio ingresso: código sem token não é ingresso, é enfeite.
    expect(inscrito['qrToken']).toBeUndefined();
    expect(inscrito['codigoIngresso']).toBeUndefined();
    expect(inscrito['status']).toBe('confirmado');
  });
});

// ---------------------------------------------------------------------------
// ⚔ INGQR-REV — o que a lane declarou como "não provado"
// ---------------------------------------------------------------------------

/** Semeia N pedidos de UM inscrito cada, todos no mesmo evento. */
async function semearPedidosIndividuais(qtd: number): Promise<string[]> {
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID,
    nome: 'Castelo Produções',
    slug: CASTELO_ID,
    status: 'ativo',
    ownerUid: MARINA_UID,
    tipo: 'produtor',
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(adminDb.collection('eventos').doc(EVENTO_ID), {
    id: EVENTO_ID,
    tenantId: CASTELO_ID,
    nome: 'Meia Maratona Floripa 2026',
    slug: EVENTO_ID,
    status: 'publicado',
    usaChip: false,
    criadoEm: now,
    atualizadoEm: now,
  });
  const pedidos: string[] = [];
  for (let i = 0; i < qtd; i++) {
    const pedidoId = `ped-conc-${i}`;
    const inscritoId = `insc-conc-${i}`;
    pedidos.push(pedidoId);
    batch.set(adminDb.collection('pedidos').doc(pedidoId), {
      id: pedidoId,
      tenantId: CASTELO_ID,
      eventoId: EVENTO_ID,
      status: 'pago',
      inscritoRefs: [inscritoId],
      responsavel: {
        nome: `Comprador ${i}`,
        email: `comprador${i}@exemplo.test`,
        atletaId: `atleta-${inscritoId}`,
      },
      criadoEm: now,
      atualizadoEm: now,
    });
    batch.set(
      adminDb.collection('eventos').doc(EVENTO_ID).collection('inscritos').doc(inscritoId),
      inscritoDoc(inscritoId, { pedidoRef: pedidoId, ehResponsavel: true })
    );
  }
  await batch.commit();
  return pedidos;
}

/**
 * RNG que devolve `fixo` nas 6 primeiras chamadas — ou seja, o MESMO código no
 * primeiro sorteio de toda emissão que o receba — e cai para aleatório depois.
 * É o que põe N transações concorrentes disputando o MESMO doc de reserva.
 */
function rngPrimeiroSorteioFixo(fixo: number): () => number {
  let n = 0;
  return () => (n++ < 6 ? fixo : Math.random());
}

describe.skipIf(!hasEmulator)('contenção REAL da reserva de código (⚔ INGQR-REV)', () => {
  it('OITO emissões CONCORRENTES disputando o mesmo código: zero duplicata', async () => {
    // O risco nº 1 declarado pela lane: o teste do RNG viciado força a colisão
    // sequencialmente, sem contenção de verdade. Aqui as oito transações estão
    // EM VOO ao mesmo tempo e todas sorteiam o mesmo código primeiro — quem
    // perde a corrida tem de perceber e re-sortear, nunca gravar o código
    // alheio. Duplicata aqui é o balcão chamando a pessoa errada.
    const N = 8;
    const pedidos = await semearPedidosIndividuais(N);
    const resultados = await Promise.all(
      pedidos.map((p) =>
        emitirIngressosDoPedido(adminDb, p, RING, rngPrimeiroSorteioFixo(0.5))
      )
    );

    const codigos: string[] = [];
    for (let i = 0; i < N; i++) {
      const d = await lerInscrito(`insc-conc-${i}`);
      if (typeof d['codigoIngresso'] === 'string') codigos.push(d['codigoIngresso']);
    }
    // Ninguém saiu com o código de ninguém.
    expect(new Set(codigos).size).toBe(codigos.length);
    for (const c of codigos) expect(isCodigoIngressoValido(c)).toBe(true);
    // Toda emissão que reportou sucesso tem código no doc.
    expect(codigos).toHaveLength(resultados.reduce((s, r) => s + r.emitidos, 0));

    // Reservas e códigos gravados são o MESMO conjunto: nem reserva órfã
    // (código queimado que ninguém carrega), nem código sem reserva.
    const reservas = await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection(INGRESSO_CODIGOS_SUBCOL)
      .get();
    expect(new Set(reservas.docs.map((d) => d.id))).toEqual(new Set(codigos));
  });

  it('o MESMO pedido confirmado em paralelo emite UM token e UM código', async () => {
    // Re-entrega concorrente do webhook (o Asaas entrega at-least-once e nada
    // impede duas entregas ao mesmo tempo): a idempotência por inscrito tem de
    // valer sob corrida, não só em sequência.
    const [pedido] = await semearPedidosIndividuais(1);
    const rs = await Promise.all([
      emitirIngressosDoPedido(adminDb, pedido as string, RING),
      emitirIngressosDoPedido(adminDb, pedido as string, RING),
      emitirIngressosDoPedido(adminDb, pedido as string, RING),
    ]);
    expect(rs.reduce((s, r) => s + r.emitidos, 0)).toBe(1);

    const d = await lerInscrito('insc-conc-0');
    expect(isCodigoIngressoValido(d['codigoIngresso'])).toBe(true);
    const reservas = await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection(INGRESSO_CODIGOS_SUBCOL)
      .get();
    // Uma reserva só — e é a do código que está no doc (sem código queimado).
    expect(reservas.docs.map((r) => r.id)).toEqual([d['codigoIngresso']]);
  });
});

describe.skipIf(!hasEmulator)('rotação de chave não mata ingresso emitido (⚔ INGQR-REV)', () => {
  const RING_ROTACIONADO: QrKeyring = {
    ativo: 'k2',
    chaves: { k1: Buffer.alloc(32, 7), k2: Buffer.alloc(32, 9) },
  };
  const RING_SEM_K1: QrKeyring = { ativo: 'k2', chaves: { k2: Buffer.alloc(32, 9) } };

  it('QR assinado com k1 ainda credencia depois da virada para k2', async () => {
    await semear(['insc-1']);
    await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const tokenK1 = (await lerInscrito('insc-1'))['qrToken'] as string;
    expect(tokenK1.startsWith('LLQR1.k1.')).toBe(true);

    // Rotação: k2 assina as emissões novas, k1 continua no ring. Reprocesso
    // NÃO pode re-assinar — re-assinar trocaria o token do celular da pessoa.
    await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING_ROTACIONADO);
    expect((await lerInscrito('insc-1'))['qrToken']).toBe(tokenK1);

    // E o balcão, já com o ring novo, aceita o QR que a pessoa tem na mão.
    await registrarCheckinCore(
      adminDb,
      { eventoId: EVENTO_ID, qrToken: tokenK1 },
      MARINA,
      RING_ROTACIONADO
    );
    expect((await lerInscrito('insc-1'))['checkinEm']).toBeTruthy();
  });

  it('tirar k1 do ring REVOGA o que k1 assinou (o outro lado da rotação)', async () => {
    await semear(['insc-1']);
    await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const tokenK1 = (await lerInscrito('insc-1'))['qrToken'] as string;
    await expect(
      registrarCheckinCore(
        adminDb,
        { eventoId: EVENTO_ID, qrToken: tokenK1 },
        MARINA,
        RING_SEM_K1
      )
    ).rejects.toThrow();
    expect((await lerInscrito('insc-1'))['checkinEm']).toBeUndefined();
  });
});

describe.skipIf(!hasEmulator)('ingressoCodigos é server-only de verdade (⚔ INGQR-REV)', () => {
  it('tenant_owner NÃO lê e NÃO escreve a reserva de código', async () => {
    // A coleção não tem `match` em Rules DE PROPÓSITO (deny-by-default). O
    // teste existe porque "não escrevi regra" não é prova: LER daria o mapa
    // código→inscrito de um evento inteiro, e ESCREVER seria pré-queimar
    // códigos até a emissão alheia esgotar as tentativas e desistir.
    await semear(['insc-1']);
    await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const codigo = (await lerInscrito('insc-1'))['codigoIngresso'] as string;

    const db = testEnv
      .authenticatedContext(MARINA_UID, {
        role: 'tenant_owner',
        tenantId: CASTELO_ID,
      })
      .firestore() as unknown as Firestore;

    await assertFails(
      getDoc(doc(db, 'eventos', EVENTO_ID, INGRESSO_CODIGOS_SUBCOL, codigo))
    );
    await assertFails(
      setDoc(doc(db, 'eventos', EVENTO_ID, INGRESSO_CODIGOS_SUBCOL, 'AB2CD3'), {
        inscritoId: 'forjado',
        eventoId: EVENTO_ID,
        tenantId: CASTELO_ID,
      })
    );
  });
});
