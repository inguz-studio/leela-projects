// =============================================================================
// Testes dos rótulos/derivações de equipe (S304-T3). O preview de remoção
// (§2.15) é derivado da matriz podeAcessar — provado célula a célula por papel.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { AREAS_EVENTO, PAPEIS_EVENTO, podeAcessar } from '@leela/core';
import { LABEL_AREA, LABEL_PAPEL, areasDoPapel, perdeAoRemover } from '../equipeLabels';

describe('labels completos', () => {
  it('todo papel e toda área têm rótulo', () => {
    for (const p of PAPEIS_EVENTO) expect(LABEL_PAPEL[p]).toBeTruthy();
    for (const a of AREAS_EVENTO) expect(LABEL_AREA[a]).toBeTruthy();
  });
});

describe('areasDoPapel — espelha a matriz', () => {
  it.each(PAPEIS_EVENTO)('%s', (papel) => {
    const esperado = AREAS_EVENTO.filter((a) => podeAcessar(papel, a));
    expect(areasDoPapel(papel)).toEqual(esperado);
  });
});

describe('perdeAoRemover', () => {
  it('organizador perde acesso às 7 áreas', () => {
    expect(perdeAoRemover('organizador')).toHaveLength(7);
  });
  it('administrador perde 6 áreas (sem financeiro)', () => {
    const perde = perdeAoRemover('administrador');
    expect(perde).toHaveLength(6);
    expect(perde).not.toContain('Acesso a Financeiro');
  });
  it('operador perde só Entrega e Inscritos', () => {
    expect(perdeAoRemover('operador')).toEqual(['Acesso a Entrega', 'Acesso a Inscritos']);
  });
  it('financeiro perde só Financeiro', () => {
    expect(perdeAoRemover('financeiro')).toEqual(['Acesso a Financeiro']);
  });
});
