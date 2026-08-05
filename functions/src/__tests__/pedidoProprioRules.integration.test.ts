/**
 * pedidoProprioRules.integration.test.ts — S1225-T1 · RN-469
 *
 * Integração (Emulator): a ABERTURA de leitura do PRÓPRIO pedido em
 * `pedidos/{pedidoId}` e, sobretudo, tudo o que ela NÃO abriu.
 *
 * Por que arquivo NOVO e não um bloco em `pedidosRules.test.ts`: as fixtures
 * de lá nasceram para o lado do ORGANIZADOR (`ped-castelo-1`, sem uid de
 * comprador no id nem `contaSemFriccao`). A RN-469 precisa dos docs como o
 * checkout REALMENTE os grava — id `ped-{uid}-{chave}`, `responsavel.atletaId`
 * carimbado de `caller.uid` e o marcador `contaSemFriccao.contaUid` escrito
 * pela confirmação. As duas suítes cobrem lados opostos da mesma coleção e não
 * compartilham seed (`fileParallelism: false` no vitest.config).
 *
 * Cobre (critério de pronto da S1225-T1):
 *   - a sessão ANÔNIMA que comprou lê o próprio pedido (RN-469 (a))
 *   - a conta VINCULADA pela confirmação lê o mesmo pedido (RN-469 (b))
 *   - ATAQUE RN-469: terceiro anônimo, terceiro nomeado, comprador de OUTRO
 *     pedido e conta vinculada a OUTRO pedido são todos NEGADOS
 *   - ATAQUE RN-469 (prefixo de docId): uid que é PREFIXO do uid de outro
 *     comprador não lê o pedido dele — a guarda é campo, não formato de id
 *   - `write: if false` INTOCADO: o próprio comprador não cria, não atualiza
 *     e não deleta o pedido que agora consegue ler
 *   - nenhuma OUTRA coleção abriu: `pagamentos`, `inscritos` e `pessoas`
 *     seguem negando ao comprador (RN-451 preservada)
 *   - não-regressão do lado do organizador: owner/staff leem, promoter não,
 *     platform_admin cruza, doc inexistente segue PERMISSION_DENIED
 *
 * Pré-requisito: Firestore Emulator EXCLUSIVO da lane. O host/porta vêm de
 * `FIRESTORE_EMULATOR_HOST` (que o `firebase emulators:exec` exporta), com o
 * default do repo como fallback — rodar em porta alheia é o que faz duas
 * lanes se atropelarem.
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

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

/** Host:porta do emulator DESTA lane — nunca um default cravado no código. */
const EMULATOR_HOST_PORT = process.env['FIRESTORE_EMULATOR_HOST'] ?? 'localhost:8080';
const [EMULATOR_HOST, EMULATOR_PORT] = ((): [string, number] => {
  const i = EMULATOR_HOST_PORT.lastIndexOf(':');
  return [EMULATOR_HOST_PORT.slice(0, i), Number.parseInt(EMULATOR_HOST_PORT.slice(i + 1), 10)];
})();

const CASTELO_ID = 'castelo-producoes';
const MEIA_FLORIPA_ID = 'meia-maratona-floripa-2026';

const MARINA_UID = 'uid-marina-castelo';

// ── Os quatro personagens da RN-469 ────────────────────────────────────────
/** Ana comprou pela sessão ANÔNIMA do checkout (o caso do incidente 04/08). */
const ANA_ANON_UID = 'anon-ana-4f21c9';
/** A conta que a confirmação criou/vinculou para a Ana (RN-155/RN-174). */
const ANA_CONTA_UID = 'conta-ana-77a1';
/** Bruno é OUTRO comprador — o "terceiro" do caso de ataque. */
const BRUNO_ANON_UID = 'anon-bruno-9c02';
const BRUNO_CONTA_UID = 'conta-bruno-3311';
/**
 * Vetor de PREFIXO: `anon-ana` é prefixo estrito de `anon-ana-4f21c9`, e o
 * docId da Ana é `ped-anon-ana-4f21c9-chk-…`. Um guard por
 * `startsWith('ped-' + uid + '-')` daria TRUE aqui e entregaria o pedido da
 * Ana ao Mallory. A guarda por CAMPO não tem esse buraco.
 */
const MALLORY_PREFIXO_UID = 'anon-ana';

const PEDIDO_ANA = `ped-${ANA_ANON_UID}-chk-a1b2c3d4`;
const PEDIDO_BRUNO = `ped-${BRUNO_ANON_UID}-chk-e5f6g7h8`;
/** Pedido da Ana ainda PENDENTE — sem `contaSemFriccao` (campo ausente). */
const PEDIDO_ANA_PENDENTE = `ped-${ANA_ANON_UID}-chk-i9j0k1l2`;

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function dbAs(uid: string, claims: Record<string, unknown> = {}): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

function anonDb(uid: string): Firestore {
  // A sessão anônima do checkout É autenticada (Firebase Anonymous Auth):
  // tem uid, não tem claim de papel. É exatamente este contexto.
  return testEnv.authenticatedContext(uid, {}).firestore() as unknown as Firestore;
}

function pedidoDoComprador(
  compradorUid: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    tenantId: CASTELO_ID,
    eventoId: MEIA_FLORIPA_ID,
    responsavel: {
      // Espelho fiel de createInscricaoCharge.ts: `atletaId: caller.uid`.
      atletaId: compradorUid,
      nome: 'Comprador de Teste',
      email: 'comprador@example.com',
    },
    inscritoRefs: ['insc-1'],
    itens: [{ inscritoRef: 'insc-1', valorBase: 189.0, desconto: 0, valorFinal: 189.0 }],
    pagamentoRef: null,
    valorTotal: 189.0,
    status: 'pendente',
    formaPagamento: 'pix',
    // PII do comprador que herda o write:false (CKMOD) — mora no pedido e é
    // exatamente o que a RN-469 concede A ELE e a mais ninguém.
    endereco: {
      cep: '88015200',
      logradouro: 'Rua Bocaiúva',
      bairro: 'Centro',
      cidade: 'Florianópolis',
      uf: 'SC',
      numero: '100',
    },
    ...overrides,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: EMULATOR_HOST,
      port: EMULATOR_PORT,
    },
  });

  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = EMULATOR_HOST_PORT;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();

  await testEnv.clearFirestore();
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

  // Pedido PAGO da Ana, já com a conta vinculada pela confirmação.
  batch.set(adminDb.collection('pedidos').doc(PEDIDO_ANA), {
    ...pedidoDoComprador(ANA_ANON_UID, {
      status: 'pago',
      pagamentoRef: `pag-${ANA_ANON_UID}-chk-a1b2c3d4`,
      contaSemFriccao: {
        contaUid: ANA_CONTA_UID,
        contaCriada: true,
        emailStatus: 'enviado',
        pessoaVinculada: true,
        processadoEm: now,
      },
    }),
    id: PEDIDO_ANA,
    criadoEm: now,
    atualizadoEm: now,
  });

  // Pedido PENDENTE da Ana — o estado do PIX real do incidente: SEM o campo
  // `contaSemFriccao`. É a prova de que a guarda dá FALSO (e não erro de
  // avaliação) quando o campo não existe.
  batch.set(adminDb.collection('pedidos').doc(PEDIDO_ANA_PENDENTE), {
    ...pedidoDoComprador(ANA_ANON_UID),
    id: PEDIDO_ANA_PENDENTE,
    criadoEm: now,
    atualizadoEm: now,
  });

  // Pedido do Bruno — o alvo dos ataques da Ana e vice-versa.
  batch.set(adminDb.collection('pedidos').doc(PEDIDO_BRUNO), {
    ...pedidoDoComprador(BRUNO_ANON_UID, {
      status: 'pago',
      pagamentoRef: `pag-${BRUNO_ANON_UID}-chk-e5f6g7h8`,
      contaSemFriccao: {
        contaUid: BRUNO_CONTA_UID,
        contaCriada: false,
        emailStatus: 'enviado',
        pessoaVinculada: true,
        processadoEm: now,
      },
    }),
    id: PEDIDO_BRUNO,
    criadoEm: now,
    atualizadoEm: now,
  });

  // Vizinhos do pedido, para provar que a RN-469 não os arrastou junto.
  batch.set(adminDb.collection('pagamentos').doc(`pag-${ANA_ANON_UID}-chk-a1b2c3d4`), {
    tenantId: CASTELO_ID,
    eventoId: MEIA_FLORIPA_ID,
    pedidoRef: PEDIDO_ANA,
    status: 'confirmado',
    forma: 'pix',
    valorBase: 189.0,
    desconto: 0,
    valorFinal: 189.0,
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(adminDb.collection('inscritos').doc(`${PEDIDO_ANA}-i1`), {
    tenantId: CASTELO_ID,
    eventoId: MEIA_FLORIPA_ID,
    pedidoRef: PEDIDO_ANA,
    nome: 'Ana Participante',
    status: 'confirmado',
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(adminDb.collection('pessoas').doc('hmac-cpf-da-ana'), {
    cpf: '12345678909',
    contaUid: ANA_CONTA_UID,
    contaEmail: 'ana@example.com',
    criadoEm: now,
    atualizadoEm: now,
  });

  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

// ─────────────────────────────────────────────────────────────────────────
// RN-469 — o que ABRIU
// ─────────────────────────────────────────────────────────────────────────
describe('RN-469 · o comprador lê o PRÓPRIO pedido', () => {
  it('(a) a sessão ANÔNIMA que comprou lê o próprio pedido pago', async () => {
    await assertSucceeds(getDoc(doc(anonDb(ANA_ANON_UID), 'pedidos', PEDIDO_ANA)));
  });

  it('(a) a mesma sessão lê o próprio pedido PENDENTE, sem contaSemFriccao no doc', async () => {
    // O campo ausente tem que dar FALSO no ramo (b) e deixar o ramo (a)
    // decidir — nunca erro de avaliação, que negaria o dono do pedido.
    await assertSucceeds(getDoc(doc(anonDb(ANA_ANON_UID), 'pedidos', PEDIDO_ANA_PENDENTE)));
  });

  it('(b) a conta VINCULADA pela confirmação lê o pedido (área do cliente)', async () => {
    await assertSucceeds(
      getDoc(doc(dbAs(ANA_CONTA_UID, { role: 'athlete' }), 'pedidos', PEDIDO_ANA))
    );
  });

  it('o comprador lê o próprio endereço e a própria composição — a PII é DELE', async () => {
    const snap = await getDoc(doc(anonDb(ANA_ANON_UID), 'pedidos', PEDIDO_ANA));
    expect(snap.exists()).toBe(true);
    expect(snap.get('endereco.cidade')).toBe('Florianópolis');
    expect(snap.get('valorTotal')).toBe(189.0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// RN-469 — CASO DE ATAQUE (o coração da task)
// ─────────────────────────────────────────────────────────────────────────
describe('RN-469 · caso de ataque — terceiro NÃO lê pedido alheio', () => {
  it('outra sessão anônima (terceiro) NÃO lê o pedido da Ana', async () => {
    await assertFails(getDoc(doc(anonDb('anon-terceiro-qualquer'), 'pedidos', PEDIDO_ANA)));
  });

  it('conta NOMEADA de terceiro (athlete) NÃO lê o pedido da Ana', async () => {
    await assertFails(
      getDoc(doc(dbAs('uid-terceiro-nomeado', { role: 'athlete' }), 'pedidos', PEDIDO_ANA))
    );
  });

  it('o COMPRADOR do pedido do Bruno NÃO lê o pedido da Ana (e vice-versa)', async () => {
    await assertFails(getDoc(doc(anonDb(BRUNO_ANON_UID), 'pedidos', PEDIDO_ANA)));
    await assertFails(getDoc(doc(anonDb(ANA_ANON_UID), 'pedidos', PEDIDO_BRUNO)));
  });

  it('a conta vinculada ao pedido do Bruno NÃO lê o pedido da Ana', async () => {
    await assertFails(
      getDoc(doc(dbAs(BRUNO_CONTA_UID, { role: 'athlete' }), 'pedidos', PEDIDO_ANA))
    );
  });

  it('uid PREFIXO do uid do comprador NÃO lê o pedido dele (guarda é campo, não docId)', async () => {
    // `ped-anon-ana-4f21c9-chk-…`.startsWith('ped-' + 'anon-ana' + '-') é TRUE.
    // Se a Rule fosse por prefixo de id, este assert passaria a vazar.
    expect(PEDIDO_ANA.startsWith(`ped-${MALLORY_PREFIXO_UID}-`)).toBe(true);
    await assertFails(getDoc(doc(anonDb(MALLORY_PREFIXO_UID), 'pedidos', PEDIDO_ANA)));
  });

  it('token NÃO autenticado NÃO lê pedido nenhum', async () => {
    const anon = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(anon, 'pedidos', PEDIDO_ANA)));
  });

  it('athlete com tenantId FORJADO segue negado (a RN-469 não afrouxou a guarda de papel)', async () => {
    await assertFails(
      getDoc(
        doc(
          dbAs('uid-atleta-forjado', { role: 'athlete', tenantId: CASTELO_ID }),
          'pedidos',
          PEDIDO_ANA
        )
      )
    );
  });

  it('query SEM filtro segue negada ao comprador — ele não varre a coleção', async () => {
    await assertFails(getDocs(collection(anonDb(ANA_ANON_UID), 'pedidos')));
  });

  it('query forjada pelo uid ALHEIO é negada (não se prova com o uid do outro)', async () => {
    await assertFails(
      getDocs(
        query(
          collection(anonDb(ANA_ANON_UID), 'pedidos'),
          where('responsavel.atletaId', '==', BRUNO_ANON_UID)
        )
      )
    );
  });

  it('doc inexistente segue PERMISSION_DENIED — a abertura não virou oráculo', async () => {
    await assertFails(
      getDoc(doc(anonDb(ANA_ANON_UID), 'pedidos', `ped-${ANA_ANON_UID}-chk-nunca-existiu`))
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// `write: if false` INTOCADO — a RN-469 abriu leitura e SÓ leitura
// ─────────────────────────────────────────────────────────────────────────
describe('RN-469 · escrita segue NEGADA ao próprio comprador', () => {
  it('o comprador NÃO marca o próprio pedido como pago', async () => {
    await assertFails(
      updateDoc(doc(anonDb(ANA_ANON_UID), 'pedidos', PEDIDO_ANA_PENDENTE), { status: 'pago' })
    );
  });

  it('o comprador NÃO muda o valor nem o pagamentoRef do próprio pedido', async () => {
    const ref = doc(anonDb(ANA_ANON_UID), 'pedidos', PEDIDO_ANA_PENDENTE);
    await assertFails(updateDoc(ref, { valorTotal: 1.0 }));
    await assertFails(updateDoc(ref, { pagamentoRef: 'pag-forjado' }));
  });

  it('o comprador NÃO reescreve o próprio endereço nem os próprios aceites', async () => {
    const ref = doc(anonDb(ANA_ANON_UID), 'pedidos', PEDIDO_ANA);
    await assertFails(updateDoc(ref, { 'endereco.cidade': 'Outra Cidade' }));
    await assertFails(
      updateDoc(ref, { aceites: { termos: { versao: 'v-forjada', aceiteEm: null } } })
    );
  });

  it('o comprador NÃO cria pedido nem deleta o próprio', async () => {
    const db = anonDb(ANA_ANON_UID);
    await assertFails(
      setDoc(doc(db, 'pedidos', `ped-${ANA_ANON_UID}-chk-forjado`), pedidoDoComprador(ANA_ANON_UID))
    );
    await assertFails(deleteDoc(doc(db, 'pedidos', PEDIDO_ANA_PENDENTE)));
  });

  it('a conta vinculada também não escreve o pedido que lê', async () => {
    await assertFails(
      updateDoc(doc(dbAs(ANA_CONTA_UID, { role: 'athlete' }), 'pedidos', PEDIDO_ANA), {
        status: 'cancelado',
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Nenhuma OUTRA coleção abriu (RN-451 preservada)
// ─────────────────────────────────────────────────────────────────────────
describe('RN-469 · a abertura não vazou para as coleções vizinhas', () => {
  it('o comprador NÃO lê o `pagamentos` do próprio pedido', async () => {
    await assertFails(
      getDoc(
        doc(anonDb(ANA_ANON_UID), 'pagamentos', `pag-${ANA_ANON_UID}-chk-a1b2c3d4`)
      )
    );
  });

  it('o comprador NÃO lê os `inscritos` do próprio pedido (área do cliente é callable)', async () => {
    await assertFails(getDoc(doc(anonDb(ANA_ANON_UID), 'inscritos', `${PEDIDO_ANA}-i1`)));
  });

  it('a conta vinculada NÃO lê o registro `pessoas` dela (RN-173 fechada como antes)', async () => {
    await assertFails(
      getDoc(doc(dbAs(ANA_CONTA_UID, { role: 'athlete' }), 'pessoas', 'hmac-cpf-da-ana'))
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Não-regressão do lado do ORGANIZADOR
// ─────────────────────────────────────────────────────────────────────────
describe('RN-469 · o lado do organizador não mudou', () => {
  it('tenant_owner e tenant_staff seguem lendo os pedidos do tenant', async () => {
    await assertSucceeds(
      getDoc(
        doc(dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID }), 'pedidos', PEDIDO_ANA)
      )
    );
    await assertSucceeds(
      getDoc(
        doc(dbAs('uid-staff', { role: 'tenant_staff', tenantId: CASTELO_ID }), 'pedidos', PEDIDO_ANA)
      )
    );
  });

  it('promoter segue SEM ver dinheiro', async () => {
    await assertFails(
      getDoc(
        doc(dbAs('uid-promoter', { role: 'promoter', tenantId: CASTELO_ID }), 'pedidos', PEDIDO_ANA)
      )
    );
  });

  it('platform_admin segue cruzando tenants na leitura', async () => {
    await assertSucceeds(
      getDoc(doc(dbAs('uid-platform-admin', { role: 'platform_admin' }), 'pedidos', PEDIDO_ANA))
    );
  });

  it('a query do organizador por tenant+evento segue provável', async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID }), 'pedidos'),
          where('tenantId', '==', CASTELO_ID),
          where('eventoId', '==', MEIA_FLORIPA_ID)
        )
      )
    );
  });
});
