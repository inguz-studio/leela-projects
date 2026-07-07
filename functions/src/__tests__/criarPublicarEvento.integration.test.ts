/**
 * criarPublicarEvento.integration.test.ts — LEELA-S201-T2
 *
 * Integração REAL no Emulator (Firestore, Admin SDK): Functions
 * `criarEvento` + `publicarEvento` (RN-201) + puras de slug/validação.
 *
 * Cobre (aceite E03-L2):
 *   - criarEvento: rascunho com organizadorId=caller, agregados zerados,
 *     slug único sob colisão (base, base-2, base-3…)
 *   - criarEvento REJEITA input inválido no servidor (nunca confia na UI)
 *   - autorização: athlete/promoter/sem-claim → permission-denied;
 *     tenant suspenso → failed-precondition (RN-402)
 *   - publicarEvento: rascunho completo → { url: beh.ro/slug, qrUrl } e
 *     status vira `publicado` (RN-201); QR é data URI PNG gerado server-side
 *   - idempotência de publicação: retry devolve o MESMO resultado (replay)
 *     sem alterar `publicadoEm`
 *   - rascunho incompleto / status errado / cross-tenant → erros corretos
 *
 * Pré-requisito: Firestore Emulator (8080) via emulators:exec.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import {
  criarEventoCore,
  validarCriarEventoInput,
  type CriarEventoInput,
  type EventoCaller,
} from '../eventos/criarEvento';
import {
  camposFaltantesParaPublicar,
  publicarEventoCore,
  urlPublicaDoEvento,
} from '../eventos/publicarEvento';
import { slugCandidato, slugify } from '../eventos/slug';

const PROJECT_ID = 'demo-leela';

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const SUSPENSO_ID = 'tenant-suspenso';
const MARINA_UID = 'uid-marina-castelo';

let db: admin.firestore.Firestore;

const marina: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID },
};
const staffCastelo: EventoCaller = {
  uid: 'uid-staff-castelo',
  claims: { role: 'tenant_staff', tenantId: CASTELO_ID },
};
const passoOwner: EventoCaller = {
  uid: 'uid-passo-owner',
  claims: { role: 'tenant_owner', tenantId: PASSO_ID },
};
const athlete: EventoCaller = {
  uid: 'uid-atleta',
  claims: { role: 'athlete' },
};
const promoter: EventoCaller = {
  uid: 'uid-promoter',
  claims: { role: 'promoter', tenantId: CASTELO_ID },
};
const ownerSuspenso: EventoCaller = {
  uid: 'uid-suspenso-owner',
  claims: { role: 'tenant_owner', tenantId: SUSPENSO_ID },
};

function inputValido(overrides: Partial<CriarEventoInput> = {}): CriarEventoInput {
  return {
    nome: 'Corrida do Sol 2027',
    data: '2027-09-12T07:00:00-03:00',
    local: 'Jurerê, Florianópolis/SC',
    modalidades: ['5k', '10k'],
    // Contrato do L3 (contracts.ts): percurso = { nome, preco ≥ 0 }
    percursos: [
      { nome: '5k', preco: 89 },
      { nome: '10k', preco: 129 },
    ],
    usaChip: true,
    ...overrides,
  };
}

async function clearFirestore(): Promise<void> {
  const collections = await db.listCollections();
  for (const col of collections) {
    const docs = await col.listDocuments();
    for (const ref of docs) {
      await db.recursiveDelete(ref);
    }
  }
}

async function seedTenants(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
    status: 'ativo', ownerUid: passoOwner.uid, tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('tenants').doc(SUSPENSO_ID), {
    id: SUSPENSO_ID, nome: 'Tenant Suspenso', slug: SUSPENSO_ID,
    status: 'suspenso', ownerUid: ownerSuspenso.uid, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

async function expectHttpsError(
  promise: Promise<unknown>,
  code: string,
  contains?: string
): Promise<void> {
  try {
    await promise;
    expect.unreachable(`esperava HttpsError '${code}'`);
  } catch (err) {
    expect(err).toBeInstanceOf(https.HttpsError);
    const httpsErr = err as https.HttpsError;
    expect(httpsErr.code).toBe(code);
    if (contains) expect(httpsErr.message).toContain(contains);
  }
}

beforeAll(() => {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
});

beforeEach(async () => {
  await clearFirestore();
  await seedTenants();
});

// ── Puras: slug e validação ────────────────────────────────────────────────

describe('slugify + slugCandidato (puras)', () => {
  it('normaliza acentos, espaços e pontuação', () => {
    expect(slugify('Meia Maratona Floripa 2026')).toBe('meia-maratona-floripa-2026');
    expect(slugify('Corrida São João — 5ª Edição!')).toBe('corrida-sao-joao-5-edicao');
    expect(slugify('  ---Trail   do Morro---  ')).toBe('trail-do-morro');
  });

  it('corta em 60 chars sem deixar hífen final', () => {
    const slug = slugify('a'.repeat(59) + ' bc');
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('nome sem alfanumérico gera slug vazio (rejeitado na validação)', () => {
    expect(slugify('!!! ???')).toBe('');
  });

  it('candidatos: base, base-2, base-3…', () => {
    expect(slugCandidato('corrida', 0)).toBe('corrida');
    expect(slugCandidato('corrida', 1)).toBe('corrida-2');
    expect(slugCandidato('corrida', 2)).toBe('corrida-3');
  });
});

describe('validarCriarEventoInput (pura — fronteira do servidor)', () => {
  const agora = () => new Date('2026-07-04T12:00:00Z');

  it('input canônico passa sem erros', () => {
    expect(validarCriarEventoInput(inputValido(), agora)).toEqual([]);
  });

  it.each([
    ['nome curto', { nome: 'ab' }, 'nome'],
    ['nome sem slug', { nome: '!!! ???' }, 'slug'],
    ['data inválida', { data: 'não-é-data' }, 'data'],
    ['data no passado', { data: '2025-01-01T07:00:00-03:00' }, 'futura'],
    ['local vazio', { local: '  ' }, 'local'],
    ['modalidades vazias', { modalidades: [] }, 'modalidades'],
    ['modalidade em branco', { modalidades: ['5k', ' '] }, 'modalidades'],
    ['percursos vazios', { percursos: [] }, 'percursos'],
    ['percurso sem preço', { percursos: [{ nome: '5k' } as never] }, 'percursos'],
    [
      'percurso com preço negativo',
      { percursos: [{ nome: '5k', preco: -10 }] },
      'percursos',
    ],
    [
      'percurso com nome vazio',
      { percursos: [{ nome: '  ', preco: 89 }] },
      'percursos',
    ],
    ['usaChip não-bool', { usaChip: 'sim' as unknown as boolean }, 'usaChip'],
  ])('rejeita %s', (_caso, overrides, termo) => {
    const erros = validarCriarEventoInput(
      inputValido(overrides as Partial<CriarEventoInput>),
      agora
    );
    expect(erros.length).toBeGreaterThan(0);
    expect(erros.join(' ')).toContain(termo);
  });

  it('rejeita input não-objeto', () => {
    expect(validarCriarEventoInput(null).length).toBeGreaterThan(0);
    expect(validarCriarEventoInput('x').length).toBeGreaterThan(0);
    expect(validarCriarEventoInput([]).length).toBeGreaterThan(0);
  });
});

describe('camposFaltantesParaPublicar (pura)', () => {
  it('lista exatamente o que falta', () => {
    expect(camposFaltantesParaPublicar({})).toEqual([
      'nome', 'data', 'local', 'modalidades',
    ]);
    expect(
      camposFaltantesParaPublicar({
        nome: 'X', data: new Date(), local: 'Y', modalidades: ['5k'],
      })
    ).toEqual([]);
  });
});

// ── criarEvento (integração) ───────────────────────────────────────────────

describe('criarEventoCore — criação de rascunho (S201-T2)', () => {
  it('cria rascunho com organizadorId=caller e agregados zerados', async () => {
    const res = await criarEventoCore(db, inputValido(), marina);

    expect(res.slug).toBe('corrida-do-sol-2027');
    expect(res.eventoId).toBe(res.slug);

    const snap = await db.doc(`eventos/${res.eventoId}`).get();
    expect(snap.exists).toBe(true);
    expect(snap.get('tenantId')).toBe(CASTELO_ID);
    expect(snap.get('organizadorId')).toBe(MARINA_UID);
    expect(snap.get('status')).toBe('rascunho');
    expect(snap.get('usaChip')).toBe(true);
    expect(snap.get('qtdInscritos')).toBe(0);
    expect(snap.get('receitaConfirmada')).toBe(0);
    expect(snap.get('modalidades')).toEqual(['5k', '10k']);
    // Percursos persistidos conforme o contrato do L3 (preço por percurso)
    expect(snap.get('percursos')).toEqual([
      { nome: '5k', preco: 89 },
      { nome: '10k', preco: 129 },
    ]);
    expect(snap.get('slug')).toBe(res.slug);
  });

  it('staff do tenant também cria (papel de escrita — matriz S1600)', async () => {
    const res = await criarEventoCore(db, inputValido(), staffCastelo);
    const snap = await db.doc(`eventos/${res.eventoId}`).get();
    expect(snap.get('organizadorId')).toBe(staffCastelo.uid);
    expect(snap.get('tenantId')).toBe(CASTELO_ID);
  });

  it('slug colide → sufixa -2, -3 (unicidade transacional)', async () => {
    const r1 = await criarEventoCore(db, inputValido(), marina);
    const r2 = await criarEventoCore(db, inputValido(), marina);
    const r3 = await criarEventoCore(db, inputValido(), marina);

    expect(r1.slug).toBe('corrida-do-sol-2027');
    expect(r2.slug).toBe('corrida-do-sol-2027-2');
    expect(r3.slug).toBe('corrida-do-sol-2027-3');

    const todos = await db
      .collection('eventos')
      .where('tenantId', '==', CASTELO_ID)
      .get();
    expect(todos.size).toBe(3);
  });

  it('REJEITA input inválido no servidor (aceite L2 — nunca confia na UI)', async () => {
    await expectHttpsError(
      criarEventoCore(db, inputValido({ modalidades: [] }), marina),
      'invalid-argument',
      'modalidades'
    );
    await expectHttpsError(
      criarEventoCore(db, { nome: 'Só nome' }, marina),
      'invalid-argument'
    );
    // nada foi gravado
    const todos = await db.collection('eventos').get();
    expect(todos.size).toBe(0);
  });

  it('athlete e promoter NÃO criam evento (RN-401)', async () => {
    await expectHttpsError(
      criarEventoCore(db, inputValido(), athlete),
      'permission-denied'
    );
    await expectHttpsError(
      criarEventoCore(db, inputValido(), promoter),
      'permission-denied'
    );
  });

  it('tenant suspenso NÃO cria evento (RN-402)', async () => {
    await expectHttpsError(
      criarEventoCore(db, inputValido(), ownerSuspenso),
      'failed-precondition',
      'ativo'
    );
  });
});

// ── publicarEvento (integração · RN-201) ──────────────────────────────────

describe('publicarEventoCore — RN-201', () => {
  it('rascunho completo → { url beh.ro/slug, qrUrl } e status publicado', async () => {
    const { eventoId } = await criarEventoCore(db, inputValido(), marina);
    const res = await publicarEventoCore(db, { eventoId }, marina);

    expect(res.url).toBe(`https://beh.ro/${eventoId}`);
    expect(res.url).toBe(urlPublicaDoEvento(eventoId));
    expect(res.replay).toBe(false);
    // QR gerado server-side, payload = url (asset renderizável em <img>)
    expect(res.qrUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(res.qrUrl.length).toBeGreaterThan(500);

    const snap = await db.doc(`eventos/${eventoId}`).get();
    expect(snap.get('status')).toBe('publicado');
    expect(snap.get('publicadoEm')).toBeTruthy();
  });

  it('IDEMPOTENTE: republicar devolve o mesmo resultado sem regravar', async () => {
    const { eventoId } = await criarEventoCore(db, inputValido(), marina);
    const r1 = await publicarEventoCore(db, { eventoId }, marina);
    const antes = await db.doc(`eventos/${eventoId}`).get();

    const r2 = await publicarEventoCore(db, { eventoId }, marina);
    const depois = await db.doc(`eventos/${eventoId}`).get();

    expect(r2.replay).toBe(true);
    expect(r2.url).toBe(r1.url);
    expect(r2.qrUrl).toBe(r1.qrUrl);
    // publicadoEm intacto — retry não muda estado
    expect(depois.get('publicadoEm')).toEqual(antes.get('publicadoEm'));
  });

  it('rascunho incompleto → failed-precondition listando o que falta', async () => {
    const now = FieldValue.serverTimestamp();
    await db.doc('eventos/rascunho-incompleto').set({
      id: 'rascunho-incompleto', tenantId: CASTELO_ID,
      organizadorId: MARINA_UID, nome: 'Rascunho Incompleto',
      modalidades: [], slug: 'rascunho-incompleto', status: 'rascunho',
      usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
      criadoEm: now, atualizadoEm: now,
    });
    await expectHttpsError(
      publicarEventoCore(db, { eventoId: 'rascunho-incompleto' }, marina),
      'failed-precondition',
      'modalidades'
    );
    const snap = await db.doc('eventos/rascunho-incompleto').get();
    expect(snap.get('status')).toBe('rascunho'); // nada mudou
  });

  it('evento encerrado NÃO volta a ser publicado', async () => {
    const { eventoId } = await criarEventoCore(db, inputValido(), marina);
    await db.doc(`eventos/${eventoId}`).update({ status: 'encerrado' });
    await expectHttpsError(
      publicarEventoCore(db, { eventoId }, marina),
      'failed-precondition',
      'encerrado'
    );
  });

  it('cross-tenant: owner de B NÃO publica evento de A (RN-400)', async () => {
    const { eventoId } = await criarEventoCore(db, inputValido(), marina);
    await expectHttpsError(
      publicarEventoCore(db, { eventoId }, passoOwner),
      'permission-denied'
    );
  });

  it('evento inexistente → not-found; input sem eventoId → invalid-argument', async () => {
    await expectHttpsError(
      publicarEventoCore(db, { eventoId: 'nao-existe' }, marina),
      'not-found'
    );
    await expectHttpsError(
      publicarEventoCore(db, {}, marina),
      'invalid-argument'
    );
  });
});
