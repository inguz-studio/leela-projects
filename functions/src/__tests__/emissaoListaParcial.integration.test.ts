/**
 * emissaoListaParcial.integration.test.ts — RF2-1 (lane BUILD-RF2-1).
 *
 * O defeito que este arquivo trava: o caminho AUTOMÁTICO (o do webhook)
 * queimava a chave at-most-once da RN-219 com uma lista PARCIAL de ingressos.
 * `emitirIngressosDoPedido` não contava o inscrito não-confirmado nem como
 * falha nem como recusa, então `dispararEmissaoIngressosPosConfirmacao` fechava
 * com `falhas: 0`, mandava o e-mail da compra sem quem faltava e NÃO abria
 * pendência — e, sendo a chave de uso único, o comprador nunca receberia os que
 * ficaram de fora. Reprodução original: vetor 6 da REV-F2F5.
 *
 * A regra que os testes abaixo desenham, e que separa este arquivo de um
 * "sempre segura o e-mail" burro:
 *   - inscrito que ainda PODE confirmar (`pendente`, ou status que o enum do
 *     core não conhece) ⇒ lista PARCIAL: e-mail segurado, pendência aberta na
 *     própria janela da confirmação, varredura fecha depois com a lista
 *     inteira;
 *   - inscrito TERMINAL (`cancelado`/`estornado`) ⇒ lista COMPLETA: ele nunca
 *     terá ingresso, e segurar o e-mail do comprador por causa dele seria um
 *     defeito novo no lugar do antigo;
 *   - inscrito APAGADO ou de OUTRO pedido ⇒ recusa: não há cura nem
 *     destinatário, e o comprador não fica refém de anomalia de dado.
 *
 * A prova de "a chave NÃO foi queimada" é indireta de propósito e por isso mais
 * forte: com `BREVO_API_KEY` ausente (fail-closed RN-137), toda TENTATIVA de
 * envio automático carimba `pedidos/{id}.emailIngressos.status =
 * 'pendente_chave'`. Campo ausente ⇒ o envio não foi nem tentado. O log de
 * comunicação (a chave da RN-219 em si) é conferido do lado da varredura, onde
 * o provider injetado deixa o envio acontecer de verdade.
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
  type EmailProvider,
  type SendTransactionalParams,
} from '@leela/core';
import {
  dispararEmissaoIngressosPosConfirmacao,
  emitirIngressosDoPedido,
  inscritoAindaPodeConfirmar,
} from '../eventos/emitirIngressos';
import { varrerIngressosOrfaosCore } from '../eventos/varrerIngressosOrfaos';
import {
  INGRESSOS_PENDENTES_COL,
  TENTATIVAS_VARREDURA_INGRESSO,
} from '../eventos/ingressosPendentes';
import { obterQrKeyring } from '../eventos/qrToken';
import { clearFirestoreDrained, withTriggersPaused } from './helpers/stability';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'meia-floripa-2026';
const PEDIDO_ID = 'ped-lista-parcial';

const SEGREDO_B64 = Buffer.alloc(32, 7).toString('base64url');
const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);
const FIRESTORE_PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

/** Provider INJETADO — zero rede real. */
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

/** Chave de e-mail do ambiente, guardada para devolver no fim do arquivo. */
let brevoOriginal: string | undefined;

beforeAll(async () => {
  process.env['QR_TOKEN_KEYS'] = JSON.stringify({ k1: SEGREDO_B64 });
  process.env['QR_TOKEN_KID_ATIVO'] = 'k1';
  // A ausência da chave de e-mail é PARTE do experimento (ver cabeçalho): é ela
  // que transforma "tentou enviar" num campo observável no doc do pedido. E é
  // também a garantia de que nenhuma execução deste arquivo manda e-mail real
  // por acidente, num shell que tenha a chave exportada.
  brevoOriginal = process.env['BREVO_API_KEY'];
  delete process.env['BREVO_API_KEY'];
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
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
  });
});

/**
 * Semeia o pedido PAGO com os inscritos pedidos. `statusInscritos` planta o
 * estado que o caminho automático encontra; `naoCriar` deixa o id em
 * `inscritoRefs` sem doc por trás (o organizador apagou o inscrito).
 */
async function semear(
  inscritos: readonly string[],
  opts: {
    statusInscritos?: Record<string, string>;
    naoCriar?: readonly string[];
  } = {}
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
    status: 'pago',
    inscritoRefs: [...inscritos],
    responsavel: {
      nome: 'Marina Compradora',
      email: 'marina@exemplo.test',
      atletaId: 'atleta-insc-1',
    },
    criadoEm: now,
    atualizadoEm: now,
  });
  for (const id of inscritos) {
    if (opts.naoCriar?.includes(id) === true) continue;
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
        pedidoRef: PEDIDO_ID,
        ehResponsavel: id === 'insc-1',
        criadoEm: now,
        atualizadoEm: now,
      }
    );
  }
  await batch.commit();
}

const confirmarWebhook = () =>
  dispararEmissaoIngressosPosConfirmacao(adminDb, {
    statusGateway: 'confirmed',
    ignorado: false,
    duplicado: false,
    pedidoId: PEDIDO_ID,
  });

async function lerPedido(): Promise<admin.firestore.DocumentData> {
  const snap = await adminDb.collection('pedidos').doc(PEDIDO_ID).get();
  return snap.data() ?? {};
}

async function lerPendencia(): Promise<admin.firestore.DocumentData | undefined> {
  const snap = await adminDb
    .collection(INGRESSOS_PENDENTES_COL)
    .doc(PEDIDO_ID)
    .get();
  return snap.exists ? snap.data() : undefined;
}

async function logsDoEvento(): Promise<admin.firestore.QuerySnapshot> {
  return adminDb
    .collection('eventos')
    .doc(EVENTO_ID)
    .collection(COLECAO_LOG_COMUNICACAO)
    .get();
}

describe('inscritoAindaPodeConfirmar — a fronteira que decide o e-mail', () => {
  it('reversível: `pendente` e status DESCONHECIDO (fail-closed)', () => {
    expect(inscritoAindaPodeConfirmar('pendente')).toBe(true);
    expect(inscritoAindaPodeConfirmar('zumbi')).toBe(true);
    expect(inscritoAindaPodeConfirmar(undefined)).toBe(true);
    expect(inscritoAindaPodeConfirmar(null)).toBe(true);
    expect(inscritoAindaPodeConfirmar(42)).toBe(true);
  });

  it('terminal: `cancelado` e `estornado` nunca voltam (RN-204/RN-341)', () => {
    expect(inscritoAindaPodeConfirmar('cancelado')).toBe(false);
    expect(inscritoAindaPodeConfirmar('estornado')).toBe(false);
  });
});

describe.skipIf(!hasEmulator)('RF2-1 · lista parcial no caminho automático', () => {
  it('inscrito que ainda pode confirmar SEGURA o e-mail, abre pendência, e a varredura fecha com a lista INTEIRA', async () => {
    await semear(['insc-1', 'insc-2'], { statusInscritos: { 'insc-2': 'pendente' } });

    const r = await confirmarWebhook();

    // A emissão faz o que sempre fez com quem não está confirmado — não emite.
    expect(r?.emitidos).toBe(1);
    expect(r?.ingressos.map((i) => i.inscritoId)).toEqual(['insc-1']);
    // O QUE MUDA: o buraco deixa de ser invisível. Não é falha de emissão
    // (não há o que re-tentar) nem recusa (ele ainda pode receber).
    expect(r?.falhas).toBe(0);
    expect(r?.rejeitados).toBe(0);
    expect(r?.aguardando).toBe(1);
    expect(r?.listaCompleta).toBe(false);

    // O e-mail NÃO foi nem tentado: sem carimbo `pendente_chave` no pedido, o
    // caminho automático não chegou a `enviarEmailIngressos` — a chave
    // at-most-once da RN-219 continua inteira.
    expect((await lerPedido())['emailIngressos']).toBeUndefined();
    expect((await logsDoEvento()).size).toBe(0);

    // E a varredura passa a ter por onde pegar o pedido (era 0 antes do fix).
    const pendencia = await lerPendencia();
    expect(pendencia?.['motivo']).toBe('emissao_incompleta');
    expect(pendencia?.['aguardando']).toBe(1);
    expect(pendencia?.['falhas']).toBe(0);
    expect(pendencia?.['detalhe']).toBe('aguardando_confirmacao');
    expect(pendencia?.['resolvido']).toBe(false);

    // O inscrito confirma DEPOIS (transferência, acerto manual, reprocesso).
    await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('inscritos')
      .doc('insc-2')
      .update({ status: 'confirmado' });

    const espiao = providerEspiao();
    const varredura = await varrerIngressosOrfaosCore(
      adminDb,
      obterQrKeyring(),
      espiao.provider
    );

    expect(varredura.emitidos).toBe(1);
    expect(varredura.emailsEnviados).toBe(1);
    expect(varredura.resolvidos).toBe(1);
    expect(varredura.pendentes).toBe(0);

    // UM e-mail, com os DOIS ingressos — a chave foi gasta na lista completa.
    expect(espiao.enviados).toHaveLength(1);
    const enviado = espiao.enviados[0] as SendTransactionalParams;
    const vivos = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, obterQrKeyring());
    expect(vivos.ingressos).toHaveLength(2);
    for (const ingresso of vivos.ingressos) {
      expect(enviado.texto).toContain(ingresso.codigo);
    }
    expect((await logsDoEvento()).size).toBe(1);
    expect((await lerPedido())['emailIngressos']['status']).toBe('enviado');
  });

  it('a segunda varredura não manda um segundo e-mail (a pendência já fechou)', async () => {
    await semear(['insc-1', 'insc-2'], { statusInscritos: { 'insc-2': 'pendente' } });
    await confirmarWebhook();
    await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('inscritos')
      .doc('insc-2')
      .update({ status: 'confirmado' });

    const espiao = providerEspiao();
    await varrerIngressosOrfaosCore(adminDb, obterQrKeyring(), espiao.provider);
    const segunda = await varrerIngressosOrfaosCore(
      adminDb,
      obterQrKeyring(),
      espiao.provider
    );

    expect(segunda.pendentes).toBe(0);
    expect(segunda.emailsEnviados).toBe(0);
    expect(espiao.enviados).toHaveLength(1);
    expect((await logsDoEvento()).size).toBe(1);
  });

  it('status DESCONHECIDO é tratado como buraco (fail-closed), não como terminal', async () => {
    await semear(['insc-1', 'insc-2'], { statusInscritos: { 'insc-2': 'zumbi' } });

    const r = await confirmarWebhook();

    expect(r?.aguardando).toBe(1);
    expect(r?.naoElegiveis).toBe(0);
    expect(r?.listaCompleta).toBe(false);
    expect((await lerPedido())['emailIngressos']).toBeUndefined();
    expect((await lerPendencia())?.['resolvido']).toBe(false);
  });

  it('inscrito CANCELADO não segura nada: a lista sem ele está COMPLETA', async () => {
    // O outro lado do defeito, e o que impede que o fix vire uma trava nova: um
    // inscrito terminal não volta a ser confirmado (a matriz da RN-204/RN-341
    // não tem a aresta), então esperar por ele seria esperar para sempre.
    await semear(['insc-1', 'insc-2'], { statusInscritos: { 'insc-2': 'cancelado' } });

    const r = await confirmarWebhook();

    expect(r?.emitidos).toBe(1);
    expect(r?.aguardando).toBe(0);
    expect(r?.naoElegiveis).toBe(1);
    expect(r?.listaCompleta).toBe(true);
    // O envio FOI tentado (e parou no fail-closed da chave ausente, RN-137) —
    // é o carimbo que prova que o caminho automático não foi barrado.
    expect((await lerPedido())['emailIngressos']['status']).toBe('pendente_chave');
    // E nenhuma pendência nasceu para um caso que não tem cura nem precisa.
    expect(await lerPendencia()).toBeUndefined();
  });

  it('inscrito APAGADO é recusa, não espera: o comprador não fica refém', async () => {
    // `allow delete` de inscrito existe nas Rules para o organizador; re-tentar
    // não faz o doc renascer e não há a quem entregar. Mesmo juízo do inscrito
    // de outro pedido: recusa contada e gritada, e-mail do comprador segue.
    await semear(['insc-1', 'insc-2'], { naoCriar: ['insc-2'] });

    const r = await confirmarWebhook();

    expect(r?.emitidos).toBe(1);
    expect(r?.rejeitados).toBe(1);
    expect(r?.aguardando).toBe(0);
    expect(r?.listaCompleta).toBe(true);
    expect((await lerPedido())['emailIngressos']['status']).toBe('pendente_chave');
    expect(await lerPendencia()).toBeUndefined();
  });

  it('a espera é LIMITADA: esgotadas as tentativas, sai o que existe — com a pendência aberta e o alerta', async () => {
    await semear(['insc-1', 'insc-2'], { statusInscritos: { 'insc-2': 'pendente' } });
    await confirmarWebhook();

    const espiao = providerEspiao();
    let ultima = await varrerIngressosOrfaosCore(
      adminDb,
      obterQrKeyring(),
      espiao.provider
    );
    for (let i = 1; i < TENTATIVAS_VARREDURA_INGRESSO; i++) {
      // Nenhuma passagem antes do esgotamento manda e-mail nenhum.
      expect(espiao.enviados).toHaveLength(0);
      ultima = await varrerIngressosOrfaosCore(
        adminDb,
        obterQrKeyring(),
        espiao.provider
      );
    }

    expect(ultima.esgotados).toBe(1);
    expect(ultima.emailsEnviados).toBe(1);
    expect(espiao.enviados).toHaveLength(1);
    // Um ingresso só — e o caso NÃO é dado por resolvido: fica para o humano.
    const enviado = espiao.enviados[0] as SendTransactionalParams;
    expect(enviado.texto).toContain(
      (await emitirIngressosDoPedido(adminDb, PEDIDO_ID, obterQrKeyring()))
        .ingressos[0]?.codigo as string
    );
    const pendencia = await lerPendencia();
    expect(pendencia?.['esgotado']).toBe(true);
    expect(pendencia?.['resolvido']).toBe(false);
    expect(pendencia?.['aguardando']).toBe(1);

    // E a passagem seguinte NÃO re-tenta: conta como conferência manual.
    const depois = await varrerIngressosOrfaosCore(
      adminDb,
      obterQrKeyring(),
      espiao.provider
    );
    expect(depois.conferenciaManual).toBe(1);
    expect(espiao.enviados).toHaveLength(1);
  });

  it('duas detecções do mesmo pedido acumulam, nunca duplicam a pendência', async () => {
    await semear(['insc-1', 'insc-2'], { statusInscritos: { 'insc-2': 'pendente' } });
    await confirmarWebhook();
    // Re-entrega do gateway com outro eventId cairia aqui de novo.
    await confirmarWebhook();

    const todas = await adminDb.collection(INGRESSOS_PENDENTES_COL).get();
    expect(todas.size).toBe(1);
    expect((await lerPendencia())?.['deteccoes']).toBe(2);
    expect((await lerPendencia())?.['aguardando']).toBe(1);
  });
});
