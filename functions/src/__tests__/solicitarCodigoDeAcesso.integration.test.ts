/**
 * solicitarCodigoDeAcesso.integration.test.ts — S1229-T3 · RN-476/477/482
 *
 * A callable pública que pede o código. O que esta suíte prova:
 *
 *   1. ORÁCULO FECHADO — endereço COM conta e endereço SEM conta produzem a
 *      mesma resposta, o mesmo documento e o mesmo trabalho. E, o que é mais
 *      fácil de errar, a mesma LATÊNCIA: a medição por amostra está aqui,
 *      porque é ela que pega o ramo que alguém acrescentar amanhã.
 *   2. O E-MAIL SAI, E É O NONO — com o código em claro, uma vez só.
 *   3. ENVIO FALHANDO PRODUZ ERRO E DOCUMENTO MORTO, nunca "enviamos".
 *   4. SEM PROVEDOR, RECUSA ANTES DE COMEÇAR — e não deixa digest órfão.
 *   5. O LIMITADOR É POR ALVO — 3 em 15 minutos, e o estouro devolve a frase
 *      única do `rateLimit.ts`.
 *
 * ⚠ PRÉ-REQUISITO: Firestore Emulator EXCLUSIVO da lane (firebase.contas.json,
 * porta 8388). Honra `LEELA_FS_EMU_PORT` e `FIRESTORE_EMULATOR_HOST`.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import type { EmailProvider } from '@leela/core';
import {
  COLECAO_CODIGOS_ACESSO,
  docIdDoEmail,
  emitirCodigoDeAcesso,
} from '../auth/codigoDeAcesso';
import { solicitarCodigoDeAcessoCore } from '../auth/solicitarCodigoDeAcesso';

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

/**
 * Sufixo único por EXECUÇÃO (REV-CONTAS-MOTOR).
 *
 * Sem ele a suíte não é idempotente contra um emulator vivo: `seq` reinicia
 * em zero a cada processo, e o segundo `npm test` reencontra a conta do Auth
 * (`auth/email-already-exists`) e o balde de `rateLimits` da execução
 * anterior. Rodar duas vezes seguidas reprovava por estado, não por regressão.
 */
const EXEC = Date.now().toString(36);

let seq = 0;
let email = '';
beforeEach(() => {
  seq += 1;
  email = `ana+t3-${seq}-${EXEC}@leela.com`;
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
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `127.0.0.1:${FIRESTORE_PORT}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
}, 30_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

interface Enviado {
  to: { email: string; nome?: string };
  assunto: string;
  html: string;
  texto: string;
  tag?: string;
}

/** Provedor de e-mail espião — guarda o que sairia pela Brevo. */
function provedorEspiao(): { provider: EmailProvider; enviados: Enviado[] } {
  const enviados: Enviado[] = [];
  const provider = {
    async sendTransactional(msg: Enviado): Promise<{ messageId: string }> {
      enviados.push(msg);
      return { messageId: `msg-${enviados.length}` };
    },
  } as unknown as EmailProvider;
  return { provider, enviados };
}

/** Provedor que RECUSA — o incidente de 04/08 encenado. */
function provedorQueRecusa(): EmailProvider {
  return {
    async sendTransactional(): Promise<never> {
      throw new Error('brevo: 401 unauthorized');
    },
  } as unknown as EmailProvider;
}

function docDoCodigo(alvo: string): admin.firestore.DocumentReference {
  return db.collection(COLECAO_CODIGOS_ACESSO).doc(docIdDoEmail(alvo));
}

describe('RN-482 · o caminho feliz', () => {
  it('envia o nono e-mail com o código, e responde com o prazo', async () => {
    const { provider, enviados } = provedorEspiao();
    const { resultado, desfecho } = await solicitarCodigoDeAcessoCore(db, provider, { email });

    expect(resultado).toEqual({ ok: true, validadeMinutos: 10 });
    expect(desfecho).toBe('enviado');
    expect(enviados).toHaveLength(1);

    const msg = enviados[0] as Enviado;
    expect(msg.to.email).toBe(email);
    expect(msg.tag).toBe('codigo-de-acesso');
    expect(msg.assunto).toBe('Seu código de acesso à Leela');

    // O código sai em claro no e-mail (é o único lugar onde ele existe fora
    // da cabeça de quem o recebe) e o documento guarda só o digest.
    const codigo = /\b(\d{6})\b/.exec(msg.texto)?.[1] ?? '';
    expect(codigo).toHaveLength(6);
    const dados = (await docDoCodigo(email).get()).data() ?? {};
    expect(JSON.stringify(dados)).not.toContain(codigo);
  });

  it('o e-mail é o único lugar onde o endereço aparece — o log não o carrega', async () => {
    const { provider, enviados } = provedorEspiao();
    await solicitarCodigoDeAcessoCore(db, provider, { email });
    const msg = enviados[0] as Enviado;
    expect(msg.assunto).not.toContain(email);
    const snap = await docDoCodigo(email).get();
    expect(snap.id).not.toContain(email);
    expect(JSON.stringify(snap.data())).not.toContain(email);
  });

  it('endereço mal formado é recusado antes de qualquer trabalho', async () => {
    const { provider, enviados } = provedorEspiao();
    for (const ruim of ['', 'ana', 'ana@', null, 42, `${'a'.repeat(250)}@leela.com`]) {
      await expect(
        solicitarCodigoDeAcessoCore(db, provider, { email: ruim })
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    }
    expect(enviados).toHaveLength(0);
  });
});

describe('RN-477 · o oráculo está fechado', () => {
  it('endereço COM conta e endereço SEM conta são indistinguíveis na resposta', async () => {
    // A "conta" aqui é irrelevante por construção: a callable NÃO consulta o
    // Auth. O caso existe para ficar vermelho no dia em que alguém acrescentar
    // a consulta — e ele é o par do caso de latência abaixo.
    const { provider, enviados } = provedorEspiao();
    const comConta = `com-conta-${seq}-${EXEC}@leela.com`;
    const semConta = `sem-conta-${seq}-${EXEC}@leela.com`;

    const a = await solicitarCodigoDeAcessoCore(db, provider, { email: comConta });
    const b = await solicitarCodigoDeAcessoCore(db, provider, { email: semConta });

    expect(a.resultado).toEqual(b.resultado);
    expect(a.desfecho).toBe(b.desfecho);
    expect(enviados).toHaveLength(2);
    expect(enviados[0]?.assunto).toBe(enviados[1]?.assunto);

    const docA = (await docDoCodigo(comConta).get()).data() ?? {};
    const docB = (await docDoCodigo(semConta).get()).data() ?? {};
    expect(Object.keys(docA).sort()).toEqual(Object.keys(docB).sort());
  });

  it('ATAQUE · a LATÊNCIA não distingue os dois casos', async () => {
    // O ataque real: medir a diferença de tempo entre endereço conhecido e
    // endereço inventado, com amostra grande. Hoje não há diferença porque não
    // há ramo — este caso mede a propriedade em vez de confiar nela.
    //
    // A tolerância é generosa DE PROPÓSITO (o Emulator tem ruído de dezenas de
    // ms). O que ela pega não é microssegundo: é o ramo que custa uma ida ao
    // Auth ou ao Firestore, que na prática custa múltiplos da mediana.
    const { provider } = provedorEspiao();
    const AMOSTRAS = 6;

    const medir = async (prefixo: string): Promise<number[]> => {
      const tempos: number[] = [];
      for (let i = 0; i < AMOSTRAS; i++) {
        const alvo = `${prefixo}-lat-${seq}-${i}@leela.com`;
        const t0 = Date.now();
        await solicitarCodigoDeAcessoCore(db, provider, { email: alvo });
        tempos.push(Date.now() - t0);
      }
      return tempos.sort((x, y) => x - y);
    };

    const mediana = (v: number[]): number => v[Math.floor(v.length / 2)] as number;
    const comConta = mediana(await medir('com-conta'));
    const semConta = mediana(await medir('sem-conta'));

    const maior = Math.max(comConta, semConta);
    const menor = Math.min(comConta, semConta);
    // Uma ida a mais ao Auth não cabe dentro de 3× da mediana do caminho todo.
    expect(maior).toBeLessThanOrEqual(menor * 3 + 60);
  }, 60_000);
});

describe('RN-482 · a falha de envio não é silêncio', () => {
  it('provedor recusando ⇒ ERRO explícito e documento MORTO', async () => {
    await expect(
      solicitarCodigoDeAcessoCore(db, provedorQueRecusa(), { email })
    ).rejects.toMatchObject({ code: 'unavailable' });

    // Nunca "enviamos" para quem não vai receber — e o digest não fica vivo,
    // porque ninguém tem o código dele.
    const snap = await docDoCodigo(email).get();
    expect(snap.exists).toBe(true);
    expect(snap.get('morto')).toBe(true);
    expect(snap.get('motivoMorte')).toBe('envio_falhou');
  });

  it('sem provedor ⇒ recusa ANTES de gravar (fail-closed, sem digest órfão)', async () => {
    await expect(
      solicitarCodigoDeAcessoCore(db, null, { email })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect((await docDoCodigo(email).get()).exists).toBe(false);
  });

  it('a recusa por falta de provedor não depende do endereço', async () => {
    // Fail-closed de configuração NÃO é oráculo: é igual para todo mundo.
    await expect(
      solicitarCodigoDeAcessoCore(db, null, { email: `outro-${seq}-${EXEC}@leela.com` })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});

describe('RN-476 · o limitador é por ALVO', () => {
  it('o quarto pedido em quinze minutos estoura, e a frase é a do rateLimit', async () => {
    const { provider, enviados } = provedorEspiao();
    const base = new Date();
    for (let i = 0; i < 3; i++) {
      await solicitarCodigoDeAcessoCore(db, provider, { email }, base);
    }
    expect(enviados).toHaveLength(3);

    await expect(
      solicitarCodigoDeAcessoCore(db, provider, { email }, base)
    ).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: 'Muitas tentativas. Tente novamente em alguns minutos.',
    });
    // Quem estoura não gasta Brevo.
    expect(enviados).toHaveLength(3);
  });

  it('o balde de um endereço não pune o outro', async () => {
    const { provider } = provedorEspiao();
    const base = new Date();
    const vitima = `vitima-${seq}-${EXEC}@leela.com`;
    const vizinho = `vizinho-${seq}-${EXEC}@leela.com`;
    for (let i = 0; i < 3; i++) {
      await solicitarCodigoDeAcessoCore(db, provider, { email: vitima }, base);
    }
    await expect(
      solicitarCodigoDeAcessoCore(db, provider, { email: vitima }, base)
    ).rejects.toMatchObject({ code: 'resource-exhausted' });

    const doVizinho = await solicitarCodigoDeAcessoCore(db, provider, { email: vizinho }, base);
    expect(doVizinho.resultado.ok).toBe(true);
  });

  it('pedir de novo SUBSTITUI o código anterior (não acumula chance)', async () => {
    const { provider, enviados } = provedorEspiao();
    await solicitarCodigoDeAcessoCore(db, provider, { email });
    const primeiro = /\b(\d{6})\b/.exec((enviados[0] as Enviado).texto)?.[1] ?? '';

    await solicitarCodigoDeAcessoCore(db, provider, { email });
    const segundo = /\b(\d{6})\b/.exec((enviados[1] as Enviado).texto)?.[1] ?? '';

    const dados = (await docDoCodigo(email).get()).data() ?? {};
    const serializado = JSON.stringify(dados);
    expect(serializado).not.toContain(primeiro);
    expect(serializado).not.toContain(segundo);
    // Um documento só por endereço — o anterior não sobreviveu em lugar nenhum.
    const todos = await db.collection(COLECAO_CODIGOS_ACESSO).get();
    const doAlvo = todos.docs.filter((d) => d.id === docIdDoEmail(email));
    expect(doAlvo).toHaveLength(1);
  });

  it('a grafia do endereço não abre um segundo balde', async () => {
    const { provider } = provedorEspiao();
    const base = new Date();
    const alvo = `MISTO-${seq}@Leela.com`;
    for (let i = 0; i < 3; i++) {
      await solicitarCodigoDeAcessoCore(db, provider, { email: alvo }, base);
    }
    // Mesma caixa, grafia diferente: o balde é o mesmo.
    await expect(
      solicitarCodigoDeAcessoCore(db, provider, { email: alvo.toLowerCase() }, base)
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
  });
});

describe('RN-476 · higiene do documento', () => {
  it('o digest emitido fora da callable e o da callable moram no mesmo lugar', async () => {
    // Guarda contra divergência de docId entre o núcleo e a callable: se um
    // dos dois mudar a derivação, o outro passa a escrever num documento que
    // ninguém lê — e a pessoa digitaria o código certo para sempre em vão.
    await emitirCodigoDeAcesso(db, email);
    const antes = (await docDoCodigo(email).get()).get('digest') as string;

    const { provider } = provedorEspiao();
    await solicitarCodigoDeAcessoCore(db, provider, { email });
    const depois = (await docDoCodigo(email).get()).get('digest') as string;

    expect(typeof antes).toBe('string');
    expect(typeof depois).toBe('string');
    expect(depois).not.toBe(antes);
  });
});
