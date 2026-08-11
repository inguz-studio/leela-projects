/**
 * saudeTenant.integration.test.ts — lane METRICAS-PAGANTES-BACKEND (E16 · RN-409)
 *
 * Integração REAL no Firestore Emulator: `recomputarSaudeTenant` e o backfill
 * `recomputarSaudeDeTodosOsTenants`.
 *
 * O que estes casos pinam:
 *   - `tenants/{id}.gmvAcumulado` PASSA A TER ESCRITOR (nascia 0 no
 *     provisionamento e nenhuma Function o tocava — o macro do admin exibia
 *     GMV e Receita Leela zerados para sempre);
 *   - `eventosAtivos` idem: sem escritor, `deriveTenantHealth` carimbava todo
 *     tenant ativo como 'atencao';
 *   - o GMV é o valor de face CONFIRMADO e portanto CAI no estorno — o campo
 *     não é um acumulador monotônico que ignora reembolso;
 *   - isolamento entre tenants, idempotência (2ª rodada = no-op) e a cadeia
 *     completa até `platform/rollups` deixando de mostrar zero.
 *
 * Pré-requisito: Firestore Emulator 8080.
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  recomputarSaudeDeTodosOsTenants,
  recomputarSaudeTenant,
} from '../platform/agregarSaudeTenant';
import { recomputePlatformRollupsCore } from '../platform/rollups';

const PROJECT_ID = 'demo-leela';
const CASTELO = 'castelo-producoes';
const PASSO = 'passo-certo';

type AnyRec = Record<string, unknown>;

let db: admin.firestore.Firestore;

async function seedTenant(id: string, feePct?: number): Promise<void> {
  await db.doc(`tenants/${id}`).set({
    id,
    nome: id,
    slug: id,
    status: 'ativo',
    ownerUid: `uid-${id}`,
    tipo: 'produtor',
    // Estado REAL de hoje: provisionTenant cria os dois campos zerados.
    gmvAcumulado: 0,
    eventosAtivos: 0,
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
  if (feePct !== undefined) {
    await db.doc(`tenants/${id}/commercialTerms/current`).set({
      platformFeePct: feePct,
      installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
      anticipation: { disponivel: false },
      communityMonthlyEnabled: false,
      saasMonthlyFee: 0,
      versao: 1,
      atualizadoPor: 'uid-platform-admin',
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  }
}

async function seedEvento(
  id: string,
  tenantId: string,
  status: string,
  receitaConfirmada: number
): Promise<void> {
  await db.doc(`eventos/${id}`).set({
    id,
    tenantId,
    organizadorId: `uid-${tenantId}`,
    nome: id,
    slug: id,
    status,
    qtdInscritos: 0,
    receitaConfirmada,
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
}

beforeAll(() => {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
});

beforeEach(async () => {
  const collections = await db.listCollections();
  for (const col of collections) {
    const docs = await col.listDocuments();
    for (const ref of docs) {
      await db.recursiveDelete(ref);
    }
  }
});

describe('recomputarSaudeTenant — gmvAcumulado + eventosAtivos (E16)', () => {
  it('grava Σ receitaConfirmada e a contagem de eventos públicos (o campo deixa de ser 0 eterno)', async () => {
    await seedTenant(CASTELO);
    await seedEvento('meia-floripa', CASTELO, 'publicado', 85617);
    await seedEvento('serra-do-mar', CASTELO, 'ao_vivo', 40000);
    await seedEvento('retiro', CASTELO, 'rascunho', 16663);
    await seedEvento('antiga', CASTELO, 'encerrado', 12000);

    const saude = await recomputarSaudeTenant(db, CASTELO);

    // GMV soma TODOS os eventos (rascunho e encerrado venderam dinheiro de
    // verdade); `eventosAtivos` conta só publicado/ao_vivo.
    expect(saude).toMatchObject({
      gmvAcumulado: 154280,
      eventosAtivos: 2,
      eventosVarridos: 4,
      escreveu: true,
    });

    const tenant = await db.doc(`tenants/${CASTELO}`).get();
    expect(tenant.get('gmvAcumulado')).toBe(154280);
    expect(tenant.get('eventosAtivos')).toBe(2);
  });

  it('eventos de OUTRO tenant não vazam para o GMV', async () => {
    await seedTenant(CASTELO);
    await seedTenant(PASSO);
    await seedEvento('do-castelo', CASTELO, 'publicado', 1000);
    await seedEvento('do-passo', PASSO, 'publicado', 999999);

    expect((await recomputarSaudeTenant(db, CASTELO))?.gmvAcumulado).toBe(1000);
    expect((await recomputarSaudeTenant(db, PASSO))?.gmvAcumulado).toBe(999999);
  });

  it('o GMV CAI no estorno — não é acumulador monotônico', async () => {
    await seedTenant(CASTELO);
    await seedEvento('meia-floripa', CASTELO, 'publicado', 1000);
    await recomputarSaudeTenant(db, CASTELO);
    expect((await db.doc(`tenants/${CASTELO}`).get()).get('gmvAcumulado')).toBe(1000);

    // `estornarInscricao` reverte o face em eventos/{id}.receitaConfirmada.
    await db.doc('eventos/meia-floripa').update({ receitaConfirmada: 750 });

    const saude = await recomputarSaudeTenant(db, CASTELO);
    expect(saude?.gmvAcumulado).toBe(750);
    expect(saude?.escreveu).toBe(true);
  });

  it('IDEMPOTÊNCIA: 2ª rodada sobre o mesmo estado é no-op (atualizadoEm intocado)', async () => {
    await seedTenant(CASTELO);
    await seedEvento('meia-floripa', CASTELO, 'publicado', 85617);

    const primeira = await recomputarSaudeTenant(db, CASTELO);
    expect(primeira?.escreveu).toBe(true);
    const carimbo = (await db.doc(`tenants/${CASTELO}`).get()).get('atualizadoEm');

    const segunda = await recomputarSaudeTenant(db, CASTELO);
    expect(segunda?.escreveu).toBe(false);
    expect(segunda?.gmvAcumulado).toBe(primeira?.gmvAcumulado);

    // A prova de fora: sem escrita, o carimbo do servidor não se move.
    expect((await db.doc(`tenants/${CASTELO}`).get()).get('atualizadoEm')).toEqual(carimbo);
  });

  it('tenant sem evento algum → zeros honestos, sem lançar', async () => {
    await seedTenant(CASTELO);
    const saude = await recomputarSaudeTenant(db, CASTELO);
    expect(saude).toMatchObject({ gmvAcumulado: 0, eventosAtivos: 0, escreveu: false });
  });

  it('tenantId órfão → null e NENHUM doc de tenant criado por efeito colateral', async () => {
    await seedEvento('sem-dono', 'tenant-que-nao-existe', 'publicado', 500);

    expect(await recomputarSaudeTenant(db, 'tenant-que-nao-existe')).toBeNull();
    expect((await db.doc('tenants/tenant-que-nao-existe').get()).exists).toBe(false);
    expect(await recomputarSaudeTenant(db, '')).toBeNull();
  });

  it('receitaConfirmada ausente/lixo conta como 0 (não contamina o GMV com NaN)', async () => {
    await seedTenant(CASTELO);
    await db.doc('eventos/legado').set({
      id: 'legado',
      tenantId: CASTELO,
      nome: 'legado',
      slug: 'legado',
      status: 'publicado',
      // sem `receitaConfirmada`
    });
    await db.doc('eventos/corrompido').set({
      id: 'corrompido',
      tenantId: CASTELO,
      nome: 'corrompido',
      slug: 'corrompido',
      status: 'publicado',
      receitaConfirmada: 'muito dinheiro',
    });
    await seedEvento('bom', CASTELO, 'publicado', 100.55);

    const saude = await recomputarSaudeTenant(db, CASTELO);
    expect(saude?.gmvAcumulado).toBe(100.55);
    expect(saude?.eventosAtivos).toBe(3);
  });

  it('status fora do enum não vira evento ativo', async () => {
    await seedTenant(CASTELO);
    await seedEvento('lixo', CASTELO, 'status-inventado', 10);

    const saude = await recomputarSaudeTenant(db, CASTELO);
    expect(saude?.eventosAtivos).toBe(0);
    expect(saude?.gmvAcumulado).toBe(10);
  });
});

describe('recomputarSaudeDeTodosOsTenants — BACKFILL (passo separado de deploy)', () => {
  it('corrige TODOS os tenants zerados e é re-executável sem reescrever', async () => {
    await seedTenant(CASTELO);
    await seedTenant(PASSO);
    await seedEvento('do-castelo', CASTELO, 'publicado', 1000);
    await seedEvento('do-passo', PASSO, 'ao_vivo', 500);

    const primeira = await recomputarSaudeDeTodosOsTenants(db);
    expect(primeira).toEqual({ tenants: 2, escritos: 2 });
    expect((await db.doc(`tenants/${CASTELO}`).get()).get('gmvAcumulado')).toBe(1000);
    expect((await db.doc(`tenants/${PASSO}`).get()).get('gmvAcumulado')).toBe(500);

    // Re-executar não move nada — o backfill pode rodar duas vezes sem medo.
    expect(await recomputarSaudeDeTodosOsTenants(db)).toEqual({ tenants: 2, escritos: 0 });
  });
});

describe('cadeia até platform/rollups — o macro do admin deixa de mostrar zero', () => {
  it('antes do escritor o rollup dá R$ 0,00; depois dele, o número real', async () => {
    await seedTenant(CASTELO, 10.5);
    await seedEvento('meia-floripa', CASTELO, 'publicado', 1000);

    // O defeito, reproduzido: tenant com R$ 1.000 vendidos e GMV/receita 0.
    const antes = await recomputePlatformRollupsCore(db);
    expect(antes.gmvTotal).toBe(0);
    expect(antes.receitaLeelaTotal).toBe(0);
    const saudeAntes = (await db.doc('platform/rollups').get()).get('tenants') as AnyRec;
    expect(saudeAntes[CASTELO]).toMatchObject({ gmv: 0, health: 'atencao' });

    await recomputarSaudeTenant(db, CASTELO);

    const depois = await recomputePlatformRollupsCore(db);
    expect(depois.gmvTotal).toBe(1000);
    expect(depois.receitaLeelaTotal).toBe(105); // 10,5% de 1.000
    const saudeDepois = (await db.doc('platform/rollups').get()).get('tenants') as AnyRec;
    expect(saudeDepois[CASTELO]).toMatchObject({
      gmv: 1000,
      receitaLeela: 105,
      eventosAtivos: 1,
      // 'atencao' era o carimbo de "conta operável mas parada" — com evento no
      // ar, o tenant finalmente aparece como saudável.
      health: 'saudavel',
    });
  });
});
