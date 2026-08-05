/**
 * emailIncidente.integration.test.ts — F5 · P2 do DIAG-PIXREAL
 *
 * O buraco: em 04/08 os dois e-mails do primeiro pagamento real falharam com
 * 401 da Brevo e o sistema seguiu como se nada tivesse acontecido. A conta sem
 * fricção gravava `emailStatus: "falha_envio"` no pedido; a emissão do ingresso
 * NÃO gravava nada — um pedido cujo e-mail de ingresso foi recusado ficava
 * idêntico, no banco, a um pedido entregue. E os dois `logger.error` não
 * tinham nenhum campo que uma política de alerta pudesse casar.
 *
 * Este arquivo prova as duas metades do conserto:
 *   - PERSISTÊNCIA: `pedidos/{id}.emailIngressos.status` reflete falha, envio,
 *     pendência de chave e replay — e o contador de falhas acumula;
 *   - ALERTA: o payload do incidente carrega `alerta`/`severidade`/`canal`/
 *     `tipo` com formato estável, sem PII (parte pura, roda sem emulator).
 *
 * ⚠ PRÉ-REQUISITO da parte de persistência: Firestore Emulator via
 * `firebase emulators:exec` (porta em `LEELA_FS_EMU_PORT`).
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
import type { EmailProvider, SendTransactionalParams } from '@leela/core';
import { enviarEmailIngressos } from '../email/enviarIngressos';
import {
  ALERTA_EMAIL_TRANSACIONAL,
  montarIncidenteEmail,
} from '../email/incidenteEmail';
import type { IngressoEmitido } from '../eventos/emitirIngressos';
import { clearFirestoreDrained, withTriggersPaused } from './helpers/stability';

const FIRESTORE_PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);
const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';
const PEDIDO_ID = 'ped-incidente-1';

const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

const INGRESSOS: IngressoEmitido[] = [
  {
    inscritoId: 'insc-1',
    nome: 'Atleta insc-1',
    modalidade: '10k',
    qrToken: 'LLQR1.k1.token-de-teste',
    codigo: 'T93N7F',
    novo: false,
  },
];

function provider(opts: { falhar?: boolean } = {}): {
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
          throw new Error('Brevo respondeu 401 no envio transacional');
        }
        enviados.push(params);
        return { ok: true, messageId: `msg-${enviados.length}` };
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Parte pura — o contrato que a política de alerta casa
// ---------------------------------------------------------------------------

describe('incidente de e-mail transacional: o payload que o alerta casa', () => {
  it('carrega alerta, severidade, canal e tipo, com o erro truncado', () => {
    const payload = montarIncidenteEmail({
      tipo: 'ingressos',
      pedidoId: PEDIDO_ID,
      eventoId: EVENTO_ID,
      erro: new Error('Brevo respondeu 401 no envio transacional'),
    });

    expect(payload['alerta']).toBe(ALERTA_EMAIL_TRANSACIONAL);
    expect(payload['severidade']).toBe('critico');
    expect(payload['canal']).toBe('email');
    expect(payload['tipo']).toBe('ingressos');
    expect(payload['pedidoId']).toBe(PEDIDO_ID);
    expect(payload['eventoId']).toBe(EVENTO_ID);
    expect(payload['err']).toBe('Brevo respondeu 401 no envio transacional');
  });

  it('erro gigante é truncado e erro não-Error vira texto', () => {
    const gigante = montarIncidenteEmail({
      tipo: 'conta_sem_friccao',
      pedidoId: PEDIDO_ID,
      erro: new Error('x'.repeat(5_000)),
    });
    expect((gigante['err'] as string).length).toBe(200);
    // Sem eventoId, a chave nem aparece (nunca `undefined` no log).
    expect('eventoId' in gigante).toBe(false);

    const estranho = montarIncidenteEmail({
      tipo: 'reenvio_conta',
      pedidoId: PEDIDO_ID,
      eventoId: null,
      erro: { code: 401 },
    });
    expect(typeof estranho['err']).toBe('string');
    expect('eventoId' in estranho).toBe(false);
  });

  it('o payload não carrega PII do comprador', () => {
    const payload = montarIncidenteEmail({
      tipo: 'ingressos',
      pedidoId: PEDIDO_ID,
      eventoId: EVENTO_ID,
      erro: new Error('falhou'),
    });
    const texto = JSON.stringify(payload);
    expect(texto).not.toContain('@');
    expect(texto).not.toContain('Marina');
  });
});

// ---------------------------------------------------------------------------
// Persistência — o estado que a consulta "quem pagou e não recebeu" lê
// ---------------------------------------------------------------------------

beforeAll(async () => {
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
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
  });
});

async function semear(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
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
    inscritoRefs: ['insc-1'],
    responsavel: {
      nome: 'Marina Compradora',
      email: 'marina@exemplo.test',
      atletaId: 'atleta-insc-1',
    },
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(
    adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('inscritos')
      .doc('insc-1'),
    {
      id: 'insc-1',
      tenantId: CASTELO_ID,
      atletaId: 'atleta-insc-1',
      atletaNome: 'Atleta insc-1',
      kit: 'kit_prata',
      chipNumero: null,
      status: 'confirmado',
      modalidade: '10k',
      tamanhos: {},
      pedidoRef: PEDIDO_ID,
      ehResponsavel: true,
      qrToken: INGRESSOS[0]?.qrToken,
      codigoIngresso: INGRESSOS[0]?.codigo,
      criadoEm: now,
      atualizadoEm: now,
    }
  );
  await batch.commit();
}

async function lerCarimbo(): Promise<Record<string, unknown> | undefined> {
  const snap = await adminDb.collection('pedidos').doc(PEDIDO_ID).get();
  return snap.get('emailIngressos') as Record<string, unknown> | undefined;
}

describe.skipIf(!hasEmulator)('emailStatus da emissão persiste no pedido (F5)', () => {
  it('falha do provedor vira estado consultável no pedido, não só log', async () => {
    await semear();
    // Antes de qualquer envio o pedido não tem o campo — é exatamente por isso
    // que a falha de 04/08 ficou invisível.
    expect(await lerCarimbo()).toBeUndefined();

    const quebrado = provider({ falhar: true });
    const r = await enviarEmailIngressos(
      adminDb,
      { pedidoId: PEDIDO_ID, eventoId: EVENTO_ID, ingressos: INGRESSOS },
      quebrado.provider
    );

    expect(r.status).toBe('falha_envio');
    const carimbo = await lerCarimbo();
    expect(carimbo?.['status']).toBe('falha_envio');
    expect(carimbo?.['falhas']).toBe(1);
    expect(carimbo?.['falhaEm']).toBeTruthy();

    // ⚠ GUARDIÃO DA REGRA DURÁVEL (FIX-PROJECAO): `comunicacaoId` NÃO vai para
    // o doc do pedido. Desde a RN-469 o comprador lê esse doc inteiro e as
    // Rules não filtram campo — decidem o documento, não a projeção —, então
    // todo campo aqui nasce visível a ele. Este `toBeUndefined` é o que impede
    // o handle server-only de voltar por descuido.
    expect(carimbo?.['comunicacaoId']).toBeUndefined();
    // E o valor não foi perdido: ele continua sendo o docId do log de
    // comunicação, na coleção que só a gestão lê.
    expect(r.comunicacaoId).toBeTruthy();
    const log = await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('comunicacoes')
      .doc(r.comunicacaoId as string)
      .get();
    expect(log.exists).toBe(true);

    // O carimbo é acessório: não pode ter mexido no estado do dinheiro.
    const pedido = await adminDb.collection('pedidos').doc(PEDIDO_ID).get();
    expect(pedido.get('status')).toBe('pago');
  });

  it('sem chave de e-mail o pedido registra a pendência (fail-closed visível)', async () => {
    await semear();
    const r = await enviarEmailIngressos(
      adminDb,
      { pedidoId: PEDIDO_ID, eventoId: EVENTO_ID, ingressos: INGRESSOS },
      null
    );
    expect(r.status).toBe('pendente_chave');
    expect((await lerCarimbo())?.['status']).toBe('pendente_chave');
  });

  it('envio bem-sucedido carimba enviado; o replay da RN-219 carimba ja_enviado', async () => {
    await semear();
    const ok = provider();

    const primeiro = await enviarEmailIngressos(
      adminDb,
      { pedidoId: PEDIDO_ID, eventoId: EVENTO_ID, ingressos: INGRESSOS },
      ok.provider
    );
    expect(primeiro.status).toBe('enviado');
    expect((await lerCarimbo())?.['status']).toBe('enviado');
    expect(ok.enviados).toHaveLength(1);

    // Reprocesso do webhook: a RN-219 barra o envio e o carimbo conta isso.
    const segundo = await enviarEmailIngressos(
      adminDb,
      { pedidoId: PEDIDO_ID, eventoId: EVENTO_ID, ingressos: INGRESSOS },
      ok.provider
    );
    expect(segundo.status).toBe('ja_enviado');
    expect(ok.enviados).toHaveLength(1);
    expect((await lerCarimbo())?.['status']).toBe('ja_enviado');
  });

  it('a consulta "quem pagou e não recebeu" acha o pedido pela falha', async () => {
    await semear();
    const quebrado = provider({ falhar: true });
    await enviarEmailIngressos(
      adminDb,
      { pedidoId: PEDIDO_ID, eventoId: EVENTO_ID, ingressos: INGRESSOS },
      quebrado.provider
    );

    // É a consulta do runbook — igualdade single-field, sem índice composto.
    const achados = await adminDb
      .collection('pedidos')
      .where('emailIngressos.status', '==', 'falha_envio')
      .get();
    expect(achados.size).toBe(1);
    expect(achados.docs[0]?.id).toBe(PEDIDO_ID);
  });

  it('pedido inexistente não é criado pelo carimbo', async () => {
    // `update` em doc ausente falha e o erro é engolido com log — o caminho
    // nunca pode ressuscitar um pedido que não existe (seria pior que a falha).
    const quebrado = provider({ falhar: true });
    const r = await enviarEmailIngressos(
      adminDb,
      { pedidoId: 'ped-que-nao-existe', eventoId: EVENTO_ID, ingressos: INGRESSOS },
      quebrado.provider
    );
    expect(r.status).toBe('sem_destinatario');
    const fantasma = await adminDb.collection('pedidos').doc('ped-que-nao-existe').get();
    expect(fantasma.exists).toBe(false);
  });
});
