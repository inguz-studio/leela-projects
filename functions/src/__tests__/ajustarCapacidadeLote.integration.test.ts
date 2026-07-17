/**
 * ajustarCapacidadeLote.integration.test.ts — LEELA-S307-T1 (RN-304)
 * (⚠️ EXIGE Firestore Emulator 8080 — projectId demo-leela.)
 *
 * Aceites do épico (E04 §S307) provados contra o Emulator:
 *   A1. 100/100 vendidos → sobe p/ 150 ⇒ persiste 150, disponível 50
 *       (lote esgotado REABRE por derivação — loteAtivo volta a devolvê-lo).
 *   A2. 100 vendidos → tenta 80 ⇒ failed-precondition e NADA muda.
 *   A3. Cliente escrevendo qtdLimite direto em lote VENDIDO ⇒ Rule NEGA.
 *   A4. Ajuste válido ⇒ auditoria registra ator/de/para/motivo/carimbo.
 * Ataques extras: papel (staff/promoter/athlete/papel-de-evento negados),
 * cross-tenant, no-op idempotente (sem write/auditoria), `vendidos` intocado,
 * teto sanitário 1M, input malformado.
 *
 * Comando: npx firebase-tools@13 emulators:exec --only firestore --project demo-leela \
 *   "npx vitest run src/__tests__/ajustarCapacidadeLote.integration.test.ts"
 */
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { doc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { loteAtivo, parseLote, type AuthClaims } from '@leela/core';
import {
  ajustarCapacidadeLoteCore,
  TIPO_AUDITORIA_CAPACIDADE,
} from '../eventos/ajustarCapacidadeLote';
import { AUDITORIA_ACESSOS_COL } from '../finance/getBankDetailsForPayout';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'meia-floripa-2026';
const LOTE_ESGOTADO = '10k-lote-1';
const LOTE_FOLGADO = '10k-lote-2';

const OWNER = { uid: MARINA_UID, claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims };
const STAFF = { uid: 'uid-staff', claims: { role: 'tenant_staff', tenantId: CASTELO_ID } as AuthClaims };
const PROMOTER = { uid: 'uid-prom', claims: { role: 'promoter', tenantId: CASTELO_ID } as AuthClaims };
const ATHLETE = { uid: 'uid-atl', claims: { role: 'athlete' } as AuthClaims };
const OWNER_B = { uid: 'uid-passo', claims: { role: 'tenant_owner', tenantId: PASSO_ID } as AuthClaims };

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp => Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

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
}, 30_000);

beforeEach(async () => {
  await testEnv.clearFirestore();
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  for (const [id, ownerUid] of [
    [CASTELO_ID, MARINA_UID],
    [PASSO_ID, 'uid-passo'],
  ] as const) {
    batch.set(adminDb.collection('tenants').doc(id), {
      id, nome: id, slug: id, status: 'ativo', ownerUid, tipo: 'produtor',
      criadoEm: now, atualizadoEm: now,
    });
  }
  const eventoRef = adminDb.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Meia Floripa', slug: EVENTO_ID, status: 'publicado',
    data: tsRel(45), local: 'Florianópolis', modalidades: ['10k'],
    usaChip: false, qtdInscritos: 100, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });
  // Lote ESGOTADO (100/100, janela aberta) — o alvo da reabertura A1
  batch.set(eventoRef.collection('lotes').doc(LOTE_ESGOTADO), {
    id: LOTE_ESGOTADO, tenantId: CASTELO_ID, modalidade: '10k', ordem: 1,
    nome: 'Lote 1', inicioEm: tsRel(-5), fimEm: tsRel(20),
    quantidadeLimite: 100, preco: 90, vendidos: 100,
    encerradoEm: Timestamp.now(), encerradoMotivo: 'quantidade',
    criadoEm: now, atualizadoEm: now,
  });
  // Lote com folga (30/100) — casos de redução/no-op
  batch.set(eventoRef.collection('lotes').doc(LOTE_FOLGADO), {
    id: LOTE_FOLGADO, tenantId: CASTELO_ID, modalidade: '10k', ordem: 2,
    nome: 'Lote 2', inicioEm: tsRel(21), fimEm: tsRel(40),
    quantidadeLimite: 100, preco: 110, vendidos: 30,
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

const loteDoc = async (loteId: string) =>
  adminDb.doc(`eventos/${EVENTO_ID}/lotes/${loteId}`).get();

const input = (loteId: string, novaCapacidade: number, motivo = 'reabrindo vagas p/ demanda') => ({
  eventoId: EVENTO_ID,
  loteId,
  novaCapacidade,
  motivo,
});

describe('RN-304 · aceites do épico', () => {
  it('A1: 100/100 → 150 ⇒ persiste, disponível 50 e o lote REABRE (derivação)', async () => {
    const r = await ajustarCapacidadeLoteCore(adminDb, input(LOTE_ESGOTADO, 150), OWNER);
    expect(r.alterado).toBe(true);
    expect(r.capacidadeAnterior).toBe(100);
    expect(r.capacidade).toEqual({ configurado: 150, vendido: 100, disponivel: 50 });

    const snap = await loteDoc(LOTE_ESGOTADO);
    expect(snap.get('quantidadeLimite')).toBe(150);
    expect(snap.get('vendidos')).toBe(100); // ∑ INTOCADO
    expect(snap.get('capacidadeAjustadaEm')).toBeTruthy();

    // Reabertura por DERIVAÇÃO: o kernel volta a devolver o lote como ativo
    const lote = parseLote(snap.id, snap.data() as Record<string, unknown>);
    expect(loteAtivo([lote], new Date())?.id).toBe(LOTE_ESGOTADO);
    // Carimbo de virada NÃO é apagado (trilha monotônica)
    expect(snap.get('encerradoEm')).toBeTruthy();
  });

  it('A2: 100 vendidos → 80 ⇒ failed-precondition e NADA muda', async () => {
    await expect(
      ajustarCapacidadeLoteCore(adminDb, input(LOTE_ESGOTADO, 80), OWNER)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    const snap = await loteDoc(LOTE_ESGOTADO);
    expect(snap.get('quantidadeLimite')).toBe(100);
    expect(snap.get('capacidadeAjustadaEm')).toBeUndefined();
    // Auditoria NÃO registra recusa de regra (nada foi efetivado)
    const audit = await adminDb
      .collection(AUDITORIA_ACESSOS_COL)
      .where('tipo', '==', TIPO_AUDITORIA_CAPACIDADE)
      .get();
    expect(audit.empty).toBe(true);
  });

  it('A2b: reduzir ATÉ o vendido é permitido (fecha vagas remanescentes)', async () => {
    const r = await ajustarCapacidadeLoteCore(adminDb, input(LOTE_FOLGADO, 30), OWNER);
    expect(r.alterado).toBe(true);
    expect(r.capacidade).toEqual({ configurado: 30, vendido: 30, disponivel: 0 });
  });

  it('A3 (Rules): cliente NÃO escreve qtdLimite direto em lote VENDIDO', async () => {
    const db = testEnv
      .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
      .firestore();
    await assertFails(
      updateDoc(doc(db, 'eventos', EVENTO_ID, 'lotes', LOTE_ESGOTADO), {
        quantidadeLimite: 150,
      })
    );
  });

  it('A4: ajuste efetivado registra auditoria (ator/de/para/motivo)', async () => {
    await ajustarCapacidadeLoteCore(adminDb, input(LOTE_ESGOTADO, 200, 'lote extra liberado'), OWNER);
    const audit = await adminDb
      .collection(AUDITORIA_ACESSOS_COL)
      .where('tipo', '==', TIPO_AUDITORIA_CAPACIDADE)
      .get();
    expect(audit.size).toBe(1);
    const reg = audit.docs[0]!.data();
    expect(reg['uid']).toBe(MARINA_UID);
    expect(reg['de']).toBe(100);
    expect(reg['para']).toBe(200);
    expect(reg['motivo']).toBe('lote extra liberado');
    expect(reg['eventoId']).toBe(EVENTO_ID);
    expect(reg['loteId']).toBe(LOTE_ESGOTADO);
    expect(reg['em']).toBeTruthy();
  });
});

describe('RN-304 · ataques', () => {
  it('papel: staff, promoter, athlete e papel-de-evento NÃO ajustam (owner-only)', async () => {
    // Papel de EVENTO (organizador via claims.eventos) sem role tenant_owner
    // também é negado — papel de evento restringe ÁREAS, não vira owner
    // (review S307 — lacuna de fidelidade do teste).
    const PAPEL_EVENTO = {
      uid: 'uid-org-evento',
      claims: {
        role: 'athlete',
        eventos: { [EVENTO_ID]: 'organizador' },
      } as unknown as AuthClaims,
    };
    for (const caller of [STAFF, PROMOTER, ATHLETE, PAPEL_EVENTO]) {
      await expect(
        ajustarCapacidadeLoteCore(adminDb, input(LOTE_ESGOTADO, 150), caller)
      ).rejects.toMatchObject({ code: 'permission-denied' });
    }
  });

  it('cross-tenant: owner de OUTRO tenant ⇒ permission-denied e nada muda', async () => {
    await expect(
      ajustarCapacidadeLoteCore(adminDb, input(LOTE_ESGOTADO, 150), OWNER_B)
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect((await loteDoc(LOTE_ESGOTADO)).get('quantidadeLimite')).toBe(100);
  });

  it('no-op idempotente: mesma capacidade ⇒ alterado=false, sem write nem auditoria', async () => {
    const r = await ajustarCapacidadeLoteCore(adminDb, input(LOTE_FOLGADO, 100), OWNER);
    expect(r.alterado).toBe(false);
    const snap = await loteDoc(LOTE_FOLGADO);
    expect(snap.get('capacidadeAjustadaEm')).toBeUndefined();
    const audit = await adminDb
      .collection(AUDITORIA_ACESSOS_COL)
      .where('tipo', '==', TIPO_AUDITORIA_CAPACIDADE)
      .get();
    expect(audit.empty).toBe(true);
  });

  it('payload malformado: capacidade float/0/1M+ e motivo curto ⇒ rejeitados', async () => {
    await expect(
      ajustarCapacidadeLoteCore(adminDb, input(LOTE_FOLGADO, 50.5), OWNER)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      ajustarCapacidadeLoteCore(adminDb, input(LOTE_FOLGADO, 0), OWNER)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(
      ajustarCapacidadeLoteCore(adminDb, input(LOTE_FOLGADO, 1_000_001), OWNER)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(
      ajustarCapacidadeLoteCore(adminDb, { ...input(LOTE_FOLGADO, 50), motivo: 'x' }, OWNER)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    // Review S307: NaN/Infinity/string/negativo — todos barrados ANTES de IO.
    for (const cap of [Number.NaN, Number.POSITIVE_INFINITY, '80' as unknown as number, -5]) {
      await expect(
        ajustarCapacidadeLoteCore(adminDb, input(LOTE_FOLGADO, cap), OWNER)
      ).rejects.toMatchObject({
        code: expect.stringMatching(/invalid-argument|failed-precondition/),
      });
    }
    // Ids com '/' ⇒ invalid-argument honesto (achado #4 — nunca 'internal').
    await expect(
      ajustarCapacidadeLoteCore(
        adminDb,
        { ...input(LOTE_FOLGADO, 50), eventoId: 'eventos/hack' },
        OWNER
      )
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      ajustarCapacidadeLoteCore(
        adminDb,
        { ...input(LOTE_FOLGADO, 50), loteId: 'a/b' },
        OWNER
      )
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('lote/evento inexistentes ⇒ not-found (nada criado)', async () => {
    await expect(
      ajustarCapacidadeLoteCore(adminDb, { ...input('lote-fantasma', 50) }, OWNER)
    ).rejects.toMatchObject({ code: 'not-found' });
    await expect(
      ajustarCapacidadeLoteCore(
        adminDb,
        { ...input(LOTE_FOLGADO, 50), eventoId: 'evento-fantasma' },
        OWNER
      )
    ).rejects.toMatchObject({ code: 'not-found' });
  });
});
