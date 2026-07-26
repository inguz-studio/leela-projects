/**
 * checkoutS1203.attack.test.ts — FABLE-REVIEW adversarial (Schneier)
 *
 * Suíte ANTAGONISTA da fiação de dinheiro do checkout S1203 (⚠️ EXIGE Firestore
 * Emulator). Cada `it` é um ATAQUE: o teste é escrito do ponto de vista de quem
 * tenta quebrar o dinheiro (confirmar pedido alheio, fabricar valor, replay,
 * simular pagamento real, forjar tempo/webhook). Verde = o ataque foi NEGADO.
 *
 * Porta do emulator: env `LEELA_FS_EMU_PORT` (default 8080 — convenção do repo /
 * firebase.json). Rode local contra o emulator ativo com `LEELA_FS_EMU_PORT`.
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { cotarInscricaoCheckoutCore } from '../checkout/cotarInscricaoCheckout';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import { processarWebhookPagamento, WebhookRejeitadoError } from '../checkout/webhookPagamento';
import { agoraCheckout } from '../checkout/relogioCheckout';
import { hasAsaasKey, selectPaymentProvider } from '../payments/selectProvider';
import { buildMockWebhookPayload, MockPaymentProvider } from '../payments/mockProvider';
import { parseInscrito } from '@leela/core';

const PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);
const HOST = 'localhost';
// MESMO projectId da suíte oficial S1203: sob `vitest run` o Admin SDK é
// singleton por processo (admin.apps.length guard) — divergir de projectId
// faria o db apontar para o projeto de quem inicializou primeiro. Cada arquivo
// limpa (clearFirestore) e re-semeia no beforeAll, então são independentes.
const PROJECT_ID = 'demo-leela-s1203';
const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';
// S1209-PIXBE-T2 (RN-157): COMPRADOR POR TESTE. A trava server-side de
// segunda cobranca PIX viva recusa dois pedidos do MESMO comprador com o
// MESMO carrinho enquanto o primeiro segue pendente e dentro do prazo — e
// estes fixtures encadeiam compras IDENTICAS em sequencia, que em producao
// seriam justamente a cobranca duplicada. Trocar o comprador a cada teste
// devolve o cenario realista e NAO mexe em nenhuma asercao: o uid nunca e
// comparado a literal, so a ele mesmo.
// ARMADILHA (S1209-PIXREV): o Vitest roda `beforeAll` de describe ANTES do
// `beforeEach` de arquivo, entao dentro de um `beforeAll` este uid AINDA e o
// do teste anterior. Fixture semeada em hook NAO pode ser referenciada por
// este identificador nos testes — capture o comprador REAL no proprio hook
// (ver `criarPedidoPago` em estornarInscricao.integration.test.ts).
let ANA_UID = 'uid-ana-atleta';
let seqCompradorPixbe = 0;
beforeEach(() => {
  seqCompradorPixbe += 1;
  ANA_UID = `uid-ana-atleta-${seqCompradorPixbe}`;
});
const MALLORY_UID = 'uid-mallory-intruso';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp => Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

/** Semeia tenant/termos/evento/lote/cupom (espelho do seed da suíte oficial). */
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
    nome: 'Meia Maratona Floripa 2026', data: tsRel(45), local: 'Florianópolis/SC',
    modalidades: ['5k', '10k', '21k'], slug: EVENTO_ID, status: 'publicado', usaChip: true,
    qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc('10k-l2'), {
    id: '10k-l2', tenantId: TENANT_ID, modalidade: '10k', ordem: 2, nome: 'Lote 2',
    inicioEm: tsRel(-1), fimEm: tsRel(30), quantidadeLimite: 100, preco: 189.9, vendidos: 40,
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('cupons').doc('HEROI10'), {
    id: 'HEROI10', tenantId: TENANT_ID, codigo: 'HEROI10', tipo: 'percentual', valor: 10,
    tetoUso: 100, inicioEm: tsRel(-1), fimEm: tsRel(30), usos: 0, criadoEm: now, atualizadoEm: now,
  });
  // Kits do evento (H7 — fulfillment): um canônico (id→enum) e um CUSTOM do
  // organizador (fora do enum RN-202 — o caso que o kitId persistido resolve).
  batch.set(eventoRef.collection('kits').doc('kit-prata'), {
    id: 'kit-prata', tenantId: TENANT_ID, nome: 'Kit Prata', preco: 35,
    capacidade: 500, modalidades: ['10k'], criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('kits').doc('kit-vip-trail'), {
    id: 'kit-vip-trail', tenantId: TENANT_ID, nome: 'Kit VIP Trail', preco: 50,
    capacidade: 100, modalidades: ['10k'], criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

const baseInput = (key: string): CreateInscricaoChargeInput => ({
  eventoId: EVENTO_ID,
  inscritos: [{ nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25', modalidade: '10k' }],
  responsavelIndex: 0,
  responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
  aceites: { termos: true, saude: true },
  forma: 'pix', parcelas: 1, idempotencyKey: key,
});

async function receita(): Promise<number> {
  return (await db.doc(`eventos/${EVENTO_ID}`).get()).get('receitaConfirmada') as number;
}
async function statusPedido(pedidoId: string): Promise<string> {
  return (await db.collection('pedidos').doc(pedidoId).get()).get('status') as string;
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
  // Fronteira: nenhum teste roda com chave Asaas herdada do ambiente.
  delete process.env['ASAAS_API_KEY'];
  await seed();
// gRPC init do Emulator + seed excede o hookTimeout default (10s) sob carga
// (máquina 8GB — memória do Vitor): 60s dá folga sem mascarar bug real.
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

// =============================================================================
// H1 — Confirmar pedido alheio / inflar receita
// =============================================================================
describe('ATAQUE H1 · confirmar pedido de OUTRO pagador', () => {
  let pedidoId = '';

  beforeAll(async () => {
    const charge = await createInscricaoChargeCore(db, provider, baseInput('chk-h1-ana-0001'), { uid: ANA_UID });
    pedidoId = charge.pedidoId;
  }, 60_000);

  it('intruso (uid diferente) NÃO confirma o pedido da Ana → permission-denied, estado intacto', async () => {
    const receitaAntes = await receita();
    await expect(
      confirmarPagamentoSandboxCore(db, provider, { pedidoId }, { uid: MALLORY_UID }),
    ).rejects.toThrow(/outro pagador/);
    // O ataque não mexeu em nada: pedido segue pendente, receita não subiu.
    expect(await statusPedido(pedidoId)).toBe('pendente');
    expect(await receita()).toBe(receitaAntes);
  });

  it('intruso NÃO colide com a chave da Ana: pedidoId é namespaced por uid', async () => {
    // Mallory tenta reusar a MESMA idempotencyKey da Ana para sequestrar o pedido.
    const mallory = await createInscricaoChargeCore(
      db, provider, baseInput('chk-h1-ana-0001'), { uid: MALLORY_UID });
    expect(mallory.pedidoId).not.toBe(pedidoId);
    expect(mallory.pedidoId).toContain(MALLORY_UID);
    // E confirmar o pedido da Ana continua negado ao Mallory.
    await expect(
      confirmarPagamentoSandboxCore(db, provider, { pedidoId }, { uid: MALLORY_UID }),
    ).rejects.toThrow(/outro pagador/);
  });
});

// =============================================================================
// H2 — Valor fabricado + cotação read-only + vazamento de termo privado
// =============================================================================
describe('ATAQUE H2 · fabricar valor / cotação read-only', () => {
  it('cotação IGNORA valores injetados pelo cliente (usa o preço do lote do servidor)', async () => {
    const r = await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_ID,
      itens: [{ modalidade: '10k' }],
      forma: 'pix',
      parcelas: 1,
      // Campos hostis que o cliente TENTA injetar — não existem no contrato e
      // não têm efeito: o preço vem do lote (189.9), não do input.
      valorFinal: 1, totalCobrado: 1, taxa: 999, desconto: 999,
    } as never);
    expect(r.valorFinal).toBe(189.9);
    expect(r.totalCobrado).toBe(189.9);
    expect(r.desconto).toBe(0);
  });

  it('cotação PÚBLICA não vaza a taxa/platformFeePct do termo privado (RN-404)', async () => {
    const r = await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_ID, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
    });
    // `taxa` revelaria platformFeePct = taxa/valorFinal*100; não pode sair na
    // cotação anônima (firestore.rules restringe commercialTerms a owner/admin).
    expect(r).not.toHaveProperty('taxa');
    expect(r).not.toHaveProperty('receitaLiquidaOrganizador');
    expect(r).not.toHaveProperty('platformFeePct');
    expect(JSON.stringify(r)).not.toContain('10.5'); // o pct do termo não aparece
  });

  it('cotação NÃO escreve nada (nem pedido, nem pagamento)', async () => {
    const pedAntes = (await db.collection('pedidos').get()).size;
    const pagAntes = (await db.collection('pagamentos').get()).size;
    await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_ID, itens: [{ modalidade: '10k' }, { modalidade: '10k' }],
      forma: 'cartao_credito', parcelas: 3, cupomCodigo: 'HEROI10',
    });
    expect((await db.collection('pedidos').get()).size).toBe(pedAntes);
    expect((await db.collection('pagamentos').get()).size).toBe(pagAntes);
  });

  it('valor persistido vem do servidor mesmo com input hostil no createCharge', async () => {
    const hostil = {
      ...baseInput('chk-h2-valor-0001'),
      // Campos fora do contrato tentando forjar o valor da cobrança.
      valores: { valorFinal: 1, totalCobrado: 1 }, valorFinal: 1, totalCobrado: 1,
    } as unknown as CreateInscricaoChargeInput;
    const r = await createInscricaoChargeCore(db, provider, hostil, { uid: ANA_UID });
    const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
    expect(pag.get('valorFinal')).toBe(189.9);
    expect(pag.get('gatewayAmountCentavos')).toBe(18990);
  });
});

// =============================================================================
// H3 — Replay / duplicação de receita (sequencial e concorrente)
// =============================================================================
describe('ATAQUE H3 · replay / corrida na confirmação', () => {
  it('confirmar 2× (sequencial) NÃO dobra a receita', async () => {
    const key = 'chk-h3-seq-0001';
    const charge = await createInscricaoChargeCore(db, provider, baseInput(key), { uid: ANA_UID });
    const rAntes = await receita();
    const c1 = await confirmarPagamentoSandboxCore(db, provider, { pedidoId: charge.pedidoId }, { uid: ANA_UID });
    expect(c1.duplicado).toBe(false);
    expect(await receita()).toBe(rAntes + 189.9);
    const c2 = await confirmarPagamentoSandboxCore(db, provider, { pedidoId: charge.pedidoId }, { uid: ANA_UID });
    expect(c2.duplicado).toBe(true);
    expect(await receita()).toBe(rAntes + 189.9); // não dobrou
  });

  it('duas confirmações CONCORRENTES do mesmo pedido creditam a receita UMA vez', async () => {
    const key = 'chk-h3-race-0001';
    const charge = await createInscricaoChargeCore(db, provider, baseInput(key), { uid: ANA_UID });
    const rAntes = await receita();
    const resultados = await Promise.allSettled([
      confirmarPagamentoSandboxCore(db, provider, { pedidoId: charge.pedidoId }, { uid: ANA_UID }),
      confirmarPagamentoSandboxCore(db, provider, { pedidoId: charge.pedidoId }, { uid: ANA_UID }),
    ]);
    // Ao menos uma resolve (a outra pode ser idempotente OU abortar/retry sob
    // contenção) — o INVARIANTE de dinheiro é a receita: exatamente +189.9,
    // nunca +379.8. Nenhuma corrida credita duas vezes.
    const ok = resultados.filter((r) => r.status === 'fulfilled');
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(await statusPedido(charge.pedidoId)).toBe('pago');
    expect(await receita()).toBe(rAntes + 189.9);
  });
});

// =============================================================================
// H4 — Fail-safe: chave Asaas real fecha o caminho sandbox
// =============================================================================
describe('ATAQUE H4 · simular pagamento com chave Asaas REAL presente', () => {
  it('confirmarPagamentoSandbox recusa (fail-closed) quando ASAAS_API_KEY existe', async () => {
    const key = 'chk-h4-failsafe-0001';
    const charge = await createInscricaoChargeCore(db, provider, baseInput(key), { uid: ANA_UID });
    const rAntes = await receita();
    process.env['ASAAS_API_KEY'] = 'prod_key_real_abc123';
    try {
      expect(hasAsaasKey(process.env)).toBe(true);
      await expect(
        confirmarPagamentoSandboxCore(db, provider, { pedidoId: charge.pedidoId }, { uid: ANA_UID }),
      ).rejects.toThrow(/Asaas|sandbox indispon|gateway/i);
      // selector também para duro (nunca degrada pagamento real para sandbox)
      expect(() => selectPaymentProvider(process.env)).toThrow();
    } finally {
      delete process.env['ASAAS_API_KEY'];
    }
    // O pedido NÃO foi confirmado nem a receita mexeu enquanto a chave existia.
    expect(await statusPedido(charge.pedidoId)).toBe('pendente');
    expect(await receita()).toBe(rAntes);
  });
});

// =============================================================================
// H5 — Tempo fabricado: LEELA_CLOCK só age sob o emulator
// =============================================================================
describe('ATAQUE H5 · forjar o relógio para pegar lote mais barato', () => {
  const salvarEnv = () => ({
    emu: process.env['FUNCTIONS_EMULATOR'], clock: process.env['LEELA_CLOCK'],
  });
  const restaurarEnv = (s: { emu: string | undefined; clock: string | undefined }) => {
    if (s.emu === undefined) delete process.env['FUNCTIONS_EMULATOR']; else process.env['FUNCTIONS_EMULATOR'] = s.emu;
    if (s.clock === undefined) delete process.env['LEELA_CLOCK']; else process.env['LEELA_CLOCK'] = s.clock;
  };

  it('FORA do emulator, LEELA_CLOCK é IGNORADO (relógio real — sem tempo fabricado)', () => {
    const s = salvarEnv();
    try {
      delete process.env['FUNCTIONS_EMULATOR'];
      process.env['LEELA_CLOCK'] = '2000-01-01T00:00:00.000Z'; // ano 2000 fabricado
      const agora = agoraCheckout();
      expect(Math.abs(agora.getTime() - Date.now())).toBeLessThan(5000); // ~agora, não 2000
      expect(agora.getUTCFullYear()).toBeGreaterThanOrEqual(2026);
    } finally {
      restaurarEnv(s);
    }
  });

  it('SÓ sob FUNCTIONS_EMULATOR=true o override é honrado (mecanismo de demo)', () => {
    const s = salvarEnv();
    try {
      process.env['FUNCTIONS_EMULATOR'] = 'true';
      process.env['LEELA_CLOCK'] = '2026-03-15T12:00:00.000Z';
      expect(agoraCheckout().toISOString()).toBe('2026-03-15T12:00:00.000Z');
    } finally {
      restaurarEnv(s);
    }
  });

  it('o relógio NÃO é campo de input do checkout (cliente não injeta tempo)', async () => {
    // Passar "agora"/"clock" no input não altera a derivação (agora é injeção
    // server-side; qualquer campo extra é ignorado).
    const r = await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_ID, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
      agora: '2000-01-01T00:00:00Z', clock: '2000-01-01T00:00:00Z',
    } as never);
    expect(r.valorFinal).toBe(189.9); // lote vigente do relógio real, não forjado
  });
});

// =============================================================================
// H6 — Anônimo forja webhook direto: integridade de valor/chargeId
// =============================================================================
describe('ATAQUE H6 · forjar webhook direto (superfície pública)', () => {
  let pedidoId = '';
  let chargeId = '';

  beforeAll(async () => {
    const charge = await createInscricaoChargeCore(db, provider, baseInput('chk-h6-webhook-0001'), { uid: ANA_UID });
    pedidoId = charge.pedidoId;
    chargeId = charge.chargeId;
  }, 60_000);

  it('webhook ASSINADO com VALOR inflado é rejeitado (integridade cruzada 409)', async () => {
    const rAntes = await receita();
    // Mesmo com assinatura mock VÁLIDA (segredo público no sandbox), o valor
    // diverge do persistido → a porta recusa. Não dá para inflar receita.
    const forjado = buildMockWebhookPayload('charge.confirmed', {
      chargeId, orderId: pedidoId, amount: 999999, eventId: 'forja-valor-1',
    });
    await expect(processarWebhookPagamento(db, provider, forjado)).rejects.toThrow(WebhookRejeitadoError);
    await expect(processarWebhookPagamento(db, provider, forjado)).rejects.toThrow(/[Vv]alor/);
    expect(await statusPedido(pedidoId)).toBe('pendente');
    expect(await receita()).toBe(rAntes);
  });

  it('webhook com chargeId DIVERGENTE é rejeitado (409)', async () => {
    const forjado = buildMockWebhookPayload('charge.confirmed', {
      chargeId: 'mock_charge_9999_forjado', orderId: pedidoId, amount: 18990, eventId: 'forja-charge-1',
    });
    await expect(processarWebhookPagamento(db, provider, forjado)).rejects.toThrow(/chargeId/);
    expect(await statusPedido(pedidoId)).toBe('pendente');
  });

  it('webhook com assinatura INVÁLIDA é rejeitado antes de qualquer escrita (401)', async () => {
    const rAntes = await receita();
    const semAssinatura = {
      event: 'charge.confirmed',
      data: { chargeId, orderId: pedidoId, amount: 18990, eventId: 'forja-sig-1' },
      signature: 'assinatura-forjada-invalida',
      deliveredAt: new Date().toISOString(),
    };
    await expect(processarWebhookPagamento(db, provider, semAssinatura)).rejects.toThrow(WebhookRejeitadoError);
    expect(await receita()).toBe(rAntes);
    expect(await statusPedido(pedidoId)).toBe('pendente');
  });
});

// =============================================================================
// H7 — Fulfillment do kit: kitId persistido == kit COBRADO (follow-up c59dc28)
// =============================================================================
describe('ATAQUE H7 · forjar kit da entrega (rótulo × kitId persistido)', () => {
  const inscritoDoc = async (inscritoId: string) => {
    const snap = await db.doc(`eventos/${EVENTO_ID}/inscritos/${inscritoId}`).get();
    expect(snap.exists).toBe(true);
    return snap.data() as Record<string, unknown>;
  };

  it('ATAQUE: rótulo kit_ouro forjado + kitId barato → doc carimba o kit COBRADO (id e rótulo)', async () => {
    const input: CreateInscricaoChargeInput = {
      ...baseInput('chk-h7-forja-0001'),
      inscritos: [{
        nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25',
        modalidade: '10k',
        kit: 'kit_ouro', // rótulo FORJADO (kit que ela NÃO pagou)
        kitId: 'kit-prata', // o que ela realmente paga (+35)
      }],
    };
    const r = await createInscricaoChargeCore(db, provider, input, { uid: ANA_UID });

    // Cobrança = lote 189.90 + kit-prata 35 = 224.90 (o preço vem do DOC do kit)
    expect(r.valores.valorFinal).toBe(224.9);
    const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
    expect(pag.get('gatewayAmountCentavos')).toBe(22490);

    // Doc do inscrito: kitId EXATO cobrado + rótulo DERIVADO dele — o forjado
    // 'kit_ouro' não deixa rastro em lugar NENHUM do doc.
    const doc = await inscritoDoc(r.inscritoIds[0]!);
    expect(doc['kitId']).toBe('kit-prata');
    expect(doc['kit']).toBe('kit_prata');
    expect(JSON.stringify(doc)).not.toContain('kit_ouro');
  });

  it('kit CUSTOM do organizador: rótulo degrada p/ sem_kit MAS o balcão tem o id exato', async () => {
    const input: CreateInscricaoChargeInput = {
      ...baseInput('chk-h7-custom-0001'),
      inscritos: [{
        nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25',
        modalidade: '10k', kitId: 'kit-vip-trail', // fora do enum RN-202
      }],
    };
    const r = await createInscricaoChargeCore(db, provider, input, { uid: ANA_UID });
    expect(r.valores.valorFinal).toBe(239.9); // 189.90 + 50 do kit custom

    // ANTES deste follow-up o doc só tinha kit='sem_kit' — o balcão não sabia
    // QUAL kit entregar. Agora o id real persiste e o parse do core o expõe.
    const raw = await inscritoDoc(r.inscritoIds[0]!);
    const inscrito = parseInscrito(r.inscritoIds[0]!, raw);
    expect(inscrito.kitId).toBe('kit-vip-trail');
    expect(inscrito.kit).toBe('sem_kit'); // degradação honesta do ENUM, só do rótulo
  });

  it('sem kit escolhido → kitId null EXPLÍCITO (não confunde com legado ausente)', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, baseInput('chk-h7-semkit-0001'), { uid: ANA_UID });
    const doc = await inscritoDoc(r.inscritoIds[0]!);
    expect(doc['kitId']).toBeNull();
    expect(doc['kit']).toBe('sem_kit');
  });

  it('ATAQUE: kitId fantasma (sem doc no evento) → invalid-argument e NADA é escrito', async () => {
    const input: CreateInscricaoChargeInput = {
      ...baseInput('chk-h7-fantasma-0001'),
      inscritos: [{
        nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25',
        modalidade: '10k', kitId: 'kit-fantasma-9999',
      }],
    };
    await expect(
      createInscricaoChargeCore(db, provider, input, { uid: ANA_UID })
    ).rejects.toThrow(/não existe/);
    const pedido = await db.collection('pedidos')
      .doc(`ped-${ANA_UID}-chk-h7-fantasma-0001`).get();
    expect(pedido.exists).toBe(false); // id fantasma nunca vira pedido/inscrito
  });
});
