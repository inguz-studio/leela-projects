/**
 * ingressosOrfaos.integration.test.ts — item 54 · RN-382 (INGQR-POLISH T1)
 *
 * O buraco que a INGQR-REV provou (vetor 3): pedido PAGO cuja emissão de
 * ingresso falha fica órfão em silêncio — nenhuma re-entrega do gateway volta
 * a tentar, porque a segunda entrega morre como duplicada e a de outro eventId
 * morre por estado já final, as duas ANTES de olhar o pedido.
 *
 * Este arquivo prova a rede que fecha o buraco, contra o Emulator:
 *   - falha na PRIMEIRA entrega ⇒ o extrato de pendência NASCE no ponto da falha
 *     e o e-mail NÃO sai pela metade;
 *   - a varredura ⇒ ingresso emitido E e-mail enviado UMA vez, completo;
 *   - re-entrega do gateway depois ⇒ nada duplica (nem token, nem código, nem
 *     e-mail — a idempotência corrigida em `291d4f9` é quem segura);
 *   - pedido que deixou de ser órfão (cancelado) ⇒ pendência fechada, sem e-mail;
 *   - emissão que nem roda (evento sem tenant) ⇒ pendência que a varredura não
 *     fecha por conta própria;
 *   - re-tentativa que ESGOTA ⇒ alerta contável, o que existe é enviado, e a
 *     varredura seguinte não re-tenta mais (conferência humana);
 *   - `ingressosPendentes` é server-only (deny-by-default, sem `match`).
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
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  isCodigoIngressoValido,
  type EmailProvider,
  type SendTransactionalParams,
} from '@leela/core';
import { dispararEmissaoIngressosPosConfirmacao } from '../eventos/emitirIngressos';
import {
  INGRESSOS_PENDENTES_COL,
  TENTATIVAS_VARREDURA_INGRESSO,
} from '../eventos/ingressosPendentes';
import { varrerIngressosOrfaosCore } from '../eventos/varrerIngressosOrfaos';
import type { QrKeyring } from '../eventos/qrToken';
import { clearFirestoreDrained, withTriggersPaused } from './helpers/stability';

/**
 * Provider do caminho INLINE (o que o disparo pós-confirmação seleciona).
 * Injetado por mock de módulo porque `selectEmailProvider` lê a env: sem isto,
 * o fail-closed da RN-137 mascararia a pergunta desta lane — "o e-mail sai ou
 * não sai quando a emissão ficou incompleta?" — respondendo sempre "não sai".
 * Zero rede real: o espião só acumula.
 */
const inline = vi.hoisted(() => {
  const enviados: SendTransactionalParams[] = [];
  return {
    enviados,
    provider: {
      name: 'inline-espiao',
      sendTransactional: async (params: SendTransactionalParams) => {
        enviados.push(params);
        return { ok: true, messageId: `inline-${enviados.length}` };
      },
    } satisfies EmailProvider,
  };
});

vi.mock('../email/selectEmailProvider', () => ({
  selectEmailProvider: () => inline.provider,
}));

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'meia-floripa-2026';
const PEDIDO_ID = 'ped-ingqrp-1';

/** Segredo de TESTE (32 bytes) — o mesmo ring que o disparo carrega da env. */
const SEGREDO_B64 = Buffer.alloc(32, 7).toString('base64url');
const RING: QrKeyring = { ativo: 'k1', chaves: { k1: Buffer.alloc(32, 7) } };

const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

/** Provider da VARREDURA — injetado por parâmetro (o core recebe o port). */
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

beforeAll(async () => {
  // O disparo pós-confirmação lê o ring da ENV — é o caminho de produção, e é
  // ele que precisa estar sob teste, não uma injeção que só o teste usa.
  process.env['QR_TOKEN_KEYS'] = JSON.stringify({ k1: SEGREDO_B64 });
  process.env['QR_TOKEN_KID_ATIVO'] = 'k1';

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
  delete process.env['QR_TOKEN_KEYS'];
  delete process.env['QR_TOKEN_KID_ATIVO'];
  await testEnv?.cleanup();
});

afterEach(() => {
  vi.restoreAllMocks();
  inline.enviados.length = 0;
});

async function semear(
  inscritos: readonly string[],
  statusPedido = 'pago'
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
    status: statusPedido,
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

async function lerPendencia(): Promise<admin.firestore.DocumentData | null> {
  const snap = await adminDb.collection(INGRESSOS_PENDENTES_COL).doc(PEDIDO_ID).get();
  return snap.exists ? (snap.data() ?? {}) : null;
}

/** Roda o disparo pós-confirmação exatamente como os 3 confirmadores rodam. */
async function dispararComoWebhook(): Promise<void> {
  await dispararEmissaoIngressosPosConfirmacao(adminDb, {
    statusGateway: 'confirmed',
    ignorado: false,
    duplicado: false,
    pedidoId: PEDIDO_ID,
  });
}

/**
 * O mesmo disparo com o sorteio de código TRAVADO: todo inscrito sorteia o
 * MESMO código, então o segundo em diante esgota as tentativas e sai sem
 * ingresso. É o `sem_codigo_livre` do vetor 3, pela porta real.
 */
async function dispararComSorteioTravado(): Promise<void> {
  const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
  try {
    await dispararComoWebhook();
  } finally {
    spy.mockRestore();
  }
}

beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
  });
});

describe.skipIf(!hasEmulator)('ingresso órfão: extrato + varredura (item 54 · RN-382)', () => {
  it('falha na 1ª entrega ⇒ extrato nasce e e-mail espera; varredura ⇒ ingresso + e-mail 1x', async () => {
    await semear(['insc-1', 'insc-2']);

    // ── 1ª entrega do webhook: um sai com ingresso, o outro não ────────────
    await dispararComSorteioTravado();

    const a = await lerInscrito('insc-1');
    expect(isCodigoIngressoValido(a['codigoIngresso'])).toBe(true);
    expect((await lerInscrito('insc-2'))['codigoIngresso']).toBeUndefined();

    // O e-mail NÃO saiu pela metade: a RN-219 é at-most-once por pedido, e
    // queimar a chave sobre a lista parcial condenaria `insc-2` a nunca
    // receber o ingresso por e-mail.
    expect(inline.enviados).toHaveLength(0);

    // O extrato nasceu NO PONTO DA FALHA — antes disto, isto era silêncio.
    const pendencia = await lerPendencia();
    expect(pendencia).not.toBeNull();
    expect(pendencia?.['resolvido']).toBe(false);
    expect(pendencia?.['motivo']).toBe('emissao_incompleta');
    expect(pendencia?.['falhas']).toBe(1);
    expect(pendencia?.['eventoId']).toBe(EVENTO_ID);
    expect(pendencia?.['deteccoes']).toBe(1);
    expect(pendencia?.['tentativasVarredura']).toBe(0);

    // ── A varredura: re-tenta a emissão e fecha o e-mail ───────────────────
    const espiao = providerEspiao();
    const r = await varrerIngressosOrfaosCore(adminDb, RING, espiao.provider);

    expect(r.emitidos).toBe(1);
    expect(r.resolvidos).toBe(1);
    expect(r.pendentes).toBe(0);
    // 'enviado' (e não 'ja_enviado') prova que a chave da RN-219 continuava
    // intacta: se o inline tivesse queimado, este envio seria suprimido.
    expect(r.emailsEnviados).toBe(1);
    expect(r.esgotados).toBe(0);
    expect(r.falhas).toBe(0);

    const b = await lerInscrito('insc-2');
    expect(isCodigoIngressoValido(b['codigoIngresso'])).toBe(true);
    expect(b['codigoIngresso']).not.toBe(a['codigoIngresso']);
    // O primeiro NÃO foi remexido: token e código byte a byte iguais.
    expect((await lerInscrito('insc-1'))['qrToken']).toBe(a['qrToken']);
    expect((await lerInscrito('insc-1'))['codigoIngresso']).toBe(a['codigoIngresso']);

    // UM e-mail, com os DOIS códigos — inclusive o que só existiu depois.
    expect(espiao.enviados).toHaveLength(1);
    const enviado = espiao.enviados[0] as SendTransactionalParams;
    expect(enviado.texto).toContain(a['codigoIngresso'] as string);
    expect(enviado.texto).toContain(b['codigoIngresso'] as string);

    // Pendência fechada com o desfecho do e-mail à vista.
    const fechada = await lerPendencia();
    expect(fechada?.['resolvido']).toBe(true);
    expect(fechada?.['emailStatus']).toBe('enviado');

    // ── Re-entrega do gateway depois de tudo: NADA duplica ─────────────────
    await dispararComoWebhook();
    expect((await lerInscrito('insc-1'))['qrToken']).toBe(a['qrToken']);
    expect((await lerInscrito('insc-2'))['codigoIngresso']).toBe(b['codigoIngresso']);
    // Segundo e-mail com a credencial de todo mundo é exatamente o defeito
    // que o `291d4f9` corrigiu — a re-entrega não o traz de volta.
    expect(inline.enviados).toHaveLength(0);
    expect(espiao.enviados).toHaveLength(1);

    // E a varredura seguinte não tem mais nada para fazer.
    const r2 = await varrerIngressosOrfaosCore(adminDb, RING, espiao.provider);
    expect(r2.pendentes).toBe(0);
    expect(r2.emitidos).toBe(0);
    expect(espiao.enviados).toHaveLength(1);
  });

  it('pedido que deixou de ser órfão (cancelado) fecha a pendência, sem e-mail', async () => {
    await semear(['insc-1', 'insc-2']);
    await dispararComSorteioTravado();
    expect((await lerPendencia())?.['resolvido']).toBe(false);

    await adminDb.collection('pedidos').doc(PEDIDO_ID).update({ status: 'cancelado' });

    const espiao = providerEspiao();
    const r = await varrerIngressosOrfaosCore(adminDb, RING, espiao.provider);
    expect(r.resolvidos).toBe(1);
    expect(r.pendentes).toBe(0);
    expect(r.emailsEnviados).toBe(0);
    expect(espiao.enviados).toHaveLength(0);

    const fechada = await lerPendencia();
    expect(fechada?.['resolvido']).toBe(true);
    expect(fechada?.['desfecho']).toBe('pedido_nao_pago');
  });

  it('emissão que NEM RODA também vira pendência, e a varredura não a fecha sozinha', async () => {
    await semear(['insc-1']);
    // Evento sem tenant: a emissão para antes de qualquer escrita (o tenantId
    // do payload assinado vem do evento, ADR-009). O pedido segue PAGO.
    await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .update({ tenantId: FieldValue.delete() });

    await dispararComoWebhook();

    const pendencia = await lerPendencia();
    expect(pendencia?.['motivo']).toBe('emissao_nao_processada');
    expect(pendencia?.['detalhe']).toBe('evento_sem_tenant');
    expect(pendencia?.['resolvido']).toBe(false);
    expect(inline.enviados).toHaveLength(0);

    const espiao = providerEspiao();
    const r = await varrerIngressosOrfaosCore(adminDb, RING, espiao.provider);
    expect(r.resolvidos).toBe(0);
    expect(r.pendentes).toBe(1);
    expect(espiao.enviados).toHaveLength(0);
    const depois = await lerPendencia();
    expect(depois?.['tentativasVarredura']).toBe(1);
    expect(depois?.['ultimoMotivo']).toBe('evento_sem_tenant');
    expect((await lerInscrito('insc-1'))['qrToken']).toBeUndefined();
  });

  it('re-tentativa que ESGOTA alerta, manda o que existe e para de re-tentar', async () => {
    await semear(['insc-1', 'insc-2']);
    await dispararComSorteioTravado();

    const espiao = providerEspiao();
    // Sorteio travado durante TODAS as varreduras: a falha não se cura, que é
    // o cenário do alerta (espaço de códigos do evento esgotado, bug, etc.).
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    let ultima = await varrerIngressosOrfaosCore(adminDb, RING, espiao.provider);
    for (let i = 1; i < TENTATIVAS_VARREDURA_INGRESSO; i++) {
      ultima = await varrerIngressosOrfaosCore(adminDb, RING, espiao.provider);
    }
    // A última passagem é a que esgota: alerta contável + e-mail do que existe
    // (o comprador não fica sem NADA por causa de um inscrito que não saiu).
    expect(ultima.esgotados).toBe(1);
    expect(ultima.emailsEnviados).toBe(1);
    expect(espiao.enviados).toHaveLength(1);

    const esgotada = await lerPendencia();
    expect(esgotada?.['esgotado']).toBe(true);
    expect(esgotada?.['resolvido']).toBe(false);
    expect(esgotada?.['tentativasVarredura']).toBe(TENTATIVAS_VARREDURA_INGRESSO);
    expect(esgotada?.['esgotadoEm']).toBeTruthy();

    // Depois de esgotar: contado como conferência humana, NUNCA re-tentado —
    // insistir a cada 15 minutos para sempre afogaria o alerta que importa.
    const depois = await varrerIngressosOrfaosCore(adminDb, RING, espiao.provider);
    expect(depois.conferenciaManual).toBe(1);
    expect(depois.emitidos).toBe(0);
    expect(depois.esgotados).toBe(0);
    expect(espiao.enviados).toHaveLength(1);
    expect((await lerPendencia())?.['tentativasVarredura']).toBe(
      TENTATIVAS_VARREDURA_INGRESSO
    );
    spy.mockRestore();
  });

  it('a pendência é server-only: tenant_owner não lê nem escreve', async () => {
    // A coleção não tem `match` em Rules (deny-by-default), e "não escrevi
    // regra" não é prova: ESCREVER aqui deixaria um cliente marcar como
    // resolvida uma pendência viva — o comprador nunca receberia o ingresso.
    await semear(['insc-1', 'insc-2']);
    await dispararComSorteioTravado();

    const db = testEnv
      .authenticatedContext(MARINA_UID, {
        role: 'tenant_owner',
        tenantId: CASTELO_ID,
      })
      .firestore() as unknown as Firestore;

    await assertFails(getDoc(doc(db, INGRESSOS_PENDENTES_COL, PEDIDO_ID)));
    await assertFails(
      setDoc(doc(db, INGRESSOS_PENDENTES_COL, PEDIDO_ID), { resolvido: true })
    );
  });
});
