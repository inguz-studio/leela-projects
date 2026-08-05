/**
 * areaDoCliente.integration.test.ts — S1222-T1 · RN-451 (sobre a RN-174)
 *
 * Os dois callables do próprio dono da conta, contra o Firestore Emulator DA
 * LANE (host/porta de `FIRESTORE_EMULATOR_HOST`, exportado pelo
 * `emulators:exec` — rodar em porta alheia é o que faz duas lanes se
 * atropelarem).
 *
 * O que este arquivo tem de provar, na letra do aceite da fila ADMINSEP:
 *
 *   1. o callable devolve SÓ o do chamador — falsificação: trocar o filtro de
 *      `contaSemFriccao.contaUid` por consulta sem filtro mata o caso de
 *      isolamento e nenhum outro;
 *   2. chamado sem sessão devolve `unauthenticated`;
 *   3. conta sem e-mail verificado devolve estado PRÓPRIO, distinguível de
 *      "não há compras" — falsificação: colapsar os estados num só mata dois
 *      casos;
 *   4. um token `athlete` lendo `pedidos` direto pelo SDK continua NEGADO, e
 *      as Rules de `pedidos`/`inscritos` seguem intocadas.
 *
 * E os dois vetores que a área do cliente acrescenta por conta própria:
 *
 *   5. o e-mail do token tem de ser o e-mail DA COMPRA (RN-174 (b) no
 *      leitor): um pedido carimbado com este uid mas endereçado a outro
 *      e-mail NÃO entra na lista;
 *   6. o recorte próximos/passados é do SERVIDOR — o relógio do navegador não
 *      participa da decisão.
 */

import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getMinhasComprasCore } from '../cliente/minhasCompras';
import { getMeusIngressosCore } from '../cliente/meusIngressos';
import type { CallerAreaCliente } from '../cliente/gateAreaCliente';

const PROJECT_ID = 'demo-leela-areacliente';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const EMULATOR_HOST_PORT = process.env['FIRESTORE_EMULATOR_HOST'] ?? 'localhost:8080';
const [EMULATOR_HOST, EMULATOR_PORT] = ((): [string, number] => {
  const i = EMULATOR_HOST_PORT.lastIndexOf(':');
  return [EMULATOR_HOST_PORT.slice(0, i), Number.parseInt(EMULATOR_HOST_PORT.slice(i + 1), 10)];
})();

/** Segredo de TESTE (32 bytes em base64url) — nunca um valor de produção. */
const SEGREDO_B64 = 'dGVzdGUtc2VncmVkby1kZS0zMi1ieXRlcy1vay1hYWE';

const TENANT_ID = 'castelo-producoes';
const EVENTO_FUTURO = 'meia-floripa-2027';
const EVENTO_PASSADO = 'trilha-serra-2025';

const ANA_UID = 'conta-ana-area';
const ANA_EMAIL = 'ana@example.com';
const BRUNO_UID = 'conta-bruno-area';
const BRUNO_EMAIL = 'bruno@example.com';
/** Conta sem nenhuma compra — o "ok + lista vazia" que não pode mentir. */
const CLARA_UID = 'conta-clara-area';
const CLARA_EMAIL = 'clara@example.com';

const PESSOA_ANA = 'cpf_ana_area';
const PESSOA_BRUNO = 'cpf_bruno_area';

const PEDIDO_ANA_FUTURO = 'ped-ana-futuro';
const PEDIDO_ANA_PASSADO = 'ped-ana-passado';
const PEDIDO_BRUNO = 'ped-bruno-futuro';
/** Carimbado com o uid da Ana, mas endereçado a OUTRO e-mail (vetor 5). */
const PEDIDO_EMAIL_DIVERGENTE = 'ped-ana-email-outro';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

const DIA_MS = 24 * 60 * 60 * 1000;
const AGORA = Date.parse('2026-08-05T12:00:00.000Z');
const ts = (ms: number): Timestamp => Timestamp.fromMillis(ms);

function caller(over: Partial<CallerAreaCliente> = {}): CallerAreaCliente {
  return {
    uid: ANA_UID,
    ehAnonimo: false,
    email: ANA_EMAIL,
    emailVerificado: true,
    ...over,
  };
}

function dbComo(uid: string, claims: Record<string, unknown> = {}): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

beforeAll(async () => {
  // O ring vem da ENV porque é assim em produção — é o caminho real que
  // precisa estar sob teste, não uma injeção que só o teste usa.
  process.env['QR_TOKEN_KEYS'] = JSON.stringify({ k1: SEGREDO_B64 });
  process.env['QR_TOKEN_KID_ATIVO'] = 'k1';
  process.env['LEELA_PUBLIC_URL'] = 'https://leela.test';

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: EMULATOR_HOST,
      port: EMULATOR_PORT,
    },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  await semear();
}, 60_000);

afterAll(async () => {
  delete process.env['QR_TOKEN_KEYS'];
  delete process.env['QR_TOKEN_KID_ATIVO'];
  delete process.env['LEELA_PUBLIC_URL'];
  await testEnv?.cleanup();
});

async function semear(): Promise<void> {
  const agora = FieldValue.serverTimestamp();
  const b = db.batch();

  b.set(db.doc(`eventos/${EVENTO_FUTURO}`), {
    id: EVENTO_FUTURO,
    tenantId: TENANT_ID,
    organizadorId: 'prof-marina',
    nome: 'Meia de Floripa 2027',
    slug: EVENTO_FUTURO,
    data: ts(AGORA + 60 * DIA_MS),
    local: 'Florianópolis, SC',
    modalidades: ['21k'],
    status: 'publicado',
    usaChip: true,
    criadoEm: agora,
    atualizadoEm: agora,
  });
  b.set(db.doc(`eventos/${EVENTO_PASSADO}`), {
    id: EVENTO_PASSADO,
    tenantId: TENANT_ID,
    organizadorId: 'prof-marina',
    nome: 'Trilha da Serra 2025',
    slug: EVENTO_PASSADO,
    data: ts(AGORA - 200 * DIA_MS),
    local: 'Urubici, SC',
    modalidades: ['10k'],
    status: 'publicado',
    usaChip: false,
    criadoEm: agora,
    atualizadoEm: agora,
  });

  // Fichas de pessoa REIVINDICADAS, com o carimbo `contaEmail` da RN-174.
  b.set(db.doc(`pessoas/${PESSOA_ANA}`), {
    cpf: '11111111111',
    contaUid: ANA_UID,
    contaEmail: ANA_EMAIL,
    criadoEm: agora,
    atualizadoEm: agora,
  });
  b.set(db.doc(`pessoas/${PESSOA_BRUNO}`), {
    cpf: '22222222222',
    contaUid: BRUNO_UID,
    contaEmail: BRUNO_EMAIL,
    criadoEm: agora,
    atualizadoEm: agora,
  });

  b.set(db.doc(`pedidos/${PEDIDO_ANA_FUTURO}`), pedido(ANA_UID, ANA_EMAIL, EVENTO_FUTURO, {
    inscritoRefs: ['insc-ana-1', 'insc-filho-1'],
    codigoPedido: 'K7M2P',
    criadoEm: ts(AGORA - 3 * DIA_MS),
  }));
  b.set(db.doc(`pedidos/${PEDIDO_ANA_PASSADO}`), pedido(ANA_UID, ANA_EMAIL, EVENTO_PASSADO, {
    inscritoRefs: ['insc-ana-2'],
    criadoEm: ts(AGORA - 300 * DIA_MS),
  }));
  b.set(db.doc(`pedidos/${PEDIDO_BRUNO}`), pedido(BRUNO_UID, BRUNO_EMAIL, EVENTO_FUTURO, {
    inscritoRefs: ['insc-bruno-1', 'insc-presente-ana'],
    criadoEm: ts(AGORA - 5 * DIA_MS),
  }));
  b.set(
    db.doc(`pedidos/${PEDIDO_EMAIL_DIVERGENTE}`),
    pedido(ANA_UID, 'outra-pessoa@example.com', EVENTO_FUTURO, {
      inscritoRefs: ['insc-terceiro-1'],
      criadoEm: ts(AGORA - 1 * DIA_MS),
    })
  );

  // Inscritos — dois da Ana, um do Bruno, e o PRESENTE que o Bruno comprou
  // para a Ana (ficha da Ana dentro de um pedido do Bruno).
  b.set(
    db.doc(`eventos/${EVENTO_FUTURO}/inscritos/insc-ana-1`),
    inscrito('Ana Souza', PESSOA_ANA, { pedidoRef: PEDIDO_ANA_FUTURO, ehResponsavel: true })
  );
  b.set(
    db.doc(`eventos/${EVENTO_FUTURO}/inscritos/insc-filho-1`),
    inscrito('Téo Souza', null, { pedidoRef: PEDIDO_ANA_FUTURO, codigoIngresso: '' })
  );
  b.set(
    db.doc(`eventos/${EVENTO_PASSADO}/inscritos/insc-ana-2`),
    inscrito('Ana Souza', PESSOA_ANA, { pedidoRef: PEDIDO_ANA_PASSADO, ehResponsavel: true })
  );
  b.set(
    db.doc(`eventos/${EVENTO_FUTURO}/inscritos/insc-bruno-1`),
    inscrito('Bruno Lima', PESSOA_BRUNO, { pedidoRef: PEDIDO_BRUNO, ehResponsavel: true })
  );
  b.set(
    db.doc(`eventos/${EVENTO_FUTURO}/inscritos/insc-presente-ana`),
    inscrito('Ana Souza', PESSOA_ANA, { pedidoRef: PEDIDO_BRUNO })
  );
  b.set(
    db.doc(`eventos/${EVENTO_FUTURO}/inscritos/insc-terceiro-1`),
    inscrito('Terceiro Qualquer', null, { pedidoRef: PEDIDO_EMAIL_DIVERGENTE })
  );

  await b.commit();
}

function pedido(
  contaUid: string,
  email: string,
  eventoId: string,
  over: Record<string, unknown>
): Record<string, unknown> {
  const refs = (over['inscritoRefs'] as string[] | undefined) ?? ['insc-1'];
  return {
    tenantId: TENANT_ID,
    eventoId,
    responsavel: { atletaId: `anon-${contaUid}`, nome: 'Comprador', email },
    itens: refs.map((r) => ({ inscritoRef: r, valorBase: 100, desconto: 0, valorFinal: 100 })),
    pagamentoRef: 'pag-1',
    valorTotal: 100 * refs.length,
    status: 'pago',
    formaPagamento: 'pix',
    // Escritor único: `contaSemFriccao.ts`. A coleção é `write: if false`,
    // então este campo é inforjável pelo cliente — é o mesmo vínculo que a
    // RN-469 usa nas Rules.
    contaSemFriccao: { contaUid, contaCriada: false, emailStatus: 'enviado', pessoaVinculada: true },
    atualizadoEm: FieldValue.serverTimestamp(),
    ...over,
  };
}

function inscrito(
  nome: string,
  pessoaRef: string | null,
  over: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    tenantId: TENANT_ID,
    atletaId: `atleta-${nome.toLowerCase().replace(/\s+/g, '-')}`,
    atletaNome: nome,
    kit: 'sem_kit',
    chipNumero: null,
    status: 'confirmado',
    modalidade: '21k',
    pessoaRef,
    ehResponsavel: false,
    tamanhos: {},
    qrToken: 'LLQR1.k1.payload.assinatura',
    codigoIngresso: 'ABC123',
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
    ...over,
  };
}

// ---------------------------------------------------------------------------
// 1. Isolamento — o callable devolve SÓ o do chamador
// ---------------------------------------------------------------------------

describe('RN-451 · o histórico é do próprio dono da conta', () => {
  it('a Ana vê as DUAS compras dela, e nenhuma do Bruno', async () => {
    const r = await getMinhasComprasCore(db, caller());
    expect(r.estado).toBe('ok');
    const ids = r.compras.map((c) => c.pedidoId);
    expect(ids).toContain(PEDIDO_ANA_FUTURO);
    expect(ids).toContain(PEDIDO_ANA_PASSADO);
    expect(ids).not.toContain(PEDIDO_BRUNO);
  });

  it('o Bruno vê a dele, e nenhuma da Ana (isolamento nos dois sentidos)', async () => {
    const r = await getMinhasComprasCore(
      db,
      caller({ uid: BRUNO_UID, email: BRUNO_EMAIL })
    );
    expect(r.compras.map((c) => c.pedidoId)).toEqual([PEDIDO_BRUNO]);
  });

  it('a lista vem da mais recente para a mais antiga', async () => {
    const r = await getMinhasComprasCore(db, caller());
    expect(r.compras[0]?.pedidoId).toBe(PEDIDO_ANA_FUTURO);
    expect(r.compras[r.compras.length - 1]?.pedidoId).toBe(PEDIDO_ANA_PASSADO);
  });

  it('`codigoPedido` ausente é AUSENTE — nunca o id no lugar (RN-475)', async () => {
    const r = await getMinhasComprasCore(db, caller());
    const comCodigo = r.compras.find((c) => c.pedidoId === PEDIDO_ANA_FUTURO);
    const semCodigo = r.compras.find((c) => c.pedidoId === PEDIDO_ANA_PASSADO);
    expect(comCodigo?.codigoPedido).toBe('K7M2P');
    expect(semCodigo?.codigoPedido).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. RN-174 (b) no leitor — o e-mail do token tem de ser o e-mail DA COMPRA
// ---------------------------------------------------------------------------

describe('RN-174 (b) · carimbo de conta não basta; o e-mail da compra tem de ser o meu', () => {
  it('pedido carimbado com o uid da Ana mas endereçado a OUTRO e-mail não entra', async () => {
    const r = await getMinhasComprasCore(db, caller());
    expect(r.compras.map((c) => c.pedidoId)).not.toContain(PEDIDO_EMAIL_DIVERGENTE);
  });

  it('a mesma conta com e-mail de token DIFERENTE do carimbo não vê nada', async () => {
    // Conta que trocou o e-mail depois do claim: fail-closed, igual ao
    // prefill. Nunca uma lista parcial silenciosa.
    const r = await getMinhasComprasCore(db, caller({ email: 'ana-nova@example.com' }));
    expect(r.estado).toBe('ok');
    expect(r.compras).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. Os três estados, distinguíveis
// ---------------------------------------------------------------------------

describe('RN-451 · "não posso responder" nunca se disfarça de "não há nada"', () => {
  it('sessão ANÔNIMA do checkout devolve `sessao_anonima`, não lista vazia', async () => {
    const r = await getMinhasComprasCore(db, caller({ ehAnonimo: true, email: null }));
    expect(r.estado).toBe('sessao_anonima');
    expect(r.compras).toEqual([]);
  });

  it('token sem `email_verified` devolve `email_nao_verificado`', async () => {
    const r = await getMinhasComprasCore(db, caller({ emailVerificado: false }));
    expect(r.estado).toBe('email_nao_verificado');
  });

  it('provedor de sign-in AUSENTE é tratado como anônimo (fail-closed)', async () => {
    const r = await getMinhasComprasCore(db, caller({ ehAnonimo: true }));
    expect(r.estado).toBe('sessao_anonima');
  });

  it('conta legítima SEM compras devolve `ok` com lista vazia — e são coisas diferentes', async () => {
    const r = await getMinhasComprasCore(
      db,
      caller({ uid: CLARA_UID, email: CLARA_EMAIL })
    );
    expect(r.estado).toBe('ok');
    expect(r.compras).toEqual([]);
    const anon = await getMinhasComprasCore(db, caller({ ehAnonimo: true }));
    expect(anon.estado).not.toBe(r.estado);
  });
});

// ---------------------------------------------------------------------------
// 6. Ingressos — recorte do servidor e as duas fontes
// ---------------------------------------------------------------------------

describe('RN-451 · meus ingressos, com o recorte feito no servidor', () => {
  it('separa próximos e passados pela data do EVENTO, não pelo relógio do cliente', async () => {
    const r = await getMeusIngressosCore(db, caller(), AGORA);
    expect(r.estado).toBe('ok');
    expect(r.proximos.every((i) => i.eventoId === EVENTO_FUTURO)).toBe(true);
    expect(r.passados.every((i) => i.eventoId === EVENTO_PASSADO)).toBe(true);
    expect(r.passados.map((i) => i.inscritoId)).toEqual(['insc-ana-2']);
  });

  it('o MESMO dado com o relógio adiantado move o ingresso de lista — é o `agora` que decide', async () => {
    const depois = await getMeusIngressosCore(db, caller(), AGORA + 365 * DIA_MS);
    expect(depois.proximos).toEqual([]);
    expect(depois.passados.map((i) => i.inscritoId).sort()).toContain('insc-ana-1');
  });

  it('quem COMPROU vê os ingressos das outras pessoas da compra (o QR da família)', async () => {
    const r = await getMeusIngressosCore(db, caller(), AGORA);
    expect(r.proximos.map((i) => i.inscritoId)).toContain('insc-filho-1');
  });

  it('quem RECEBEU um ingresso comprado por outra pessoa vê o próprio ingresso', async () => {
    const r = await getMeusIngressosCore(db, caller(), AGORA);
    expect(r.proximos.map((i) => i.inscritoId)).toContain('insc-presente-ana');
  });

  it('mas o presente NÃO vira compra da Ana — quem pagou foi o Bruno', async () => {
    const compras = await getMinhasComprasCore(db, caller());
    expect(compras.compras.map((c) => c.pedidoId)).not.toContain(PEDIDO_BRUNO);
  });

  it('o ingresso do pedido de e-mail divergente não aparece por nenhuma das duas fontes', async () => {
    const r = await getMeusIngressosCore(db, caller(), AGORA);
    const todos = [...r.proximos, ...r.passados].map((i) => i.inscritoId);
    expect(todos).not.toContain('insc-terceiro-1');
  });

  it('o Bruno não vê o ingresso da Ana só porque pagou por ele? vê — ele é o comprador', async () => {
    // Propriedade deliberada, escrita para que ninguém a "conserte" sem
    // decisão: quem paga precisa repassar o QR de quem convidou.
    const r = await getMeusIngressosCore(
      db,
      caller({ uid: BRUNO_UID, email: BRUNO_EMAIL }),
      AGORA
    );
    expect(r.proximos.map((i) => i.inscritoId)).toContain('insc-presente-ana');
  });

  it('o link do ingresso é cunhado no servidor e aponta para a base pública (RN-452)', async () => {
    const r = await getMeusIngressosCore(db, caller(), AGORA);
    const comLink = r.proximos.find((i) => i.inscritoId === 'insc-ana-1');
    expect(comLink?.emitido).toBe(true);
    expect(comLink?.linkIngresso).toMatch(/^https:\/\/leela\.test\/ingresso\/LLIP1\./);
  });

  it('o token do link NUNCA é o `qrToken` cru — a credencial de check-in não desce', async () => {
    const r = await getMeusIngressosCore(db, caller(), AGORA);
    for (const i of [...r.proximos, ...r.passados]) {
      expect(i.linkIngresso ?? '').not.toContain('LLQR1');
    }
  });

  it('`listaCompleta` é verdadeira quando as duas fontes responderam', async () => {
    const r = await getMeusIngressosCore(db, caller(), AGORA);
    expect(r.listaCompleta).toBe(true);
  });

  it('`linksDisponiveis` é verdadeiro quando o keyring está no runtime', async () => {
    const r = await getMeusIngressosCore(db, caller(), AGORA);
    expect(r.linksDisponiveis).toBe(true);
  });

  it('sessão anônima devolve o estado próprio, com as duas listas vazias', async () => {
    const r = await getMeusIngressosCore(db, caller({ ehAnonimo: true }), AGORA);
    expect(r.estado).toBe('sessao_anonima');
    expect(r.proximos).toEqual([]);
    expect(r.passados).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ⚔ O secret que falta NÃO pode passar calado (PIXREAL-FIX T5)
// ---------------------------------------------------------------------------

describe('⚔ sem `QR_TOKEN_KEYS` no runtime, a resposta DIZ que não há link', () => {
  it('lista os ingressos, marca `linksDisponiveis: false` e não inventa link', async () => {
    // O ring é cacheado por instância da Function (`keyringCache`), então o
    // caso precisa de um registro de módulos novo — é a única forma de
    // exercitar a carga com o ambiente sem o segredo.
    const guardado = process.env['QR_TOKEN_KEYS'];
    delete process.env['QR_TOKEN_KEYS'];
    vi.resetModules();
    try {
      const modulo = await import('../cliente/meusIngressos');
      const r = await modulo.getMeusIngressosCore(db, caller(), AGORA);
      // Os ingressos que a pessoa pagou continuam na tela: derrubar a leitura
      // inteira por uma variável de ambiente seria o incidente de 04/08 visto
      // do outro lado.
      expect(r.estado).toBe('ok');
      expect(r.proximos.length).toBeGreaterThan(0);
      expect(r.linksDisponiveis).toBe(false);
      for (const i of [...r.proximos, ...r.passados]) {
        expect(i.linkIngresso).toBeNull();
      }
    } finally {
      if (guardado !== undefined) process.env['QR_TOKEN_KEYS'] = guardado;
      vi.resetModules();
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Sem sessão → `unauthenticated`
// ---------------------------------------------------------------------------

describe('o callable exige sessão', () => {
  it('sem `context.auth` lança `unauthenticated` nos dois', async () => {
    const { getMinhasCompras } = await import('../cliente/minhasCompras');
    const { getMeusIngressos } = await import('../cliente/meusIngressos');
    type Runnable = { run: (d: unknown, c: unknown) => Promise<unknown> };
    await expect(
      (getMinhasCompras as unknown as Runnable).run({}, {})
    ).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(
      (getMeusIngressos as unknown as Runnable).run({}, {})
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });
});

// ---------------------------------------------------------------------------
// 4. ⚔ ATAQUE — as Rules não foram afrouxadas para a área existir
// ---------------------------------------------------------------------------

describe('⚔ RN-451 · a área do cliente NÃO abriu nenhuma coleção ao papel athlete', () => {
  it('token `athlete` LISTANDO `pedidos` pelo SDK continua negado', async () => {
    const cliente = dbComo(ANA_UID, { role: 'athlete' });
    await assertFails(getDocs(query(collection(cliente, 'pedidos'))));
  });

  it('token `athlete` filtrando `pedidos` pelo PRÓPRIO uid também não vira lista aberta', async () => {
    // A RN-469 autoriza o DOCUMENTO próprio; ela não transformou a coleção em
    // superfície de varredura para quem souber montar a query.
    const cliente = dbComo(BRUNO_UID, { role: 'athlete' });
    await assertFails(
      getDocs(
        query(collection(cliente, 'pedidos'), where('contaSemFriccao.contaUid', '==', ANA_UID))
      )
    );
  });

  it('token `athlete` lendo o pedido de OUTRA pessoa continua negado', async () => {
    const cliente = dbComo(BRUNO_UID, { role: 'athlete' });
    await assertFails(getDoc(doc(cliente, 'pedidos', PEDIDO_ANA_FUTURO)));
  });

  it('`inscritos` segue fechado ao cliente, doc a doc e por collectionGroup', async () => {
    const cliente = dbComo(ANA_UID, { role: 'athlete' });
    await assertFails(
      getDoc(doc(cliente, `eventos/${EVENTO_FUTURO}/inscritos/insc-ana-1`))
    );
    await assertFails(
      getDocs(
        query(collectionGroup(cliente, 'inscritos'), where('pessoaRef', '==', PESSOA_ANA))
      )
    );
  });

  it('`pessoas` continua inalcançável por qualquer cliente (PII/LGPD)', async () => {
    const cliente = dbComo(ANA_UID, { role: 'athlete' });
    await assertFails(getDoc(doc(cliente, 'pessoas', PESSOA_ANA)));
  });
});
