/**
 * inscritosRules.test.ts — LEELA-S203-T1
 *
 * Integração (Emulator): Security Rules da subcoleção
 * `eventos/{eventoId}/inscritos` + paginação por cursor do api-client.
 *
 * Cobre (aceite E03-L1):
 *   - 453 inscritos (seed real) paginados por cursor em páginas de 18 (§2.5)
 *   - Cross-tenant DENY: create E update E delete (e leitura/query)
 *   - RBAC por papel: owner/staff escrevem; promoter/athlete não
 *   - Shape: kit ∈ {kit_ouro,kit_prata,kit_basico,sem_kit} (RN-202),
 *     status ∈ enum (RN-204), chipNumero string|null (RN-203)
 *   - Carimbos de Function (kitEntregueEm/checkinEm/qrToken/ingressoEmitidoEm)
 *     NUNCA escritos pelo cliente (RN-205/221/222)
 *   - tenantId imutável + coerente com o evento pai (ADR-009/S1600)
 *
 * Pré-requisito: Firestore Emulator na porta 8080 (via emulators:exec).
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
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { listarInscritos, INSCRITOS_PAGE_SIZE } from '@leela/api-client';
import { seedEventos, MEIA_FLORIPA_ID } from '../seed/eventos.seed';
import {
  seedInscritos,
  TOTAL_INSCRITOS_MEIA_FLORIPA,
} from '../seed/inscritos.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const SUSPENSO_ID = 'tenant-suspenso';

const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';
const SUSPENSO_OWNER_UID = 'uid-suspenso-owner';
const PLATFORM_ADMIN_UID = 'uid-platform-admin';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

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
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}

function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
  return ctxAs(uid, claims).firestore() as unknown as Firestore;
}

const marinaClaims = { role: 'tenant_owner', tenantId: CASTELO_ID };
const staffClaims = { role: 'tenant_staff', tenantId: CASTELO_ID };
const promoterClaims = { role: 'promoter', tenantId: CASTELO_ID };
const passoClaims = { role: 'tenant_owner', tenantId: PASSO_ID };

async function seedTenantsBase(): Promise<void> {
  const now = admin.firestore.FieldValue.serverTimestamp();
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
  batch.set(adminDb.collection('tenants').doc(SUSPENSO_ID), {
    id: SUSPENSO_ID, nome: 'Tenant Suspenso', slug: SUSPENSO_ID,
    status: 'suspenso', ownerUid: SUSPENSO_OWNER_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

// ─────────────────────────────────────────────────────────────────────────
// Paginação por cursor — 453 reais, páginas de 18 (aceite L1)
// Seed pesado UMA vez para o bloco (testes read-only).
// ─────────────────────────────────────────────────────────────────────────
describe('paginação de inscritos por cursor (S203-T1)', () => {
  beforeAll(async () => {
    await testEnv.clearFirestore();
    await seedTenantsBase();
    await seedEventos(adminDb);
    await seedInscritos(adminDb);
  });

  it('varre as 26 páginas: 25×18 + 3, total 453, cursor estável sem duplicata', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);

    const tamanhos: number[] = [];
    const idsVistos = new Set<string>();
    let cursor: Awaited<ReturnType<typeof listarInscritos>>['proxCursor'] = null;
    let paginas = 0;

    do {
      const res = await listarInscritos(
        db,
        MEIA_FLORIPA_ID,
        cursor ? { cursor } : {}
      );
      tamanhos.push(res.itens.length);
      for (const inscrito of res.itens) {
        expect(idsVistos.has(inscrito.id)).toBe(false); // cursor nunca repete
        idsVistos.add(inscrito.id);
      }
      cursor = res.proxCursor;
      paginas++;
    } while (cursor !== null && paginas < 40);

    expect(paginas).toBe(26);
    expect(idsVistos.size).toBe(TOTAL_INSCRITOS_MEIA_FLORIPA);
    expect(tamanhos.slice(0, 25).every((t) => t === INSCRITOS_PAGE_SIZE)).toBe(true);
    expect(tamanhos[25]).toBe(453 - 25 * INSCRITOS_PAGE_SIZE); // 3
  });

  it('primeira página tem 18 itens ordenados por atletaNome', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const { itens, proxCursor } = await listarInscritos(db, MEIA_FLORIPA_ID);

    expect(itens).toHaveLength(INSCRITOS_PAGE_SIZE);
    expect(proxCursor).not.toBeNull();
    const nomes = itens.map((i) => i.atletaNome);
    expect([...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'))).toEqual(nomes);
  });

  it('staff do tenant também pagina (leitura por membro)', async () => {
    const db = dbAs('uid-staff-castelo', staffClaims);
    const { itens } = await listarInscritos(db, MEIA_FLORIPA_ID);
    expect(itens).toHaveLength(INSCRITOS_PAGE_SIZE);
  });

  it('owner de OUTRO tenant NÃO pagina inscritos (cross-tenant deny)', async () => {
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(
      getDocs(collection(db, 'eventos', MEIA_FLORIPA_ID, 'inscritos'))
    );
  });

  it('anônimo NÃO lê inscritos', async () => {
    const db = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
    await assertFails(
      getDocs(collection(db, 'eventos', MEIA_FLORIPA_ID, 'inscritos'))
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Escritas: cross-tenant, RBAC, shape, carimbos de Function
// Fixtures leves por teste.
// ─────────────────────────────────────────────────────────────────────────
describe('rules de escrita em inscritos (S203-T1)', () => {
  const EVENTO_PASSO = 'trail-ratones-2026';
  const EVENTO_SUSPENSO = 'evento-suspenso';

  function inscritoValido(overrides: Record<string, unknown> = {}) {
    return {
      id: 'insc-novo',
      tenantId: CASTELO_ID,
      atletaId: 'atleta-9999',
      atletaNome: 'Teste Manual',
      kit: 'sem_kit',
      chipNumero: null,
      status: 'pendente',
      modalidade: '5k',
      ...overrides,
    };
  }

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedTenantsBase();

    const batch = adminDb.batch();
    batch.set(adminDb.collection('eventos').doc(MEIA_FLORIPA_ID), {
      id: MEIA_FLORIPA_ID, tenantId: CASTELO_ID,
      organizadorId: MARINA_UID, nome: 'Meia Maratona Floripa 2026',
      status: 'publicado', usaChip: true,
    });
    batch.set(adminDb.collection('eventos').doc(EVENTO_PASSO), {
      id: EVENTO_PASSO, tenantId: PASSO_ID,
      organizadorId: PASSO_OWNER_UID, nome: 'Trail Run Ratones 2026',
      status: 'publicado', usaChip: false,
    });
    batch.set(adminDb.collection('eventos').doc(EVENTO_SUSPENSO), {
      id: EVENTO_SUSPENSO, tenantId: SUSPENSO_ID,
      organizadorId: SUSPENSO_OWNER_UID, nome: 'Evento Suspenso',
      status: 'rascunho', usaChip: false,
    });
    batch.set(
      adminDb.collection('eventos').doc(MEIA_FLORIPA_ID)
        .collection('inscritos').doc('insc-castelo-1'),
      {
        id: 'insc-castelo-1', tenantId: CASTELO_ID,
        atletaId: 'atleta-0001', atletaNome: 'Marina Silva',
        kit: 'kit_ouro', chipNumero: null,
        status: 'pendente', modalidade: '21k',
      }
    );
    batch.set(
      adminDb.collection('eventos').doc(EVENTO_PASSO)
        .collection('inscritos').doc('insc-passo-1'),
      {
        id: 'insc-passo-1', tenantId: PASSO_ID,
        atletaId: 'atleta-passo-1', atletaNome: 'Ricardo Haro',
        kit: 'kit_basico', chipNumero: null,
        status: 'confirmado', modalidade: '11k',
      }
    );
    await batch.commit();
  });

  function refInscrito(db: Firestore, eventoId: string, inscritoId: string) {
    return doc(db, 'eventos', eventoId, 'inscritos', inscritoId);
  }

  // ── RBAC por papel ──────────────────────────────────────────────────────

  it('tenant_owner CRIA inscrito válido (sem_kit é kit válido — RN-202)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(
      setDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-novo'), inscritoValido())
    );
  });

  it('tenant_staff CRIA inscrito (é writer)', async () => {
    const db = dbAs('uid-staff-castelo', staffClaims);
    await assertSucceeds(
      setDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-staff'), inscritoValido())
    );
  });

  it('promoter NÃO cria inscrito (lê, não escreve)', async () => {
    const db = dbAs('uid-promoter-castelo', promoterClaims);
    await assertFails(
      setDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-promoter'), inscritoValido())
    );
  });

  it('promoter LÊ inscrito do próprio tenant (é membro)', async () => {
    const db = dbAs('uid-promoter-castelo', promoterClaims);
    await assertSucceeds(
      getDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-castelo-1'))
    );
  });

  it('athlete NÃO cria inscrito pelo cliente (inscrição vem do checkout/Function)', async () => {
    const db = dbAs('uid-atleta', { role: 'athlete' });
    await assertFails(
      setDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-atleta'), inscritoValido())
    );
  });

  // ── Cross-tenant deny: create E update E delete ─────────────────────────

  it('owner de B NÃO CRIA inscrito no evento de A (tenantId próprio ≠ pai)', async () => {
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(
      setDoc(
        refInscrito(db, MEIA_FLORIPA_ID, 'insc-hijack'),
        inscritoValido({ tenantId: PASSO_ID })
      )
    );
  });

  it('owner de B NÃO CRIA inscrito carimbando tenantId de A (não é writer de A)', async () => {
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(
      setDoc(
        refInscrito(db, MEIA_FLORIPA_ID, 'insc-hijack-2'),
        inscritoValido({ tenantId: CASTELO_ID })
      )
    );
  });

  it('owner de B NÃO ATUALIZA inscrito de A', async () => {
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(
      updateDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-castelo-1'), {
        status: 'cancelado',
      })
    );
  });

  it('owner de B NÃO DELETA inscrito de A', async () => {
    const db = dbAs(PASSO_OWNER_UID, passoClaims);
    await assertFails(
      deleteDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-castelo-1'))
    );
  });

  it('owner de A NÃO lê inscrito de B (leitura isolada nos dois sentidos)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(getDoc(refInscrito(db, EVENTO_PASSO, 'insc-passo-1')));
  });

  it('platform_admin cruza tenants (lê e escreve inscritos de qualquer evento)', async () => {
    const db = dbAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(getDoc(refInscrito(db, EVENTO_PASSO, 'insc-passo-1')));
    await assertSucceeds(
      updateDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-castelo-1'), {
        status: 'confirmado',
      })
    );
  });

  // ── tenantId imutável + tenant suspenso ─────────────────────────────────

  it('tenantId de inscrito é IMUTÁVEL no update', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      updateDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-castelo-1'), {
        tenantId: PASSO_ID,
      })
    );
  });

  it('owner de tenant SUSPENSO não cria inscrito (RN-402 — escrita bloqueada)', async () => {
    const db = dbAs(SUSPENSO_OWNER_UID, {
      role: 'tenant_owner', tenantId: SUSPENSO_ID,
    });
    await assertFails(
      setDoc(
        refInscrito(db, EVENTO_SUSPENSO, 'insc-suspenso'),
        inscritoValido({ tenantId: SUSPENSO_ID })
      )
    );
  });

  // ── Shape (RN-202/203/204) ──────────────────────────────────────────────

  it('kit fora do enum é NEGADO (RN-202)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(
        refInscrito(db, MEIA_FLORIPA_ID, 'insc-kit-invalido'),
        inscritoValido({ kit: 'kit_diamante' })
      )
    );
  });

  it('"tier" não é kit (RN-216)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(
        refInscrito(db, MEIA_FLORIPA_ID, 'insc-tier'),
        inscritoValido({ kit: 'tier_ouro' })
      )
    );
  });

  it('status fora do enum é NEGADO (RN-204)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(
        refInscrito(db, MEIA_FLORIPA_ID, 'insc-status-invalido'),
        inscritoValido({ status: 'reembolsado' })
      )
    );
  });

  it('chipNumero numérico é NEGADO (RN-203 — string|null)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(
        refInscrito(db, MEIA_FLORIPA_ID, 'insc-chip-num'),
        inscritoValido({ chipNumero: 8891 })
      )
    );
  });

  it('update mantém shape: status válido passa, inválido não', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(
      updateDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-castelo-1'), {
        status: 'confirmado',
      })
    );
    await assertFails(
      updateDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-castelo-1'), {
        status: 'em_analise',
      })
    );
  });

  // ── Carimbos de Function (RN-205/221/222) ───────────────────────────────

  it('cliente NÃO cria inscrito com qrToken/ingressoEmitidoEm', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      setDoc(
        refInscrito(db, MEIA_FLORIPA_ID, 'insc-qr'),
        inscritoValido({ qrToken: 'forjado' })
      )
    );
    await assertFails(
      setDoc(
        refInscrito(db, MEIA_FLORIPA_ID, 'insc-ingresso'),
        inscritoValido({ ingressoEmitidoEm: new Date() })
      )
    );
  });

  it('cliente NÃO escreve kitEntregueEm (entrega é via Function — RN-205)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      updateDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-castelo-1'), {
        kitEntregueEm: new Date(),
      })
    );
  });

  it('cliente NÃO escreve checkinEm (presença é via Function — RN-222)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      updateDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-castelo-1'), {
        checkinEm: new Date(),
      })
    );
  });

  // ── Delete same-tenant (caminho feliz) ──────────────────────────────────

  it('owner DELETA inscrito do próprio evento', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(
      deleteDoc(refInscrito(db, MEIA_FLORIPA_ID, 'insc-castelo-1'))
    );
  });
});
