// areaNav — tabela das 5 entradas da área de clubs (D-1008-R9). O menu que
// substituiu os botões soltos do hub: mesma ordem dos botões, "Clubes" na
// frente, exatamente UMA ativa, href real em todas (âncora navegável).

import { describe, it, expect } from 'vitest';
import { clubesAreaNavTabs, type ClubesAreaId } from '../areaNav';

const ESPERADO: ReadonlyArray<[ClubesAreaId, string, string]> = [
  ['clubes', 'Clubes', '/clubes'],
  ['engajamento', 'Engajamento', '/clubes/engajamento'],
  ['minhas-afiliacoes', 'Minhas afiliações', '/clubes/minhas-afiliacoes'],
  ['influenciadores', 'Influenciadores', '/clubes/influenciadores'],
  ['assessorias', 'Assessorias parceiras', '/clubes/assessorias'],
];

describe('clubesAreaNavTabs', () => {
  it('5 entradas, na ordem dos botões que o menu substituiu, todas com href', () => {
    const tabs = clubesAreaNavTabs('clubes');
    expect(tabs.map((t) => [t.id, t.label, t.href])).toEqual(
      ESPERADO.map(([id, label, href]) => [id, label, href]),
    );
  });

  for (const [id] of ESPERADO) {
    it(`ativa=${id}: exatamente uma entrada ativa, e é a ${id}`, () => {
      const tabs = clubesAreaNavTabs(id);
      expect(tabs.filter((t) => t.active).map((t) => t.id)).toEqual([id]);
    });
  }
});
