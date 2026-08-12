/**
 * adminVisaoOnda5Documento.integration.test.ts — ADMIN-VISAO onda 5 · S1615-T3
 * · RN-540 · vetável V-4
 *
 * O callable `consultarDocumentoDaConta` contra o Firestore Emulator (Admin
 * SDK real, auditoria real). O caso que o gate da onda cobra primeiro:
 *
 *   quem NÃO é `platform_admin` recebe `permission-denied` **e a negativa é
 *   REGISTRADA** em `auditoriaAcessos`.
 *
 * E o resto do contrato da leitura auditada de PII:
 *   - o administrador lê, e o ACESSO também é registrado (as duas metades do
 *     rastro da RN-540);
 *   - autoriza pela CAPACIDADE também, não só pelo papel legado (RN-401 — esta
 *     Function nasce do lado certo da dívida da claim);
 *   - conta sem registro de identidade devolve `motivoAusencia` nomeado em vez
 *     de erro: a ausência é resposta, não falha;
 *   - o registro de auditoria NUNCA carrega o número (ADR-014 §5);
 *   - não autenticado NÃO registra (sem uid não há a quem atribuir);
 *   - `contaUid` ausente é `invalid-argument` e não vira acesso concedido;
 *   - a resposta é de UMA conta: duas identidades ligadas à mesma conta
 *     devolvem UM número e a bandeira de ambiguidade — nunca as duas.
 *
 * Pré-requisito: Firestore Emulator. Rodar com
 * `firebase emulators:exec --only firestore,auth "<comando>"` na raiz.
 * Porta: honra LEELA_FS_EMU_PORT (default 8080).
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
import { COLECAO_PESSOAS } from '@leela/core';
import {
  consultarDocumentoDaConta,
  consultarDocumentoDaContaCore,
  TIPO_ACESSO_DOCUMENTO_CONTA,
} from '../platform/consultarDocumentoDaConta';
import { AUDITORIA_ACESSOS_COL } from '../shared/auditoriaAcessos';

const PROJECT_ID = 'demo-leela-admin-visao-onda5-doc';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const ADMIN_LEGADO_UID = 'uid-platform-admin-legado';
const ADMIN_CAPACIDADE_UID = 'uid-platform-admin-capacidade';
const OWNER_UID = 'uid-tenant-owner-curioso';
const CONTA_ALVO_UID = 'uid-conta-alvo';
const CONTA_SEM_CPF_UID = 'uid-conta-sem-cpf';

/** CPF de teste (DV válido, dado sintético — nunca de pessoa real). */
const CPF_ALVO = '11144477735';
const CPF_SEGUNDO = '52998224725';

type AnyRec = Record<string, unknown>;

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: Number(
        process.env['LEELA_FS_EMU_PORT'] ??
          process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
          8080
      ),
    },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      process.env['FIRESTORE_EMULATOR_HOST'] ??
      `localhost:${process.env['LEELA_FS_EMU_PORT'] ?? '8080'}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function semearPessoa(cpf: string, contaUid: string | null): Promise<void> {
  await adminDb
    .collection(COLECAO_PESSOAS)
    .doc(`cpf_${cpf}`)
    .set({
      cpf,
      contaUid,
      contaEmail: contaUid ? 'alvo@exemplo.com' : null,
      dadosConhecidos: {
        nome: 'Pessoa Alvo',
        genero: 'nao_informado',
        nascimento: '',
        telefone: '48999990000',
      },
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
}

async function auditorias(): Promise<AnyRec[]> {
  const snap = await adminDb
    .collection(AUDITORIA_ACESSOS_COL)
    .where('tipo', '==', TIPO_ACESSO_DOCUMENTO_CONTA)
    .get();
  return snap.docs.map((d) => d.data());
}

const chamarCore = (data: unknown, uid: string, claims: AnyRec) =>
  consultarDocumentoDaContaCore(adminDb, data, {
    uid,
    claims: claims as never,
  });

function runCallable(data: AnyRec, ctx: AnyRec): Promise<unknown> {
  return (
    consultarDocumentoDaConta as unknown as {
      run: (d: AnyRec, c: AnyRec) => Promise<unknown>;
    }
  ).run(data, ctx);
}

// ---------------------------------------------------------------------------
// Autorização — o caso do gate
// ---------------------------------------------------------------------------

describe('consultarDocumentoDaConta — autorização (RN-540/RN-401)', () => {
  beforeEach(async () => {
    await semearPessoa(CPF_ALVO, CONTA_ALVO_UID);
  });

  it('quem NÃO é platform_admin recebe permission-denied E a negativa é REGISTRADA', async () => {
    await expect(
      chamarCore({ contaUid: CONTA_ALVO_UID }, OWNER_UID, {
        role: 'tenant_owner',
        tenantId: 'castelo-producoes',
      })
    ).rejects.toMatchObject({ code: 'permission-denied' });

    const trilha = await auditorias();
    expect(trilha).toHaveLength(1);
    expect(trilha[0]).toMatchObject({
      tipo: TIPO_ACESSO_DOCUMENTO_CONTA,
      uid: OWNER_UID,
      papel: 'tenant_owner',
      contaUid: CONTA_ALVO_UID,
      resultado: 'negado_papel',
    });
  });

  it('a negativa NÃO vaza o número — o registro tem ids, papel e desfecho, e só', async () => {
    await expect(
      chamarCore({ contaUid: CONTA_ALVO_UID }, OWNER_UID, { role: 'athlete' })
    ).rejects.toMatchObject({ code: 'permission-denied' });

    const trilha = await auditorias();
    expect(JSON.stringify(trilha)).not.toContain(CPF_ALVO);
  });

  it('platform_admin LEGADO (role) lê, e o ACESSO é registrado', async () => {
    const r = await chamarCore({ contaUid: CONTA_ALVO_UID }, ADMIN_LEGADO_UID, {
      role: 'platform_admin',
    });

    expect(r.documento).toEqual({ tipo: 'cpf', numero: CPF_ALVO });
    expect(r.motivoAusencia).toBeNull();
    expect(r.avisoAuditoria).toContain('registrada');

    const trilha = await auditorias();
    expect(trilha).toHaveLength(1);
    expect(trilha[0]).toMatchObject({
      uid: ADMIN_LEGADO_UID,
      contaUid: CONTA_ALVO_UID,
      resultado: 'concedido',
    });
  });

  it('platform_admin por CAPACIDADE (sem o papel legado) TAMBÉM lê — RN-401, as duas pernas', async () => {
    const r = await chamarCore({ contaUid: CONTA_ALVO_UID }, ADMIN_CAPACIDADE_UID, {
      role: 'athlete',
      platformAdmin: true,
    });

    expect(r.documento?.numero).toBe(CPF_ALVO);
  });

  it('o registro de ACESSO CONCEDIDO também não carrega o número (ADR-014 §5)', async () => {
    await chamarCore({ contaUid: CONTA_ALVO_UID }, ADMIN_LEGADO_UID, {
      role: 'platform_admin',
    });

    expect(JSON.stringify(await auditorias())).not.toContain(CPF_ALVO);
  });
});

// ---------------------------------------------------------------------------
// Ausência é resposta, não falha
// ---------------------------------------------------------------------------

describe('consultarDocumentoDaConta — ausência nomeada (V-4)', () => {
  it('conta sem registro de identidade devolve motivo nomeado, não erro', async () => {
    const r = await chamarCore({ contaUid: CONTA_SEM_CPF_UID }, ADMIN_LEGADO_UID, {
      role: 'platform_admin',
    });

    expect(r.documento).toBeNull();
    expect(r.motivoAusencia).toBe('sem_registro_de_identificacao');
    expect(r.haMaisDeUmRegistro).toBe(false);

    const trilha = await auditorias();
    expect(trilha[0]).toMatchObject({ resultado: 'concedido_sem_registro' });
  });

  it('registro com `cpf` inutilizável é nomeado à parte — dado corrompido não vira "nunca comprou"', async () => {
    await adminDb.collection(COLECAO_PESSOAS).doc('cpf_quebrado').set({
      cpf: '',
      contaUid: CONTA_ALVO_UID,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    const r = await chamarCore({ contaUid: CONTA_ALVO_UID }, ADMIN_LEGADO_UID, {
      role: 'platform_admin',
    });

    expect(r.documento).toBeNull();
    expect(r.motivoAusencia).toBe('registro_sem_documento');
  });
});

// ---------------------------------------------------------------------------
// Uma conta por chamada, sem lote (RN-540)
// ---------------------------------------------------------------------------

describe('consultarDocumentoDaConta — uma conta por chamada, sem lote', () => {
  it('duas identidades na mesma conta devolvem UM número e a bandeira de ambiguidade', async () => {
    await semearPessoa(CPF_ALVO, CONTA_ALVO_UID);
    await semearPessoa(CPF_SEGUNDO, CONTA_ALVO_UID);

    const r = await chamarCore({ contaUid: CONTA_ALVO_UID }, ADMIN_LEGADO_UID, {
      role: 'platform_admin',
    });

    expect(r.haMaisDeUmRegistro).toBe(true);
    expect([CPF_ALVO, CPF_SEGUNDO]).toContain(r.documento?.numero);
    // O segundo número NUNCA sai: devolver os dois seria o lote que a RN-540
    // proíbe, e a bandeira já diz o que o operador precisa saber.
    const serializado = JSON.stringify(r);
    const quantos = [CPF_ALVO, CPF_SEGUNDO].filter((c) =>
      serializado.includes(c)
    ).length;
    expect(quantos).toBe(1);
  });

  it('a conta de OUTRA pessoa não vaza pelo vínculo: só o `contaUid` pedido é consultado', async () => {
    await semearPessoa(CPF_ALVO, CONTA_ALVO_UID);
    await semearPessoa(CPF_SEGUNDO, 'uid-terceiro');

    const r = await chamarCore({ contaUid: CONTA_ALVO_UID }, ADMIN_LEGADO_UID, {
      role: 'platform_admin',
    });

    expect(r.documento?.numero).toBe(CPF_ALVO);
    expect(JSON.stringify(r)).not.toContain(CPF_SEGUNDO);
  });

  it('registro sem vínculo de conta (contaUid null) não é alcançado por consulta alguma', async () => {
    await semearPessoa(CPF_ALVO, null);

    const r = await chamarCore({ contaUid: CONTA_ALVO_UID }, ADMIN_LEGADO_UID, {
      role: 'platform_admin',
    });

    expect(r.documento).toBeNull();
    expect(r.motivoAusencia).toBe('sem_registro_de_identificacao');
  });
});

// ---------------------------------------------------------------------------
// Bordas do wrapper
// ---------------------------------------------------------------------------

describe('consultarDocumentoDaConta — bordas', () => {
  it('não autenticado → unauthenticated, SEM registro (sem uid não há a quem atribuir)', async () => {
    await expect(runCallable({ contaUid: CONTA_ALVO_UID }, {})).rejects.toMatchObject({
      code: 'unauthenticated',
    });
    expect(await auditorias()).toHaveLength(0);
  });

  it('"contaUid" ausente → invalid-argument, e NADA é registrado como acesso concedido', async () => {
    await expect(
      chamarCore({}, ADMIN_LEGADO_UID, { role: 'platform_admin' })
    ).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(await auditorias()).toHaveLength(0);
  });

  it('input malformado de NÃO-admin é barrado pelo papel primeiro, e a negativa é registrada', async () => {
    // A ordem importa: validar antes de autorizar deixaria um não-admin sondar
    // a borda de input sem deixar rastro.
    await expect(
      chamarCore({}, OWNER_UID, { role: 'tenant_owner' })
    ).rejects.toMatchObject({ code: 'permission-denied' });

    const trilha = await auditorias();
    expect(trilha).toHaveLength(1);
    expect(trilha[0]).toMatchObject({ resultado: 'negado_papel', contaUid: 'ausente' });
  });
});
