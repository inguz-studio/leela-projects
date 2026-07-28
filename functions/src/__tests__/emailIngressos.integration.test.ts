/**
 * emailIngressos.integration.test.ts — LEELA-S1206-T6 (RN-398 sobre RN-219)
 *
 * Template (puro) + disparo (Emulator) do e-mail de compra com os ingressos.
 *
 * Cobre os aceites literais do E12/S1206 (complemento SPECS-0728):
 *   - imagens BLOQUEADAS: o código de cada inscrito continua legível em texto
 *     e o link do evento continua lá (a prova é feita sobre a parte `texto` e
 *     sobre o HTML sem os `<img>`);
 *   - imagens LIBERADAS: o QR de cada inscrito aparece ao lado do respectivo
 *     código;
 *   - UM e-mail por PEDIDO, ao responsável, com TODOS os inscritos;
 *   - reprocessar o webhook NÃO reenvia (idempotência RN-219 reusada);
 *   - sem chave de e-mail: nada é enviado E nada é registrado (registrar
 *     queimaria a idempotência de um envio que nunca houve);
 *   - anti-injeção: nome de inscrito com HTML não escapa do escape.
 *
 * ⚠ PRÉ-REQUISITO (bloco de integração): Firestore Emulator (8080).
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
  QR_POR_EMAIL_MAX,
  isQrDataUriValido,
  renderIngressosCompraEmail,
} from '../email/templates';
import { enviarEmailIngressos } from '../email/enviarIngressos';
import { emitirIngressosDoPedido } from '../eventos/emitirIngressos';
import { gerarQrDataUrl } from '../eventos/publicarEvento';
import type { QrKeyring } from '../eventos/qrToken';
import { clearFirestoreDrained, withTriggersPaused } from './helpers/stability';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'meia-floripa-2026';
const PEDIDO_ID = 'ped-ingqr-mail';

const RING: QrKeyring = { ativo: 'k1', chaves: { k1: Buffer.alloc(32, 7) } };
const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);

/** Provider de e-mail INJETADO — zero rede real (disciplina da lane). */
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

/** Provider que SEMPRE falha — prova que a compra não depende do e-mail. */
const providerQuebrado: EmailProvider = {
  name: 'quebrado',
  async sendTransactional() {
    throw new Error('SMTP fora do ar');
  },
};

// ---------------------------------------------------------------------------
// Template — puro, sem emulator
// ---------------------------------------------------------------------------

const QR_FAKE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('renderIngressosCompraEmail — RN-398', () => {
  const base = {
    nomeComprador: 'Marina',
    nomeEvento: 'Meia Floripa 2026',
    linkEvento: 'https://beh.ro/meia-floripa-2026',
  };

  it('com imagem BLOQUEADA o código de cada inscrito continua legível', () => {
    const email = renderIngressosCompraEmail({
      ...base,
      ingressos: [
        { nome: 'Marina', modalidade: '21k', codigo: 'AB2CD3', qrDataUri: QR_FAKE },
        { nome: 'João', modalidade: '10k', codigo: 'XY7ZK9', qrDataUri: QR_FAKE },
      ],
    });

    // A parte TEXTO é o que sobra quando o cliente bloqueia tudo.
    expect(email.texto).toContain('AB2CD3');
    expect(email.texto).toContain('XY7ZK9');
    expect(email.texto).toContain('https://beh.ro/meia-floripa-2026');

    // E no HTML o código não vive dentro de nenhum <img>: removendo todas as
    // imagens, os dois códigos continuam de pé.
    const semImagens = email.html.replace(/<img[^>]*>/g, '');
    expect(semImagens).toContain('AB2CD3');
    expect(semImagens).toContain('XY7ZK9');
    expect(semImagens).toContain('https://beh.ro/meia-floripa-2026');
  });

  it('com imagem LIBERADA o QR aparece ao lado do respectivo código', () => {
    const email = renderIngressosCompraEmail({
      ...base,
      ingressos: [
        { nome: 'Marina', modalidade: '21k', codigo: 'AB2CD3', qrDataUri: QR_FAKE },
        { nome: 'João', modalidade: '10k', codigo: 'XY7ZK9', qrDataUri: QR_FAKE },
      ],
    });
    const imagens = email.html.match(/<img[^>]*>/g) ?? [];
    expect(imagens).toHaveLength(2);
    // Cada QR está no MESMO bloco do seu código (o bloco é a fronteira).
    const blocos = email.html.split('<div style="border:1px solid');
    expect(blocos[1]).toContain('AB2CD3');
    expect(blocos[1]).toContain('<img');
    expect(blocos[2]).toContain('XY7ZK9');
    expect(blocos[2]).toContain('<img');
  });

  it('QR ausente ou torto: o bloco sai SEM imagem e o código permanece', () => {
    const email = renderIngressosCompraEmail({
      ...base,
      ingressos: [
        { nome: 'Marina', modalidade: '21k', codigo: 'AB2CD3', qrDataUri: '' },
        {
          nome: 'João',
          modalidade: '10k',
          codigo: 'XY7ZK9',
          // svg+xml carrega script — nunca vira `src` de imagem no e-mail.
          qrDataUri: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        },
        {
          nome: 'Ana',
          modalidade: '5k',
          codigo: 'QW4RT5',
          qrDataUri: 'https://exemplo.test/qr.png',
        },
      ],
    });
    expect(email.html.match(/<img[^>]*>/g)).toBeNull();
    expect(email.html).toContain('AB2CD3');
    expect(email.html).toContain('XY7ZK9');
    expect(email.html).toContain('QW4RT5');
  });

  it('código fora do formato canônico NÃO é apresentado como código', () => {
    const email = renderIngressosCompraEmail({
      ...base,
      ingressos: [
        { nome: 'Marina', modalidade: '21k', codigo: 'ab2cd3', qrDataUri: QR_FAKE },
      ],
    });
    expect(email.html).not.toContain('ab2cd3');
    expect(email.html).toContain('Ingresso ainda sendo emitido');
    // Sem código, também não embute QR: imagem sem número é adivinhação.
    expect(email.html.match(/<img[^>]*>/g)).toBeNull();
  });

  it('embute no máximo QR_POR_EMAIL_MAX imagens; o resto vai só em texto', () => {
    const ingressos = Array.from({ length: QR_POR_EMAIL_MAX + 3 }, (_, i) => ({
      nome: `Inscrito ${i}`,
      modalidade: '10k',
      codigo: 'AB2CD3',
      qrDataUri: QR_FAKE,
    }));
    const email = renderIngressosCompraEmail({ ...base, ingressos });
    expect(email.html.match(/<img[^>]*>/g)).toHaveLength(QR_POR_EMAIL_MAX);
    // Todos os inscritos continuam na parte texto — ninguém some.
    expect(email.texto.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(
      QR_POR_EMAIL_MAX + 3
    );
  });

  it('ANTI-INJEÇÃO: nome com HTML é escapado, não interpretado', () => {
    const email = renderIngressosCompraEmail({
      ...base,
      nomeComprador: '<script>alert(1)</script>',
      ingressos: [
        {
          nome: '<img src=x onerror=alert(1)>',
          modalidade: '21k',
          codigo: 'AB2CD3',
          qrDataUri: QR_FAKE,
        },
      ],
    });
    // Nenhuma TAG nasce do texto da pessoa: o payload aparece só na forma
    // escapada, byte a byte (asserção mais forte que "não contém onerror",
    // que dava falso positivo justamente sobre o texto inerte).
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).not.toMatch(/<script/i);
    expect(email.html).not.toMatch(/<img[^>]*onerror/i);
    // A única imagem do corpo é o QR que o servidor montou.
    expect(email.html.match(/<img[^>]*>/g)).toHaveLength(1);
    // Nenhum atributo carrega dado de fora — nem o `alt` do QR.
    expect(email.html).toMatch(/<img [^>]*alt="QR do ingresso"/);
  });

  it('ANTI-INJEÇÃO no ASSUNTO: CR/LF do nome do evento não viram cabeçalho', () => {
    const email = renderIngressosCompraEmail({
      ...base,
      nomeEvento: 'Meia\r\nBcc: vitima@exemplo.test',
      ingressos: [
        { nome: 'Marina', modalidade: '21k', codigo: 'AB2CD3', qrDataUri: QR_FAKE },
      ],
    });
    // O assunto é linha ÚNICA: quebra de linha ali injeta cabeçalho SMTP.
    expect(email.assunto).not.toMatch(/[\r\n]/);
    expect(email.assunto).toBe('Seu ingresso para Meia Bcc: vitima@exemplo.test');
    // No corpo texto o payload é inerte (text/plain não interpreta markup),
    // mas o CR/LF do nome do evento não sobrevive à sanitização: a linha do
    // evento continua sendo UMA linha.
    expect(email.texto).toContain('Meia Bcc: vitima@exemplo.test foi confirmada');
    expect(email.texto.includes(String.fromCharCode(13))).toBe(false);
  });

  it('link de evento inválido não vira e-mail (montagem do servidor)', () => {
    expect(() =>
      renderIngressosCompraEmail({
        ...base,
        linkEvento: 'javascript:alert(1)',
        ingressos: [
          { nome: 'Marina', modalidade: '21k', codigo: 'AB2CD3', qrDataUri: QR_FAKE },
        ],
      })
    ).toThrow(/linkEvento/);
  });

  it('isQrDataUriValido só aceita PNG base64', () => {
    expect(isQrDataUriValido(QR_FAKE)).toBe(true);
    expect(isQrDataUriValido('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isQrDataUriValido('data:image/png;base64,<script>')).toBe(false);
    expect(isQrDataUriValido('https://exemplo.test/a.png')).toBe(false);
    expect(isQrDataUriValido(undefined)).toBe(false);
  });

  it('o QR gerado de verdade a partir do token passa no validador', async () => {
    const dataUri = await gerarQrDataUrl('LLQR1.k1.abc.def', 240);
    expect(isQrDataUriValido(dataUri)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Disparo — Emulator
// ---------------------------------------------------------------------------

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

async function semear(inscritos: readonly string[]): Promise<void> {
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
      atletaId: 'atleta-insc-2',
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
        // O responsável é o SEGUNDO — a chave do log não pode assumir que é
        // sempre o primeiro da lista.
        ehResponsavel: id === 'insc-2',
        criadoEm: now,
        atualizadoEm: now,
      }
    );
  }
  await batch.commit();
}

async function logsDoEvento(): Promise<admin.firestore.QuerySnapshot> {
  return adminDb
    .collection('eventos')
    .doc(EVENTO_ID)
    .collection(COLECAO_LOG_COMUNICACAO)
    .get();
}

beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
  });
});

describe.skipIf(!hasEmulator)('enviarEmailIngressos — S1206-T6 (RN-398/219)', () => {
  it('UM e-mail por pedido, ao responsável, com TODOS os inscritos', async () => {
    const ids = ['insc-1', 'insc-2', 'insc-3'];
    await semear(ids);
    const emissao = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const { provider, enviados } = providerEspiao();

    const r = await enviarEmailIngressos(
      adminDb,
      { pedidoId: PEDIDO_ID, eventoId: EVENTO_ID, ingressos: emissao.ingressos },
      provider
    );

    expect(r.status).toBe('enviado');
    expect(enviados).toHaveLength(1);
    const enviado = enviados[0] as SendTransactionalParams;
    expect(enviado.to.email).toBe('marina@exemplo.test');
    // Os três códigos reais estão no corpo em TEXTO.
    for (const ingresso of emissao.ingressos) {
      expect(enviado.texto).toContain(ingresso.codigo);
      expect(enviado.html).toContain(ingresso.codigo);
    }
    // Três QR embutidos.
    expect(enviado.html.match(/<img[^>]*>/g)).toHaveLength(3);
    // O log RN-219 foi carimbado no responsável (o SEGUNDO inscrito).
    const logs = await logsDoEvento();
    expect(logs.size).toBe(1);
    expect(logs.docs[0]?.get('destinatario').ref).toBe('insc-2');
    expect(logs.docs[0]?.get('tipo')).toBe('transacional');
    expect(logs.docs[0]?.get('chave')).toBe('emailConfirmacao');
  });

  it('REPROCESSO do webhook: o e-mail NÃO é reenviado (RN-219)', async () => {
    await semear(['insc-1', 'insc-2']);
    const emissao = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const { provider, enviados } = providerEspiao();
    const args = {
      pedidoId: PEDIDO_ID,
      eventoId: EVENTO_ID,
      ingressos: emissao.ingressos,
    };

    const r1 = await enviarEmailIngressos(adminDb, args, provider);
    const r2 = await enviarEmailIngressos(adminDb, args, provider);
    const r3 = await enviarEmailIngressos(adminDb, args, provider);

    expect(r1.status).toBe('enviado');
    expect(r2.status).toBe('ja_enviado');
    expect(r3.status).toBe('ja_enviado');
    expect(enviados).toHaveLength(1);
    expect((await logsDoEvento()).size).toBe(1);
  });

  // ⚔ INGQR-REV vetor 2. A chave da RN-219 tem de sair do PEDIDO. Quando ela
  // saía dos ingressos EMITIDOS, uma primeira passagem que falhasse justamente
  // no responsável carimbava o log em OUTRO inscrito; a passagem seguinte
  // derivava um docId diferente, não colidia e mandava um SEGUNDO e-mail — com
  // o QR e o código de todo mundo dentro. Vermelho antes do fix: 2 envios.
  it('primeira passagem PARCIAL (sem o responsável) não libera um segundo e-mail', async () => {
    const ids = ['insc-1', 'insc-2', 'insc-3'];
    await semear(ids); // `ehResponsavel` é do insc-2 — o do MEIO
    const emissao = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const { provider, enviados } = providerEspiao();

    // O responsável ficou de fora desta passagem (é o que `falhas > 0` produz).
    const parcial = emissao.ingressos.filter((i) => i.inscritoId !== 'insc-2');
    expect(parcial).toHaveLength(2);
    const r1 = await enviarEmailIngressos(
      adminDb,
      { pedidoId: PEDIDO_ID, eventoId: EVENTO_ID, ingressos: parcial },
      provider
    );
    // Segunda passagem (sweeper/reconfirmação): agora todo mundo tem ingresso.
    const r2 = await enviarEmailIngressos(
      adminDb,
      { pedidoId: PEDIDO_ID, eventoId: EVENTO_ID, ingressos: emissao.ingressos },
      provider
    );

    expect(r1.status).toBe('enviado');
    expect(r2.status).toBe('ja_enviado');
    expect(enviados).toHaveLength(1);
    const logs = await logsDoEvento();
    expect(logs.size).toBe(1);
    // E a chave é a do PEDIDO (o responsável), não a do primeiro que emitiu.
    expect(logs.docs[0]?.get('destinatario').ref).toBe('insc-2');
  });

  it('SEM chave de e-mail: nada enviado E nada registrado (a idempotência não queima)', async () => {
    await semear(['insc-1', 'insc-2']);
    const emissao = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const args = {
      pedidoId: PEDIDO_ID,
      eventoId: EVENTO_ID,
      ingressos: emissao.ingressos,
    };

    const semChave = await enviarEmailIngressos(adminDb, args, null);
    expect(semChave.status).toBe('pendente_chave');
    expect((await logsDoEvento()).size).toBe(0);

    // O dia em que a chave chegar, o e-mail SAI — o registro não foi queimado.
    const { provider, enviados } = providerEspiao();
    const comChave = await enviarEmailIngressos(adminDb, args, provider);
    expect(comChave.status).toBe('enviado');
    expect(enviados).toHaveLength(1);
  });

  it('falha de envio deixa a pendência VISÍVEL no log e não reenvia sozinha', async () => {
    await semear(['insc-1', 'insc-2']);
    const emissao = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const args = {
      pedidoId: PEDIDO_ID,
      eventoId: EVENTO_ID,
      ingressos: emissao.ingressos,
    };

    const r = await enviarEmailIngressos(adminDb, args, providerQuebrado);
    expect(r.status).toBe('falha_envio');

    const logs = await logsDoEvento();
    expect(logs.size).toBe(1);
    // `enfileirado` = o estado que a RN-219 previu para o crash entre o
    // markSent e o envio: pendência observável, nunca retry cego.
    expect(logs.docs[0]?.get('status')).toBe('enfileirado');
  });

  it('sem ingresso não há e-mail — e a idempotência segue intacta', async () => {
    await semear(['insc-1']);
    const { provider, enviados } = providerEspiao();
    const r = await enviarEmailIngressos(
      adminDb,
      { pedidoId: PEDIDO_ID, eventoId: EVENTO_ID, ingressos: [] },
      provider
    );
    expect(r.status).toBe('sem_ingresso');
    expect(enviados).toHaveLength(0);
    expect((await logsDoEvento()).size).toBe(0);
  });

  it('o log de comunicação NUNCA carrega o corpo nem o token (PII mínima)', async () => {
    await semear(['insc-1', 'insc-2']);
    const emissao = await emitirIngressosDoPedido(adminDb, PEDIDO_ID, RING);
    const { provider } = providerEspiao();
    await enviarEmailIngressos(
      adminDb,
      { pedidoId: PEDIDO_ID, eventoId: EVENTO_ID, ingressos: emissao.ingressos },
      provider
    );
    const doc = (await logsDoEvento()).docs[0];
    const bruto = JSON.stringify(doc?.data() ?? {});
    expect(bruto).not.toContain('marina@exemplo.test');
    expect(bruto).not.toContain('LLQR1.');
    for (const ingresso of emissao.ingressos) {
      expect(bruto).not.toContain(ingresso.codigo);
    }
  });
});
