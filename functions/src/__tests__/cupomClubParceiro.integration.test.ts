/**
 * cupomClubParceiro.integration.test.ts — LEELA-O3-L3B (E18 · S1802 backend)
 * (⚠️ EXIGE Firestore 8080 + Auth 9099 no Emulator — projectId demo-leela.)
 *
 * Condição de desconto do CLUB PARCEIRO via KERNEL DE CUPONS (RN-364/365 ·
 * ADR-012 — nenhum segundo caminho de desconto). Invariantes:
 *   D1. `definirCondicaoDesconto` cria o cupom `escopo='club_parceiro'` com
 *       a amarração completa (clubeRef + parceriaRef) E carimba
 *       `condicaoDesconto` na parceria — MESMA tx, nunca divergem.
 *   D2. Checkout (cotação E cobrança) resolve o cupom escopado pelo MESMO
 *       pipeline (computeSaleState): desconto entra no BRUTO e o doc de
 *       pagamento carrega a atribuição `cupom.clubeRef` (sem split — RN-360).
 *   D3. Parceria ENCERRADA (S1803) mata o desconto: cotação e cobrança caem
 *       em failed-precondition (fail-closed).
 *   D4. Guardas do editor: parceria pendente não define condição; evento de
 *       outro tenant é permission-denied; colisão com cupom geral do mesmo
 *       código é already-exists (não sequestra cupom).
 *   D5. Redefinição substitui: cupom anterior desativado (janela encurtada,
 *       nunca deletado — trilha), parceria aponta o novo.
 *   D6. Rules: canal de CLIENTE não grava/adultera/deleta cupom escopado
 *       (escopo/clubeRef/parceriaRef são de Function); cupom 'geral' segue
 *       criável (regressão do canal vigente).
 *
 * Comando (8GB — SÓ este arquivo):
 *   JAVA_HOME=$HOME/.jdks/jdk-21.0.11+10 npx firebase-tools@13 emulators:exec \
 *     --only firestore,auth --project demo-leela \
 *     "cd functions && npx vitest run src/__tests__/cupomClubParceiro.integration.test.ts"
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
import * as admin from 'firebase-admin';
import { doc as clientDoc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AuthClaims } from '@leela/core';
import { cadastrarAssessoriaCore } from '../assessorias/cadastrarAssessoria';
import { definirCondicaoDescontoCore } from '../assessorias/definirCondicaoDesconto';
import { encerrarParceriaCore } from '../assessorias/encerrarParceria';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { cotarInscricaoCheckoutCore } from '../checkout/cotarInscricaoCheckout';
import { MockPaymentProvider } from '../payments/mockProvider';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const CASTELO_ID = 'castelo-producoes';
const OUTRO_ID = 'outro-tenant';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'meia-parceiros';
const EVENTO_OUTRO = 'evento-do-outro';
const CNPJ_OK = '11.222.333/0001-81';
const CNPJ_KEY = '11222333000181';
const FACE = 200;
const AGORA = new Date('2026-07-17T12:00:00Z');

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp =>
  Timestamp.fromDate(new Date(AGORA.getTime() + d * DIA_MS));

const marina = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;
const provider = new MockPaymentProvider();

describe.skipIf(!hasEmulator)('cupom de club parceiro — S1802 (O3-L3B)', () => {
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
      process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= 'localhost:9099';
      admin.initializeApp({ projectId: PROJECT_ID });
    }
    db = admin.firestore();
    auth = admin.auth();
    delete process.env['ASAAS_API_KEY'];
    // Ramo convite (parceria pendente do D4) exige sandbox explícito (fix #1)
    process.env['LEELA_CONVITE_EXPOR_TOKEN'] = 'true';
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    const users = await auth.listUsers(1000);
    await Promise.all(users.users.map((u) => auth.deleteUser(u.uid)));
    await seed();
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  async function seed(): Promise<void> {
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    for (const [tid, owner] of [
      [CASTELO_ID, MARINA_UID],
      [OUTRO_ID, 'uid-outro'],
    ] as const) {
      batch.set(db.collection('tenants').doc(tid), {
        id: tid, nome: tid, slug: tid, status: 'ativo', ownerUid: owner,
        tipo: 'produtor', criadoEm: now, atualizadoEm: now,
      });
      batch.set(db.doc(`tenants/${tid}/commercialTerms/current`), {
        platformFeePct: 10,
        installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
        anticipation: { disponivel: false }, communityMonthlyEnabled: false,
        saasMonthlyFee: 0, versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
      });
    }
    for (const [eventoId, tid] of [
      [EVENTO_ID, CASTELO_ID],
      [EVENTO_OUTRO, OUTRO_ID],
    ] as const) {
      const eventoRef = db.collection('eventos').doc(eventoId);
      batch.set(eventoRef, {
        id: eventoId, tenantId: tid, organizadorId: 'uid-org',
        nome: `Evento ${eventoId}`, data: tsRel(45), local: 'Floripa/SC',
        modalidades: ['10k'], slug: eventoId, status: 'publicado',
        usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
        criadoEm: now, atualizadoEm: now,
      });
      batch.set(eventoRef.collection('lotes').doc(`${eventoId}-10k-l1`), {
        id: `${eventoId}-10k-l1`, tenantId: tid, modalidade: '10k', ordem: 1,
        nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(30),
        quantidadeLimite: 100, preco: FACE, vendidos: 0,
        criadoEm: now, atualizadoEm: now,
      });
    }
    await batch.commit();
  }

  /** Parceria ATIVA pronta (conta do responsável existe — RN-362). */
  async function parceriaAtiva(): Promise<string> {
    await auth.createUser({ email: 'rodrigo@correrbem.dev' });
    const r = await cadastrarAssessoriaCore(
      db, auth,
      { nome: 'Correr Bem', documento: CNPJ_OK, responsavelEmail: 'rodrigo@correrbem.dev' },
      marina, AGORA
    );
    return r.clubeId;
  }

  const condicaoInput = (overrides: Record<string, unknown> = {}) => ({
    parceriaId: CNPJ_KEY,
    eventoId: EVENTO_ID,
    codigo: 'PARCEIRO15',
    tipo: 'percentual' as const,
    valor: 15,
    tetoUso: null,
    inicioEmMillis: AGORA.getTime() - DIA_MS,
    fimEmMillis: AGORA.getTime() + 30 * DIA_MS,
    ...overrides,
  });

  const chargeInput = (
    key: string,
    cupomCodigo?: string
  ): CreateInscricaoChargeInput => ({
    eventoId: EVENTO_ID,
    inscritos: [{
      nome: 'Ana Souza', email: 'ana@exemplo.com',
      cpf: '529.982.247-25', modalidade: '10k',
    }],
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
    ...(cupomCodigo !== undefined ? { cupomCodigo } : {}),
  });

  const relogio = () => AGORA;
  const caller = { uid: 'uid-ana' };

  // ── D1 · definirCondicaoDesconto ────────────────────────────────────────

  it('D1: cria cupom escopado com amarração + carimba condicaoDesconto na MESMA tx', async () => {
    const clubeId = await parceriaAtiva();
    const r = await definirCondicaoDescontoCore(db, condicaoInput(), marina, AGORA);
    expect(r.codigo).toBe('PARCEIRO15');

    const cupom = await db.doc(`eventos/${EVENTO_ID}/cupons/PARCEIRO15`).get();
    expect(cupom.get('escopo')).toBe('club_parceiro');
    expect(cupom.get('clubeRef')).toBe(clubeId);
    expect(cupom.get('parceriaRef')).toBe(
      `tenants/${CASTELO_ID}/parceirosAssessoria/${CNPJ_KEY}`
    );
    expect(cupom.get('usos')).toBe(0);

    const parceria = await db
      .doc(`tenants/${CASTELO_ID}/parceirosAssessoria/${CNPJ_KEY}`).get();
    expect(parceria.get('condicaoDesconto')).toMatchObject({
      codigo: 'PARCEIRO15', eventoId: EVENTO_ID, tipo: 'percentual', valor: 15,
    });
  });

  // ── D2 · checkout resolve pelo kernel (cotação + cobrança) ──────────────

  it('D2: desconto entra no bruto e o pagamento carrega a atribuição clubeRef (sem split)', async () => {
    const clubeId = await parceriaAtiva();
    await definirCondicaoDescontoCore(db, condicaoInput(), marina, AGORA);

    // Cotação read-only (mesmo pipeline)
    const cot = await cotarInscricaoCheckoutCore(
      db,
      { eventoId: EVENTO_ID, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1, cupomCodigo: 'PARCEIRO15' },
      relogio
    );
    expect(cot.desconto).toBe(30); // 15% de R$ 200
    expect(cot.valorFinal).toBe(170);

    // Cobrança
    const r = await createInscricaoChargeCore(
      db, provider, chargeInput('key-d2-000001', 'PARCEIRO15'), caller, relogio
    );
    expect(r.valores.desconto).toBe(30);
    expect(r.valores.valorFinal).toBe(170);

    const pag = await db.doc(`pagamentos/${r.pagamentoId}`).get();
    expect(pag.get('cupom')).toMatchObject({
      codigo: 'PARCEIRO15', descontoPct: 15, clubeRef: clubeId,
    });
    // Sem split: nenhum campo de repasse ao parceiro nasce no pagamento
    expect(pag.get('splitParceiro')).toBeUndefined();
  });

  // ── D3 · revogação mata o desconto ──────────────────────────────────────

  it('D3: parceria ENCERRADA ⇒ cotação e cobrança fail-closed (S1803 × ADR-012)', async () => {
    await parceriaAtiva();
    await definirCondicaoDescontoCore(db, condicaoInput(), marina, AGORA);
    await encerrarParceriaCore(db, { parceriaId: CNPJ_KEY }, marina);

    // Mensagem OPACA (fix review #2): mesmo código de erro do cupom
    // inexistente — sondador anônimo não descobre que é de club parceiro.
    await expect(
      cotarInscricaoCheckoutCore(
        db,
        { eventoId: EVENTO_ID, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1, cupomCodigo: 'PARCEIRO15' },
        relogio
      )
    ).rejects.toMatchObject({
      code: 'invalid-argument',
      message: expect.stringContaining('indisponível'),
    });

    await expect(
      createInscricaoChargeCore(
        db, provider, chargeInput('key-d3-000001', 'PARCEIRO15'), caller, relogio
      )
    ).rejects.toMatchObject({ code: 'invalid-argument' });

    // NADA foi escrito (fail-closed antes de qualquer doc)
    const pedidos = await db.collection('pedidos').get();
    expect(pedidos.size).toBe(0);
  });

  // ── D4 · guardas do editor ──────────────────────────────────────────────

  it('D4: pendente não define condição; evento de outro tenant negado; colisão com cupom geral', async () => {
    // Parceria PENDENTE (sem conta do responsável)
    await cadastrarAssessoriaCore(
      db, auth,
      { nome: 'Correr Bem', documento: CNPJ_OK, responsavelEmail: 'rodrigo@correrbem.dev' },
      marina, AGORA
    );
    await expect(
      definirCondicaoDescontoCore(db, condicaoInput(), marina, AGORA)
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    // Ativa a parceria para os demais guards
    await testEnv.clearFirestore();
    await seed();
    await parceriaAtiva();

    await expect(
      definirCondicaoDescontoCore(
        db, condicaoInput({ eventoId: EVENTO_OUTRO }), marina, AGORA
      )
    ).rejects.toMatchObject({ code: 'permission-denied' });

    // Cupom GERAL pré-existente com o mesmo código — não sequestra
    await db.doc(`eventos/${EVENTO_ID}/cupons/PARCEIRO15`).set({
      id: 'PARCEIRO15', tenantId: CASTELO_ID, codigo: 'PARCEIRO15',
      tipo: 'fixo', valor: 5, tetoUso: null,
      inicioEm: tsRel(-1), fimEm: tsRel(10), usos: 0,
      criadoEm: Timestamp.fromDate(AGORA), atualizadoEm: Timestamp.fromDate(AGORA),
    });
    await expect(
      definirCondicaoDescontoCore(db, condicaoInput(), marina, AGORA)
    ).rejects.toMatchObject({ code: 'already-exists' });
  });

  // ── D5 · redefinição substitui sem apagar trilha ────────────────────────

  it('D5: redefinir em outro código desativa o anterior (janela encurtada) e re-aponta a parceria', async () => {
    await parceriaAtiva();
    await definirCondicaoDescontoCore(db, condicaoInput(), marina, AGORA);
    await definirCondicaoDescontoCore(
      db, condicaoInput({ codigo: 'PARCEIRO20', valor: 20 }), marina, AGORA
    );

    const antigo = await db.doc(`eventos/${EVENTO_ID}/cupons/PARCEIRO15`).get();
    expect(antigo.exists).toBe(true); // trilha preservada, nunca deleta
    expect((antigo.get('fimEm') as Timestamp).toMillis()).toBeLessThanOrEqual(
      AGORA.getTime()
    );

    const parceria = await db
      .doc(`tenants/${CASTELO_ID}/parceirosAssessoria/${CNPJ_KEY}`).get();
    expect(parceria.get('condicaoDesconto.codigo')).toBe('PARCEIRO20');

    // O cupom antigo não resolve mais (fora da janela)
    await expect(
      cotarInscricaoCheckoutCore(
        db,
        { eventoId: EVENTO_ID, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1, cupomCodigo: 'PARCEIRO15' },
        relogio
      )
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  // ── D6 · Rules: canal de cliente não fabrica/adultera cupom escopado ────

  it('D6: cliente não cria cupom club_parceiro, não de-escopa, não deleta; geral segue criável', async () => {
    await parceriaAtiva();
    await definirCondicaoDescontoCore(db, condicaoInput(), marina, AGORA);

    const owner = testEnv
      .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
      .firestore();
    // Client SDK: Date vira timestamp (Timestamp do Admin SDK não serializa)
    const janela = {
      inicioEm: new Date(AGORA.getTime() - DIA_MS),
      fimEm: new Date(AGORA.getTime() + 10 * DIA_MS),
    };

    // Forjar cupom escopado pelo cliente — NEGADO (escopo é de Function)
    await assertFails(
      setDoc(clientDoc(owner, `eventos/${EVENTO_ID}/cupons/FORJADO10`), {
        id: 'FORJADO10', tenantId: CASTELO_ID, codigo: 'FORJADO10',
        tipo: 'percentual', valor: 10, tetoUso: null, ...janela,
        escopo: 'club_parceiro', clubeRef: 'correr-bem',
        parceriaRef: `tenants/${CASTELO_ID}/parceirosAssessoria/${CNPJ_KEY}`,
      })
    );
    // Só o campo clubeRef (sem escopo) também é negado
    await assertFails(
      setDoc(clientDoc(owner, `eventos/${EVENTO_ID}/cupons/FORJADO11`), {
        id: 'FORJADO11', tenantId: CASTELO_ID, codigo: 'FORJADO11',
        tipo: 'percentual', valor: 10, tetoUso: null, ...janela,
        clubeRef: 'correr-bem',
      })
    );
    // De-escopar o cupom do parceiro (update mexendo em escopo) — NEGADO
    await assertFails(
      updateDoc(clientDoc(owner, `eventos/${EVENTO_ID}/cupons/PARCEIRO15`), {
        escopo: 'geral',
      })
    );
    // Deletar cupom escopado — NEGADO (órfãnaria condicaoDesconto)
    await assertFails(
      deleteDoc(clientDoc(owner, `eventos/${EVENTO_ID}/cupons/PARCEIRO15`))
    );
    // REGRESSÃO: cupom geral segue criável pelo canal vigente
    await assertSucceeds(
      setDoc(clientDoc(owner, `eventos/${EVENTO_ID}/cupons/GERAL10`), {
        id: 'GERAL10', tenantId: CASTELO_ID, codigo: 'GERAL10',
        tipo: 'percentual', valor: 10, tetoUso: null, ...janela,
      })
    );
  });
});
