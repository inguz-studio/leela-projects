/**
 * aceitesVersaoExibida.integration.test.ts — S1217-T4 · RN-439
 * (⚠️ EXIGE Firestore Emulator; comando no fim deste cabeçalho).
 *
 * A RN-438 tirou os dois aceites da tela de pagar e os pôs no fim da etapa de
 * inscrição. A distância entre o GESTO da pessoa e o CARIMBO do servidor saiu
 * de segundos para minutos — e nesse intervalo cabe o organizador publicar uma
 * política de vendas nova. O `materialHash` da F-1 prova o que o SERVIDOR leu;
 * ele nunca provou o que a PESSOA leu.
 *
 * O que esta suíte prova contra o Emulator:
 *   V1. Versão exibida == vigente ⇒ a compra conclui (o caminho feliz não
 *       ganhou pedágio).
 *   V2. Versão exibida DEFASADA ⇒ `failed-precondition` com motivo TIPADO, e
 *       NADA é escrito (o pedido não existe depois da recusa).
 *   V3. A recusa é MUDA: nem o texto novo, nem o hash, nem a versão nova, nem
 *       o instante da publicação atravessam a mensagem ou os `details`.
 *   V4. A versão EXIBIDA nunca vira prova: o bloco `aceites` do pedido não
 *       carrega `versoesExibidas` em nenhum nível, e a versão gravada é a que
 *       o SERVIDOR leu.
 *   V5. O termo de saúde BASE entra na conferência pelo mesmo critério.
 *   V6. Cliente que não manda o campo compra como antes (evolução de schema —
 *       quem omite perde a guarda, não ganha nada).
 *   V7. Termo custom ATIVO exige a versão dele na conferência: dizer
 *       `saudeCustom: true` sem dizer QUAL versão foi vista é divergência.
 *
 * Comando (Java 17 nesta máquina ⇒ firebase-tools@13; o global novo exige JDK 21):
 *   cd functions && npx firebase-tools@13 emulators:exec --only firestore,auth \
 *     --project demo-leela-s1203 \
 *     "npx vitest run src/__tests__/aceitesVersaoExibida.integration.test.ts"
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  MOTIVO_ACEITE_VERSAO_DIVERGENTE,
  TERMO_SAUDE_VERSAO_VIGENTE,
  politicaVendasPadrao,
  type AuthClaims,
} from '@leela/core';
import {
  createInscricaoChargeCore,
  idsDoCheckout,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { MockPaymentProvider } from '../payments/mockProvider';

const PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);
const HOST = 'localhost';
// MESMO projectId das demais suítes de checkout (Admin SDK é singleton por
// processo — projectId divergente no mesmo processo não conecta).
const PROJECT_ID = 'demo-leela-s1203';
const TENANT_ID = 'castelo-producoes';
const EVENTO = 'rn439-evento';
const EVENTO_CUSTOM = 'rn439-evento-termo-custom';
const FACE = 120;

const MARINA_UID = 'uid-marina-rn439';
const MARINA: { uid: string; claims: AuthClaims } = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: TENANT_ID } as AuthClaims,
};

// RN-157: comprador NOVO por teste. A trava server-side de segunda cobrança
// PIX viva recusaria o segundo pedido idêntico do mesmo comprador, e estes
// casos encadeiam compras iguais de propósito.
let comprador = { uid: 'uid-ana-rn439-0', ehAnonimo: true };
let seq = 0;
beforeEach(() => {
  seq += 1;
  comprador = { uid: `uid-ana-rn439-${seq}`, ehAnonimo: true };
});

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp => Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

/** Texto do termo custom do organizador — material que a V7 confere. */
const TEXTO_TERMO_CUSTOM =
  'Declaro estar ciente das condições específicas desta experiência de bem-estar ' +
  'e das orientações do organizador.';

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
  for (const eventoId of [EVENTO, EVENTO_CUSTOM]) {
    const eventoRef = db.collection('eventos').doc(eventoId);
    batch.set(eventoRef, {
      id: eventoId,
      tenantId: TENANT_ID,
      organizadorId: MARINA.uid,
      nome: `RN-439 ${eventoId}`,
      data: tsRel(45),
      local: 'Florianópolis/SC',
      modalidades: ['10k'],
      slug: eventoId,
      status: 'publicado',
      usaChip: false,
      qtdInscritos: 0,
      receitaConfirmada: 0,
      criadoEm: now,
      atualizadoEm: now,
    });
    batch.set(eventoRef.collection('lotes').doc(`${eventoId}-10k-l1`), {
      id: `${eventoId}-10k-l1`,
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
    // Política de vendas REAL (versão 1) — é ela que a V2 faz envelhecer.
    batch.set(eventoRef.collection('politicaVendas').doc('config'), {
      id: 'config',
      tenantId: TENANT_ID,
      ...politicaVendasPadrao(),
      versao: 1,
      atualizadoEm: now,
    });
  }
  // Termo de saúde PRÓPRIO do organizador, ATIVO, versão 3 (RN-156/RN-441).
  batch.set(db.doc(`eventos/${EVENTO_CUSTOM}/termoSaude/config`), {
    id: 'config',
    tenantId: TENANT_ID,
    texto: TEXTO_TERMO_CUSTOM,
    versao: 3,
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

/** Input do checkout com as versões EXIBIDAS parametrizadas. */
function entrada(
  eventoId: string,
  key: string,
  aceites: CreateInscricaoChargeInput['aceites']
): CreateInscricaoChargeInput {
  return {
    eventoId,
    inscritos: [inscritoAna],
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
    aceites,
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
  };
}

/** Executa e devolve o erro (a suíte inteira gira em torno de recusas). */
async function recusa(input: CreateInscricaoChargeInput): Promise<unknown> {
  try {
    await createInscricaoChargeCore(db, provider, input, comprador);
  } catch (err) {
    return err;
  }
  throw new Error('esperava recusa e a compra concluiu');
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
  process.env['CRM_ID_PEPPER'] ??= 'pepper-de-teste-rn439';
  await seed();
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

// =============================================================================
// V1 + V4 — o caminho feliz, e a prova de que a versão exibida morre no gate
// =============================================================================
describe('RN-439 · versão exibida CONFERE', () => {
  it('V1 — exibida == vigente: a compra conclui', async () => {
    const r = await createInscricaoChargeCore(
      db,
      provider,
      entrada(EVENTO, 'rn439-ok-0000001', {
        termos: true,
        saude: true,
        versoesExibidas: { termos: 1, saude: TERMO_SAUDE_VERSAO_VIGENTE },
      }),
      comprador
    );
    expect(r.pedidoId.length).toBeGreaterThan(0);
    expect(r.chargeId.length).toBeGreaterThan(0);
  });

  it('V4 — a versão EXIBIDA nunca é gravada; a carimbada é a que o servidor leu', async () => {
    const r = await createInscricaoChargeCore(
      db,
      provider,
      entrada(EVENTO, 'rn439-grava-000001', {
        termos: true,
        saude: true,
        versoesExibidas: { termos: 1, saude: TERMO_SAUDE_VERSAO_VIGENTE },
      }),
      comprador
    );
    const pedido = await db.doc(`pedidos/${r.pedidoId}`).get();
    const aceites = pedido.get('aceites') as Record<string, unknown>;
    // O bloco é o de sempre: versão + carimbo + hash do material.
    expect(aceites['versoesExibidas']).toBeUndefined();
    expect(JSON.stringify(aceites)).not.toContain('versoesExibidas');
    const termos = aceites['termos'] as Record<string, unknown>;
    expect(termos['versao']).toBe(1); // a VIGENTE, lida na tx
    expect(typeof termos['materialHash']).toBe('string');
    const saude = aceites['saude'] as Record<string, unknown>;
    expect(saude['versao']).toBe(TERMO_SAUDE_VERSAO_VIGENTE);
  });

  it('V6 — cliente SEM o campo compra como antes (evolução de schema)', async () => {
    const r = await createInscricaoChargeCore(
      db,
      provider,
      entrada(EVENTO, 'rn439-legado-00001', { termos: true, saude: true }),
      comprador
    );
    const pedido = await db.doc(`pedidos/${r.pedidoId}`).get();
    expect((pedido.get('aceites.termos') as Record<string, unknown>)['versao']).toBe(1);
  });
});

// =============================================================================
// V2 + V3 + V5 — a divergência recusa, recusa antes de escrever, e não vaza
// =============================================================================
describe('RN-439 · versão exibida DIVERGE', () => {
  it('V2 — política bumpada entre o aceite e a compra: recusa com motivo tipado, e NADA é escrito', async () => {
    // O organizador publica a versão 2 enquanto a pessoa preenchia.
    await db
      .doc(`eventos/${EVENTO}/politicaVendas/config`)
      .set({ versao: 2, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });

    const key = 'rn439-diverge-00001';
    const err = (await recusa(
      entrada(EVENTO, key, {
        termos: true,
        saude: true,
        // A tela exibiu a 1 — a vigente já é 2.
        versoesExibidas: { termos: 1, saude: TERMO_SAUDE_VERSAO_VIGENTE },
      })
    )) as { code?: string; details?: { motivo?: string } };

    expect(err.code?.split('/').pop()).toBe('failed-precondition');
    expect(err.details?.motivo).toBe(MOTIVO_ACEITE_VERSAO_DIVERGENTE);

    // Antes de QUALQUER escrita: o pedido não existe.
    const { pedidoId } = idsDoCheckout(comprador.uid, key, 0);
    expect((await db.doc(`pedidos/${pedidoId}`).get()).exists).toBe(false);
    const inscritos = await db
      .collection(`eventos/${EVENTO}/inscritos`)
      .where('pedidoRef', '==', pedidoId)
      .get();
    expect(inscritos.empty).toBe(true);

    // Restaura a vigente para os casos seguintes.
    await db
      .doc(`eventos/${EVENTO}/politicaVendas/config`)
      .set({ versao: 1 }, { merge: true });
  });

  it('V3 — a recusa não vaza o material novo nem o instante da publicação', async () => {
    await db.doc(`eventos/${EVENTO}/politicaVendas/config`).set(
      {
        versao: 7,
        // Material NOVO, com um marcador que não pode aparecer na recusa.
        reembolso: { ...politicaVendasPadrao().reembolso, slaAnaliseDias: 29 },
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const err = (await recusa(
      entrada(EVENTO, 'rn439-mudo-00000001', {
        termos: true,
        saude: true,
        versoesExibidas: { termos: 1, saude: TERMO_SAUDE_VERSAO_VIGENTE },
      })
    )) as { message?: string; details?: unknown };

    const superficie = `${err.message ?? ''} ${JSON.stringify(err.details ?? {})}`;
    // A versão nova não atravessa…
    expect(superficie).not.toContain('7');
    // …nem o parâmetro que mudou no material…
    expect(superficie).not.toContain('29');
    // …nem carimbo de tempo em nenhuma forma reconhecível.
    expect(superficie).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(superficie).not.toMatch(/atualizadoEm|publicad|seconds/i);
    // O que ele DIZ é o que a pessoa tem de fazer.
    expect(err.message ?? '').toContain('aceite');

    await db
      .doc(`eventos/${EVENTO}/politicaVendas/config`)
      .set({ versao: 1, ...politicaVendasPadrao() }, { merge: true });
  });

  it('V5 — o termo de saúde BASE entra na conferência pelo mesmo critério', async () => {
    const err = (await recusa(
      entrada(EVENTO, 'rn439-saude-0000001', {
        termos: true,
        saude: true,
        // Tela de uma build anterior, que exibia outra versão do template.
        versoesExibidas: {
          termos: 1,
          saude: TERMO_SAUDE_VERSAO_VIGENTE + 1,
        },
      })
    )) as { details?: { motivo?: string } };
    expect(err.details?.motivo).toBe(MOTIVO_ACEITE_VERSAO_DIVERGENTE);
  });

  it('V7 — termo custom ATIVO: aceitar sem dizer QUAL versão foi vista é divergência', async () => {
    const err = (await recusa(
      entrada(EVENTO_CUSTOM, 'rn439-custom-000001', {
        termos: true,
        saude: true,
        saudeCustom: true,
        // `saudeCustom` ausente aqui: o cliente afirma aceite de um material
        // que não identificou. `undefined !== 3` — diverge de propósito.
        versoesExibidas: { termos: 1, saude: TERMO_SAUDE_VERSAO_VIGENTE },
      })
    )) as { details?: { motivo?: string } };
    expect(err.details?.motivo).toBe(MOTIVO_ACEITE_VERSAO_DIVERGENTE);
  });

  it('V7b — GUARDA: com a versão do termo custom certa, a compra conclui', async () => {
    const r = await createInscricaoChargeCore(
      db,
      provider,
      entrada(EVENTO_CUSTOM, 'rn439-custom-ok0001', {
        termos: true,
        saude: true,
        saudeCustom: true,
        versoesExibidas: {
          termos: 1,
          saude: TERMO_SAUDE_VERSAO_VIGENTE,
          saudeCustom: 3,
        },
      }),
      comprador
    );
    const pedido = await db.doc(`pedidos/${r.pedidoId}`).get();
    const custom = pedido.get('aceites.saudeCustom') as Record<string, unknown>;
    expect(custom['versao']).toBe(3);
    expect(typeof custom['materialHash']).toBe('string');
  });
});
