/**
 * sorteioCodigoIngresso.integration.test.ts — RN-396 · o gêmeo da RN-474
 *
 * Integração REAL no Firestore Emulator (honra `LEELA_FS_EMU_PORT`).
 *
 * POR QUE ESTE ARQUIVO EXISTE. O `d36afb64` trocou a fonte dos códigos que a
 * pessoa DITA por entropia do sistema, porque o PRNG do V8 tem estado
 * recuperável a partir de poucas saídas — e o código do ingresso é justamente
 * o que a pessoa fala no balcão. A `61776052` fechou o buraco no caminho da
 * VENDA e registrou, como `Not-tested`, que o MESMO default vivia no caminho
 * do INGRESSO (`emitirIngressos.ts:340`, `random: () => number = Math.random`).
 * Ali o efeito é idêntico: o default do parâmetro vence o default de
 * `gerarCodigoIngresso`, e o sorteio criptográfico do core fica inerte
 * exatamente onde importa.
 *
 * O caso 1 é o que fica VERMELHO antes da correção: com `Math.random` pregado
 * numa fonte determinística, o código do ingresso sai idêntico ao que essa
 * fonte produz — prova direta de que era ela quem sorteava. Depois da
 * correção, `undefined` atravessa a cadeia
 * (`emitirIngressosDoPedido` → `emitirIngressoDoInscrito` →
 * `gerarCodigoIngresso`) e o sorteio volta a ser o do sistema.
 *
 * O caso 2 é o contrapeso: a INJEÇÃO continua viva. É ela que
 * `emitirIngressos.integration.test.ts` usa para forçar colisão de código, e
 * uma correção que a matasse trocaria um defeito por outro.
 *
 * ⚠ PRÉ-REQUISITO: Firestore Emulator via `firebase emulators:exec`.
 */

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  ALFABETO_CODIGO_INGRESSO,
  gerarCodigoIngresso,
  isCodigoIngressoValido,
} from '@leela/core';
import {
  INGRESSO_CODIGOS_SUBCOL,
  emitirIngressosDoPedido,
} from '../eventos/emitirIngressos';
import type { QrKeyring } from '../eventos/qrToken';

const PROJECT_ID = 'demo-leela-reva4-ingresso';
const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-sorteio-ingresso-2026';

const RING: QrKeyring = { ativo: 'k1', chaves: { k1: Buffer.alloc(32, 9) } };

/**
 * Duas fontes PREGADAS, cada uma com um código próprio e previsível. Os
 * códigos saem de `gerarCodigoIngresso`, nunca escritos à mão: trocar o
 * alfabeto ou o comprimento não pode desalinhar a prova em silêncio.
 */
const FONTE_ZERO = (): number => 0;
const FONTE_MEIO = (): number => 0.5;
const CODIGO_DA_FONTE_ZERO = gerarCodigoIngresso(FONTE_ZERO);
const CODIGO_DA_FONTE_MEIO = gerarCodigoIngresso(FONTE_MEIO);

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

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

async function seedBase(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: 'uid-marina-castelo', tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('eventos').doc(EVENTO_ID), {
    id: EVENTO_ID, tenantId: TENANT_ID, nome: 'Meia do Sorteio do Ingresso',
    slug: EVENTO_ID, status: 'publicado', usaChip: false,
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

/** Pedido PAGO com UM inscrito confirmado, pronto para emitir. */
async function semearPedido(pedidoId: string): Promise<string> {
  const now = FieldValue.serverTimestamp();
  const inscritoId = `insc-${pedidoId}`;
  const batch = db.batch();
  batch.set(db.collection('pedidos').doc(pedidoId), {
    id: pedidoId, tenantId: TENANT_ID, eventoId: EVENTO_ID, status: 'pago',
    inscritoRefs: [inscritoId],
    responsavel: {
      nome: 'Pessoa do Sorteio',
      email: `sorteio.${pedidoId}@exemplo.com.br`,
      atletaId: `atleta-${inscritoId}`,
    },
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(
    db.collection('eventos').doc(EVENTO_ID).collection('inscritos').doc(inscritoId),
    {
      id: inscritoId, tenantId: TENANT_ID, atletaId: `atleta-${inscritoId}`,
      atletaNome: 'Pessoa do Sorteio', kit: 'kit_prata', chipNumero: null,
      status: 'confirmado', modalidade: '10k', tamanhos: {},
      pedidoRef: pedidoId, ehResponsavel: true,
      criadoEm: now, atualizadoEm: now,
    }
  );
  await batch.commit();
  return inscritoId;
}

async function codigoDoInscrito(inscritoId: string): Promise<unknown> {
  return (
    await db
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('inscritos')
      .doc(inscritoId)
      .get()
  ).get('codigoIngresso');
}

// ---------------------------------------------------------------------------

describe('RN-396 — o sorteio do código do INGRESSO usa a entropia do sistema', () => {
  it('1 · com `Math.random` PREGADO, a emissão NÃO produz o código dessa fonte', async () => {
    const pedidoId = 'ped-reva4-ing-default';
    const inscritoId = await semearPedido(pedidoId);

    // O pregamento é global e curto: só a emissão roda debaixo dele, e o
    // `finally` devolve a fonte original mesmo se a emissão lançar.
    const original = Math.random;
    try {
      Math.random = FONTE_ZERO;
      const r = await emitirIngressosDoPedido(db, pedidoId, RING);
      expect(r.emitidos).toBe(1);
    } finally {
      Math.random = original;
    }

    const codigo = await codigoDoInscrito(inscritoId);
    // ⚔ ESTA é a linha vermelha antes da correção do default: com o
    // `= Math.random` em `emitirIngressos.ts:340`, o código do ingresso sai
    // EXATAMENTE igual ao da fonte pregada.
    expect(codigo).not.toBe(CODIGO_DA_FONTE_ZERO);
    expect(isCodigoIngressoValido(codigo)).toBe(true);
    for (const s of String(codigo)) {
      expect(ALFABETO_CODIGO_INGRESSO).toContain(s);
    }
  });

  it('2 · a INJEÇÃO continua viva: fonte passada explicitamente decide o código', async () => {
    const pedidoId = 'ped-reva4-ing-injetado';
    const inscritoId = await semearPedido(pedidoId);

    const r = await emitirIngressosDoPedido(db, pedidoId, RING, FONTE_MEIO);
    expect(r.emitidos).toBe(1);
    expect(await codigoDoInscrito(inscritoId)).toBe(CODIGO_DA_FONTE_MEIO);
  });

  it('3 · a reserva por chave primária acompanha o código sorteado pelo sistema', async () => {
    const pedidoId = 'ped-reva4-ing-reserva';
    const inscritoId = await semearPedido(pedidoId);

    await emitirIngressosDoPedido(db, pedidoId, RING);
    const codigo = String(await codigoDoInscrito(inscritoId));
    expect(isCodigoIngressoValido(codigo)).toBe(true);

    const reserva = await db
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection(INGRESSO_CODIGOS_SUBCOL)
      .doc(codigo)
      .get();
    expect(reserva.exists).toBe(true);
    expect(reserva.get('inscritoId')).toBe(inscritoId);
  });

  it('4 · duas emissões seguidas, sem injeção, não repetem o código', async () => {
    const a = await semearPedido('ped-reva4-ing-a');
    const b = await semearPedido('ped-reva4-ing-b');
    await emitirIngressosDoPedido(db, 'ped-reva4-ing-a', RING);
    await emitirIngressosDoPedido(db, 'ped-reva4-ing-b', RING);

    const codigoA = String(await codigoDoInscrito(a));
    const codigoB = String(await codigoDoInscrito(b));
    expect(isCodigoIngressoValido(codigoA)).toBe(true);
    expect(isCodigoIngressoValido(codigoB)).toBe(true);
    expect(codigoA).not.toBe(codigoB);
  });
});
