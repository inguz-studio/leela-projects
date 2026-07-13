/**
 * eventoCamposCadastro.integration.test.ts — LEELA-EVENTO-CAMPOS
 *
 * Integração REAL no Emulator (Firestore, Admin SDK): persistência dos 3
 * campos novos do cadastro de evento (RN-153 + RN-347) e a leitura do modo
 * da taxa pelos consumidores E03/E09.
 *
 * Cobre:
 *   - criarEvento aceita e PERSISTE imagemUrl (http(s)) + regulamento +
 *     taxaModo; input legado (sem os campos) segue criando (aceite S201-T2
 *     intacto) e o evento nasce com taxaModo estampado
 *   - default do TENANT: commercialTerms.modoTaxaDefault ⇒ modo do evento
 *     novo; input explícito vence; tenant sem termo ⇒ 'incorporada'
 *   - ataques no servidor (nunca confia na UI): imagemUrl javascript:/data:/
 *     gigante, taxaModo fora do enum, regulamento acima do teto
 *   - agregarFinanceiro (fonte do saldo E09): receitaLiquida respeita o modo
 *     do evento — 'repassada' ⇒ líquido = bruto; 'incorporada'/legado ⇒
 *     bruto − taxa (comportamento vigente inalterado)
 *   - updateSaldoRepasse (janela D+N, RN-348): transação de evento
 *     'repassada' segura o FACE na janela (não o face − taxa)
 *
 * Pré-requisito: Firestore Emulator (8080) via emulators:exec.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import { REGULAMENTO_MAX } from '@leela/core';
import {
  criarEventoCore,
  validarCriarEventoInput,
  type CriarEventoInput,
  type EventoCaller,
} from '../eventos/criarEvento';
import { recomputarFinanceiroEvento } from '../eventos/agregarFinanceiro';
import { recomputarSaldoRepasse } from '../finance/updateSaldoRepasse';

const PROJECT_ID = 'demo-leela';

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';

let db: admin.firestore.Firestore;

const marina: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID },
};
const passoOwner: EventoCaller = {
  uid: 'uid-passo-owner',
  claims: { role: 'tenant_owner', tenantId: PASSO_ID },
};

function inputValido(overrides: Partial<CriarEventoInput> = {}): CriarEventoInput {
  return {
    nome: 'Corrida do Campeche 2027',
    data: '2027-04-25T07:00:00-03:00',
    local: 'Campeche, Florianópolis/SC',
    modalidades: ['5k', '10k'],
    percursos: [
      { nome: '5k', preco: 0 },
      { nome: '10k', preco: 0 },
    ],
    ...overrides,
  };
}

async function clearFirestore(): Promise<void> {
  const collections = await db.listCollections();
  for (const col of collections) {
    const docs = await col.listDocuments();
    for (const ref of docs) {
      await db.recursiveDelete(ref);
    }
  }
}

async function seedTenants(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
    status: 'ativo', ownerUid: passoOwner.uid, tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

/** Termo comercial mínimo do Castelo (10% p/ contas redondas nos asserts). */
async function seedTermoCastelo(
  extra: Record<string, unknown> = {}
): Promise<void> {
  await db.doc(`tenants/${CASTELO_ID}/commercialTerms/current`).set({
    platformFeePct: 10,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1,
    atualizadoPor: 'uid-platform-admin',
    atualizadoEm: FieldValue.serverTimestamp(),
    ...extra,
  });
}

async function expectHttpsError(
  promise: Promise<unknown>,
  code: string,
  contains?: string
): Promise<void> {
  try {
    await promise;
    expect.unreachable(`esperava HttpsError '${code}'`);
  } catch (err) {
    expect(err).toBeInstanceOf(https.HttpsError);
    const httpsErr = err as https.HttpsError;
    expect(httpsErr.code).toBe(code);
    if (contains) expect(httpsErr.message).toContain(contains);
  }
}

beforeAll(() => {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
});

beforeEach(async () => {
  await clearFirestore();
  await seedTenants();
});

// ── Persistência (RN-153/RN-347) ───────────────────────────────────────────

describe('criarEvento — persiste capa, regulamento e taxaModo', () => {
  it('input completo grava os 3 campos no doc', async () => {
    const { eventoId } = await criarEventoCore(
      db,
      inputValido({
        imagemUrl: 'https://cdn.leela.run/campeche.jpg',
        regulamento: 'Art. 1º — Prova com chuva ou sol.',
        taxaModo: 'repassada',
      }),
      marina
    );
    const doc = await db.collection('eventos').doc(eventoId).get();
    expect(doc.get('imagemUrl')).toBe('https://cdn.leela.run/campeche.jpg');
    expect(doc.get('regulamento')).toBe('Art. 1º — Prova com chuva ou sol.');
    expect(doc.get('taxaModo')).toBe('repassada');
  });

  it('input LEGADO (sem campos novos) segue criando — aceite S201-T2 intacto', async () => {
    const { eventoId } = await criarEventoCore(db, inputValido(), marina);
    const doc = await db.collection('eventos').doc(eventoId).get();
    expect(doc.exists).toBe(true);
    expect(doc.get('status')).toBe('rascunho');
    // Sem capa/regulamento no doc (presença decide <img> vs gradiente)
    expect(doc.get('imagemUrl')).toBeUndefined();
    expect(doc.get('regulamento')).toBeUndefined();
    // Modo SEMPRE estampado no nascimento (RN-347)
    expect(doc.get('taxaModo')).toBe('incorporada');
  });
});

describe('criarEvento — default do tenant (RN-347)', () => {
  it('commercialTerms.modoTaxaDefault=repassada ⇒ evento novo nasce repassada', async () => {
    await seedTermoCastelo({ modoTaxaDefault: 'repassada' });
    const { eventoId } = await criarEventoCore(db, inputValido(), marina);
    expect((await db.doc(`eventos/${eventoId}`).get()).get('taxaModo')).toBe('repassada');
  });

  it('input EXPLÍCITO vence o default do tenant', async () => {
    await seedTermoCastelo({ modoTaxaDefault: 'repassada' });
    const { eventoId } = await criarEventoCore(
      db,
      inputValido({ taxaModo: 'incorporada' }),
      marina
    );
    expect((await db.doc(`eventos/${eventoId}`).get()).get('taxaModo')).toBe('incorporada');
  });

  it('tenant SEM termo ⇒ incorporada (default global vigente)', async () => {
    const { eventoId } = await criarEventoCore(db, inputValido(), passoOwner);
    expect((await db.doc(`eventos/${eventoId}`).get()).get('taxaModo')).toBe('incorporada');
  });
});

// ── Ataques no servidor (fronteira de segurança) ───────────────────────────

describe('criarEvento — ataques nos campos novos (invalid-argument)', () => {
  it('imagemUrl javascript:/data:/gigante são rejeitadas', async () => {
    for (const url of [
      'javascript:alert(document.cookie)',
      'data:text/html;base64,PHNjcmlwdD4=',
      `https://a.com/${'x'.repeat(2048)}`,
      'not-a-url',
    ]) {
      await expectHttpsError(
        criarEventoCore(db, inputValido({ imagemUrl: url }), marina),
        'invalid-argument',
        'imagemUrl'
      );
    }
  });

  it('taxaModo fora do enum é rejeitado', async () => {
    await expectHttpsError(
      criarEventoCore(
        db,
        inputValido({ taxaModo: 'gratis' as unknown as 'incorporada' }),
        marina
      ),
      'invalid-argument',
      'taxaModo'
    );
  });

  it('regulamento acima do teto é rejeitado (anti doc-bomba)', async () => {
    await expectHttpsError(
      criarEventoCore(
        db,
        inputValido({ regulamento: 'x'.repeat(REGULAMENTO_MAX + 1) }),
        marina
      ),
      'invalid-argument',
      'regulamento'
    );
  });

  it('validarCriarEventoInput acusa os 3 campos (pura — espelho da UI)', () => {
    const erros = validarCriarEventoInput({
      ...inputValido(),
      imagemUrl: 'javascript:alert(1)',
      regulamento: 42,
      taxaModo: 'meio-a-meio',
    });
    expect(erros.join(' ')).toMatch(/imagemUrl/);
    expect(erros.join(' ')).toMatch(/regulamento/);
    expect(erros.join(' ')).toMatch(/taxaModo/);
  });
});

// ── Consumidores do modo (E03 agregado → E09 saldo) ────────────────────────

describe('agregarFinanceiro — receitaLiquida respeita o taxaModo (RN-347)', () => {
  async function criarComReceita(
    taxaModo: 'incorporada' | 'repassada' | undefined,
    receita: number
  ): Promise<string> {
    const { eventoId } = await criarEventoCore(
      db,
      inputValido(taxaModo !== undefined ? { taxaModo } : {}),
      marina
    );
    await db.doc(`eventos/${eventoId}`).update({ receitaConfirmada: receita });
    return eventoId;
  }

  it("'repassada' ⇒ líquido = bruto (taxa nunca foi dinheiro do produtor)", async () => {
    await seedTermoCastelo();
    const eventoId = await criarComReceita('repassada', 1000);
    const fin = await recomputarFinanceiroEvento(db, eventoId);
    expect(fin?.receitaBruta).toBe(1000);
    expect(fin?.taxaPct).toBe(10);
    expect(fin?.taxaValor).toBe(100); // informativo nos dois modos
    expect(fin?.receitaLiquida).toBe(1000);
  });

  it("'incorporada' ⇒ líquido = bruto − taxa (comportamento vigente)", async () => {
    await seedTermoCastelo();
    const eventoId = await criarComReceita('incorporada', 1000);
    const fin = await recomputarFinanceiroEvento(db, eventoId);
    expect(fin?.receitaLiquida).toBe(900);
  });

  it('evento LEGADO sem taxaModo ⇒ incorporada (regressão do agregado)', async () => {
    await seedTermoCastelo();
    const eventoId = await criarComReceita(undefined, 1000);
    // Simula doc legado: remove o campo estampado pelo criarEvento
    await db.doc(`eventos/${eventoId}`).update({ taxaModo: FieldValue.delete() });
    const fin = await recomputarFinanceiroEvento(db, eventoId);
    expect(fin?.receitaLiquida).toBe(900);
  });
});

describe('updateSaldoRepasse — janela D+N lê o modo do evento (RN-347/348)', () => {
  it("pagamento de evento 'repassada' segura o FACE na janela (não face − taxa)", async () => {
    await seedTermoCastelo();
    const { eventoId } = await criarEventoCore(
      db,
      inputValido({ taxaModo: 'repassada' }),
      marina
    );
    // Agregado financeiro do evento (fonte do saldo — E09 LÊ, nunca reconstrói)
    await db.doc(`eventos/${eventoId}/financeiro/current`).set({
      tenantId: CASTELO_ID,
      receitaBruta: 1000,
      taxaPct: 10,
      taxaValor: 100,
      receitaLiquida: 1000, // repassada: líquido = face
      inscritos: { total: 1 },
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    // Pagamento confirmado AGORA (dentro da janela D+2 úteis)
    await db.collection('pagamentos').doc('pag-repassada-1').set({
      tenantId: CASTELO_ID,
      eventoId,
      status: 'confirmado',
      valorFinal: 1000,
      pagoEm: Timestamp.now(),
    });

    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);
    // Se o modo fosse ignorado (bug), seria 900 (face − 10%)
    expect(saldo.dentroJanelaDN).toBe(1000);
  });

  it("pagamento de evento 'incorporada' segue segurando face − taxa (regressão)", async () => {
    await seedTermoCastelo();
    const { eventoId } = await criarEventoCore(
      db,
      inputValido({ taxaModo: 'incorporada' }),
      marina
    );
    await db.doc(`eventos/${eventoId}/financeiro/current`).set({
      tenantId: CASTELO_ID,
      receitaBruta: 1000,
      taxaPct: 10,
      taxaValor: 100,
      receitaLiquida: 900,
      inscritos: { total: 1 },
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    await db.collection('pagamentos').doc('pag-incorporada-1').set({
      tenantId: CASTELO_ID,
      eventoId,
      status: 'confirmado',
      valorFinal: 1000,
      pagoEm: Timestamp.now(),
    });

    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);
    expect(saldo.dentroJanelaDN).toBe(900);
  });
});
