/**
 * editarModalidadesEvento.integration.test.ts — LEELA-S316-T1/T2/T3
 * (RN-500, RN-501, RN-502, RN-505)
 * (⚠️ EXIGE Firestore Emulator 8080 — projectId demo-leela.)
 *
 * O que SÓ o emulator prova, e por isso esta suíte existe ao lado do
 * `modalidadesCore.test.ts` (que roda com dublês e cobre guardas e recusas):
 *
 *   A1. Renomear migra os CINCO alvos e eles ficam legíveis num único commit.
 *   A2. ⛔ Falha injetada no meio da transação NÃO deixa NADA escrito. É o
 *       teste que não pode faltar: uma migração parcial deixa todo lote da
 *       modalidade inutilizado pela própria Rule `modalidadeExisteNoEventoPai`,
 *       que é chamada no create E no update — nem a escrita que consertaria o
 *       lote passaria.
 *   A3. O lote renomeado continua sendo encontrado pela query da modalidade
 *       nova, com o docId ANTIGO (que embute o nome velho) intacto.
 *   A4. O cliente escrevendo `modalidades` direto num evento COM venda é
 *       negado pela Rule `percursosEditaveis` — a camada que a Function
 *       reimplementa por dever, não por redundância.
 *   A5. Acrescentar é idempotente por `arrayUnion` e não duplica `percursos`.
 *
 * ⚠️ NÃO EXECUTADA na máquina desta lane: `firebase-tools` 15 exige JDK 21+ e
 * a máquina tem JDK 17 (mesma limitação declarada pela SERV1-BUILD em 11/08).
 * Roda no CI, que provisiona Java 21 antes de `emulators:exec`.
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
import { doc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AuthClaims } from '@leela/core';
import {
  editarModalidadesEventoCore,
  TIPO_AUDITORIA_MODALIDADES,
} from '../eventos/editarModalidadesEvento';
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

  // Evento COM venda — a fronteira temporal (RN-500 · MODAL-1).
  batch.set(adminDb.collection('eventos').doc(EVENTO_VENDIDO_ID), {
    id: EVENTO_VENDIDO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Trail vendido', slug: EVENTO_VENDIDO_ID, status: 'publicado',
    data: tsRel(30), local: 'Florianópolis',
    modalidades: ['15k'], percursos: [{ nome: '15k', preco: 120 }],
    usaChip: false, qtdInscritos: 1, receitaConfirmada: 120,
    criadoEm: now, atualizadoEm: now,
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

describe('S316-T1 · a fronteira temporal e a Rule que a Function reimplementa', () => {
  it('evento SEM venda aceita as três operações', async () => {
    await expect(
      editarModalidadesEventoCore(
        adminDb,
        { eventoId: EVENTO_ID, operacao: 'acrescentar', modalidade: '10k', motivo: 'faltou a de 10' },
        OWNER,
      ),
    ).resolves.toMatchObject({ alterado: true });
  });

  it('⛔ evento COM venda é recusado NA FUNCTION (o Admin SDK não passa pela Rule)', async () => {
    await expect(
      editarModalidadesEventoCore(
        adminDb,
        { eventoId: EVENTO_VENDIDO_ID, operacao: 'acrescentar', modalidade: '30k', motivo: 'tentando' },
        OWNER,
      ),
    ).rejects.toThrow(/congelada/);
    expect((await eventoDoc(EVENTO_VENDIDO_ID)).get('modalidades')).toEqual(['15k']);
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
