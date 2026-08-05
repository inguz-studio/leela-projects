/**
 * codigoAcesso.integration.test.ts — S1229-T1 · RN-476
 *
 * Integração REAL no Firestore Emulator. O que só aqui pode ser provado:
 *
 *   1. TETO SOB CONCORRÊNCIA — o alvo número um da review desta tarefa.
 *      Cinco tentativas erradas DISPARADAS EM PARALELO não podem virar seis,
 *      sete ou dez. Um contador incrementado fora da transação passa em teste
 *      sequencial e falha aqui.
 *   2. USO ÚNICO — duas requisições com o MESMO código correto produzem um
 *      sucesso e uma negativa, e isso também sob paralelismo.
 *   3. INVALIDAÇÃO — emitir um código novo mata o anterior (pedir SUBSTITUI a
 *      chance do atacante, nunca a acumula).
 *   4. PRAZO — código vencido é negado, e a negativa é a mesma das outras.
 *   5. A COLEÇÃO É FECHADA — `codigosDeAcesso` nasce sem `match` no
 *      `firestore.rules` real: nenhum client SDK lê digest de credencial.
 *
 * ⚠ PRÉ-REQUISITO: Firestore Emulator EXCLUSIVO da lane, via
 * `firebase emulators:exec --config firebase.contas.json`. Honra
 * `LEELA_FS_EMU_PORT` e `FIRESTORE_EMULATOR_HOST`.
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
import { Timestamp } from 'firebase-admin/firestore';
import { CODIGO_ACESSO_MAX_TENTATIVAS, CODIGO_ACESSO_TTL_MS } from '@leela/core';
import {
  COLECAO_CODIGOS_ACESSO,
  consumirCodigoDeAcesso,
  consumirProvaDeAcesso,
  digestCodigo,
  docIdDoEmail,
  emitirCodigoDeAcesso,
  matarCodigoDeAcesso,
} from '../auth/codigoDeAcesso';

const PROJECT_ID = 'demo-leela-contas';
const FIRESTORE_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8388
);
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

process.env['CODIGO_ACESSO_PEPPER'] = 'pepper-teste-contas-rn476';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

/** Endereço novo por caso: um código vivo por endereço é a regra sob teste. */
let seq = 0;
let email = '';
beforeEach(() => {
  seq += 1;
  email = `ana+rn476-${seq}@leela.com`;
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: FIRESTORE_PORT,
    },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `127.0.0.1:${FIRESTORE_PORT}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
}, 30_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

function docDoCodigo(alvo: string): admin.firestore.DocumentReference {
  return db.collection(COLECAO_CODIGOS_ACESSO).doc(docIdDoEmail(alvo));
}

/** Um código errado que NUNCA colide com o emitido. */
function outroCodigo(certo: string): string {
  const n = (Number.parseInt(certo, 10) + 1) % 1_000_000;
  return String(n).padStart(6, '0');
}

describe('RN-476 · emissão e guarda', () => {
  it('grava o DIGEST e nunca o código em claro', async () => {
    const { codigo } = await emitirCodigoDeAcesso(db, email);
    const snap = await docDoCodigo(email).get();
    const dados = snap.data() ?? {};

    expect(snap.exists).toBe(true);
    expect(dados['digest']).toBe(digestCodigo(email, codigo));
    // Nem o código, nem o e-mail, em nenhum campo do documento (RN-172).
    const serializado = JSON.stringify(dados);
    expect(serializado).not.toContain(codigo);
    expect(serializado).not.toContain(email);
    expect(snap.id).not.toContain(email);
    expect(dados['tentativas']).toBe(0);
    expect(dados['consumidoEm']).toBeNull();
    expect(dados['morto']).toBe(false);
  });

  it('emitir de novo MATA o anterior (um código vivo por endereço)', async () => {
    const primeiro = await emitirCodigoDeAcesso(db, email);
    const segundo = await emitirCodigoDeAcesso(db, email);
    expect(segundo.codigo).not.toBe(primeiro.codigo); // 1 em 10⁶ de flake aceito

    const velho = await consumirCodigoDeAcesso(db, email, primeiro.codigo);
    expect(velho.ok).toBe(false);

    const novo = await consumirCodigoDeAcesso(db, email, segundo.codigo);
    expect(novo.ok).toBe(true);
  });

  it('emitir de novo ZERA o contador de tentativas do documento', async () => {
    // Sem isto, a substituição herdaria as tentativas gastas e o código novo
    // já nasceria a um passo da morte — o oposto do que "pedir substitui a
    // chance" significa.
    const primeiro = await emitirCodigoDeAcesso(db, email);
    await consumirCodigoDeAcesso(db, email, outroCodigo(primeiro.codigo));
    await consumirCodigoDeAcesso(db, email, outroCodigo(primeiro.codigo));

    const segundo = await emitirCodigoDeAcesso(db, email);
    const snap = await docDoCodigo(email).get();
    expect(snap.get('tentativas')).toBe(0);
    expect(snap.get('morto')).toBe(false);

    const errou = await consumirCodigoDeAcesso(db, email, outroCodigo(segundo.codigo));
    expect(errou.restantes).toBe(CODIGO_ACESSO_MAX_TENTATIVAS - 1);
  });

  it('o prazo é de dez minutos e vencido é NEGADO', async () => {
    const { codigo, expiraEm } = await emitirCodigoDeAcesso(db, email, new Date(0));
    expect(expiraEm.getTime()).toBe(CODIGO_ACESSO_TTL_MS);

    const vencido = await consumirCodigoDeAcesso(
      db,
      email,
      codigo,
      new Date(CODIGO_ACESSO_TTL_MS + 1)
    );
    expect(vencido).toMatchObject({ ok: false, motivo: 'vencido', restantes: 0 });

    // Um segundo ANTES do vencimento ainda vale — a fronteira é medida.
    await emitirCodigoDeAcesso(db, email, new Date(0));
    const snap2 = await docDoCodigo(email).get();
    expect(snap2.get('tentativas')).toBe(0);
  });

  it('envio falhando MATA o documento (RN-482)', async () => {
    const { codigo } = await emitirCodigoDeAcesso(db, email);
    await matarCodigoDeAcesso(db, email, 'envio_falhou');

    const snap = await docDoCodigo(email).get();
    expect(snap.get('morto')).toBe(true);
    expect(snap.get('motivoMorte')).toBe('envio_falhou');

    const negado = await consumirCodigoDeAcesso(db, email, codigo);
    expect(negado).toMatchObject({ ok: false, motivo: 'morto', restantes: 0 });
  });
});

describe('RN-476 · o teto de cinco tentativas', () => {
  it('cinco erros SEQUENCIAIS matam o código, e o correto não entra depois', async () => {
    const { codigo } = await emitirCodigoDeAcesso(db, email);
    const errado = outroCodigo(codigo);

    const restantes: number[] = [];
    for (let i = 0; i < CODIGO_ACESSO_MAX_TENTATIVAS; i++) {
      const r = await consumirCodigoDeAcesso(db, email, errado);
      expect(r.ok).toBe(false);
      restantes.push(r.restantes);
    }
    expect(restantes).toEqual([4, 3, 2, 1, 0]);

    // O código MORREU INTEIRO — não só aquela requisição.
    const comOcerto = await consumirCodigoDeAcesso(db, email, codigo);
    expect(comOcerto).toMatchObject({ ok: false, restantes: 0 });
    expect((await docDoCodigo(email).get()).get('morto')).toBe(true);
  });

  it('ATAQUE · doze tentativas em PARALELO não passam do teto', async () => {
    // O DEFEITO QUE ESTE CASO EXISTE PARA PEGAR: contador incrementado fora da
    // transação. Doze requisições simultâneas leriam o mesmo valor, cada uma
    // acharia que gastou a primeira tentativa, e o teto viraria decoração —
    // com 10⁶ combinações e paralelismo, é a diferença entre "cinco chances" e
    // "quantas o atacante quiser abrir conexões".
    const { codigo } = await emitirCodigoDeAcesso(db, email);
    const errado = outroCodigo(codigo);

    const resultados = await Promise.all(
      Array.from({ length: 12 }, () => consumirCodigoDeAcesso(db, email, errado))
    );
    expect(resultados.every((r) => !r.ok)).toBe(true);

    const gastas = (await docDoCodigo(email).get()).get('tentativas') as number;
    expect(gastas).toBeLessThanOrEqual(CODIGO_ACESSO_MAX_TENTATIVAS);
    expect((await docDoCodigo(email).get()).get('morto')).toBe(true);

    // E o código certo, depois da rajada, está morto.
    const depois = await consumirCodigoDeAcesso(db, email, codigo);
    expect(depois.ok).toBe(false);
  });
});

describe('RN-476 · uso único', () => {
  it('o mesmo código correto duas vezes: um sucesso e uma negativa', async () => {
    const { codigo } = await emitirCodigoDeAcesso(db, email);

    const primeira = await consumirCodigoDeAcesso(db, email, codigo);
    expect(primeira.ok).toBe(true);

    const segunda = await consumirCodigoDeAcesso(db, email, codigo);
    expect(segunda).toMatchObject({ ok: false, motivo: 'ja_usado', restantes: 0 });
  });

  it('ATAQUE · duas requisições SIMULTÂNEAS com o código certo: um sucesso só', async () => {
    const { codigo } = await emitirCodigoDeAcesso(db, email);
    const dois = await Promise.all([
      consumirCodigoDeAcesso(db, email, codigo),
      consumirCodigoDeAcesso(db, email, codigo),
    ]);
    expect(dois.filter((r) => r.ok)).toHaveLength(1);
  });

  it('o documento NÃO é apagado no consumo (o servidor precisa distinguir)', async () => {
    const { codigo } = await emitirCodigoDeAcesso(db, email);
    await consumirCodigoDeAcesso(db, email, codigo);
    const snap = await docDoCodigo(email).get();
    expect(snap.exists).toBe(true);
    expect(snap.get('consumidoEm')).not.toBeNull();
  });
});

describe('RN-476 · as cinco causas devolvem a mesma negativa', () => {
  it('inexistente, morto, já usado, vencido e esgotado são indistinguíveis', async () => {
    // O que a tela recebe: `ok: false` e `restantes: 0`. O `motivo` existe
    // para log e para este teste, e nunca sai daqui.
    const inexistente = await consumirCodigoDeAcesso(db, `nunca-pediu-${seq}@leela.com`, '123456');

    const emailMorto = `morto-${seq}@leela.com`;
    const { codigo: cMorto } = await emitirCodigoDeAcesso(db, emailMorto);
    await matarCodigoDeAcesso(db, emailMorto, 'envio_falhou');
    const morto = await consumirCodigoDeAcesso(db, emailMorto, cMorto);

    const emailUsado = `usado-${seq}@leela.com`;
    const { codigo: cUsado } = await emitirCodigoDeAcesso(db, emailUsado);
    await consumirCodigoDeAcesso(db, emailUsado, cUsado);
    const jaUsado = await consumirCodigoDeAcesso(db, emailUsado, cUsado);

    const emailVencido = `vencido-${seq}@leela.com`;
    const { codigo: cVencido } = await emitirCodigoDeAcesso(db, emailVencido, new Date(0));
    const vencido = await consumirCodigoDeAcesso(
      db,
      emailVencido,
      cVencido,
      new Date(CODIGO_ACESSO_TTL_MS + 1)
    );

    const emailEsgotado = `esgotado-${seq}@leela.com`;
    const { codigo: cEsgotado } = await emitirCodigoDeAcesso(db, emailEsgotado);
    for (let i = 0; i < CODIGO_ACESSO_MAX_TENTATIVAS; i++) {
      await consumirCodigoDeAcesso(db, emailEsgotado, outroCodigo(cEsgotado));
    }
    const esgotado = await consumirCodigoDeAcesso(db, emailEsgotado, cEsgotado);

    for (const r of [inexistente, morto, jaUsado, vencido, esgotado]) {
      expect(r.ok).toBe(false);
      expect(r.restantes).toBe(0);
    }
  });

  it('ORÁCULO · endereço COM conta e endereço SEM conta produzem a mesma coisa', async () => {
    // A propriedade da RN-477 medida no núcleo: nada aqui consulta "existe
    // conta?". Os dois endereços percorrem o mesmo caminho, gravam o mesmo
    // formato de documento e devolvem a mesma negativa para um código errado.
    const comConta = `tem-conta-${seq}@leela.com`;
    const semConta = `nao-tem-${seq}@leela.com`;

    const a = await emitirCodigoDeAcesso(db, comConta);
    const b = await emitirCodigoDeAcesso(db, semConta);
    expect(a.codigo).toHaveLength(6);
    expect(b.codigo).toHaveLength(6);

    const docA = (await docDoCodigo(comConta).get()).data() ?? {};
    const docB = (await docDoCodigo(semConta).get()).data() ?? {};
    expect(Object.keys(docA).sort()).toEqual(Object.keys(docB).sort());

    const negA = await consumirCodigoDeAcesso(db, comConta, outroCodigo(a.codigo));
    const negB = await consumirCodigoDeAcesso(db, semConta, outroCodigo(b.codigo));
    expect(negA.ok).toBe(negB.ok);
    expect(negA.restantes).toBe(negB.restantes);
  });
});

describe('RN-476 · a prova de continuação', () => {
  it('nasce com o código aceito, serve UMA vez e vence com o mesmo prazo', async () => {
    const { codigo } = await emitirCodigoDeAcesso(db, email);
    const aceito = await consumirCodigoDeAcesso(db, email, codigo);
    expect(aceito.ok).toBe(true);
    const prova = aceito.ok ? aceito.prova : '';
    expect(prova).toHaveLength(64); // 32 bytes da entropia do sistema, em hex

    expect(await consumirProvaDeAcesso(db, email, prova)).toBe(true);
    expect(await consumirProvaDeAcesso(db, email, prova)).toBe(false);
  });

  it('prova inventada, vazia ou de OUTRO endereço não vale', async () => {
    const { codigo } = await emitirCodigoDeAcesso(db, email);
    const aceito = await consumirCodigoDeAcesso(db, email, codigo);
    const prova = aceito.ok ? aceito.prova : '';

    expect(await consumirProvaDeAcesso(db, email, '')).toBe(false);
    expect(await consumirProvaDeAcesso(db, email, 'a'.repeat(64))).toBe(false);
    expect(await consumirProvaDeAcesso(db, `outro-${seq}@leela.com`, prova)).toBe(false);
    // A prova legítima continua intacta depois das três negativas.
    expect(await consumirProvaDeAcesso(db, email, prova)).toBe(true);
  });

  it('prova vencida é negada', async () => {
    const { codigo } = await emitirCodigoDeAcesso(db, email, new Date(0));
    const aceito = await consumirCodigoDeAcesso(db, email, codigo, new Date(1));
    const prova = aceito.ok ? aceito.prova : '';
    expect(
      await consumirProvaDeAcesso(db, email, prova, new Date(CODIGO_ACESSO_TTL_MS + 10))
    ).toBe(false);
  });

  it('ATAQUE · duas requisições SIMULTÂNEAS com a mesma prova: um sucesso só', async () => {
    const { codigo } = await emitirCodigoDeAcesso(db, email);
    const aceito = await consumirCodigoDeAcesso(db, email, codigo);
    const prova = aceito.ok ? aceito.prova : '';
    const dois = await Promise.all([
      consumirProvaDeAcesso(db, email, prova),
      consumirProvaDeAcesso(db, email, prova),
    ]);
    expect(dois.filter(Boolean)).toHaveLength(1);
  });
});

describe('RN-476 · a coleção é fechada ao cliente', () => {
  it('nenhum client SDK lê nem escreve `codigosDeAcesso`', async () => {
    // Deny-by-default do arquivo REAL: a coleção nasce sem `match`, no mesmo
    // tratamento de `rateLimits`. Digest de credencial não tem leitor cliente.
    await emitirCodigoDeAcesso(db, email);
    const id = docIdDoEmail(email);

    const anon = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(anon, COLECAO_CODIGOS_ACESSO, id)));
    await assertFails(setDoc(doc(anon, COLECAO_CODIGOS_ACESSO, id), { digest: 'x' }));

    const logado = testEnv
      .authenticatedContext('uid-qualquer', { role: 'athlete' })
      .firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(logado, COLECAO_CODIGOS_ACESSO, id)));
    await assertFails(setDoc(doc(logado, COLECAO_CODIGOS_ACESSO, id), { digest: 'x' }));

    const admin_ = testEnv
      .authenticatedContext('uid-plat', { role: 'platform_admin' })
      .firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(admin_, COLECAO_CODIGOS_ACESSO, id)));
  });

  it('o documento carrega prazo próprio para a higiene de TTL', async () => {
    await emitirCodigoDeAcesso(db, email);
    const snap = await docDoCodigo(email).get();
    expect(snap.get('expiraEm')).toBeInstanceOf(Timestamp);
  });
});
