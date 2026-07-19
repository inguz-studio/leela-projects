/**
 * cupomOnly.integration.test.ts — LEELA-S1804-T1 (RN-303 · evento fechado)
 * (⚠️ EXIGE Firestore Emulator 8080 — projectId demo-leela-s1203.)
 *
 * Modo de venda "somente via cupom" (benchmark TicketSports). Invariantes:
 *   G1. Evento FECHADO sem cupom ⇒ cotação E cobrança morrem em
 *       failed-precondition com a copy canônica; NADA é escrito.
 *   G2. Cupom VÁLIDO abre a inscrição (cotação + charge com desconto).
 *   G3. Bypass negados: cupom inexistente ⇒ invalid-argument; cupom FORA DA
 *       JANELA ⇒ erro (a validade fail-fast da cadeia segue valendo — o gate
 *       exige presença, a janela mata o resto).
 *   G4. Flag OFF/lixo ⇒ comportamento vigente preservado (venda aberta);
 *       lixo NUNCA fecha evento (direção documentada no core).
 *   G5. O flag vem do DOC — payload direto não abre evento fechado (não há
 *       campo de input que o carregue; provado por ataque com campo extra).
 *
 * Comando (memória 8GB — SÓ Firestore via emulators:exec):
 *   npx firebase-tools@13 emulators:exec --only firestore --project demo-leela-s1203 \
 *     "npx vitest run src/__tests__/cupomOnly.integration.test.ts"
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  MSG_EVENTO_FECHADO_SEM_CUPOM,
  parseEvento,
  vendaSomentePorCupomAtiva,
} from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { cotarInscricaoCheckoutCore } from '../checkout/cotarInscricaoCheckout';
import { MockPaymentProvider } from '../payments/mockProvider';

const PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);
const HOST = 'localhost';
// MESMO projectId das suítes S1203 (Admin SDK é singleton por processo).
const PROJECT_ID = 'demo-leela-s1203';
const TENANT_ID = 'castelo-producoes';
const EVENTO_FECHADO = 'cupomonly-evento-fechado';
const EVENTO_ABERTO = 'cupomonly-evento-aberto';
const EVENTO_LIXO = 'cupomonly-evento-flag-lixo';

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
  // Três eventos IDÊNTICOS exceto o flag: fechado (true) · aberto (ausente) ·
  // flag-lixo (string 'true' — deve valer como OFF, direção documentada).
  for (const [eventoId, flag] of [
    [EVENTO_FECHADO, true],
    [EVENTO_ABERTO, undefined],
    [EVENTO_LIXO, 'true'],
  ] as const) {
    const eventoRef = db.collection('eventos').doc(eventoId);
    batch.set(eventoRef, {
      id: eventoId, tenantId: TENANT_ID, organizadorId: 'uid-marina',
      nome: `Cupom-only ${eventoId}`, data: tsRel(45), local: 'Florianópolis/SC',
      modalidades: ['10k'], slug: eventoId, status: 'publicado', usaChip: false,
      qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
      ...(flag !== undefined ? { vendaSomentePorCupom: flag } : {}),
    });
    batch.set(eventoRef.collection('lotes').doc(`${eventoId}-10k-l1`), {
      id: `${eventoId}-10k-l1`, tenantId: TENANT_ID, modalidade: '10k', ordem: 1,
      nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(30),
      quantidadeLimite: 100, preco: FACE, vendidos: 0, criadoEm: now, atualizadoEm: now,
    });
    batch.set(eventoRef.collection('cupons').doc('CONVENIO10'), {
      id: 'CONVENIO10', tenantId: TENANT_ID, codigo: 'CONVENIO10', tipo: 'percentual', valor: 10,
      tetoUso: 100, inicioEm: tsRel(-1), fimEm: tsRel(30), usos: 0,
      criadoEm: now, atualizadoEm: now,
    });
    // Cupom EXPIRADO (janela no passado) — bypass G3
    batch.set(eventoRef.collection('cupons').doc('VENCIDO10'), {
      id: 'VENCIDO10', tenantId: TENANT_ID, codigo: 'VENCIDO10', tipo: 'percentual', valor: 10,
      tetoUso: 100, inicioEm: tsRel(-30), fimEm: tsRel(-10), usos: 0,
      criadoEm: now, atualizadoEm: now,
    });
  }
  await batch.commit();
}

const chargeInput = (
  eventoId: string,
  key: string,
  cupomCodigo?: string
): CreateInscricaoChargeInput => ({
  eventoId,
  inscritos: [{ nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25', modalidade: '10k' }],
  responsavelIndex: 0,
  responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
  aceites: { termos: true, saude: true },
  forma: 'pix',
  parcelas: 1,
  idempotencyKey: key,
  ...(cupomCodigo !== undefined ? { cupomCodigo } : {}),
});

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
  delete process.env['ASAAS_API_KEY'];
  await seed();
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('RN-303 · core puro (parse + acessor)', () => {
  const base = {
    nome: 'E', tenantId: TENANT_ID, organizadorId: 'u', status: 'publicado',
    modalidades: ['10k'], data: Timestamp.now(), criadoEm: Timestamp.now(),
    atualizadoEm: Timestamp.now(),
  };

  it('parseEvento: só `true` LITERAL materializa o flag; false/lixo/ausente ⇒ omitido', () => {
    expect(parseEvento('e1', { ...base, vendaSomentePorCupom: true }).vendaSomentePorCupom).toBe(true);
    expect('vendaSomentePorCupom' in parseEvento('e2', { ...base, vendaSomentePorCupom: false })).toBe(false);
    expect('vendaSomentePorCupom' in parseEvento('e3', { ...base, vendaSomentePorCupom: 'true' })).toBe(false);
    expect('vendaSomentePorCupom' in parseEvento('e4', { ...base })).toBe(false);
  });

  it('vendaSomentePorCupomAtiva: acessor canônico', () => {
    expect(vendaSomentePorCupomAtiva({ vendaSomentePorCupom: true })).toBe(true);
    expect(vendaSomentePorCupomAtiva({})).toBe(false);
  });
});

describe('RN-303 · G1 — evento fechado SEM cupom morre fail-closed', () => {
  it('cotação sem cupom ⇒ failed-precondition com a copy canônica', async () => {
    await expect(
      cotarInscricaoCheckoutCore(db, {
        eventoId: EVENTO_FECHADO, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
      })
    ).rejects.toMatchObject({ code: 'failed-precondition', message: MSG_EVENTO_FECHADO_SEM_CUPOM });
  });

  it('cobrança sem cupom ⇒ failed-precondition e NADA escrito (pedidos vazio)', async () => {
    await expect(
      createInscricaoChargeCore(db, provider, chargeInput(EVENTO_FECHADO, 'cupomonly-g1-01'), {
        uid: 'uid-ana',
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    const pedidos = await db
      .collection('pedidos')
      .where('eventoId', '==', EVENTO_FECHADO)
      .get();
    expect(pedidos.empty).toBe(true);
  });
});

describe('RN-303 · G2 — cupom válido abre a inscrição', () => {
  it('cotação com CONVENIO10 ⇒ preço com desconto (gate liberado)', async () => {
    const r = await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_FECHADO, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
      cupomCodigo: 'CONVENIO10',
    });
    expect(r.valorFinal).toBe(108); // 120 − 10%
    expect(r.cupomAplicado?.codigo).toBe('CONVENIO10');
  });

  it('cobrança com CONVENIO10 ⇒ pedido criado', async () => {
    const charge = await createInscricaoChargeCore(
      db, provider, chargeInput(EVENTO_FECHADO, 'cupomonly-g2-01', 'CONVENIO10'), { uid: 'uid-ana' }
    );
    expect(charge.pedidoId).toBeTruthy();
    const pedido = await db.doc(`pedidos/${charge.pedidoId}`).get();
    expect(pedido.exists).toBe(true);
    expect(pedido.get('valorTotal')).toBe(108); // 120 − 10% (contrato do pedido)
  });
});

describe('RN-303 · G3 — bypass negados (validade continua fail-fast)', () => {
  it('cupom INEXISTENTE não abre o gate ⇒ invalid-argument', async () => {
    await expect(
      cotarInscricaoCheckoutCore(db, {
        eventoId: EVENTO_FECHADO, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
        cupomCodigo: 'NAOEXISTE',
      })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('cupom FORA DA JANELA não abre o gate ⇒ erro na cadeia de venda', async () => {
    await expect(
      cotarInscricaoCheckoutCore(db, {
        eventoId: EVENTO_FECHADO, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
        cupomCodigo: 'VENCIDO10',
      })
    ).rejects.toThrow(/fora da (janela|vigência)|janela/i);
  });
});

describe('RN-303 · G4/G5 — flag off/lixo preservam o vigente; payload não fecha nem abre', () => {
  it('evento SEM flag: cotação sem cupom segue funcionando (regressão)', async () => {
    const r = await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_ABERTO, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
    });
    expect(r.valorFinal).toBe(FACE);
  });

  it('flag LIXO (string \'true\') vale como OFF — lixo nunca fecha evento', async () => {
    const r = await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_LIXO, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
    });
    expect(r.valorFinal).toBe(FACE);
  });

  it('FORJA G5: campo extra no payload NÃO abre evento fechado (flag vem do DOC)', async () => {
    await expect(
      cotarInscricaoCheckoutCore(db, {
        eventoId: EVENTO_FECHADO, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
        vendaSomentePorCupom: false,
      } as never)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});
