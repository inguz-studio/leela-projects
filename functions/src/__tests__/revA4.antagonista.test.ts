/**
 * revA4.antagonista.test.ts — review REV-A4 (contexto fresco) sobre `b1bd5dc4`
 *
 * Integração REAL no Firestore+Auth Emulator da lane REV-A4
 * (`firebase.reva4.json` — firestore 8993 / auth 9993, host IPv4 explícito;
 * honra `LEELA_FS_EMU_PORT` / `LEELA_AUTH_EMU_PORT`).
 *
 * A suíte da construção (`contaAdminSemVinculo.integration.test.ts`) prova que
 * a RN-449d saiu do papel. Esta aqui ataca o que ELA não mediu — o que o
 * carimbo de recusa faz com o resto do sistema, e o que a leitura de papel
 * custa no caminho do dinheiro:
 *
 *   1. `papelDaConta` PROPAGA a falha do Auth, e a conta já nasceu quando ela
 *      propaga. A compra fica órfã (sem carimbo, sem vínculo, sem e-mail de
 *      senha) e o reenvio administrativo NÃO a conserta — ele gateia por
 *      `contaCriada === true` e o carimbo nem existe. Não há caminho de
 *      reprocesso do `contaSemFriccao` em lugar nenhum do repositório.
 *   2. o pedido recusado NÃO destrava o reenvio de "defina sua senha" para a
 *      conta do painel — a metade da RN-449d que protege o administrador.
 *   3. RN-452 IMÓVEL: a recusa do vínculo não tira da pessoa o caminho até o
 *      ingresso. O QR e o código nascem do mesmo jeito e o link assinado do
 *      e-mail continua sendo a porta.
 *   4. a área do cliente fica MUDA sobre a compra recusada: `lerPedidosDaConta`
 *      devolve vazio e o `motivo` carimbado não chega a nenhuma superfície.
 *      É a lacuna que a RN-451 ("não mente dizendo que não há compras") cobra.
 *   5. a recusa vale só para o vínculo NOVO. Conta que JÁ acumula — estado que
 *      a RN-449 proíbe e que a A5 ainda vai contar — continua lendo as compras
 *      antigas pela ficha e pelo carimbo velhos.
 *   6. a guarda é ESTREITA por `typeof string`, e isso é consistente com o
 *      resto do sistema: claim `role` que não é string também não é
 *      `platform_admin` para `assertPlatformAdmin` nem para as Rules.
 *   7. papel forjado no payload da confirmação não engana a guarda — ela lê o
 *      Auth pelo Admin SDK, nunca o token nem o `data` do request.
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
  MOTIVO_CONTA_ADMIN,
  type ContaSemFriccaoAuth,
} from '../checkout/contaSemFriccao';
import { reenviarEmailsDoPedidoCore } from '../checkout/reenviarEmailsPedido';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import { emitirIngressosDoPedido } from '../eventos/emitirIngressos';
import { lerPedidosDaConta } from '../cliente/leituraArea';
import { resolverContaDoCliente } from '../cliente/gateAreaCliente';
import { assertPlatformAdmin } from '../finance/atores';
import { MockPaymentProvider } from '../payments/mockProvider';
import type { QrKeyring } from '../eventos/qrToken';

const PROJECT_ID = 'demo-leela-reva4';

process.env['FIREBASE_AUTH_EMULATOR_HOST'] =
  `localhost:${process.env['LEELA_AUTH_EMU_PORT'] ?? '9099'}`;
process.env['CRM_ID_PEPPER'] = 'pepper-teste-reva4';

const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-reva4-2026';
const RING: QrKeyring = { ativo: 'k1', chaves: { k1: Buffer.alloc(32, 11) } };

const ADMIN = {
  uid: 'reva4-uid-admin',
  email: 'admin.reva4@exemplo.com.br',
  nome: 'Ada Administradora',
  cpf: '529.982.247-25',
};
/** Conta que ACUMULA hoje: `platform_admin` com compra antiga amarrada. */
const ADMIN_ACUMULA = {
  uid: 'reva4-uid-admin-acumula',
  email: 'admin.acumula.reva4@exemplo.com.br',
  nome: 'Ana Acumulada',
  cpfAntigo: '111.444.777-35',
  cpfNovo: '390.533.447-05',
};
/** Claim `role` que NÃO é string — a estreiteza declarada como Not-tested. */
const PAPEL_TORTO = {
  uid: 'reva4-uid-papel-torto',
  email: 'papel.torto.reva4@exemplo.com.br',
  nome: 'Tobias Torto',
  cpf: '418.529.630-42',
};
/** E-mail SEM conta — a porta cria a conta e só depois o Auth cai. */
const NOVO = {
  uid: 'reva4-uid-conta-nova',
  email: 'conta.nova.reva4@exemplo.com.br',
  nome: 'Nadia Nova',
  cpf: '153.509.460-56',
};
const ADMIN_FORJA = {
  email: 'admin.reva4@exemplo.com.br',
  nome: 'Ada Administradora',
  cpf: '246.813.570-90',
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
    nome: 'Meia da Review A4 2026',
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

async function criarConta(uid: string, email: string): Promise<void> {
  try {
    await admin.auth().createUser({ uid, email, emailVerified: true });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/uid-already-exists' && code !== 'auth/email-already-exists') {
      throw err;
    }
  }
}

async function semearContas(): Promise<void> {
  await criarConta(ADMIN.uid, ADMIN.email);
  await admin.auth().setCustomUserClaims(ADMIN.uid, { role: 'platform_admin' });
  await criarConta(ADMIN_ACUMULA.uid, ADMIN_ACUMULA.email);
  await admin
    .auth()
    .setCustomUserClaims(ADMIN_ACUMULA.uid, { role: 'platform_admin' });
  await criarConta(PAPEL_TORTO.uid, PAPEL_TORTO.email);
  // A claim TORTA: `role` como array. O `typeof string` da guarda a ignora —
  // e o caso 6 prova que ignorá-la é o que mantém a guarda alinhada ao resto.
  await admin
    .auth()
    .setCustomUserClaims(PAPEL_TORTO.uid, { role: ['platform_admin'] });
  // `NOVO` NÃO é semeada de propósito: o caso 1 depende de a conta nascer
  // dentro do fluxo, que é onde o buraco fica.
  try {
    await admin.auth().deleteUser(NOVO.uid);
  } catch {
    /* emulator quente: a conta pode não existir, e é o estado desejado */
  }
}

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

function providerEspiao(): EmailProvider & { readonly envios: number } {
  const estado = { n: 0 };
  return {
    name: 'espiao-reva4',
    get envios() {
      return estado.n;
    },
    async sendTransactional(_params: SendTransactionalParams) {
      estado.n += 1;
      return { ok: true as const, messageId: `reva4-${estado.n}` };
    },
  };
}

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

async function carimbo(pedidoId: string): Promise<unknown> {
  return (await db.collection('pedidos').doc(pedidoId).get()).get(
    'contaSemFriccao'
  );
}

async function fichaDe(cpf: string): Promise<{ contaUid: unknown }> {
  const snap = await db.doc(`pessoas/${pessoaDocIdDoCpf(cpf)}`).get();
  return { contaUid: snap.get('contaUid') };
}

/**
 * Porta do Auth que CRIA a conta de verdade e depois cai na leitura do papel.
 * É o cenário do vetor 1: Auth intermitente entre `createUser` e `getUser`.
 */
function authQueCaiNoPapel(uidNovo: string): ContaSemFriccaoAuth & {
  readonly links: number;
} {
  const estado = { links: 0 };
  return {
    get links() {
      return estado.links;
    },
    async getUidPorEmail() {
      return null;
    },
    async criarConta(params) {
      await admin.auth().createUser({
        uid: uidNovo,
        email: params.email,
        emailVerified: false,
      });
      return uidNovo;
    },
    async papelDaConta() {
      const err = new Error('backend unavailable') as Error & { code?: string };
      err.code = 'auth/internal-error';
      throw err;
    },
    async gerarLinkDefinirSenha() {
      estado.links += 1;
      return 'https://leela.test/definir-senha?oobCode=nunca';
    },
  };
}

/** Porta de reenvio: o papel NUNCA é lido por lá (fronteira da S032-T4). */
function authDeReenvio(): ContaSemFriccaoAuth & { readonly links: number } {
  const estado = { links: 0 };
  return {
    get links() {
      return estado.links;
    },
    async getUidPorEmail() {
      return ADMIN.uid;
    },
    async criarConta() {
      return ADMIN.uid;
    },
    async papelDaConta() {
      throw new Error('reenvio não lê papel de conta (S032-T4)');
    },
    async gerarLinkDefinirSenha() {
      estado.links += 1;
      return `https://leela.test/definir-senha?oobCode=oob-${estado.links}`;
    },
  };
}

// ---------------------------------------------------------------------------

describe('REV-A4 · o que a recusa da RN-449d faz com o resto do sistema', () => {
  it('1 · Auth cai DEPOIS de criar a conta: pedido órfão, e o reenvio administrativo não conserta', async () => {
    const pedidoId = await pedidoPago('reva4-novo-01', NOVO);
    const porta = authQueCaiNoPapel(NOVO.uid);

    // A falha PROPAGA — é o `Directive` do commit, e é o desfecho seguro.
    await expect(
      garantirContaSemFriccao(db, pedidoId, porta, providerEspiao())
    ).rejects.toThrow(/backend unavailable/);

    // O DINHEIRO está intocado, e é a metade que importa.
    expect((await db.collection('pedidos').doc(pedidoId).get()).get('status')).toBe(
      'pago'
    );

    // Mas a conta JÁ NASCEU antes da queda — sem senha e sem e-mail de senha.
    const contaNova = await admin.auth().getUser(NOVO.uid);
    expect(contaNova.email).toBe(NOVO.email);
    expect(porta.links).toBe(0);

    // E o pedido ficou SEM carimbo: nenhum vínculo, nenhuma pendência legível
    // por quem consome o pedido.
    expect(await carimbo(pedidoId)).toBeUndefined();
    expect((await fichaDe(NOVO.cpf)).contaUid).toBeNull();

    // ⚔ O QUE ESTA REVIEW COBRA: o reenvio administrativo NÃO refaz o vínculo
    // nem entrega a senha, porque ele gateia por `contaCriada === true` e o
    // carimbo nem existe. Não há, em todo o repositório, caminho que rode
    // `garantirContaSemFriccao` de novo — os três chamadores são os
    // confirmadores, e a confirmação é exactly-once.
    const espiao = providerEspiao();
    const reenvio = await reenviarEmailsDoPedidoCore(
      db,
      { pedidoId, reenvioId: 'reva4-orfao-0001', alvos: ['conta'] },
      { uid: ADMIN.uid, claims: { role: 'platform_admin' } },
      { emailProvider: espiao, auth: authDeReenvio() }
    );
    expect(reenvio.resultados.conta).toBe('nao_aplicavel');
    expect(espiao.envios).toBe(0);
  });

  it('2 · pedido do ADMIN recusado: o reenvio NÃO manda "defina sua senha" para a conta do painel', async () => {
    const pedidoId = await pedidoPago('reva4-admin-01', ADMIN);
    const r = await garantirContaSemFriccao(
      db, pedidoId, contaSemFriccaoAuthAdmin(), providerEspiao()
    );
    expect(r.motivo).toBe(MOTIVO_CONTA_ADMIN);

    const espiao = providerEspiao();
    const porta = authDeReenvio();
    const reenvio = await reenviarEmailsDoPedidoCore(
      db,
      { pedidoId, reenvioId: 'reva4-admin-0001', alvos: ['conta'] },
      { uid: ADMIN.uid, claims: { role: 'platform_admin' } },
      { emailProvider: espiao, auth: porta }
    );
    // `contaCriada: false` é a tranca: nenhum link de senha é gerado para a
    // conta de administração, nem pela ferramenta do próprio administrador.
    expect(reenvio.resultados.conta).toBe('nao_aplicavel');
    expect(porta.links).toBe(0);
    expect(espiao.envios).toBe(0);
  });

  it('3 · RN-452 IMÓVEL: a recusa do vínculo não tira o caminho até o ingresso', async () => {
    // Confirmação REAL: é ela que flipa o inscrito para `confirmado` e dispara
    // a recusa por dentro. Medir a emissão sobre um pedido forçado a `pago` na
    // mão mediria outra coisa.
    const r = await createInscricaoChargeCore(
      db, provider,
      inputSolo('reva4-admin-ing', { ...ADMIN, cpf: '765.432.198-82' }),
      { uid: 'anon-reva4-admin-ing', ehAnonimo: true }
    );
    await confirmarPagamentoSandboxCore(
      db, provider, { pedidoId: r.pedidoId }, { uid: 'anon-reva4-admin-ing' }
    );
    expect((await carimbo(r.pedidoId)) as Record<string, unknown>).toMatchObject({
      contaUid: null,
      motivo: MOTIVO_CONTA_ADMIN,
    });

    // O ingresso nasce igual: token assinado + código legível. É o link
    // assinado do e-mail (RN-452) que continua sendo a porta de quem comprou,
    // e ele não passa por conta nenhuma.
    const emissao = await emitirIngressosDoPedido(db, r.pedidoId, RING);
    expect(emissao.processado).toBe(true);
    const ingresso = emissao.ingressos[0];
    expect(ingresso?.qrToken.length).toBeGreaterThan(0);
    expect(ingresso?.codigo.length).toBeGreaterThan(0);
  });

  it('4 · a área do cliente fica MUDA: o `motivo` carimbado não chega a nenhuma superfície', async () => {
    // Caso auto-suficiente de propósito: nenhum estado herdado de outro `it`,
    // para o arquivo aguentar `--sequence.shuffle`.
    const pedidoId = await pedidoPago('reva4-admin-muda', {
      ...ADMIN,
      cpf: '334.455.667-39',
    });
    const r = await garantirContaSemFriccao(
      db, pedidoId, contaSemFriccaoAuthAdmin(), providerEspiao()
    );
    expect(r.motivo).toBe(MOTIVO_CONTA_ADMIN);

    // O dado EXISTE e explica a si mesmo…
    const doPedido = (await db.collection('pedidos').doc(pedidoId).get()).get(
      'contaSemFriccao'
    ) as Record<string, unknown>;
    expect(doPedido['motivo']).toBe(MOTIVO_CONTA_ADMIN);

    // ⚔ …e a tela não vê nada. Quem PAGOU recebe da área do cliente a mesma
    // resposta de quem nunca comprou. A RN-451 manda a área não mentir dizendo
    // que não há compras, e este é o caso em que ela mente. Item de painel, não
    // de código: quem decide o que a tela diz ao administrador é o dono.
    const pedidos = await lerPedidosDaConta(db, {
      uid: ADMIN.uid,
      email: ADMIN.email,
      pessoaIds: [],
      pessoasTruncadas: false,
    });
    expect(pedidos).toHaveLength(0);
  });

  it('5 · a recusa vale só para o vínculo NOVO: conta que já acumula continua lendo o antigo', async () => {
    // Estado que a RN-449 proíbe e que existe HOJE (a A5 é quem vai contá-lo):
    // conta `platform_admin` com ficha e carimbo de uma compra anterior.
    const fichaAntiga = pessoaDocIdDoCpf(ADMIN_ACUMULA.cpfAntigo);
    const now = FieldValue.serverTimestamp();
    await db.doc(`pessoas/${fichaAntiga}`).set({
      contaUid: ADMIN_ACUMULA.uid,
      contaEmail: ADMIN_ACUMULA.email,
      criadoEm: now, atualizadoEm: now,
    });
    await db.collection('pedidos').doc('ped-reva4-antigo').set({
      id: 'ped-reva4-antigo', tenantId: TENANT_ID, eventoId: EVENTO_ID,
      status: 'pago',
      responsavel: { nome: ADMIN_ACUMULA.nome, email: ADMIN_ACUMULA.email },
      contaSemFriccao: {
        contaUid: ADMIN_ACUMULA.uid, contaCriada: false,
        emailStatus: 'nao_aplicavel', pessoaVinculada: true,
      },
      criadoEm: now, atualizadoEm: now,
    });

    // A compra NOVA é recusada, como manda a RN-449d.
    const pedidoNovo = await pedidoPago('reva4-acumula-01', {
      nome: ADMIN_ACUMULA.nome,
      email: ADMIN_ACUMULA.email,
      cpf: ADMIN_ACUMULA.cpfNovo,
    });
    const r = await garantirContaSemFriccao(
      db, pedidoNovo, contaSemFriccaoAuthAdmin(), providerEspiao()
    );
    expect(r.motivo).toBe(MOTIVO_CONTA_ADMIN);
    expect((await fichaDe(ADMIN_ACUMULA.cpfNovo)).contaUid).toBeNull();

    // ⚔ Mas a porta VELHA continua aberta: a ficha antiga ainda aponta para a
    // conta de administração, e o pedido antigo continua na área do cliente.
    // A RN-449d fecha o fluxo, nunca o estoque — a migração é da A5.
    const gate = await resolverContaDoCliente(db, {
      uid: ADMIN_ACUMULA.uid,
      ehAnonimo: false,
      email: ADMIN_ACUMULA.email,
      emailVerificado: true,
    });
    expect(gate.estado).toBe('ok');
    expect(gate.conta?.pessoaIds).toContain(fichaAntiga);

    const listados = await lerPedidosDaConta(db, {
      uid: ADMIN_ACUMULA.uid,
      email: ADMIN_ACUMULA.email,
      pessoaIds: gate.conta?.pessoaIds ?? [],
      pessoasTruncadas: false,
    });
    expect(listados.map((p) => p.id)).toEqual(['ped-reva4-antigo']);
  });

  it('6 · claim `role` NÃO-string não é recusada, e é consistente com o resto do sistema', async () => {
    const pedidoId = await pedidoPago('reva4-torto-01', PAPEL_TORTO);
    const r = await garantirContaSemFriccao(
      db, pedidoId, contaSemFriccaoAuthAdmin(), providerEspiao()
    );
    // A guarda deixa passar — e tem de deixar: um `role` que não é string
    // também não é `platform_admin` para nenhum outro leitor da plataforma.
    expect(r.contaUid).toBe(PAPEL_TORTO.uid);
    expect(r.motivo).toBeUndefined();
    expect(() =>
      assertPlatformAdmin({
        role: ['platform_admin'],
      } as unknown as Parameters<typeof assertPlatformAdmin>[0])
    ).toThrow();
  });

  it('7 · papel forjado no payload da confirmação não engana a guarda', async () => {
    // A guarda lê o Auth pelo Admin SDK. Nem o token do chamador nem o `data`
    // do request participam — e é isso que este caso trava.
    const r = await createInscricaoChargeCore(
      db, provider, inputSolo('reva4-forja', ADMIN_FORJA),
      { uid: 'anon-reva4-forja', ehAnonimo: true }
    );
    await confirmarPagamentoSandboxCore(
      db,
      provider,
      { pedidoId: r.pedidoId, role: 'athlete', papel: 'athlete' } as unknown as {
        pedidoId: string;
      },
      { uid: 'anon-reva4-forja', claims: { role: 'athlete' } } as unknown as {
        uid: string;
      }
    );

    expect((await carimbo(r.pedidoId)) as Record<string, unknown>).toMatchObject({
      contaUid: null,
      motivo: MOTIVO_CONTA_ADMIN,
    });
  });
});
