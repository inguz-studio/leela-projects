// =============================================================================
// SplitPanel — o bento assimétrico de dois painéis.
//
// As três proporções testadas são as três medidas em 2026-08-11 (§7.1):
// 3fr_2fr (4×), 7fr_3fr (3×), 1fr_3fr (1×). O caso final trava o que importa
// mais que o resto: a proporção sai de TOKEN, não de classe arbitrária — foi
// a classe arbitrária que produziu cinco receitas para uma família.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import { SplitPanel } from '../SplitPanel';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('SplitPanel', () => {
  it('empilha no estreito e abre em 3:2 a partir de lg, por default', () => {
    render(
      <SplitPanel data-testid="p">
        <div>principal</div>
        <div>apoio</div>
      </SplitPanel>,
    );
    const classes = screen.getByTestId('p').className;
    expect(classes).toContain('grid');
    expect(classes).toContain('grid-cols-1');
    expect(classes).toContain('lg:grid-cols-[var(--layout-split-3-2)]');
  });

  it.each([
    ['3:2', '--layout-split-3-2'],
    ['7:3', '--layout-split-7-3'],
    ['1:3', '--layout-split-1-3'],
  ] as const)('ratio="%s" usa o token %s', (ratio, token) => {
    render(
      <SplitPanel ratio={ratio} data-testid="p">
        <div>a</div>
        <div>b</div>
      </SplitPanel>,
    );
    expect(screen.getByTestId('p').className).toContain(`lg:grid-cols-[var(${token})]`);
  });

  // `lg` é o ponto de colapso do shell declarado no preset: abaixo dele sobram
  // menos de 784px de conteúdo e dois painéis lado a lado não cabem. Por isso
  // o degrau não é prop — e este caso impede que vire uma.
  it('o degrau é lg em todas as proporções — não há bento no celular', () => {
    for (const ratio of ['3:2', '7:3', '1:3'] as const) {
      const { unmount } = render(
        <SplitPanel ratio={ratio} data-testid="p">
          <div>a</div>
          <div>b</div>
        </SplitPanel>,
      );
      const classes = screen.getByTestId('p').className;
      expect(classes).toContain('lg:grid-cols-');
      expect(classes).not.toMatch(/\b(sm|md):grid-cols-/);
      unmount();
    }
  });

  it('renderiza a tag pedida por `as`', () => {
    render(
      <SplitPanel as="section" data-testid="p">
        <div>a</div>
        <div>b</div>
      </SplitPanel>,
    );
    expect(screen.getByTestId('p').tagName).toBe('SECTION');
  });

  // A prova de que a fração é decisão do SISTEMA e não de cada tela: os três
  // tokens existem nos três temas gerados. Sem isto, `grid-cols-[var(--x)]`
  // com o token ausente colapsa silenciosamente para uma coluna.
  it.each(['brasa.css', 'wine.css', 'dark-wine.css'])(
    'as três proporções existem como token em %s',
    (arquivo) => {
      const css = readFileSync(resolve(PKG, 'themes', arquivo), 'utf8');
      expect(css).toContain('--layout-split-3-2: 3fr 2fr;');
      expect(css).toContain('--layout-split-7-3: 7fr 3fr;');
      expect(css).toContain('--layout-split-1-3: 1fr 3fr;');
    },
  );
});
