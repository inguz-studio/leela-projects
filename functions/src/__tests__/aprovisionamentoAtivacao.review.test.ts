/**
 * aprovisionamentoAtivacao.review.test.ts — LEELA-D-T3 (review antagonista Fable)
 *
 * ATIVAÇÃO do estoque: o wire `edd395c` ligou a EstoqueView à callable
 * `transicaoAprovisionamento` (FABLE-D `d54c53a`). A diretriz do batch backend
 * exigiu "review antagonista Fable na ativação". Este arquivo forja PAYLOADS
 * DIRETOS contra o núcleo do servidor (bypassando a UI) e prova que a máquina
 * de estados + os guards negam TUDO que não seja uma transição legítima.
 *
 * Complementa `estoqueAprovisionamento.integration.test.ts` (caminho canônico +
 * atalho/replay + Rules). Aqui o foco é o ATACANTE que não usa o modal:
 *   - regressão EXPLÍCITA de estado (em_estoque→encomendado, encomendado→estimativa)
 *   - novoEstado FORA do enum (string forjada)
 *   - qtd não-inteiro / string / negativa forjadas → invalid-argument
 *   - qtd ABSURDA (1e9/1e21) → agora rejeitada pelo teto sanitário (S210-T4)
 *   - SKU de OUTRO evento do MESMO tenant não é alcançável via eventoId cruzado
 *   - papel promoter (lê, não escreve) negado — RN-401
 *   - historico[] é APPEND-ONLY: a Function só cresce a trilha, nunca reescreve
 *
 * Pré-requisito: Firestore Emulator (8080) via emulators:exec.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AuthClaims } from '@leela/core';
import {
  recomputarAprovisionamentoEvento,
  transicaoAprovisionamentoCore,
  validarTransicaoAprovisionamentoInput,
  MAX_QTD_TRANSICAO_APROVISIONAMENTO,
} from '../eventos/agregarEstoque';
import type { EventoCaller } from '../eventos/criarEvento';

const PROJECT_ID = 'demo-leela-estoque-review';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const TENANT_ID = 'castelo-producoes';
const OUTRO_TENANT_ID = 'passo-certo';
const EVENTO_A = 'meia-floripa-2026';
const EVENTO_B = 'trail-serra-2026'; // MESMO tenant, outro evento
const MARINA_UID = 'uid-marina';

// itensKit é coleção TOP-LEVEL (docId global) e o docId do item vira o `itemId`
// do SKU (`itemId__tamanho`) — por isso cada evento usa um item distinto e SEM
// o separador `__`. Isso deixa os SKUs de A e B com strings diferentes, o que é
// exatamente o que o teste de isolamento cross-evento precisa provar.
const ITEM_A = 'camiseta-a';
const ITEM_B = 'camiseta-b';
const SKU_A_M = `${ITEM_A}__M`; // existe no evento A
const SKU_B_M = `${ITEM_B}__M`; // materializado no evento B (mesmo tenant)

const organizador: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: TENANT_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

function aprovRef(eventoId: string, sku: string) {
  return db.doc(`eventos/${eventoId}/aprovisionamento/${sku}`);
}

function mkInscritoDoc(
  id: string,
  status: string,
  kit: string,
  tamanhos: Record<string, string>
): Record<string, unknown> {
  const now = Timestamp.now();
  return {
    id, tenantId: TENANT_ID, atletaId: `atleta-${id}`, atletaNome: `Atleta ${id}`,
    kit, chipNumero: null, status, modalidade: '10k', tamanhos,
    criadoEm: now, atualizadoEm: now,
  };
}

/** Cria evento + item tamanhado + 1 inscrito confirmado M sob o tenant dono. */
async function seedEvento(eventoId: string, itemId: string): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  const eventoRef = db.collection('eventos').doc(eventoId);
  batch.set(eventoRef, {
    id: eventoId, tenantId: TENANT_ID, organizadorId: MARINA_UID,
    nome: `Evento ${eventoId}`, data: Timestamp.fromDate(new Date('2026-04-27T07:00:00-03:00')),
    local: 'Florianópolis/SC', modalidades: ['5k', '10k', '21k'], slug: eventoId,
    status: 'publicado', usaChip: true, qtdInscritos: 1, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('itensKit').doc(itemId), {
    id: itemId, tenantId: TENANT_ID, eventoId,
    nome: 'Camiseta técnica', tamanhado: true, origem: 'organizador',
    exibirLogo: false, modeloEstoque: 'sob_encomenda',
    tamanhosDisponiveis: ['P', 'M', 'G', 'GG'], kits: ['kit_prata'],
    criadoEm: now, atualizadoEm: now,
  });
  // O SKU (`itemId__tamanho`) usa o docId do item como itemId; o map `tamanhos`
  // do inscrito é chaveado pelo MESMO itemId (predicado (item, tamanho) — RN-224).
  batch.set(eventoRef.collection('inscritos').doc('i1'),
    mkInscritoDoc('i1', 'confirmado', 'kit_prata', { [itemId]: 'M' }));
  await batch.commit();
}

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
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  const now = FieldValue.serverTimestamp();
  await db.collection('tenants').doc(TENANT_ID).set({
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  await db.collection('tenants').doc(OUTRO_TENANT_ID).set({
    id: OUTRO_TENANT_ID, nome: 'Passo Certo', slug: OUTRO_TENANT_ID,
    status: 'ativo', ownerUid: 'uid-passo', tipo: 'promotor', criadoEm: now, atualizadoEm: now,
  });
  await seedEvento(EVENTO_A, ITEM_A);
  await seedEvento(EVENTO_B, ITEM_B);
  // Materializa os SKUs (`camiseta-a__M` sob A, `camiseta-b__M` sob B).
  await recomputarAprovisionamentoEvento(db, EVENTO_A);
  await recomputarAprovisionamentoEvento(db, EVENTO_B);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Regressão EXPLÍCITA de estado — a máquina LINEAR (RN-226) não anda de volta
// ─────────────────────────────────────────────────────────────────────────────

describe('regressão de estado (RN-226 — linear, sem volta)', () => {
  it('em_estoque → encomendado é REJEITADO (terminal, sem regressão)', async () => {
    await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'encomendado', qtd: 10,
    }, organizador);
    await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'em_estoque', qtd: 5,
    }, organizador);

    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'encomendado', qtd: 3,
      }, organizador)
    ).rejects.toThrow(/terminal|RN-226/);

    // Estado e saldo físico intactos após a tentativa de regressão.
    const snap = await aprovRef(EVENTO_A, SKU_A_M).get();
    expect(snap.get('estado')).toBe('em_estoque');
    expect(snap.get('estoqueFisico')).toBe(5);
  });

  it('encomendado → estimativa é REJEITADO (não há aresta de volta)', async () => {
    await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'encomendado', qtd: 8,
    }, organizador);

    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'estimativa', qtd: 0,
      }, organizador)
    ).rejects.toThrow(/RN-226/);
    expect((await aprovRef(EVENTO_A, SKU_A_M).get()).get('estado')).toBe('encomendado');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Payloads forjados de forma — validação de input antes de tocar a máquina
// ─────────────────────────────────────────────────────────────────────────────

describe('input forjado (validarTransicaoAprovisionamentoInput — invalid-argument)', () => {
  it('novoEstado fora do enum é rejeitado (@pure, sem Emulator)', () => {
    const erros = validarTransicaoAprovisionamentoInput({
      eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'roubado', qtd: 1,
    });
    expect(erros.some((e) => e.includes('novoEstado'))).toBe(true);
  });

  it('qtd não-inteiro, string e negativa são rejeitadas (@pure)', () => {
    for (const qtd of [1.5, '5', -1, Number.NaN, Number.POSITIVE_INFINITY, null]) {
      const erros = validarTransicaoAprovisionamentoInput({
        eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'encomendado', qtd,
      });
      expect(erros.some((e) => e.includes('qtd'))).toBe(true);
    }
  });

  it('sku fora do padrão itemId__tamanho é rejeitado (@pure)', () => {
    const erros = validarTransicaoAprovisionamentoInput({
      eventoId: EVENTO_A, sku: 'sem-separador', novoEstado: 'encomendado', qtd: 1,
    });
    expect(erros.some((e) => e.includes('sku'))).toBe(true);
  });

  it('a callable-core traduz input forjado em invalid-argument (não toca o doc)', async () => {
    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'roubado', qtd: 1,
      }, organizador)
    ).rejects.toThrow();
    // Estado inicial preservado — a rejeição é ANTES da transação de escrita.
    expect((await aprovRef(EVENTO_A, SKU_A_M).get()).get('estado')).toBe('estimativa');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. qtd ABSURDA — teto sanitário (S210-T4 review). A UI só valida inteiro ≥ 0;
//    1e9/1e21 passariam e seriam carimbadas no estoqueFisico sem o teto.
// ─────────────────────────────────────────────────────────────────────────────

describe('qtd absurda (teto sanitário S210-T4)', () => {
  it('1e9 e 1e21 (inteiros JS válidos ≥ 0) são REJEITADOS pelo teto (@pure)', () => {
    for (const qtd of [1e9, 1e21, MAX_QTD_TRANSICAO_APROVISIONAMENTO + 1]) {
      const erros = validarTransicaoAprovisionamentoInput({
        eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'encomendado', qtd,
      });
      expect(erros.some((e) => e.includes('teto') || e.includes('qtd'))).toBe(true);
    }
  });

  it('a transição com qtd absurda NÃO altera o SKU (rejeição antes da escrita)', async () => {
    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'encomendado', qtd: 1e9,
      }, organizador)
    ).rejects.toThrow(/teto|qtd/);
    const snap = await aprovRef(EVENTO_A, SKU_A_M).get();
    expect(snap.get('estado')).toBe('estimativa'); // intacto
    expect(snap.get('estoqueFisico')).toBe(0); // NÃO carimbou 1e9
  });

  it('o teto exato ainda é aceito — guarda de sanidade, não regra de negócio', () => {
    const erros = validarTransicaoAprovisionamentoInput({
      eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'encomendado',
      qtd: MAX_QTD_TRANSICAO_APROVISIONAMENTO,
    });
    expect(erros).toEqual([]);
  });

  // DEC-0728D · item 15. O dono escolheu o teto: *"pode ser 999.999"*. O número
  // é decisão dele, então ele fica CRAVADO aqui — a constante sozinha não prova
  // escolha nenhuma (mudar as duas juntas passaria calado). O teto redondo
  // anterior (1.000.000) passa a ser rejeitado, que é a virada em uma linha.
  it('o teto é 999.999 por decisão do dono, e 1.000.000 passou a ser recusado', () => {
    expect(MAX_QTD_TRANSICAO_APROVISIONAMENTO).toBe(999_999);
    const noTeto = validarTransicaoAprovisionamentoInput({
      eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'encomendado', qtd: 999_999,
    });
    expect(noTeto).toEqual([]);
    const umAcima = validarTransicaoAprovisionamentoInput({
      eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'encomendado', qtd: 1_000_000,
    });
    expect(umAcima.some((e) => e.includes('teto'))).toBe(true);
  });

  it('a transição com o teto velho (1.000.000) NÃO escreve no SKU', async () => {
    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'encomendado', qtd: 1_000_000,
      }, organizador)
    ).rejects.toThrow(/teto|qtd/);
    const snap = await aprovRef(EVENTO_A, SKU_A_M).get();
    expect(snap.get('estado')).toBe('estimativa');
    expect(snap.get('estoqueFisico')).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Isolamento cross-evento (mesmo tenant) — não se alcança o SKU de outro
//    evento passando um eventoId cruzado. O path é `eventos/{id}/aprov/{sku}`.
// ─────────────────────────────────────────────────────────────────────────────

describe('isolamento cross-evento (mesmo tenant)', () => {
  it('SKU real do evento B não é alcançável via eventoId do evento A → not-found', async () => {
    // Sanidade: o SKU EXISTE no evento B (materializado no seed).
    expect((await aprovRef(EVENTO_B, SKU_B_M).get()).exists).toBe(true);

    // Ataque: passar o SKU REAL de B ("camiseta-b__M") com o eventoId de A. O
    // path é `eventos/A/aprovisionamento/camiseta-b__M` — inexistente sob A →
    // not-found. Sem vazamento cruzado mesmo dentro do próprio tenant.
    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_A, sku: SKU_B_M, novoEstado: 'encomendado', qtd: 1,
      }, organizador)
    ).rejects.toThrow(/sem aprovisionamento|not-found/i);

    // E o SKU de B segue intocado (estado inicial) — o ataque não o tocou.
    expect((await aprovRef(EVENTO_B, SKU_B_M).get()).get('estado')).toBe('estimativa');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Papel promoter (lê o tenant, mas NÃO escreve domínio) — RN-401
// ─────────────────────────────────────────────────────────────────────────────

describe('papel de escrita (RN-401)', () => {
  it('promoter do próprio tenant é negado (só owner/staff transicionam)', async () => {
    const promoter: EventoCaller = {
      uid: 'uid-promoter',
      claims: { role: 'promoter', tenantId: TENANT_ID } as AuthClaims,
    };
    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'encomendado', qtd: 1,
      }, promoter)
    ).rejects.toThrow(/RN-401/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. historico[] APPEND-ONLY — a Function só cresce a trilha; nunca reescreve
// ─────────────────────────────────────────────────────────────────────────────

describe('historico[] append-only (RN-226)', () => {
  it('cada transição APENDA; entradas anteriores permanecem imutáveis', async () => {
    await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'encomendado', qtd: 10,
    }, organizador);
    const h1 = (await aprovRef(EVENTO_A, SKU_A_M).get()).get('historico') as {
      estado: string; qtd: number; em: unknown;
    }[];
    expect(h1).toHaveLength(1);
    expect(h1[0]).toMatchObject({ estado: 'encomendado', qtd: 10 });
    const primeiraEntrada = JSON.stringify({ estado: h1[0]!.estado, qtd: h1[0]!.qtd });

    await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_A, sku: SKU_A_M, novoEstado: 'em_estoque', qtd: 4,
    }, organizador);
    const h2 = (await aprovRef(EVENTO_A, SKU_A_M).get()).get('historico') as {
      estado: string; qtd: number; em: unknown;
    }[];

    // Só CRESCEU (append) — a entrada anterior é idêntica, não reescrita.
    expect(h2).toHaveLength(2);
    expect(JSON.stringify({ estado: h2[0]!.estado, qtd: h2[0]!.qtd })).toBe(primeiraEntrada);
    expect(h2[1]).toMatchObject({ estado: 'em_estoque', qtd: 4 });
    // A data de cada transição vem do relógio do servidor (Admin SDK), não do cliente.
    expect(h2[0]?.em).toBeTruthy();
    expect(h2[1]?.em).toBeTruthy();
  });
});
