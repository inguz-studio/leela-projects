// =============================================================================
// FormGrid — a grade de formulário.
//
// Os casos saem das oito receitas que o inventário de 2026-08-11 (§7.1) contou
// no painel: `grid-cols-1 sm:grid-cols-2` (30×), `sm:grid-cols-3` (10×),
// `lg:grid-cols-2` (10×) e mais cinco. Cada combinação testada aqui é uma
// delas.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormGrid } from '../FormGrid';

describe('FormGrid', () => {
  it('duas colunas a partir de sm, por default — a receita de 30 usos', () => {
    render(<FormGrid data-testid="g">campos</FormGrid>);
    const classes = screen.getByTestId('g').className;
    expect(classes).toContain('grid');
    expect(classes).toContain('grid-cols-1');
    expect(classes).toContain('sm:grid-cols-2');
    expect(classes).toContain('gap-[var(--layout-grid-gap)]');
  });

  it.each([
    [2, 'sm', 'sm:grid-cols-2'],
    [2, 'md', 'md:grid-cols-2'],
    [2, 'lg', 'lg:grid-cols-2'],
    [3, 'sm', 'sm:grid-cols-3'],
    [3, 'md', 'md:grid-cols-3'],
    [3, 'lg', 'lg:grid-cols-3'],
  ] as const)('columns=%s from=%s → %s', (columns, from, esperado) => {
    render(
      <FormGrid columns={columns} from={from} data-testid="g">
        x
      </FormGrid>,
    );
    expect(screen.getByTestId('g').className).toContain(esperado);
  });

  // A coluna única embaixo é CONTRATO, não default configurável: a escala do
  // preset é mobile-first e a tela que quisesse duas colunas em 390px estaria
  // decidindo contra o sistema.
  it('a coluna única no estreito é contrato — sempre presente', () => {
    render(
      <FormGrid columns={3} from="lg" data-testid="g">
        x
      </FormGrid>,
    );
    expect(screen.getByTestId('g').className).toContain('grid-cols-1');
  });

  it.each([
    ['sm', '--layout-list-gap'],
    ['md', '--layout-grid-gap'],
    ['lg', '--layout-main-gap'],
  ] as const)('gap="%s" resolve para %s', (gap, token) => {
    render(
      <FormGrid gap={gap} data-testid="g">
        x
      </FormGrid>,
    );
    expect(screen.getByTestId('g').className).toContain(`gap-[var(${token})]`);
  });

  it('renderiza a tag pedida por `as`', () => {
    render(
      <FormGrid as="fieldset" data-testid="g">
        x
      </FormGrid>,
    );
    expect(screen.getByTestId('g').tagName).toBe('FIELDSET');
  });

  it('aceita className — o campo de linha inteira entra por col-span-full', () => {
    render(
      <FormGrid data-testid="g">
        <div className="col-span-full" data-testid="full">
          observações
        </div>
      </FormGrid>,
    );
    expect(screen.getByTestId('full')).toHaveClass('col-span-full');
  });

  // As classes precisam ser LITERAIS no fonte: o JIT do Tailwind varre texto,
  // e uma classe montada em runtime não entra no bundle. Este caso trava a
  // regressão mais provável — alguém "simplificar" para template string.
  it('as classes responsivas são literais, não montadas em runtime', () => {
    render(
      <FormGrid columns={3} from="md" data-testid="g">
        x
      </FormGrid>,
    );
    const classes = screen.getByTestId('g').className;
    expect(classes).not.toMatch(/undefined|\[object/);
    expect(classes.split(' ')).toContain('md:grid-cols-3');
  });
});
