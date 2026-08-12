/**
 * adminVisaoOnda5Diretorio.test.ts — ADMIN-VISAO onda 5 · S1615-T1 · RN-540
 *
 * A MECÂNICA do reader do diretório de contas
 * (`packages/api-client/src/platform/diretorioContas.ts`): montagem de query,
 * clamp de página, cursor e contagem honesta. `firebase/firestore` STUBBADO —
 * mesmo molde de `adminVisaoOnda1Paginacao.test.ts`, sem emulator.
 *
 * O que este arquivo prova, e por quê:
 *   - o modo Fila filtra por `statusOnboarding` NO SERVIDOR (`where`), nunca
 *     peneirando página no cliente — peneira no cliente faz o contador mentir
 *     na primeira paginação (gate herdado da onda 4);
 *   - o modo Diretório não manda `where` nenhum;
 *   - NENHUM `orderBy` é montado: um `orderBy` cruzando outro campo exigiria
 *     índice composto novo, e `firestore.indexes.json` está fora do território
 *     desta lane;
 *   - `proxCursor` só é não-nulo quando a página veio CHEIA — nunca um total;
 *   - o clamp de `pageSize` em [1, 100] (sem ele, input adulterado varre a
 *     coleção de PII inteira num request — mesma disciplina do CRM);
 *   - campo ausente no doc vira '' / null / `undefined` declarado, e não um
 *     valor inventado (RN-540: nunca placeholder).
 *
 * A prova de que a RULE deixa o admin cruzar `profissionais`/`atletas`, e de
 * que `pessoas` e `collectionGroup` SEGUEM negados, vive em
 * `adminVisaoOnda5Rules.integration.test.ts` (emulator) — este arquivo é sobre
 * a mecânica, não sobre a Rule.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, path: string) => ({ __col: path })),
  getDocs: vi.fn(),
  limit: vi.fn((n: number) => ({ __limit: n })),
  query: vi.fn((...args: unknown[]) => ({ __query: args })),
  startAfter: vi.fn((cursor: unknown) => ({ __startAfter: cursor })),
  where: vi.fn((field: string, op: string, value: unknown) => ({
    __where: [field, op, value],
  })),
}));

import {
  collection,
  getDocs,
  limit,
  query,
  startAfter,
  where,
  type Firestore,
} from 'firebase/firestore';
import {
  DIRETORIO_CONTAS_PAGE_SIZE,
  listarAtletasPaginado,
  listarProfissionaisPaginado,
} from '@leela/api-client';

type Raw = Record<string, unknown>;
const fakeTs = { seconds: 1, nanoseconds: 0, toDate: () => new Date(0), toMillis: () => 0 };
const db = {} as unknown as Firestore;

function snapshotDe(ids: string[], data: (id: string) => Raw) {
  return {
    docs: ids.map((id) => ({ id, data: () => data(id) })),
  } as unknown as Awaited<ReturnType<typeof getDocs>>;
}

function profissionalDoc(id: string, over: Raw = {}): Raw {
  return {
    id,
    nome: `Pessoa ${id}`,
    email: `${id}@exemplo.com`,
    telefone: '48999990000',
    organizacao: 'Castelo Produções',
    statusOnboarding: 'aguardando_convite',
    criadoEm: fakeTs,
    ...over,
  };
}

function atletaDoc(id: string, over: Raw = {}): Raw {
  return {
    id,
    nome: `Atleta ${id}`,
    email: `${id}@exemplo.com`,
    criadoEm: fakeTs,
    ...over,
  };
}

/** Todos os construtores de constraint que a chamada usou. */
function constraintsDaChamada(): unknown[] {
  const args = vi.mocked(query).mock.calls[0] ?? [];
  return args.slice(1);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Modo Fila — o recorte que a RN-547 pede, no servidor
// ---------------------------------------------------------------------------

describe('listarProfissionaisPaginado — modo Fila (RN-547)', () => {
  it('filtra `statusOnboarding` no WHERE do servidor, não na tela', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe(['p1'], (id) => profissionalDoc(id)));

    await listarProfissionaisPaginado(db, { statusOnboarding: 'aguardando_convite' });

    expect(where).toHaveBeenCalledWith('statusOnboarding', '==', 'aguardando_convite');
    expect(collection).toHaveBeenCalledWith(db, 'profissionais');
  });

  it('sem `statusOnboarding` (modo Diretório) NÃO monta where algum', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe([], () => ({})));

    await listarProfissionaisPaginado(db, {});

    expect(where).not.toHaveBeenCalled();
  });

  it('devolve `statusOnboarding` — é o que separa os dois modos da tela', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe(['p1'], (id) => profissionalDoc(id, { statusOnboarding: 'ativo' }))
    );

    const r = await listarProfissionaisPaginado(db, {});

    expect(r.itens[0]?.statusOnboarding).toBe('ativo');
    expect(r.itens[0]?.papel).toBe('organizador');
  });
});

// ---------------------------------------------------------------------------
// Contagem honesta e cursor
// ---------------------------------------------------------------------------

describe('diretório de contas — contagem honesta (gate da onda)', () => {
  it('página CHEIA → proxCursor é o último doc (sinal de "pode ter mais")', async () => {
    const ids = Array.from({ length: DIRETORIO_CONTAS_PAGE_SIZE }, (_, i) => `p${i}`);
    vi.mocked(getDocs).mockResolvedValue(snapshotDe(ids, (id) => profissionalDoc(id)));

    const r = await listarProfissionaisPaginado(db, {});

    expect(r.itens).toHaveLength(DIRETORIO_CONTAS_PAGE_SIZE);
    expect(r.proxCursor).not.toBeNull();
    expect((r.proxCursor as unknown as { id: string }).id).toBe(
      `p${DIRETORIO_CONTAS_PAGE_SIZE - 1}`
    );
  });

  it('página PARCIAL → proxCursor null (fim de lista), e nenhum total é devolvido', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe(['p1', 'p2'], (id) => profissionalDoc(id))
    );

    const r = await listarProfissionaisPaginado(db, {});

    expect(r.proxCursor).toBeNull();
    expect(r).not.toHaveProperty('total');
  });

  it('cursor vira startAfter(snapshot) — paginação por snapshot, não por campo', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe([], () => ({})));
    const cursor = { id: 'p9' } as never;

    await listarAtletasPaginado(db, { cursor });

    expect(startAfter).toHaveBeenCalledWith(cursor);
  });
});

// ---------------------------------------------------------------------------
// Clamp e ausência de orderBy
// ---------------------------------------------------------------------------

describe('diretório de contas — teto de página e query mínima', () => {
  it.each([
    [500, 100],
    [0, 1],
    [-7, 1],
    [undefined, DIRETORIO_CONTAS_PAGE_SIZE],
  ])('pageSize %s → limit(%i)', async (entrada, esperado) => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe([], () => ({})));

    await listarProfissionaisPaginado(
      db,
      entrada === undefined ? {} : { pageSize: entrada }
    );

    expect(limit).toHaveBeenCalledWith(esperado);
  });

  it('NENHUM orderBy é montado (índice composto novo está fora do território)', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe([], () => ({})));

    await listarProfissionaisPaginado(db, { statusOnboarding: 'aguardando_convite' });

    const montadas = constraintsDaChamada();
    expect(montadas.some((c) => JSON.stringify(c ?? '').includes('orderBy'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Minimização e ausência honesta
// ---------------------------------------------------------------------------

describe('diretório de contas — campos mínimos, ausência declarada (RN-540)', () => {
  it('doc legado sem telefone/organizacao/status devolve vazio, null e undefined', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe(['p1'], () => ({ nome: 'Marina', email: 'marina@exemplo.com' }))
    );

    const r = await listarProfissionaisPaginado(db, {});

    expect(r.itens[0]).toEqual({
      id: 'p1',
      papel: 'organizador',
      nome: 'Marina',
      email: 'marina@exemplo.com',
      organizacao: '',
      telefone: '',
      statusOnboarding: undefined,
      criadoEm: null,
    });
  });

  it('`statusOnboarding` fora do domínio não é aceito como valor', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe(['p1'], (id) => profissionalDoc(id, { statusOnboarding: 'inventado' }))
    );

    const r = await listarProfissionaisPaginado(db, {});

    expect(r.itens[0]?.statusOnboarding).toBeUndefined();
  });

  it('atleta traz só id, papel, nome, e-mail e cadastro — sem organização nem telefone', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe(['a1'], (id) => atletaDoc(id)));

    const r = await listarAtletasPaginado(db, {});

    expect(collection).toHaveBeenCalledWith(db, 'atletas');
    expect(Object.keys(r.itens[0] ?? {}).sort()).toEqual([
      'criadoEm',
      'email',
      'id',
      'nome',
      'papel',
    ]);
    expect(r.itens[0]?.papel).toBe('atleta');
  });

  it('nenhuma das duas leituras devolve CPF — `pessoas` não é tocada aqui', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe(['p1'], (id) => profissionalDoc(id, { cpf: '11144477735' }))
    );

    const r = await listarProfissionaisPaginado(db, {});

    expect(JSON.stringify(r.itens)).not.toContain('11144477735');
    expect(r.itens[0]).not.toHaveProperty('cpf');
  });
});
