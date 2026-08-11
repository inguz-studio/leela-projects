// areaNav — tabela das 3 abas da área de Parcerias (D-1008-R17). Marcas é a
// raiz (o slot de rail que era dela); assessorias e afiliações migraram de
// clubs. Exatamente UMA ativa, href real em todas (âncora navegável).

import { describe, it, expect } from 'vitest';
import { parceriasAreaAtiva, parceriasAreaNavTabs, type ParceriasAreaId } from '../areaNav';

const ESPERADO: ReadonlyArray<[ParceriasAreaId, string, string]> = [
  ['marcas', 'Marcas', '/parcerias'],
  ['assessorias', 'Assessorias parceiras', '/parcerias/assessorias'],
  ['afiliacoes', 'Afiliações', '/parcerias/afiliacoes'],
];

describe('parceriasAreaNavTabs', () => {
  it('3 abas da decisão, na ordem, todas com href', () => {
    const tabs = parceriasAreaNavTabs('marcas');
    expect(tabs.map((t) => [t.id, t.label, t.href])).toEqual(
      ESPERADO.map(([id, label, href]) => [id, label, href]),
    );
  });

  for (const [id] of ESPERADO) {
    it(`ativa=${id}: exatamente uma aba ativa, e é a ${id}`, () => {
      const tabs = parceriasAreaNavTabs(id);
      expect(tabs.filter((t) => t.active).map((t) => t.id)).toEqual([id]);
    });
  }
});

// A aba ativa é derivada do pathname pela MOLDURA (ParceriasAreaLayout) —
// anatomia do D-1008-R16. Sub-rota herda a aba da entrada.
describe('parceriasAreaAtiva', () => {
  it.each([
    ['/parcerias', 'marcas'],
    ['/parcerias/assessorias', 'assessorias'],
    ['/parcerias/assessorias/nova', 'assessorias'],
    ['/parcerias/assessorias/p-1', 'assessorias'],
    ['/parcerias/afiliacoes', 'afiliacoes'],
    ['/parcerias/afiliacoes/minhas', 'afiliacoes'],
  ] as const)('%s → %s', (pathname, esperado) => {
    expect(parceriasAreaAtiva(pathname)).toBe(esperado);
  });

  it('prefixo não vira falso positivo: segmento parecido cai na raiz', () => {
    expect(parceriasAreaAtiva('/parcerias/afiliacoes-x')).toBe('marcas');
  });
});
