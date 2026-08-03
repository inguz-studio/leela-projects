/**
 * aceitesOrigem.integration.test.ts — S1217-T5 · RN-442 · D-ACH-14
 * (⚠️ EXIGE Firestore Emulator; comando no fim deste cabeçalho).
 *
 * A prova de aceite guardava "o quê" (versão + hash do material) e "quando"
 * (carimbo do servidor). Não guardava "de onde". Para um termo de isenção de
 * responsabilidade por lesão isso é fragilidade probatória — e a RN-438, que
 * afastou o gesto do carimbo em minutos, é exatamente o que uma contestação
 * exploraria.
 *
 * O que esta suíte prova contra o Emulator:
 *   O1. O bloco de aceites passa a carregar `origem { ipHash, userAgent }`.
 *   O2. O endereço NUNCA é gravado em claro — nem no bloco, nem em lugar
 *       nenhum do documento do pedido.
 *   O3. O hash é HMAC com pepper: mesmo endereço ⇒ mesmo hash; endereços
 *       diferentes ⇒ hashes diferentes; e o hash não é o sha256 puro do
 *       endereço (que a força bruta de 2^32 reverteria em segundos).
 *   O4. O CLIENTE não participa: `origem`, `ipHash` e `userAgent` forjados no
 *       payload são ignorados por construção — o que fica gravado é o da
 *       requisição.
 *   O5. Requisição sem endereço não inventa prova: a origem é OMITIDA, e o
 *       resto do bloco continua íntegro.
 *   O6. O agente do navegador é truncado no teto (minimização).
 *   O7. O replay que COMPLETA prova ausente (F-4b) carimba a origem DESTE
 *       retry — e nunca reescreve prova existente.
 *
 * Comando (Java 17 nesta máquina ⇒ firebase-tools@13; o global novo exige JDK 21):
 *   cd functions && npx firebase-tools@13 emulators:exec --only firestore,auth \
 *     --project demo-leela-s1203 \
 *     "npx vitest run src/__tests__/aceitesOrigem.integration.test.ts"
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  ACEITE_USER_AGENT_MAX,
  TERMO_SAUDE_VERSAO_VIGENTE,
  parseAceitesPedido,
  politicaVendasPadrao,
  type AuthClaims,
} from '@leela/core';
import {
  createInscricaoChargeCore,
  derivarOrigemAceite,
  type CheckoutCaller,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { MockPaymentProvider } from '../payments/mockProvider';

const PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);
const HOST = 'localhost';
const PROJECT_ID = 'demo-leela-s1203';
const TENANT_ID = 'castelo-producoes';
const EVENTO = 'rn442-evento';
const FACE = 90;

/** Endereço do comprador — o valor que NUNCA pode aparecer gravado. */
const IP_ANA = '187.55.201.34';
const IP_OUTRO = '200.147.35.149';
const UA_ANA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const MARINA: { uid: string; claims: AuthClaims } = {
  uid: 'uid-marina-rn442',
  claims: { role: 'tenant_owner', tenantId: TENANT_ID } as AuthClaims,
};

let compradorUid = 'uid-ana-rn442-0';
let seq = 0;
beforeEach(() => {
  seq += 1;
  compradorUid = `uid-ana-rn442-${seq}`;
});

/** Caller como o wrapper callable o monta (uid + origem do rawRequest). */
function caller(
  origem?: { ip?: string | undefined; userAgent?: string | undefined }
): CheckoutCaller {
  return {
    uid: compradorUid,
    ehAnonimo: true,
    ...(origem !== undefined ? { origem } : {}),
  };
}

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp => Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

async function seed(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID,
    nome: 'Castelo Produções',
    slug: TENANT_ID,
    status: 'ativo',
    ownerUid: MARINA.uid,
    tipo: 'produtor',
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 2.89, parcelaMinima: 20 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1,
    atualizadoPor: 'seed',
    atualizadoEm: now,
  });
  const eventoRef = db.collection('eventos').doc(EVENTO);
  batch.set(eventoRef, {
    id: EVENTO,
    tenantId: TENANT_ID,
    organizadorId: MARINA.uid,
    nome: 'RN-442 experiência',
    data: tsRel(45),
    local: 'Florianópolis/SC',
    modalidades: ['10k'],
    slug: EVENTO,
    status: 'publicado',
    usaChip: false,
    qtdInscritos: 0,
    receitaConfirmada: 0,
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc(`${EVENTO}-10k-l1`), {
    id: `${EVENTO}-10k-l1`,
    tenantId: TENANT_ID,
    modalidade: '10k',
    ordem: 1,
    nome: 'Lote 1',
    inicioEm: tsRel(-1),
    fimEm: tsRel(30),
    quantidadeLimite: 100,
    preco: FACE,
    vendidos: 0,
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(eventoRef.collection('politicaVendas').doc('config'), {
    id: 'config',
    tenantId: TENANT_ID,
    ...politicaVendasPadrao(),
    versao: 1,
    atualizadoEm: now,
  });
  await batch.commit();
}

const inscritoAna = {
  nome: 'Ana Souza',
  email: 'ana@exemplo.com',
  cpf: '529.982.247-25',
  modalidade: '10k',
};

function entrada(key: string, extras: Record<string, unknown> = {}): CreateInscricaoChargeInput {
  return {
    eventoId: EVENTO,
    inscritos: [inscritoAna],
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
    aceites: { termos: true, saude: true, ...extras },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
  } as CreateInscricaoChargeInput;
}

async function aceitesDoPedido(pedidoId: string): Promise<Record<string, unknown>> {
  const snap = await db.doc(`pedidos/${pedidoId}`).get();
  return snap.get('aceites') as Record<string, unknown>;
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
  delete process.env['ASAAS_API_KEY'];
  process.env['CRM_ID_PEPPER'] ??= 'pepper-de-teste-rn442';
  await seed();
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

// =============================================================================
// O1 + O2 + O6 — a origem existe, o endereço não aparece, o agente é truncado
// =============================================================================
describe('RN-442 · a prova de aceite ganha origem', () => {
  it('O1 — o bloco carrega `origem { ipHash, userAgent }`', async () => {
    const r = await createInscricaoChargeCore(
      db,
      provider,
      entrada('rn442-origem-00001'),
      caller({ ip: IP_ANA, userAgent: UA_ANA })
    );
    const aceites = await aceitesDoPedido(r.pedidoId);
    const origem = aceites['origem'] as Record<string, unknown>;
    expect(typeof origem['ipHash']).toBe('string');
    expect(origem['ipHash']).toMatch(/^[0-9a-f]{64}$/);
    expect(origem['userAgent']).toBe(UA_ANA);
    // O resto do bloco continua intacto (a origem é aditiva).
    expect((aceites['termos'] as Record<string, unknown>)['versao']).toBe(1);
    expect((aceites['saude'] as Record<string, unknown>)['versao']).toBe(
      TERMO_SAUDE_VERSAO_VIGENTE
    );
    // E o parse defensivo do core aceita o que o servidor escreveu.
    expect(parseAceitesPedido('teste', aceites).origem?.userAgent).toBe(UA_ANA);
  });

  it('O2 — o endereço NUNCA é gravado em claro, em nenhum ponto do pedido', async () => {
    const r = await createInscricaoChargeCore(
      db,
      provider,
      entrada('rn442-claro-000001'),
      caller({ ip: IP_ANA, userAgent: UA_ANA })
    );
    const doc = await db.doc(`pedidos/${r.pedidoId}`).get();
    const serializado = JSON.stringify(doc.data());
    expect(serializado).not.toContain(IP_ANA);
    // Nem em pedaços: o primeiro octeto sozinho já identificaria a operadora.
    expect(serializado).not.toContain('187.55');
  });

  it('O6 — o agente do navegador é truncado no teto', async () => {
    const enorme = `${UA_ANA} ${'x'.repeat(2000)}`;
    const r = await createInscricaoChargeCore(
      db,
      provider,
      entrada('rn442-teto-00000001'),
      caller({ ip: IP_ANA, userAgent: enorme })
    );
    const origem = (await aceitesDoPedido(r.pedidoId))['origem'] as Record<string, unknown>;
    expect((origem['userAgent'] as string).length).toBe(ACEITE_USER_AGENT_MAX);
  });
});

// =============================================================================
// O3 — o hash é HMAC com pepper, não sha256 do endereço
// =============================================================================
describe('RN-442 · o hash não é reversível por força bruta', () => {
  it('O3 — determinístico por endereço, distinto entre endereços, e ≠ sha256 puro', () => {
    const a1 = derivarOrigemAceite({ ip: IP_ANA, userAgent: UA_ANA });
    const a2 = derivarOrigemAceite({ ip: IP_ANA, userAgent: 'outro agente' });
    const b = derivarOrigemAceite({ ip: IP_OUTRO, userAgent: UA_ANA });
    expect(a1?.ipHash).toBe(a2?.ipHash); // o agente não entra no hash
    expect(a1?.ipHash).not.toBe(b?.ipHash);
    // O sha256 PURO de um IPv4 é revertido em segundos (2^32 valores). O
    // pepper secreto é o que mata a força bruta offline — é a mesma escolha
    // do hardening A3 dos identificadores de pessoa do CRM.
    const shaPuro = createHash('sha256').update(IP_ANA).digest('hex');
    expect(a1?.ipHash).not.toBe(shaPuro);
  });
});

// =============================================================================
// O4 + O5 — o cliente não participa, e requisição sem endereço não inventa
// =============================================================================
describe('RN-442 · o cliente não influencia o carimbo', () => {
  it('O4 — origem forjada no payload é ignorada; vale a da requisição', async () => {
    const forjado = entrada('rn442-forja-00001', {
      // Tudo o que um cliente hostil tentaria plantar:
      origem: { ipHash: 'f'.repeat(64), userAgent: 'agente-forjado' },
      ipHash: '0'.repeat(64),
      userAgent: 'agente-forjado',
      ip: '8.8.8.8',
    });
    const r = await createInscricaoChargeCore(
      db,
      provider,
      forjado,
      caller({ ip: IP_ANA, userAgent: UA_ANA })
    );
    const origem = (await aceitesDoPedido(r.pedidoId))['origem'] as Record<string, unknown>;
    expect(origem['userAgent']).toBe(UA_ANA);
    expect(origem['ipHash']).not.toBe('f'.repeat(64));
    expect(origem['ipHash']).toBe(
      derivarOrigemAceite({ ip: IP_ANA, userAgent: UA_ANA })?.ipHash
    );
    // E nada do que ele plantou sobreviveu em lugar nenhum do documento.
    const serializado = JSON.stringify((await db.doc(`pedidos/${r.pedidoId}`).get()).data());
    expect(serializado).not.toContain('agente-forjado');
    expect(serializado).not.toContain('8.8.8.8');
  });

  it('O5 — requisição SEM endereço omite a origem em vez de inventá-la', async () => {
    const r = await createInscricaoChargeCore(
      db,
      provider,
      entrada('rn442-semip-000001'),
      caller({ userAgent: UA_ANA })
    );
    const aceites = await aceitesDoPedido(r.pedidoId);
    expect(aceites['origem']).toBeUndefined();
    // Prova sem origem é prova INCOMPLETA, não prova falsa: o resto vale.
    expect((aceites['termos'] as Record<string, unknown>)['versao']).toBe(1);
    expect(parseAceitesPedido('teste', aceites).origem).toBeUndefined();
  });

  it('O5b — caller sem origem nenhuma (invocação interna) também não inventa', async () => {
    const r = await createInscricaoChargeCore(
      db,
      provider,
      entrada('rn442-semorig-0001'),
      caller()
    );
    expect((await aceitesDoPedido(r.pedidoId))['origem']).toBeUndefined();
  });
});

// =============================================================================
// O7 — o replay que completa prova ausente carimba a origem DESTE retry
// =============================================================================
describe('RN-442 · replay (F-4b)', () => {
  it('O7 — pedido legado sem bloco: o retry completa a prova COM origem', async () => {
    const key = 'rn442-replay-00001';
    // Compra normal…
    const r = await createInscricaoChargeCore(
      db,
      provider,
      entrada(key),
      caller({ ip: IP_ANA, userAgent: UA_ANA })
    );
    // …e o pedido é rebaixado ao estado LEGADO (sem bloco de aceites), que é
    // exatamente o que o F-4b existe para consertar.
    await db.doc(`pedidos/${r.pedidoId}`).update({ aceites: FieldValue.delete() });
    expect((await aceitesDoPedido(r.pedidoId))).toBeUndefined();

    // Retry com a MESMA chave, de outra origem (é a do retry que vale — o
    // aceite chegou ao servidor agora).
    await createInscricaoChargeCore(
      db,
      provider,
      entrada(key),
      caller({ ip: IP_OUTRO, userAgent: 'Retry/1.0' })
    );
    const origem = (await aceitesDoPedido(r.pedidoId))['origem'] as Record<string, unknown>;
    expect(origem['userAgent']).toBe('Retry/1.0');
    expect(origem['ipHash']).toBe(derivarOrigemAceite({ ip: IP_OUTRO })?.ipHash);
  });

  it('O7b — GUARDA: prova EXISTENTE nunca é reescrita pelo replay', async () => {
    const key = 'rn442-intocado-0001';
    const r = await createInscricaoChargeCore(
      db,
      provider,
      entrada(key),
      caller({ ip: IP_ANA, userAgent: UA_ANA })
    );
    await createInscricaoChargeCore(
      db,
      provider,
      entrada(key),
      caller({ ip: IP_OUTRO, userAgent: 'Retry/1.0' })
    );
    const origem = (await aceitesDoPedido(r.pedidoId))['origem'] as Record<string, unknown>;
    expect(origem['userAgent']).toBe(UA_ANA);
  });
});
