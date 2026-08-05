/**
 * pedidoProprioRulesAntagonista.integration.test.ts — REV-S1225 · RN-469
 *
 * REVIEW ANTAGONISTA em contexto fresco da abertura de leitura de
 * `pedidos/{pedidoId}` (commit `bdc9a531`). Este arquivo NÃO repete a suíte do
 * construtor: ele ataca o que ela NÃO mediu.
 *
 * O construtor declarou no trailer do commit, como fato:
 *   "a query `where('responsavel.atletaId','==',uid)` passou a ser PROVÁVEL —
 *    capacidade nova e intencional"
 * A suíte dele prova que a query SEM filtro e a query com o uid ALHEIO falham.
 * Ela nunca prova que a query com o PRÓPRIO uid passa. Afirmação sobre Rules
 * sem teste é a definição de verde falso — e é o primeiro bloco daqui.
 *
 * Blocos:
 *   A. a capacidade de LISTAR de fato existe? e ela atravessa tenants?
 *   B. doc com SHAPE TORTO — a guarda `in` erra ou dá falso? fail-closed?
 *   C. CAMPO A CAMPO, o que a leitura entrega ao comprador (RN-442 + os
 *      campos operacionais que a lane paralela F2F5 passou a gravar)
 *   D. `contaSemFriccao.contaUid` como FRONTEIRA DE AUTORIZAÇÃO — o vínculo
 *      é derivado de e-mail, e quem controla o e-mail controla a leitura
 *
 * Pré-requisito: Firestore Emulator EXCLUSIVO da lane, host/porta em
 * `FIRESTORE_EMULATOR_HOST` (mesma convenção da suíte do construtor).
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
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
// O leitor REAL que a T3 usa no `CheckoutFlow` (`getPedido` + `parsePedido` do
// core). O vitest.config de `functions/` já resolve `@leela/api-client` para a
// fonte — os testes de Rules exercitam as queries reais de propósito.
import { getPedido } from '@leela/api-client';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const EMULATOR_HOST_PORT = process.env['FIRESTORE_EMULATOR_HOST'] ?? 'localhost:8080';
const [EMULATOR_HOST, EMULATOR_PORT] = ((): [string, number] => {
  const i = EMULATOR_HOST_PORT.lastIndexOf(':');
  return [EMULATOR_HOST_PORT.slice(0, i), Number.parseInt(EMULATOR_HOST_PORT.slice(i + 1), 10)];
})();

const TENANT_A = 'castelo-producoes';
/** Segundo tenant — a listagem do comprador atravessa a fronteira? */
const TENANT_B = 'outra-produtora';
const EVENTO_A = 'meia-maratona-floripa-2026';
const EVENTO_B = 'trilha-serra-2026';

const OWNER_A_UID = 'uid-marina-castelo';

/** A compradora, pela sessão anônima do checkout. */
const CLARA_UID = 'anon-clara-11aa';
/** A conta que a confirmação vinculou pelo e-mail dela. */
const CLARA_CONTA_UID = 'conta-clara-99zz';
/** Outro comprador — o terceiro. */
const DAVI_UID = 'anon-davi-22bb';

/** Pedido da Clara no tenant A. */
const PED_CLARA_A = `ped-${CLARA_UID}-chk-aaaa1111`;
/** Segundo pedido da Clara, em OUTRO tenant — o vetor de listagem cross-tenant. */
const PED_CLARA_B = `ped-${CLARA_UID}-chk-bbbb2222`;
/** Pedido do Davi — nunca pode aparecer numa listagem da Clara. */
const PED_DAVI = `ped-${DAVI_UID}-chk-cccc3333`;

/** `responsavel` gravado como STRING — shape torto (vetor 5 do construtor). */
const PED_SHAPE_TORTO = 'ped-shape-torto-responsavel-string';
/** `responsavel` map SEM `atletaId`. */
const PED_SEM_ATLETAID = 'ped-shape-sem-atletaid';
/** `contaSemFriccao` gravado como STRING. */
const PED_CONTA_TORTA = 'ped-shape-contasemfriccao-string';
/** Pedido SEM `tenantId` — o primeiro disjunto (`isTenantWriter`) erra. */
const PED_SEM_TENANT = 'ped-shape-sem-tenantid';

/**
 * Pedido com TODOS os campos que a plataforma grava hoje, inclusive os que a
 * lane paralela (BUILD-F2F5, commits `9abe8396`/`9d980bae`) passou a escrever
 * DEPOIS que a RN-469 abriu a leitura: `emailIngressos` e `reenvioEmails`.
 */
const PED_CAMPO_A_CAMPO = `ped-${CLARA_UID}-chk-dddd4444`;

// RN-442 / F-1: os hashes do bloco de aceites são hex de 64 (HMAC-SHA256) —
// `parseAceitesPedido` reprova qualquer coisa que PAREÇA um valor em claro.
const HASH_MATERIAL = 'a'.repeat(64);
const HASH_IP = 'b'.repeat(64);
/** O UA vai em CLARO (truncado) — `OrigemAceite.userAgent`, não um hash. */
const UA_DA_COMPRA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/605.1.15';
/**
 * Pedido com `aceites.origem.ipHash` FORA do formato (prova legada/corrompida):
 * as Rules DEIXAM ler e o `parsePedido` RECUSA. É o vetor 13 do construtor
 * ("a consulta falha em silêncio e a tela volta ao pré-T3") em forma medível.
 */
const PED_PARSE_RECUSA = `ped-${CLARA_UID}-chk-eeee5555`;

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function dbAs(uid: string, claims: Record<string, unknown> = {}): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

function pedidoBase(
  compradorUid: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    tenantId: TENANT_A,
    eventoId: EVENTO_A,
    responsavel: {
      atletaId: compradorUid,
      nome: 'Compradora de Teste',
      email: 'clara@example.com',
    },
    inscritoRefs: ['insc-1'],
    itens: [{ inscritoRef: 'insc-1', valorBase: 189.0, desconto: 0, valorFinal: 189.0 }],
    pagamentoRef: null,
    valorTotal: 189.0,
    status: 'pendente',
    formaPagamento: 'pix',
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

  for (const [id, nome] of [
    [TENANT_A, 'Castelo Produções'],
    [TENANT_B, 'Outra Produtora'],
  ] as const) {
    batch.set(adminDb.collection('tenants').doc(id), {
      id,
      nome,
      slug: id,
      status: 'ativo',
      ownerUid: OWNER_A_UID,
      tipo: 'produtor',
      criadoEm: now,
      atualizadoEm: now,
    });
  }

  batch.set(adminDb.collection('pedidos').doc(PED_CLARA_A), {
    ...pedidoBase(CLARA_UID, {
      status: 'pago',
      pagamentoRef: `pag-${CLARA_UID}-a`,
      contaSemFriccao: {
        contaUid: CLARA_CONTA_UID,
        contaCriada: true,
        emailStatus: 'enviado',
        pessoaVinculada: true,
        processadoEm: now,
      },
    }),
    id: PED_CLARA_A,
    criadoEm: now,
    atualizadoEm: now,
  });

  // MESMA compradora, tenant DIFERENTE — a fronteira multi-tenant (ADR-009)
  // nunca foi atravessada por um token de participante antes da RN-469.
  batch.set(adminDb.collection('pedidos').doc(PED_CLARA_B), {
    ...pedidoBase(CLARA_UID, {
      tenantId: TENANT_B,
      eventoId: EVENTO_B,
      // Espelho de forma exige cobrança criada (ADR-011) — o `parsePedido`
      // reprova `formaPagamento` com `pagamentoRef` null.
      pagamentoRef: `pag-${CLARA_UID}-b`,
    }),
    id: PED_CLARA_B,
    criadoEm: now,
    atualizadoEm: now,
  });

  // Rules ABREM, parser RECUSA — o silêncio da T3 com dado real fora de forma.
  batch.set(adminDb.collection('pedidos').doc(PED_PARSE_RECUSA), {
    ...pedidoBase(CLARA_UID, {
      status: 'pago',
      pagamentoRef: `pag-${CLARA_UID}-e`,
      aceites: {
        termos: { versao: 3, aceiteEm: now },
        saude: { versao: 2, aceiteEm: now },
        origem: { ipHash: 'ip-em-claro-187.1.2.3', userAgent: UA_DA_COMPRA },
      },
    }),
    id: PED_PARSE_RECUSA,
    criadoEm: now,
    atualizadoEm: now,
  });

  batch.set(adminDb.collection('pedidos').doc(PED_DAVI), {
    ...pedidoBase(DAVI_UID),
    id: PED_DAVI,
    criadoEm: now,
    atualizadoEm: now,
  });

  // ── Docs de SHAPE TORTO ────────────────────────────────────────────────
  batch.set(adminDb.collection('pedidos').doc(PED_SHAPE_TORTO), {
    ...pedidoBase(CLARA_UID),
    id: PED_SHAPE_TORTO,
    responsavel: CLARA_UID, // string, não map
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(adminDb.collection('pedidos').doc(PED_SEM_ATLETAID), {
    ...pedidoBase(CLARA_UID),
    id: PED_SEM_ATLETAID,
    responsavel: { nome: 'Sem atletaId', email: 'clara@example.com' },
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(adminDb.collection('pedidos').doc(PED_CONTA_TORTA), {
    ...pedidoBase(DAVI_UID),
    id: PED_CONTA_TORTA,
    contaSemFriccao: CLARA_CONTA_UID, // string, não map
    criadoEm: now,
    atualizadoEm: now,
  });
  {
    const semTenant = pedidoBase(CLARA_UID);
    delete semTenant['tenantId'];
    batch.set(adminDb.collection('pedidos').doc(PED_SEM_TENANT), {
      ...semTenant,
      id: PED_SEM_TENANT,
      criadoEm: now,
      atualizadoEm: now,
    });
  }

  // ── Doc CAMPO A CAMPO: tudo o que a leitura aberta entrega hoje ─────────
  batch.set(adminDb.collection('pedidos').doc(PED_CAMPO_A_CAMPO), {
    ...pedidoBase(CLARA_UID, {
      status: 'pago',
      pagamentoRef: `pag-${CLARA_UID}-d`,
      endereco: {
        cep: '88015200',
        logradouro: 'Rua Bocaiúva',
        bairro: 'Centro',
        cidade: 'Florianópolis',
        uf: 'SC',
        numero: '100',
      },
      // RN-442: a ORIGEM do aceite carrega hash de IP e de user-agent.
      aceites: {
        termos: { versao: 3, aceiteEm: now, materialHash: HASH_MATERIAL },
        saude: { versao: 2, aceiteEm: now },
        origem: { ipHash: HASH_IP, userAgent: UA_DA_COMPRA },
      },
      contaSemFriccao: {
        contaUid: CLARA_CONTA_UID,
        contaCriada: true,
        emailStatus: 'falha_envio',
        pessoaVinculada: true,
        processadoEm: now,
      },
      // BUILD-F2F5 (`9d980bae`): o incidente de e-mail vira estado NO PEDIDO.
      emailIngressos: {
        status: 'falha_envio',
        atualizadoEm: now,
        falhaEm: now,
        falhas: 3,
      },
      // BUILD-F2F5 (`9abe8396`): o carimbo do reenvio admin-only.
      reenvioEmails: {
        ultimoEm: now,
        ultimoReenvioId: 'reenvio-op-marina-01',
        total: 2,
      },
    }),
    id: PED_CAMPO_A_CAMPO,
    criadoEm: now,
    atualizadoEm: now,
  });

  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

// ═════════════════════════════════════════════════════════════════════════
// A. A CAPACIDADE DE LISTAR — a afirmação do commit, medida
// ═════════════════════════════════════════════════════════════════════════
describe('REV-S1225 · A capacidade de LISTAR os próprios pedidos', () => {
  it('a query pelo PRÓPRIO `responsavel.atletaId` é de fato PROVÁVEL (trailer do commit `bdc9a531`)', async () => {
    // O construtor afirmou isto no trailer e não mediu. As guardas `in`
    // aninhadas do disjunto novo poderiam torná-la improvável — se este teste
    // falhar, a Directive do commit está errada e vira correção de documento,
    // não de código.
    await assertSucceeds(
      getDocs(
        query(
          collection(dbAs(CLARA_UID), 'pedidos'),
          where('responsavel.atletaId', '==', CLARA_UID)
        )
      )
    );
  });

  it('a listagem devolve SÓ os pedidos dela — o do terceiro nunca entra', async () => {
    const snap = await getDocs(
      query(
        collection(dbAs(CLARA_UID), 'pedidos'),
        where('responsavel.atletaId', '==', CLARA_UID)
      )
    );
    const ids = snap.docs.map((d) => d.id).sort();
    expect(ids).not.toContain(PED_DAVI);
    expect(ids).toContain(PED_CLARA_A);
  });

  it('⚠ a listagem ATRAVESSA tenants — capacidade que a spec não pediu nominalmente', async () => {
    // ADR-009 isola por tenant. Um token de participante nunca tinha varredura
    // de coleção root; agora tem, e ela não é limitada ao tenant da compra.
    // Não é vazamento (só o dado dela), mas é superfície nova: quem lê este
    // teste falhar está estreitando a Rule de propósito.
    const snap = await getDocs(
      query(
        collection(dbAs(CLARA_UID), 'pedidos'),
        where('responsavel.atletaId', '==', CLARA_UID)
      )
    );
    const tenants = new Set(snap.docs.map((d) => d.get('tenantId') as string));
    expect(tenants.has(TENANT_A)).toBe(true);
    expect(tenants.has(TENANT_B)).toBe(true);
  });

  it('a query pela PRÓPRIA `contaSemFriccao.contaUid` também lista', async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(dbAs(CLARA_CONTA_UID), 'pedidos'),
          where('contaSemFriccao.contaUid', '==', CLARA_CONTA_UID)
        )
      )
    );
  });

  it('query pelo `contaUid` ALHEIO segue negada', async () => {
    await assertFails(
      getDocs(
        query(
          collection(dbAs(CLARA_UID), 'pedidos'),
          where('contaSemFriccao.contaUid', '==', 'conta-do-davi')
        )
      )
    );
  });

  it('query por tenantId (sem claim de tenant) segue negada ao comprador', async () => {
    // O comprador não vira leitor do tenant por ter um pedido nele.
    await assertFails(
      getDocs(
        query(collection(dbAs(CLARA_UID), 'pedidos'), where('tenantId', '==', TENANT_A))
      )
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════
// B. SHAPE TORTO — as guardas `in` erram ou dão falso? (vetor 5)
// ═════════════════════════════════════════════════════════════════════════
describe('REV-S1225 · doc com shape torto é FAIL-CLOSED', () => {
  it('`responsavel` gravado como STRING: o comprador é negado, não lê por erro', async () => {
    await assertFails(getDoc(doc(dbAs(CLARA_UID), 'pedidos', PED_SHAPE_TORTO)));
  });

  it('`responsavel` sem `atletaId`: negado', async () => {
    await assertFails(getDoc(doc(dbAs(CLARA_UID), 'pedidos', PED_SEM_ATLETAID)));
  });

  it('`contaSemFriccao` gravado como STRING: negado à conta que o valor nomeia', async () => {
    await assertFails(getDoc(doc(dbAs(CLARA_CONTA_UID), 'pedidos', PED_CONTA_TORTA)));
  });

  it('shape torto NÃO derruba o organizador — o disjunto dele curto-circuita antes', async () => {
    const owner = dbAs(OWNER_A_UID, { role: 'tenant_owner', tenantId: TENANT_A });
    await assertSucceeds(getDoc(doc(owner, 'pedidos', PED_SHAPE_TORTO)));
    await assertSucceeds(getDoc(doc(owner, 'pedidos', PED_SEM_ATLETAID)));
  });

  it('pedido SEM `tenantId`: o primeiro disjunto NÃO explode — o comprador segue lendo', async () => {
    // Hipótese testada e DERRUBADA: `resource.data.tenantId` ausente não vira
    // erro de avaliação, vira `null`, e `isTenantMember(null)` só compara.
    // Consequência prática: a ordem dos disjuntos não fragiliza o comprador.
    await assertSucceeds(getDoc(doc(dbAs(CLARA_UID), 'pedidos', PED_SEM_TENANT)));
  });

  it('pedido SEM `tenantId` NÃO vira porta para terceiro sem claim', async () => {
    // O corolário perigoso do teste acima: se `tenantId` ausente compara com
    // `request.auth.token.tenantId` ausente, os dois são `null` e a igualdade
    // é verdadeira. O que segura a porta é a GUARDA DE PAPEL de
    // `isTenantWriter` — token sem `role` de gestão não passa. Fica registrado
    // que a guarda de papel é load-bearing, e não apenas defesa em profundidade.
    await assertFails(getDoc(doc(dbAs(DAVI_UID), 'pedidos', PED_SEM_TENANT)));
    await assertFails(
      getDoc(doc(dbAs('uid-promoter-sem-tenant', { role: 'promoter' }), 'pedidos', PED_SEM_TENANT))
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════
// C. CAMPO A CAMPO — o que a leitura aberta ENTREGA (vetor 6)
// ═════════════════════════════════════════════════════════════════════════
describe('REV-S1225 · campo a campo, o que a RN-469 entrega ao comprador', () => {
  it('entrega a PII que ele mesmo forneceu — endereço e composição do que pagou', async () => {
    const snap = await getDoc(doc(dbAs(CLARA_UID), 'pedidos', PED_CAMPO_A_CAMPO));
    expect(snap.get('endereco.cep')).toBe('88015200');
    expect(snap.get('valorTotal')).toBe(189.0);
  });

  it('⚠ entrega `aceites.origem` — ipHash e uaHash da própria compra (RN-442)', async () => {
    // Dado que a PLATAFORMA derivou sobre ele, não que ele forneceu. É a prova
    // de origem do aceite; um hash HMAC não é reversível, mas é oráculo de
    // igualdade: quem tem o hash confirma "fui eu, deste IP".
    const snap = await getDoc(doc(dbAs(CLARA_UID), 'pedidos', PED_CAMPO_A_CAMPO));
    expect(snap.get('aceites.origem.ipHash')).toBe(HASH_IP);
    expect(snap.get('aceites.origem.userAgent')).toBe(UA_DA_COMPRA);
  });

  it('⚠ entrega `emailIngressos` — o comprador lê que o e-mail dele FALHOU 3 vezes', async () => {
    // Campo criado pela lane paralela BUILD-F2F5 (`9d980bae`) para virar
    // INCIDENTE OPERACIONAL do organizador. A RN-469 abriu a leitura do doc
    // INTEIRO, então ele chega junto. Decisão cross-lane: filtrar ou aceitar.
    const snap = await getDoc(doc(dbAs(CLARA_UID), 'pedidos', PED_CAMPO_A_CAMPO));
    expect(snap.get('emailIngressos.status')).toBe('falha_envio');
    expect(snap.get('emailIngressos.falhas')).toBe(3);
  });

  it('⚠ entrega `reenvioEmails` — quantas vezes o operador reenviou, e o id da operação', async () => {
    const snap = await getDoc(doc(dbAs(CLARA_UID), 'pedidos', PED_CAMPO_A_CAMPO));
    expect(snap.get('reenvioEmails.total')).toBe(2);
    expect(snap.get('reenvioEmails.ultimoReenvioId')).toBe('reenvio-op-marina-01');
  });

  it('a fronteira SEGUE fechada nos vizinhos: pagamentos, inscritos e pessoas', async () => {
    const db = dbAs(CLARA_UID);
    await assertFails(getDoc(doc(db, 'pagamentos', `pag-${CLARA_UID}-d`)));
    await assertFails(getDoc(doc(db, 'inscritos', 'insc-1')));
    await assertFails(getDoc(doc(db, 'pessoas', 'hmac-cpf-da-clara')));
  });
});

// ═════════════════════════════════════════════════════════════════════════
// D. `contaSemFriccao.contaUid` VIROU fronteira de autorização (vetor 3)
// ═════════════════════════════════════════════════════════════════════════
describe('REV-S1225 · o vínculo por e-mail agora AUTORIZA leitura', () => {
  it('quem controla a conta do e-mail da compra lê o pedido inteiro, sem ter comprado', async () => {
    // `contaSemFriccao.contaUid` sai de `auth.getUidPorEmail(email)`
    // (`contaSemFriccao.ts:203`): a conta é resolvida PELO E-MAIL digitado no
    // checkout, e uma conta preexistente é REUSADA sem prova de posse. Antes
    // da RN-469 esse campo era um vínculo administrativo; agora ele é chave de
    // leitura de PII (endereço, aceites, composição financeira). O código já
    // trata hijack como risco no lado da `pessoa` ("First-claim: vínculo
    // divergente NUNCA sobrescrito"), e não há guarda equivalente aqui.
    await assertSucceeds(getDoc(doc(dbAs(CLARA_CONTA_UID), 'pedidos', PED_CLARA_A)));
    // E o mesmo uid NÃO alcança o pedido de terceiro — a fronteira é o vínculo,
    // e é exatamente por isso que o vínculo precisa ser confiável.
    await assertFails(getDoc(doc(dbAs(CLARA_CONTA_UID), 'pedidos', PED_DAVI)));
  });
});

// ═════════════════════════════════════════════════════════════════════════
// E. O FIO DA T3, ponta a ponta — Rules REAIS + `getPedido` REAL
// ═════════════════════════════════════════════════════════════════════════
//
// A lane BUILD declarou como vetor 16 "nenhum teste E2E: o caminho real
// (webhook materializa `pago` → o comprador clica em atualizar) nunca rodou
// ponta a ponta", e como vetor 13 "se `parsePedido` recusar um pedido real, a
// consulta falha EM SILÊNCIO por design e a tela volta ao pré-T3".
//
// Sem produção e sem navegador, este é o mais perto que dá: o `getPedido` do
// api-client (o MESMO que o `CheckoutFlow` chama na T3) contra o Emulator com
// as Rules REAIS, sobre o doc com TODOS os campos que a plataforma grava hoje.
// A suíte da landing mocka `getPedido`; aqui ele é o de verdade.
describe('REV-S1225 · o fio da T3 contra Rules reais (E2E possível)', () => {
  it('`getPedido` do api-client lê e PARSEIA o pedido real do comprador (vetor 13)', async () => {
    const pedido = await getPedido(dbAs(CLARA_UID), PED_CAMPO_A_CAMPO);
    // Se `parsePedido` recusar o shape que o servidor grava (`contaSemFriccao`,
    // `emailIngressos`, `reenvioEmails`, `aceites.origem` — nenhum deles no
    // type `Pedido`), a T3 falha em silêncio na tela. Não recusa: campo
    // desconhecido é ignorado, e é isso que este teste tranca.
    expect(pedido).not.toBeNull();
    expect(pedido?.status).toBe('pago');
    expect(pedido?.id).toBe(PED_CAMPO_A_CAMPO);
  });

  it('o webhook materializar `pago` faz a MESMA consulta virar `pago` (o caminho do incidente 04/08)', async () => {
    const antes = await getPedido(dbAs(CLARA_UID), PED_CLARA_B);
    expect(antes?.status).toBe('pendente');

    // O webhook é Admin SDK: bypassa Rules e escreve o estado final. É a
    // única escrita que existe neste caminho — o cliente segue com write:false.
    await adminDb.collection('pedidos').doc(PED_CLARA_B).update({
      status: 'pago',
      pagamentoRef: `pag-${CLARA_UID}-b`,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    const depois = await getPedido(dbAs(CLARA_UID), PED_CLARA_B);
    expect(depois?.status).toBe('pago');
  });

  it('terceiro chamando o MESMO `getPedido` é barrado — o leitor real não vaza', async () => {
    await expect(getPedido(dbAs(DAVI_UID), PED_CLARA_A)).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('⚠ Rules ABREM e `parsePedido` RECUSA: a T3 fica muda sobre um pedido PAGO (vetor 13)', async () => {
    // As Rules deixam o comprador ler (é o pedido dele) …
    await assertSucceeds(getDoc(doc(dbAs(CLARA_UID), 'pedidos', PED_PARSE_RECUSA)));
    // … e o leitor da T3 lança, porque a prova de origem está fora de forma.
    // No `CheckoutFlow` este throw é ENGOLIDO com `console.error`: o comprador
    // clica em "Atualizar estado do pedido", o pedido está PAGO, e a tela não
    // diz nada — nem que confirmou, nem que não conseguiu olhar. É o incidente
    // de 04/08 com outra causa-raiz.
    await expect(getPedido(dbAs(CLARA_UID), PED_PARSE_RECUSA)).rejects.toThrow(/RN-442|origem/i);
  });
});
