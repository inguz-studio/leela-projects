/**
 * confirmarCodigoDeAcesso.integration.test.ts — S1229-T4 · S1230-T1
 * RN-476 · RN-477 · RN-478 · RN-479 · RN-480 · RN-453 · RN-446
 *
 * O que só o Emulator (Firestore + Auth) prova:
 *
 *   1. AS CINCO CAUSAS SÃO A MESMA NEGATIVA — errado, vencido, já usado,
 *      inexistente e esgotado saem com o mesmo código de erro e a mesma frase.
 *      É fácil um deles escapar com código próprio, e aí a tela vira oráculo.
 *   2. SENHA PRIMEIRO, SESSÃO DEPOIS (RN-453) — e `emailVerified` falso ANTES
 *      e verdadeiro DEPOIS, que é o carimbo que destrava o POSSE-EMAIL-1.
 *   3. CONSUMO DUPLO — um sucesso e uma negativa.
 *   4. A CONTA NASCE INTEIRA OU NÃO NASCE (RN-478) — com a gravação falhando,
 *      NÃO sobra conta no Auth. É o caminho que produziu a conta órfã do
 *      organizador, e aqui ele está provado, não descrito.
 *   5. O CONSENTIMENTO É DO SERVIDOR (RN-446/RN-479) — aceite datado pelo
 *      cliente é recusado, e a versão do termo é a do core, não uma cópia.
 *   6. A FRONTEIRA (RN-480) — a conta nasce `athlete` e nada além: nenhum
 *      `profissionais/{uid}`, nenhuma claim de tenant, nenhum `platform_admin`.
 *
 * ⚠ PRÉ-REQUISITO: Firestore E AUTH Emulators EXCLUSIVOS da lane
 * (firebase.contas.json — firestore 8388, auth 9388).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import {
  CODIGO_ACESSO_MAX_TENTATIVAS,
  CODIGO_ACESSO_TTL_MS,
  MENSAGEM_CODIGO_NEGADO,
  SENHA_CONTA_MIN,
  TERMO_CONTA_FINALIDADE,
  TERMO_CONTA_VERSAO,
} from '@leela/core';
import { emitirCodigoDeAcesso, matarCodigoDeAcesso } from '../auth/codigoDeAcesso';
import {
  concluirAcessoComProvaCore,
  confirmarCodigoDeAcessoCore,
} from '../auth/confirmarCodigoDeAcesso';

const PROJECT_ID = 'demo-leela-contas';
const FIRESTORE_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8388
);
const AUTH_PORT = Number(
  process.env['LEELA_AUTH_EMU_PORT'] ??
    process.env['FIREBASE_AUTH_EMULATOR_HOST']?.split(':').pop() ??
    9388
);
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

process.env['CODIGO_ACESSO_PEPPER'] = 'pepper-teste-contas-rn476';
process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= `127.0.0.1:${AUTH_PORT}`;

const SENHA_NOVA = 'senha-nova-123';
const SENHA_ANTIGA = 'senha-antiga-123';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

let seq = 0;
let email = '';
beforeEach(() => {
  seq += 1;
  email = `ana+t4-${seq}-${Date.now()}@leela.com`;
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
  auth = admin.auth();
}, 120_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

/**
 * Captura o erro da negativa COM TIPO.
 *
 * `promise.catch(e => e as X)` produz uma união com o resultado feliz e não
 * type-checa; um `as any` esconderia justamente o campo que estes casos
 * existem para conferir.
 */
interface ErroNegativa {
  code?: string;
  message?: string;
  details?: { tentativasRestantes?: number };
}

async function erroDe(fn: () => Promise<unknown>): Promise<ErroNegativa> {
  try {
    await fn();
  } catch (err) {
    return err as ErroNegativa;
  }
  throw new Error('esperava negativa, veio sucesso');
}

/** Emite um código e devolve o valor em claro. */
async function codigoVivo(alvo: string, agora = new Date()): Promise<string> {
  const { codigo } = await emitirCodigoDeAcesso(db, alvo, agora);
  return codigo;
}

/** Uma conta SEM senha, como o `contaSemFriccao` a cria na compra (RN-155). */
async function contaDaCompra(alvo: string): Promise<admin.auth.UserRecord> {
  return auth.createUser({ email: alvo, emailVerified: false, displayName: 'Ana Compradora' });
}

function outroCodigo(certo: string): string {
  return String((Number.parseInt(certo, 10) + 1) % 1_000_000).padStart(6, '0');
}

/**
 * O mesmo Firestore, com a gravação de `atletas` QUEBRADA. É o único jeito de
 * exercer o desfazer da RN-478 sem derrubar o Emulator inteiro.
 */
function dbComAtletasQuebrado(): admin.firestore.Firestore {
  const real = db as unknown as Record<string, unknown>;
  return new Proxy(real, {
    get(alvo, prop) {
      if (prop === 'collection') {
        return (nome: string): unknown => {
          if (nome === 'atletas') {
            return {
              doc: () => ({
                set: () => Promise.reject(new Error('firestore indisponível (teste)')),
              }),
            };
          }
          return (db as admin.firestore.Firestore).collection(nome);
        };
      }
      const valor = Reflect.get(alvo, prop, alvo);
      return typeof valor === 'function' ? (valor as () => unknown).bind(alvo) : valor;
    },
  }) as unknown as admin.firestore.Firestore;
}

// ---------------------------------------------------------------------------

describe('RN-476 · as cinco causas devolvem a MESMA negativa', () => {
  it('errado, vencido, já usado, inexistente e esgotado', async () => {
    const causas: { nome: string; erro: unknown }[] = [];

    const pegar = async (nome: string, fn: () => Promise<unknown>): Promise<void> => {
      try {
        await fn();
        throw new Error(`${nome} deveria ter sido negado`);
      } catch (err) {
        causas.push({ nome, erro: err });
      }
    };

    // (1) errado
    const alvo1 = `errado-${seq}@leela.com`;
    const c1 = await codigoVivo(alvo1);
    await pegar('errado', () =>
      confirmarCodigoDeAcessoCore(db, auth, { email: alvo1, codigo: outroCodigo(c1) })
    );

    // (2) vencido
    const alvo2 = `vencido-${seq}@leela.com`;
    const c2 = await codigoVivo(alvo2, new Date(0));
    await pegar('vencido', () =>
      confirmarCodigoDeAcessoCore(
        db,
        auth,
        { email: alvo2, codigo: c2 },
        new Date(CODIGO_ACESSO_TTL_MS + 1)
      )
    );

    // (3) já usado
    const alvo3 = `usado-${seq}@leela.com`;
    const c3 = await codigoVivo(alvo3);
    await confirmarCodigoDeAcessoCore(db, auth, { email: alvo3, codigo: c3 });
    await pegar('ja_usado', () =>
      confirmarCodigoDeAcessoCore(db, auth, { email: alvo3, codigo: c3 })
    );

    // (4) inexistente — endereço que nunca pediu nada
    await pegar('inexistente', () =>
      confirmarCodigoDeAcessoCore(db, auth, {
        email: `nunca-${seq}@leela.com`,
        codigo: '123456',
      })
    );

    // (5) esgotado
    const alvo5 = `esgotado-${seq}@leela.com`;
    const c5 = await codigoVivo(alvo5);
    for (let i = 0; i < CODIGO_ACESSO_MAX_TENTATIVAS; i++) {
      await confirmarCodigoDeAcessoCore(db, auth, {
        email: alvo5,
        codigo: outroCodigo(c5),
      }).catch(() => undefined);
    }
    await pegar('esgotado', () =>
      confirmarCodigoDeAcessoCore(db, auth, { email: alvo5, codigo: c5 })
    );

    expect(causas).toHaveLength(5);
    for (const { nome, erro } of causas) {
      const e = erro as { code?: string; message?: string };
      expect(e.code, nome).toBe('permission-denied');
      expect(e.message, nome).toBe(MENSAGEM_CODIGO_NEGADO);
    }
  }, 60_000);

  it('as quatro causas de MORTE são indistinguíveis entre si (restam 0)', async () => {
    const alvo = `morto-${seq}@leela.com`;
    const c = await codigoVivo(alvo);
    await matarCodigoDeAcesso(db, alvo, 'envio_falhou');

    const erro = await erroDe(() =>
      confirmarCodigoDeAcessoCore(db, auth, { email: alvo, codigo: c })
    );
    expect(erro.details?.tentativasRestantes).toBe(0);

    const inexistente = await erroDe(() =>
      confirmarCodigoDeAcessoCore(db, auth, { email: `nada-${seq}@leela.com`, codigo: '123456' })
    );
    expect(inexistente.details?.tentativasRestantes).toBe(0);
  });

  it('forma inválida NÃO é a negativa de credencial e não gasta tentativa', async () => {
    const alvo = `forma-${seq}@leela.com`;
    const c = await codigoVivo(alvo);
    for (const ruim of ['', '12345', 'abcdef', null]) {
      await expect(
        confirmarCodigoDeAcessoCore(db, auth, { email: alvo, codigo: ruim })
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    }
    // O código continua inteiro: cinco tentativas ainda disponíveis.
    const ok = await confirmarCodigoDeAcessoCore(db, auth, { email: alvo, codigo: c });
    expect(ok.ok).toBe(true);
  });

  it('consumo duplo do mesmo código: um sucesso e uma negativa', async () => {
    const c = await codigoVivo(email);
    const primeira = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c });
    expect(primeira.ok).toBe(true);
    await expect(
      confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('RN-477 · a divergência só existe DEPOIS da prova', () => {
  it('conta existente ⇒ o nome é conhecido e não se pede cadastro', async () => {
    await contaDaCompra(email);
    const c = await codigoVivo(email);
    const r = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c });
    expect(r.precisaCadastro).toBe(false);
    expect(r.nome).toBe('Ana Compradora');
    expect(r.prova).toHaveLength(64);
  });

  it('conta inexistente ⇒ pede cadastro, sem nome e SEM erro', async () => {
    const c = await codigoVivo(email);
    const r = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c });
    expect(r.ok).toBe(true);
    expect(r.precisaCadastro).toBe(true);
    expect(r.nome).toBe('');
  });

  it('ANTES da prova, a negativa é igual com conta e sem conta', async () => {
    const comConta = `com-${seq}@leela.com`;
    await contaDaCompra(comConta);
    const cA = await codigoVivo(comConta);
    const semConta = `sem-${seq}@leela.com`;
    const cB = await codigoVivo(semConta);

    const eA = await erroDe(() =>
      confirmarCodigoDeAcessoCore(db, auth, { email: comConta, codigo: outroCodigo(cA) })
    );
    const eB = await erroDe(() =>
      confirmarCodigoDeAcessoCore(db, auth, { email: semConta, codigo: outroCodigo(cB) })
    );

    expect(eA.code).toBe(eB.code);
    expect(eA.message).toBe(eB.message);
  });
});

describe('RN-453 · senha primeiro, sessão depois (conta que já existe)', () => {
  it('define a senha, carimba emailVerified e devolve o token na MESMA chamada', async () => {
    const antes = await contaDaCompra(email);
    expect(antes.emailVerified).toBe(false);

    const c = await codigoVivo(email);
    const { prova } = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c });
    const r = await concluirAcessoComProvaCore(db, auth, { email, prova, senha: SENHA_NOVA });

    expect(r.ok).toBe(true);
    expect(r.contaCriada).toBe(false);
    expect(typeof r.token).toBe('string');
    expect(r.token.length).toBeGreaterThan(20);

    const depois = await auth.getUser(antes.uid);
    expect(depois.emailVerified).toBe(true);
    // A senha mudou de fato: o Auth registra o provedor de senha e o
    // `passwordHash` do emulator muda. O que importa para a RN-453 é que a
    // conta ficou COM senha antes de qualquer sessão existir.
    expect(depois.providerData.some((p) => p.providerId === 'password')).toBe(true);
  });

  it('a conta que JÁ tinha senha define outra e entra (o quinto caso)', async () => {
    const conta = await auth.createUser({
      email,
      password: SENHA_ANTIGA,
      emailVerified: false,
      displayName: 'Ana Com Senha',
    });
    const c = await codigoVivo(email);
    const { prova, precisaCadastro } = await confirmarCodigoDeAcessoCore(db, auth, {
      email,
      codigo: c,
    });
    expect(precisaCadastro).toBe(false);

    const r = await concluirAcessoComProvaCore(db, auth, { email, prova, senha: SENHA_NOVA });
    expect(r.ok).toBe(true);
    expect((await auth.getUser(conta.uid)).emailVerified).toBe(true);
  });

  it('senha curta é recusada ANTES de a prova ser consumida', async () => {
    await contaDaCompra(email);
    const c = await codigoVivo(email);
    const { prova } = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c });

    await expect(
      concluirAcessoComProvaCore(db, auth, { email, prova, senha: 'abc' })
    ).rejects.toMatchObject({ code: 'invalid-argument' });

    // A prova sobreviveu — a pessoa corrige a senha e conclui, sem pedir
    // outro código. Consumir a prova numa recusa de FORMA seria fazer a
    // pessoa recomeçar por um erro de digitação.
    const r = await concluirAcessoComProvaCore(db, auth, {
      email,
      prova,
      senha: 'a'.repeat(SENHA_CONTA_MIN),
    });
    expect(r.ok).toBe(true);
  });

  it('a prova serve UMA vez, e prova inventada é a mesma negativa', async () => {
    await contaDaCompra(email);
    const c = await codigoVivo(email);
    const { prova } = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c });

    await concluirAcessoComProvaCore(db, auth, { email, prova, senha: SENHA_NOVA });
    await expect(
      concluirAcessoComProvaCore(db, auth, { email, prova, senha: SENHA_NOVA })
    ).rejects.toMatchObject({ code: 'permission-denied', message: MENSAGEM_CODIGO_NEGADO });

    await expect(
      concluirAcessoComProvaCore(db, auth, { email, prova: 'f'.repeat(64), senha: SENHA_NOVA })
    ).rejects.toMatchObject({ code: 'permission-denied', message: MENSAGEM_CODIGO_NEGADO });
  });

  it('sem prova nenhuma, ninguém define senha de ninguém', async () => {
    const vitima = await contaDaCompra(email);
    await expect(
      concluirAcessoComProvaCore(db, auth, { email, prova: '', senha: SENHA_NOVA })
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect((await auth.getUser(vitima.uid)).emailVerified).toBe(false);
  });
});

describe('RN-478/479/480 · a conta nasce inteira, com consentimento, e só de participante', () => {
  it('cria a conta JÁ VERIFICADA, com o consentimento carimbado pelo servidor', async () => {
    const c = await codigoVivo(email);
    const { prova, precisaCadastro } = await confirmarCodigoDeAcessoCore(db, auth, {
      email,
      codigo: c,
    });
    expect(precisaCadastro).toBe(true);

    const r = await concluirAcessoComProvaCore(db, auth, {
      email,
      prova,
      senha: SENHA_NOVA,
      nome: 'Ana Participante',
      consentimentoLgpd: true,
    });
    expect(r.contaCriada).toBe(true);

    const conta = await auth.getUserByEmail(email);
    expect(conta.emailVerified).toBe(true);
    expect(conta.displayName).toBe('Ana Participante');

    const doc = await db.collection('atletas').doc(conta.uid).get();
    expect(doc.exists).toBe(true);
    const consentimento = doc.get('consentimentoLgpd') as {
      versao: string;
      finalidade: string;
      aceitoEm: admin.firestore.Timestamp;
    };
    expect(consentimento.versao).toBe(TERMO_CONTA_VERSAO);
    expect(consentimento.finalidade).toBe(TERMO_CONTA_FINALIDADE);
    // Instante do SERVIDOR (RN-446): existe e é Timestamp, não string do
    // cliente.
    expect(consentimento.aceitoEm).toBeInstanceOf(admin.firestore.Timestamp);
  });

  it('FRONTEIRA (RN-480) · nasce `athlete` e nada além', async () => {
    const c = await codigoVivo(email);
    const { prova } = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c });
    await concluirAcessoComProvaCore(db, auth, {
      email,
      prova,
      senha: SENHA_NOVA,
      nome: 'Ana Participante',
      consentimentoLgpd: true,
    });

    const conta = await auth.getUserByEmail(email);
    const claims = (conta.customClaims ?? {}) as Record<string, unknown>;
    // Sem o emulator de Functions o `onCreateUser` não roda, então o papel
    // default não chega a ser escrito aqui. O que esta lane afirma é o
    // NEGATIVO, e é ele que importa: nada nesta chamada eleva papel.
    expect(claims['role']).not.toBe('platform_admin');
    expect(claims['role']).not.toBe('tenant_owner');
    expect(claims['role']).not.toBe('tenant_staff');
    expect(claims['tenantId']).toBeUndefined();

    expect((await db.collection('profissionais').doc(conta.uid).get()).exists).toBe(false);
    expect((await db.collection('tenants').doc(conta.uid).get()).exists).toBe(false);
  });

  it('checkbox DESMARCADO impede a criação (RN-479)', async () => {
    const c = await codigoVivo(email);
    const { prova } = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c });
    await expect(
      concluirAcessoComProvaCore(db, auth, {
        email,
        prova,
        senha: SENHA_NOVA,
        nome: 'Ana Participante',
        consentimentoLgpd: false,
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(auth.getUserByEmail(email)).rejects.toThrow();
  });

  it('sem nome, a conta não nasce', async () => {
    const c = await codigoVivo(email);
    const { prova } = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c });
    await expect(
      concluirAcessoComProvaCore(db, auth, {
        email,
        prova,
        senha: SENHA_NOVA,
        consentimentoLgpd: true,
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(auth.getUserByEmail(email)).rejects.toThrow();
  });

  it('ATAQUE (RN-446) · aceite datado pelo CLIENTE é recusado', async () => {
    const c = await codigoVivo(email);
    const { prova } = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c });

    for (const forjado of [
      { aceitoEm: '2020-01-01T00:00:00Z' },
      { consentimentoEm: 1_600_000_000 },
      { consentimentoLgpd: { versao: '1999-01-01', aceitoEm: 'ontem' } },
    ]) {
      await expect(
        concluirAcessoComProvaCore(db, auth, {
          email,
          prova,
          senha: SENHA_NOVA,
          nome: 'Ana Participante',
          consentimentoLgpd: true,
          ...forjado,
        })
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    }
    // E nada nasceu no caminho.
    await expect(auth.getUserByEmail(email)).rejects.toThrow();
  });

  it('ROLLBACK (RN-478) · gravação falhando NÃO deixa conta no Auth', async () => {
    // O caminho que produziu a conta órfã do organizador. Sem o desfazer, o
    // endereço fica OCUPADO por uma conta sem documento nenhum por trás — e a
    // pessoa não consegue recriar, porque o Auth diz que o e-mail já existe.
    const c = await codigoVivo(email);
    const { prova } = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c });

    await expect(
      concluirAcessoComProvaCore(dbComAtletasQuebrado(), auth, {
        email,
        prova,
        senha: SENHA_NOVA,
        nome: 'Ana Participante',
        consentimentoLgpd: true,
      })
    ).rejects.toMatchObject({ code: 'internal' });

    await expect(auth.getUserByEmail(email)).rejects.toThrow();
  });

  it('o consentimento SOBREVIVE ao onCreateUser chegando depois', async () => {
    // A corrida é real: o gatilho observa a criação da conta no Auth e grava
    // `atletas/{uid}` por conta própria, com entrega at-least-once e SEM ordem
    // garantida. Aqui ele chega DEPOIS de nós.
    //
    // Sem o Emulator de Functions o gatilho não roda de verdade, então o teste
    // encena exatamente o que ele faz: `create()` (não `set`). O `create` falha
    // com ALREADY_EXISTS — que é o erro que o próprio gatilho já engole — e o
    // consentimento continua de pé. Se algum dia alguém trocar o `create` do
    // gatilho por um `set` sem merge, é ESTE consentimento que some.
    const c = await codigoVivo(email);
    const { prova } = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: c });
    await concluirAcessoComProvaCore(db, auth, {
      email,
      prova,
      senha: SENHA_NOVA,
      nome: 'Ana Participante',
      consentimentoLgpd: true,
    });

    const conta = await auth.getUserByEmail(email);
    const ref = db.collection('atletas').doc(conta.uid);

    const erro = await ref
      .create({ id: conta.uid, nome: 'Ana Participante', avatarInit: 'AP' })
      .then(() => null)
      .catch((e: unknown) => e as { code?: number });
    expect(erro?.code).toBe(6); // gRPC ALREADY_EXISTS — o gatilho segue limpo

    const doc = await ref.get();
    expect(doc.get('consentimentoLgpd')).toBeDefined();
    expect((doc.get('consentimentoLgpd') as { versao: string }).versao).toBe(
      TERMO_CONTA_VERSAO
    );
  });
});
