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
  it('operador perde só Credenciamento e Inscritos', () => {
    expect(perdeAoRemover('operador')).toEqual(['Acesso a Credenciamento', 'Acesso a Inscritos']);
  });
  it('financeiro perde só Financeiro', () => {
    expect(perdeAoRemover('financeiro')).toEqual(['Acesso a Financeiro']);
  });
});

// ---------------------------------------------------------------------------
// Virada de vocabulário (S211-T2 · RN-399)
// ---------------------------------------------------------------------------

describe('RN-399 — rótulo da área vira Credenciamento, id fica `entrega`', () => {
  it('o rótulo lido pelo organizador é Credenciamento', () => {
    expect(LABEL_AREA.entrega).toBe('Credenciamento');
  });

  it('o ID da área segue `entrega` na matriz canônica do core', () => {
    // Se este teste quebrar, alguém renomeou a área de permissão junto com o
    // rótulo — o que a RN-399 proíbe explicitamente (mexe na matriz de papéis
    // e no `RequirePapel area="entrega"`).
    expect(AREAS_EVENTO).toContain('entrega');
    expect(AREAS_EVENTO).not.toContain('credenciamento');
  });

  it('a matriz de acesso do operador não mudou de comportamento', () => {
    // RN-205/221/222 intactas: quem acessava o balcão continua acessando.
    expect(podeAcessar('operador', 'entrega')).toBe(true);
    expect(podeAcessar('financeiro', 'entrega')).toBe(false);
  });
});
