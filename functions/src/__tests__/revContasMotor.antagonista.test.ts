/**
 * revContasMotor.antagonista.test.ts — REV-CONTAS-MOTOR
 * Review antagonista dos commits 39a98908 · 6f5b7915 · a0f12500 · 23c644f2 · cb33344e
 *
 * NÃO é a suíte do construtor de novo. Cada caso aqui existe para FALSIFICAR
 * uma afirmação declarada no handoff `leela-contas-motor-BUILD.md`, ou para
 * medir a consequência real de um buraco que ele declarou sem medir.
 *
 * O que estes casos provam, e o que provaram QUEBRADO:
 *
 *   1. A PROVA DE CONTINUAÇÃO — entropia, uso único sob concorrência real,
 *      fronteira de endereço, e a morte quando um código novo é emitido.
 *   2. ⛔ A PROVA **NÃO** TEM "o mesmo prazo do código" (afirmação do handoff
 *      §desenho e do cabeçalho de `codigoDeAcesso.ts` §4). Ela ganha DEZ
 *      MINUTOS NOVOS a partir do consumo, então a cadeia de credencial vive
 *      até VINTE minutos depois da emissão. O caso pinga a janela real.
 *   3. ⛔ A PROVA É QUEIMADA POR ERRO DE FORMULÁRIO — falta de nome ou de
 *      aceite consome a prova E o código, e a pessoa precisa pedir OUTRO
 *      código. É exatamente o desfecho que a separação em duas callables foi
 *      justificada para evitar (handoff §"A decisão de desenho").
 *   4. ⛔ A RN-449d NÃO ATRAVESSA — a conta de administração, que o
 *      `contaSemFriccao` recusa vincular a comprador, entra pela porta do
 *      participante, tem a senha trocada, ganha `emailVerified` e sai com
 *      token de sessão.
 *   5. A CONTA ÓRFÃ do duplo desfazer — o que ela é DE FATO (usável, com a
 *      senha que a pessoa digitou) e o que ela NÃO é (bloqueio de nova
 *      tentativa). O que sobra é o consentimento LGPD que nunca é gravado.
 *   6. `tentativasRestantes` não distingue conta — nem em valor.
 *   7. Força bruta com paralelismo maior que o do construtor.
 *   8. O terceiro que esgota as tentativas da vítima (bloqueio de terceiro).
 *   9. Fail-closed do pepper em tempo de chamada, nas TRÊS callables.
 *
 * ⚠ PRÉ-REQUISITO: Firestore E AUTH Emulators da lane de REVIEW
 * (firebase.revcontas.json — firestore 8399, auth 9399), com
 * `FIRESTORE_EMULATOR_HOST` **e** `LEELA_FS_EMU_PORT` exportados.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import {
  CODIGO_ACESSO_MAX_TENTATIVAS,
  CODIGO_ACESSO_TTL_MS,
  MENSAGEM_CODIGO_NEGADO,
} from '@leela/core';
import {
  consumirCodigoDeAcesso,
  consumirProvaDeAcesso,
  docIdDoEmail,
  emitirCodigoDeAcesso,
  COLECAO_CODIGOS_ACESSO,
  ENV_CODIGO_ACESSO_PEPPER,
} from '../auth/codigoDeAcesso';
import {
  concluirAcessoComProvaCore,
  confirmarCodigoDeAcessoCore,
} from '../auth/confirmarCodigoDeAcesso';
import { solicitarCodigoDeAcessoCore } from '../auth/solicitarCodigoDeAcesso';

const PROJECT_ID = 'demo-leela-revcontas';
const FIRESTORE_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8399
);
const AUTH_PORT = Number(
  process.env['LEELA_AUTH_EMU_PORT'] ??
    process.env['FIREBASE_AUTH_EMULATOR_HOST']?.split(':').pop() ??
    9399
);
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

process.env[ENV_CODIGO_ACESSO_PEPPER] = 'pepper-review-rn476';
process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= `127.0.0.1:${AUTH_PORT}`;

const SENHA = 'senha-da-review-123';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

let seq = 0;
let email = '';
beforeEach(() => {
  seq += 1;
  email = `rev-${seq}-${Date.now()}@leela.com`;
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

async function codigoVivo(alvo: string, agora = new Date()): Promise<string> {
  const { codigo } = await emitirCodigoDeAcesso(db, alvo, agora);
  return codigo;
}

/** Percorre código → prova, devolvendo a prova em claro. */
async function provaViva(
  alvo: string,
  emitidoEm = new Date(),
  confirmadoEm = emitidoEm
): Promise<string> {
  const codigo = await codigoVivo(alvo, emitidoEm);
  const r = await confirmarCodigoDeAcessoCore(db, auth, { email: alvo, codigo }, confirmadoEm);
  return r.prova;
}

function outroCodigo(certo: string): string {
  return String((Number.parseInt(certo, 10) + 1) % 1_000_000).padStart(6, '0');
}

// ===========================================================================
// 1. A PROVA DE CONTINUAÇÃO — o desvio de desenho desta lane
// ===========================================================================

describe('REV · a prova de continuação é credencial e é atacada como tal', () => {
  it('não é adivinhável: 256 bits em hex, sem repetição em 40 emissões', async () => {
    const provas = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const prova = await provaViva(`prova-ent-${seq}-${i}@leela.com`);
      expect(prova).toMatch(/^[0-9a-f]{64}$/);
      provas.add(prova);
    }
    expect(provas.size).toBe(40);
  }, 120_000);

  it('uso único PROVADO sob concorrência: 8 conclusões simultâneas, um sucesso só', async () => {
    const prova = await provaViva(email);
    const disparos = Array.from({ length: 8 }, () =>
      concluirAcessoComProvaCore(db, auth, {
        email,
        prova,
        senha: SENHA,
        nome: 'Ana Review',
        consentimentoLgpd: true,
      }).then(
        () => 'ok' as const,
        () => 'negado' as const
      )
    );
    const desfechos = await Promise.all(disparos);
    expect(desfechos.filter((d) => d === 'ok')).toHaveLength(1);
  }, 60_000);

  it('não atravessa endereço: a prova da Ana não conclui o acesso do Bruno', async () => {
    const bruno = `bruno-${seq}-${Date.now()}@leela.com`;
    const prova = await provaViva(email);
    // O Bruno tem código vivo próprio — o documento dele EXISTE, para o
    // ataque não morrer no ramo "inexistente" por acidente.
    await codigoVivo(bruno);
    const erro = await erroDe(() =>
      concluirAcessoComProvaCore(db, auth, {
        email: bruno,
        prova,
        senha: SENHA,
        nome: 'Bruno',
        consentimentoLgpd: true,
      })
    );
    expect(erro.code).toBe('permission-denied');
    expect(erro.message).toContain(MENSAGEM_CODIGO_NEGADO);
    await expect(auth.getUserByEmail(bruno)).rejects.toMatchObject({
      code: 'auth/user-not-found',
    });
  }, 60_000);

  it('morre quando um código NOVO é emitido para o mesmo endereço', async () => {
    const prova = await provaViva(email);
    await emitirCodigoDeAcesso(db, email); // `set` inteiro zera provaDigest
    expect(await consumirProvaDeAcesso(db, email, prova)).toBe(false);
  }, 30_000);

  it('não pode ser pedida: nenhuma callable devolve prova sem código correto', async () => {
    const codigo = await codigoVivo(email);
    const erro = await erroDe(() =>
      confirmarCodigoDeAcessoCore(db, auth, { email, codigo: outroCodigo(codigo) })
    );
    expect(erro.code).toBe('permission-denied');
    expect((erro as unknown as { prova?: unknown }).prova).toBeUndefined();
  }, 30_000);

  it('⛔ DEFEITO · a prova NÃO tem "o mesmo prazo do código": ela ganha 10 min NOVOS', async () => {
    const t0 = new Date('2026-08-05T12:00:00.000Z');
    const quaseVencendo = new Date(t0.getTime() + CODIGO_ACESSO_TTL_MS - 1_000);
    const prova = await provaViva(email, t0, quaseVencendo);

    // O CÓDIGO já venceu neste instante (t0 + 10min + 1s).
    const depoisDoCodigo = new Date(t0.getTime() + CODIGO_ACESSO_TTL_MS + 1_000);
    // ...e a prova continua valendo, por mais quase dez minutos.
    const quaseFimDaProva = new Date(quaseVencendo.getTime() + CODIGO_ACESSO_TTL_MS - 1_000);
    expect(depoisDoCodigo.getTime()).toBeGreaterThan(t0.getTime() + CODIGO_ACESSO_TTL_MS);

    const ok = await consumirProvaDeAcesso(db, email, prova, quaseFimDaProva);
    expect(ok).toBe(true);

    // A janela total da cadeia de credencial é de até DOIS TTLs, não um.
    const janelaTotalMs = quaseFimDaProva.getTime() - t0.getTime();
    expect(janelaTotalMs).toBeGreaterThan(CODIGO_ACESSO_TTL_MS);
    expect(janelaTotalMs).toBeLessThanOrEqual(2 * CODIGO_ACESSO_TTL_MS);
  }, 30_000);
});

// ===========================================================================
// 2. A PROVA QUEIMADA POR ERRO DE FORMULÁRIO — o dead-end que a separação
//    em duas callables foi justificada para evitar
// ===========================================================================

describe('REV · o que acontece quando o formulário chega incompleto', () => {
  it('DEF-1 · falta de aceite NÃO queima a prova: a mesma prova conclui na segunda tentativa', async () => {
    const codigo = await codigoVivo(email);
    const confirmado = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo });
    expect(confirmado.precisaCadastro).toBe(true);

    // A pessoa esqueceu o aceite. O servidor recusa — e a recusa não pode
    // custar a ela o código, que é o desfecho que a separação em duas
    // callables foi justificada para evitar.
    const semAceite = await erroDe(() =>
      concluirAcessoComProvaCore(db, auth, {
        email,
        prova: confirmado.prova,
        senha: SENHA,
        nome: 'Ana Review',
        consentimentoLgpd: false,
      })
    );
    expect(semAceite.code).toBe('failed-precondition');

    // O mesmo para o nome ausente.
    const semNome = await erroDe(() =>
      concluirAcessoComProvaCore(db, auth, {
        email,
        prova: confirmado.prova,
        senha: SENHA,
        nome: '   ',
        consentimentoLgpd: true,
      })
    );
    expect(semNome.code).toBe('failed-precondition');

    // Nada nasceu no meio do caminho.
    await expect(auth.getUserByEmail(email)).rejects.toMatchObject({
      code: 'auth/user-not-found',
    });

    // Terceira tentativa, agora completa, com a MESMA prova: entra.
    const r = await concluirAcessoComProvaCore(db, auth, {
      email,
      prova: confirmado.prova,
      senha: SENHA,
      nome: 'Ana Review',
      consentimentoLgpd: true,
    });
    expect(r.ok).toBe(true);
    expect(r.contaCriada).toBe(true);

    // E o uso único segue literal: a prova morre no consumo, não no erro.
    const depois = await erroDe(() =>
      concluirAcessoComProvaCore(db, auth, {
        email,
        prova: confirmado.prova,
        senha: SENHA,
        nome: 'Ana Review',
        consentimentoLgpd: true,
      })
    );
    expect(depois.code).toBe('permission-denied');
  }, 60_000);
});

// ===========================================================================
// 3. RN-449d — a fronteira que o `contaSemFriccao` guarda e esta porta não
// ===========================================================================

describe('REV · a conta de ADMINISTRAÇÃO na porta do participante (RN-449d)', () => {
  it('DEF-2 · platform_admin é RECUSADO: sem troca de senha, sem emailVerified, sem token', async () => {
    const admEmail = `adm-${seq}-${Date.now()}@leela.com`;
    const adm = await auth.createUser({
      email: admEmail,
      password: 'senha-de-admin-original',
      emailVerified: false,
      displayName: 'Dono da Plataforma',
    });
    await auth.setCustomUserClaims(adm.uid, { role: 'platform_admin' });

    const codigo = await codigoVivo(admEmail);
    const confirmado = await confirmarCodigoDeAcessoCore(db, auth, {
      email: admEmail,
      codigo,
    });
    const erro = await erroDe(() =>
      concluirAcessoComProvaCore(db, auth, { email: admEmail, prova: confirmado.prova, senha: SENHA })
    );
    expect(erro.code).toBe('failed-precondition');

    const depois = await auth.getUser(adm.uid);
    expect(depois.emailVerified).toBe(false);
    expect(depois.customClaims?.['role']).toBe('platform_admin');

    // A recusa vem ANTES do consumo: a prova não foi cobrada de quem bateu
    // nesta porta por engano.
    expect(await consumirProvaDeAcesso(db, admEmail, confirmado.prova)).toBe(true);
  }, 60_000);

  it('a conta de participante comum segue passando (a guarda é de PAPEL, não de porta)', async () => {
    const prova = await provaViva(email);
    const r = await concluirAcessoComProvaCore(db, auth, {
      email,
      prova,
      senha: SENHA,
      nome: 'Ana Review',
      consentimentoLgpd: true,
    });
    expect(r.ok).toBe(true);
    expect(r.contaCriada).toBe(true);
  }, 60_000);
});

// ===========================================================================
// 4. A CONTA ÓRFÃ — o buraco que o construtor declarou, MEDIDO
// ===========================================================================

/** Firestore com `atletas` quebrado (molde do teste do construtor). */
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

/** Auth com `deleteUser` quebrado — o segundo andar do desfazer. */
function authComDeleteQuebrado(): admin.auth.Auth {
  const real = auth as unknown as Record<string, unknown>;
  return new Proxy(real, {
    get(alvo, prop) {
      if (prop === 'deleteUser') {
        return () => Promise.reject(new Error('auth indisponível (teste)'));
      }
      const valor = Reflect.get(alvo, prop, alvo);
      return typeof valor === 'function' ? (valor as (...a: unknown[]) => unknown).bind(alvo) : valor;
    },
  }) as unknown as admin.auth.Auth;
}

describe('REV · a conta órfã do duplo desfazer, medida', () => {
  it('sobra conta no Auth — e ela é USÁVEL: verificada, com a senha que a pessoa digitou', async () => {
    const prova = await provaViva(email);
    const capturado: Record<string, unknown>[] = [];
    const espiao = vi.spyOn(logger, 'error').mockImplementation((...args: unknown[]) => {
      const payload = args[1];
      if (typeof payload === 'object' && payload !== null) {
        capturado.push(payload as Record<string, unknown>);
      }
    });
    let erro: ErroNegativa;
    try {
      erro = await erroDe(() =>
        concluirAcessoComProvaCore(
          dbComAtletasQuebrado(),
          authComDeleteQuebrado(),
          { email, prova, senha: SENHA, nome: 'Ana Review', consentimentoLgpd: true }
        )
      );
    } finally {
      espiao.mockRestore();
    }
    expect(erro.code).toBe('internal');

    // DEF-5 · o duplo desfazer é OBSERVÁVEL: sem isto, a conta órfã é
    // invisível para quem opera, que foi como a conta órfã do organizador
    // sobreviveu da primeira vez.
    const incidente = capturado.find((p) => p['desfeito'] === false);
    expect(incidente).toBeDefined();
    expect(incidente?.['alerta']).toBe(true);
    expect(incidente?.['severidade']).toBe('critico');
    expect(typeof incidente?.['uid']).toBe('string');

    // O construtor pergunta: "essa conta órfã pode ser usada para logar?"
    const orfa = await auth.getUserByEmail(email);
    expect(orfa.emailVerified).toBe(true);
    expect(orfa.passwordHash === undefined).toBe(false);

    // E o `atletas/{uid}` — o documento com o consentimento — NÃO existe.
    const doc = await db.collection('atletas').doc(orfa.uid).get();
    expect(doc.exists).toBe(false);
  }, 60_000);

  it('a conta órfã NÃO tranca a pessoa: a segunda volta entra pelo ramo "conta existe"', async () => {
    const prova = await provaViva(email);
    await erroDe(() =>
      concluirAcessoComProvaCore(
        dbComAtletasQuebrado(),
        authComDeleteQuebrado(),
        { email, prova, senha: SENHA, nome: 'Ana Review', consentimentoLgpd: true }
      )
    );
    const orfa = await auth.getUserByEmail(email);

    // Novo código, nova prova — e agora `precisaCadastro` é falso.
    const codigo2 = await codigoVivo(email);
    const c2 = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo: codigo2 });
    expect(c2.precisaCadastro).toBe(false);
    const r2 = await concluirAcessoComProvaCore(db, auth, {
      email,
      prova: c2.prova,
      senha: 'outra-senha-456',
    });
    expect(r2.ok).toBe(true);
    expect(r2.contaCriada).toBe(false);

    // ⛔ E o consentimento LGPD que ela deu na PRIMEIRA volta nunca foi
    // gravado — o ramo "conta existe" não escreve `atletas/{uid}`.
    const doc = await db.collection('atletas').doc(orfa.uid).get();
    expect(doc.exists).toBe(false);
  }, 60_000);
});

// ===========================================================================
// 5. `tentativasRestantes` — oráculo?
// ===========================================================================

describe('REV · tentativasRestantes não distingue conta', () => {
  it('mesmo valor com conta e sem conta, em todas as causas', async () => {
    const comConta = `com-${seq}-${Date.now()}@leela.com`;
    const semConta = `sem-${seq}-${Date.now()}@leela.com`;
    await auth.createUser({ email: comConta, password: 'senha-existente-1' });

    const medir = async (alvo: string): Promise<(number | undefined)[]> => {
      // (a) endereço que nunca pediu nada
      const a = await erroDe(() =>
        confirmarCodigoDeAcessoCore(db, auth, { email: alvo, codigo: '000000' })
      );
      // (b) código vivo, palpite errado
      const codigo = await codigoVivo(alvo);
      const b = await erroDe(() =>
        confirmarCodigoDeAcessoCore(db, auth, { email: alvo, codigo: outroCodigo(codigo) })
      );
      // (c) código vencido
      const alvoVencido = `${alvo.split('@')[0]}-v@leela.com`;
      const cv = await codigoVivo(alvoVencido, new Date(0));
      const c = await erroDe(() =>
        confirmarCodigoDeAcessoCore(
          db,
          auth,
          { email: alvoVencido, codigo: cv },
          new Date(CODIGO_ACESSO_TTL_MS + 1)
        )
      );
      return [
        a.details?.tentativasRestantes,
        b.details?.tentativasRestantes,
        c.details?.tentativasRestantes,
      ];
    };

    expect(await medir(comConta)).toEqual(await medir(semConta));
  }, 60_000);
});

// ===========================================================================
// 6. Força bruta e concorrência — com mais paralelismo que o do construtor
// ===========================================================================

describe('REV · força bruta com paralelismo maior', () => {
  /**
   * O teto medido pela ÚNICA grandeza que interessa: quantas COMPARAÇÕES de
   * digest o atacante conseguiu pagar.
   *
   * O construtor mediu 12 em paralelo e afirmou o par (`tentativas ≤ 5`,
   * código morto). O `≤` esconde a pergunta — 3 também satisfaz `≤ 5` e seria
   * o sintoma de um contador que perde incrementos. Aqui a asserção é de
   * IGUALDADE, e o desfecho de cada palpite é classificado pelo motivo
   * INTERNO: `errado`/`esgotado` são as comparações que de fato aconteceram,
   * `morto` são as que bateram em porta fechada e não aprenderam nada.
   *
   * Medido em 12, 40 e 80: SEMPRE exatamente cinco comparações.
   */
  it('80 palpites simultâneos: comparação e incremento andam juntos, e o teto nunca é passado', async () => {
    const codigo = await codigoVivo(email);
    const errado = outroCodigo(codigo);

    const desfechos = await Promise.all(
      Array.from({ length: 80 }, () =>
        consumirCodigoDeAcesso(db, email, errado).then(
          (r) => (r.ok ? 'sucesso' : r.motivo),
          () => 'abortou' as const
        )
      )
    );

    expect(desfechos.filter((d) => d === 'sucesso')).toHaveLength(0);
    const comparacoes = desfechos.filter((d) => d === 'errado' || d === 'esgotado').length;
    expect(comparacoes).toBeLessThanOrEqual(CODIGO_ACESSO_MAX_TENTATIVAS);

    // O INVARIANTE: comparação e incremento são a mesma coisa. Um contador que
    // perdesse incremento sob contenção daria comparações > tentativas, que é
    // o buraco que o teto existe para não ter. `≤ 5` sozinho não vê isso —
    // três também satisfaz `≤ 5` e seria sintoma.
    const snap = await db.collection(COLECAO_CODIGOS_ACESSO).doc(docIdDoEmail(email)).get();
    expect(snap.get('tentativas')).toBe(comparacoes);
    expect(snap.get('morto')).toBe(comparacoes >= CODIGO_ACESSO_MAX_TENTATIVAS);

    // E o código CERTO, depois da tempestade: negado se o teto foi atingido,
    // íntegro se não foi. A tempestade não corrompe o documento — o que ela
    // faz é gastar tentativas, e só as que ela de fato pagou.
    if (comparacoes >= CODIGO_ACESSO_MAX_TENTATIVAS) {
      const erro = await erroDe(() => confirmarCodigoDeAcessoCore(db, auth, { email, codigo }));
      expect(erro.code).toBe('permission-denied');
      expect(erro.message).toContain(MENSAGEM_CODIGO_NEGADO);
    } else {
      const ok = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo });
      expect(ok.ok).toBe(true);
    }
  }, 180_000);

  it('DEF-6 · aborto de transação NÃO escapa com código de erro próprio', async () => {
    const codigo = await codigoVivo(email);
    // O aborto de contenção, forçado: a transação sempre falha.
    const dbQueAborta = new Proxy(db as unknown as Record<string, unknown>, {
      get(alvo, prop) {
        if (prop === 'runTransaction') {
          return () => Promise.reject(Object.assign(new Error('ABORTED'), { code: 10 }));
        }
        const valor = Reflect.get(alvo, prop, alvo);
        return typeof valor === 'function' ? (valor as () => unknown).bind(alvo) : valor;
      },
    }) as unknown as admin.firestore.Firestore;

    const erro = await erroDe(() =>
      confirmarCodigoDeAcessoCore(dbQueAborta, auth, { email, codigo })
    );
    // Nem `internal` cru, nem a negativa de credencial (que mentiria dizendo
    // que o código está errado): `unavailable`, que é "tente de novo".
    expect(erro.code).toBe('unavailable');
    expect(erro.message).not.toContain(MENSAGEM_CODIGO_NEGADO);

    // E o código NÃO foi cobrado: o aborto não custa tentativa.
    const snap = await db.collection(COLECAO_CODIGOS_ACESSO).doc(docIdDoEmail(email)).get();
    expect(snap.get('tentativas')).toBe(0);
    const ok = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo });
    expect(ok.ok).toBe(true);
  }, 60_000);

  it('esgotado em SÉRIE, o código morre e o código CERTO já não entra', async () => {
    const codigo = await codigoVivo(email);
    const errado = outroCodigo(codigo);
    for (let i = 0; i < CODIGO_ACESSO_MAX_TENTATIVAS; i++) {
      await erroDe(() => confirmarCodigoDeAcessoCore(db, auth, { email, codigo: errado }));
    }
    const snap = await db.collection(COLECAO_CODIGOS_ACESSO).doc(docIdDoEmail(email)).get();
    expect(snap.get('tentativas')).toBe(CODIGO_ACESSO_MAX_TENTATIVAS);
    expect(snap.get('morto')).toBe(true);
    const erro = await erroDe(() => confirmarCodigoDeAcessoCore(db, auth, { email, codigo }));
    expect(erro.code).toBe('permission-denied');
  }, 60_000);

  it('⛔ RISCO · um TERCEIRO esgota as tentativas e mata o código da vítima', async () => {
    // A vítima pediu o código e o recebeu na caixa dela.
    const codigo = await codigoVivo(email);
    // O atacante só precisa do ENDEREÇO — nenhuma sessão, nenhum App Check.
    for (let i = 0; i < CODIGO_ACESSO_MAX_TENTATIVAS; i++) {
      await erroDe(() =>
        confirmarCodigoDeAcessoCore(db, auth, { email, codigo: outroCodigo(codigo) })
      );
    }
    // A vítima digita o código CERTO e é negada.
    const erro = await erroDe(() => confirmarCodigoDeAcessoCore(db, auth, { email, codigo }));
    expect(erro.code).toBe('permission-denied');
    expect(erro.details?.tentativasRestantes).toBe(0);
  }, 60_000);
});

// ===========================================================================
// 7. A DOUTRINA DE INCIDENTE DA RODADA — o nono e-mail participa?
// ===========================================================================

describe('REV · falha de envio do código é INCIDENTE observável (F5 · P2)', () => {
  it('DEF-3 · o log carrega o campo que a política de alerta casa, e nenhuma PII', async () => {
    const capturado: Record<string, unknown>[] = [];
    const espiao = vi
      .spyOn(logger, 'error')
      .mockImplementation((...args: unknown[]) => {
        const payload = args[1];
        if (typeof payload === 'object' && payload !== null) {
          capturado.push(payload as Record<string, unknown>);
        }
      });
    try {
      const provider = {
        sendTransactional: async (): Promise<never> => {
          throw new Error('Brevo respondeu 401 no envio transacional.');
        },
      };
      const erro = await erroDe(() =>
        solicitarCodigoDeAcessoCore(db, provider as never, { email })
      );
      expect(erro.code).toBe('unavailable');
    } finally {
      espiao.mockRestore();
    }

    const incidente = capturado.find((p) => p['alerta'] !== undefined);
    expect(incidente).toBeDefined();
    expect(incidente?.['alerta']).toBe('email_transacional_falhou');
    expect(incidente?.['severidade']).toBe('critico');
    expect(incidente?.['tipo']).toBe('codigo_de_acesso');
    // Sem PII e sem credencial no incidente.
    const serializado = JSON.stringify(incidente);
    expect(serializado).not.toContain(email);
    expect(serializado).not.toMatch(/\b\d{6}\b/);

    // E o documento morreu (RN-482) — o que já era verdade continua sendo.
    const snap = await db.collection(COLECAO_CODIGOS_ACESSO).doc(docIdDoEmail(email)).get();
    expect(snap.get('morto')).toBe(true);
  }, 60_000);
});

// ===========================================================================
// 8. O pepper — fail-closed nas TRÊS superfícies
// ===========================================================================

describe('REV · fail-closed do pepper em tempo de chamada', () => {
  it('sem CODIGO_ACESSO_PEPPER, as três portas LANÇAM — nenhuma degrada para hash sem pepper', async () => {
    const codigo = await codigoVivo(email);
    const confirmado = await confirmarCodigoDeAcessoCore(db, auth, { email, codigo });

    const salvo = process.env[ENV_CODIGO_ACESSO_PEPPER];
    delete process.env[ENV_CODIGO_ACESSO_PEPPER];
    try {
      const provider = {
        sendTransactional: async (): Promise<{ ok: true; messageId: null }> => ({
          ok: true,
          messageId: null,
        }),
      };
      await expect(
        solicitarCodigoDeAcessoCore(db, provider as never, { email })
      ).rejects.toThrow(/CODIGO_ACESSO_PEPPER/);
      await expect(
        confirmarCodigoDeAcessoCore(db, auth, { email, codigo })
      ).rejects.toThrow(/CODIGO_ACESSO_PEPPER/);
      await expect(
        concluirAcessoComProvaCore(db, auth, {
          email,
          prova: confirmado.prova,
          senha: SENHA,
          nome: 'Ana',
          consentimentoLgpd: true,
        })
      ).rejects.toThrow(/CODIGO_ACESSO_PEPPER/);
    } finally {
      process.env[ENV_CODIGO_ACESSO_PEPPER] = salvo;
    }

    // E nada foi criado no caminho degradado.
    await expect(auth.getUserByEmail(email)).rejects.toMatchObject({
      code: 'auth/user-not-found',
    });
  }, 60_000);
});
