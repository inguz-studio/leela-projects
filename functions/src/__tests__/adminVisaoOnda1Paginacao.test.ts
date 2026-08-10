/**
 * adminVisaoOnda1Paginacao.test.ts — ADMIN-VISAO onda 1 (backend, sem pixel)
 *
 * Gate da onda (04-fila-build.md): "as leituras paginadas devolvem contagem
 * honesta (nada de total truncado apresentado como total)". Cobre as SEIS
 * leituras novas de `packages/api-client/src/platform/` desta onda:
 *   - S1612-T2: listarEventosDoTenantPaginado, listarClubesDoTenantPaginado
 *   - S1613-T1: listarPedidosDoTenantPaginado, listarPagamentosDoTenantPaginado
 *   - S1614-T1: listarEventosGlobalPaginado, listarClubesGlobalPaginado
 *
 * `firebase/firestore` STUBBADO (sem emulator — mesmo molde de
 * `listarEventosDegradado.test.ts`): `getDocs` é o único ponto de I/O; o
 * resto (collection/query/where/limit/startAfter) é montagem de query, e é
 * exatamente essa montagem que este arquivo prova — o contrato
 * `{itens, proxCursor}` nunca inventa um total, `proxCursor` só é não-nulo
 * quando a página veio CHEIA (sinal honesto de "pode ter mais"), e o filtro
 * de tenant/cursor chega correto ao Firestore.
 *
 * A prova de que a RULE deixa o admin cruzar a fronteira (eventos :744,
 * clubes :2018, pagamentos :2530, pedidos :2671) e a auditoria do callable
 * de clientes vivem em `adminVisaoOnda1.integration.test.ts` (emulator) —
 * este arquivo é sobre a MECÂNICA de paginação, não sobre a Rule.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ __col: true })),
  getDocs: vi.fn(),
  limit: vi.fn((n: number) => ({ __limit: n })),
  query: vi.fn((...args: unknown[]) => ({ __query: args })),
  startAfter: vi.fn((cursor: unknown) => ({ __startAfter: cursor })),
  where: vi.fn((field: string, op: string, value: unknown) => ({
    __where: [field, op, value],
  })),
}));

import { getDocs, limit, query, startAfter, where, type Firestore } from 'firebase/firestore';
import {
  listarClubesDoTenantPaginado,
  listarEventosDoTenantPaginado,
} from '@leela/api-client';
import {
  listarPagamentosDoTenantPaginado,
  listarPedidosDoTenantPaginado,
} from '@leela/api-client';
import {
  listarClubesGlobalPaginado,
  listarEventosGlobalPaginado,
} from '@leela/api-client';

type Raw = Record<string, unknown>;
const fakeTs = { seconds: 1, nanoseconds: 0 };
const db = {} as unknown as Firestore;

function snapshotDe(ids: string[], data: (id: string) => Raw) {
  return {
    docs: ids.map((id) => ({ id, data: () => data(id) })),
  } as unknown as Awaited<ReturnType<typeof getDocs>>;
}

function eventoDoc(id: string, tenantId = 'castelo-producoes'): Raw {
  return {
    tenantId,
    organizadorId: 'uid-marina',
    nome: `Evento ${id}`,
    data: fakeTs,
    local: 'Florianópolis/SC',
    modalidades: ['10k'],
    slug: id,
    status: 'publicado',
    usaChip: false,
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
    qtdInscritos: 0,
    receitaConfirmada: 0,
  };
}

function clubeDoc(id: string, tenantId = 'castelo-producoes'): Raw {
  return { tenantId, nome: `Clube ${id}`, slug: id };
}

function pedidoDoc(_id: string, tenantId = 'castelo-producoes'): Raw {
  return {
    tenantId,
    eventoId: 'ev-1',
    responsavel: { atletaId: 'atleta-x', nome: 'X', email: 'x@x.com' },
    inscritoRefs: ['i1'],
    itens: [{ inscritoRef: 'i1', valorBase: 100, desconto: 0, valorFinal: 100 }],
    pagamentoRef: 'pag-1',
    valorTotal: 100,
    status: 'pago',
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
  };
}

function pagamentoDoc(_id: string, tenantId = 'castelo-producoes'): Raw {
  return {
    tenantId,
    eventoId: 'ev-1',
    pedidoRef: 'ped-1',
    status: 'confirmado',
    forma: 'pix',
    valorBase: 100,
    desconto: 0,
    valorFinal: 100,
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
    pagoEm: fakeTs,
    conciliacao: {
      idTransacao: 'txn-1',
      gateway: 'asaas',
      taxaValor: 10,
      repasseOrganizador: 90,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// S1612-T2 — eventos/clubs por tenant
// ---------------------------------------------------------------------------

describe('listarEventosDoTenantPaginado — contagem honesta (S1612-T2)', () => {
  it('página CHEIA (docs.length === pageSize) → proxCursor é o último doc', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe(['e1', 'e2'], (id) => eventoDoc(id))
    );
    const res = await listarEventosDoTenantPaginado(db, 'castelo-producoes', {
      pageSize: 2,
    });
    expect(res.itens).toHaveLength(2);
    expect(res.proxCursor).not.toBeNull();
    expect((res.proxCursor as unknown as { id: string }).id).toBe('e2');
  });

  it('página PARCIAL (docs.length < pageSize) → proxCursor null (fim honesto, NUNCA total inventado)', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe(['e1'], (id) => eventoDoc(id)));
    const res = await listarEventosDoTenantPaginado(db, 'castelo-producoes', {
      pageSize: 20,
    });
    expect(res.itens).toHaveLength(1);
    expect(res.proxCursor).toBeNull();
  });

  it('filtra por tenantId — nunca a fonte de outro tenant', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe([], () => ({})));
    await listarEventosDoTenantPaginado(db, 'castelo-producoes');
    expect(where).toHaveBeenCalledWith('tenantId', '==', 'castelo-producoes');
  });

  it('SEM orderBy — nenhum índice composto novo exigido (disciplina de listarEventosDoTenant)', async () => {
    // `firebase/firestore` está mockado SEM `orderBy` (ver vi.mock no topo).
    // Se a implementação chamasse `orderBy(...)`, este teste lançaria
    // "orderBy is not a function" — passar prova, por construção, que a
    // query não depende de um índice composto novo (só o de campo único de
    // `tenantId`, automático).
    vi.mocked(getDocs).mockResolvedValue(snapshotDe([], () => ({})));
    const res = await listarEventosDoTenantPaginado(db, 'castelo-producoes');
    expect(res.itens).toEqual([]);
    expect(query).toHaveBeenCalled();
  });

  it('cursor → startAfter chamado com o cursor recebido', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe([], () => ({})));
    const cursorFake = { id: 'e1' } as never;
    await listarEventosDoTenantPaginado(db, 'castelo-producoes', {
      cursor: cursorFake,
    });
    expect(startAfter).toHaveBeenCalledWith(cursorFake);
  });

  it('clamp de pageSize hostil: 0 vira 1, 9999 vira o teto de 100', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe([], () => ({})));
    await listarEventosDoTenantPaginado(db, 'castelo-producoes', { pageSize: 0 });
    expect(limit).toHaveBeenCalledWith(1);
    vi.mocked(limit).mockClear();
    await listarEventosDoTenantPaginado(db, 'castelo-producoes', { pageSize: 9999 });
    expect(limit).toHaveBeenCalledWith(100);
  });
});

describe('listarClubesDoTenantPaginado — contagem honesta (S1612-T2)', () => {
  it('página cheia → proxCursor não-nulo; parcial → null', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe(['c1', 'c2'], (id) => clubeDoc(id))
    );
    const cheia = await listarClubesDoTenantPaginado(db, 'castelo-producoes', {
      pageSize: 2,
    });
    expect(cheia.proxCursor).not.toBeNull();

    vi.mocked(getDocs).mockResolvedValue(snapshotDe(['c1'], (id) => clubeDoc(id)));
    const parcial = await listarClubesDoTenantPaginado(db, 'castelo-producoes', {
      pageSize: 20,
    });
    expect(parcial.proxCursor).toBeNull();
    expect(parcial.itens[0]?.nome).toBe('Clube c1');
  });

  it('filtra por tenantId', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe([], () => ({})));
    await listarClubesDoTenantPaginado(db, 'passo-certo');
    expect(where).toHaveBeenCalledWith('tenantId', '==', 'passo-certo');
  });
});

// ---------------------------------------------------------------------------
// S1613-T1 — pedidos/pagamentos por tenant (economia lida do carimbo)
// ---------------------------------------------------------------------------

describe('listarPedidosDoTenantPaginado — contagem honesta (S1613-T1)', () => {
  it('página cheia → proxCursor não-nulo; parcial → null', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe(['p1', 'p2'], (id) => pedidoDoc(id))
    );
    const res = await listarPedidosDoTenantPaginado(db, 'castelo-producoes', {
      pageSize: 2,
    });
    expect(res.proxCursor).not.toBeNull();
    expect(res.itens).toHaveLength(2);
  });

  it('filtra por tenantId, sem orderBy (índice composto de pedidos.ts é por evento, não por tenant inteiro)', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe([], () => ({})));
    await listarPedidosDoTenantPaginado(db, 'castelo-producoes');
    expect(where).toHaveBeenCalledWith('tenantId', '==', 'castelo-producoes');
  });
});

describe('listarPagamentosDoTenantPaginado — economia lida do carimbo, sem recálculo (RN-537)', () => {
  it('conciliacao vem EXATAMENTE como gravada — nenhuma soma/reconstrução aqui', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe(['pag1'], (id) => pagamentoDoc(id))
    );
    const res = await listarPagamentosDoTenantPaginado(db, 'castelo-producoes');
    expect(res.itens[0]?.conciliacao).toEqual({
      idTransacao: 'txn-1',
      gateway: 'asaas',
      taxaValor: 10,
      repasseOrganizador: 90,
    });
  });

  it('página parcial → proxCursor null (nunca finge que a lista continua)', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe(['pag1'], (id) => pagamentoDoc(id))
    );
    const res = await listarPagamentosDoTenantPaginado(db, 'castelo-producoes', {
      pageSize: 50,
    });
    expect(res.proxCursor).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// S1614-T1 — listas globais (cross-tenant, contagem honesta)
// ---------------------------------------------------------------------------

describe('listarEventosGlobalPaginado — cross-tenant, contagem honesta (S1614-T1)', () => {
  it('SEM filtro de tenant — devolve doc de QUALQUER tenant (é a lista global)', async () => {
    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        { id: 'e1', data: () => eventoDoc('e1', 'castelo-producoes') },
        { id: 'e2', data: () => eventoDoc('e2', 'passo-certo') },
      ],
    } as unknown as Awaited<ReturnType<typeof getDocs>>);
    const res = await listarEventosGlobalPaginado(db);
    expect(res.itens.map((e) => e.tenantId).sort()).toEqual([
      'castelo-producoes',
      'passo-certo',
    ]);
    // Nenhum `where('tenantId', ...)` foi chamado nesta leitura
    expect(where).not.toHaveBeenCalledWith('tenantId', expect.anything(), expect.anything());
  });

  it('filtro opcional de status usa where — sem quebrar a ausência de índice composto (single-field)', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe([], () => ({})));
    await listarEventosGlobalPaginado(db, { status: 'publicado' });
    expect(where).toHaveBeenCalledWith('status', '==', 'publicado');
  });

  it('página cheia → proxCursor não-nulo; parcial → null', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe(['e1', 'e2', 'e3'], (id) => eventoDoc(id))
    );
    const cheia = await listarEventosGlobalPaginado(db, { pageSize: 3 });
    expect(cheia.proxCursor).not.toBeNull();

    vi.mocked(getDocs).mockResolvedValue(snapshotDe(['e1'], (id) => eventoDoc(id)));
    const parcial = await listarEventosGlobalPaginado(db, { pageSize: 3 });
    expect(parcial.proxCursor).toBeNull();
  });
});

describe('listarClubesGlobalPaginado — cross-tenant, contagem honesta (S1614-T1)', () => {
  it('devolve clubs de tenants diferentes na mesma página', async () => {
    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        { id: 'c1', data: () => clubeDoc('c1', 'castelo-producoes') },
        { id: 'c2', data: () => clubeDoc('c2', 'passo-certo') },
      ],
    } as unknown as Awaited<ReturnType<typeof getDocs>>);
    const res = await listarClubesGlobalPaginado(db);
    expect(res.itens.map((c) => c.tenantId).sort()).toEqual([
      'castelo-producoes',
      'passo-certo',
    ]);
  });

  it('página parcial → proxCursor null', async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshotDe(['c1'], (id) => clubeDoc(id)));
    const res = await listarClubesGlobalPaginado(db, { pageSize: 20 });
    expect(res.proxCursor).toBeNull();
  });
});
