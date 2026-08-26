/**
 * journeyAceiteE18.e2e.test.ts — LEELA-R4-E2E · J1
 *
 * E2E de EMULATOR que percorre a JORNADA INTEIRA do E18 (aceite de assessoria
 * parceira → desconto → checkout → encerramento), costurando os `*Core` reais
 * numa única linha do tempo — o que as suítes por-Function (assessoriaParceira,
 * cupomClubParceiro, rateLimitAceite) NÃO fazem em conjunto.
 *
 * Roda os DOIS cenários de documento (CNPJ e CPF). Cada jornada:
 *   1. organizador cadastra assessoria SEM conta ⇒ convite pendente + token;
 *   2. CAMINHO TRISTE por cima da jornada: 30 tentativas de token errado
 *      contra o convite REAL ⇒ permission-denied OPACO; a 31ª ⇒
 *      resource-exhausted genérico (balde por ALVO, LEELA-R2 `964cae2`);
 *   3. aceite LEGÍTIMO com o token válido AINDA aceita apesar do balde
 *      saturado de falhas (a vítima nunca é bloqueada — o aceite não toca o
 *      contador): conta criada + ownership do clube + parceria 'ativa', tudo
 *      atômico;
 *   4. REPLAY do aceite já consumido é idempotente (replay:true, sem 2ª conta
 *      nem 2º clube) — ver NOTA sobre a palavra "negado" do brief no report;
 *   5. organizador define a condição de desconto (cupom escopado ADR-012);
 *   6. cupom do parceiro aplica no checkout com ATRIBUIÇÃO (clubeRef no
 *      pagamento, sem split);
 *   7. encerrar a parceria DESATIVA o desconto (checkout fail-closed).
 *
 * Comando (8GB — SÓ este arquivo, 1 emulator por vez):
 *   JAVA_HOME=$HOME/.jdks/jdk-21.0.11+10 npx firebase-tools@13 emulators:exec \
 *     --only firestore,auth --project demo-leela \
 *     "cd functions && npx vitest run src/__tests__/journeyAceiteE18.e2e.test.ts"
 *
 * Skip real (describe.skipIf) sem FIRESTORE_EMULATOR_HOST — padrão C1.
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AuthClaims } from '@leela/core';
import {
  clearFirestoreDrained,
  deleteAllUsersDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';
import { cadastrarAssessoriaCore } from '../assessorias/cadastrarAssessoria';
import {
  ACEITE_LIMITE_POR_ALVO,
  provisionAssessoriaComRateLimit,
} from '../assessorias/provisionAssessoria';
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
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'meia-parceiros-e2e';
const FACE = 200;
const AGORA = new Date('2026-07-18T12:00:00Z');
const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp =>
  Timestamp.fromDate(new Date(AGORA.getTime() + d * DIA_MS));

const marina = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
};

// Documentos VÁLIDOS (DV correto) — os 2 cenários do brief.
const CENARIOS = [
  { rotulo: 'CNPJ', documento: '11.222.333/0001-81', chave: '11222333000181' },
  { rotulo: 'CPF', documento: '111.444.777-35', chave: '11144477735' },
] as const;

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;
const provider = new MockPaymentProvider();

describe.skipIf(!hasEmulator)('J1 · Aceite E18 ponta a ponta (LEELA-R4-E2E)', () => {
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
    delete process.env['ASAAS_API_KEY']; // Mock provider ativo
    // Ramo convite pendente exige sandbox explícito (o token volta ao teste).
    process.env['LEELA_CONVITE_EXPOR_TOKEN'] = 'true';
  }, 30_000);

  // SUITE-STAB: clear+seed com triggers pausados + canários verificados.
  beforeEach(async () => {
    await withTriggersPaused(async () => {
      await clearFirestoreDrained(testEnv);
      await deleteAllUsersDrained(auth);
      await seedVerified(db, testEnv, () => seed(), [
        `tenants/${CASTELO_ID}`,
        `tenants/${CASTELO_ID}/commercialTerms/current`,
        `eventos/${EVENTO_ID}`,
        `eventos/${EVENTO_ID}/lotes/${EVENTO_ID}-10k-l1`,
      ]);
    });
  }, 30_000);

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  async function seed(): Promise<void> {
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(db.collection('tenants').doc(CASTELO_ID), {
      id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
      status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.doc(`tenants/${CASTELO_ID}/commercialTerms/current`), {
      platformFeePct: 10,
      installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
      anticipation: { disponivel: false }, communityMonthlyEnabled: false,
      saasMonthlyFee: 0, versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
    });
    const eventoRef = db.collection('eventos').doc(EVENTO_ID);
    batch.set(eventoRef, {
      id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: 'uid-org',
      nome: 'Meia dos Parceiros', data: tsRel(45), local: 'Floripa/SC',
      modalidades: ['10k'], slug: EVENTO_ID, status: 'publicado',
      usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(eventoRef.collection('lotes').doc(`${EVENTO_ID}-10k-l1`), {
      id: `${EVENTO_ID}-10k-l1`, tenantId: CASTELO_ID, modalidade: '10k',
      ordem: 1, nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(30),
      quantidadeLimite: 100, preco: FACE, vendidos: 0,
      criadoEm: now, atualizadoEm: now,
    });
    await batch.commit();
  }

  const parceriaPath = (chave: string) =>
    `tenants/${CASTELO_ID}/parceirosAssessoria/${chave}`;

  const inputAceite = (chave: string, token: string) => ({
    tenantId: CASTELO_ID,
    parceriaId: chave,
    token,
    senha: 'senha-forte-8!',
    nome: 'Rodrigo Silva',
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
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
    ...(cupomCodigo !== undefined ? { cupomCodigo } : {}),
  });

  const relogio = () => AGORA;
  const caller = { uid: 'uid-ana' };

  for (const cen of CENARIOS) {
    it(
      `jornada completa — cenário ${cen.rotulo}`,
      async () => {
        // ── 1. Organizador cadastra assessoria SEM conta → convite pendente ──
        const cad = await cadastrarAssessoriaCore(
          db, auth,
          { nome: 'Correr Bem', documento: cen.documento, responsavelEmail: 'rodrigo@correrbem.dev' },
          marina, AGORA
        );
        expect(cad).toMatchObject({
          parceriaId: cen.chave,
          status: 'convite_pendente',
          vinculoImediato: false,
        });
        const token = cad.tokenAceite as string;
        expect(token).toBeTruthy();
        const clubeId = cad.clubeId;
        // Ownership PROVISÓRIA do organizador até o aceite.
        expect((await db.doc(`clubes/${clubeId}`).get()).get('ownerId')).toBe(MARINA_UID);

        // ── 2. CAMINHO TRISTE: brute-force do token contra o convite REAL ────
        // 30 tokens errados: cada um permission-denied OPACO (consome o balde).
        for (let i = 0; i < ACEITE_LIMITE_POR_ALVO; i++) {
          await expect(
            provisionAssessoriaComRateLimit(
              db, auth, inputAceite(cen.chave, 'a'.repeat(64)), AGORA
            )
          ).rejects.toMatchObject({ code: 'permission-denied' });
        }
        // 31ª falha: balde no teto → resource-exhausted GENÉRICO (opaco).
        await expect(
          provisionAssessoriaComRateLimit(
            db, auth, inputAceite(cen.chave, 'b'.repeat(64)), AGORA
          )
        ).rejects.toMatchObject({ code: 'resource-exhausted' });
        // Brute-force não vazou existência nem mudou o estado do convite.
        expect((await db.doc(parceriaPath(cen.chave)).get()).get('status'))
          .toBe('convite_pendente');
        expect((await auth.listUsers(1000)).users.length).toBe(0);

        // ── 3. Aceite LEGÍTIMO ainda aceita apesar do balde saturado ─────────
        //    (o aceite válido nunca toca o contador — vítima não bloqueada)
        const ace = await provisionAssessoriaComRateLimit(
          db, auth, inputAceite(cen.chave, token), AGORA
        );
        expect(ace).toMatchObject({ ok: true, clubeId, replay: false });

        // Atomicidade: conta + ownership + parceria ativa, tudo junto.
        const user = await auth.getUserByEmail('rodrigo@correrbem.dev');
        const parceria = await db.doc(parceriaPath(cen.chave)).get();
        expect(parceria.get('status')).toBe('ativa');
        expect(parceria.get('responsavelUid')).toBe(user.uid);
        expect(parceria.get('aceitoEm')).toBeTruthy();
        const clube = await db.doc(`clubes/${clubeId}`).get();
        expect(clube.get('ownerId')).toBe(user.uid);
        expect(clube.get('ehAssessoriaParceira')).toBe(true);
        const convite = await db
          .doc(`clubes/${clubeId}/convites/rodrigo@correrbem.dev`).get();
        expect(convite.get('status')).toBe('aceito');

        // ── 4. REPLAY do aceite consumido é idempotente (sem 2ª conta/clube) ─
        const replay = await provisionAssessoriaComRateLimit(
          db, auth, inputAceite(cen.chave, token), AGORA
        );
        expect(replay.replay).toBe(true);
        expect((await auth.listUsers(1000)).users.length).toBe(1);
        expect((await db.collection('clubes').get()).size).toBe(1);
        expect(
          (await db.collection(`tenants/${CASTELO_ID}/parceirosAssessoria`).get()).size
        ).toBe(1);

        // ── 5. Organizador define a condição de desconto (cupom ADR-012) ─────
        const cond = await definirCondicaoDescontoCore(
          db,
          {
            parceriaId: cen.chave,
            eventoId: EVENTO_ID,
            codigo: 'PARCEIRO15',
            tipo: 'percentual',
            valor: 15,
            tetoUso: null,
            inicioEmMillis: AGORA.getTime() - DIA_MS,
            fimEmMillis: AGORA.getTime() + 30 * DIA_MS,
          },
          marina, AGORA
        );
        expect(cond.codigo).toBe('PARCEIRO15');
        const cupom = await db.doc(`eventos/${EVENTO_ID}/cupons/PARCEIRO15`).get();
        expect(cupom.get('escopo')).toBe('club_parceiro');
        expect(cupom.get('clubeRef')).toBe(clubeId);
        expect(cupom.get('parceriaRef')).toBe(parceriaPath(cen.chave));
        expect(
          (await db.doc(parceriaPath(cen.chave)).get()).get('condicaoDesconto')
        ).toMatchObject({ codigo: 'PARCEIRO15', tipo: 'percentual', valor: 15 });

        // ── 6. Cupom do parceiro aplica no checkout COM ATRIBUIÇÃO ───────────
        const cot = await cotarInscricaoCheckoutCore(
          db,
          { eventoId: EVENTO_ID, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1, cupomCodigo: 'PARCEIRO15' },
          relogio
        );
        expect(cot.desconto).toBe(30);       // 15% de R$ 200
        expect(cot.valorFinal).toBe(170);

        const charge = await createInscricaoChargeCore(
          db, provider,
          chargeInput(`key-${cen.rotulo}-000001`, 'PARCEIRO15'),
          caller, relogio
        );
        expect(charge.valores.desconto).toBe(30);
        expect(charge.valores.valorFinal).toBe(170);
        const pag = await db.doc(`pagamentos/${charge.pagamentoId}`).get();
        expect(pag.get('cupom')).toMatchObject({
          codigo: 'PARCEIRO15', descontoPct: 15, clubeRef: clubeId,
        });
        // Sem split ao parceiro (RN-360): atribuição é rótulo, não repasse.
        expect(pag.get('splitParceiro')).toBeUndefined();

        // ── 7. Encerrar a parceria DESATIVA o desconto (fail-closed) ─────────
        await encerrarParceriaCore(db, { parceriaId: cen.chave }, marina);
        expect((await db.doc(parceriaPath(cen.chave)).get()).get('status'))
          .toBe('inativa');

        await expect(
          cotarInscricaoCheckoutCore(
            db,
            { eventoId: EVENTO_ID, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1, cupomCodigo: 'PARCEIRO15' },
            relogio
          )
        ).rejects.toMatchObject({ code: 'invalid-argument' });
        await expect(
          createInscricaoChargeCore(
            db, provider,
            chargeInput(`key-${cen.rotulo}-encerrado`, 'PARCEIRO15'),
            caller, relogio
          )
        ).rejects.toMatchObject({ code: 'invalid-argument' });
      },
      90_000 // brute-force de 31 transações + checkout: teto generoso
    );
  }
});
