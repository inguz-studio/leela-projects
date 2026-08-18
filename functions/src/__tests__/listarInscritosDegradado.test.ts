/**
 * listarInscritosDegradado.test.ts — F1 na lista de INSCRITOS
 * (INSCRITOS-READ-FIX · 17/08).
 *
 * `parseInscrito` é fail-fast e CONTINUA fail-fast: é o contrato do doc e a
 * guarda do dinheiro. O que não podia continuar é a LISTAGEM morrer inteira por
 * causa de um doc: `snap.docs.map(parseInscrito)` derrubava as 336 linhas do
 * evento por causa de UMA inscrição fora do shape (o caso real: os 8
 * `estornado` sem `estornadoEm` do seed do mock, que apagaram a aba Inscritos e
 * penduraram o Credenciamento em skeleton eterno).
 *
 * O doc do teste é o do SEED, sem retoque — é a prova de que o resgate cobre o
 * shape que a escrita fora das Rules produz (Admin SDK não passa pelas Rules; e
 * a própria Rule de cliente é mais LARGA que o parse, então produção alcança a
 * mesma classe de doc sem bug nenhum de Function).
 *
 * firebase/firestore stubbado (sem emulator): `getDocs`/`onSnapshot` são os
 * únicos pontos de I/O; o resto é montagem de query. Molde:
 * `listarEventosDegradado.test.ts`.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDocs: vi.fn(),
  limit: vi.fn(() => ({})),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  startAfter: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
}));

import { getDocs, onSnapshot, type Firestore } from 'firebase/firestore';
import {
  listarInscritos,
  listarInscritosRecentes,
  observarInscritos,
} from '@leela/api-client';
import type { Inscrito, Timestamp } from '@leela/core';

type Raw = Record<string, unknown>;

const fakeTs = {
  seconds: 1,
  nanoseconds: 0,
  toDate: () => new Date(1000),
  toMillis: () => 1000,
} as unknown as Timestamp;

/** Doc canônico de inscrito (shape do seed) — parseia sem problema. */
function docBom(extra: Raw = {}): Raw {
  return {
    tenantId: 'castelo-producoes',
    atletaId: 'mock-atleta-0001',
    atletaNome: 'Marina Bittencourt',
    kit: 'kit_basico',
    status: 'confirmado',
    modalidade: '5k',
    chipNumero: null,
    tamanhos: { 'camiseta-campeche': 'G' },
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
    ...extra,
  };
}

/**
 * O doc EXATO que o seed do mock escreve para uma inscrição estornada: status
 * no enum, todo campo legível, e nenhum `estornadoEm` — a coerência entre
 * campos é o que falha, não o shape de nenhum campo isolado.
 */
function docEstornadoSemCarimbo(): Raw {
  return docBom({
    atletaNome: 'Otávio Bittencourt',
    status: 'estornado',
    pedidoRef: 'mock-ped-0016',
    ehResponsavel: true,
    kitEntregueEm: fakeTs,
    checkinEm: fakeTs,
  });
}

function snapshotDe(docs: { id: string; data: () => Raw }[]): Awaited<ReturnType<typeof getDocs>> {
  return { docs } as unknown as Awaited<ReturnType<typeof getDocs>>;
}

const db = {} as unknown as Firestore;

describe('listagem de inscritos — isolamento por doc (F1 · INSCRITOS-READ-FIX)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doc do SEED (estornado sem carimbo) não derruba a página — degrada nomeado', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe([
        { id: 'mock-insc-0001', data: () => docBom() },
        { id: 'mock-insc-0004', data: () => docEstornadoSemCarimbo() },
        { id: 'mock-insc-0005', data: () => docBom({ atletaNome: 'Ana Souza' }) },
      ])
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { itens } = await listarInscritos(db, 'mock-campeche-run');

    // A LISTA INTEIRA sobrevive — era isso que morria.
    expect(itens).toHaveLength(3);
    expect(itens[0]?.atletaNome).toBe('Marina Bittencourt');
    expect(itens[2]?.atletaNome).toBe('Ana Souza');

    const degradado = itens[1] as Inscrito;
    expect(degradado.id).toBe('mock-insc-0004');
    expect(degradado.tenantId).toBe('castelo-producoes');
    // Identidade e status PRESERVADOS: o defeito é de coerência entre campos,
    // e mentir o status moveria uma inscrição devolvida para dentro do
    // denominador de dinheiro (D-1008-R19).
    expect(degradado.atletaNome).toBe('Otávio Bittencourt');
    expect(degradado.status).toBe('estornado');
    expect(degradado.modalidade).toBe('5k');
    // Carimbos de operação sobrevivem — zerá-los mandaria o balcão entregar
    // o mesmo kit duas vezes.
    expect(degradado.kitEntregueEm).toBeDefined();
    expect(degradado.checkinEm).toBeDefined();
    // Bloco aninhado (fonte provável do defeito) neutralizado, não propagado.
    expect(degradado.tamanhos).toEqual({});

    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('mock-insc-0004'),
      expect.anything()
    );
    errSpy.mockRestore();
  });

  it('doc que as Rules aceitam e o parse recusa (sem atletaNome) vira marcador honesto', async () => {
    // `firestore.rules` (match eventos/{id}/inscritos) NÃO exige atletaNome no
    // create de cliente — só tenantId + kit/status no enum + chip nulo. Um
    // organizador cria este doc pela porta sancionada, em PRODUÇÃO.
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe([{ id: 'insc-sem-nome', data: () => docBom({ atletaNome: '' }) }])
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { itens } = await listarInscritos(db, 'mock-campeche-run');

    expect(itens).toHaveLength(1);
    expect(itens[0]?.atletaNome).toBe('(inscrito com dados inválidos)');
    expect(itens[0]?.id).toBe('insc-sem-nome');
    errSpy.mockRestore();
  });

  it('o feed de recentes (Overview) degrada pelo MESMO caminho', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe([
        { id: 'mock-insc-0004', data: () => docEstornadoSemCarimbo() },
        { id: 'mock-insc-0001', data: () => docBom() },
      ])
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const itens = await listarInscritosRecentes(db, 'mock-campeche-run', 6);

    expect(itens).toHaveLength(2);
    expect(itens[1]?.atletaNome).toBe('Marina Bittencourt');
    errSpy.mockRestore();
  });

  it('lista toda VÁLIDA passa intacta, sem telemetria de erro', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe([{ id: 'mock-insc-0001', data: () => docBom() }])
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { itens } = await listarInscritos(db, 'mock-campeche-run');

    expect(itens).toHaveLength(1);
    expect(itens[0]?.tamanhos).toEqual({ 'camiseta-campeche': 'G' });
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('observarInscritos — o balcão nunca fica em silêncio (INSCRITOS-READ-FIX)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Captura o `next`/`error` que o observador registrou no onSnapshot. */
  function handlersRegistrados(): {
    next: (snap: unknown) => void;
    erro: (err: Error) => void;
  } {
    const chamada = vi.mocked(onSnapshot).mock.calls[0] as unknown as [
      unknown,
      (snap: unknown) => void,
      (err: Error) => void,
    ];
    return { next: chamada[1], erro: chamada[2] };
  }

  it('doc envenenado no snapshot ENTREGA o pool degradado — não trava o listener', () => {
    vi.mocked(onSnapshot).mockReturnValue(() => undefined);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const next = vi.fn();
    const error = vi.fn();

    observarInscritos(db, 'mock-campeche-run', { next, error });
    handlersRegistrados().next(
      snapshotDe([
        { id: 'mock-insc-0001', data: () => docBom() },
        { id: 'mock-insc-0004', data: () => docEstornadoSemCarimbo() },
      ])
    );

    // ANTES: o map lançava DENTRO do callback do SDK, `next` nunca era
    // chamado, `error` também não, e o balcão ficava em dois skeletons para
    // sempre — 20s sem texto, sem erro, sem saída.
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toHaveLength(2);
    expect(error).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('falha inesperada no snapshot vira ERRO VISÍVEL, nunca skeleton eterno', () => {
    vi.mocked(onSnapshot).mockReturnValue(() => undefined);
    const error = vi.fn();
    // Consumidor que explode: representa qualquer defeito futuro no caminho —
    // a regra é que ele apareça como erro na tela, não como espera infinita.
    const next = vi.fn(() => {
      throw new Error('boom no consumidor');
    });

    observarInscritos(db, 'mock-campeche-run', { next, error });
    handlersRegistrados().next(snapshotDe([{ id: 'mock-insc-0001', data: () => docBom() }]));

    expect(error).toHaveBeenCalledTimes(1);
    expect((error.mock.calls[0]?.[0] as Error).message).toContain('boom no consumidor');
  });

  it('erro de TRANSPORTE segue chegando pelo canal de erro do onSnapshot', () => {
    vi.mocked(onSnapshot).mockReturnValue(() => undefined);
    const error = vi.fn();

    observarInscritos(db, 'mock-campeche-run', { next: vi.fn(), error });
    handlersRegistrados().erro(new Error('permission-denied'));

    expect(error).toHaveBeenCalledTimes(1);
  });
});
