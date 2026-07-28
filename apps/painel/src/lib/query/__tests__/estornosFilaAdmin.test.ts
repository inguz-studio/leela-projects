// =============================================================================
// Fila admin de estornos — o fan-out sob ATAQUE (POLIMENTO-0728 · T1).
//
// A ESTORNO-REV escalou dois defeitos que só aparecem quando algo dá errado, e
// é justamente aí que uma tela de dinheiro alheio não pode desaparecer:
//
//   E-2a  `Promise.all` puro: UM ramo que rejeita derruba a fila inteira, e o
//         admin vê a tela de erro no lugar de 40 pendências que foram lidas.
//   E-2b  `criadoEm` chega do parser por cast cego; doc sem o campo estourava
//         DENTRO do sort — depois de todas as leituras terem dado certo.
//   E-1   os tetos (100 tenants / 50 eventos) cortavam em SILÊNCIO.
//
// Estas provas exercitam a `queryFn` de verdade, com o api-client falsificado
// nos três leitores do fan-out. Sem Firestore, sem emulador.
// =============================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ApiClient from '@leela/api-client';
import type { Timestamp } from '@leela/core';

const mocks = vi.hoisted(() => ({
  listTenants: vi.fn(),
  listarEventosDoTenant: vi.fn(),
  listReembolsos: vi.fn(),
}));

vi.mock('@leela/api-client', async (importOriginal) => {
  const real = await importOriginal<typeof ApiClient>();
  return {
    ...real,
    getLeelaDb: () => ({}),
    listTenants: mocks.listTenants,
    listarEventosDoTenant: mocks.listarEventosDoTenant,
    listReembolsos: mocks.listReembolsos,
  };
});

import {
  TETO_EVENTOS_POR_TENANT_FILA_ADMIN,
  TETO_TENANTS_FILA_ADMIN,
  estornosFilaAdminQuery,
  millisDoCriadoEm,
  type FilaEstornosAdmin,
} from '../queries';

function ts(millis: number): Timestamp {
  return { toMillis: () => millis, toDate: () => new Date(millis) } as unknown as Timestamp;
}

/** Doc de reembolso pendente, no shape que `listReembolsos` devolve. */
function reembolso(id: string, criadoEm: unknown, estado = 'em_analise') {
  return {
    id,
    tenantId: 'castelo',
    eventoId: 'ev-1',
    pedidoId: `ped-${id}`,
    inscritoId: id,
    motivo: 'desistência',
    estado,
    origem: 'organizador',
    valorSolicitado: 188.86,
    transicoes: [],
    criadoEm,
    atualizadoEm: ts(1),
  };
}

function tenant(id: string, nome = id) {
  return { id, nome };
}

function evento(id: string, nome = id) {
  return { id, nome };
}

/** Roda a `queryFn` REAL da fila (nada de reimplementar o fan-out no teste). */
async function rodarFila(): Promise<FilaEstornosAdmin> {
  const { queryFn } = estornosFilaAdminQuery(0) as unknown as {
    queryFn: (ctx: unknown) => Promise<FilaEstornosAdmin>;
  };
  return queryFn({});
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('fan-out da fila admin — isolamento por ramo (E-2)', () => {
  it('um EVENTO que falha vira aviso; os outros eventos continuam na fila', async () => {
    mocks.listTenants.mockResolvedValue([tenant('castelo')]);
    mocks.listarEventosDoTenant.mockResolvedValue([evento('ev-1'), evento('ev-2')]);
    mocks.listReembolsos.mockImplementation(async (_db: unknown, eventoId: string) => {
      if (eventoId === 'ev-1') throw new Error('permission-denied');
      return [reembolso('insc-2', ts(2_000))];
    });

    const fila = await rodarFila();

    expect(fila.itens).toHaveLength(1);
    expect(fila.itens[0]?.reembolso.inscritoId).toBe('insc-2');
    expect(fila.ramosComFalha).toBe(1);
  });

  it('um PRODUTOR inteiro que falha vira aviso; os outros produtores ficam', async () => {
    mocks.listTenants.mockResolvedValue([tenant('castelo'), tenant('arena')]);
    mocks.listarEventosDoTenant.mockImplementation(async (_db: unknown, tenantId: string) => {
      if (tenantId === 'castelo') throw new Error('unavailable');
      return [evento('ev-9')];
    });
    mocks.listReembolsos.mockResolvedValue([reembolso('insc-9', ts(9_000))]);

    const fila = await rodarFila();

    expect(fila.itens.map((i) => i.reembolso.inscritoId)).toEqual(['insc-9']);
    expect(fila.ramosComFalha).toBe(1);
  });

  it('TODOS os ramos falhando devolve fila vazia COM aviso — nunca "nada pendente" mudo', async () => {
    mocks.listTenants.mockResolvedValue([tenant('castelo'), tenant('arena')]);
    mocks.listarEventosDoTenant.mockRejectedValue(new Error('unavailable'));

    const fila = await rodarFila();

    expect(fila.itens).toHaveLength(0);
    expect(fila.ramosComFalha).toBe(2);
  });
});

describe('sort da fila — `criadoEm` corrompido (E-2b)', () => {
  it('doc sem `criadoEm` NÃO estoura o sort e continua visível, no fim da lista', async () => {
    mocks.listTenants.mockResolvedValue([tenant('castelo')]);
    mocks.listarEventosDoTenant.mockResolvedValue([evento('ev-1')]);
    mocks.listReembolsos.mockResolvedValue([
      reembolso('sem-data', undefined),
      reembolso('antigo', ts(1_000)),
      reembolso('novo', ts(5_000)),
      reembolso('data-quebrada', { toMillis: () => Number.NaN }),
    ]);

    const fila = await rodarFila();

    // Ordem: mais recentes primeiro; os ilegíveis por último, mas PRESENTES.
    expect(fila.itens.map((i) => i.reembolso.inscritoId).slice(0, 2)).toEqual(['novo', 'antigo']);
    expect(fila.itens.map((i) => i.reembolso.inscritoId)).toHaveLength(4);
    expect(fila.itens.map((i) => i.reembolso.inscritoId)).toContain('sem-data');
    expect(fila.itens.map((i) => i.reembolso.inscritoId)).toContain('data-quebrada');
    expect(fila.ramosComFalha).toBe(0);
  });

  it('millisDoCriadoEm devolve 0 para tudo que não sabe dizer as horas', () => {
    expect(millisDoCriadoEm(ts(1_234))).toBe(1_234);
    expect(millisDoCriadoEm(undefined)).toBe(0);
    expect(millisDoCriadoEm(null)).toBe(0);
    expect(millisDoCriadoEm({})).toBe(0);
    expect(millisDoCriadoEm('2026-07-28')).toBe(0);
    expect(millisDoCriadoEm({ toMillis: () => Number.NaN })).toBe(0);
    expect(millisDoCriadoEm({ toMillis: () => 'ontem' })).toBe(0);
  });
});

describe('tetos de leitura declarados (E-1 · item 52)', () => {
  it('leitura de produtores no teto marca `tenantsNoTeto`', async () => {
    mocks.listTenants.mockResolvedValue(
      Array.from({ length: TETO_TENANTS_FILA_ADMIN }, (_, i) => tenant(`t-${i}`)),
    );
    mocks.listarEventosDoTenant.mockResolvedValue([]);

    const fila = await rodarFila();

    expect(fila.tenantsNoTeto).toBe(true);
    expect(mocks.listTenants).toHaveBeenCalledWith(expect.anything(), {
      pageLimit: TETO_TENANTS_FILA_ADMIN,
    });
  });

  it('produtor com eventos no teto é NOMEADO — quem some primeiro é o mais antigo', async () => {
    mocks.listTenants.mockResolvedValue([tenant('castelo', 'Castelo Produções'), tenant('arena', 'Arena')]);
    mocks.listarEventosDoTenant.mockImplementation(async (_db: unknown, tenantId: string) =>
      tenantId === 'castelo'
        ? Array.from({ length: TETO_EVENTOS_POR_TENANT_FILA_ADMIN }, (_, i) => evento(`ev-${i}`))
        : [evento('ev-a')],
    );
    mocks.listReembolsos.mockResolvedValue([]);

    const fila = await rodarFila();

    expect(fila.tenantsNoTeto).toBe(false);
    expect(fila.tenantsComEventosNoTeto).toEqual(['Castelo Produções']);
    expect(mocks.listarEventosDoTenant).toHaveBeenCalledWith(
      expect.anything(),
      'castelo',
      TETO_EVENTOS_POR_TENANT_FILA_ADMIN,
    );
  });

  it('fila dentro dos tetos não inventa aviso nenhum', async () => {
    mocks.listTenants.mockResolvedValue([tenant('castelo')]);
    mocks.listarEventosDoTenant.mockResolvedValue([evento('ev-1')]);
    mocks.listReembolsos.mockResolvedValue([reembolso('insc-1', ts(1))]);

    const fila = await rodarFila();

    expect(fila).toMatchObject({
      ramosComFalha: 0,
      tenantsNoTeto: false,
      tenantsComEventosNoTeto: [],
    });
    expect(fila.itens).toHaveLength(1);
  });
});
