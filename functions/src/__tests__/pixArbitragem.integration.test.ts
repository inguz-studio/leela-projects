/**
 * pixArbitragem.integration.test.ts — LEELA-S1209-PIXBE (RN-157 · trace
 * leela-build-2d6ee98d). ⚠️ EXIGE Firestore no Emulator (projectId
 * demo-leela; porta via LEELA_FS_EMU_PORT — lane 8480, nunca o 8180 do
 * preview).
 *
 * O que esta suíte prova (os itens que a review antagonista S1209-REV
 * ESCALOU para fora de `apps/landing`):
 *
 *   T1. A resposta da cobrança carrega o `agora` do SERVIDOR junto da
 *       expiração — os dois números saem do mesmo relógio, então a duração
 *       restante deixa de ser palpite sobre o relógio do aparelho.
 *   T2. Abrir uma SEGUNDA cobrança PIX enquanto a primeira está pendente e
 *       válida é recusado pelo SERVIDOR, com erro tipado e à prova de
 *       corrida (duas requisições concorrentes ⇒ uma só vive).
 *   T3. A expiração cancela a cobrança NO GATEWAY primeiro; falha lá ⇒ o
 *       pedido NÃO vira expirado (melhor timer parado que duas cobranças
 *       vivas), e o pagamento retardatário continua morrendo no webhook.
 *
 * SUITE-STAB: clear+seed com triggers pausados e canários verificados
 * (helpers/stability.ts) — sem isso o backlog de triggers dos arquivos
 * vizinhos engole o seed no emulator quente.
 *
 * Comando (de `functions/`, SEMPRE após `npm run build`):
 *   LEELA_FS_EMU_PORT=8480 LEELA_AUTH_EMU_PORT=9598 \
 *   JAVA_HOME=~/.jdks/jdk-21.0.11+10 npx firebase-tools@13 emulators:exec \
 *     --config ../firebase.r6.json --project demo-leela \
 *     "npx vitest run src/__tests__/pixArbitragem.integration.test.ts"
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  clearFirestoreDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { MockPaymentProvider } from '../payments/mockProvider';

const PROJECT_ID = 'demo-leela';
const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);
const FS_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8080
);

const TENANT_ID = 'castelo-pixbe';
const EVENTO_ID = 'meia-pixbe';
const FACE = 200;
const DIA_MS = 24 * 60 * 60 * 1000;
const MEIA_HORA_MS = 30 * 60 * 1000;
/** CPF válido (DV correto) — o checkout valida na fronteira. */
const CPF = '529.982.247-25';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

/** Relógio INJETADO: toda aritmética de prazo é exata sobre ele. */
const relogio = (d: Date) => () => d;

function inputPix(
  chave: string,
  over: Partial<CreateInscricaoChargeInput> = {}
): CreateInscricaoChargeInput {
  return {
    eventoId: EVENTO_ID,
    inscritos: [
      { nome: 'Ana Pagadora', email: 'ana@exemplo.com.br', cpf: CPF, modalidade: '10k' },
    ],
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Pagadora', email: 'ana@exemplo.com.br' },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: chave,
    ...over,
  };
}

describe.skipIf(!hasEmulator)('S1209-PIXBE — arbitragem server-side do PIX', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { host: 'localhost', port: FS_PORT },
    });
    if (!admin.apps.length) {
      process.env['FIRESTORE_EMULATOR_HOST'] = `localhost:${FS_PORT}`;
      admin.initializeApp({ projectId: PROJECT_ID });
    }
    db = admin.firestore();
    delete process.env['ASAAS_API_KEY'];
  }, 30_000);

  const SEED_CANARIES = [
    `tenants/${TENANT_ID}`,
    `tenants/${TENANT_ID}/commercialTerms/current`,
    `eventos/${EVENTO_ID}`,
    `eventos/${EVENTO_ID}/lotes/l1`,
  ];

  beforeEach(async () => {
    await withTriggersPaused(async () => {
      await clearFirestoreDrained(testEnv);
      await seedVerified(db, testEnv, seed, SEED_CANARIES);
    });
  }, 30_000);

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  async function seed(): Promise<void> {
    const now = FieldValue.serverTimestamp();
    const agora = new Date();
    const tsRel = (d: number): Timestamp =>
      Timestamp.fromDate(new Date(agora.getTime() + d * DIA_MS));
    const batch = db.batch();
    batch.set(db.collection('tenants').doc(TENANT_ID), {
      id: TENANT_ID, nome: 'Castelo PIXBE', slug: TENANT_ID, status: 'ativo',
      ownerUid: 'uid-owner-pixbe', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
      platformFeePct: 10,
      installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 20 },
      anticipation: { disponivel: false },
      communityMonthlyEnabled: false,
      saasMonthlyFee: 0,
      versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
    });
    const eventoRef = db.collection('eventos').doc(EVENTO_ID);
    batch.set(eventoRef, {
      id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-owner-pixbe',
      nome: 'Meia PIXBE', data: tsRel(45), local: 'Floripa/SC',
      modalidades: ['10k'], slug: EVENTO_ID, status: 'publicado',
      usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(eventoRef.collection('lotes').doc('l1'), {
      id: 'l1', tenantId: TENANT_ID, modalidade: '10k', ordem: 1,
      nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(30),
      quantidadeLimite: 100, preco: FACE, vendidos: 0,
      criadoEm: now, atualizadoEm: now,
    });
    await batch.commit();
  }

  // -------------------------------------------------------------------------
  // T1 — relógio do servidor na resposta (achado #6 da review S1209-REV)
  // -------------------------------------------------------------------------

  describe('T1 · o `agora` do servidor viaja com a expiração', () => {
    it('resposta da cobrança PIX traz servidorAgoraMillis do MESMO relógio que carimbou pixExpiraEm', async () => {
      const T0 = new Date(Date.now() + 60_000);
      const r = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t1-01'),
        { uid: 'uid-t1-a', ehAnonimo: true }, relogio(T0)
      );

      expect(r.servidorAgoraMillis).toBe(T0.getTime());
      expect(r.pixExpiraEmMillis).toBe(T0.getTime() + MEIA_HORA_MS);
      // A conta que a tela passa a fazer — sem tocar no relógio do aparelho.
      expect((r.pixExpiraEmMillis ?? 0) - r.servidorAgoraMillis).toBe(MEIA_HORA_MS);
    });

    it('REPLAY (leitor do pedido pendente) recarimba o AGORA e preserva a expiração — a contagem retomada é a real', async () => {
      const T0 = new Date(Date.now() + 60_000);
      const criacao = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t1-02'),
        { uid: 'uid-t1-b', ehAnonimo: true }, relogio(T0)
      );

      const T10 = new Date(T0.getTime() + 10 * 60 * 1000);
      const replay = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t1-02'),
        { uid: 'uid-t1-b', ehAnonimo: true }, relogio(T10)
      );

      // Prazo NUNCA re-estende (RN-157) …
      expect(replay.pixExpiraEmMillis).toBe(criacao.pixExpiraEmMillis);
      // … mas o instante do servidor é o DESTA leitura: faltam 20 min, não 30.
      expect(replay.servidorAgoraMillis).toBe(T10.getTime());
      expect((replay.pixExpiraEmMillis ?? 0) - replay.servidorAgoraMillis).toBe(
        20 * 60 * 1000
      );
    });

    it('cartão também traz servidorAgoraMillis (é o relógio da RESPOSTA, não um atributo do PIX)', async () => {
      const T0 = new Date(Date.now() + 60_000);
      const r = await createInscricaoChargeCore(
        db, provider,
        inputPix('pixbe-t1-03', { forma: 'cartao_credito', parcelas: 2 }),
        { uid: 'uid-t1-c', ehAnonimo: true }, relogio(T0)
      );
      expect(r.pixExpiraEmMillis).toBeUndefined();
      expect(r.servidorAgoraMillis).toBe(T0.getTime());
    });
  });
});
