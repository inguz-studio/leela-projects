/**
 * inscritoPedidoRules.integration.test.ts — LEELA-FABLE-A-T2 (ADR-011)
 *
 * Integração (⚠️ EXIGE Firestore Emulator na 8080 — gate CONSOLIDADO do
 * maestro, NÃO roda no gate serial da task): projeção `Inscrito`
 * enriquecida + join `[pag]` do slide-in contra as Security Rules reais.
 *
 * Cobre:
 *   - seedInscritos → seedPedidos (ordem!) grava enriquecimento legível
 *   - organizador lê inscrito enriquecido ([reg] + tamanhos + pedidoRef)
 *   - join inscrito → pedido → pagamento (getPedidoEPagamentoDoInscrito)
 *   - pendente SEM cobrança → pagamento null (ausência honesta)
 *   - inscrito legado (sem pedidoRef) → fallback por query devolve null
 *   - cross-tenant NÃO lê pedido do join (permission-denied)
 *   - ref pendurada (pedidoRef → doc inexistente) → VinculoPedidoCorrompido
 *   - cliente NÃO escreve os campos de Function novos (pedidoRef/
 *     ehResponsavel/dadosPessoais/tamanhos) — Rules aplicadas (2c01306),
 *     describe ativo (sem .skip).
 */

import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { doc, getDoc, updateDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { parseInscrito, valorPagoPeloComprador } from '@leela/core';
// Import DIRETO do módulo (precedente qrToken.test.ts): o re-export em
// packages/api-client/src/index.ts é proposta p/ o maestro (fora da raia A-T2)
import {
  getPedidoEPagamentoDoInscrito,
  VinculoPedidoCorrompidoError,
  VINCULO_PEDIDO_CORROMPIDO,
} from '../../../packages/api-client/src/eventos/inscritoPedido';
import { seedEventos, MEIA_FLORIPA_ID } from '../seed/eventos.seed';
import { seedInscritos } from '../seed/inscritos.seed';
import { seedPedidos } from '../seed/pedidos.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';

const marinaClaims = { role: 'tenant_owner', tenantId: CASTELO_ID };
const passoClaims = { role: 'tenant_owner', tenantId: PASSO_ID };

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

async function seedTenantsBase(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
    status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

async function lerInscrito(db: Firestore, inscritoId: string) {
  const snap = await getDoc(
    doc(db, 'eventos', MEIA_FLORIPA_ID, 'inscritos', inscritoId)
  );
  expect(snap.exists()).toBe(true);
  return parseInscrito(snap.id, snap.data() as Record<string, unknown>);
}

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
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();

  await testEnv.clearFirestore();
  await seedTenantsBase();
  await seedEventos(adminDb);
  await seedInscritos(adminDb); // ORDEM: inscritos ANTES (set regrava o doc)
  await seedPedidos(adminDb);
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('projeção enriquecida legível pelo organizador (A-T2)', () => {
  it('inscrito responsável de grupo traz [reg], tamanhos vazio (ouro) e link', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const inscrito = await lerInscrito(db, 'insc-0001');

    expect(inscrito.pedidoRef).toBe('ped-0001');
    expect(inscrito.ehResponsavel).toBe(true);
    expect(inscrito.dadosPessoais?.cpf).toBeDefined();
    expect(inscrito.dadosPessoais?.uf).toBe('SC');
    expect(inscrito.tamanhos).toEqual({}); // kit_ouro sem camiseta no catálogo
  });

  it('inscrito kit_prata traz tamanho por item tamanhado (RN-223)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const inscrito = await lerInscrito(db, 'insc-0050');
    expect(inscrito.tamanhos['camiseta-tecnica']).toMatch(/^(P|M|G|GG)$/);
  });

  it('inscrito NÃO enriquecido continua parseando (defaults legados)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const inscrito = await lerInscrito(db, 'insc-0100');
    expect(inscrito.pedidoRef).toBeNull();
    expect(inscrito.ehResponsavel).toBe(false);
    expect(inscrito.dadosPessoais).toBeUndefined();
  });
});

describe('join [pag] do slide-in (getPedidoEPagamentoDoInscrito)', () => {
  it('grupo pago: pedido + pagamento coerentes p/ responsável e não-responsável', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);

    for (const inscritoId of ['insc-0001', 'insc-0002']) {
      const inscrito = await lerInscrito(db, inscritoId);
      const { pedido, pagamento } = await getPedidoEPagamentoDoInscrito(db, {
        tenantId: CASTELO_ID,
        eventoId: MEIA_FLORIPA_ID,
        inscrito,
      });
      expect(pedido?.id).toBe('ped-0001');
      expect(pedido?.status).toBe('pago');
      expect(pedido?.inscritoRefs).toContain(inscritoId);
      expect(pagamento?.status).toBe('confirmado');
      expect(pagamento?.cupom?.codigo).toBe('HEROI10');
      expect(pagamento?.conciliacao?.gateway).toBe('asaas');
      // "à vista p/ organizador · parcelado p/ atleta"
      expect(valorPagoPeloComprador(pagamento!)).toBeGreaterThanOrEqual(
        pagamento!.valorFinal
      );
    }
  });

  it('pendente SEM cobrança: pedido presente, pagamento null (honesto)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const inscrito = await lerInscrito(db, 'insc-0040');
    const { pedido, pagamento } = await getPedidoEPagamentoDoInscrito(db, {
      tenantId: CASTELO_ID,
      eventoId: MEIA_FLORIPA_ID,
      inscrito,
    });
    expect(pedido?.status).toBe('pendente');
    expect(pedido?.pagamentoRef).toBeNull();
    expect(pagamento).toBeNull();
  });

  it('legado sem pedidoRef: fallback por query devolve pedido/pagamento null', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const inscrito = await lerInscrito(db, 'insc-0100');
    const resultado = await getPedidoEPagamentoDoInscrito(db, {
      tenantId: CASTELO_ID,
      eventoId: MEIA_FLORIPA_ID,
      inscrito,
    });
    expect(resultado).toEqual({ pedido: null, pagamento: null });
  });

  it('cross-tenant: outro tenant NÃO faz o join (permission-denied)', async () => {
    const dbPasso = dbAs(PASSO_OWNER_UID, passoClaims);
    await expect(
      getPedidoEPagamentoDoInscrito(dbPasso, {
        tenantId: PASSO_ID,
        eventoId: MEIA_FLORIPA_ID,
        inscrito: {
          id: 'insc-0001',
          atletaId: 'atleta-0001',
          pedidoRef: 'ped-0001',
          ehResponsavel: true,
        },
      })
    ).rejects.toThrow();
  });

  it('ref pendurada: pedidoRef → doc inexistente vira VinculoPedidoCorrompido', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    // Organizador do PRÓPRIO tenant, mas pedidoRef aponta para um pedido que
    // não existe (resource == null nas Rules → permission-denied no fio). O
    // caminho por ref TIPA isso como vínculo corrompido, não como autorização.
    const promessa = getPedidoEPagamentoDoInscrito(db, {
      tenantId: CASTELO_ID,
      eventoId: MEIA_FLORIPA_ID,
      inscrito: {
        id: 'insc-dangling',
        atletaId: 'atleta-9999',
        pedidoRef: 'ped-inexistente-9999',
        ehResponsavel: false,
      },
    });
    await expect(promessa).rejects.toBeInstanceOf(VinculoPedidoCorrompidoError);
    await expect(promessa).rejects.toMatchObject({
      code: VINCULO_PEDIDO_CORROMPIDO,
      ref: 'ped-inexistente-9999',
      tipo: 'pedido',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Os novos CAMPOS_FUNCTION_INSCRITO são espelhados nas Rules de `inscritos`
// (semCamposDeFunctionInscrito / camposDeFunctionIntocados — aplicado em
// 2c01306): um tenant_writer NÃO escreve pedidoRef/ehResponsavel/
// dadosPessoais/tamanhos por update direto. describe ATIVO (sem .skip).
// ─────────────────────────────────────────────────────────────────────────
describe('rules aplicadas: campos do checkout são só-Function (A-T2)', () => {
  it('update de cliente NÃO toca pedidoRef/ehResponsavel/dadosPessoais/tamanhos/kitId', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const ref = doc(db, 'eventos', MEIA_FLORIPA_ID, 'inscritos', 'insc-0001');
    await assertFails(updateDoc(ref, { pedidoRef: 'ped-forjado' }));
    await assertFails(updateDoc(ref, { ehResponsavel: false }));
    await assertFails(updateDoc(ref, { 'dadosPessoais.cpf': '111.111.111-11' }));
    await assertFails(updateDoc(ref, { tamanhos: { 'camiseta-tecnica': 'XG' } }));
    // Follow-up review kit (E12): kitId (kit COBRADO) é só-Function também.
    await assertFails(updateDoc(ref, { kitId: 'kit-forjado' }));
  });
});
