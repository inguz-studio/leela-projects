/**
 * editarModalidadesEvento.integration.test.ts — LEELA-S316
 * (RN-578, RN-501, RN-502, RN-505, RN-579 — a RN-500 foi REVOGADA em 28/08)
 * (⚠️ EXIGE Firestore Emulator 8080 — projectId demo-leela.)
 *
 * O que SÓ o emulator prova, e por isso esta suíte existe ao lado do
 * `modalidadesCore.test.ts` (que roda com dublês e cobre guardas e recusas):
 *
 *   A1. Renomear migra os alvos e eles ficam legíveis num único commit.
 *   A2. ⛔ Falha injetada no meio da transação NÃO deixa NADA escrito.
 *   A3. O lote renomeado continua sendo encontrado pela query da modalidade
 *       nova, com o docId ANTIGO (que embute o nome velho) intacto.
 *   A4. O cliente escrevendo `modalidades` direto num evento COM venda é
 *       negado pela Rule `percursosEditaveis`; e o ESTADO
 *       (`modalidadesInativas`/`modalidadesOcultas`) é negado ao cliente
 *       SEMPRE (RN-578 — escrita exclusiva de Function).
 *   A5. Acrescentar é idempotente por `arrayUnion` e não duplica `percursos`.
 *
 *   B — AS PROVAS DA RN-578 (a parte de DINHEIRO da lane):
 *   B1. Acrescentar PASSA em evento COM venda (a RN-500 caiu).
 *   B2. Inativar uma modalidade VENDIDA não toca NENHUM byte do inscrito nem
 *       do lote (o vendido sobrevive), e a cotação de compra NOVA da
 *       modalidade inativa é RECUSADA pela MESMA porta que o checkout usa
 *       (`carregarInsumos` — fail-closed). Reativar volta a vender.
 *   B3. Renomear/remover modalidade vendida são recusados; a modalidade SEM
 *       venda do MESMO evento segue livre — a fronteira é da modalidade.
 *
 *   C — A PROVA DA RN-579 (Rules):
 *   C1. Lote com venda aceita update de cliente que toca SÓ `fimEm` (e nome);
 *       tocar `inicioEm` ou `preco` continua negado.
 *
 * ⚠️ NÃO EXECUTADA nesta máquina (emulador não sobe com o mock no ar — regra
 * da lane). Roda no CI, que provisiona Java 21 antes de `emulators:exec`.
 *
 * Comando: npx firebase-tools emulators:exec --only firestore --project demo-leela \
 *   "npx vitest run src/__tests__/editarModalidadesEvento.integration.test.ts"
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Timestamp as ClientTimestamp, doc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AuthClaims } from '@leela/core';
import {
  editarModalidadesEventoCore,
  TIPO_AUDITORIA_MODALIDADES,
} from '../eventos/editarModalidadesEvento';
import { cotarInscricaoCheckoutCore } from '../checkout/cotarInscricaoCheckout';
import { AUDITORIA_ACESSOS_COL } from '../shared/auditoriaAcessos';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'meia-floripa-2026';
const EVENTO_VENDIDO_ID = 'trail-vendido-2026';

const OWNER = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp => Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_PATH, 'utf8'), host: 'localhost', port: 8080 },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
}, 30_000);

beforeEach(async () => {
  await testEnv.clearFirestore();
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();

  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: CASTELO_ID, slug: CASTELO_ID, status: 'ativo',
    ownerUid: MARINA_UID, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  // Termos comerciais — a cotação (B2) passa pela mesma `carregarInsumos` do
  // checkout, que lê o termo do tenant.
  batch.set(adminDb.doc(`tenants/${CASTELO_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
    anticipation: { disponivel: false }, communityMonthlyEnabled: false, saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });

  // Evento SEM venda — o alvo das três operações.
  const eventoRef = adminDb.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Meia Floripa', slug: EVENTO_ID, status: 'publicado',
    data: tsRel(45), local: 'Florianópolis',
    modalidades: ['5k', '21k'],
    percursos: [{ nome: '5k', preco: 0 }, { nome: '21k', preco: 90 }],
    usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });
  // Dois lotes da 21k (docId embute o nome — é o resíduo cosmético da S316-T6)
  for (const [id, ordem, nome] of [['21k-lote-1', 1, 'Lote 1'], ['21k-lote-2', 2, 'Lote 2']] as const) {
    batch.set(eventoRef.collection('lotes').doc(id), {
      id, tenantId: CASTELO_ID, modalidade: '21k', ordem, nome,
      inicioEm: tsRel(-5 + ordem * 10), fimEm: tsRel(5 + ordem * 10),
      quantidadeLimite: 100, preco: 90 + ordem * 10, vendidos: 0,
      criadoEm: now, atualizadoEm: now,
    });
  }
  // Um lote da 5k — não pode ser tocado pelo rename da 21k.
  batch.set(eventoRef.collection('lotes').doc('5k-lote-1'), {
    id: '5k-lote-1', tenantId: CASTELO_ID, modalidade: '5k', ordem: 1, nome: 'Lote 1',
    inicioEm: tsRel(-5), fimEm: tsRel(20), quantidadeLimite: 200, preco: 60, vendidos: 0,
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('kits').doc('kit-prata'), {
    id: 'kit-prata', tenantId: CASTELO_ID, nome: 'Kit Prata', preco: 0,
    modalidades: ['5k', '21k'], itens: [], criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('campanhas').doc('camp-1'), {
    id: 'camp-1', tenantId: CASTELO_ID, nome: 'Lembrete 21k', status: 'rascunho',
    segmento: { tipo: 'por_modalidade', referencia: '21k' },
    criadoEm: now, atualizadoEm: now,
  });

  // Evento COM venda — a fronteira POR MODALIDADE (RN-578): a 15k VENDEU
  // (inscrito confirmado + lote com vendidos > 0); a 7k nunca vendeu.
  const vendidoRef = adminDb.collection('eventos').doc(EVENTO_VENDIDO_ID);
  batch.set(vendidoRef, {
    id: EVENTO_VENDIDO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Trail vendido', slug: EVENTO_VENDIDO_ID, status: 'publicado',
    data: tsRel(30), local: 'Florianópolis',
    modalidades: ['15k', '7k'],
    percursos: [{ nome: '15k', preco: 120 }, { nome: '7k', preco: 60 }],
    usaChip: false, qtdInscritos: 1, receitaConfirmada: 120,
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(vendidoRef.collection('lotes').doc('15k-l1'), {
    id: '15k-l1', tenantId: CASTELO_ID, modalidade: '15k', ordem: 1, nome: 'Lote 1',
    inicioEm: tsRel(-2), fimEm: tsRel(20), quantidadeLimite: 100, preco: 120,
    vendidos: 1, criadoEm: now, atualizadoEm: now,
  });
  batch.set(vendidoRef.collection('inscritos').doc('inscrito-vivo'), {
    id: 'inscrito-vivo', tenantId: CASTELO_ID, eventoId: EVENTO_VENDIDO_ID,
    nome: 'Ana Souza', email: 'ana@exemplo.com', modalidade: '15k',
    status: 'confirmado', criadoEm: now, atualizadoEm: now,
  });

  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

const eventoDoc = async (id = EVENTO_ID) => adminDb.doc(`eventos/${id}`).get();
const loteDoc = async (loteId: string) => adminDb.doc(`eventos/${EVENTO_ID}/lotes/${loteId}`).get();

describe('S316-T2 · renomear é migração atômica de cinco referências (RN-501)', () => {
  it('A1: os CINCO alvos migram e ficam legíveis num único commit', async () => {
    const r = await editarModalidadesEventoCore(
      adminDb,
      {
        eventoId: EVENTO_ID, operacao: 'renomear',
        modalidade: '21k', novoNome: 'Meia maratona', motivo: 'nome comercial',
      },
      OWNER,
    );
    expect(r.migracao).toEqual({ lotes: 2, kits: 1, campanhas: 1 });

    const ev = await eventoDoc();
    expect(ev.get('modalidades')).toEqual(['5k', 'Meia maratona']);
    expect(ev.get('percursos')).toEqual([
      { nome: '5k', preco: 0 },
      { nome: 'Meia maratona', preco: 90 },
    ]);
    expect((await loteDoc('21k-lote-1')).get('modalidade')).toBe('Meia maratona');
    expect((await loteDoc('21k-lote-2')).get('modalidade')).toBe('Meia maratona');
    // O lote da OUTRA modalidade não é tocado.
    expect((await loteDoc('5k-lote-1')).get('modalidade')).toBe('5k');
    expect((await adminDb.doc(`eventos/${EVENTO_ID}/kits/kit-prata`).get()).get('modalidades'))
      .toEqual(['5k', 'Meia maratona']);
    expect(
      (await adminDb.doc(`eventos/${EVENTO_ID}/campanhas/camp-1`).get()).get('segmento'),
    ).toEqual({ tipo: 'por_modalidade', referencia: 'Meia maratona' });
  });

  it('A3: o lote migrado é achado pela query da modalidade NOVA, com o docId antigo', async () => {
    await editarModalidadesEventoCore(
      adminDb,
      { eventoId: EVENTO_ID, operacao: 'renomear', modalidade: '21k', novoNome: 'Meia maratona', motivo: 'nome comercial' },
      OWNER,
    );
    const achados = await adminDb
      .collection(`eventos/${EVENTO_ID}/lotes`)
      .where('modalidade', '==', 'Meia maratona')
      .get();
    expect(achados.docs.map((d) => d.id).sort()).toEqual(['21k-lote-1', '21k-lote-2']);
    // ⛔ O docId NÃO é recriado: `pedidos/{id}.itens[].loteId` o referencia.
    expect((await loteDoc('21k-lote-1')).exists).toBe(true);
  });

  it('⛔ A2: falha injetada no meio da transação não deixa NADA escrito', async () => {
    // A injeção é uma escrita ilegal no MESMO commit: o Firestore recusa a
    // transação inteira. Se as cinco referências não vivessem no mesmo commit,
    // a lista do evento teria mudado e os lotes teriam ficado inutilizados.
    const antesEv = (await eventoDoc()).get('modalidades');
    const antesLote = (await loteDoc('21k-lote-1')).get('modalidade');

    await expect(
      adminDb.runTransaction(async (tx) => {
        const eventoRef = adminDb.doc(`eventos/${EVENTO_ID}`);
        const snap = await tx.get(eventoRef);
        tx.update(eventoRef, { modalidades: ['5k', 'Meia maratona'] });
        for (const id of ['21k-lote-1', '21k-lote-2']) {
          tx.update(adminDb.doc(`eventos/${EVENTO_ID}/lotes/${id}`), { modalidade: 'Meia maratona' });
        }
        // Falha no meio: documento inexistente ⇒ a transação inteira aborta.
        tx.update(adminDb.doc(`eventos/${EVENTO_ID}/lotes/nao-existe`), { modalidade: 'x' });
        return snap.id;
      }),
    ).rejects.toThrow();

    expect((await eventoDoc()).get('modalidades')).toEqual(antesEv);
    expect((await loteDoc('21k-lote-1')).get('modalidade')).toBe(antesLote);
  });
});

describe('S316-T1 · a fronteira nova (RN-578) e as Rules que a acompanham', () => {
  it('evento SEM venda aceita as operações estruturais', async () => {
    await expect(
      editarModalidadesEventoCore(
        adminDb,
        { eventoId: EVENTO_ID, operacao: 'acrescentar', modalidade: '10k', motivo: 'faltou a de 10' },
        OWNER,
      ),
    ).resolves.toMatchObject({ alterado: true });
  });

  it('✅ B1: acrescentar PASSA em evento COM venda — a RN-500 foi revogada (V2708-25)', async () => {
    const r = await editarModalidadesEventoCore(
      adminDb,
      { eventoId: EVENTO_VENDIDO_ID, operacao: 'acrescentar', modalidade: '30k' },
      OWNER,
    );
    expect(r.alterado).toBe(true);
    expect((await eventoDoc(EVENTO_VENDIDO_ID)).get('modalidades')).toEqual(['15k', '7k', '30k']);
  });

  it('A4: o cliente escrevendo `modalidades` direto é negado pela Rule quando há venda', async () => {
    const ctx = testEnv.authenticatedContext(MARINA_UID, {
      role: 'tenant_owner',
      tenantId: CASTELO_ID,
    });
    const db = ctx.firestore();
    // Sem venda: a Rule `percursosEditaveis` autoriza (é por isso que a porta
    // ser Function é decisão de produto, não de permissão).
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', EVENTO_ID), { modalidades: ['5k', '21k', '10k'] }),
    );
    // Com venda: negada.
    await assertFails(
      updateDoc(doc(db, 'eventos', EVENTO_VENDIDO_ID), { modalidades: ['15k', '30k'] }),
    );
  });

  it('⛔ A4b (RN-578): o ESTADO da modalidade é negado ao cliente SEMPRE — até sem venda', async () => {
    const ctx = testEnv.authenticatedContext(MARINA_UID, {
      role: 'tenant_owner',
      tenantId: CASTELO_ID,
    });
    const db = ctx.firestore();
    // O evento SEM venda passa em `percursosEditaveis`; o que barra é a
    // `estadoModalidadesIntocado` — quem escreve estes arrays decide venda
    // (o checkout recusa modalidade não-ativa), então só a Function escreve.
    await assertFails(
      updateDoc(doc(db, 'eventos', EVENTO_ID), { modalidadesInativas: ['21k'] }),
    );
    await assertFails(
      updateDoc(doc(db, 'eventos', EVENTO_ID), { modalidadesOcultas: ['21k'] }),
    );
  });

  it('A5: acrescentar não duplica e grava a auditoria (RN-304)', async () => {
    await editarModalidadesEventoCore(
      adminDb,
      { eventoId: EVENTO_ID, operacao: 'acrescentar', modalidade: '10k', motivo: 'faltou a de 10' },
      OWNER,
    );
    await expect(
      editarModalidadesEventoCore(
        adminDb,
        { eventoId: EVENTO_ID, operacao: 'acrescentar', modalidade: '10k', motivo: 'de novo' },
        OWNER,
      ),
    ).rejects.toThrow(/já está na lista/);

    const ev = await eventoDoc();
    expect(ev.get('modalidades')).toEqual(['5k', '21k', '10k']);
    expect((ev.get('percursos') as { nome: string }[]).filter((p) => p.nome === '10k')).toHaveLength(1);

    const trilha = await adminDb
      .collection(AUDITORIA_ACESSOS_COL)
      .where('tipo', '==', TIPO_AUDITORIA_MODALIDADES)
      .get();
    expect(trilha.size).toBe(1);
    expect(trilha.docs[0]?.get('motivo')).toBe('faltou a de 10');
    expect(trilha.docs[0]?.get('uid')).toBe(MARINA_UID);
  });
});

describe('S316-T3 · remover recusa nomeando quem impede (RN-502)', () => {
  it('recusa com os nomes, e passa depois que lote, kit e campanha saem', async () => {
    await expect(
      editarModalidadesEventoCore(
        adminDb,
        { eventoId: EVENTO_ID, operacao: 'remover', modalidade: '21k', motivo: 'errei o nome' },
        OWNER,
      ),
    ).rejects.toThrow(/Lote 1/);

    await adminDb.doc(`eventos/${EVENTO_ID}/lotes/21k-lote-1`).delete();
    await adminDb.doc(`eventos/${EVENTO_ID}/lotes/21k-lote-2`).delete();
    await adminDb.doc(`eventos/${EVENTO_ID}/kits/kit-prata`).update({ modalidades: ['5k'] });
    await adminDb.doc(`eventos/${EVENTO_ID}/campanhas/camp-1`).delete();

    const r = await editarModalidadesEventoCore(
      adminDb,
      { eventoId: EVENTO_ID, operacao: 'remover', modalidade: '21k', motivo: 'errei o nome' },
      OWNER,
    );
    expect(r.modalidades).toEqual(['5k']);
    expect((await eventoDoc()).get('percursos')).toEqual([{ nome: '5k', preco: 0 }]);
  });
});

// ===========================================================================
// B · AS PROVAS DA RN-578 — o vendido sobrevive, a venda nova é recusada
// ===========================================================================

describe('RN-578 · inativar/ocultar não tocam o vendido, e a compra nova morre na porta', () => {
  const inscritoPath = `eventos/${EVENTO_VENDIDO_ID}/inscritos/inscrito-vivo`;
  const lotePath = `eventos/${EVENTO_VENDIDO_ID}/lotes/15k-l1`;

  it('⛔ B2: inativar modalidade VENDIDA não muda NENHUM byte do inscrito nem do lote', async () => {
    const inscritoAntes = await adminDb.doc(inscritoPath).get();
    const loteAntes = await adminDb.doc(lotePath).get();

    const r = await editarModalidadesEventoCore(
      adminDb,
      { eventoId: EVENTO_VENDIDO_ID, operacao: 'inativar', modalidade: '15k' },
      OWNER,
    );
    expect(r.alterado).toBe(true);
    expect(r.modalidadesInativas).toEqual(['15k']);

    // O VENDIDO SOBREVIVE: doc do inscrito e do lote byte a byte iguais —
    // dados E updateTime (nenhuma escrita passou por eles).
    const inscritoDepois = await adminDb.doc(inscritoPath).get();
    const loteDepois = await adminDb.doc(lotePath).get();
    expect(inscritoDepois.data()).toEqual(inscritoAntes.data());
    expect(inscritoDepois.updateTime?.isEqual(inscritoAntes.updateTime!)).toBe(true);
    expect(loteDepois.data()).toEqual(loteAntes.data());
    expect(loteDepois.updateTime?.isEqual(loteAntes.updateTime!)).toBe(true);
    // A lista e os contadores do evento também não se movem.
    const ev = await eventoDoc(EVENTO_VENDIDO_ID);
    expect(ev.get('modalidades')).toEqual(['15k', '7k']);
    expect(ev.get('qtdInscritos')).toBe(1);
    expect(ev.get('receitaConfirmada')).toBe(120);
  });

  it('⛔ B2: a compra NOVA da modalidade inativa é RECUSADA pela porta do checkout', async () => {
    // Antes de inativar, a cotação passa (o lote 15k está vigente).
    await expect(
      cotarInscricaoCheckoutCore(adminDb, {
        eventoId: EVENTO_VENDIDO_ID,
        itens: [{ modalidade: '15k' }],
        forma: 'pix',
        parcelas: 1,
      }),
    ).resolves.toMatchObject({ valorFinal: 120 });

    await editarModalidadesEventoCore(
      adminDb,
      { eventoId: EVENTO_VENDIDO_ID, operacao: 'inativar', modalidade: '15k' },
      OWNER,
    );

    // Depois: a MESMA porta que o createInscricaoCharge usa (`carregarInsumos`)
    // recusa — fail-closed, com a frase única que não vaza vocabulário.
    await expect(
      cotarInscricaoCheckoutCore(adminDb, {
        eventoId: EVENTO_VENDIDO_ID,
        itens: [{ modalidade: '15k' }],
        forma: 'pix',
        parcelas: 1,
      }),
    ).rejects.toThrow(/não está disponível para novas inscrições/);

    // OCULTAR recusa igual (uma frase para os dois estados).
    await editarModalidadesEventoCore(
      adminDb,
      { eventoId: EVENTO_VENDIDO_ID, operacao: 'ocultar', modalidade: '15k' },
      OWNER,
    );
    await expect(
      cotarInscricaoCheckoutCore(adminDb, {
        eventoId: EVENTO_VENDIDO_ID,
        itens: [{ modalidade: '15k' }],
        forma: 'pix',
        parcelas: 1,
      }),
    ).rejects.toThrow(/não está disponível para novas inscrições/);

    // REATIVAR reabre a venda sem migração nenhuma.
    await editarModalidadesEventoCore(
      adminDb,
      { eventoId: EVENTO_VENDIDO_ID, operacao: 'reativar', modalidade: '15k' },
      OWNER,
    );
    await expect(
      cotarInscricaoCheckoutCore(adminDb, {
        eventoId: EVENTO_VENDIDO_ID,
        itens: [{ modalidade: '15k' }],
        forma: 'pix',
        parcelas: 1,
      }),
    ).resolves.toMatchObject({ valorFinal: 120 });
  });

  it('⛔ B3: renomear e remover modalidade VENDIDA são recusados; a sem-venda segue livre', async () => {
    await expect(
      editarModalidadesEventoCore(
        adminDb,
        { eventoId: EVENTO_VENDIDO_ID, operacao: 'renomear', modalidade: '15k', novoNome: 'Trail 15' },
        OWNER,
      ),
    ).rejects.toThrow(/já tem inscrição registrada/);
    await expect(
      editarModalidadesEventoCore(
        adminDb,
        { eventoId: EVENTO_VENDIDO_ID, operacao: 'remover', modalidade: '15k' },
        OWNER,
      ),
    ).rejects.toThrow(/já tem inscrição registrada/);
    // O vendido continua lá, intacto.
    expect((await adminDb.doc(inscritoPath).get()).get('modalidade')).toBe('15k');

    // A 7k do MESMO evento nunca vendeu: renomeia e some normalmente — a
    // fronteira é da MODALIDADE, não do evento.
    await expect(
      editarModalidadesEventoCore(
        adminDb,
        { eventoId: EVENTO_VENDIDO_ID, operacao: 'renomear', modalidade: '7k', novoNome: 'Kids 7k' },
        OWNER,
      ),
    ).resolves.toMatchObject({ alterado: true });
    await expect(
      editarModalidadesEventoCore(
        adminDb,
        { eventoId: EVENTO_VENDIDO_ID, operacao: 'remover', modalidade: 'Kids 7k' },
        OWNER,
      ),
    ).resolves.toMatchObject({ alterado: true });
    expect((await eventoDoc(EVENTO_VENDIDO_ID)).get('modalidades')).toEqual(['15k']);
  });
});

// ===========================================================================
// C · A PROVA DA RN-579 — a data final do lote vendido é editável (Rules)
// ===========================================================================

describe('RN-579 · lote vendido: fimEm editável pelo cliente; início/preço seguem congelados', () => {
  it('C1: update que toca SÓ fimEm passa; inicioEm e preco são negados', async () => {
    const ctx = testEnv.authenticatedContext(MARINA_UID, {
      role: 'tenant_owner',
      tenantId: CASTELO_ID,
    });
    const db = ctx.firestore();
    const loteRef = doc(db, 'eventos', EVENTO_VENDIDO_ID, 'lotes', '15k-l1');
    const fimNovo = ClientTimestamp.fromDate(new Date(Date.now() + 40 * DIA_MS));

    // A data final move — "o planejamento do organizador pode mudar com o
    // tempo" (verbatim, V2708-27).
    await assertSucceeds(updateDoc(loteRef, { fimEm: fimNovo }));

    // Início congelado: a venda aconteceu sob ele.
    await assertFails(
      updateDoc(loteRef, {
        inicioEm: ClientTimestamp.fromDate(new Date(Date.now() - 10 * DIA_MS)),
      }),
    );
    // Preço congelado (RN-200) e vaga só pela porta auditada (RN-304).
    await assertFails(updateDoc(loteRef, { preco: 150 }));
    await assertFails(updateDoc(loteRef, { quantidadeLimite: 500 }));

    // fim ≤ início continua impossível: o shape valida o doc RESULTANTE.
    await assertFails(
      updateDoc(loteRef, {
        fimEm: ClientTimestamp.fromDate(new Date(Date.now() - 3 * DIA_MS)),
      }),
    );
  });
});
