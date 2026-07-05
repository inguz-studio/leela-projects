/**
 * e16Hardening.test.ts — FIX-E16 (achado #32, eixo unit sem Emulator)
 *
 * Fecha o eixo "caminho code-6 / rethrow" do trigger onCreateUser, que os
 * hotfixes E16 tornaram retry-safe mas ninguém provou com injeção de falha:
 *
 *   1. create() do doc atletas rejeita com ALREADY_EXISTS (gRPC code 6 —
 *      redelivery at-least-once do trigger): o trigger ENGOLE o erro, resolve
 *      sem lançar e ainda aplica o claim default (role 'athlete').
 *   2. create() rejeita com erro genérico (ex.: code 13): o trigger RE-LANÇA
 *      (rethrow preservado) e NÃO aplica claim nenhuma.
 *
 * admin.auth()/admin.firestore() stubbados (sem Emulator): valida a LÓGICA.
 * Stub TOLERANTE por design (paralelismo E16): collection() suporta tanto
 * doc().create/set/delete quanto query encadeável where/limit/get resolvendo
 * vazio — assim absorve a query em collection('tenants') que o fix paralelo
 * do achado #11 adiciona sem quebrar. Asserções ORDER-AGNOSTIC: não fixam a
 * ordem entre create() e getUser() (o fix paralelo do #28 pode trocá-la).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as admin from 'firebase-admin';
import { onCreateUser } from '../auth/onCreateUser';

type AnyRec = Record<string, unknown>;

// Spies do doc (create é o eixo do achado; set/delete existem por tolerância).
const createDoc = vi.fn(async () => undefined);
const setDoc = vi.fn(async () => undefined);
const deleteDoc = vi.fn(async () => undefined);

// admin.auth(): o trigger re-lê claims via getUser antes de decidir o default.
const setCustomUserClaims = vi.fn(async (_uid: string, _claims: AnyRec | null) => undefined);
const getUser = vi.fn(async (uid: string): Promise<AnyRec> => ({ uid, customClaims: undefined }));

/** Snapshot tolerante para qualquer get() (doc OU query) — sempre vazio. */
function emptySnap(): AnyRec {
  return {
    exists: false,
    empty: true,
    size: 0,
    docs: [],
    data: () => undefined,
    get: () => undefined,
  };
}

/** Query encadeável tolerante: where/limit/orderBy retornam a própria query;
 *  get resolve vazio. Absorve collection('tenants').where(...).get() do #11. */
function chainableQuery(): AnyRec {
  const q: AnyRec = {};
  q['where'] = () => q;
  q['limit'] = () => q;
  q['orderBy'] = () => q;
  q['get'] = async () => emptySnap();
  return q;
}

const docRef = {
  create: createDoc,
  set: setDoc,
  delete: deleteDoc,
  get: async () => emptySnap(),
};

// collection(name) devolve um objeto que é doc-source E query-source.
const collection = vi.fn((_name: string): AnyRec => {
  const base = chainableQuery();
  base['doc'] = vi.fn(() => docRef);
  return base;
});

function stubAdmin(): void {
  Object.defineProperty(admin, 'auth', {
    value: () => ({ setCustomUserClaims, getUser }),
    configurable: true,
  });
  Object.defineProperty(admin, 'firestore', {
    value: Object.assign(() => ({ collection }), {
      FieldValue: { serverTimestamp: () => '__ts__' },
    }),
    configurable: true,
  });
}

function run(user: AnyRec): Promise<unknown> {
  return (onCreateUser as unknown as { run: (u: AnyRec) => Promise<unknown> }).run(user);
}

beforeEach(() => {
  createDoc.mockReset().mockResolvedValue(undefined);
  setDoc.mockReset().mockResolvedValue(undefined);
  deleteDoc.mockReset().mockResolvedValue(undefined);
  setCustomUserClaims.mockReset().mockResolvedValue(undefined);
  getUser.mockReset().mockImplementation(async (uid: string) => ({ uid, customClaims: undefined }));
  collection.mockClear();
  stubAdmin();
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (admin as any).auth;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (admin as any).firestore;
});

describe('onCreateUser — E16 hardening: caminho code-6 / rethrow (achado #32)', () => {
  it('create() ALREADY_EXISTS (code 6) → trigger NÃO lança e ainda aplica role default (redelivery at-least-once)', async () => {
    createDoc.mockRejectedValueOnce(Object.assign(new Error('ALREADY_EXISTS'), { code: 6 }));

    // Não lança: o code-6 é engolido (doc já criado numa entrega anterior).
    await run({ uid: 'redeliver-1', email: 'a@leela.app', displayName: 'A Atleta' });

    // …e o default segue aplicado mesmo assim (order-agnostic: não assere
    // ordem create×getUser; só o efeito no claim). Merge-tolerante.
    expect(setCustomUserClaims).toHaveBeenCalledWith(
      'redeliver-1',
      expect.objectContaining({ role: 'athlete' })
    );
  });

  it('create() erro genérico (code 13) → trigger RE-LANÇA (rethrow preservado) e não aplica claim', async () => {
    createDoc.mockRejectedValueOnce(Object.assign(new Error('internal'), { code: 13 }));

    await expect(
      run({ uid: 'boom-1', email: 'x@leela.app', displayName: 'X Y' })
    ).rejects.toMatchObject({ code: 13 });

    // O rethrow acontece no passo de create — nenhum default é gravado
    // (invariante do achado; robusto à troca de ordem do fix #28).
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });
});
