/**
 * papelDuploRules.integration.test.ts — lane PAPEL-DUPLO (T3)
 *
 * A pergunta que este arquivo responde, com as Rules carregadas de verdade:
 * a claim `platformAdmin: true` compra EXATAMENTE o mesmo acesso que o papel
 * legado `platform_admin`, sem tirar nada de ninguém?
 *
 * QUATRO QUADRANTES (capacidade × papel de tenant):
 *
 *              | sem capacidade            | com capacidade
 *   -----------+---------------------------+----------------------------------
 *   sem tenant | Q1 athlete → negado tudo  | Q2 platform_admin legado → passa
 *   com tenant | Q3 tenant_owner puro →    | Q4 tenant_owner + capacidade →
 *              |    negado na plataforma,  |    passa nos DOIS lados (o dono)
 *              |    ok no próprio tenant   |
 *
 * Q2 é a NÃO-REGRESSÃO (o legado tem de continuar passando) e Q4 é a feature.
 * Q3 é a prova de que a porta não abriu para todo tenant_owner. Q1 é o piso.
 *
 * Cobre também: isolamento cross-tenant nos dois sentidos, e a COMPARAÇÃO
 * ESTRITA — `platformAdmin: false` e `platformAdmin: 'true'` (string) NÃO
 * passam, porque a rule compara com `true` literal.
 *
 * Porta: honra LEELA_FS_EMU_PORT (default 8080). Rodar ISOLADO — colisão de
 * emulator é indistinguível de regressão.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'demo-leela-papelduplo';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

// Dois tenants: o do dono e um alheio (o alvo do cross-tenant).
const CASTELO_ID = 'castelo-producoes';
const OUTRO_ID = 'outra-produtora';

// Q1..Q4 — um uid por quadrante.
const ATLETA_UID = 'uid-atleta-sem-nada';
const ADMIN_LEGADO_UID = 'uid-platform-admin-legado';
const OWNER_PURO_UID = 'uid-owner-sem-capacidade';
const DONO_UID = 'uid-dono-papel-duplo';

// Crachás. `platformAdmin` só existe quando LIGADO (revogar apaga a chave).
const CLAIMS_ATLETA = { role: 'athlete' };
const CLAIMS_ADMIN_LEGADO = { role: 'platform_admin' };
const CLAIMS_OWNER_PURO = { role: 'tenant_owner', tenantId: CASTELO_ID };
const CLAIMS_DONO = { role: 'tenant_owner', tenantId: CASTELO_ID, platformAdmin: true };

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

beforeAll(async () => {
  const FS_PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: FS_PORT,
    },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `127.0.0.1:${FS_PORT}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
}, 30_000);

beforeEach(async () => {
  await testEnv.clearFirestore();
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  for (const [id, nome, ownerUid] of [
    [CASTELO_ID, 'Castelo Produções', DONO_UID],
    [OUTRO_ID, 'Outra Produtora', 'uid-owner-alheio'],
  ] as const) {
    batch.set(adminDb.collection('tenants').doc(id), {
      id,
      nome,
      slug: id,
      status: 'ativo',
      ownerUid,
      tipo: 'produtor',
      criadoEm: now,
      atualizadoEm: now,
    });
  }
  await batch.commit();
}, 30_000);

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((a) => a?.delete()));
});

/** Contexto autenticado com o crachá do quadrante. */
function ctx(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}

/** Leitura do doc de um tenant — ponto `isTenantMember() || isPlatformAdmin()`. */
function lerTenant(uid: string, claims: Record<string, unknown>, tenantId: string) {
  return getDoc(doc(ctx(uid, claims).firestore(), 'tenants', tenantId));
}

/** Escrita no doc de um tenant — ponto `isPlatformAdmin()` PURO (sem perna de membro). */
function suspenderTenant(uid: string, claims: Record<string, unknown>, tenantId: string) {
  return setDoc(
    doc(ctx(uid, claims).firestore(), 'tenants', tenantId),
    { id: tenantId, nome: 'x', slug: tenantId, status: 'suspenso', tipo: 'produtor' },
    { merge: true }
  );
}

describe('PAPEL-DUPLO · Q1 — athlete (sem capacidade, sem tenant): o piso', () => {
  it('não lê o tenant do dono', async () => {
    await assertFails(lerTenant(ATLETA_UID, CLAIMS_ATLETA, CASTELO_ID));
  });
  it('não escreve em tenant nenhum', async () => {
    await assertFails(suspenderTenant(ATLETA_UID, CLAIMS_ATLETA, CASTELO_ID));
  });
});

describe('PAPEL-DUPLO · Q2 — platform_admin LEGADO: não regrediu', () => {
  it('lê qualquer tenant (cross-tenant)', async () => {
    await assertSucceeds(lerTenant(ADMIN_LEGADO_UID, CLAIMS_ADMIN_LEGADO, CASTELO_ID));
    await assertSucceeds(lerTenant(ADMIN_LEGADO_UID, CLAIMS_ADMIN_LEGADO, OUTRO_ID));
  });
  it('escreve em qualquer tenant', async () => {
    await assertSucceeds(suspenderTenant(ADMIN_LEGADO_UID, CLAIMS_ADMIN_LEGADO, OUTRO_ID));
  });
});

describe('PAPEL-DUPLO · Q3 — tenant_owner PURO: a porta não abriu para todos', () => {
  it('lê o PRÓPRIO tenant (perna de membro, intocada)', async () => {
    await assertSucceeds(lerTenant(OWNER_PURO_UID, CLAIMS_OWNER_PURO, CASTELO_ID));
  });
  it('NÃO lê o tenant alheio (RN-400)', async () => {
    await assertFails(lerTenant(OWNER_PURO_UID, CLAIMS_OWNER_PURO, OUTRO_ID));
  });
  it('NÃO escreve nem no próprio tenant (escrita é de plataforma)', async () => {
    await assertFails(suspenderTenant(OWNER_PURO_UID, CLAIMS_OWNER_PURO, CASTELO_ID));
  });
  it('NÃO escreve no tenant alheio', async () => {
    await assertFails(suspenderTenant(OWNER_PURO_UID, CLAIMS_OWNER_PURO, OUTRO_ID));
  });
});

describe('PAPEL-DUPLO · Q4 — tenant_owner + capacidade: o dono, nos dois lados', () => {
  it('lê o PRÓPRIO tenant (lado organizador preservado)', async () => {
    await assertSucceeds(lerTenant(DONO_UID, CLAIMS_DONO, CASTELO_ID));
  });
  it('lê o tenant ALHEIO — o mesmo ponto que o legado passa', async () => {
    await assertSucceeds(lerTenant(DONO_UID, CLAIMS_DONO, OUTRO_ID));
  });
  it('escreve no tenant alheio — o mesmo ponto que o legado passa', async () => {
    await assertSucceeds(suspenderTenant(DONO_UID, CLAIMS_DONO, OUTRO_ID));
  });
  it('escreve no PRÓPRIO tenant pela perna de plataforma', async () => {
    await assertSucceeds(suspenderTenant(DONO_UID, CLAIMS_DONO, CASTELO_ID));
  });
});

describe('PAPEL-DUPLO · REGRESSÃO: capacidade como PRIMEIRO disjunto', () => {
  // O ponto cego que quase passou. Em `tenants` a ordem é
  // `isTenantMember() || isPlatformAdmin()` — o curto-circuito nunca chega na
  // perna nova para quem já é membro. Mas há dezenas de rules na forma
  // `isPlatformAdmin() || isTenantWriter(...)` (inscritos L931, lotes L1158,
  // e mais): ali a perna NOVA é a PRIMEIRA a ser avaliada, num crachá que NÃO
  // tem a chave. Se ler chave ausente fosse ERRO de avaliação em vez de
  // `false`, o `||` seria envenenado e TODO organizador perderia a leitura de
  // inscritos e lotes — regressão silenciosa, cross-tenant, em produção.
  const EVENTO_ID = 'meia-floripa-2026';
  const LOTE_ID = 'lote-1';

  beforeEach(async () => {
    await adminDb.collection('eventos').doc(EVENTO_ID).set({
      id: EVENTO_ID,
      tenantId: CASTELO_ID,
      nome: 'Meia de Floripa 2026',
      slug: EVENTO_ID,
      status: 'publicado',
    });
    await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('lotes')
      .doc(LOTE_ID)
      .set({ id: LOTE_ID, tenantId: CASTELO_ID, nome: 'Lote 1', preco: 100 });
  });

  function lerLote(uid: string, claims: Record<string, unknown>) {
    return getDoc(doc(ctx(uid, claims).firestore(), 'eventos', EVENTO_ID, 'lotes', LOTE_ID));
  }

  it('tenant_owner SEM a capacidade ainda lê o lote do próprio evento', async () => {
    // Se este teste ficar vermelho, a mudança nas Rules é uma regressão de
    // produção — não publique.
    await assertSucceeds(lerLote(OWNER_PURO_UID, CLAIMS_OWNER_PURO));
  });

  it('platform_admin legado continua lendo (perna antiga, primeiro disjunto)', async () => {
    await assertSucceeds(lerLote(ADMIN_LEGADO_UID, CLAIMS_ADMIN_LEGADO));
  });

  it('o dono lê pelas duas pernas', async () => {
    await assertSucceeds(lerLote(DONO_UID, CLAIMS_DONO));
  });

  it('athlete sem nada continua negado', async () => {
    await assertFails(lerLote(ATLETA_UID, CLAIMS_ATLETA));
  });
});

describe('PAPEL-DUPLO · comparação ESTRITA da capacidade', () => {
  it('platformAdmin: false NÃO passa', async () => {
    const claims = { role: 'tenant_owner', tenantId: CASTELO_ID, platformAdmin: false };
    await assertFails(lerTenant('uid-cap-false', claims, OUTRO_ID));
    await assertFails(suspenderTenant('uid-cap-false', claims, OUTRO_ID));
  });
  it("platformAdmin: 'true' (string) NÃO passa", async () => {
    const claims = { role: 'tenant_owner', tenantId: CASTELO_ID, platformAdmin: 'true' };
    await assertFails(lerTenant('uid-cap-string', claims, OUTRO_ID));
    await assertFails(suspenderTenant('uid-cap-string', claims, OUTRO_ID));
  });
  it('platformAdmin: 1 NÃO passa', async () => {
    const claims = { role: 'tenant_owner', tenantId: CASTELO_ID, platformAdmin: 1 };
    await assertFails(lerTenant('uid-cap-um', claims, OUTRO_ID));
  });
  it('capacidade SEM papel de tenant também passa (athlete + capacidade)', async () => {
    // Combinação improvável, mas a rule não pode exigir tenant para a perna
    // nova — quem decide quem recebe a capacidade é a Function, não a Rule.
    const claims = { role: 'athlete', platformAdmin: true };
    await assertSucceeds(lerTenant('uid-atleta-cap', claims, OUTRO_ID));
  });
  it('anônimo com nada continua negado (isSignedIn segue na frente)', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), 'tenants', CASTELO_ID)));
  });
});
