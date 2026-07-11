/**
 * listarEventosDegradado.test.ts — F1 (review r1 antagonista).
 *
 * `parseEvento` é fail-fast (lança em janela/faixa/campo malformado). Na
 * LISTAGEM `listarEventosDoOrganizador`, um único doc envenenado NÃO pode
 * derrubar a lista inteira do tenant — cada doc é isolado e o que falha vira
 * placeholder degradado + telemetria (console.error com o id).
 *
 * firebase/firestore stubbado (sem emulator): `getDocs` é o único ponto de I/O;
 * o resto (collection/query/where/orderBy/limit/doc) é montagem de query.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
}));

import { getDocs, type Firestore } from 'firebase/firestore';
import { listarEventosDoOrganizador } from '@leela/api-client';

type Raw = Record<string, unknown>;
const fakeTs = { seconds: 1, nanoseconds: 0 };

/** Doc canônico da Meia Floripa (shape do seed) — parseia sem problema. */
function docBom(extra: Raw = {}): Raw {
  return {
    tenantId: 'castelo-producoes',
    organizadorId: 'uid-marina',
    nome: 'Meia Maratona Floripa 2026',
    data: fakeTs,
    local: 'Florianópolis/SC',
    modalidades: ['5k', '10k', '21k'],
    slug: 'meia-floripa-2026',
    status: 'publicado',
    usaChip: true,
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
    qtdInscritos: 453,
    receitaConfirmada: 85617,
    ...extra,
  };
}

function snapshotDe(
  docs: { id: string; data: () => Raw }[]
): Awaited<ReturnType<typeof getDocs>> {
  return { docs } as unknown as Awaited<ReturnType<typeof getDocs>>;
}

const params = { tenantId: 'castelo-producoes', organizadorId: 'uid-marina' };
const db = {} as unknown as Firestore;

describe('listarEventosDoOrganizador — isolamento por doc (F1 · review r1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('um doc ENVENENADO não derruba a lista — vira placeholder degradado + telemetria', async () => {
    // `janelasEntrega: [{ dia: 'amanhã' }]` passa nas Rules (is list && size<=30)
    // mas LANÇA no parseEvento. Antes do fix, matava a lista inteira do tenant.
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe([
        { id: 'meia-floripa-2026', data: () => docBom() },
        {
          id: 'corrida-serra',
          data: () => docBom({ nome: 'Corrida da Serra', janelasEntrega: [{ dia: 'amanhã' }] }),
        },
      ])
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const eventos = await listarEventosDoOrganizador(db, params);

    expect(eventos).toHaveLength(2);
    // o doc bom parseia normalmente
    expect(eventos[0]?.nome).toBe('Meia Maratona Floripa 2026');
    expect(eventos[0]?.status).toBe('publicado');
    // o envenenado degrada: identidade preservada, conteúdo problemático neutralizado
    const degradado = eventos[1];
    expect(degradado?.id).toBe('corrida-serra');
    expect(degradado?.tenantId).toBe('castelo-producoes');
    expect(degradado?.organizadorId).toBe('uid-marina');
    expect(degradado?.nome).toBe('Corrida da Serra'); // best-effort preservado
    expect(degradado?.janelasEntrega).toEqual([]); // fonte do defeito neutralizada
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('corrida-serra'),
      expect.anything()
    );
    errSpy.mockRestore();
  });

  it('doc sem nome legível cai no marcador degradado honesto', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe([{ id: 'x', data: () => docBom({ nome: '', faixaChips: { inicio: 9, fim: 1 } }) }])
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const eventos = await listarEventosDoOrganizador(db, params);

    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.nome).toBe('(evento com dados inválidos)');
    expect(eventos[0]?.faixaChips).toBeNull();
    errSpy.mockRestore();
  });

  it('lista toda VÁLIDA passa intacta, sem telemetria de erro', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotDe([{ id: 'meia-floripa-2026', data: () => docBom() }])
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const eventos = await listarEventosDoOrganizador(db, params);

    expect(eventos).toHaveLength(1);
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
