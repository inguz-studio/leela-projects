// =============================================================================
// MetricGrid — a grade de indicadores.
//
// As sete receitas medidas em 2026-08-11 (§7.1) divergiam em duas coisas: o
// degrau da última coluna (`md:` × `lg:`) e o ponto de partida (1 ou 2
// colunas). A primeira é gosto e sumiu; a segunda tem decisão escrita no
// preset (REDESIGN-V2 · item 6) e virou a escada fixa que estes casos travam.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricGrid } from '../MetricGrid';

describe('MetricGrid', () => {
  it('quatro indicadores por default, na escada do preset', () => {
    render(<MetricGrid data-testid="g">kpis</MetricGrid>);
    const classes = screen.getByTestId('g').className;
    expect(classes).toContain('grid');
    expect(classes).toContain('grid-cols-1');
    expect(classes).toContain('xs:grid-cols-2');
    expect(classes).toContain('lg:grid-cols-4');
  });

  // A razão de `xs` existir na escala é este bloco: abaixo de 480 o rótulo do
  // KPI corta, então a fileira vira coluna única (comentário do
  // tailwind-preset.ts). Republicar `grid-cols-2` desde 0px seria desfazer a
  // decisão sem registro.
  it('parte de UMA coluna abaixo de xs — a decisão do REDESIGN-V2 item 6', () => {
    render(
      <MetricGrid columns={4} data-testid="g">
        x
      </MetricGrid>,
    );
    const classes = screen.getByTestId('g').className.split(' ');
    expect(classes).toContain('grid-cols-1');
    expect(classes).toContain('xs:grid-cols-2');
    expect(classes).not.toContain('grid-cols-2');
  });

  it.each([
    [2, null],
    [3, 'lg:grid-cols-3'],
    [4, 'lg:grid-cols-4'],
  ] as const)('columns=%s', (columns, esperado) => {
    render(
      <MetricGrid columns={columns} data-testid="g">
        x
      </MetricGrid>,
    );
    const classes = screen.getByTestId('g').className;
    if (esperado === null) {
      // Dois indicadores param em 2 colunas: não há terceiro degrau.
      expect(classes).not.toContain('lg:grid-cols-');
    } else {
      expect(classes).toContain(esperado);
    }
  });

  it.each([
    ['sm', '--layout-list-gap'],
    ['md', '--layout-grid-gap'],
    ['lg', '--layout-main-gap'],
  ] as const)('gap="%s" resolve para %s', (gap, token) => {
    render(
      <MetricGrid gap={gap} data-testid="g">
        x
      </MetricGrid>,
    );
    expect(screen.getByTestId('g').className).toContain(`gap-[var(${token})]`);
  });

  it('renderiza a tag pedida por `as`', () => {
    render(
      <MetricGrid as="ul" data-testid="g">
        <li>um</li>
      </MetricGrid>,
    );
    expect(screen.getByTestId('g').tagName).toBe('UL');
  });

  it('aceita className e props nativas', () => {
    render(
      <MetricGrid className="teste-kpis" aria-label="indicadores" data-testid="g">
        x
      </MetricGrid>,
    );
    expect(screen.getByTestId('g')).toHaveClass('teste-kpis');
    expect(screen.getByTestId('g')).toHaveAttribute('aria-label', 'indicadores');
  });
});
