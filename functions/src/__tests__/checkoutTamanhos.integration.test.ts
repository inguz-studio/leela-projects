/**
 * checkoutTamanhos.integration.test.ts — LEELA-BEPEND-T4 (S209-T2 · RN-223 ·
 * ratificação 3d "validação de tamanho na origem") — ⚠️ EXIGE Firestore
 * Emulator 8080.
 *
 * `createInscricaoChargeCore` com `tamanhos` no payload, contra docs REAIS:
 *   - caminho honesto: tamanho ∈ tamanhosDisponiveis do item do kit ⇒ pedido
 *     criado e `tamanhos` PERSISTIDO no inscrito (fulfillment);
 *   - ATAQUE (vetor FABLE-D): tamanho forjado fora do catálogo ⇒
 *     invalid-argument e NADA criado (nem pedido, nem inscrito, nem
 *     pagamento) — fail-closed na origem;
 *   - ATAQUE: item fantasma / item de outro kit / tamanhos sem kit ⇒ rejeita;
 *   - REGRESSÃO: checkout SEM tamanhos segue criando com `tamanhos: {}`
 *     (fluxo vigente da UI intacto — S209-T3 é quem passa a coletar).
 *
 * Comando (memória 8GB — SÓ Firestore via emulators:exec):
 *   npx firebase emulators:exec --only firestore --project demo-leela-s1203 \
 *     "npx vitest run src/__tests__/checkoutTamanhos.integration.test.ts"
 */
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { MockPaymentProvider } from '../payments/mockProvider';

const PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);
const HOST = 'localhost';
// MESMO projectId das suítes S1203 (Admin SDK é singleton por processo).
const PROJECT_ID = 'demo-leela-s1203';
const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'tam-evento-2026';
const FACE = 120;

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp => Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

async function seed(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: 'uid-marina', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
    anticipation: { disponivel: false }, communityMonthlyEnabled: false, saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });
  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-marina',
    nome: 'Evento Tamanhos', data: tsRel(45), local: 'Florianópolis/SC',
    modalidades: ['10k'], slug: EVENTO_ID, status: 'publicado', usaChip: false,
    qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc('l1'), {
    id: 'l1', tenantId: TENANT_ID, modalidade: '10k', ordem: 1,
    nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(30),
    quantidadeLimite: 100, preco: FACE, vendidos: 0, criadoEm: now, atualizadoEm: now,
  });
  // Kit real do evento (precifica o delta) — chave canônica Kit↔enum (E-T1)
  batch.set(eventoRef.collection('kits').doc('kit_prata'), {
    id: 'kit_prata', tenantId: TENANT_ID, nome: 'Kit Prata', preco: 30,
    capacidade: 100, modalidades: ['10k'], criadoEm: now, atualizadoEm: now,
  });
  // Catálogo de itens (top-level, RN-215): camiseta TAMANHADA do kit_prata +
  // sacochila NÃO tamanhada de OUTRO kit (kit_ouro) — alvos das forjas.
  batch.set(db.collection('itensKit').doc('camiseta-tecnica'), {
    id: 'camiseta-tecnica', tenantId: TENANT_ID, eventoId: EVENTO_ID,
    nome: 'Camiseta técnica', tamanhado: true, origem: 'organizador',
    exibirLogo: false, modeloEstoque: 'sob_encomenda',
    tamanhosDisponiveis: ['P', 'M', 'G', 'GG'], kits: ['kit_prata'],
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('itensKit').doc('sacochila'), {
    id: 'sacochila', tenantId: TENANT_ID, eventoId: EVENTO_ID,
    nome: 'Sacochila', tamanhado: false, origem: 'organizador',
    exibirLogo: false, modeloEstoque: 'sob_encomenda',
    tamanhosDisponiveis: [], kits: ['kit_ouro'],
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

let seq = 0;
function input(
  over: Partial<CreateInscricaoChargeInput['inscritos'][number]> = {}
): CreateInscricaoChargeInput {
  seq += 1;
  return {
    eventoId: EVENTO_ID,
    inscritos: [
      {
        nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25',
        modalidade: '10k', ...over,
      },
    ],
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: `tam-key-${String(seq).padStart(4, '0')}`,
  };
}

const caller = { uid: 'uid-ana-tam' };

async function contar(col: string): Promise<number> {
  const snap = await db.collection(col).where('eventoId', '==', EVENTO_ID).count().get();
  return snap.data().count;
}
async function contarInscritos(): Promise<number> {
  const snap = await db.collection(`eventos/${EVENTO_ID}/inscritos`).count().get();
  return snap.data().count;
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: HOST, port: PORT },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `${HOST}:${PORT}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  await seed();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('checkout × tamanhos — caminho honesto', () => {
  it('tamanho válido do kit ⇒ pedido criado e `tamanhos` persistido no inscrito', async () => {
    const resultado = await createInscricaoChargeCore(
      db,
      provider,
      input({ kitId: 'kit_prata', tamanhos: { 'camiseta-tecnica': 'M' } }),
      caller
    );
    expect(resultado.statusPedido).toBe('pendente');
    const inscritoId = resultado.inscritoIds[0]!;
    const inscrito = (
      await db.doc(`eventos/${EVENTO_ID}/inscritos/${inscritoId}`).get()
    ).data()!;
    expect(inscrito['tamanhos']).toEqual({ 'camiseta-tecnica': 'M' });
    expect(inscrito['kitId']).toBe('kit_prata');
  });

  it('REGRESSÃO: checkout SEM tamanhos segue criando com tamanhos {} (fluxo vigente)', async () => {
    const resultado = await createInscricaoChargeCore(
      db,
      provider,
      input({ kitId: 'kit_prata' }),
      caller
    );
    const inscrito = (
      await db.doc(`eventos/${EVENTO_ID}/inscritos/${resultado.inscritoIds[0]!}`).get()
    ).data()!;
    expect(inscrito['tamanhos']).toEqual({});
  });
});

describe('checkout × tamanhos — ATAQUES (fail-closed, nada criado)', () => {
  async function esperarRejeicao(
    over: Partial<CreateInscricaoChargeInput['inscritos'][number]>,
    padrao: RegExp
  ): Promise<void> {
    const pedidosAntes = await contar('pedidos');
    const inscritosAntes = await contarInscritos();
    await expect(
      createInscricaoChargeCore(db, provider, input(over), caller)
    ).rejects.toMatchObject({ code: 'invalid-argument', message: padrao });
    expect(await contar('pedidos')).toBe(pedidosAntes);
    expect(await contarInscritos()).toBe(inscritosAntes);
  }

  it('tamanho FORJADO fora de tamanhosDisponiveis ⇒ invalid-argument, zero docs', async () => {
    await esperarRejeicao(
      { kitId: 'kit_prata', tamanhos: { 'camiseta-tecnica': 'XGG-FORJADO' } },
      /fora dos disponíveis/
    );
  });

  it('item FANTASMA no map ⇒ rejeita', async () => {
    await esperarRejeicao(
      { kitId: 'kit_prata', tamanhos: { 'item-fantasma': 'M' } },
      /não existe no evento/
    );
  });

  it('item de OUTRO kit (sacochila do kit_ouro em compra do kit_prata) ⇒ rejeita', async () => {
    await esperarRejeicao(
      { kitId: 'kit_prata', tamanhos: { sacochila: 'M' } },
      /não pertence ao kit/
    );
  });

  it('tamanhos SEM kitId ⇒ rejeita (payload incoerente)', async () => {
    await esperarRejeicao(
      { tamanhos: { 'camiseta-tecnica': 'M' } },
      /sem kit escolhido/
    );
  });

  it('shape forjado (array / valor vazio) ⇒ rejeita na fronteira do input', async () => {
    await esperarRejeicao(
      { kitId: 'kit_prata', tamanhos: ['M'] as unknown as Record<string, string> },
      /map itemId → tamanho/
    );
    await esperarRejeicao(
      { kitId: 'kit_prata', tamanhos: { 'camiseta-tecnica': '' } },
      /string não vazia/
    );
  });
});

describe('checkout × grade por corte (RN-231 · TAMANHOS-GRADE)', () => {
  const REGATA = 'regata-corte';

  beforeAll(async () => {
    const now = FieldValue.serverTimestamp();
    await db.collection('itensKit').doc(REGATA).set({
      id: REGATA, tenantId: TENANT_ID, eventoId: EVENTO_ID,
      nome: 'Regata por corte', tamanhado: true, origem: 'organizador',
      exibirLogo: false, modeloEstoque: 'sob_encomenda',
      tamanhosDisponiveis: ['P', 'M', 'G'], // união — superfície legada
      grade: [
        { corte: 'feminina', tamanhos: ['P', 'M'] },
        { corte: 'masculina', tamanhos: ['M', 'G'] },
      ],
      kits: ['kit_prata'], criadoEm: now, atualizadoEm: now,
    });
  });

  it('caminho honesto: corte__tamanho da grade ⇒ SUFIXO persistido no inscrito', async () => {
    const resultado = await createInscricaoChargeCore(
      db,
      provider,
      input({
        kitId: 'kit_prata',
        tamanhos: { [REGATA]: 'feminina__M', 'camiseta-tecnica': 'M' },
      }),
      caller
    );
    const inscrito = (
      await db.doc(`eventos/${EVENTO_ID}/inscritos/${resultado.inscritoIds[0]!}`).get()
    ).data()!;
    expect(inscrito['tamanhos']).toEqual({
      [REGATA]: 'feminina__M',
      'camiseta-tecnica': 'M',
    });
  });

  it('ATAQUE: tamanho de OUTRO corte (P só existe na feminina) ⇒ rejeita, zero docs', async () => {
    const antes = await contarInscritos();
    await expect(
      createInscricaoChargeCore(
        db, provider,
        input({ kitId: 'kit_prata', tamanhos: { [REGATA]: 'masculina__P' } }),
        caller
      )
    ).rejects.toMatchObject({
      code: 'invalid-argument',
      message: /fora dos disponíveis do corte masculina/,
    });
    expect(await contarInscritos()).toBe(antes);
  });

  it('ATAQUE: sufixo bare em item com grade SÓ por corte ⇒ rejeita (unissex fora da grade)', async () => {
    await expect(
      createInscricaoChargeCore(
        db, provider,
        input({ kitId: 'kit_prata', tamanhos: { [REGATA]: 'M' } }),
        caller
      )
    ).rejects.toMatchObject({
      code: 'invalid-argument',
      message: /corte 'unissex' fora da grade/,
    });
  });

  it('ATAQUE: corte forjado/unissex explícito ⇒ rejeita na forma do sufixo', async () => {
    for (const valor of ['juvenil__M', 'unissex__M', 'feminina__M__G']) {
      await expect(
        createInscricaoChargeCore(
          db, provider,
          input({ kitId: 'kit_prata', tamanhos: { [REGATA]: valor } }),
          caller
        )
      ).rejects.toMatchObject({
        code: 'invalid-argument',
        message: /fora do padrão/,
      });
    }
  });

  it('ATAQUE: corte explícito em item LEGADO sem grade ⇒ rejeita (grade efetiva = unissex)', async () => {
    await expect(
      createInscricaoChargeCore(
        db, provider,
        input({ kitId: 'kit_prata', tamanhos: { 'camiseta-tecnica': 'feminina__M' } }),
        caller
      )
    ).rejects.toMatchObject({
      code: 'invalid-argument',
      message: /corte 'feminina' fora da grade/,
    });
  });
});
