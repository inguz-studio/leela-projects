/**
 * ingressoPorLink.integration.test.ts — LEELA-S1214-T1 (RN-418/419/420/421/422)
 *
 * A leitura do ingresso por capacidade, contra o Emulator. Cobre os vetores da
 * review antagonista que só existem ponta a ponta:
 *   ⚔ 1 — Rules intocadas: cliente anônimo continua sem ler `inscritos`;
 *   ⚔ 2 — sem oráculo: as quatro causas de falha devolvem a MESMA resposta;
 *   ⚔ 3 — rotação × link emitido, com o ring de verdade;
 *   ⚔ 5 — binding: re-emissão revoga, rotação não;
 *   ⚔ 6 — estornado/cancelado sem QR;
 *   ⚔ 7 — privacidade: nenhum campo proibido pela RN-422 na projeção.
 *
 * ⚠ PRÉ-REQUISITO: Firestore Emulator (8080).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { assinarLinkIngresso } from '../eventos/linkIngresso';
import { assinarQrToken, type QrKeyring } from '../eventos/qrToken';
import { ingressoPorLinkCore } from '../http/ingressoPorLink';
import { clearFirestoreDrained, withTriggersPaused } from './helpers/stability';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';
const INSCRITO_ID = 'insc-ingpage-1';

const RING_K1: QrKeyring = { ativo: 'k1', chaves: { k1: Buffer.alloc(32, 11) } };
/** Rotação: k2 entra e vira ativo; k1 PERMANECE (RN-420, propriedade 1). */
const RING_K1_K2: QrKeyring = {
  ativo: 'k2',
  chaves: { k1: Buffer.alloc(32, 11), k2: Buffer.alloc(32, 22) },
};
/** Revogação em massa: k1 SAI do ring (RN-420, propriedade 2). */
const RING_SEM_K1: QrKeyring = { ativo: 'k2', chaves: { k2: Buffer.alloc(32, 22) } };

const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);

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

beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
  });
});

interface SemearArgs {
  statusInscrito?: string;
  statusEvento?: string;
  comQrToken?: boolean;
  comCheckin?: boolean;
  ring?: QrKeyring;
}

/** Semeia tenant + evento + inscrito e devolve o `qrToken` gravado. */
async function semear(args: SemearArgs = {}): Promise<string | null> {
  const {
    statusInscrito = 'confirmado',
    statusEvento = 'publicado',
    comQrToken = true,
    comCheckin = false,
    ring = RING_K1,
  } = args;
  const now = FieldValue.serverTimestamp();
  const qrToken = comQrToken
    ? assinarQrToken(
        { inscritoId: INSCRITO_ID, eventoId: EVENTO_ID, tenantId: TENANT_ID },
        ring
      )
    : null;

  const batch = adminDb.batch();
  batch.set(adminDb.collection('eventos').doc(EVENTO_ID), {
    id: EVENTO_ID,
    tenantId: TENANT_ID,
    nome: 'Meia Maratona Floripa 2026',
    slug: EVENTO_ID,
    local: 'Beira-Mar Norte, Florianópolis/SC',
    data: admin.firestore.Timestamp.fromDate(new Date('2026-09-13T09:00:00Z')),
    status: statusEvento,
    usaChip: false,
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(
    adminDb.collection('eventos').doc(EVENTO_ID).collection('inscritos').doc(INSCRITO_ID),
    {
      id: INSCRITO_ID,
      tenantId: TENANT_ID,
      atletaId: 'atleta-1',
      atletaNome: 'Marina Corredora',
      kit: 'kit_prata',
      chipNumero: null,
      status: statusInscrito,
      modalidade: '21k',
      tamanhos: { 'camiseta-tecnica': 'M' },
      pedidoRef: 'ped-1',
      ehResponsavel: true,
      codigoIngresso: 'AB2CD3',
      // PII que a RN-422 PROÍBE na projeção — semeada de propósito para que a
      // asserção de privacidade tenha o que não encontrar.
      dadosPessoais: {
        cpf: '12345678909',
        telefone: '48999990000',
        email: 'marina@exemplo.test',
        nascimento: '1990-04-01',
        contatoEmergencia: { nome: 'João', telefone: '48988887777' },
      },
      respostasFormulario: { camisa: 'sim' },
      valorPago: 18900,
      ...(qrToken !== null ? { qrToken, ingressoEmitidoEm: now } : {}),
      ...(comCheckin
        ? { checkinEm: admin.firestore.Timestamp.fromDate(new Date('2026-09-13T06:12:00Z')) }
        : {}),
      criadoEm: now,
      atualizadoEm: now,
    }
  );
  await batch.commit();
  return qrToken;
}

function linkDe(qrToken: string, ring: QrKeyring = RING_K1): string {
  return assinarLinkIngresso(
    { inscritoId: INSCRITO_ID, eventoId: EVENTO_ID, tenantId: TENANT_ID },
    qrToken,
    ring
  );
}

describe.skipIf(!hasEmulator)('ingressoPorLink — S1214-T1', () => {
  it('caminho feliz: projeta estado, dados mínimos e o QR renderizado', async () => {
    const qrToken = (await semear()) as string;
    const p = await ingressoPorLinkCore(adminDb, linkDe(qrToken), RING_K1);

    expect(p).not.toBeNull();
    expect(p?.estado).toBe('valido');
    expect(p?.titular).toBe('Marina Corredora');
    expect(p?.evento.nome).toBe('Meia Maratona Floripa 2026');
    expect(p?.evento.local).toContain('Florianópolis');
    expect(p?.evento.dataISO).toBe('2026-09-13T09:00:00.000Z');
    expect(p?.modalidade).toBe('21k');
    expect(p?.kit).toBe('Kit Prata');
    expect(p?.tamanho).toBe('M');
    expect(p?.codigo).toBe('AB2CD3');
    expect(p?.qrDataUri).toMatch(/^data:image\/png;base64,/);
  });

  it('⚔ 7 — a projeção não carrega NENHUM campo proibido pela RN-422', async () => {
    const qrToken = (await semear()) as string;
    const p = await ingressoPorLinkCore(adminDb, linkDe(qrToken), RING_K1);
    const serializado = JSON.stringify(p);

    for (const proibido of [
      '12345678909', // CPF
      '48999990000', // telefone
      'marina@exemplo.test', // e-mail
      '1990-04-01', // nascimento
      '48988887777', // contato de emergência
      'respostasFormulario',
      'valorPago',
      '18900',
    ]) {
      expect(serializado).not.toContain(proibido);
    }
    // E o `qrToken` em texto também não desce (higiene — RN-419).
    expect(serializado).not.toContain(qrToken);
  });

  it('⚔ 2 — as quatro causas de falha devolvem a MESMA resposta', async () => {
    const qrToken = (await semear()) as string;
    const valido = linkDe(qrToken);

    const respostas = await Promise.all([
      // (a) token inválido / malformado
      ingressoPorLinkCore(adminDb, 'LLIP1.k1.nao-e-payload.zzz', RING_K1),
      // (b) assinatura inválida (último char trocado, alfabeto preservado)
      ingressoPorLinkCore(
        adminDb,
        valido.endsWith('A') ? `${valido.slice(0, -1)}B` : `${valido.slice(0, -1)}A`,
        RING_K1
      ),
      // (c) inscrito de OUTRO evento (link válido em forma, evento inexistente)
      ingressoPorLinkCore(
        adminDb,
        assinarLinkIngresso(
          { inscritoId: INSCRITO_ID, eventoId: 'outro-evento', tenantId: TENANT_ID },
          qrToken,
          RING_K1
        ),
        RING_K1
      ),
      // (d) inscrito inexistente
      ingressoPorLinkCore(
        adminDb,
        assinarLinkIngresso(
          { inscritoId: 'nao-existe', eventoId: EVENTO_ID, tenantId: TENANT_ID },
          qrToken,
          RING_K1
        ),
        RING_K1
      ),
    ]);

    // Idêntica byte a byte: todas são a MESMA negativa, sem oráculo.
    for (const r of respostas) expect(r).toBeNull();
    expect(new Set(respostas.map((r) => JSON.stringify(r))).size).toBe(1);
  });

  it('⚔ 2 — id que o Firestore RECUSA colapsa na mesma negativa, sem 503 (INGPAGE-REV)', async () => {
    // O buraco que este caso fecha: `ingressoPorLinkCore` monta o caminho do
    // documento com `eventoId`/`inscritoId` vindos do payload ANTES de poder
    // verificar a assinatura (o binding da RN-420 exige ler o `qrToken`
    // gravado). Um id com número ímpar de segmentos, ou com `//`, fazia
    // `.doc()` LANÇAR de forma síncrona; o endpoint traduzia a exceção em 503
    // com corpo próprio, e a página renderizava "indisponível" em vez de "não
    // encontrado". Quem forja o link escolhia qual das duas telas sai — o
    // oráculo que a RN-419 proíbe.
    const qrToken = (await semear()) as string;

    const idsQueOFirestoreRecusa = ['a/b', 'a//b', '..', '.', '__proto__'];
    const respostas: (unknown | null)[] = [];

    for (const idTorto of idsQueOFirestoreRecusa) {
      // Torto no EVENTO…
      respostas.push(
        await ingressoPorLinkCore(
          adminDb,
          assinarLinkIngresso(
            { inscritoId: INSCRITO_ID, eventoId: idTorto, tenantId: TENANT_ID },
            qrToken,
            RING_K1
          ),
          RING_K1
        )
      );
      // …e torto no INSCRITO.
      respostas.push(
        await ingressoPorLinkCore(
          adminDb,
          assinarLinkIngresso(
            { inscritoId: idTorto, eventoId: EVENTO_ID, tenantId: TENANT_ID },
            qrToken,
            RING_K1
          ),
          RING_K1
        )
      );
    }

    // Nenhuma exceção escapou (seria 503) e todas são a MESMA negativa.
    for (const r of respostas) expect(r).toBeNull();
    expect(new Set(respostas.map((r) => JSON.stringify(r))).size).toBe(1);
  });

  it('⚔ 3 — rotação de kid NÃO mata link já enviado', async () => {
    const qrToken = (await semear()) as string; // token e link assinados com k1
    const link = linkDe(qrToken);
    // k2 entra e vira ativo; k1 continua no ring.
    const p = await ingressoPorLinkCore(adminDb, link, RING_K1_K2);
    expect(p?.estado).toBe('valido');
  });

  it('⚔ 3 — tirar o kid do ring REVOGA o link', async () => {
    const qrToken = (await semear()) as string;
    const link = linkDe(qrToken);
    expect(await ingressoPorLinkCore(adminDb, link, RING_SEM_K1)).toBeNull();
  });

  it('⚔ 5 — re-emitir o ingresso invalida o link antigo (rotação não invalida)', async () => {
    const qrToken = (await semear()) as string;
    const link = linkDe(qrToken);
    expect((await ingressoPorLinkCore(adminDb, link, RING_K1))?.estado).toBe('valido');

    // Re-emissão: o doc passa a ter OUTRO qrToken (o balcão chamaria isso de
    // `qr_divergente`). Aqui o link antigo simplesmente para de abrir.
    const reemitido = assinarQrToken(
      { inscritoId: INSCRITO_ID, eventoId: EVENTO_ID, tenantId: TENANT_ID },
      RING_K1_K2
    );
    await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('inscritos')
      .doc(INSCRITO_ID)
      .update({ qrToken: reemitido });

    expect(await ingressoPorLinkCore(adminDb, link, RING_K1_K2)).toBeNull();
    // …e o link NOVO abre, provando que o que morreu foi o binding, não a chave.
    expect(
      (await ingressoPorLinkCore(adminDb, linkDe(reemitido, RING_K1_K2), RING_K1_K2))
        ?.estado
    ).toBe('valido');
  });

  it('⚔ 4 — um `qrToken` colado na URL não abre a página', async () => {
    const qrToken = (await semear()) as string;
    expect(await ingressoPorLinkCore(adminDb, qrToken, RING_K1)).toBeNull();
  });

  it.each(['cancelado', 'estornado'] as const)(
    '⚔ 6 — inscrito %s: abre, mas SEM QR',
    async (status) => {
      const qrToken = (await semear({ statusInscrito: status })) as string;
      const p = await ingressoPorLinkCore(adminDb, linkDe(qrToken), RING_K1);
      expect(p?.estado).toBe(status);
      expect(p?.qrDataUri).toBeUndefined();
      // O código permanece, só para atendimento (RN-421).
      expect(p?.codigo).toBe('AB2CD3');
    }
  );

  it('credenciado: o QR CONTINUA visível e o carimbo acompanha', async () => {
    const qrToken = (await semear({ comCheckin: true })) as string;
    const p = await ingressoPorLinkCore(adminDb, linkDe(qrToken), RING_K1);
    expect(p?.estado).toBe('credenciado');
    expect(p?.qrDataUri).toMatch(/^data:image\/png;base64,/);
    expect(p?.credenciadoEm).toBe('2026-09-13T06:12:00.000Z');
  });

  it('pendente: abre sem QR', async () => {
    const qrToken = (await semear({ statusInscrito: 'pendente' })) as string;
    const p = await ingressoPorLinkCore(adminDb, linkDe(qrToken), RING_K1);
    expect(p?.estado).toBe('pendente');
    expect(p?.qrDataUri).toBeUndefined();
  });

  it('evento encerrado: abre como histórico, sem QR', async () => {
    const qrToken = (await semear({ statusEvento: 'encerrado' })) as string;
    const p = await ingressoPorLinkCore(adminDb, linkDe(qrToken), RING_K1);
    expect(p?.estado).toBe('encerrado');
    expect(p?.qrDataUri).toBeUndefined();
  });

  it('sem keyring configurado é fail-closed, e colapsa na negativa única', async () => {
    const qrToken = (await semear()) as string;
    expect(await ingressoPorLinkCore(adminDb, linkDe(qrToken), null)).toBeNull();
  });

  it('tenant divergente entre payload e doc recusa (ADR-009)', async () => {
    const qrToken = (await semear()) as string;
    await adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('inscritos')
      .doc(INSCRITO_ID)
      .update({ tenantId: 'outro-tenant' });
    expect(await ingressoPorLinkCore(adminDb, linkDe(qrToken), RING_K1)).toBeNull();
  });

  it('a página não escreve nada: o doc do inscrito sai igual ao que entrou', async () => {
    const qrToken = (await semear()) as string;
    const ref = adminDb
      .collection('eventos')
      .doc(EVENTO_ID)
      .collection('inscritos')
      .doc(INSCRITO_ID);
    const antes = (await ref.get()).data();
    await ingressoPorLinkCore(adminDb, linkDe(qrToken), RING_K1);
    const depois = (await ref.get()).data();
    expect(JSON.stringify(depois)).toBe(JSON.stringify(antes));
  });

  it('⚔ 1 — Rules intocadas: cliente anônimo continua sem ler `inscritos`', async () => {
    await semear();
    const ctx = testEnv.unauthenticatedContext();
    const ref = doc(ctx.firestore(), 'eventos', EVENTO_ID, 'inscritos', INSCRITO_ID);
    await assertFails(getDoc(ref));
  });
});
