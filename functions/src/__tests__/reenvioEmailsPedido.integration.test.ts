/**
 * reenvioEmailsPedido.integration.test.ts — F2 · P0 do DIAG-PIXREAL
 *
 * O caso concreto: o primeiro pagamento real (04/08) entregou tudo no backend
 * — pedido pago, conta criada, ingresso `T93N7F` emitido — e os DOIS e-mails
 * morreram no 401 de allowlist da Brevo. Não havia como reentregar, porque os
 * dois caminhos automáticos são idempotentes no sentido contrário (a emissão
 * pula quem já tem `qrToken`; o e-mail é at-most-once por pedido, RN-219).
 *
 * Este arquivo prova a ferramenta que fecha o buraco, contra o Emulator:
 *   - o reenvio ENTREGA os mesmos e-mails depois de a RN-219 já ter queimado
 *     a chave (é a razão de existir da ferramenta);
 *   - o ingresso NÃO é reemitido: `qrToken` e `codigoIngresso` byte a byte
 *     iguais, e o e-mail carrega o MESMO código;
 *   - rodar 2× não duplica, pelas DUAS trancas: mesma chave ⇒ replay sem
 *     envio; chave nova dentro da janela ⇒ recusado; `forcar` atravessa;
 *   - não-admin é NEGADO e a negação fica registrada em `auditoriaAcessos`;
 *   - pedido não pago é recusado;
 *   - emissão incompleta ⇒ nada sai (é caso da varredura, não do reenvio);
 *   - conta que já existia antes da compra nunca recebe "sua conta foi criada";
 *   - `reenviosEmail` é server-only (deny-by-default, sem `match` nas Rules).
 *
 * ⚠ PRÉ-REQUISITO: Firestore Emulator (8080) via `firebase emulators:exec`.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  AuthClaims,
  EmailProvider,
  SendTransactionalParams,
} from '@leela/core';
import { dispararEmissaoIngressosPosConfirmacao } from '../eventos/emitirIngressos';
import {
  JANELA_REENVIO_MS,
  REENVIOS_EMAIL_COL,
  reenviarEmailsDoPedidoCore,
  type ReenvioDeps,
} from '../checkout/reenviarEmailsPedido';
import type { ContaSemFriccaoAuth } from '../checkout/contaSemFriccao';
import { AUDITORIA_ACESSOS_COL } from '../shared/auditoriaAcessos';
import type { FinanceCaller } from '../finance/atores';
import { enviarEmailIngressos } from '../email/enviarIngressos';
import { clearFirestoreDrained, withTriggersPaused } from './helpers/stability';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const ADMIN_UID = 'uid-platform-admin';
const EVENTO_ID = 'meia-floripa-2026';
const PEDIDO_ID = 'ped-reenvio-1';

/** Segredo de TESTE (32 bytes) — o mesmo ring que o disparo carrega da env. */
const SEGREDO_B64 = Buffer.alloc(32, 7).toString('base64url');

const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);

/**
 * Porta do Emulator pela ENV (convenção já usada em `webhookAsaas` e
 * `asaasSandbox`): lane em voo na mesma árvore mantém a 8080 ocupada, e teste
 * com porta fixa só roda quando ninguém mais está trabalhando.
 */
const FIRESTORE_PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

const platformAdmin: FinanceCaller = {
  uid: ADMIN_UID,
  claims: { role: 'platform_admin' } as AuthClaims,
};
const owner: FinanceCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
};

/** Espião de envio — zero rede, só acumula o que sairia. */
function providerEspiao(opts: { falhar?: boolean } = {}): {
  provider: EmailProvider;
  enviados: SendTransactionalParams[];
} {
  const enviados: SendTransactionalParams[] = [];
  return {
    enviados,
    provider: {
      name: 'espiao',
      async sendTransactional(params) {
        if (opts.falhar === true) {
          // O formato exato do que a Brevo devolveu em produção.
          throw new Error('Brevo respondeu 401 no envio transacional');
        }
        enviados.push(params);
        return { ok: true, messageId: `msg-${enviados.length}` };
      },
    },
  };
}

/** Porta de Auth falsa — o link de senha é gerado sem Auth Emulator. */
function authEspiao(): { auth: ContaSemFriccaoAuth; links: number } {
  const estado = { links: 0 };
  return {
    get links() {
      return estado.links;
    },
    auth: {
      async getUidPorEmail() {
        return 'uid-conta-comprador';
      },
      async criarConta() {
        return 'uid-conta-comprador';
      },
      async gerarLinkDefinirSenha() {
        estado.links += 1;
        return `https://painel.leela.test/redefinir-senha?oobCode=oob-${estado.links}`;
      },
    },
  };
}

function deps(
  provider: EmailProvider | null,
  auth: ContaSemFriccaoAuth,
  agora?: Date
): ReenvioDeps {
  return { emailProvider: provider, auth, ...(agora !== undefined ? { agora } : {}) };
}

beforeAll(async () => {
  // O caminho de produção lê o ring da ENV — é ele que precisa estar sob teste.
  process.env['QR_TOKEN_KEYS'] = JSON.stringify({ k1: SEGREDO_B64 });
  process.env['QR_TOKEN_KID_ATIVO'] = 'k1';

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
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
  });
});

async function semear(
  inscritos: readonly string[],
  opts: { statusPedido?: string; contaCriada?: boolean } = {}
): Promise<void> {
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
  batch.set(adminDb.collection('eventos').doc(EVENTO_ID), {
    id: EVENTO_ID,
    tenantId: CASTELO_ID,
    nome: 'Meia Maratona Floripa 2026',
    slug: EVENTO_ID,
    status: 'publicado',
    usaChip: false,
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(adminDb.collection('pedidos').doc(PEDIDO_ID), {
    id: PEDIDO_ID,
    tenantId: CASTELO_ID,
    eventoId: EVENTO_ID,
    status: opts.statusPedido ?? 'pago',
    inscritoRefs: [...inscritos],
    responsavel: {
      nome: 'Marina Compradora',
      email: 'marina@exemplo.test',
      atletaId: 'atleta-insc-1',
    },
    // O estado REAL do pedido do dono em 04/08: conta criada, e-mail falhou.
    contaSemFriccao: {
      contaUid: 'uid-conta-comprador',
      contaCriada: opts.contaCriada ?? true,
      emailStatus: (opts.contaCriada ?? true) ? 'falha_envio' : 'nao_aplicavel',
      pessoaVinculada: true,
      processadoEm: now,
    },
    criadoEm: now,
    atualizadoEm: now,
  });
  for (const id of inscritos) {
    batch.set(
      adminDb.collection('eventos').doc(EVENTO_ID).collection('inscritos').doc(id),
      {
        id,
        tenantId: CASTELO_ID,
        atletaId: `atleta-${id}`,
        atletaNome: `Atleta ${id}`,
        kit: 'kit_prata',
        chipNumero: null,
        status: 'confirmado',
        modalidade: '10k',
        tamanhos: {},
        pedidoRef: PEDIDO_ID,
        ehResponsavel: id === 'insc-1',
        criadoEm: now,
        atualizadoEm: now,
      }
    );
  }
  await batch.commit();
}

async function lerInscrito(id: string): Promise<admin.firestore.DocumentData> {
  const snap = await adminDb
    .collection('eventos')
    .doc(EVENTO_ID)
    .collection('inscritos')
    .doc(id)
    .get();
  return snap.data() ?? {};
}

/**
 * Reproduz o estado de 04/08: ingresso emitido e e-mail RECUSADO pelo provedor
 * (o 401 da allowlist). Depois disto a chave da RN-219 está queimada — que é
 * exatamente o motivo de o reenvio precisar existir.
 */
async function emitirComEmailRecusado(): Promise<void> {
  const quebrado = providerEspiao({ falhar: true });
  await dispararEmissaoIngressosPosConfirmacao(adminDb, {
    statusGateway: 'confirmed',
    ignorado: false,
    duplicado: false,
    pedidoId: PEDIDO_ID,
  });
  // O disparo usa `selectEmailProvider` (fail-closed sem chave): a emissão
  // acontece, o e-mail fica `pendente_chave`. Queimar a chave da RN-219 é o
  // passo seguinte, com o provedor que RECUSA — o estado real de produção.
  const r = await enviarEmailIngressos(
    adminDb,
    {
      pedidoId: PEDIDO_ID,
      eventoId: EVENTO_ID,
      ingressos: [
        {
          inscritoId: 'insc-1',
          nome: 'Atleta insc-1',
          modalidade: '10k',
          qrToken: (await lerInscrito('insc-1'))['qrToken'] as string,
          codigo: (await lerInscrito('insc-1'))['codigoIngresso'] as string,
          novo: false,
        },
      ],
    },
    quebrado.provider
  );
  expect(r.status).toBe('falha_envio');
}

async function lerAuditoria(): Promise<admin.firestore.DocumentData[]> {
  const snap = await adminDb
    .collection(AUDITORIA_ACESSOS_COL)
    .where('tipo', '==', 'reenvio_emails_pedido')
    .get();
  return snap.docs.map((d) => d.data());
}

describe.skipIf(!hasEmulator)('reenvio idempotente dos e-mails do pedido (F2)', () => {
  it('reentrega os dois e-mails depois do 401, sem reemitir o ingresso', async () => {
    await semear(['insc-1']);
    await emitirComEmailRecusado();

    const antes = await lerInscrito('insc-1');
    expect(antes['qrToken']).toBeTruthy();
    expect(antes['codigoIngresso']).toBeTruthy();

    // A prova de que o caminho automático NÃO reenvia: a chave já foi queimada.
    const bloqueado = providerEspiao();
    const auto = await enviarEmailIngressos(
      adminDb,
      {
        pedidoId: PEDIDO_ID,
        eventoId: EVENTO_ID,
        ingressos: [
          {
            inscritoId: 'insc-1',
            nome: 'Atleta insc-1',
            modalidade: '10k',
            qrToken: antes['qrToken'] as string,
            codigo: antes['codigoIngresso'] as string,
            novo: false,
          },
        ],
      },
      bloqueado.provider
    );
    expect(auto.status).toBe('ja_enviado');
    expect(bloqueado.enviados).toHaveLength(0);

    // ── O reenvio administrativo ───────────────────────────────────────────
    const espiao = providerEspiao();
    const authFake = authEspiao();
    const r = await reenviarEmailsDoPedidoCore(
      adminDb,
      { pedidoId: PEDIDO_ID, reenvioId: 'reenvio-t93n7f-001' },
      platformAdmin,
      deps(espiao.provider, authFake.auth)
    );

    expect(r.executado).toBe(true);
    expect(r.resultados.ingresso).toBe('enviado');
    expect(r.resultados.conta).toBe('enviado');
    expect(r.ingressos).toBe(1);
    expect(espiao.enviados).toHaveLength(2);

    // O e-mail do ingresso carrega o MESMO código — nada foi reemitido.
    const doIngresso = espiao.enviados.find((e) => e.tag === 'ingressos-compra');
    expect(doIngresso?.texto).toContain(antes['codigoIngresso'] as string);
    const daConta = espiao.enviados.find((e) => e.tag === 'conta-sem-friccao');
    expect(daConta).toBeDefined();

    // O ingresso é o MESMO, byte a byte: token e código intocados.
    const depois = await lerInscrito('insc-1');
    expect(depois['qrToken']).toBe(antes['qrToken']);
    expect(depois['codigoIngresso']).toBe(antes['codigoIngresso']);
    expect(depois['ingressoEmitidoEm']).toEqual(antes['ingressoEmitidoEm']);

    // O carimbo da conta passa a contar a verdade (era `falha_envio`).
    const pedido = (await adminDb.collection('pedidos').doc(PEDIDO_ID).get()).data();
    expect(
      (pedido?.['contaSemFriccao'] as Record<string, unknown>)['emailStatus']
    ).toBe('enviado');
    expect((pedido?.['reenvioEmails'] as Record<string, unknown>)['total']).toBe(1);

    // O extrato guarda quem/quando/o quê — sem PII.
    const extrato = (
      await adminDb
        .collection(REENVIOS_EMAIL_COL)
        .doc(`${PEDIDO_ID}__reenvio-t93n7f-001`)
        .get()
    ).data();
    expect(extrato?.['estado']).toBe('concluido');
    expect(extrato?.['solicitadoPor']).toBe(ADMIN_UID);
    expect(extrato?.['papel']).toBe('platform_admin');
    expect(JSON.stringify(extrato)).not.toContain('marina@exemplo.test');
    expect(JSON.stringify(extrato)).not.toContain(antes['qrToken'] as string);
  });

  it('rodar 2× não duplica: mesma chave é replay; chave nova na janela é recusada; forcar atravessa', async () => {
    await semear(['insc-1']);
    await emitirComEmailRecusado();

    const espiao = providerEspiao();
    const authFake = authEspiao();
    const entrada = { pedidoId: PEDIDO_ID, reenvioId: 'reenvio-dedo-nervoso' };

    const primeiro = await reenviarEmailsDoPedidoCore(
      adminDb,
      entrada,
      platformAdmin,
      deps(espiao.provider, authFake.auth)
    );
    expect(primeiro.executado).toBe(true);
    expect(espiao.enviados).toHaveLength(2);

    // Tranca 1 — MESMA chave (retry de timeout, duplo clique): nada sai.
    const replay = await reenviarEmailsDoPedidoCore(
      adminDb,
      entrada,
      platformAdmin,
      deps(espiao.provider, authFake.auth)
    );
    expect(replay.executado).toBe(false);
    expect(replay.motivo).toBe('ja_processado');
    expect(replay.resultados.ingresso).toBe('enviado');
    expect(espiao.enviados).toHaveLength(2);

    // Tranca 2 — chave NOVA dentro da janela: recusado com instrução.
    await expect(
      reenviarEmailsDoPedidoCore(
        adminDb,
        { pedidoId: PEDIDO_ID, reenvioId: 'reenvio-chave-nova' },
        platformAdmin,
        deps(espiao.provider, authFake.auth)
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(espiao.enviados).toHaveLength(2);

    // `forcar` atravessa a janela de propósito, e fica registrado como tal.
    const forcado = await reenviarEmailsDoPedidoCore(
      adminDb,
      { pedidoId: PEDIDO_ID, reenvioId: 'reenvio-chave-nova', forcar: true },
      platformAdmin,
      deps(espiao.provider, authFake.auth)
    );
    expect(forcado.executado).toBe(true);
    expect(forcado.forcado).toBe(true);
    expect(espiao.enviados).toHaveLength(4);

    // Passada a janela, um reenvio novo volta a ser aceito sem `forcar`.
    const depoisDaJanela = new Date(Date.now() + JANELA_REENVIO_MS + 1_000);
    const terceiro = await reenviarEmailsDoPedidoCore(
      adminDb,
      { pedidoId: PEDIDO_ID, reenvioId: 'reenvio-mais-tarde' },
      platformAdmin,
      deps(espiao.provider, authFake.auth, depoisDaJanela)
    );
    expect(terceiro.executado).toBe(true);
    expect(espiao.enviados).toHaveLength(6);
  });

  it('não-admin é negado, a negação é registrada e NADA sai', async () => {
    await semear(['insc-1']);
    await emitirComEmailRecusado();

    const espiao = providerEspiao();
    const authFake = authEspiao();

    await expect(
      reenviarEmailsDoPedidoCore(
        adminDb,
        { pedidoId: PEDIDO_ID, reenvioId: 'reenvio-do-organizador' },
        owner,
        deps(espiao.provider, authFake.auth)
      )
    ).rejects.toMatchObject({ code: 'permission-denied' });

    expect(espiao.enviados).toHaveLength(0);
    expect(authFake.links).toBe(0);
    // Nenhuma reserva nasce de uma chamada negada.
    const extrato = await adminDb
      .collection(REENVIOS_EMAIL_COL)
      .doc(`${PEDIDO_ID}__reenvio-do-organizador`)
      .get();
    expect(extrato.exists).toBe(false);

    const trilha = await lerAuditoria();
    expect(trilha).toHaveLength(1);
    expect(trilha[0]?.['resultado']).toBe('negado_papel');
    expect(trilha[0]?.['uid']).toBe(MARINA_UID);
    expect(trilha[0]?.['papel']).toBe('tenant_owner');
  });

  it('pedido não pago não reenvia credencial', async () => {
    await semear(['insc-1'], { statusPedido: 'pendente' });

    const espiao = providerEspiao();
    const authFake = authEspiao();
    await expect(
      reenviarEmailsDoPedidoCore(
        adminDb,
        { pedidoId: PEDIDO_ID, reenvioId: 'reenvio-pedido-pendente' },
        platformAdmin,
        deps(espiao.provider, authFake.auth)
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(espiao.enviados).toHaveLength(0);

    const trilha = await lerAuditoria();
    expect(trilha[0]?.['resultado']).toBe('negado_pedido_nao_pago');
  });

  it('emissão incompleta não vira e-mail pela metade (é caso da varredura)', async () => {
    await semear(['insc-1', 'insc-2']);
    await emitirComEmailRecusado();
    // O segundo inscrito nunca ganhou ingresso (o `sem_codigo_livre` do vetor 3).
    await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('inscritos')
      .doc('insc-2')
      .update({
        qrToken: FieldValue.delete(),
        codigoIngresso: FieldValue.delete(),
      });

    const espiao = providerEspiao();
    const authFake = authEspiao();
    const r = await reenviarEmailsDoPedidoCore(
      adminDb,
      { pedidoId: PEDIDO_ID, reenvioId: 'reenvio-incompleto' },
      platformAdmin,
      deps(espiao.provider, authFake.auth)
    );

    expect(r.resultados.ingresso).toBe('ingresso_incompleto');
    expect(r.ingressos).toBe(0);
    // O e-mail da conta continua saindo — ele não depende da emissão.
    expect(espiao.enviados).toHaveLength(1);
    expect(espiao.enviados[0]?.tag).toBe('conta-sem-friccao');
  });

  it('conta que já existia antes da compra nunca recebe "sua conta foi criada"', async () => {
    await semear(['insc-1'], { contaCriada: false });
    await emitirComEmailRecusado();

    const espiao = providerEspiao();
    const authFake = authEspiao();
    const r = await reenviarEmailsDoPedidoCore(
      adminDb,
      { pedidoId: PEDIDO_ID, reenvioId: 'reenvio-conta-antiga' },
      platformAdmin,
      deps(espiao.provider, authFake.auth)
    );

    expect(r.resultados.conta).toBe('nao_aplicavel');
    expect(authFake.links).toBe(0);
    expect(espiao.enviados.every((e) => e.tag !== 'conta-sem-friccao')).toBe(true);
  });

  it('falha do provedor no reenvio fica no extrato, sem tocar o ingresso', async () => {
    await semear(['insc-1']);
    await emitirComEmailRecusado();
    const antes = await lerInscrito('insc-1');

    const quebrado = providerEspiao({ falhar: true });
    const authFake = authEspiao();
    const r = await reenviarEmailsDoPedidoCore(
      adminDb,
      { pedidoId: PEDIDO_ID, reenvioId: 'reenvio-que-falha', alvos: ['ingresso'] },
      platformAdmin,
      deps(quebrado.provider, authFake.auth)
    );

    expect(r.resultados.ingresso).toBe('falha_envio');
    expect(r.resultados.conta).toBeUndefined();
    expect((await lerInscrito('insc-1'))['qrToken']).toBe(antes['qrToken']);

    const extrato = (
      await adminDb
        .collection(REENVIOS_EMAIL_COL)
        .doc(`${PEDIDO_ID}__reenvio-que-falha`)
        .get()
    ).data();
    expect(
      (extrato?.['resultados'] as Record<string, unknown>)['ingresso']
    ).toBe('falha_envio');
  });

  it('chave de operação malformada é recusada antes de qualquer efeito', async () => {
    await semear(['insc-1']);
    const espiao = providerEspiao();
    const authFake = authEspiao();

    for (const reenvioId of ['', 'curta', 'com espaço aqui', 'barra/no/meio']) {
      await expect(
        reenviarEmailsDoPedidoCore(
          adminDb,
          { pedidoId: PEDIDO_ID, reenvioId },
          platformAdmin,
          deps(espiao.provider, authFake.auth)
        )
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    }
    expect(espiao.enviados).toHaveLength(0);
    expect(await lerAuditoria()).toHaveLength(0);
  });

  it('o extrato de reenvio é server-only: nem admin de tenant lê ou escreve', async () => {
    // A coleção não tem `match` (deny-by-default), e "não escrevi regra" não é
    // prova: escrever aqui deixaria um cliente inventar um reenvio "já
    // processado" e bloquear o reenvio de verdade.
    await semear(['insc-1']);
    await emitirComEmailRecusado();
    const espiao = providerEspiao();
    const authFake = authEspiao();
    await reenviarEmailsDoPedidoCore(
      adminDb,
      { pedidoId: PEDIDO_ID, reenvioId: 'reenvio-server-only' },
      platformAdmin,
      deps(espiao.provider, authFake.auth)
    );

    const db = testEnv
      .authenticatedContext(MARINA_UID, {
        role: 'tenant_owner',
        tenantId: CASTELO_ID,
      })
      .firestore() as unknown as Firestore;
    const id = `${PEDIDO_ID}__reenvio-server-only`;

    await assertFails(getDoc(doc(db, REENVIOS_EMAIL_COL, id)));
    await assertFails(setDoc(doc(db, REENVIOS_EMAIL_COL, id), { estado: 'concluido' }));
  });
});
