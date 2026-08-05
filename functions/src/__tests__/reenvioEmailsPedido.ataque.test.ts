/**
 * reenvioEmailsPedido.ataque.test.ts — REVIEW ANTAGONISTA da lane REV-F2F5.
 *
 * Contexto fresco: nada do que o construtor afirmou no commit `9abe8396` /
 * `9d980bae` é premissa aqui. Cada `it` abaixo é uma TENTATIVA DE QUEBRAR uma
 * promessa declarada — e os que ficam verdes valem como prova de sobrevivência,
 * não como decoração.
 *
 * Vetores exercitados (numeração da lane):
 *   1. papel forjado pelo `data` do request, `tenant_staff`, equipe de evento
 *      e caller sem `role`;
 *   4. crash entre o commit da reserva e a entrega — o extrato fica
 *      `reservado` para sempre e a janela de 10 min já foi queimada;
 *   5. concorrência REAL de dois admins (o caminho que o commit declara
 *      `Not-tested`);
 *   6. `ingresso_incompleto` como beco: a mensagem manda o operador para a
 *      varredura, e a varredura não tem por onde pegar o pedido;
 *   7. `inscritoRefs` adulterado com inscrito de OUTRO pedido;
 *   9. carimbo acessório (`registrarStatusEmailIngressos`) sobre pedido
 *      inexistente — engole mesmo? ressuscita o doc?
 *   + o que NÃO foi declarado: a falha do carimbo da CONTA inverte o veredito
 *      de um e-mail que JÁ SAIU (`enviado` vira `falha_envio`, que é o gatilho
 *      do incidente crítico da F5 e do reenvio duplicado no runbook).
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
import type {
  AuthClaims,
  EmailProvider,
  SendTransactionalParams,
} from '@leela/core';
import { dispararEmissaoIngressosPosConfirmacao } from '../eventos/emitirIngressos';
import {
  REENVIOS_EMAIL_COL,
  reenviarEmailsDoPedidoCore,
  type ReenvioDeps,
} from '../checkout/reenviarEmailsPedido';
import { registrarStatusEmailIngressos } from '../email/enviarIngressos';
import { varrerIngressosOrfaosCore } from '../eventos/varrerIngressosOrfaos';
import { INGRESSOS_PENDENTES_COL } from '../eventos/ingressosPendentes';
import { obterQrKeyring } from '../eventos/qrToken';
import type { ContaSemFriccaoAuth } from '../checkout/contaSemFriccao';
import { AUDITORIA_ACESSOS_COL } from '../shared/auditoriaAcessos';
import type { FinanceCaller } from '../finance/atores';
import { clearFirestoreDrained, withTriggersPaused } from './helpers/stability';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const ADMIN_UID = 'uid-platform-admin';
const EVENTO_ID = 'meia-floripa-2026';
const PEDIDO_ID = 'ped-reenvio-1';

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

/** Provider que executa um efeito colateral ANTES de confirmar a entrega. */
function providerComEfeito(efeito: () => Promise<void>): {
  provider: EmailProvider;
  enviados: SendTransactionalParams[];
} {
  const enviados: SendTransactionalParams[] = [];
  return {
    enviados,
    provider: {
      name: 'espiao-efeito',
      async sendTransactional(params) {
        enviados.push(params);
        await efeito();
        return { ok: true, messageId: `msg-${enviados.length}` };
      },
    },
  };
}

function authEspiao(): ContaSemFriccaoAuth {
  let n = 0;
  return {
    async getUidPorEmail() {
      return 'uid-conta-comprador';
    },
    async criarConta() {
      return 'uid-conta-comprador';
    },
    async gerarLinkDefinirSenha() {
      n += 1;
      return `https://painel.leela.test/redefinir-senha?oobCode=oob-${n}`;
    },
  };
}

function deps(provider: EmailProvider | null): ReenvioDeps {
  return { emailProvider: provider, auth: authEspiao() };
}

beforeAll(async () => {
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

/**
 * Semeia o pedido pago. `statusInscritos` permite plantar o estado que o
 * caminho automático produz sem registrar pendência nenhuma.
 */
async function semear(
  inscritos: readonly string[],
  opts: { statusInscritos?: Record<string, string>; pedidoIdDeCada?: Record<string, string> } = {}
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
    contaSemFriccao: {
      contaUid: 'uid-conta-comprador',
      contaCriada: true,
      emailStatus: 'falha_envio',
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
        status: opts.statusInscritos?.[id] ?? 'confirmado',
        modalidade: '10k',
        tamanhos: {},
        pedidoRef: opts.pedidoIdDeCada?.[id] ?? PEDIDO_ID,
        ehResponsavel: id === 'insc-1',
        criadoEm: now,
        atualizadoEm: now,
      }
    );
  }
  await batch.commit();
}

async function lerReserva(reenvioId: string): Promise<admin.firestore.DocumentData> {
  const snap = await adminDb
    .collection(REENVIOS_EMAIL_COL)
    .doc(`${PEDIDO_ID}__${reenvioId}`)
    .get();
  return snap.data() ?? {};
}

async function lerAuditoria(): Promise<admin.firestore.DocumentData[]> {
  const snap = await adminDb
    .collection(AUDITORIA_ACESSOS_COL)
    .where('tipo', '==', 'reenvio_emails_pedido')
    .get();
  return snap.docs.map((d) => d.data());
}

describe.skipIf(!hasEmulator)('REV-F2F5 · ataque ao reenvio de e-mails', () => {
  // ── VETOR 1 ────────────────────────────────────────────────────────────
  it('vetor 1: papel só vale do token — `role` no payload, staff, equipe e sem-papel são negados', async () => {
    await semear(['insc-1']);
    const espiao = providerEspiao();

    const forjados: { nome: string; caller: FinanceCaller; data: unknown }[] = [
      {
        nome: 'role dentro do data do request',
        caller: { uid: 'uid-atacante', claims: {} as AuthClaims },
        data: {
          pedidoId: PEDIDO_ID,
          reenvioId: 'ataque-payload-1',
          role: 'platform_admin',
          claims: { role: 'platform_admin' },
          auth: { token: { role: 'platform_admin' } },
        },
      },
      {
        nome: 'tenant_staff do tenant dono',
        caller: {
          uid: 'uid-staff',
          claims: { role: 'tenant_staff', tenantId: CASTELO_ID } as AuthClaims,
        },
        data: { pedidoId: PEDIDO_ID, reenvioId: 'ataque-staff-1' },
      },
      {
        nome: 'equipe do evento (papel organizador)',
        caller: {
          uid: 'uid-equipe',
          claims: {
            role: 'organizador',
            tenantId: CASTELO_ID,
            eventos: { [EVENTO_ID]: 'organizador' },
          } as unknown as AuthClaims,
        },
        data: { pedidoId: PEDIDO_ID, reenvioId: 'ataque-equipe-1' },
      },
      {
        nome: 'token sem role nenhum',
        caller: { uid: 'uid-sem-papel', claims: {} as AuthClaims },
        data: { pedidoId: PEDIDO_ID, reenvioId: 'ataque-sempapel-1' },
      },
      {
        nome: 'role parecido (prefixo)',
        caller: {
          uid: 'uid-quase',
          claims: { role: 'platform_admin_readonly' } as unknown as AuthClaims,
        },
        data: { pedidoId: PEDIDO_ID, reenvioId: 'ataque-quase-1' },
      },
    ];

    for (const f of forjados) {
      await expect(
        reenviarEmailsDoPedidoCore(adminDb, f.data, f.caller, deps(espiao.provider))
      ).rejects.toMatchObject({ code: 'permission-denied' });
    }

    // NADA saiu, e NENHUMA reserva foi criada por um caller negado.
    expect(espiao.enviados).toHaveLength(0);
    const reservas = await adminDb.collection(REENVIOS_EMAIL_COL).get();
    expect(reservas.size).toBe(0);

    // Toda negação está na trilha, com o papel REAL do token (não o forjado).
    const trilha = await lerAuditoria();
    expect(trilha).toHaveLength(forjados.length);
    expect(trilha.every((t) => t['resultado'] === 'negado_papel')).toBe(true);
    expect(trilha.some((t) => t['papel'] === 'desconhecido')).toBe(true);
    expect(trilha.every((t) => t['papel'] !== 'platform_admin')).toBe(true);
  });

  // ── VETOR 5 ────────────────────────────────────────────────────────────
  it('vetor 5: dois admins em paralelo com chaves diferentes — no máximo um envio', async () => {
    await semear(['insc-1']);
    await dispararEmissaoIngressosPosConfirmacao(adminDb, {
      statusGateway: 'confirmed',
      ignorado: false,
      duplicado: false,
      pedidoId: PEDIDO_ID,
    });
    const espiao = providerEspiao();

    const chamada = (reenvioId: string) =>
      reenviarEmailsDoPedidoCore(
        adminDb,
        { pedidoId: PEDIDO_ID, reenvioId, alvos: ['ingresso'] },
        platformAdmin,
        deps(espiao.provider)
      );

    const desfechos = await Promise.allSettled([
      chamada('concorrente-aaaa'),
      chamada('concorrente-bbbb'),
    ]);
    const executados = desfechos.filter(
      (d) => d.status === 'fulfilled' && d.value.executado
    );

    // A promessa: a janela lida DENTRO da transação impede as duas.
    expect(executados).toHaveLength(1);
    const ingressos = espiao.enviados.filter((e) => e.tag === 'ingressos-compra');
    expect(ingressos).toHaveLength(1);
  });

  // ── VETOR 4 ────────────────────────────────────────────────────────────
  it('vetor 4: crash entre o commit da reserva e a entrega deixa `reservado` para sempre', async () => {
    await semear(['insc-1']);
    await dispararEmissaoIngressosPosConfirmacao(adminDb, {
      statusGateway: 'confirmed',
      ignorado: false,
      duplicado: false,
      pedidoId: PEDIDO_ID,
    });
    const espiao = providerEspiao();

    // A falha REAL que este teste simula: um `get()` transitório do Firestore
    // (UNAVAILABLE/DEADLINE_EXCEEDED — rotina em Cloud Functions) DEPOIS da
    // reserva commitada. Os quatro reads da etapa de entrega estão fora de
    // qualquer try/catch.
    const dbQuebrado = new Proxy(adminDb, {
      get(alvo, prop, receiver) {
        if (prop === 'collection') {
          return (nome: string) => {
            if (nome === 'eventos') {
              throw new Error('14 UNAVAILABLE: transient failure');
            }
            return (alvo.collection as (n: string) => unknown)(nome);
          };
        }
        const v = Reflect.get(alvo, prop, receiver) as unknown;
        return typeof v === 'function' ? (v as Function).bind(alvo) : v;
      },
    }) as admin.firestore.Firestore;

    await expect(
      reenviarEmailsDoPedidoCore(
        dbQuebrado,
        { pedidoId: PEDIDO_ID, reenvioId: 'crash-no-meio-1' },
        platformAdmin,
        deps(espiao.provider)
      )
    ).rejects.toThrow();

    // ANTES DO FIX: o extrato ficava preso em `reservado`, sem desfecho e sem
    // `concluidoEm` — indistinguível de uma operação em voo. Agora ele fecha
    // como `falhou`, com a causa.
    const reserva = await lerReserva('crash-no-meio-1');
    expect(reserva['estado']).toBe('falhou');
    expect(reserva['concluidoEm']).toBeDefined();
    expect(String(reserva['erro'])).toContain('UNAVAILABLE');
    // Nada foi entregue nesta passagem — o escape aconteceu antes do envio.
    expect(espiao.enviados).toHaveLength(0);

    // E a janela de 10 min JÁ foi queimada: a segunda tentativa honesta é
    // recusada, então o operador é empurrado para `forcar` — que é justamente
    // o caminho que duplica se a entrega tinha acontecido.
    await expect(
      reenviarEmailsDoPedidoCore(
        adminDb,
        { pedidoId: PEDIDO_ID, reenvioId: 'depois-do-crash-1' },
        platformAdmin,
        deps(espiao.provider)
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    // Repetir a MESMA chave continua sendo replay (a chave é at-most-once por
    // construção), mas agora o desfecho é LEGÍVEL: `falhou` diz ao operador que
    // a operação morreu antes de entregar, e não que ela terminou sem nada a
    // enviar. Sem este campo, `resultados: {}` é ambíguo nos dois sentidos.
    const replay = await reenviarEmailsDoPedidoCore(
      adminDb,
      { pedidoId: PEDIDO_ID, reenvioId: 'crash-no-meio-1' },
      platformAdmin,
      deps(espiao.provider)
    );
    expect(replay.executado).toBe(false);
    expect(replay.motivo).toBe('ja_processado');
    expect(replay.resultados).toEqual({});
    expect(replay.estado).toBe('falhou');
  });

  // ── VETOR 6 ────────────────────────────────────────────────────────────
  it('vetor 6: `ingresso_incompleto` manda o operador para uma varredura que não tem o pedido', async () => {
    // O gerador REAL: um inscrito que não estava `confirmado` na janela da
    // emissão. Quando esta review rodou, `emitirIngressosDoPedido` não contava
    // isso como falha nem como recusa: o disparo pós-confirmação fechava com
    // `falhas: 0`, NÃO registrava pendência, e o e-mail saía com a lista pela
    // metade queimando a RN-219.
    //
    // ⚠ A outra ponta foi fechada pela lane BUILD-RF2-1 (item RF2-1 da fila):
    // o inscrito que ainda pode confirmar passou a contar em `aguardando`, a
    // segurar o e-mail e a abrir a pendência na PRÓPRIA janela da confirmação.
    // O vetor continua valendo como vetor — o que ele mede agora é que o beco
    // não volta por nenhuma das duas portas.
    await semear(['insc-1', 'insc-2'], {
      statusInscritos: { 'insc-2': 'pendente' },
    });
    const r = await dispararEmissaoIngressosPosConfirmacao(adminDb, {
      statusGateway: 'confirmed',
      ignorado: false,
      duplicado: false,
      pedidoId: PEDIDO_ID,
    });
    expect(r?.falhas).toBe(0);
    expect(r?.aguardando).toBe(1);
    expect(r?.listaCompleta).toBe(false);
    // A pendência agora nasce AQUI (era 0 — o buraco desta review).
    expect((await adminDb.collection(INGRESSOS_PENDENTES_COL).get()).size).toBe(1);

    // O inscrito confirma DEPOIS (transferência, acerto manual, reprocesso).
    await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('inscritos')
      .doc('insc-2')
      .update({ status: 'confirmado' });

    const espiao = providerEspiao();
    const res = await reenviarEmailsDoPedidoCore(
      adminDb,
      { pedidoId: PEDIDO_ID, reenvioId: 'beco-permanente-1', alvos: ['ingresso'] },
      platformAdmin,
      deps(espiao.provider)
    );
    expect(res.resultados.ingresso).toBe('ingresso_incompleto');
    expect(espiao.enviados).toHaveLength(0);

    // A mensagem do código diz "é caso da varredura". Depois do FIX a varredura
    // TEM o pedido — antes dele, este número era 0 e o inscrito ficava sem
    // ingresso para sempre.
    const pendentes = await adminDb.collection(INGRESSOS_PENDENTES_COL).get();
    expect(pendentes.size).toBe(1);
    expect(pendentes.docs[0]?.id).toBe(PEDIDO_ID);

    const varredura = await varrerIngressosOrfaosCore(
      adminDb,
      obterQrKeyring(),
      espiao.provider
    );
    expect(varredura.emitidos).toBe(1);

    // E agora o reenvio entrega os DOIS ingressos.
    const espiao2 = providerEspiao();
    const res2 = await reenviarEmailsDoPedidoCore(
      adminDb,
      {
        pedidoId: PEDIDO_ID,
        reenvioId: 'beco-permanente-2',
        alvos: ['ingresso'],
        forcar: true,
      },
      platformAdmin,
      deps(espiao2.provider)
    );
    expect(res2.resultados.ingresso).toBe('enviado');
    expect(res2.ingressos).toBe(2);
  });

  // ── VETOR 7 ────────────────────────────────────────────────────────────
  it('vetor 7: inscrito de OUTRO pedido em `inscritoRefs` não entra no e-mail nem trava o reenvio', async () => {
    await semear(['insc-1', 'insc-intruso'], {
      pedidoIdDeCada: { 'insc-intruso': 'ped-de-outra-pessoa' },
    });
    await dispararEmissaoIngressosPosConfirmacao(adminDb, {
      statusGateway: 'confirmed',
      ignorado: false,
      duplicado: false,
      pedidoId: PEDIDO_ID,
    });
    // O intruso ganha um ingresso por fora (o pedido dele, legítimo).
    await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('inscritos')
      .doc('insc-intruso')
      .update({ qrToken: 'token-de-outra-pessoa', codigoIngresso: 'X9Y8Z7' });

    const espiao = providerEspiao();
    const res = await reenviarEmailsDoPedidoCore(
      adminDb,
      { pedidoId: PEDIDO_ID, reenvioId: 'intruso-na-lista-1', alvos: ['ingresso'] },
      platformAdmin,
      deps(espiao.provider)
    );

    expect(res.resultados.ingresso).toBe('enviado');
    expect(res.ingressos).toBe(1);
    const html = espiao.enviados[0]?.html ?? '';
    expect(html).not.toContain('X9Y8Z7');
    expect(html).not.toContain('Atleta insc-intruso');
  });

  // ── VETOR 9 ────────────────────────────────────────────────────────────
  it('vetor 9: o carimbo acessório não lança e não ressuscita pedido inexistente', async () => {
    await expect(
      registrarStatusEmailIngressos(adminDb, 'ped-que-nunca-existiu', 'falha_envio')
    ).resolves.toBeUndefined();
    const snap = await adminDb.collection('pedidos').doc('ped-que-nunca-existiu').get();
    expect(snap.exists).toBe(false);
  });

  // ── NÃO DECLARADO ──────────────────────────────────────────────────────
  it('não declarado: falha do carimbo da CONTA não pode inverter o veredito de um e-mail entregue', async () => {
    await semear(['insc-1']);
    // O carimbo pós-envio é um `update()` no pedido — ele lança NOT_FOUND se o
    // doc sumir. O efeito colateral abaixo reproduz isso de forma determinística
    // (em produção: estorno/expurgo concorrente, ou qualquer erro transitório
    // do `update`).
    const espiao = providerComEfeito(async () => {
      await adminDb.collection('pedidos').doc(PEDIDO_ID).delete();
    });

    const res = await reenviarEmailsDoPedidoCore(
      adminDb,
      { pedidoId: PEDIDO_ID, reenvioId: 'carimbo-invertido-1', alvos: ['conta'] },
      platformAdmin,
      deps(espiao.provider)
    );

    // O e-mail SAIU (com o link de definir senha dentro).
    expect(espiao.enviados).toHaveLength(1);
    expect(espiao.enviados[0]?.tag).toBe('conta-sem-friccao');
    // Logo o desfecho tem de ser `enviado`. Dizer `falha_envio` aqui dispara o
    // incidente crítico da F5 e leva o runbook a reenviar uma credencial que
    // já foi entregue.
    expect(res.resultados.conta).toBe('enviado');
  });
});
