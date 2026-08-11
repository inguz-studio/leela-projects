/**
 * vendasRules.integration.test.ts — LEELA-S300-T1 (E04 · ADR-012)
 *
 * Integração (⚠️ EXIGE Firestore Emulator na 8080 — gate CONSOLIDADO do
 * maestro, NÃO roda no gate serial da task): Security Rules reais do kernel de
 * vendas (lotes/cupons/paginaVendas) sob `eventos/{id}`.
 *
 * Cobre:
 *   - LOTES: membro lê preço; cross-tenant não; `vendidos` só-Function
 *     (create 0, update intocado); congelamento comercial após venda do lote
 *     (RN-200/300 per-lote); writer edita lote sem venda; delete só sem venda;
 *     preco cent-exato/finito (re-review S300 #6); modalidade EXISTENTE no
 *     evento pai (re-review S300 #4-rules).
 *   - CUPONS: leitura SÓ writer (promoter/membro NÃO lê — lição do catch-all
 *     A-T2, agora estendida a cupons); docId == codigo; `usos` só-Function;
 *     valor cent-exato/finito; delete só com usos == 0 (re-review S300 #3).
 *   - PAGINA VENDAS: membro lê; `publicada`/`publicadaEm` só-Function;
 *     create SÓ no docId canônico `config` (re-review S300 #5).
 *   - FINANCEIRO (re-review A-T2 A1): repasse (`financeiro/current`) é leitura
 *     de GESTÃO — writer lê; promoter/athlete/cross-tenant NÃO; write nunca.
 *   - CATCH-ALL ALLOWLIST (re-review A-T2 A2): subcoleção FUTURA de eventos
 *     nasce ILEGÍVEL (deny-by-default); kits/lotes/paginaVendas seguem
 *     member-readable.
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { seedEventos, MEIA_FLORIPA_ID } from '../seed/eventos.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo';
const PROMOTER_UID = 'uid-promoter-castelo';
const ATHLETE_UID = 'uid-atleta-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';

const marina = { role: 'tenant_owner', tenantId: CASTELO_ID }; // writer
const promoter = { role: 'promoter', tenantId: CASTELO_ID }; // membro, não-writer
const athlete = { role: 'athlete', tenantId: CASTELO_ID }; // atleta COM claim de tenant
const passo = { role: 'tenant_owner', tenantId: PASSO_ID }; // cross-tenant
// Admin da plataforma: cross-tenant POR CONSTRUÇÃO e SEM tenantId no claim
// (roles.ts) — é exatamente a forma do token que o T4 passou a autorizar.
const ADMIN_UID = 'uid-platform-admin';
const platformAdmin = { role: 'platform_admin' };

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

const jan = () => Timestamp.fromDate(new Date('2027-02-01T00:00:00-03:00'));
const fev = () => Timestamp.fromDate(new Date('2027-04-01T00:00:00-03:00'));

/** Payload de lote válido para create de cliente (sem vendidos). */
function lotePayload(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'novo-lote',
    tenantId: CASTELO_ID,
    modalidade: '5k',
    ordem: 9,
    nome: 'Lote Teste',
    inicioEm: jan(),
    fimEm: fev(),
    quantidadeLimite: 100,
    preco: 99,
    criadoEm: jan(),
    atualizadoEm: jan(),
    ...over,
  };
}

function cupomPayload(codigo: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: codigo,
    tenantId: CASTELO_ID,
    codigo,
    tipo: 'percentual',
    valor: 15,
    tetoUso: 50,
    inicioEm: jan(),
    fimEm: fev(),
    criadoEm: jan(),
    atualizadoEm: jan(),
    ...over,
  };
}

function paginaPayload(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'config2',
    tenantId: CASTELO_ID,
    eventoId: MEIA_FLORIPA_ID,
    secoes: [{ id: 'checkout', canal: 'sistema', ativa: true, travada: true }],
    seo: { titulo: 'T', descricao: 'D', slugAmigavel: '{DOMINIO_LEELA}/x' },
    criadoEm: jan(),
    atualizadoEm: jan(),
    ...over,
  };
}

async function seedTenantsBase(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo', slug: PASSO_ID,
    status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor', criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

const lote = (db: Firestore, id: string) => doc(db, 'eventos', MEIA_FLORIPA_ID, 'lotes', id);
const cupom = (db: Firestore, id: string) => doc(db, 'eventos', MEIA_FLORIPA_ID, 'cupons', id);
const pagina = (db: Firestore, id: string) => doc(db, 'eventos', MEIA_FLORIPA_ID, 'paginaVendas', id);

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_PATH, 'utf8'), host: 'localhost', port: Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080) },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `localhost:${process.env['LEELA_FS_EMU_PORT'] ?? '8080'}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
  await testEnv.clearFirestore();
  await seedTenantsBase();
  await seedEventos(adminDb); // grava eventos + lotes/cupons/paginaVendas

  // Agregado financeiro (repasse) — escrito por Function/Admin SDK na vida
  // real (agregarFinanceiro); aqui semeado direto para exercitar as Rules
  // de LEITURA (re-review A-T2 A1).
  await adminDb.doc(`eventos/${MEIA_FLORIPA_ID}/financeiro/current`).set({
    receitaBruta: 85617, taxaPct: 10.5, taxaValor: 8989.79,
    receitaLiquida: 76627.21, atualizadoEm: FieldValue.serverTimestamp(),
  });

  // Subcoleção FUTURA (não modelada nas Rules) — prova o deny-by-default do
  // catch-all ALLOWLIST (re-review A-T2 A2): nasce ilegível para o cliente.
  await adminDb.doc(`eventos/${MEIA_FLORIPA_ID}/reembolsos/reemb-1`).set({
    tenantId: CASTELO_ID, valor: 100, atualizadoEm: FieldValue.serverTimestamp(),
  });

  // Trilha do cancelamento SEM estorno (T4 · RN-377/378) — escrita só de
  // Function na vida real; semeada aqui para atacar as Rules de LEITURA.
  await adminDb.doc(`eventos/${MEIA_FLORIPA_ID}/cancelamentos/insc-cancelado`).set({
    tenantId: CASTELO_ID, eventoId: MEIA_FLORIPA_ID, inscritoId: 'insc-cancelado',
    motivo: 'cortesia', statusAnterior: 'confirmado', dinheiroDevolvido: false,
    trilha: 'plataforma', por: ADMIN_UID, papel: 'platform_admin',
    criadoEm: FieldValue.serverTimestamp(),
  });
}, 30_000); // seed completo (tenants + eventos + kernel E04) leva ~9,4s — folga sobre o default de 10s

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('lotes — leitura e fronteira de venda (∑ só-Function)', () => {
  it('organizador (writer) e promoter (membro) leem o lote; cross-tenant não', async () => {
    await assertSucceeds(getDoc(lote(dbAs(MARINA_UID, marina), '5k-lote-1')));
    await assertSucceeds(getDoc(lote(dbAs(PROMOTER_UID, promoter), '5k-lote-1')));
    await assertFails(getDoc(lote(dbAs(PASSO_OWNER_UID, passo), '5k-lote-1')));
  });

  it('writer cria lote válido; create com vendidos > 0 é negado', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertSucceeds(setDoc(lote(db, 'novo-lote'), lotePayload()));
    await assertFails(setDoc(lote(db, 'lote-fraude'), lotePayload({ vendidos: 5 })));
  });

  it('promoter (não-writer) NÃO cria lote; tenantId divergente é negado', async () => {
    await assertFails(setDoc(lote(dbAs(PROMOTER_UID, promoter), 'x'), lotePayload()));
    await assertFails(setDoc(lote(dbAs(MARINA_UID, marina), 'y'), lotePayload({ tenantId: PASSO_ID })));
  });

  it('cliente NÃO escreve `vendidos` no update (só a Function de virada)', async () => {
    await assertFails(updateDoc(lote(dbAs(MARINA_UID, marina), '5k-lote-3'), { vendidos: 1 }));
  });

  it('lote VENDIDO congela preço/janela (RN-200/300 per-lote); lote sem venda edita', async () => {
    const db = dbAs(MARINA_UID, marina);
    // 5k-lote-1 tem vendidos = 150 (seed) → preço congelado
    await assertFails(updateDoc(lote(db, '5k-lote-1'), { preco: 1 }));
    // 5k-lote-3 tem vendidos = 0 → writer edita preço
    await assertSucceeds(updateDoc(lote(db, '5k-lote-3'), { preco: 95 }));
  });

  it('delete de lote com venda é negado; sem venda o writer deleta', async () => {
    const db = dbAs(MARINA_UID, marina);
    const { deleteDoc } = await import('firebase/firestore');
    await assertFails(deleteDoc(lote(db, '5k-lote-1'))); // vendidos > 0
    await assertSucceeds(deleteDoc(lote(db, '10k-lote-3'))); // vendidos 0
  });

  it('preco com sub-centavo ou Infinity é negado; 2 casas passa (re-review S300 #6)', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(lote(db, 'lote-subcent'), lotePayload({ preco: 99.999 })));
    await assertFails(setDoc(lote(db, 'lote-inf'), lotePayload({ preco: Infinity })));
    await assertSucceeds(setDoc(lote(db, 'lote-centavos'), lotePayload({ preco: 75.25, ordem: 8 })));
  });

  it('modalidade FANTASMA (fora de evento.modalidades) é negada no create e no update (ADR-012)', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(lote(db, 'lote-99k'), lotePayload({ modalidade: '99k' })));
    // bypass em 2 passos: criar válido e renomear p/ fantasma — também negado
    await assertFails(updateDoc(lote(db, '5k-lote-3'), { modalidade: '99k' }));
  });
});

// ---------------------------------------------------------------------------
// RN-559 — a venda PAGA tem face mínima de R$ 10,00 (SERV-2 · 2026-08-11)
// ---------------------------------------------------------------------------
//
// A FECHADURA. O core valida e a tela avisa, mas quem escreve no lote é o
// cliente direto contra as Rules — se a regra não estiver aqui, ela não existe:
// basta um `setDoc` fora do formulário para nascer uma venda de R$ 2,00.
//
// Os três números do aceite estão neste bloco: 9,99 recusa, 10,00 passa,
// 0,00 passa. E o quarto caso é o que separa "regra" de "armadilha": o lote
// LEGADO de face R$ 5,00 continua editável no que não é preço.

describe('lotes — face mínima da venda paga (RN-559)', () => {
  /** Lote legado (face abaixo do mínimo) semeado por Admin SDK, que bypassa Rules. */
  const LOTE_LEGADO = 'rn559-legado-5reais';

  beforeAll(async () => {
    await adminDb.doc(`eventos/${MEIA_FLORIPA_ID}/lotes/${LOTE_LEGADO}`).set({
      id: LOTE_LEGADO,
      tenantId: CASTELO_ID,
      modalidade: '5k',
      ordem: 41,
      nome: 'Lote legado barato',
      inicioEm: jan(),
      fimEm: fev(),
      quantidadeLimite: 100,
      preco: 5,
      vendidos: 0,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  });

  it('create de face R$ 9,99 é NEGADO — é a venda paga barata que a regra mata', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(lote(db, 'rn559-999'), lotePayload({ preco: 9.99, ordem: 31 })));
  });

  it('create de face R$ 10,00 PASSA — a fronteira é inclusiva', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertSucceeds(setDoc(lote(db, 'rn559-1000'), lotePayload({ preco: 10, ordem: 32 })));
  });

  it('create de face R$ 0,00 PASSA — gratuidade não é venda', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertSucceeds(setDoc(lote(db, 'rn559-zero'), lotePayload({ preco: 0, ordem: 33 })));
  });

  it('o centavo acima de zero já é venda paga, e já é negado', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(lote(db, 'rn559-1centavo'), lotePayload({ preco: 0.01, ordem: 34 })));
  });

  it('R$ 5,00 e R$ 3,00 são negados — falsifica o mínimo trocado pelo piso do Serviço', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(lote(db, 'rn559-5reais'), lotePayload({ preco: 5, ordem: 35 })));
    await assertFails(setDoc(lote(db, 'rn559-3reais'), lotePayload({ preco: 3, ordem: 36 })));
  });

  it('update que BAIXA o preço para dentro da faixa proibida é negado', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertSucceeds(setDoc(lote(db, 'rn559-baixar'), lotePayload({ preco: 80, ordem: 37 })));
    await assertFails(updateDoc(lote(db, 'rn559-baixar'), { preco: 9.99 }));
    await assertSucceeds(updateDoc(lote(db, 'rn559-baixar'), { preco: 10 }));
  });

  it('lote LEGADO de R$ 5,00 é editável no que NÃO é preço — a regra não retroage', async () => {
    // Sem esta passagem a RN-559 trancaria o documento: a RN-200 congela o
    // preço de um lote vendido, e exigir o mínimo em toda escrita deixaria o
    // doc sem nenhuma escrita possível. Duas regras se trancando é defeito.
    const db = dbAs(MARINA_UID, marina);
    await assertSucceeds(updateDoc(lote(db, LOTE_LEGADO), { nome: 'Lote legado renomeado' }));
  });

  it('mas TOCAR o preço do legado exige o mínimo — barra na próxima edição do preço', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(updateDoc(lote(db, LOTE_LEGADO), { preco: 6 }));
    await assertSucceeds(updateDoc(lote(db, LOTE_LEGADO), { preco: 12 }));
  });
});

describe('cupons — leitura SÓ writer (catch-all NÃO vaza — lição A-T2)', () => {
  it('organizador (writer) lê; promoter (membro) e cross-tenant NÃO leem', async () => {
    await assertSucceeds(getDoc(cupom(dbAs(MARINA_UID, marina), 'HEROI10')));
    await assertFails(getDoc(cupom(dbAs(PROMOTER_UID, promoter), 'HEROI10'))); // catch-all excluído
    await assertFails(getDoc(cupom(dbAs(PASSO_OWNER_UID, passo), 'HEROI10')));
  });

  it('writer cria cupom (docId == codigo); docId ≠ codigo e usos > 0 negados', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertSucceeds(setDoc(cupom(db, 'TESTE99'), cupomPayload('TESTE99')));
    await assertFails(setDoc(cupom(db, 'DIVERGE'), cupomPayload('OUTRO')));
    await assertFails(setDoc(cupom(db, 'USADO1'), cupomPayload('USADO1', { usos: 3 })));
  });

  it('percentual > 100 é negado; cliente NÃO escreve `usos` no update', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(cupom(db, 'BIG'), cupomPayload('BIG', { valor: 150 })));
    await assertFails(updateDoc(cupom(db, 'HEROI10'), { usos: 999 }));
  });

  it('código fora do padrão [A-Z0-9]{3,20} é negado (cupom morto — review A4)', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(cupom(db, 'heroi'), cupomPayload('heroi'))); // minúsculo
    await assertFails(setDoc(cupom(db, 'AÇÃO10'), cupomPayload('AÇÃO10'))); // acento
    await assertFails(setDoc(cupom(db, 'AB'), cupomPayload('AB'))); // curto demais
  });

  it('valor com sub-centavo ou Infinity é negado; 2 casas passa (re-review S300 #6)', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(cupom(db, 'SUBCENT1'), cupomPayload('SUBCENT1', { tipo: 'fixo', valor: 10.555 })));
    await assertFails(setDoc(cupom(db, 'INFINITO1'), cupomPayload('INFINITO1', { tipo: 'fixo', valor: Infinity })));
    await assertSucceeds(setDoc(cupom(db, 'QUEBRADO1'), cupomPayload('QUEBRADO1', { tipo: 'fixo', valor: 49.99 })));
  });

  it('delete de cupom USADO é negado (usos > 0 — re-review S300 #3); sem uso deleta', async () => {
    const db = dbAs(MARINA_UID, marina);
    const { deleteDoc } = await import('firebase/firestore');
    await assertFails(deleteDoc(cupom(db, 'HEROI10'))); // usos: 37 no seed
    await assertSucceeds(setDoc(cupom(db, 'DELETAVEL1'), cupomPayload('DELETAVEL1')));
    await assertSucceeds(deleteDoc(cupom(db, 'DELETAVEL1'))); // usos 0/ausente
  });
});

describe('paginaVendas — publicação só-Function', () => {
  it('membro lê a config; cross-tenant não', async () => {
    await assertSucceeds(getDoc(pagina(dbAs(PROMOTER_UID, promoter), 'config')));
    await assertFails(getDoc(pagina(dbAs(PASSO_OWNER_UID, passo), 'config')));
  });

  it('create SÓ no docId canônico `config` (re-review S300 #5); publicada=true negado', async () => {
    const db = dbAs(MARINA_UID, marina);
    // docId ≠ 'config' é negado MESMO com payload válido (página fantasma)
    await assertFails(setDoc(pagina(db, 'config2'), paginaPayload()));
    // no docId canônico: recriar do zero exercita o CREATE de cliente
    await adminDb.doc(`eventos/${MEIA_FLORIPA_ID}/paginaVendas/config`).delete();
    await assertFails(setDoc(pagina(db, 'config'), paginaPayload({ id: 'config', publicada: true })));
    await assertSucceeds(setDoc(pagina(db, 'config'), paginaPayload({ id: 'config' })));
  });

  it('cliente NÃO escreve `publicada`/`publicadaEm` no update', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(updateDoc(pagina(db, 'config'), { publicada: false }));
    await assertFails(updateDoc(pagina(db, 'config'), { publicadaEm: jan() }));
  });
});

describe('financeiro — repasse é leitura de GESTÃO (re-review A-T2 A1)', () => {
  const fin = (db: Firestore) => doc(db, 'eventos', MEIA_FLORIPA_ID, 'financeiro', 'current');

  it('organizador (writer) lê o agregado com receitaLiquida', async () => {
    await assertSucceeds(getDoc(fin(dbAs(MARINA_UID, marina))));
  });

  it('promoter e athlete-com-claim (membros não-writer) NÃO leem o repasse', async () => {
    await assertFails(getDoc(fin(dbAs(PROMOTER_UID, promoter))));
    await assertFails(getDoc(fin(dbAs(ATHLETE_UID, athlete))));
  });

  it('cross-tenant NÃO lê; writer NÃO escreve (∑ exclusivo de Function)', async () => {
    await assertFails(getDoc(fin(dbAs(PASSO_OWNER_UID, passo))));
    await assertFails(
      setDoc(fin(dbAs(MARINA_UID, marina)), { receitaBruta: 1, receitaLiquida: 999999 })
    );
  });
});

describe('catch-all de eventos é ALLOWLIST (re-review A-T2 A2)', () => {
  // NOTA (O3-L1): `reembolsos` DEIXOU de ser o exemplo de "subcoleção futura"
  // — o S904 lhe deu match próprio (leitura de gestão pelo owner, spec E09).
  // O invariante do catch-all segue provado com uma subcoleção SEM match.
  it('subcoleção FUTURA (ledgerFuturo) nasce ILEGÍVEL — até para writer', async () => {
    const futuro = (db: Firestore) =>
      doc(db, 'eventos', MEIA_FLORIPA_ID, 'ledgerFuturo', 'doc-1');
    await assertFails(getDoc(futuro(dbAs(PROMOTER_UID, promoter))));
    await assertFails(getDoc(futuro(dbAs(MARINA_UID, marina))));
  });

  it('reembolsos (match próprio S904): promoter NÃO lê; writer lê (gestão)', async () => {
    const reemb = (db: Firestore) =>
      doc(db, 'eventos', MEIA_FLORIPA_ID, 'reembolsos', 'reemb-1');
    await assertFails(getDoc(reemb(dbAs(PROMOTER_UID, promoter))));
    await assertSucceeds(getDoc(reemb(dbAs(MARINA_UID, marina))));
  });

  it('cancelamentos (T4): gestão e admin leem; promoter/atleta/cross-tenant não', async () => {
    const canc = (db: Firestore) =>
      doc(db, 'eventos', MEIA_FLORIPA_ID, 'cancelamentos', 'insc-cancelado');
    // Quem opera o evento vê de quem foi a decisão…
    await assertSucceeds(getDoc(canc(dbAs(MARINA_UID, marina))));
    await assertSucceeds(getDoc(canc(dbAs(ADMIN_UID, platformAdmin))));
    // …e quem não opera não vê que fulano foi tirado do evento, nem por quê.
    await assertFails(getDoc(canc(dbAs(PROMOTER_UID, promoter))));
    await assertFails(getDoc(canc(dbAs(ATHLETE_UID, athlete))));
    await assertFails(getDoc(canc(dbAs(PASSO_OWNER_UID, passo))));
  });

  it('cancelamentos: NINGUÉM escreve pelo cliente — nem o admin da plataforma', async () => {
    // A trilha é a prova de quem mandou cancelar. Se o cliente pudesse
    // escrevê-la, forjaria o autor; se pudesse sobrescrevê-la, apagaria o
    // autor. Escrita é exclusiva da Function (Admin SDK bypassa Rules).
    const novo = (db: Firestore) =>
      doc(db, 'eventos', MEIA_FLORIPA_ID, 'cancelamentos', 'insc-forjado');
    const existente = (db: Firestore) =>
      doc(db, 'eventos', MEIA_FLORIPA_ID, 'cancelamentos', 'insc-cancelado');
    const payload = {
      tenantId: CASTELO_ID, eventoId: MEIA_FLORIPA_ID, inscritoId: 'insc-forjado',
      motivo: 'forjado', statusAnterior: 'confirmado', dinheiroDevolvido: false,
      trilha: 'organizador', por: MARINA_UID, papel: 'tenant_owner',
    };
    await assertFails(setDoc(novo(dbAs(MARINA_UID, marina)), payload));
    await assertFails(setDoc(novo(dbAs(ADMIN_UID, platformAdmin)), payload));
    await assertFails(
      setDoc(existente(dbAs(MARINA_UID, marina)), { motivo: 'reescrito' }, { merge: true })
    );
  });

  it('regressão da allowlist: membro segue lendo lotes e paginaVendas', async () => {
    // (kits member-read é coberto por kitsRules.test.ts na mesma suíte)
    const db = dbAs(PROMOTER_UID, promoter);
    await assertSucceeds(getDoc(lote(db, '5k-lote-1')));
    await assertSucceeds(getDoc(pagina(db, 'config')));
  });
});

// ---------------------------------------------------------------------------
// Ataques antagonistas de payload DIRETO no write path de lotes (review
// S300-T4 — a Rule precisa segurar SOZINHA, sem o modal). Seed: 5k-lote-1
// vendido (150/150, dez–fev, R$60), 5k-lote-3 sem venda (após teste anterior,
// preco 95). Sobreposição de janela entre irmãos NÃO é testável em Rule (não
// itera coleção) — invariante fica no kernel (validarLotesModalidade) +
// Function; risco residual registrado no report do review.
// ---------------------------------------------------------------------------
describe('lotes — ataques antagonistas de payload direto (review S300-T4)', () => {
  it('lote VENDIDO: janela, vaga e ordem TAMBÉM congelam (não só preço)', async () => {
    const db = dbAs(MARINA_UID, marina);
    // Valores shape-VÁLIDOS e diferentes do seed — o deny isola o congelamento.
    await assertFails(
      updateDoc(lote(db, '5k-lote-1'), {
        fimEm: Timestamp.fromDate(new Date('2026-03-15T00:00:00-03:00')),
      })
    );
    await assertFails(
      updateDoc(lote(db, '5k-lote-1'), {
        inicioEm: Timestamp.fromDate(new Date('2025-11-01T00:00:00-03:00')),
      })
    );
    await assertFails(updateDoc(lote(db, '5k-lote-1'), { quantidadeLimite: 5000 }));
    await assertFails(updateDoc(lote(db, '5k-lote-1'), { ordem: 7 }));
  });

  it('lote VENDIDO: payload SÓ-NOME (espelho exato do api-client pós-fix #1) passa', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertSucceeds(
      setDoc(
        lote(db, '5k-lote-1'),
        { nome: 'Lote Promocional (encerrado)', atualizadoEm: serverTimestamp() },
        { merge: true }
      )
    );
  });

  it('smuggling de `vendidos` junto do rename é negado', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(
      setDoc(lote(db, '5k-lote-3'), { nome: 'x', vendidos: 999999 }, { merge: true })
    );
  });

  it('preço NaN e negativo são negados no create (moneyCentExato sem math.isNaN)', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(lote(db, 'atk-nan'), lotePayload({ preco: Number.NaN })));
    await assertFails(setDoc(lote(db, 'atk-neg'), lotePayload({ preco: -1 })));
  });

  it('shape hostil: ordem 0, vaga 0 e janela invertida são negados', async () => {
    const db = dbAs(MARINA_UID, marina);
    await assertFails(setDoc(lote(db, 'atk-ordem0'), lotePayload({ ordem: 0 })));
    await assertFails(setDoc(lote(db, 'atk-vaga0'), lotePayload({ quantidadeLimite: 0 })));
    await assertFails(
      setDoc(lote(db, 'atk-janela'), lotePayload({ inicioEm: fev(), fimEm: jan() }))
    );
  });

  it('cross-tenant: writer de OUTRO tenant não edita; troca de tenantId é negada', async () => {
    // Passo Certo (tenant B) tentando editar lote do Castelo (tenant A).
    await assertFails(
      updateDoc(lote(dbAs(PASSO_OWNER_UID, passo), '5k-lote-3'), { nome: 'hack' })
    );
    // Sequestro de tenant: mover o lote para outro tenant via update.
    await assertFails(
      updateDoc(lote(dbAs(MARINA_UID, marina), '5k-lote-3'), { tenantId: PASSO_ID })
    );
  });
});

// ---------------------------------------------------------------------------
// FAN-OUT da fila admin de estornos (T4 · review ESTORNO-REV, vetor 1)
//
// A tela `/plataforma/estornos` não usa collectionGroup: ela COMPÕE três
// leituras (tenants → eventos do tenant → reembolsos do evento). O guard da
// tela é de UI (PlatformShell devolve 403); quem tem de barrar de verdade é a
// Rule, porque a mesma composição pode ser feita fora do painel com o token de
// um staff. As provas abaixo exercitam as TRÊS leituras como LISTA (query), e
// não por documento — é assim que a fila lê.
// ---------------------------------------------------------------------------

describe('fan-out da fila admin de estornos — Rules com papel real', () => {
  it('tenants: só o admin da plataforma lista a base inteira', async () => {
    await assertSucceeds(getDocs(collection(dbAs(ADMIN_UID, platformAdmin), 'tenants')));
    // Membro de um tenant não lista a base: a lista traria o tenant alheio.
    await assertFails(getDocs(collection(dbAs(MARINA_UID, marina), 'tenants')));
    await assertFails(getDocs(collection(dbAs(PROMOTER_UID, promoter), 'tenants')));
    await assertFails(getDocs(collection(dbAs(ATHLETE_UID, athlete), 'tenants')));
  });

  it('eventos por tenant: o admin lê o alheio; o organizador só o próprio', async () => {
    // Um evento REAL do outro tenant — sem doc, a query vazia passaria por
    // vacuidade e a prova não valeria nada.
    await adminDb.collection('eventos').doc('rev-evento-passo').set({
      id: 'rev-evento-passo',
      tenantId: PASSO_ID,
      nome: 'Corrida do Passo (review)',
      status: 'publicado',
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    const doPasso = (db: Firestore) =>
      getDocs(query(collection(db, 'eventos'), where('tenantId', '==', PASSO_ID)));

    await assertSucceeds(doPasso(dbAs(ADMIN_UID, platformAdmin)));
    await assertSucceeds(doPasso(dbAs(PASSO_OWNER_UID, passo)));
    // O organizador de OUTRO tenant não entra pela porta do fan-out (RN-400).
    await assertFails(doPasso(dbAs(MARINA_UID, marina)));
    await assertFails(doPasso(dbAs(PROMOTER_UID, promoter)));
  });

  it('reembolsos do evento: admin e gestão listam; promoter/atleta/cross-tenant não', async () => {
    const fila = (db: Firestore) =>
      getDocs(collection(db, 'eventos', MEIA_FLORIPA_ID, 'reembolsos'));
    await assertSucceeds(fila(dbAs(ADMIN_UID, platformAdmin)));
    await assertSucceeds(fila(dbAs(MARINA_UID, marina)));
    await assertFails(fila(dbAs(PROMOTER_UID, promoter)));
    await assertFails(fila(dbAs(ATHLETE_UID, athlete)));
    await assertFails(fila(dbAs(PASSO_OWNER_UID, passo)));
  });

  it('ledger de estorno: leitura de gestão (owner/admin), escrita de ninguém', async () => {
    // O ledger POR INSCRITO tem Rule própria e deliberada (rules:2413): é
    // trilha de auditoria de dinheiro do tenant. Quem opera o dinheiro lê;
    // promoter/atleta/cross-tenant não; escrever é só da Function.
    await adminDb.doc('pagamentos/rev-pag/estornos/rev-insc').set({
      tenantId: CASTELO_ID,
      status: 'solicitado',
      valorCentavos: 18990,
      refundId: 'rev_refund_1',
    });
    const ledger = (db: Firestore) => doc(db, 'pagamentos/rev-pag/estornos/rev-insc');
    await assertSucceeds(getDoc(ledger(dbAs(MARINA_UID, marina))));
    await assertSucceeds(getDoc(ledger(dbAs(ADMIN_UID, platformAdmin))));
    await assertFails(getDoc(ledger(dbAs(PROMOTER_UID, promoter))));
    await assertFails(getDoc(ledger(dbAs(ATHLETE_UID, athlete))));
    await assertFails(getDoc(ledger(dbAs(PASSO_OWNER_UID, passo))));
    // Forjar o carimbo é fabricar devolução de dinheiro — negado até ao admin.
    await assertFails(
      setDoc(ledger(dbAs(MARINA_UID, marina)), { status: 'pendente' }, { merge: true })
    );
    await assertFails(
      setDoc(ledger(dbAs(ADMIN_UID, platformAdmin)), { status: 'pendente' }, { merge: true })
    );
  });

  it('ledger ÓRFÃO e extrato de retardatários: nem o admin lê pelo cliente (T5)', async () => {
    // `estornosOrfaos` e `estornosOrfaosPendentes` nasceram SEM Rule — o
    // deny-by-default é a garantia declarada no cabeçalho do módulo T5.
    await adminDb.doc('pagamentos/rev-pag/estornosOrfaos/total').set({
      tenantId: CASTELO_ID,
      status: 'solicitado',
      valorCentavos: 18990,
    });
    await adminDb.doc('estornosOrfaosPendentes/rev-pag').set({
      tenantId: CASTELO_ID,
      resolvido: false,
      entregas: 1,
    });
    for (const [uid, claims] of [
      [ADMIN_UID, platformAdmin],
      [MARINA_UID, marina],
    ] as const) {
      await assertFails(getDoc(doc(dbAs(uid, claims), 'pagamentos/rev-pag/estornosOrfaos/total')));
      await assertFails(getDoc(doc(dbAs(uid, claims), 'estornosOrfaosPendentes/rev-pag')));
    }
  });
});
