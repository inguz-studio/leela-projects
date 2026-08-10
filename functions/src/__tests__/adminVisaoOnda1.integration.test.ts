/**
 * adminVisaoOnda1.integration.test.ts — ADMIN-VISAO onda 1 (backend, sem pixel)
 *
 * Integração REAL no Firestore Emulator (Rules carregadas de verdade +
 * Admin SDK). Cobre os dois itens do gate da onda que precisam de Rules e/ou
 * auditoria — o resto (mecânica de paginação pura) está em
 * `adminVisaoOnda1Paginacao.test.ts` (sem emulator).
 *
 *   S1612-T7 (RN-539) — CANÁRIO: `platform_admin` SEGUE negado em
 *   `crmClientes` pelo client SDK, nas DUAS pernas do RN-401 (papel legado E
 *   capacidade). A perna legada já tinha canário em `crm.integration.test.ts`
 *   (herdado do E19); a perna de capacidade era um buraco real — nenhum
 *   teste do repositório exercitava `platformAdmin: true` (sem o papel
 *   legado) contra esta Rule antes desta lane.
 *
 *   S1612-T5 (RN-539) — o callable `listarClientesDoTenant`: nega quem não é
 *   administrador E registra a negativa; concede e registra o acesso;
 *   autoriza pela CAPACIDADE também (não só o papel legado — é a diferença
 *   desta Function para a maioria dos callables de plataforma, RN-401);
 *   devolve SÓ os campos minimizados (RN-539/RN-172); pagina por cursor sem
 *   perder nem duplicar item.
 *
 * Porta: honra LEELA_FS_EMU_PORT (default 8080) — mesmo fallback Windows-safe
 * de crm.integration.test.ts. Rodar ISOLADO (fileParallelism: false já
 * garante isso no vitest.config.ts).
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
import { collection, doc, getDoc, getDocs, query } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { SUBCOLECAO_CRM_CLIENTES } from '@leela/core';
import {
  listarClientesDoTenant,
  listarClientesDoTenantCore,
  LISTAR_CLIENTES_TENANT_PAGE_SIZE,
} from '../platform/listarClientesDoTenant';
import { AUDITORIA_ACESSOS_COL } from '../shared/auditoriaAcessos';

const PROJECT_ID = 'demo-leela-admin-visao';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const OUTRO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';
const ADMIN_LEGADO_UID = 'uid-platform-admin-legado';
const ADMIN_CAPACIDADE_UID = 'uid-platform-admin-capacidade';
const OWNER_ERRADO_UID = 'uid-tenant-owner-errado';

type AnyRec = Record<string, unknown>;

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function ctxAs(uid: string, claims: AnyRec) {
  return testEnv.authenticatedContext(uid, claims);
}
const adminLegado = () => ctxAs(ADMIN_LEGADO_UID, { role: 'platform_admin' });
/**
 * Capacidade PURA (sem o papel legado — RN-401, lane PAPEL-DUPLO): a perna
 * que `isPlatformAdmin()` também aceita e que o canário legado NUNCA exercitou.
 */
const adminCapacidade = () =>
  ctxAs(ADMIN_CAPACIDADE_UID, { role: 'athlete', platformAdmin: true });
const ownerCasteloA = () =>
  ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });

function crmClienteDoc(over: AnyRec = {}): AnyRec {
  return {
    tenantId: CASTELO_ID,
    chaveTipo: 'atleta',
    nome: 'Cliente Base',
    genero: null,
    nascimento: null,
    aniversario: null,
    qtdEventos: 1,
    qtdInscricoes: 1,
    valorGasto: 100,
    ltv: 100,
    eventos: {
      'ev-1': { nome: 'Evento 1', qtdInscricoes: 1, qtdEstornadas: 0, valorPago: 100 },
    },
    inscricoes: {},
    atualizadoEm: FieldValue.serverTimestamp(),
    ...over,
  };
}

const crmPath = (tenantId: string, key: string) =>
  `tenants/${tenantId}/${SUBCOLECAO_CRM_CLIENTES}/${key}`;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: Number(
        process.env['LEELA_FS_EMU_PORT'] ??
          process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
          8080
      ),
    },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      process.env['FIRESTORE_EMULATOR_HOST'] ??
      `localhost:${process.env['LEELA_FS_EMU_PORT'] ?? '8080'}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

// ---------------------------------------------------------------------------
// S1612-T7 — CANÁRIO: crmClientes SEGUE negado ao client SDK (RN-539)
// ---------------------------------------------------------------------------

describe('Canário RN-539/S1612-T7 — crmClientes SEGUE negado pelo client SDK', () => {
  let key = '';

  beforeEach(async () => {
    key = 'cliente-canario';
    await adminDb.doc(crmPath(CASTELO_ID, key)).set(crmClienteDoc());
  });

  const P = () => ['tenants', CASTELO_ID, SUBCOLECAO_CRM_CLIENTES, key] as const;

  it('platform_admin LEGADO (role) é negado — perna já coberta em crm.integration.test.ts, reafirmada aqui', async () => {
    await assertFails(getDoc(doc(adminLegado().firestore(), ...P())));
  });

  it('platform_admin por CAPACIDADE (platformAdmin: true, sem o papel legado) TAMBÉM é negado — a perna que faltava', async () => {
    await assertFails(getDoc(doc(adminCapacidade().firestore(), ...P())));
  });

  it('sanidade: o owner do PRÓPRIO tenant (isTenantWriter) continua lendo — a Rule não regrediu', async () => {
    await assertSucceeds(getDoc(doc(ownerCasteloA().firestore(), ...P())));
  });

  // ONDA1-FIX · D-6 (proposta da review adotada): as três pontas acima usam
  // `getDoc` — falsificam a mutação `|| isPlatformAdmin()` no `allow read`,
  // mas uma mutação que abrisse SÓ `allow list: if isPlatformAdmin()` (query,
  // sem o get) passaria ilesa por elas. Esta ponta fecha o buraco: `getDocs`
  // de uma QUERY na subcoleção, negado nas DUAS pernas do RN-401.
  it('list (getDocs de query) TAMBÉM é negado nas duas pernas — mutação que abrisse só allow list não passa (D-6)', async () => {
    await assertFails(
      getDocs(
        query(
          collection(
            adminLegado().firestore(),
            'tenants',
            CASTELO_ID,
            SUBCOLECAO_CRM_CLIENTES
          )
        )
      )
    );
    await assertFails(
      getDocs(
        query(
          collection(
            adminCapacidade().firestore(),
            'tenants',
            CASTELO_ID,
            SUBCOLECAO_CRM_CLIENTES
          )
        )
      )
    );
  });
});

// ---------------------------------------------------------------------------
// S1612-T5 — listarClientesDoTenant: autorização, auditoria, minimização
// ---------------------------------------------------------------------------

function runCallable(data: AnyRec, ctx: AnyRec): Promise<unknown> {
  return (
    listarClientesDoTenant as unknown as {
      run: (d: AnyRec, c: AnyRec) => Promise<unknown>;
    }
  ).run(data, ctx);
}

async function auditorias(tipo: string): Promise<AnyRec[]> {
  const snap = await adminDb
    .collection(AUDITORIA_ACESSOS_COL)
    .where('tipo', '==', tipo)
    .get();
  return snap.docs.map((d) => d.data());
}

describe('listarClientesDoTenant (callable) — autorização (RN-539/RN-401)', () => {
  it('não autenticado → unauthenticated, SEM registro (sem uid não há a quem atribuir)', async () => {
    await expect(runCallable({ tenantId: CASTELO_ID }, {})).rejects.toMatchObject({
      code: 'unauthenticated',
    });
    expect(await auditorias('acesso_clientes_tenant')).toHaveLength(0);
  });

  it('"tenantId" ausente → invalid-argument, ANTES de checar papel (input malformado ≠ negativa de acesso)', async () => {
    await expect(
      runCallable({}, { auth: { uid: ADMIN_LEGADO_UID, token: { role: 'platform_admin' } } })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(await auditorias('acesso_clientes_tenant')).toHaveLength(0);
  });

  it('papel ERRADO (tenant_owner) → permission-denied E a negativa é REGISTRADA', async () => {
    await expect(
      runCallable(
        { tenantId: CASTELO_ID },
        {
          auth: {
            uid: OWNER_ERRADO_UID,
            token: { role: 'tenant_owner', tenantId: CASTELO_ID },
          },
        }
      )
    ).rejects.toMatchObject({ code: 'permission-denied' });

    const registros = await auditorias('acesso_clientes_tenant');
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      tenantId: CASTELO_ID,
      uid: OWNER_ERRADO_UID,
      papel: 'tenant_owner',
      resultado: 'negado_papel',
    });
  });

  it('platform_admin por CAPACIDADE (sem papel legado) é AUTORIZADO — prova que usa isPlatformAdmin, não role-only', async () => {
    await adminDb
      .doc(crmPath(CASTELO_ID, 'cliente-1'))
      .set(crmClienteDoc({ nome: 'Ana' }));

    const res = (await runCallable(
      { tenantId: CASTELO_ID },
      { auth: { uid: ADMIN_CAPACIDADE_UID, token: { role: 'athlete', platformAdmin: true } } }
    )) as AnyRec;

    expect((res['itens'] as AnyRec[]).length).toBe(1);
    const registros = await auditorias('acesso_clientes_tenant');
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      tenantId: CASTELO_ID,
      uid: ADMIN_CAPACIDADE_UID,
      papel: 'athlete',
      resultado: 'concedido',
    });
  });

  it('platform_admin LEGADO é AUTORIZADO e o retorno é MINIMIZADO — só os campos da RN-539', async () => {
    await adminDb.doc(crmPath(CASTELO_ID, 'cliente-1')).set(
      crmClienteDoc({
        nome: 'Bruna',
        genero: 'feminino',
        nascimento: '1993-04-12',
        aniversario: '04-12',
        chaveTipo: 'cpf',
      })
    );

    const res = (await runCallable(
      { tenantId: CASTELO_ID },
      { auth: { uid: ADMIN_LEGADO_UID, token: { role: 'platform_admin' } } }
    )) as { itens: AnyRec[]; proxCursor: string | null };

    expect(res.itens).toHaveLength(1);
    const cliente = res.itens[0] as AnyRec;
    expect(Object.keys(cliente).sort()).toEqual(
      ['clienteKey', 'eventos', 'ltv', 'nome', 'qtdEventos', 'qtdInscricoes', 'valorGasto'].sort()
    );
    expect(cliente['nome']).toBe('Bruna');
    expect(cliente['ltv']).toBe(100);
    // Nunca genero/nascimento/aniversario/chaveTipo/inscricoes no retorno,
    // mesmo esses campos existindo no doc de origem (defesa em profundidade).
    const json = JSON.stringify(cliente);
    expect(json).not.toContain('feminino');
    expect(json).not.toContain('1993-04-12');
    expect(json).not.toContain('cpf');

    const registros = await auditorias('acesso_clientes_tenant');
    expect(registros).toHaveLength(1);
    expect(registros[0]?.['resultado']).toBe('concedido');
  });

  it('PAGINAÇÃO: 3 clientes, pageSize 2 → 2 páginas, sem perda nem duplicata, proxCursor honesto', async () => {
    const batch = adminDb.batch();
    batch.set(adminDb.doc(crmPath(CASTELO_ID, 'c1')), crmClienteDoc({ nome: 'C1', ltv: 300 }));
    batch.set(adminDb.doc(crmPath(CASTELO_ID, 'c2')), crmClienteDoc({ nome: 'C2', ltv: 200 }));
    batch.set(adminDb.doc(crmPath(CASTELO_ID, 'c3')), crmClienteDoc({ nome: 'C3', ltv: 100 }));
    await batch.commit();

    const p1 = (await runCallable(
      { tenantId: CASTELO_ID, pageSize: 2 },
      { auth: { uid: ADMIN_LEGADO_UID, token: { role: 'platform_admin' } } }
    )) as { itens: AnyRec[]; proxCursor: string | null };
    expect(p1.itens).toHaveLength(2);
    expect(p1.proxCursor).not.toBeNull();
    // Ordem ltv desc: C1 (300), C2 (200) primeiro
    expect(p1.itens.map((c) => c['nome'])).toEqual(['C1', 'C2']);

    const p2 = (await runCallable(
      { tenantId: CASTELO_ID, pageSize: 2, cursor: p1.proxCursor },
      { auth: { uid: ADMIN_LEGADO_UID, token: { role: 'platform_admin' } } }
    )) as { itens: AnyRec[]; proxCursor: string | null };
    expect(p2.itens).toHaveLength(1);
    expect(p2.itens[0]?.['nome']).toBe('C3');
    expect(p2.proxCursor).toBeNull();

    // Nenhum item repetido entre as duas páginas
    const chaves = [...p1.itens, ...p2.itens].map((c) => c['clienteKey']);
    expect(new Set(chaves).size).toBe(3);
  });

  it('doc CORROMPIDO não derruba a página — loga e pula, o resto da página chega', async () => {
    const batch = adminDb.batch();
    batch.set(adminDb.doc(crmPath(CASTELO_ID, 'bom')), crmClienteDoc({ nome: 'Bom' }));
    // "eventos" como array em vez de mapa → parseCrmCliente lança
    batch.set(adminDb.doc(crmPath(CASTELO_ID, 'ruim')), {
      ...crmClienteDoc({ nome: 'Ruim' }),
      eventos: ['isto não é um mapa'],
    });
    await batch.commit();

    const res = (await runCallable(
      { tenantId: CASTELO_ID },
      { auth: { uid: ADMIN_LEGADO_UID, token: { role: 'platform_admin' } } }
    )) as { itens: AnyRec[] };

    expect(res.itens).toHaveLength(1);
    expect(res.itens[0]?.['nome']).toBe('Bom');
  });

  it('página cheia exatamente no LISTAR_CLIENTES_TENANT_PAGE_SIZE default confirma a constante exportada', () => {
    expect(LISTAR_CLIENTES_TENANT_PAGE_SIZE).toBe(18);
  });
});

// ---------------------------------------------------------------------------
// ONDA1-FIX · D-3/D-4 — bordas honestas do cursor e do pageSize (RN-539).
// Falsificação real (contra o código velho):
//   D-3: cursor de doc apagado degradava EM SILÊNCIO para a página 1 — o
//        `rejects.toMatchObject({ code: 'failed-precondition' })` falhava
//        porque a promise RESOLVIA (com os itens da página 1 de novo).
//   D-4: cursor 'a/b' → col.doc() lançava Error cru (path de 5 segmentos) e
//        pageSize 'abc' → limit(NaN) lançava — nos dois casos o rejeitado não
//        tinha code 'invalid-argument' (Error sem code → 'internal' no wire).
// ---------------------------------------------------------------------------

describe('listarClientesDoTenant — bordas do cursor e do pageSize (ONDA1-FIX · D-3/D-4)', () => {
  const authAdmin = () => ({
    auth: { uid: ADMIN_LEGADO_UID, token: { role: 'platform_admin' } },
  });

  it('cursor de doc APAGADO entre páginas → failed-precondition explícito, nunca página 1 em silêncio (D-3)', async () => {
    const batch = adminDb.batch();
    batch.set(adminDb.doc(crmPath(CASTELO_ID, 'c1')), crmClienteDoc({ nome: 'C1', ltv: 300 }));
    batch.set(adminDb.doc(crmPath(CASTELO_ID, 'c2')), crmClienteDoc({ nome: 'C2', ltv: 200 }));
    batch.set(adminDb.doc(crmPath(CASTELO_ID, 'c3')), crmClienteDoc({ nome: 'C3', ltv: 100 }));
    await batch.commit();

    const p1 = (await runCallable(
      { tenantId: CASTELO_ID, pageSize: 2 },
      authAdmin()
    )) as { itens: AnyRec[]; proxCursor: string | null };
    expect(p1.proxCursor).toBe('c2');

    // O doc do cursor some entre as páginas (cliente reagregado/expurgado)
    await adminDb.doc(crmPath(CASTELO_ID, 'c2')).delete();

    await expect(
      runCallable({ tenantId: CASTELO_ID, pageSize: 2, cursor: p1.proxCursor }, authAdmin())
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('cursor com "/" (viraria path de 5 segmentos no Admin SDK) → invalid-argument, não internal (D-4)', async () => {
    await expect(
      runCallable({ tenantId: CASTELO_ID, cursor: 'a/b' }, authAdmin())
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('cursor não-string ou vazio → invalid-argument, nunca ignorado em silêncio (D-4)', async () => {
    await expect(
      runCallable({ tenantId: CASTELO_ID, cursor: 42 }, authAdmin())
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      runCallable({ tenantId: CASTELO_ID, cursor: '' }, authAdmin())
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('pageSize não numérico → invalid-argument, não internal via limit(NaN) (D-4)', async () => {
    await expect(
      runCallable({ tenantId: CASTELO_ID, pageSize: 'abc' }, authAdmin())
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      runCallable({ tenantId: CASTELO_ID, pageSize: 2.5 }, authAdmin())
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('pageSize numérico fora da faixa continua CLAMPADO (comportamento preservado, não virou erro)', async () => {
    await adminDb.doc(crmPath(CASTELO_ID, 'c1')).set(crmClienteDoc({ nome: 'C1' }));
    const res = (await runCallable(
      { tenantId: CASTELO_ID, pageSize: 0 },
      authAdmin()
    )) as { itens: AnyRec[] };
    expect(res.itens).toHaveLength(1); // clamp para 1, sem erro
  });
});

describe('listarClientesDoTenantCore — isolamento cross-tenant', () => {
  it('clientes de OUTRO tenant nunca aparecem na lista deste tenant', async () => {
    await adminDb.doc(crmPath(CASTELO_ID, 'do-castelo')).set(crmClienteDoc({ nome: 'Do Castelo' }));
    await adminDb
      .doc(crmPath(OUTRO_ID, 'do-outro'))
      .set(crmClienteDoc({ tenantId: OUTRO_ID, nome: 'Do Outro' }));

    const res = await listarClientesDoTenantCore(adminDb, { tenantId: CASTELO_ID }, {
      uid: ADMIN_LEGADO_UID,
      claims: { role: 'platform_admin' },
    });

    expect(res.itens).toHaveLength(1);
    expect(res.itens[0]?.nome).toBe('Do Castelo');
  });
});
