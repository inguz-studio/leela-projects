/**
 * revRF21.antagonista.test.ts — REVIEW ANTAGONISTA da lane REV-RF2-1.
 *
 * Contexto fresco: nada do que o construtor afirmou no commit `5b8e4a77` é
 * premissa aqui. Cada `it` é uma TENTATIVA DE QUEBRAR uma promessa declarada.
 * Os que ficam verdes valem como prova de sobrevivência; os que ficam
 * vermelhos apontam defeito.
 *
 * Vetores (numeração do brief da review):
 *   1. a trava nova vira defeito novo — `cancelado`/`estornado` segurando
 *      e-mail legítimo, inclusive o estornado que JÁ TINHA ingresso (o
 *      `Not-tested` do commit);
 *   2. fail-closed no status desconhecido virando negação de serviço em massa;
 *   3. os OUTROS caminhos automáticos — `confirmarPagamentoSandboxCore` (a
 *      porta que o preview usa) exercitada de ponta a ponta, com a transação
 *      de confirmação REAL no meio;
 *   4. duas varreduras CONCORRENTES no ramo do esgotamento;
 *   5. `merge: true` e a honestidade de `aguardando`/`detalhe` no extrato;
 *   6. sequência operador × automático — o reenvio manual no meio da espera;
 *   7. inscrito apagado tratado como recusa;
 *   8. `listaCompleta` derivado sendo persistido por consumidor;
 *   + O NÃO DECLARADO (vetor 9, o achado desta review): depois do
 *     esgotamento, o inscrito que confirma tarde fica SEM INGRESSO EMITIDO e
 *     sem nenhuma porta de volta — a varredura pula por `esgotado` e o reenvio
 *     administrativo recusa `ingresso_incompleto` para sempre. É o mesmo beco
 *     da REV-F2F5, reaberto 15 minutos × 8 depois.
 *
 * ⚠ PRÉ-REQUISITO: Firestore Emulator (porta em `LEELA_FS_EMU_PORT`).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  COLECAO_LOG_COMUNICACAO,
  type AuthClaims,
  type EmailProvider,
  type SendTransactionalParams,
} from '@leela/core';
import {
  dispararEmissaoIngressosPosConfirmacao,
  emitirIngressosDoPedido,
} from '../eventos/emitirIngressos';
import { varrerIngressosOrfaosCore } from '../eventos/varrerIngressosOrfaos';
import {
  INGRESSOS_PENDENTES_COL,
  TENTATIVAS_VARREDURA_INGRESSO,
  registrarIngressoPendente,
} from '../eventos/ingressosPendentes';
import { obterQrKeyring } from '../eventos/qrToken';
import {
  reenviarEmailsDoPedidoCore,
  type ReenvioDeps,
} from '../checkout/reenviarEmailsPedido';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import { MockPaymentProvider } from '../payments/mockProvider';
import type { ContaSemFriccaoAuth } from '../checkout/contaSemFriccao';
import type { FinanceCaller } from '../finance/atores';
import { clearFirestoreDrained, withTriggersPaused } from './helpers/stability';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const ADMIN_UID = 'uid-platform-admin';
const EVENTO_ID = 'meia-floripa-2026';
const PEDIDO_ID = 'ped-rev-rf21';

const SEGREDO_B64 = Buffer.alloc(32, 7).toString('base64url');
const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);
const FIRESTORE_PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

const platformAdmin: FinanceCaller = {
  uid: ADMIN_UID,
  claims: { role: 'platform_admin' } as AuthClaims,
};

function providerEspiao(): {
  provider: EmailProvider;
  enviados: SendTransactionalParams[];
} {
  const enviados: SendTransactionalParams[] = [];
  return {
    enviados,
    provider: {
      name: 'espiao',
      async sendTransactional(params) {
        enviados.push(params);
        return { ok: true, messageId: `msg-${enviados.length}` };
      },
    },
  };
}

function authEspiao(): ContaSemFriccaoAuth {
  return {
    async getUidPorEmail() {
      return 'uid-conta-comprador';
    },
    async criarConta() {
      return 'uid-conta-comprador';
    },
    async papelDaConta() {
      // O reenvio administrativo NUNCA lê papel de conta — ele só re-entrega a
      // mensagem que a confirmação já decidiu mandar. Lançar aqui trava a
      // fronteira: se algum caminho passar a ler, este espião fica vermelho.
      throw new Error('reenvio não lê papel de conta (S032-T4)');
    },
    async gerarLinkDefinirSenha() {
      return 'https://painel.leela.test/redefinir-senha?oobCode=oob-1';
    },
  };
}

function deps(provider: EmailProvider | null): ReenvioDeps {
  return { emailProvider: provider, auth: authEspiao() };
}

let brevoOriginal: string | undefined;
let asaasOriginal: string | undefined;

beforeAll(async () => {
  process.env['QR_TOKEN_KEYS'] = JSON.stringify({ k1: SEGREDO_B64 });
  process.env['QR_TOKEN_KID_ATIVO'] = 'k1';
  // Ausência da chave de e-mail = o carimbo `pendente_chave` no pedido vira a
  // prova observável de "o envio foi TENTADO" (mesma técnica da lane BUILD),
  // e a garantia de que nenhuma execução manda e-mail real por acidente.
  brevoOriginal = process.env['BREVO_API_KEY'];
  delete process.env['BREVO_API_KEY'];
  // O core do sandbox recusa rodar com chave Asaas real (fail-safe do T1).
  asaasOriginal = process.env['ASAAS_API_KEY'];
  delete process.env['ASAAS_API_KEY'];
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: FIRESTORE_PORT,
    },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= `localhost:${FIRESTORE_PORT}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});

afterAll(async () => {
  delete process.env['QR_TOKEN_KEYS'];
  delete process.env['QR_TOKEN_KID_ATIVO'];
  if (brevoOriginal !== undefined) process.env['BREVO_API_KEY'] = brevoOriginal;
  if (asaasOriginal !== undefined) process.env['ASAAS_API_KEY'] = asaasOriginal;
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
  });
});

interface SemearOpts {
  pedidoId?: string;
  statusInscritos?: Record<string, string>;
  naoCriar?: readonly string[];
  /** Inscritos que já saem do seed COM ingresso emitido (token + código). */
  jaEmitidos?: Record<string, { qrToken: string; codigo: string }>;
  /** `pendente` = o estado ANTES do webhook (para o caminho sandbox real). */
  statusPedido?: string;
  /** Semeia `pagamentos/{id}` + `pagamentoRef` (caminho sandbox real). */
  comCobranca?: { chargeId: string; valorFinal: number };
}

async function semear(
  inscritos: readonly string[],
  opts: SemearOpts = {}
): Promise<void> {
  const pedidoId = opts.pedidoId ?? PEDIDO_ID;
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID,
    nome: 'Castelo Produções',
    slug: CASTELO_ID,
    status: 'ativo',
    ownerUid: MARINA_UID,
    tipo: 'produtor',
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(
    adminDb.collection('eventos').doc(EVENTO_ID),
    {
      id: EVENTO_ID,
      tenantId: CASTELO_ID,
      nome: 'Meia Maratona Floripa 2026',
      slug: EVENTO_ID,
      status: 'publicado',
      usaChip: false,
      receitaConfirmada: 0,
      criadoEm: now,
      atualizadoEm: now,
    },
    { merge: true }
  );
  const pedido: Record<string, unknown> = {
    id: pedidoId,
    tenantId: CASTELO_ID,
    eventoId: EVENTO_ID,
    status: opts.statusPedido ?? 'pago',
    inscritoRefs: [...inscritos],
    responsavel: {
      nome: 'Marina Compradora',
      email: 'marina@exemplo.test',
      atletaId: 'atleta-comprador',
    },
    criadoEm: now,
    atualizadoEm: now,
  };
  if (opts.comCobranca !== undefined) {
    const pagamentoId = `pag-${pedidoId}`;
    pedido['pagamentoRef'] = pagamentoId;
    pedido['valorTotal'] = opts.comCobranca.valorFinal;
    pedido['formaPagamento'] = 'pix';
    batch.set(adminDb.collection('pagamentos').doc(pagamentoId), {
      id: pagamentoId,
      tenantId: CASTELO_ID,
      eventoId: EVENTO_ID,
      pedidoRef: pedidoId,
      status: 'pendente',
      forma: 'pix',
      valorBase: opts.comCobranca.valorFinal,
      desconto: 0,
      valorFinal: opts.comCobranca.valorFinal,
      gatewayChargeId: opts.comCobranca.chargeId,
      gatewayAmountCentavos: Math.round(opts.comCobranca.valorFinal * 100),
      criadoEm: now,
      atualizadoEm: now,
    });
  }
  batch.set(adminDb.collection('pedidos').doc(pedidoId), pedido);
  for (const id of inscritos) {
    if (opts.naoCriar?.includes(id) === true) continue;
    const emitido = opts.jaEmitidos?.[id];
    batch.set(
      adminDb.collection('eventos').doc(EVENTO_ID).collection('inscritos').doc(id),
      {
        id,
        tenantId: CASTELO_ID,
        atletaId: `atleta-${id}`,
        atletaNome: `Atleta ${id}`,
        kit: 'kit_prata',
        chipNumero: null,
        status: opts.statusInscritos?.[id] ?? 'confirmado',
        modalidade: '10k',
        tamanhos: {},
        pedidoRef: pedidoId,
        ehResponsavel: id.endsWith('-1'),
        ...(emitido !== undefined
          ? { qrToken: emitido.qrToken, codigoIngresso: emitido.codigo }
          : {}),
        criadoEm: now,
        atualizadoEm: now,
      }
    );
  }
  await batch.commit();
}

const confirmarWebhook = (pedidoId = PEDIDO_ID) =>
  dispararEmissaoIngressosPosConfirmacao(adminDb, {
    statusGateway: 'confirmed',
    ignorado: false,
    duplicado: false,
    pedidoId,
  });

async function lerPedido(
  pedidoId = PEDIDO_ID
): Promise<admin.firestore.DocumentData> {
  const snap = await adminDb.collection('pedidos').doc(pedidoId).get();
  return snap.data() ?? {};
}

async function lerPendencia(
  pedidoId = PEDIDO_ID
): Promise<admin.firestore.DocumentData | undefined> {
  const snap = await adminDb.collection(INGRESSOS_PENDENTES_COL).doc(pedidoId).get();
  return snap.exists ? snap.data() : undefined;
}

async function logsDoEvento(): Promise<admin.firestore.QuerySnapshot> {
  return adminDb
    .collection('eventos')
    .doc(EVENTO_ID)
    .collection(COLECAO_LOG_COMUNICACAO)
    .get();
}

async function lerInscrito(
  id: string
): Promise<admin.firestore.DocumentData | undefined> {
  const snap = await adminDb
    .collection('eventos')
    .doc(EVENTO_ID)
    .collection('inscritos')
    .doc(id)
    .get();
  return snap.exists ? snap.data() : undefined;
}

/** Leva a pendência do pedido até a última passagem ANTES do esgotamento. */
async function varrerAte(n: number, provider: EmailProvider): Promise<void> {
  for (let i = 0; i < n; i++) {
    await varrerIngressosOrfaosCore(adminDb, obterQrKeyring(), provider);
  }
}

describe.skipIf(!hasEmulator)('REV-RF2-1 · vetores 1, 7 e 8', () => {
  // ── VETOR 1 ─────────────────────────────────────────────────────────────
  it('vetor 1: `estornado` que JÁ TINHA ingresso não segura o e-mail e não entrega o QR do estornado', async () => {
    // O `Not-tested` do commit. O estorno é POR INSCRITO (ADR-011): o pedido
    // segue pago e o comprador tem direito ao e-mail dos que sobraram — mas o
    // QR de quem teve o dinheiro de volta não pode viajar nele.
    await semear(['insc-1', 'insc-2'], {
      statusInscritos: { 'insc-2': 'estornado' },
      jaEmitidos: {
        'insc-2': { qrToken: 'token-do-estornado', codigo: 'ZZ9Z9Z' },
      },
    });

    const r = await confirmarWebhook();

    expect(r?.naoElegiveis).toBe(1);
    expect(r?.aguardando).toBe(0);
    expect(r?.listaCompleta).toBe(true);
    // O ingresso do estornado NÃO entra na lista, mesmo já existindo.
    expect(r?.ingressos.map((i) => i.inscritoId)).toEqual(['insc-1']);
    // O envio FOI tentado na hora (carimbo do fail-closed da chave).
    expect((await lerPedido())['emailIngressos']['status']).toBe('pendente_chave');
    expect(await lerPendencia()).toBeUndefined();
  });

  it('vetor 1: pedido com terminal + confirmado sai NA HORA; pedido só de terminais não vira pendência', async () => {
    await semear(['insc-1', 'insc-2', 'insc-3'], {
      statusInscritos: { 'insc-2': 'cancelado', 'insc-3': 'estornado' },
    });
    const r = await confirmarWebhook();
    expect(r?.naoElegiveis).toBe(2);
    expect(r?.listaCompleta).toBe(true);
    expect((await lerPedido())['emailIngressos']['status']).toBe('pendente_chave');
    expect(await lerPendencia()).toBeUndefined();

    // Só terminais: nada a entregar, e nada que a varredura possa curar.
    await semear(['solo-1'], {
      pedidoId: 'ped-so-terminais',
      statusInscritos: { 'solo-1': 'cancelado' },
    });
    const r2 = await confirmarWebhook('ped-so-terminais');
    expect(r2?.listaCompleta).toBe(true);
    expect(r2?.ingressos).toHaveLength(0);
    expect(await lerPendencia('ped-so-terminais')).toBeUndefined();
  });

  // ── VETOR 7 ─────────────────────────────────────────────────────────────
  it('vetor 7: inscrito APAGADO deixa o comprador com lista curta e NENHUM extrato consultável', async () => {
    // O juízo do construtor: recusa (não segura o e-mail). A pergunta que esta
    // review faz é a outra metade — o que sobra para o operador DEPOIS.
    await semear(['insc-1', 'insc-2'], { naoCriar: ['insc-2'] });

    const r = await confirmarWebhook();

    expect(r?.rejeitados).toBe(1);
    expect(r?.listaCompleta).toBe(true);
    // O e-mail sai (correto: não há a quem entregar e não há cura). Mas o
    // pedido pagou por 2 e recebeu 1, e isso NÃO fica em lugar nenhum que uma
    // consulta alcance: nem `ingressosPendentes`, nem campo no pedido.
    expect((await lerPedido())['emailIngressos']['status']).toBe('pendente_chave');
    expect(await lerPendencia()).toBeUndefined();
    const todas = await adminDb.collection(INGRESSOS_PENDENTES_COL).get();
    expect(todas.size).toBe(0);
  });

  // ── VETOR 8 ─────────────────────────────────────────────────────────────
  it('vetor 8: `listaCompleta` é derivado e NÃO vaza para nenhuma coleção persistida', async () => {
    await semear(['insc-1', 'insc-2'], { statusInscritos: { 'insc-2': 'pendente' } });
    await confirmarWebhook();
    const espiao = providerEspiao();
    await varrerIngressosOrfaosCore(adminDb, obterQrKeyring(), espiao.provider);

    const pend = await lerPendencia();
    expect(pend?.['listaCompleta']).toBeUndefined();
    expect(pend?.['naoElegiveis']).toBeUndefined();
    expect(pend?.['ingressos']).toBeUndefined();
    // E o doc do pedido (o único lido pelo cliente) não ganhou campo novo.
    const pedido = await lerPedido();
    expect(pedido['listaCompleta']).toBeUndefined();
    expect(pedido['aguardando']).toBeUndefined();
  });
});

describe.skipIf(!hasEmulator)('REV-RF2-1 · vetor 2 — fail-closed em massa', () => {
  it('vetor 2: status corrompido em 10 pedidos segura 10 e-mails e abre 10 pendências numa passagem só', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const pedidoId = `ped-massa-${i}`;
      ids.push(pedidoId);
      await semear([`m${i}-1`, `m${i}-2`], {
        pedidoId,
        statusInscritos: { [`m${i}-2`]: 'status_de_migracao_ruim' },
      });
    }
    for (const id of ids) await confirmarWebhook(id);

    const pendentes = await adminDb.collection(INGRESSOS_PENDENTES_COL).get();
    expect(pendentes.size).toBe(10);
    for (const id of ids) {
      expect((await lerPedido(id))['emailIngressos']).toBeUndefined();
    }
    expect((await logsDoEvento()).size).toBe(0);

    // A varredura aguenta a passagem inteira sem derrubar nada — mas ela lê a
    // coleção INTEIRA sem limite nem cursor (`.where(resolvido,==,false).get()`),
    // e nenhuma pendência de `aguardando` se resolve sozinha. É o custo que
    // esta review reporta como ressalva de escala, não como defeito de lógica.
    const espiao = providerEspiao();
    const v = await varrerIngressosOrfaosCore(adminDb, obterQrKeyring(), espiao.provider);
    expect(v.pendentes).toBe(10);
    expect(v.falhas).toBe(0);
    expect(espiao.enviados).toHaveLength(0);
  }, 120_000);
});

describe.skipIf(!hasEmulator)('REV-RF2-1 · vetor 3 — os outros caminhos automáticos', () => {
  it('vetor 3: `confirmarPagamentoSandboxCore` REAL — a transação da confirmação flipa `pendente`, então o e-mail sai na hora', async () => {
    // A porta que o preview usa, de ponta a ponta. Ela é a mesma que o
    // `pagamentoWebhook` mock usa (`processarWebhookPagamento`), então o que
    // vale aqui vale para os dois — e é o caminho que a lane NÃO exercitou.
    await semear(['sbx-1', 'sbx-2'], {
      pedidoId: 'ped-sandbox-ok',
      statusPedido: 'pendente',
      statusInscritos: { 'sbx-1': 'pendente', 'sbx-2': 'pendente' },
      comCobranca: { chargeId: 'chg-sbx-ok', valorFinal: 100 },
    });

    // O core JÁ dispara a emissão por dentro — é essa a porta sob teste.
    const res = await confirmarPagamentoSandboxCore(
      adminDb,
      new MockPaymentProvider(),
      { pedidoId: 'ped-sandbox-ok' },
      { uid: 'atleta-comprador' }
    );
    expect(res.statusGateway).toBe('confirmed');
    expect(res.statusPedido).toBe('pago');

    // A transação de confirmação flipou os DOIS `pendente` → `confirmado`, então
    // o ramo `aguardando` do RF2-1 nem é alcançado pelo caminho feliz: o envio
    // foi TENTADO na mesma janela (carimbo do fail-closed da chave).
    expect((await lerPedido('ped-sandbox-ok'))['emailIngressos']['status']).toBe(
      'pendente_chave'
    );
    expect(await lerPendencia('ped-sandbox-ok')).toBeUndefined();
    for (const id of ['sbx-1', 'sbx-2']) {
      expect(String((await lerInscrito(id))?.['qrToken'] ?? '').length).toBeGreaterThan(0);
    }
    // E re-chamar o disparo é inofensivo (idempotente por inscrito).
    const r = await dispararEmissaoIngressosPosConfirmacao(adminDb, res);
    expect(r?.jaEmitidos).toBe(2);
    expect(r?.aguardando).toBe(0);
    expect(r?.listaCompleta).toBe(true);
  });

  it('vetor 3: no caminho sandbox REAL, status fora do enum NÃO é flipado pela confirmação e SEGURA o e-mail', async () => {
    // O flip da transação é `if (status === 'pendente')`. Um status corrompido
    // atravessa a confirmação intacto e chega à emissão — é por esta porta que
    // o `aguardando` do RF2-1 realmente nasce no caminho automático.
    await semear(['sbx2-1', 'sbx2-2'], {
      pedidoId: 'ped-sandbox-zumbi',
      statusPedido: 'pendente',
      statusInscritos: { 'sbx2-1': 'pendente', 'sbx2-2': 'zumbi' },
      comCobranca: { chargeId: 'chg-sbx-zumbi', valorFinal: 100 },
    });

    await confirmarPagamentoSandboxCore(
      adminDb,
      new MockPaymentProvider(),
      { pedidoId: 'ped-sandbox-zumbi' },
      { uid: 'atleta-comprador' }
    );

    // Estado DEPOIS da porta real, sem nenhum disparo extra do teste: o e-mail
    // não foi nem tentado e a pendência nasceu na própria janela.
    expect((await lerPedido('ped-sandbox-zumbi'))['emailIngressos']).toBeUndefined();
    expect((await lerPendencia('ped-sandbox-zumbi'))?.['aguardando']).toBe(1);
    expect((await lerPendencia('ped-sandbox-zumbi'))?.['resolvido']).toBe(false);
    expect((await logsDoEvento()).size).toBe(0);
  });

  it('vetor 3: re-entrega do sandbox (duplicado) não emite, não manda e-mail e não abre pendência nova', async () => {
    await semear(['sbx3-1'], {
      pedidoId: 'ped-sandbox-dup',
      statusPedido: 'pendente',
      statusInscritos: { 'sbx3-1': 'pendente' },
      comCobranca: { chargeId: 'chg-sbx-dup', valorFinal: 100 },
    });
    const provider = new MockPaymentProvider();
    const primeira = await confirmarPagamentoSandboxCore(
      adminDb,
      provider,
      { pedidoId: 'ped-sandbox-dup' },
      { uid: 'atleta-comprador' }
    );
    await dispararEmissaoIngressosPosConfirmacao(adminDb, primeira);

    const segunda = await confirmarPagamentoSandboxCore(
      adminDb,
      provider,
      { pedidoId: 'ped-sandbox-dup' },
      { uid: 'atleta-comprador' }
    );
    expect(segunda.duplicado).toBe(true);
    const r2 = await dispararEmissaoIngressosPosConfirmacao(adminDb, segunda);
    expect(r2).toBeNull();
    expect((await adminDb.collection(INGRESSOS_PENDENTES_COL).get()).size).toBe(0);
  });
});

describe.skipIf(!hasEmulator)('REV-RF2-1 · vetores 4, 5 e 6', () => {
  // ── VETOR 4 ─────────────────────────────────────────────────────────────
  it('vetor 4: duas varreduras CONCORRENTES no ramo do esgotamento não duplicam a credencial', async () => {
    await semear(['insc-1', 'insc-2'], { statusInscritos: { 'insc-2': 'pendente' } });
    await confirmarWebhook();
    const espiao = providerEspiao();
    // Sete passagens: a próxima é a que esgota.
    await varrerAte(TENTATIVAS_VARREDURA_INGRESSO - 1, espiao.provider);
    expect(espiao.enviados).toHaveLength(0);

    const [a, b] = await Promise.all([
      varrerIngressosOrfaosCore(adminDb, obterQrKeyring(), espiao.provider),
      varrerIngressosOrfaosCore(adminDb, obterQrKeyring(), espiao.provider),
    ]);

    // As duas podem alcançar o ramo do esgotamento (o carimbo é transacional,
    // mas `esgotado` fica true para as duas). A RN-219 é quem segura o segundo
    // e-mail: MESMO docId derivado de `inscritoRefs`.
    expect(a.falhas + b.falhas).toBe(0);
    expect(espiao.enviados).toHaveLength(1);
    expect((await logsDoEvento()).size).toBe(1);
    expect(a.emailsEnviados + b.emailsEnviados).toBe(1);
  });

  // ── VETOR 5 ─────────────────────────────────────────────────────────────
  it('vetor 5: `aguardando` normalizado NÃO pode zerar um extrato que ainda está esperando', async () => {
    await semear(['insc-1', 'insc-2'], { statusInscritos: { 'insc-2': 'pendente' } });
    await confirmarWebhook();
    expect((await lerPendencia())?.['aguardando']).toBe(1);
    expect((await lerPendencia())?.['detalhe']).toBe('aguardando_confirmacao');

    // O caminho `disparo_falhou` (o catch do disparo) grava SEM `aguardando` —
    // e a normalização o transforma em 0 sobre uma pendência que continua
    // esperando por um inscrito. É a forma exata da mentira que a normalização
    // dizia impedir, com o sinal invertido.
    await registrarIngressoPendente(adminDb, {
      pedidoId: PEDIDO_ID,
      eventoId: null,
      motivo: 'disparo_falhou',
      falhas: 0,
      detalhe: 'boom',
    });

    const pend = await lerPendencia();
    const aindaEsperando = await emitirIngressosDoPedido(
      adminDb,
      PEDIDO_ID,
      obterQrKeyring()
    );
    expect(aindaEsperando.aguardando).toBe(1);
    expect(pend?.['aguardando']).toBe(1);
  });

  // ── VETOR 6 ─────────────────────────────────────────────────────────────
  it('vetor 6: reenvio manual NO MEIO da espera entrega lista PARCIAL e carimba o pedido como entregue', async () => {
    await semear(['insc-1', 'insc-2'], { statusInscritos: { 'insc-2': 'pendente' } });
    await confirmarWebhook();

    // O operador reenvia enquanto o caminho automático segura o e-mail.
    const espiaoManual = providerEspiao();
    const res = await reenviarEmailsDoPedidoCore(
      adminDb,
      { pedidoId: PEDIDO_ID, reenvioId: 'meio-da-espera-1', alvos: ['ingresso'] },
      platformAdmin,
      deps(espiaoManual.provider)
    );

    // ⚠ ACHADO (item de painel, não fix desta review): `lerIngressosVivosDoPedido`
    // ignora `pendente` — assimetria DECLARADA pelo construtor — e o inscrito
    // que segura o e-mail some sem entrar em `semIngresso`. Resultado: o
    // reenvio entrega a lista PELA METADE e devolve `enviado` ao operador, com
    // a pendência ABERTA, no exato momento em que o automático se recusa a
    // fazer isso. E carimba `emailIngressos.status = 'enviado'` num pedido a
    // que ainda falta uma credencial. Nada no retorno diz "parcial": o único
    // sinal é `ingressos: 1` contra dois `inscritoRefs`.
    expect(res.resultados.ingresso).toBe('enviado');
    expect(res.ingressos).toBe(1);
    expect(espiaoManual.enviados).toHaveLength(1);
    expect((await lerPedido())['emailIngressos']['status']).toBe('enviado');
    expect((await lerPendencia())?.['resolvido']).toBe(false);
    expect((await lerPendencia())?.['aguardando']).toBe(1);

    // O inscrito confirma; a varredura fecha com a lista inteira.
    await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('inscritos')
      .doc('insc-2')
      .update({ status: 'confirmado' });
    const espiaoAuto = providerEspiao();
    await varrerIngressosOrfaosCore(adminDb, obterQrKeyring(), espiaoAuto.provider);
    expect(espiaoAuto.enviados).toHaveLength(1);

    // Reenvio DEPOIS: sai de novo (a chave é da operação), mas com os MESMOS
    // tokens — um segundo e-mail nunca é uma segunda credencial (RN-420).
    const tokensAntes = (await emitirIngressosDoPedido(
      adminDb,
      PEDIDO_ID,
      obterQrKeyring()
    )).ingressos.map((i) => i.qrToken);
    const espiao2 = providerEspiao();
    const res2 = await reenviarEmailsDoPedidoCore(
      adminDb,
      {
        pedidoId: PEDIDO_ID,
        reenvioId: 'depois-da-espera-1',
        alvos: ['ingresso'],
        forcar: true,
      },
      platformAdmin,
      deps(espiao2.provider)
    );
    expect(res2.resultados.ingresso).toBe('enviado');
    const tokensDepois = (await emitirIngressosDoPedido(
      adminDb,
      PEDIDO_ID,
      obterQrKeyring()
    )).ingressos.map((i) => i.qrToken);
    expect(tokensDepois).toEqual(tokensAntes);
  });
});

describe.skipIf(!hasEmulator)(
  'REV-RF2-1 · vetor 9 (NÃO declarado) — o beco depois do esgotamento',
  () => {
    it('vetor 9: quem confirma DEPOIS do esgotamento fica sem ingresso EMITIDO e sem nenhuma porta de volta', async () => {
      // A promessa do fix é que o `aguardando` leva o caso à varredura e que
      // ela "fecha o e-mail quando a emissão completar". A espera é de 8
      // passagens × 15 min = 2 HORAS. O gerador declarado do estado é uma ação
      // HUMANA do organizador (acerto manual, transferência, reprocesso), que
      // rotineiramente demora mais que isso.
      await semear(['insc-1', 'insc-2'], { statusInscritos: { 'insc-2': 'pendente' } });
      await confirmarWebhook();

      const espiao = providerEspiao();
      await varrerAte(TENTATIVAS_VARREDURA_INGRESSO, espiao.provider);
      expect((await lerPendencia())?.['esgotado']).toBe(true);
      expect(espiao.enviados).toHaveLength(1); // e-mail PARCIAL, chave queimada

      // Hora 3: o organizador confirma o inscrito que faltava.
      await adminDb
        .collection('eventos')
        .doc(EVENTO_ID)
        .collection('inscritos')
        .doc('insc-2')
        .update({ status: 'confirmado' });

      // A varredura pula por `esgotado` — nem tenta emitir.
      const v = await varrerIngressosOrfaosCore(
        adminDb,
        obterQrKeyring(),
        espiao.provider
      );
      expect(v.conferenciaManual).toBe(1);

      // O operador faz a única coisa que lhe resta: pedir o reenvio.
      const espiaoManual = providerEspiao();
      const res = await reenviarEmailsDoPedidoCore(
        adminDb,
        { pedidoId: PEDIDO_ID, reenvioId: 'beco-pos-esgotamento-1', alvos: ['ingresso'] },
        platformAdmin,
        deps(espiaoManual.provider)
      );
      expect(res.resultados.ingresso).toBe('ingresso_incompleto');

      // O QUE ESTA REVIEW EXIGE: depois de o operador pedir explicitamente, o
      // caso tem de voltar a ser curável. O inscrito confirmado precisa SAIR
      // COM INGRESSO — sem token e sem código ele não passa nem no balcão.
      const depoisDoPedidoDoOperador = await varrerIngressosOrfaosCore(
        adminDb,
        obterQrKeyring(),
        espiao.provider
      );
      expect(depoisDoPedidoDoOperador.emitidos).toBe(1);

      const insc2 = await lerInscrito('insc-2');
      expect(typeof insc2?.['qrToken']).toBe('string');
      expect(String(insc2?.['qrToken'] ?? '').length).toBeGreaterThan(0);
      expect(typeof insc2?.['codigoIngresso']).toBe('string');

      // E o reenvio administrativo passa a entregar os DOIS.
      const espiao2 = providerEspiao();
      const res2 = await reenviarEmailsDoPedidoCore(
        adminDb,
        {
          pedidoId: PEDIDO_ID,
          reenvioId: 'beco-pos-esgotamento-2',
          alvos: ['ingresso'],
          forcar: true,
        },
        platformAdmin,
        deps(espiao2.provider)
      );
      expect(res2.resultados.ingresso).toBe('enviado');
      expect(res2.ingressos).toBe(2);
    }, 120_000);
  }
);
