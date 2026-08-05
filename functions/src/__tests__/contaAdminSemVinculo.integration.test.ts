/**
 * contaAdminSemVinculo.integration.test.ts — LEELA-S032-T4 (RN-449d)
 *
 * Integração REAL no Firestore+Auth Emulator da lane BUILD-A4
 * (`firebase.a4.json` — firestore 8983 / auth 9983, host IPv4 explícito;
 * honra `LEELA_FS_EMU_PORT` / `LEELA_AUTH_EMU_PORT`).
 *
 * O QUE ESTA SUÍTE PROVA (RN-449d · "o lado cliente para de amarrar compra em
 * conta de administração"):
 *
 *   1. RECUSA — pedido pago cujo `responsavel.email` resolve uma conta com
 *      claim `platform_admin` sai com `contaSemFriccao.contaUid` NULO, com o
 *      motivo carimbado, com `pessoas/{ref}.contaUid` INTOCADO e com o pedido
 *      ainda em `pago`. A recusa é do VÍNCULO, nunca da venda.
 *   2. ESTREITEZA — a guarda pega `platform_admin` e MAIS NADA. Conta de
 *      organizador (`tenant_owner`) que compra continua vinculando, porque a
 *      RN-450 manda organizador e cliente caberem na MESMA conta.
 *   3. NÃO-REGRESSÃO — e-mail comum continua amarrando exatamente como antes.
 *   4. A CHAVE DE LEITURA NÃO É CONCEDIDA — a consulta que a área do cliente
 *      faz (`contaSemFriccao.contaUid == uid`, RN-469) não devolve o pedido do
 *      administrador. É a materialização da RN-449 do lado do dado.
 *   5. IDEMPOTÊNCIA — replay do fluxo sobre o pedido recusado não repete
 *      efeito nem troca o carimbo.
 *   6. NENHUM E-MAIL DE SENHA sai nesse caminho, e nenhuma conta nasce.
 *   7. FRONTEIRA POSSE-EMAIL-1 IMÓVEL — conta preexistente com e-mail NÃO
 *      verificado continua sendo vinculada. Esta lane fecha a fronteira
 *      ADMIN; a fronteira de POSSE do e-mail é item de dono e NÃO se moveu.
 *
 * FALSIFICAÇÃO (o brief exige): remover a leitura de papel de
 * `garantirContaSemFriccao` mata os casos 1, 4, 5 e 6 e devolve o vínculo ao
 * pedido do administrador. Medido: contra os fontes de HEAD (sem o fix) a
 * suíte fecha com 4 falhas, todas nesses casos.
 *
 * ⚠ PRÉ-REQUISITO: Firestore + Auth Emulator via `firebase emulators:exec`.
 */

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { EmailProvider, SendTransactionalParams } from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { pessoaDocIdDoCpf } from '../checkout/pessoaRegistry';
import {
  contaSemFriccaoAuthAdmin,
  garantirContaSemFriccao,
} from '../checkout/contaSemFriccao';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import { MockPaymentProvider } from '../payments/mockProvider';

const PROJECT_ID = 'demo-leela-a4';

process.env['FIREBASE_AUTH_EMULATOR_HOST'] =
  `localhost:${process.env['LEELA_AUTH_EMU_PORT'] ?? '9099'}`;
process.env['CRM_ID_PEPPER'] = 'pepper-teste-a4';
// Keyring de TESTE: o caso 7 passa pela confirmação REAL, que emite ingresso
// logo depois da conta sem fricção. Sem o ring a emissão vira pendência e
// polui a leitura do caso — o alvo aqui é o vínculo, não a emissão.
process.env['QR_TOKEN_KEYS'] = JSON.stringify({
  k1: Buffer.alloc(32, 4).toString('base64url'),
});
process.env['QR_TOKEN_KID_ATIVO'] = 'k1';

const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-adminsep-2026';

/** Motivo canônico da recusa (RN-449d) — o teste soletra a string de propósito. */
const MOTIVO_RECUSA = 'conta_admin_nao_vinculavel';

// Contas do Auth desta suíte. E-mails próprios do arquivo: o Auth Emulator
// não tem `clearAuth` equivalente ao `clearFirestore` e roda QUENTE entre
// execuções.
const ADMIN = {
  uid: 'a4-uid-admin-plataforma',
  email: 'admin.plataforma.a4@exemplo.com.br',
  nome: 'Ada Administradora',
  cpf: '529.982.247-25',
};
const ORGANIZADOR = {
  uid: 'a4-uid-organizador',
  email: 'organizador.a4@exemplo.com.br',
  nome: 'Otavio Organizador',
  cpf: '111.444.777-35',
};
const COMPRADOR = {
  uid: 'a4-uid-comprador-comum',
  email: 'comprador.comum.a4@exemplo.com.br',
  nome: 'Clara Compradora',
  cpf: '390.533.447-05',
};
const NAO_VERIFICADO = {
  uid: 'a4-uid-nao-verificado',
  email: 'nao.verificado.a4@exemplo.com.br',
  nome: 'Nina NaoVerificada',
  cpf: '418.529.630-42',
};
const ADMIN_E2E = {
  email: 'admin.plataforma.a4@exemplo.com.br',
  nome: 'Ada Administradora',
  cpf: '153.509.460-56',
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: 'localhost',
      port: Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080),
    },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      `localhost:${process.env['LEELA_FS_EMU_PORT'] ?? '8080'}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  await seedBase();
  await semearContas();
}, 30_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (deltaDias: number): Timestamp =>
  Timestamp.fromDate(new Date(Date.now() + deltaDias * DIA_MS));

async function seedBase(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: 'uid-marina-castelo', tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 20 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });
  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-marina-castelo',
    nome: 'Meia da Separação de Contas 2026',
    data: tsRel(45), local: 'Florianópolis/SC',
    modalidades: ['10k'],
    slug: EVENTO_ID, status: 'publicado', usaChip: true,
    qtdInscritos: 0, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc('10k-l1'), {
    id: '10k-l1', tenantId: TENANT_ID, modalidade: '10k', ordem: 1,
    nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(30),
    quantidadeLimite: 500, preco: 189.9, vendidos: 10,
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

/**
 * Cria as contas do Auth com o papel de cada uma na CLAIM (RN-401 — a claim é
 * a fonte única de papel, e é dela que a guarda tem de ler).
 */
async function semearContas(): Promise<void> {
  await criarConta(ADMIN.uid, ADMIN.email, true);
  await admin.auth().setCustomUserClaims(ADMIN.uid, { role: 'platform_admin' });
  await criarConta(ORGANIZADOR.uid, ORGANIZADOR.email, true);
  await admin
    .auth()
    .setCustomUserClaims(ORGANIZADOR.uid, {
      role: 'tenant_owner',
      tenantId: TENANT_ID,
    });
  await criarConta(COMPRADOR.uid, COMPRADOR.email, true);
  await admin.auth().setCustomUserClaims(COMPRADOR.uid, { role: 'athlete' });
  await criarConta(NAO_VERIFICADO.uid, NAO_VERIFICADO.email, false);
}

async function criarConta(
  uid: string,
  email: string,
  emailVerified: boolean
): Promise<void> {
  try {
    await admin.auth().createUser({ uid, email, emailVerified });
  } catch (err) {
    const code = (err as { code?: string }).code;
    // Auth Emulator QUENTE entre execuções: a conta da rodada anterior já
    // existe. Estado equivalente — mas as claims são reaplicadas acima.
    if (
      code !== 'auth/uid-already-exists' &&
      code !== 'auth/email-already-exists'
    ) {
      throw err;
    }
  }
}

/** Input de checkout de UM inscrito, que é o próprio responsável. */
function inputSolo(
  key: string,
  p: { nome: string; email: string; cpf: string }
): CreateInscricaoChargeInput {
  return {
    eventoId: EVENTO_ID,
    inscritos: [{ nome: p.nome, email: p.email, cpf: p.cpf, modalidade: '10k' }],
    responsavelIndex: 0,
    responsavel: { nome: p.nome, email: p.email },
    endereco: {
      cep: '88015-600', logradouro: 'Rua Bocaiúva', bairro: 'Centro',
      cidade: 'Florianópolis', uf: 'SC', numero: '100',
    },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
  };
}

/** Provedor de e-mail ESPIÃO — conta envios sem tocar em rede. */
function providerEspiao(): EmailProvider & { readonly envios: number } {
  const estado = { n: 0 };
  return {
    name: 'espiao-a4',
    get envios() {
      return estado.n;
    },
    async sendTransactional(_params: SendTransactionalParams) {
      estado.n += 1;
      return { ok: true as const, messageId: `a4-${estado.n}` };
    },
  };
}

/**
 * Cria o pedido e o força a `pago` pelo Admin SDK, SEM passar pelo disparo
 * automático da confirmação — assim cada caso exercita `garantirContaSemFriccao`
 * uma vez só, com o provedor espião desta suíte. É a mesma técnica do
 * `checkout2Modelo.integration.test.ts`.
 */
async function pedidoPago(
  key: string,
  p: { nome: string; email: string; cpf: string }
): Promise<string> {
  const r = await createInscricaoChargeCore(db, provider, inputSolo(key, p), {
    uid: `anon-${key}`,
    ehAnonimo: true,
  });
  await db.collection('pedidos').doc(r.pedidoId).update({ status: 'pago' });
  return r.pedidoId;
}

async function carimbo(pedidoId: string): Promise<Record<string, unknown>> {
  return (
    ((await db.collection('pedidos').doc(pedidoId).get()).get(
      'contaSemFriccao'
    ) as Record<string, unknown> | undefined) ?? {}
  );
}

/**
 * O par que o vínculo escreve, do jeito que o disco devolve.
 *
 * FICHA INTOCADA é `contaUid: null` + `contaEmail` AUSENTE — o `null` é o
 * valor com que `pessoaRegistry` cria a ficha (RN-174: "criação nunca
 * reivindica"), e o vínculo é justamente quem troca os dois de uma vez. Medir
 * ausência do campo daria falso-verde: o campo existe desde o nascimento.
 */
async function vinculoDaPessoa(
  cpf: string
): Promise<{ contaUid: unknown; contaEmail: unknown }> {
  const snap = await db.doc(`pessoas/${pessoaDocIdDoCpf(cpf)}`).get();
  return { contaUid: snap.get('contaUid'), contaEmail: snap.get('contaEmail') };
}

// ---------------------------------------------------------------------------

describe('S032-T4 · RN-449d — compra NUNCA amarra em conta de administração', () => {
  /** Pedido do caso 1 — os casos 2 e 3 medem o estado que ele deixou. */
  let pedidoDoAdmin = '';

  it('1 · conta `platform_admin`: vínculo RECUSADO, motivo carimbado, pessoa intocada, pedido segue PAGO', async () => {
    const pedidoId = await pedidoPago('a4-admin-01', ADMIN);
    pedidoDoAdmin = pedidoId;
    const email = providerEspiao();

    const resultado = await garantirContaSemFriccao(
      db, pedidoId, contaSemFriccaoAuthAdmin(), email
    );

    // O fluxo RODOU (carimbou), e recusou o vínculo com motivo próprio.
    expect(resultado.processado).toBe(true);
    expect(resultado.contaUid).toBeNull();
    expect(resultado.contaCriada).toBe(false);
    expect(resultado.motivo).toBe(MOTIVO_RECUSA);

    const c = await carimbo(pedidoId);
    expect(c['contaUid']).toBeNull();
    expect(c['contaCriada']).toBe(false);
    expect(c['motivo']).toBe(MOTIVO_RECUSA);
    expect(c['pessoaVinculada']).toBe(false);

    // A ficha da pessoa do CPF do responsável NÃO foi tocada (RN-173/RN-174 —
    // o escritor único recusou, e recusar é não escrever).
    expect(await vinculoDaPessoa(ADMIN.cpf)).toEqual({
      contaUid: null,
      contaEmail: undefined,
    });

    // DINHEIRO FAIL-OPEN: a compra continua paga.
    expect(
      (await db.collection('pedidos').doc(pedidoId).get()).get('status')
    ).toBe('pago');

    // Nenhum e-mail de definição de senha nesse caminho.
    expect(email.envios).toBe(0);
  });

  it('2 · a chave de leitura da área do cliente NÃO é concedida ao administrador (RN-469)', async () => {
    const encontrados = await db
      .collection('pedidos')
      .where('contaSemFriccao.contaUid', '==', ADMIN.uid)
      .get();
    expect(encontrados.empty).toBe(true);
  });

  it('3 · replay sobre o pedido recusado: `ja_processado`, carimbo imutável, nada criado', async () => {
    const antes = await carimbo(pedidoDoAdmin);

    const email = providerEspiao();
    const replay = await garantirContaSemFriccao(
      db, pedidoDoAdmin, contaSemFriccaoAuthAdmin(), email
    );
    expect(replay.processado).toBe(false);
    expect(replay.motivo).toBe('ja_processado');
    expect(replay.contaUid).toBeNull();
    expect(email.envios).toBe(0);

    const depois = await carimbo(pedidoDoAdmin);
    expect(depois['contaUid']).toBe(antes['contaUid'] ?? null);
    expect(depois['motivo']).toBe(MOTIVO_RECUSA);
    // A recusa não criou conta nova nem tocou a ficha da pessoa.
    expect((await vinculoDaPessoa(ADMIN.cpf)).contaUid).toBeNull();
  });

  it('4 · a guarda é ESTREITA: conta de organizador (`tenant_owner`) que compra CONTINUA vinculando (RN-450)', async () => {
    const pedidoId = await pedidoPago('a4-org-01', ORGANIZADOR);
    const resultado = await garantirContaSemFriccao(
      db, pedidoId, contaSemFriccaoAuthAdmin(), providerEspiao()
    );

    expect(resultado.processado).toBe(true);
    expect(resultado.contaUid).toBe(ORGANIZADOR.uid);
    expect(resultado.motivo).toBeUndefined();
    expect((await vinculoDaPessoa(ORGANIZADOR.cpf)).contaUid).toBe(
      ORGANIZADOR.uid
    );
    expect((await carimbo(pedidoId))['contaUid']).toBe(ORGANIZADOR.uid);
  });

  it('5 · SEM REGRESSÃO: e-mail comum amarra a compra como sempre', async () => {
    const pedidoId = await pedidoPago('a4-comum-01', COMPRADOR);
    const resultado = await garantirContaSemFriccao(
      db, pedidoId, contaSemFriccaoAuthAdmin(), providerEspiao()
    );

    expect(resultado.processado).toBe(true);
    expect(resultado.contaUid).toBe(COMPRADOR.uid);
    expect(resultado.contaCriada).toBe(false);
    expect(resultado.motivo).toBeUndefined();
    expect((await vinculoDaPessoa(COMPRADOR.cpf)).contaUid).toBe(COMPRADOR.uid);

    const c = await carimbo(pedidoId);
    expect(c['contaUid']).toBe(COMPRADOR.uid);
    expect(c['motivo']).toBeUndefined();
    expect(c['pessoaVinculada']).toBe(true);
  });

  it('6 · POSSE-EMAIL-1 IMÓVEL: conta preexistente com e-mail NÃO verificado continua vinculando', async () => {
    // Esta lane fecha a fronteira ADMIN e SÓ ela. Exigir posse do e-mail antes
    // do vínculo é o default do POSSE-EMAIL-1, que está no painel do dono
    // aguardando ratificação — se este caso virar vermelho, alguém implementou
    // a decisão do dono sem o dono.
    const pedidoId = await pedidoPago('a4-naoverif-01', NAO_VERIFICADO);
    const resultado = await garantirContaSemFriccao(
      db, pedidoId, contaSemFriccaoAuthAdmin(), providerEspiao()
    );

    expect(
      (await admin.auth().getUser(NAO_VERIFICADO.uid)).emailVerified
    ).toBe(false);
    expect(resultado.contaUid).toBe(NAO_VERIFICADO.uid);
    expect((await vinculoDaPessoa(NAO_VERIFICADO.cpf)).contaUid).toBe(
      NAO_VERIFICADO.uid
    );
  });

  it('7 · pela CONFIRMAÇÃO REAL: a venda do administrador fecha em `pago` com a recusa carimbada', async () => {
    // Caminho de ponta a ponta: `confirmarPagamentoSandboxCore` dispara o
    // fluxo por dentro (best-effort). A recusa não pode aparecer como falha
    // da confirmação — dinheiro fail-open, identidade fail-closed.
    const r = await createInscricaoChargeCore(
      db, provider, inputSolo('a4-admin-e2e', ADMIN_E2E),
      { uid: 'anon-a4-admin-e2e', ehAnonimo: true }
    );
    await confirmarPagamentoSandboxCore(db, provider, { pedidoId: r.pedidoId }, {
      uid: 'anon-a4-admin-e2e',
    });

    const snap = await db.collection('pedidos').doc(r.pedidoId).get();
    expect(snap.get('status')).toBe('pago');
    const c = (snap.get('contaSemFriccao') ?? {}) as Record<string, unknown>;
    expect(c['contaUid']).toBeNull();
    expect(c['motivo']).toBe(MOTIVO_RECUSA);
    expect(await vinculoDaPessoa(ADMIN_E2E.cpf)).toEqual({
      contaUid: null,
      contaEmail: undefined,
    });
  });
});
