/**
 * crm.integration.test.ts — E19 · S-R9-13-T1/T2 (RN-172 · P-E19-1..6)
 *
 * `aplicarWriteInscritoNoCrm` (núcleo do gatilho onInscritoWriteCrm) contra o
 * Firestore Emulator com docs REAIS + Security Rules de
 * `tenants/{tid}/crmClientes`. Aceites falsificáveis do brief:
 *   - LINKING cross-evento por CPF com máscaras DIFERENTES → 1 doc só, LTV e
 *     contagens exatas (números reais, zero varredura no cliente);
 *   - fallback de chave: e-mail do responsável; atletaId como último recurso;
 *   - MINIMIZAÇÃO: o doc CRM não contém CPF/telefone/cidade/UF em NENHUM
 *     campo (shape fechado + varredura do JSON);
 *   - IDEMPOTÊNCIA: replay do mesmo write ⇒ noop (atualizadoEm intocado);
 *   - ESTORNO: entra no histórico e SAI do LTV; pendente/cancelada nunca
 *     constrói perfil; delete/da chave migrada expurga o doc vazio;
 *   - CROSS-TENANT fail-closed: pedidoRef apontando pedido de OUTRO tenant
 *     não contamina valor nem chave;
 *   - ATAQUES (Rules): leitura SÓ owner/staff do tenant dono — promoter,
 *     athlete, owner de OUTRO tenant, platform_admin (via client SDK) e
 *     anônimo NEGADOS; escrita de cliente NEGADA (create/update/delete).
 *
 * Pré-requisito: Firestore Emulator (porta 8080 ou LEELA_FS_EMU_PORT) — o
 * emulator de TESTE via emulators:exec, NUNCA o :8180 do preview.
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
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { derivarIdentidadeCliente, SUBCOLECAO_CRM_CLIENTES } from '@leela/core';
import { aplicarWriteInscritoNoCrm, clienteDocId } from '../crm/agregarClientes';

// Hardening A3 (COMF2): a chave do cliente é HMAC com pepper FAIL-CLOSED —
// os testes proveem a env EXPLÍCITA de teste (nunca valor de produção).
const PEPPER_TESTE = 'pepper-de-teste-crm-a3';
process.env['CRM_ID_PEPPER'] = PEPPER_TESTE;

const PROJECT_ID = 'demo-leela-crm';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';
const STAFF_UID = 'uid-castelo-staff';
const PROMOTER_UID = 'uid-castelo-promoter';
const PASSO_OWNER_UID = 'uid-passo-owner';
const ADMIN_UID = 'uid-platform-admin';
const ATHLETE_UID = 'uid-atleta-global';

const EV1 = 'meia-floripa-2026';
const EV2 = 'trail-serra-2026';

const CPF_BRUNA_MASCARADO = '529.982.247-25';
const CPF_BRUNA_DIGITOS = '52998224725';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

type DocData = Record<string, unknown>;

function inscrito(
  id: string,
  status: string,
  over: DocData = {},
  dadosPessoais?: DocData
): DocData {
  return {
    id,
    tenantId: CASTELO_ID,
    atletaId: `atleta-${id}`,
    atletaNome: `Atleta ${id}`,
    kit: 'sem_kit',
    kitId: null,
    chipNumero: null,
    status,
    modalidade: '10k',
    tamanhos: {},
    pedidoRef: null,
    ehResponsavel: false,
    ...(dadosPessoais !== undefined ? { dadosPessoais } : {}),
    criadoEm: Timestamp.fromMillis(1_000),
    atualizadoEm: Timestamp.fromMillis(1_000),
    ...over,
  };
}

function reg(nascimento: string, genero: string, cpf = CPF_BRUNA_MASCARADO): DocData {
  return {
    cpf,
    telefone: '(48) 99999-0001',
    nascimento,
    genero,
    cidade: 'Florianópolis',
    uf: 'SC',
  };
}

function pedido(
  id: string,
  eventoId: string,
  status: string,
  itens: DocData[],
  over: DocData = {}
): DocData {
  return {
    id,
    tenantId: CASTELO_ID,
    eventoId,
    responsavel: { atletaId: 'atleta-resp', nome: 'Resp', email: 'resp@email.com' },
    inscritoRefs: itens.map((i) => i['inscritoRef'] as string),
    itens,
    pagamentoRef: null,
    valorTotal: itens.reduce((s, i) => s + (i['valorFinal'] as number), 0),
    status,
    criadoEm: Timestamp.fromMillis(1_000),
    atualizadoEm: Timestamp.fromMillis(1_000),
    ...over,
  };
}

/** Simula o gatilho: aplica o par before/after no CRM. */
async function aplicar(
  eventoId: string,
  inscritoId: string,
  before: DocData | null,
  after: DocData | null
) {
  return aplicarWriteInscritoNoCrm(adminDb, eventoId, inscritoId, before, after);
}

const crmPath = (key: string) =>
  `tenants/${CASTELO_ID}/${SUBCOLECAO_CRM_CLIENTES}/${key}`;

const KEY_BRUNA = () =>
  clienteDocId(
    CASTELO_ID,
    derivarIdentidadeCliente({ cpf: CPF_BRUNA_DIGITOS, atletaId: 'x' })
  );

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      // Porta da LANE: honra LEELA_FS_EMU_PORT e cai no host injetado pelo
      // próprio emulators:exec (no Windows o prefixo VAR=x não existe no
      // cmd — sem o fallback a suíte mirava 8080 com o emulator em 8480).
      port: Number(
        process.env['LEELA_FS_EMU_PORT'] ??
          process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
          8080
      ),
    },
  });
  if (!admin.apps.length) {
    // Mesmo fallback do initializeTestEnvironment acima (Windows-safe):
    // preserva o FIRESTORE_EMULATOR_HOST que o emulators:exec injetou.
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
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo', slug: PASSO_ID,
    status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('eventos').doc(EV1), {
    id: EV1, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Meia de Floripa 2026', slug: EV1, status: 'publicado',
    data: Timestamp.fromDate(new Date('2026-04-25T12:00:00Z')),
    local: 'Florianópolis', modalidades: ['10k'],
    qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('eventos').doc(EV2), {
    id: EV2, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Trail da Serra 2026', slug: EV2, status: 'publicado',
    data: Timestamp.fromDate(new Date('2026-09-12T12:00:00Z')),
    local: 'Urubici', modalidades: ['10k'],
    qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
  });
  // Pedidos PAGOS com decomposição por inscrito (ADR-011)
  batch.set(adminDb.collection('pedidos').doc('ped1'), pedido('ped1', EV1, 'pago', [
    { inscritoRef: 'i1', valorBase: 200, desconto: 10.1, valorFinal: 189.9, taxaRepassada: 10.1 },
  ]));
  batch.set(adminDb.collection('pedidos').doc('ped2'), pedido('ped2', EV2, 'pago', [
    { inscritoRef: 'i2', valorBase: 120, desconto: 0, valorFinal: 120 },
  ]));
  batch.set(adminDb.collection('pedidos').doc('ped3'), pedido('ped3', EV1, 'pago', [
    { inscritoRef: 'i3', valorBase: 80, desconto: 0, valorFinal: 80 },
  ], {
    responsavel: { atletaId: 'atleta-i3', nome: 'Carlos', email: 'Carlos@Email.com' },
  }));
  // Pedido de OUTRO tenant (ataque: pedidoRef adulterado não contamina)
  batch.set(adminDb.collection('pedidos').doc('ped-intruso'), pedido('ped-intruso', EV1, 'pago', [
    { inscritoRef: 'i5', valorBase: 999, desconto: 0, valorFinal: 999 },
  ], {
    tenantId: PASSO_ID,
    responsavel: { atletaId: 'atleta-i5', nome: 'Intruso', email: 'intruso@email.com' },
  }));
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}
const ownerA = () => ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
const staffA = () => ctxAs(STAFF_UID, { role: 'tenant_staff', tenantId: CASTELO_ID });
const promoterA = () => ctxAs(PROMOTER_UID, { role: 'promoter', tenantId: CASTELO_ID });
const ownerB = () => ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
const platformAdmin = () => ctxAs(ADMIN_UID, { role: 'platform_admin' });
const athlete = () => ctxAs(ATHLETE_UID, { role: 'athlete' });

// ── Inscritos canônicos dos cenários ───────────────────────────────────────
const bruna1 = () =>
  inscrito('i1', 'confirmado',
    { atletaId: 'atleta-bruna-a', atletaNome: 'Bruna Rocha', pedidoRef: 'ped1' },
    reg('1993-04-12', 'feminino', CPF_BRUNA_MASCARADO));
const bruna2 = () =>
  inscrito('i2', 'confirmado',
    { atletaId: 'atleta-bruna-b', atletaNome: 'Bruna R. Silva', pedidoRef: 'ped2',
      atualizadoEm: Timestamp.fromMillis(2_000) },
    reg('1993-04-12', 'feminino', CPF_BRUNA_DIGITOS)); // MESMO CPF sem máscara
const carlos = () =>
  inscrito('i3', 'confirmado',
    { atletaId: 'atleta-i3', atletaNome: 'Carlos Mota', pedidoRef: 'ped3',
      ehResponsavel: true });

describe('aplicarWriteInscritoNoCrm — linking e agregação real', () => {
  it('CPF com máscaras DIFERENTES em 2 eventos → UM cliente com LTV cross-evento', async () => {
    await aplicar(EV1, 'i1', null, bruna1());
    await aplicar(EV2, 'i2', null, bruna2());

    const key = KEY_BRUNA();
    const snap = await adminDb.doc(crmPath(key)).get();
    expect(snap.exists).toBe(true);
    expect(snap.get('chaveTipo')).toBe('cpf');
    expect(snap.get('qtdEventos')).toBe(2);
    expect(snap.get('qtdInscricoes')).toBe(2);
    expect(snap.get('ltv')).toBe(309.9); // 189.90 + 120 (sem taxa — P-E19-5)
    expect(snap.get('valorGasto')).toBe(320); // + taxaRepassada 10.10
    expect(snap.get('nome')).toBe('Bruna R. Silva'); // inscrição mais recente
    expect(snap.get('nascimento')).toBe('1993-04-12');
    expect(snap.get('aniversario')).toBe('04-12');
    expect(snap.get('genero')).toBe('feminino');
    const eventos = snap.get('eventos') as Record<string, DocData>;
    expect(eventos[EV1]?.['valorPago']).toBe(189.9);
    expect(eventos[EV2]?.['valorPago']).toBe(120);
    expect(eventos[EV1]?.['nome']).toBe('Meia de Floripa 2026');
  });

  it('sem CPF: responsável do pedido linka por E-MAIL; MINIMIZAÇÃO do doc', async () => {
    await aplicar(EV1, 'i3', null, carlos());
    const key = clienteDocId(
      CASTELO_ID,
      derivarIdentidadeCliente({ email: 'Carlos@Email.com', atletaId: 'x' })
    );
    expect(key.startsWith('email_')).toBe(true);
    const snap = await adminDb.doc(crmPath(key)).get();
    expect(snap.exists).toBe(true);
    expect(snap.get('ltv')).toBe(80);

    // Shape FECHADO do topo do doc — campo extra é vazamento
    const data = snap.data() as DocData;
    expect(Object.keys(data).sort()).toEqual([
      'aniversario', 'atualizadoEm', 'chaveTipo', 'eventos', 'genero',
      'inscricoes', 'ltv', 'nascimento', 'nome', 'qtdEventos',
      'qtdInscricoes', 'tenantId', 'valorGasto',
    ]);
    // Varredura: nada de CPF/telefone/cidade/UF/e-mail em NENHUM campo
    const json = JSON.stringify({ ...data, atualizadoEm: null });
    expect(json).not.toContain('52998224725');
    expect(json).not.toContain('529.982');
    expect(json).not.toContain('99999');
    expect(json).not.toContain('Florianópolis');
    expect(json).not.toContain('"SC"');
    expect(json).not.toContain('@');
  });

  it('IDEMPOTÊNCIA: replay do mesmo write ⇒ noop, atualizadoEm intocado', async () => {
    await aplicar(EV1, 'i1', null, bruna1());
    const key = KEY_BRUNA();
    const antes = await adminDb.doc(crmPath(key)).get();
    const carimbo = (antes.get('atualizadoEm') as Timestamp).toMillis();

    const acoes = await aplicar(EV1, 'i1', bruna1(), bruna1());
    expect(acoes[key]).toBe('noop');
    const depois = await adminDb.doc(crmPath(key)).get();
    expect((depois.get('atualizadoEm') as Timestamp).toMillis()).toBe(carimbo);
  });

  it('ESTORNO: entrada vira estornado no histórico e SAI do LTV/qtdEventos', async () => {
    await aplicar(EV1, 'i1', null, bruna1());
    await aplicar(EV2, 'i2', null, bruna2());
    const estornada = {
      ...bruna2(),
      status: 'estornado',
      estornadoEm: Timestamp.fromMillis(3_000),
      atualizadoEm: Timestamp.fromMillis(3_000),
    };
    await aplicar(EV2, 'i2', bruna2(), estornada);

    const snap = await adminDb.doc(crmPath(KEY_BRUNA())).get();
    expect(snap.get('ltv')).toBe(189.9); // só a de EV1
    expect(snap.get('qtdEventos')).toBe(1);
    expect(snap.get('qtdInscricoes')).toBe(1);
    const eventos = snap.get('eventos') as Record<string, DocData>;
    expect(eventos[EV2]?.['qtdEstornadas']).toBe(1);
    expect(eventos[EV2]?.['qtdInscricoes']).toBe(0);
    const inscricoes = snap.get('inscricoes') as Record<string, DocData>;
    expect(inscricoes[`${EV2}_i2`]?.['status']).toBe('estornado');
  });

  it('pendente/cancelada NÃO constrói perfil (P-E19-6); flip p/ cancelada expurga', async () => {
    const pendente = inscrito('i9', 'pendente', { pedidoRef: null }, reg('1990-01-01', 'outro'));
    await aplicar(EV1, 'i9', null, pendente);
    const col = await adminDb
      .collection(`tenants/${CASTELO_ID}/${SUBCOLECAO_CRM_CLIENTES}`)
      .get();
    expect(col.size).toBe(0);

    // Confirma, depois cancela: o doc nasce e é EXPURGADO (ficava vazio)
    const confirmada = { ...pendente, status: 'confirmado' };
    await aplicar(EV1, 'i9', pendente, confirmada);
    const key = KEY_BRUNA();
    expect((await adminDb.doc(crmPath(key)).get()).exists).toBe(true);
    await aplicar(EV1, 'i9', confirmada, { ...confirmada, status: 'cancelado' });
    expect((await adminDb.doc(crmPath(key)).get()).exists).toBe(false);
  });

  it('MIGRAÇÃO de chave: [reg] com CPF chegando depois move a entrada e apaga o doc antigo', async () => {
    const semReg = inscrito('i7', 'confirmado', { atletaId: 'atleta-i7' });
    await aplicar(EV1, 'i7', null, semReg);
    const keyAtleta = clienteDocId(
      CASTELO_ID,
      derivarIdentidadeCliente({ atletaId: 'atleta-i7' })
    );
    expect((await adminDb.doc(crmPath(keyAtleta)).get()).exists).toBe(true);

    const comReg = inscrito('i7', 'confirmado',
      { atletaId: 'atleta-i7', atualizadoEm: Timestamp.fromMillis(2_000) },
      reg('1988-02-02', 'masculino'));
    const acoes = await aplicar(EV1, 'i7', semReg, comReg);
    expect(acoes[keyAtleta]).toBe('delete'); // doc antigo vazio → expurgado
    expect((await adminDb.doc(crmPath(keyAtleta)).get()).exists).toBe(false);
    const snapNovo = await adminDb.doc(crmPath(KEY_BRUNA())).get();
    expect(snapNovo.exists).toBe(true);
    expect(snapNovo.get('chaveTipo')).toBe('cpf');
  });

  it('DELETE do inscrito remove a entrada (doc vazio é expurgado)', async () => {
    await aplicar(EV1, 'i1', null, bruna1());
    await aplicar(EV1, 'i1', bruna1(), null);
    expect((await adminDb.doc(crmPath(KEY_BRUNA())).get()).exists).toBe(false);
  });

  it('A1 fail-closed: inscrito com tenantId INCOERENTE com o evento pai não planta PII', async () => {
    // Write forjado/bugado (só possível via Admin — Rules negam de cliente):
    // inscrito "do tenant PASSO" dentro de evento do CASTELO.
    const forjado = inscrito('i8', 'confirmado',
      { tenantId: PASSO_ID, atletaId: 'atleta-i8' },
      reg('1991-01-01', 'feminino'));
    await aplicar(EV1, 'i8', null, forjado);
    // NENHUM doc de CRM nasce — nem no PASSO (alvo do forjador)…
    const colPasso = await adminDb
      .collection(`tenants/${PASSO_ID}/${SUBCOLECAO_CRM_CLIENTES}`)
      .get();
    expect(colPasso.size).toBe(0);
    // …nem no CASTELO (o doc não é do tenant do evento)
    const colCastelo = await adminDb
      .collection(`tenants/${CASTELO_ID}/${SUBCOLECAO_CRM_CLIENTES}`)
      .get();
    expect(colCastelo.size).toBe(0);
  });

  it('A2 fence: redelivery FORA DE ORDEM do confirmado não regride o estorno (LTV não ressuscita)', async () => {
    // at-least-once sem ordem: E1 (null→confirmado, t=1000) processa, depois
    // E2 (confirmado→estornado, t=3000); então E1 é REENTREGUE (snapshot velho).
    await aplicar(EV1, 'i1', null, bruna1());
    const estornada = {
      ...bruna1(),
      status: 'estornado',
      atualizadoEm: Timestamp.fromMillis(3_000),
    };
    await aplicar(EV1, 'i1', bruna1(), estornada);
    const key = KEY_BRUNA();
    const aposEstorno = await adminDb.doc(crmPath(key)).get();
    const carimbo = (aposEstorno.get('atualizadoEm') as Timestamp).toMillis();

    // Redelivery do evento ANTIGO (confirmado, t=1000 < 3000): fence segura
    const acoes = await aplicar(EV1, 'i1', null, bruna1());
    expect(acoes[key]).toBe('noop');
    const depois = await adminDb.doc(crmPath(key)).get();
    const inscricoes = depois.get('inscricoes') as Record<string, DocData>;
    expect(inscricoes[`${EV1}_i1`]?.['status']).toBe('estornado'); // não regrediu
    expect(depois.get('ltv')).toBe(0); // dinheiro devolvido NÃO ressuscita
    expect(depois.get('qtdEventos')).toBe(0);
    expect((depois.get('atualizadoEm') as Timestamp).toMillis()).toBe(carimbo);
  });

  it('CROSS-TENANT fail-closed: pedido de OUTRO tenant não dá valor nem chave', async () => {
    const i5 = inscrito('i5', 'confirmado', {
      atletaId: 'atleta-i5', pedidoRef: 'ped-intruso', ehResponsavel: true,
    });
    await aplicar(EV1, 'i5', null, i5);
    // e-mail do pedido intruso NÃO vira chave (fallback atletaId)…
    const keyAtleta = clienteDocId(
      CASTELO_ID,
      derivarIdentidadeCliente({ atletaId: 'atleta-i5' })
    );
    const snap = await adminDb.doc(crmPath(keyAtleta)).get();
    expect(snap.exists).toBe(true);
    // …e os R$ 999 do pedido alheio NÃO contaminam o LTV
    expect(snap.get('ltv')).toBe(0);
    expect(snap.get('valorGasto')).toBe(0);
  });
});

describe('Rules de crmClientes — ataques (PII individual)', () => {
  let key = '';
  beforeEach(async () => {
    await aplicar(EV1, 'i1', null, bruna1());
    key = KEY_BRUNA();
  });

  const P = () => ['tenants', CASTELO_ID, SUBCOLECAO_CRM_CLIENTES, key] as const;

  it('owner e staff do tenant dono LEEM', async () => {
    await assertSucceeds(getDoc(doc(ownerA().firestore(), ...P())));
    await assertSucceeds(getDoc(doc(staffA().firestore(), ...P())));
  });

  it('TESTE NEGATIVO: owner de OUTRO tenant NÃO lê o CRM alheio', async () => {
    await assertFails(getDoc(doc(ownerB().firestore(), ...P())));
  });

  it('promoter, athlete, platform_admin (client SDK) e anônimo NÃO leem', async () => {
    await assertFails(getDoc(doc(promoterA().firestore(), ...P())));
    await assertFails(getDoc(doc(athlete().firestore(), ...P())));
    await assertFails(getDoc(doc(platformAdmin().firestore(), ...P())));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), ...P())));
  });

  it('ESCRITA de cliente NEGADA — até o owner (forjar LTV/plantar PII)', async () => {
    const ref = doc(ownerA().firestore(), ...P());
    await assertFails(updateDoc(ref, { ltv: 999999 }));
    await assertFails(deleteDoc(ref));
    await assertFails(
      setDoc(doc(ownerA().firestore(), 'tenants', CASTELO_ID, SUBCOLECAO_CRM_CLIENTES, 'forjado'), {
        tenantId: CASTELO_ID, chaveTipo: 'cpf', nome: 'Forjado', ltv: 1,
      })
    );
  });
});

describe('Hardening A3 — chave HMAC com CRM_ID_PEPPER (fail-closed)', () => {
  const identidade = () =>
    derivarIdentidadeCliente({ cpf: CPF_BRUNA_DIGITOS, atletaId: 'x' });

  it('FAIL-CLOSED: sem pepper (ausente OU vazio) a chave LANÇA — em qualquer ambiente', () => {
    const original = process.env['CRM_ID_PEPPER'];
    try {
      delete process.env['CRM_ID_PEPPER'];
      expect(() => clienteDocId(CASTELO_ID, identidade())).toThrow(/CRM_ID_PEPPER/);
      process.env['CRM_ID_PEPPER'] = '';
      expect(() => clienteDocId(CASTELO_ID, identidade())).toThrow(/CRM_ID_PEPPER/);
    } finally {
      process.env['CRM_ID_PEPPER'] = original;
    }
  });

  it('pepper DIFERENTE ⇒ chave DIFERENTE (sha256 puro está morto: sem pepper não há chave)', () => {
    const comPepperDeTeste = clienteDocId(CASTELO_ID, identidade());
    const original = process.env['CRM_ID_PEPPER'];
    try {
      process.env['CRM_ID_PEPPER'] = 'outro-pepper-qualquer';
      const comOutroPepper = clienteDocId(CASTELO_ID, identidade());
      expect(comOutroPepper).not.toBe(comPepperDeTeste);
      // shape preservado: `{tipo}_{32 hex}` — nada do CPF vaza no id
      expect(comOutroPepper).toMatch(/^cpf_[0-9a-f]{32}$/);
      expect(comOutroPepper).not.toContain(CPF_BRUNA_DIGITOS);
    } finally {
      process.env['CRM_ID_PEPPER'] = original;
    }
  });

  it('determinístico SOB o mesmo pepper; tenant distinto NÃO correlaciona', () => {
    const a = clienteDocId(CASTELO_ID, identidade());
    expect(clienteDocId(CASTELO_ID, identidade())).toBe(a);
    expect(clienteDocId(PASSO_ID, identidade())).not.toBe(a);
  });
});
