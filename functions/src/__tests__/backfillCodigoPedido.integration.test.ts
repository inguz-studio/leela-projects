/**
 * backfillCodigoPedido.integration.test.ts — LEELA-S1228-T4 (RN-474/RN-475)
 *
 * A ferramenta de backfill (`functions/scripts/backfill-codigo-pedido.mjs`) é
 * exercitada COMO O DONO VAI EXERCITÁ-LA: processo separado, flags de linha de
 * comando, código de saída. Nada dela é importado — testar o miolo por dentro
 * provaria a função e deixaria de fora justamente o que erra em produção (a
 * flag esquecida, o default trocado, o projeto errado).
 *
 * O que esta suíte prende:
 *
 *   1. ENSAIO NÃO ESCREVE — sem `--apply` não nasce campo, não nasce reserva,
 *      e nem sequer há sorteio.
 *   2. `--project` OBRIGATÓRIO — sem ele o script recusa e não lê nada.
 *   3. `--apply` CARIMBA OS TRÊS — pedido, reserva `pedidoCodigos/{codigo}` e
 *      o ESPELHO em cada inscrito, no mesmo commit.
 *   4. IDEMPOTÊNCIA — a segunda passada converge para zero escritas e NÃO
 *      troca o código de ninguém.
 *   5. COLISÃO NÃO CORROMPE — reserva que pertence a outro pedido nunca é
 *      sobrescrita; o pedido fica de fora, o resto da fila continua, e o
 *      código de saída denuncia.
 *   6. O ESPELHO PELO ADMIN SDK — é o `Not-tested` que a REV-COD5A deixou
 *      escrito. Desde `48fc7116` as Rules NEGAM `codigoPedido` do inscrito ao
 *      cliente; o backfill escreve o mesmo campo, no mesmo doc, pelo Admin
 *      SDK. As duas metades são medidas lado a lado.
 *
 * ⚠ PRÉ-REQUISITOS:
 *   - Firestore Emulator próprio da lane (`firebase.build5b.json` — firestore
 *     8981, auth 9981, host IPv4 explícito).
 *   - Build feito: o script importa `@leela/core` (dist) e o mecanismo de
 *     reserva de `functions/lib`. Sem build ele recusa rodar, com mensagem.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { spawn } from 'child_process';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { doc, updateDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  formatarCodigoPedido,
  isCodigoPedidoValido,
  parseInscrito,
  parsePedido,
} from '@leela/core';
import { PEDIDO_CODIGOS_COL } from '../checkout/codigoPedidoReserva';

const PROJECT_ID = 'demo-leela-build5b';
const FIRESTORE_PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8981);
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const SCRIPT = resolve(__dirname, '../../scripts/backfill-codigo-pedido.mjs');
const RAIZ = resolve(__dirname, '../../..');

const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Execução do script — processo separado, como o dono roda
// ---------------------------------------------------------------------------

interface Saida {
  code: number | null;
  stdout: string;
  stderr: string;
}

function rodar(
  args: readonly string[],
  opcoes: { semEmulador?: boolean } = {}
): Promise<Saida> {
  return new Promise((ok, falhou) => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      FIRESTORE_EMULATOR_HOST: `127.0.0.1:${FIRESTORE_PORT}`,
      // Um projeto no ambiente NÃO pode suprir a flag: se ele suprisse, o
      // teste do `--project` obrigatório passaria de graça.
      GOOGLE_CLOUD_PROJECT: 'projeto-do-ambiente-que-nao-vale',
      GCLOUD_PROJECT: 'projeto-do-ambiente-que-nao-vale',
    };
    if (opcoes.semEmulador === true) delete env['FIRESTORE_EMULATOR_HOST'];
    const filho = spawn(process.execPath, [SCRIPT, ...args], { cwd: RAIZ, env });
    let stdout = '';
    let stderr = '';
    filho.stdout.on('data', (c: Buffer) => (stdout += c.toString()));
    filho.stderr.on('data', (c: Buffer) => (stderr += c.toString()));
    filho.on('error', falhou);
    filho.on('close', (code) => ok({ code, stdout, stderr }));
  });
}

/**
 * O jeito NORMAL de rodar nesta suíte: contra o emulator, com o destino
 * DECLARADO. `--emulador` não é enfeite — sem ele o script recusa rodar quando
 * `FIRESTORE_EMULATOR_HOST` está no ambiente, e é essa recusa que impede a
 * execução que diz "Projeto: leela-hub · Aplicado: 17" sem tocar em produção
 * (REV-5B, defeito 1).
 */
const backfill = (extra: readonly string[] = []): Promise<Saida> =>
  rodar(['--project', PROJECT_ID, '--emulador', ...extra]);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AGORA = Timestamp.fromDate(new Date('2026-08-01T12:00:00Z'));

interface DefPedido {
  id: string;
  inscritos: readonly string[];
  status?: 'pago' | 'pendente' | 'cancelado';
  codigoPedido?: unknown;
}

/**
 * Semeia pedido + inscritos com o shape canônico (os parsers do core são
 * chamados nas asserções, então o fixture tem de ser um pedido de verdade).
 */
async function semear(def: DefPedido): Promise<void> {
  const status = def.status ?? 'pago';
  const valorUnitario = 189.9;
  const batch = db.batch();
  batch.set(db.collection('pedidos').doc(def.id), {
    id: def.id,
    tenantId: TENANT_ID,
    eventoId: EVENTO_ID,
    responsavel: {
      atletaId: `uid-${def.id}`,
      nome: 'Ana Compradora',
      email: `${def.id}@demo-leela.dev`,
    },
    inscritoRefs: [...def.inscritos],
    itens: def.inscritos.map((inscritoRef) => ({
      inscritoRef,
      kit: 'kit_basico',
      valorBase: valorUnitario,
      desconto: 0,
      valorFinal: valorUnitario,
    })),
    pagamentoRef: `pag-${def.id}`,
    valorTotal: Number((valorUnitario * def.inscritos.length).toFixed(2)),
    status,
    formaPagamento: 'pix',
    ...(def.codigoPedido !== undefined ? { codigoPedido: def.codigoPedido } : {}),
    criadoEm: AGORA,
    atualizadoEm: AGORA,
  });
  def.inscritos.forEach((inscritoId, i) => {
    batch.set(db.doc(`eventos/${EVENTO_ID}/inscritos/${inscritoId}`), {
      id: inscritoId,
      tenantId: TENANT_ID,
      atletaId: i === 0 ? `uid-${def.id}` : `${inscritoId}-convidado`,
      atletaNome: `Participante ${inscritoId}`,
      kit: 'kit_basico',
      kitId: null,
      chipNumero: null,
      status: 'pendente',
      modalidade: '10k',
      pedidoRef: def.id,
      ehResponsavel: i === 0,
      pessoaRef: null,
      tamanhos: {},
      criadoEm: AGORA,
      atualizadoEm: AGORA,
    });
  });
  await batch.commit();
}

async function limpar(): Promise<void> {
  await testEnv.clearFirestore();
  // O tenant precisa existir e estar ativo: `tenantAtivo()` das Rules o lê, e
  // sem o doc a negativa do cliente viria de "null value error" em vez de vir
  // da lista de campos-de-Function — o teste passaria pelo motivo errado.
  await db.collection('tenants').doc(TENANT_ID).set({
    id: TENANT_ID,
    nome: 'Castelo Produções',
    slug: TENANT_ID,
    status: 'ativo',
    ownerUid: 'uid-marina-castelo',
    tipo: 'produtor',
    criadoEm: AGORA,
    atualizadoEm: AGORA,
  });
  await db.collection('eventos').doc(EVENTO_ID).set({
    id: EVENTO_ID,
    tenantId: TENANT_ID,
    organizadorId: 'uid-marina-castelo',
    nome: 'Meia de Floripa 2026',
    data: Timestamp.fromDate(new Date('2026-10-01T12:00:00Z')),
    local: 'Florianópolis/SC',
    modalidades: ['10k'],
    slug: EVENTO_ID,
    status: 'publicado',
    usaChip: true,
    qtdInscritos: 0,
    receitaConfirmada: 0,
    criadoEm: AGORA,
    atualizadoEm: AGORA,
  });
}

async function codigoDoPedido(id: string): Promise<unknown> {
  const snap = await db.collection('pedidos').doc(id).get();
  return snap.get('codigoPedido');
}

async function reservas(): Promise<Map<string, string>> {
  const snap = await db.collection(PEDIDO_CODIGOS_COL).get();
  const mapa = new Map<string, string>();
  for (const d of snap.docs) mapa.set(d.id, d.get('pedidoId') as string);
  return mapa;
}

/**
 * O invariante da RN-474 medido do lado de fora, depois de CADA execução:
 * nenhum pedido com código sem reserva própria, nenhuma reserva sem o pedido
 * que ela diz segurar, nenhum espelho divergente.
 */
async function conferirInvariante(): Promise<void> {
  const pedidos = await db.collection('pedidos').get();
  const mapa = await reservas();
  const vistos = new Set<string>();
  const codigosDosPedidos = new Map<string, string>();
  for (const p of pedidos.docs) {
    const codigo = p.get('codigoPedido') as unknown;
    if (codigo === undefined || codigo === null) continue;
    if (!isCodigoPedidoValido(codigo)) continue;
    codigosDosPedidos.set(p.id, codigo);
    expect(mapa.get(codigo), `reserva de ${codigo} (pedido ${p.id})`).toBe(p.id);
    expect(vistos.has(codigo), `código ${codigo} repetido entre pedidos`).toBe(false);
    vistos.add(codigo);
    const refs = p.get('inscritoRefs') as unknown;
    // O invariante não pode morrer no dado torto que ele existe para medir:
    // `inscritoRefs` com id que não é caminho de documento derrubava a própria
    // conferência (REV-5B). A regra aqui é a mesma do script.
    if (!Array.isArray(refs)) continue;
    for (const inscritoId of refs) {
      if (typeof inscritoId !== 'string' || inscritoId.length === 0) continue;
      if (inscritoId.includes('/') || inscritoId === '.' || inscritoId === '..') continue;
      const insc = await db.doc(`eventos/${EVENTO_ID}/inscritos/${inscritoId}`).get();
      if (!insc.exists) continue;
      const espelho = insc.get('codigoPedido') as unknown;
      if (espelho !== undefined) {
        expect(espelho, `espelho de ${inscritoId}`).toBe(codigo);
      }
    }
  }
  // A DIREÇÃO INVERSA, que faltava: nenhuma reserva pode apontar para um
  // pedido que carrega OUTRO código. Era por essa fresta que a reserva órfã
  // passava sem ninguém medir (REV-5B).
  for (const [codigo, pedidoId] of mapa) {
    const doPedido = codigosDosPedidos.get(pedidoId);
    expect(doPedido, `reserva ${codigo} aponta para ${pedidoId}, que carrega ${doPedido}`).toBe(
      codigo
    );
  }
}

// ---------------------------------------------------------------------------

beforeAll(async () => {
  expect(
    existsSync(resolve(RAIZ, 'packages/core/dist/index.mjs')),
    'packages/core/dist ausente — rode `pnpm build` antes desta suíte'
  ).toBe(true);
  expect(
    existsSync(resolve(RAIZ, 'functions/lib/functions/src/checkout/codigoPedidoReserva.js')),
    'functions/lib ausente — rode `npm --prefix functions run build` antes desta suíte'
  ).toBe(true);

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: FIRESTORE_PORT,
    },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `127.0.0.1:${FIRESTORE_PORT}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await limpar();
});

// ---------------------------------------------------------------------------
// 1 · As duas travas da linha de comando
// ---------------------------------------------------------------------------

describe('as travas da linha de comando', () => {
  it('sem `--project` o script recusa rodar e não lê nada', async () => {
    await semear({ id: 'ped-sem-projeto', inscritos: ['insc-a'] });
    const r = await rodar([]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('--project');
    expect(await codigoDoPedido('ped-sem-projeto')).toBeUndefined();
    expect((await reservas()).size).toBe(0);
  }, 60_000);

  it('`--dry-run` é o default absoluto: sem `--apply` nada é escrito e nada é sorteado', async () => {
    await semear({ id: 'ped-ensaio-1', inscritos: ['insc-e1', 'insc-e2'] });
    await semear({ id: 'ped-ensaio-2', inscritos: ['insc-e3'] });

    const r = await backfill();
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('DRY-RUN');
    expect(r.stdout).toContain('Pedidos lidos: 2');
    expect(r.stdout).toContain('sem código: 2');
    expect(r.stdout).toContain('Espelhos a carimbar: 3');
    expect(r.stdout).toContain('ped-ensaio-1');
    expect(r.stdout).toContain('ped-ensaio-2');
    // Nenhum código impresso no ensaio — um código de mentira colado num
    // chamado é pior que nenhum.
    expect(r.stdout).not.toMatch(/PED-[A-Z2-9]{5}/);

    expect(await codigoDoPedido('ped-ensaio-1')).toBeUndefined();
    expect(await codigoDoPedido('ped-ensaio-2')).toBeUndefined();
    expect((await reservas()).size).toBe(0);
    for (const id of ['insc-e1', 'insc-e2', 'insc-e3']) {
      const snap = await db.doc(`eventos/${EVENTO_ID}/inscritos/${id}`).get();
      expect(snap.get('codigoPedido')).toBeUndefined();
    }
    await conferirInvariante();
  }, 60_000);
});

// ---------------------------------------------------------------------------
// 2 · `--apply`: os três documentos no mesmo commit
// ---------------------------------------------------------------------------

describe('--apply carimba pedido, reserva e espelho', () => {
  it('cada compra ganha código canônico, reserva própria e espelho em cada inscrito', async () => {
    await semear({ id: 'ped-ap-1', inscritos: ['insc-a1', 'insc-a2'] });
    await semear({ id: 'ped-ap-2', inscritos: ['insc-a3'], status: 'cancelado' });

    const r = await backfill(['--apply']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('Aplicado: 2 pedido(s) carimbado(s) · 2 reserva(s) · 3 espelho(s)');

    const c1 = await codigoDoPedido('ped-ap-1');
    const c2 = await codigoDoPedido('ped-ap-2');
    expect(isCodigoPedidoValido(c1)).toBe(true);
    expect(isCodigoPedidoValido(c2)).toBe(true);
    expect(c1).not.toBe(c2);
    // O prefixo é apresentação e NÃO é gravado (COD-4).
    expect(String(c1)).not.toContain('PED-');
    expect(r.stdout).toContain(formatarCodigoPedido(c1));

    // A reserva nasceu junto, com o shape que o checkout grava e nada além.
    const reserva = await db.collection(PEDIDO_CODIGOS_COL).doc(String(c1)).get();
    expect(reserva.exists).toBe(true);
    expect(reserva.get('pedidoId')).toBe('ped-ap-1');
    expect(Object.keys(reserva.data() ?? {}).sort()).toEqual(['criadoEm', 'pedidoId']);

    // O espelho, nos dois inscritos da compra de dois.
    for (const id of ['insc-a1', 'insc-a2']) {
      const snap = await db.doc(`eventos/${EVENTO_ID}/inscritos/${id}`).get();
      expect(snap.get('codigoPedido')).toBe(c1);
    }

    // Pedido CANCELADO também ganha o código — e só o código.
    const cancelado = await db.collection('pedidos').doc('ped-ap-2').get();
    expect(cancelado.get('status')).toBe('cancelado');
    expect((cancelado.get('atualizadoEm') as Timestamp).toMillis()).toBe(AGORA.toMillis());

    // Os docs continuam legíveis pelos parsers reais.
    expect(parsePedido('ped-ap-2', cancelado.data() ?? {}).codigoPedido).toBe(c2);
    const pedidoSnap = await db.collection('pedidos').doc('ped-ap-1').get();
    expect(parsePedido('ped-ap-1', pedidoSnap.data() ?? {}).codigoPedido).toBe(c1);
    const inscSnap = await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-a1`).get();
    expect(parseInscrito('insc-a1', inscSnap.data() ?? {}).codigoPedido).toBe(c1);

    await conferirInvariante();
  }, 90_000);
});

// ---------------------------------------------------------------------------
// 3 · Idempotência: a segunda passada converge para zero
// ---------------------------------------------------------------------------

describe('idempotência', () => {
  it('a segunda execução não troca código, não cria reserva e não escreve espelho', async () => {
    await semear({ id: 'ped-id-1', inscritos: ['insc-i1', 'insc-i2'] });
    await semear({ id: 'ped-id-2', inscritos: ['insc-i3'] });

    expect((await backfill(['--apply'])).code).toBe(0);
    const antes = {
      c1: await codigoDoPedido('ped-id-1'),
      c2: await codigoDoPedido('ped-id-2'),
      reservas: await reservas(),
    };

    // O ensaio já enxerga o mundo completo.
    const ensaio = await backfill();
    expect(ensaio.stdout).toContain('Já completos: 2');
    expect(ensaio.stdout).toContain('sem código: 0');
    expect(ensaio.stdout).toContain('Espelhos a carimbar: 0');

    const segunda = await backfill(['--apply']);
    expect(segunda.code).toBe(0);
    expect(segunda.stdout).toContain(
      'Aplicado: 0 pedido(s) carimbado(s) · 0 reserva(s) · 0 espelho(s)'
    );

    expect(await codigoDoPedido('ped-id-1')).toBe(antes.c1);
    expect(await codigoDoPedido('ped-id-2')).toBe(antes.c2);
    const depois = await reservas();
    expect(depois.size).toBe(antes.reservas.size);
    expect([...depois.entries()].sort()).toEqual([...antes.reservas.entries()].sort());
    await conferirInvariante();
  }, 120_000);

  it('pedido que já tem código é PULADO no sorteio, mas o espelho que falta é remendado', async () => {
    // Estado possível só por escrita fora de banda: código e reserva de pé, um
    // inscrito sem o espelho. O backfill acrescenta o que falta e NÃO
    // re-sorteia.
    await semear({ id: 'ped-rem', inscritos: ['insc-r1', 'insc-r2'], codigoPedido: 'A2B3C' });
    await db.collection(PEDIDO_CODIGOS_COL).doc('A2B3C').set({
      pedidoId: 'ped-rem',
      criadoEm: AGORA,
    });
    await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-r1`).update({ codigoPedido: 'A2B3C' });

    const ensaio = await backfill();
    expect(ensaio.stdout).toContain('sem código: 0');
    expect(ensaio.stdout).toContain('A remendar (código existe, falta reserva ou espelho): 1');
    expect(ensaio.stdout).toContain('Espelhos a carimbar: 1');

    const r = await backfill(['--apply']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('Aplicado: 0 pedido(s) carimbado(s) · 0 reserva(s) · 1 espelho(s)');
    expect(await codigoDoPedido('ped-rem')).toBe('A2B3C');
    expect((await reservas()).size).toBe(1);
    const snap = await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-r2`).get();
    expect(snap.get('codigoPedido')).toBe('A2B3C');
    await conferirInvariante();
  }, 120_000);
});

// ---------------------------------------------------------------------------
// 4 · Colisão forçada e campo torto: fica de fora, não corrompe
// ---------------------------------------------------------------------------

describe('colisão forçada', () => {
  it('reserva que pertence a outro pedido NUNCA é sobrescrita — e a fila continua', async () => {
    await semear({ id: 'ped-col', inscritos: ['insc-c1'], codigoPedido: 'K7M2P' });
    await db.collection(PEDIDO_CODIGOS_COL).doc('K7M2P').set({
      pedidoId: 'ped-de-outra-pessoa',
      criadoEm: AGORA,
    });
    await semear({ id: 'ped-ok-junto', inscritos: ['insc-c2'] });

    const r = await backfill(['--apply']);
    // Falha ALTO: o código de saída denuncia.
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('reserva de outro pedido: 1');
    expect(r.stderr).toContain('ped-col');
    expect(r.stderr).toContain('ped-de-outra-pessoa');

    // A reserva alheia continua alheia; o pedido em conflito não mudou.
    const reserva = await db.collection(PEDIDO_CODIGOS_COL).doc('K7M2P').get();
    expect(reserva.get('pedidoId')).toBe('ped-de-outra-pessoa');
    expect(await codigoDoPedido('ped-col')).toBe('K7M2P');
    const inscC1 = await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-c1`).get();
    expect(inscC1.get('codigoPedido')).toBeUndefined();

    // E o vizinho da fila foi atendido do mesmo jeito.
    const ok = await codigoDoPedido('ped-ok-junto');
    expect(isCodigoPedidoValido(ok)).toBe(true);
    expect((await reservas()).get(String(ok))).toBe('ped-ok-junto');
  }, 90_000);

  it('`codigoPedido` fora do formato não é apagado nem sobrescrito', async () => {
    await semear({ id: 'ped-torto', inscritos: ['insc-t1'], codigoPedido: 'abc' });

    const ensaio = await backfill();
    expect(ensaio.stdout).toContain('código fora do formato: 1');
    expect(ensaio.stdout).toContain('[FORA DO FORMATO] ped-torto');

    const r = await backfill(['--apply']);
    expect(r.code).toBe(1);
    expect(await codigoDoPedido('ped-torto')).toBe('abc');
    expect((await reservas()).size).toBe(0);
  }, 90_000);

  it('duas execuções simultâneas dão UM código ao pedido, sem reserva órfã', async () => {
    await semear({ id: 'ped-par-1', inscritos: ['insc-p1', 'insc-p2'] });
    await semear({ id: 'ped-par-2', inscritos: ['insc-p3'] });
    await semear({ id: 'ped-par-3', inscritos: ['insc-p4'] });

    const [a, b] = await Promise.all([backfill(['--apply']), backfill(['--apply'])]);

    // ⚠ O código de saída das DUAS execuções não pode ser exigido como 0: sob
    // concorrência deliberada, quem perde a corrida por um pedido recebe
    // `ABORTED` do Firestore e deixa AQUELE pedido de fora — que é a saída
    // honesta, porque a outra execução é que o atendeu. Exigir 0 dos dois era
    // teste FLAKY (medido em REV-5B: uma reprovação a cada ~4 execuções), e
    // teste flaky reprova. O que se exige é o contrato de verdade: o estado
    // final está completo, e nada que ficou de fora exige gente.
    for (const s of [a, b]) {
      if (s.code !== 0) {
        expect(s.stderr, 'concorrência só pode gerar trava temporária').toContain(
          'TRAVA TEMPORÁRIA'
        );
        expect(s.stderr).not.toContain('precisa de gente');
      }
    }

    // Um código por pedido, uma reserva por código, nenhuma sobrando.
    const mapa = await reservas();
    expect(mapa.size).toBe(3);
    await conferirInvariante();
    // A soma dos carimbos das duas execuções é exatamente três: nenhum pedido
    // foi carimbado duas vezes.
    const carimbados = [a, b]
      .map((s) => Number(/Aplicado: (\d+) pedido/.exec(s.stdout)?.[1] ?? '0'))
      .reduce((x, y) => x + y, 0);
    expect(carimbados).toBe(3);
  }, 180_000);
});

// ---------------------------------------------------------------------------
// 5 · O `Not-tested` da REV-COD5A: o espelho pelo Admin SDK, com as Rules
//     fechadas para o cliente no MESMO documento
// ---------------------------------------------------------------------------

describe('o espelho é escrito pelo Admin SDK onde o cliente é negado', () => {
  it('o organizador não escreve `codigoPedido` no inscrito; o backfill escreve', async () => {
    await semear({ id: 'ped-adm', inscritos: ['insc-adm'] });

    const cli = testEnv
      .authenticatedContext('uid-marina-castelo', {
        role: 'tenant_owner',
        tenantId: TENANT_ID,
      })
      .firestore() as unknown as Firestore;
    const alvo = doc(cli, `eventos/${EVENTO_ID}/inscritos/insc-adm`);

    // (a) As Rules NEGAM o campo ao cliente (48fc7116) …
    await assertFails(updateDoc(alvo, { codigoPedido: 'X2Y3Z' }));
    // … e o controle positivo prova que a negativa é DO CAMPO, não do doc.
    await assertSucceeds(updateDoc(alvo, { status: 'confirmado' }));
    const antes = await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-adm`).get();
    expect(antes.get('codigoPedido')).toBeUndefined();

    // (b) … e o backfill, pelo Admin SDK, escreve o mesmo campo no mesmo doc.
    const r = await backfill(['--apply']);
    expect(r.code).toBe(0);
    const depois = await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-adm`).get();
    const codigo = await codigoDoPedido('ped-adm');
    expect(isCodigoPedidoValido(codigo)).toBe(true);
    expect(depois.get('codigoPedido')).toBe(codigo);

    // (c) E o campo continua fechado ao cliente DEPOIS de escrito — o
    // organizador não troca o espelho que a busca dele vai ler.
    await assertFails(updateDoc(alvo, { codigoPedido: 'X2Y3Z' }));
    expect(
      (await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-adm`).get()).get('codigoPedido')
    ).toBe(codigo);
    await conferirInvariante();
  }, 120_000);
});

// ---------------------------------------------------------------------------
// 6 · REV-5B — o que a review antagonista derrubou
// ---------------------------------------------------------------------------

describe('REV-5B · o destino é declarado, não adivinhado', () => {
  it('com FIRESTORE_EMULATOR_HOST no ambiente, `--apply` sem `--emulador` RECUSA', async () => {
    // O defeito: `--project leela-hub --apply` com a variável no ambiente
    // escrevia no EMULATOR, imprimia "Projeto: leela-hub · Aplicado: N" e saía
    // 0. Sucesso indistinguível de uma execução real, com produção intacta.
    await semear({ id: 'ped-destino', inscritos: ['insc-d1'] });

    const r = await rodar(['--project', 'leela-hub', '--apply']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('FIRESTORE_EMULATOR_HOST');
    expect(r.stderr).toContain('leela-hub');
    expect(r.stdout).not.toContain('Aplicado');

    // Nada foi lido nem escrito em nome do projeto errado.
    expect(await codigoDoPedido('ped-destino')).toBeUndefined();
    expect((await reservas()).size).toBe(0);
  }, 60_000);

  it('o ENSAIO também recusa: a conferência não pode mentir sobre o destino', async () => {
    await semear({ id: 'ped-destino-2', inscritos: ['insc-d2'] });
    const r = await rodar(['--project', 'leela-hub']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('FIRESTORE_EMULATOR_HOST');
    expect(r.stdout).not.toContain('Pedidos lidos');
  }, 60_000);

  it('`--emulador` SEM emulator no ambiente recusa — o engano na direção oposta', async () => {
    // "Achei que estava no emulator" é o acidente que escreve em produção.
    const r = await rodar(['--project', 'leela-hub', '--apply', '--emulador'], {
      semEmulador: true,
    });
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('Firestore REAL');
    expect(r.stdout).not.toContain('Pedidos lidos');
  }, 60_000);

  it('o destino sai IMPRESSO antes de qualquer leitura', async () => {
    await semear({ id: 'ped-destino-3', inscritos: ['insc-d3'] });
    const r = await backfill();
    expect(r.stdout).toContain(`Destino: EMULATOR 127.0.0.1:${FIRESTORE_PORT}`);
    expect(r.stdout.indexOf('Destino:')).toBeLessThan(r.stdout.indexOf('Pedidos lidos'));
  }, 60_000);

  it('`--project --apply` (flag comendo flag) não vira MODO APLICAR contra projeto inventado', async () => {
    await semear({ id: 'ped-flag', inscritos: ['insc-f1'] });
    const r = await rodar(['--project', '--apply']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('--project');
    // A recusa é a do guarda, não uma pilha do gRPC vazando de dentro.
    expect(r.stderr).not.toContain('INVALID_ARGUMENT');
    expect(await codigoDoPedido('ped-flag')).toBeUndefined();
  }, 60_000);
});

describe('REV-5B · dado torto num pedido não cala os outros', () => {
  it('`inscritoRefs` com id que não é caminho de documento não derruba a varredura', async () => {
    // O defeito: `.doc('a/b')` lançava, ninguém pegava, e o dono via pilha do
    // gRPC em vez do relatório — com os OUTROS pedidos sem atendimento.
    await semear({ id: 'ped-torto-ref', inscritos: ['insc-bom'] });
    await db
      .collection('pedidos')
      .doc('ped-torto-ref')
      .update({ inscritoRefs: ['insc-bom', 'a/b', '', 42] });
    await semear({ id: 'ped-vizinho', inscritos: ['insc-viz'] });

    const ensaio = await backfill();
    expect(ensaio.stdout).toContain('Pedidos lidos: 2');
    expect(ensaio.stdout).toContain('fora de alcance');

    const r = await backfill(['--apply']);
    expect(r.code).toBe(0);
    // O vizinho foi atendido, que é o ponto.
    const cVizinho = await codigoDoPedido('ped-vizinho');
    expect(isCodigoPedidoValido(cVizinho)).toBe(true);
    // E o pedido torto também ganhou código, com o espelho que dá para alcançar.
    const cTorto = await codigoDoPedido('ped-torto-ref');
    expect(isCodigoPedidoValido(cTorto)).toBe(true);
    expect(
      (await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-bom`).get()).get('codigoPedido')
    ).toBe(cTorto);
    await conferirInvariante();
  }, 120_000);

  it('id repetido em `inscritoRefs` não infla a conta que o dono confere', async () => {
    await semear({ id: 'ped-dup', inscritos: ['insc-x', 'insc-y'] });
    await db
      .collection('pedidos')
      .doc('ped-dup')
      .update({ inscritoRefs: ['insc-x', 'insc-x', 'insc-y'] });

    const ensaio = await backfill();
    // Dois documentos de inscrito, não três.
    expect(ensaio.stdout).toContain('Espelhos a carimbar: 2');

    const r = await backfill(['--apply']);
    expect(r.stdout).toContain('· 2 espelho(s).');
    await conferirInvariante();
  }, 120_000);
});

describe('REV-5B · vestígio de código anterior não é sobrescrito', () => {
  it('espelho com código canônico e pedido sem código: o script NÃO sorteia por cima', async () => {
    // O defeito: o backfill sorteava um código NOVO, carimbava o pedido e
    // apagava o código do espelho — que podia já ter saído num e-mail — e
    // ainda devolvia o valor apagado ao sorteio de amanhã, sem reserva.
    await semear({ id: 'ped-vestigio', inscritos: ['insc-v1', 'insc-v2'] });
    await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-v1`).update({ codigoPedido: 'H4J5K' });

    const ensaio = await backfill();
    expect(ensaio.stdout).toContain('vestígio de código anterior: 1');
    expect(ensaio.stdout).toContain('[VESTÍGIO] ped-vestigio');
    expect(ensaio.stdout).toContain('PED-H4J5K');
    expect(ensaio.code).toBe(1);

    const r = await backfill(['--apply']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('ped-vestigio');
    // Nada mudou: nem código no pedido, nem reserva, nem espelho trocado.
    expect(await codigoDoPedido('ped-vestigio')).toBeUndefined();
    expect((await reservas()).size).toBe(0);
    expect(
      (await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-v1`).get()).get('codigoPedido')
    ).toBe('H4J5K');
    expect(
      (await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-v2`).get()).get('codigoPedido')
    ).toBeUndefined();
  }, 120_000);

  it('reserva que já aponta para este pedido não vira reserva órfã', async () => {
    // O defeito: o script ignorava a reserva existente, sorteava outro código,
    // e a primeira ficava para sempre apontando para um pedido que carrega
    // outro código — sumindo da busca do operador.
    await semear({ id: 'ped-reserva-viva', inscritos: ['insc-rv'] });
    await db.collection(PEDIDO_CODIGOS_COL).doc('M7N8P').set({
      pedidoId: 'ped-reserva-viva',
      criadoEm: AGORA,
    });

    const r = await backfill(['--apply']);
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('vestígio de código anterior: 1');
    expect(r.stderr).toContain('PED-M7N8P');
    expect(await codigoDoPedido('ped-reserva-viva')).toBeUndefined();
    // Uma reserva, a que já existia — nenhuma segunda foi criada.
    const mapa = await reservas();
    expect(mapa.size).toBe(1);
    expect(mapa.get('M7N8P')).toBe('ped-reserva-viva');
  }, 120_000);

  it('espelho divergente com pedido que TEM código próprio continua sendo curado', async () => {
    // O guarda do vestígio não pode paralisar o remendo legítimo: código de
    // outra produtora sobre pedido que tem código próprio, cura.
    await semear({ id: 'ped-cura', inscritos: ['insc-cu'], codigoPedido: 'A2B3C' });
    await db.collection(PEDIDO_CODIGOS_COL).doc('A2B3C').set({
      pedidoId: 'ped-cura',
      criadoEm: AGORA,
    });
    await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-cu`).update({ codigoPedido: 'Z9Y8X' });

    const r = await backfill(['--apply']);
    expect(r.code).toBe(0);
    expect(await codigoDoPedido('ped-cura')).toBe('A2B3C');
    expect(
      (await db.doc(`eventos/${EVENTO_ID}/inscritos/insc-cu`).get()).get('codigoPedido')
    ).toBe('A2B3C');
    await conferirInvariante();
  }, 120_000);
});

describe('REV-5B · o código de saída e a saída do ensaio', () => {
  it('o ENSAIO sai 1 quando alguém precisa de gente — a conferência não mente', async () => {
    // O defeito: o ensaio saía 0 SEMPRE, e o runbook usa o ensaio como
    // conferência dizendo "0 = tudo entrou".
    await semear({ id: 'ped-torto-saida', inscritos: ['insc-ts'], codigoPedido: 'abc' });
    await semear({ id: 'ped-limpo', inscritos: ['insc-lp'] });

    const comProblema = await backfill();
    expect(comProblema.code).toBe(1);
    expect(comProblema.stdout).toContain('[FORA DO FORMATO] ped-torto-saida');

    // E sai 0 quando a fila inteira é resolúvel — inclusive com trabalho a fazer.
    await limpar();
    await semear({ id: 'ped-limpo-2', inscritos: ['insc-lp2'] });
    expect((await backfill()).code).toBe(0);
  }, 120_000);

  it('o ensaio não SORTEIA, mas imprime código JÁ GRAVADO — a promessa exata', async () => {
    // A afirmação anterior ("nenhum PED-XXXXX vaza para a saída do ensaio")
    // era mais forte que o código: o ensaio imprime, sim, código já gravado
    // quando falta a reserva ou quando ela é de outro. O que ele nunca faz é
    // SORTEAR um código novo.
    await semear({ id: 'ped-sem-reserva', inscritos: ['insc-sr'], codigoPedido: 'H4J5K' });
    const r = await backfill();
    expect(r.stdout).toContain('PED-H4J5K');
    // Nenhum código NOVO nasceu: a única sequência PED- impressa é a gravada.
    const impressos = new Set(r.stdout.match(/PED-[A-Z2-9]{5}/g) ?? []);
    expect([...impressos]).toEqual(['PED-H4J5K']);
    expect((await reservas()).size).toBe(0);
  }, 60_000);
});
