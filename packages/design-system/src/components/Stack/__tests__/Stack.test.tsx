// =============================================================================
// Stack — o empilhamento com ritmo de token.
//
// Cada caso abaixo é um vetor de reincidência real, não exemplo inventado: os
// gaps testados são os seis que a medição de 2026-08-11 encontrou escritos à
// mão no painel (448 ocorrências de `flex flex-col gap-*`).
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stack } from '../Stack';

describe('Stack', () => {
  it('empilha em coluna com o ritmo da moldura por default', () => {
    render(<Stack data-testid="s">conteúdo</Stack>);
    const el = screen.getByTestId('s');
    expect(el.className).toContain('flex flex-col');
    // O default é `--layout-stack-gap`, o ritmo que a moldura da página já
    // declarava — o primitivo herda a decisão, não inventa a sua.
    expect(el.className).toContain('gap-[var(--layout-stack-gap)]');
  });

  it.each([
    ['none', '--spacing-0'],
    ['xs', '--spacing-1'],
    ['sm', '--layout-list-gap'],
    ['md', '--spacing-3'],
    ['lg', '--layout-stack-gap'],
    ['xl', '--layout-main-gap'],
    ['2xl', '--spacing-8'],
  ] as const)('gap="%s" resolve para %s', (gap, token) => {
    render(
      <Stack gap={gap} data-testid="s">
        x
      </Stack>,
    );
    expect(screen.getByTestId('s').className).toContain(`gap-[var(${token})]`);
  });

  it('renderiza a tag pedida por `as` — layout não decide semântica', () => {
    render(
      <Stack as="ul" data-testid="s">
        <li>um</li>
      </Stack>,
    );
    expect(screen.getByTestId('s').tagName).toBe('UL');
  });

  it('a tag muda e o className NÃO muda — `as` é semântica, não visual', () => {
    const { rerender } = render(
      <Stack gap="md" data-testid="s">
        x
      </Stack>,
    );
    const comoDiv = screen.getByTestId('s').className;
    rerender(
      <Stack gap="md" as="section" data-testid="s">
        x
      </Stack>,
    );
    expect(screen.getByTestId('s').className).toBe(comoDiv);
    expect(screen.getByTestId('s').tagName).toBe('SECTION');
  });

  it.each(['stretch', 'start', 'center', 'end'] as const)('align="%s"', (align) => {
    render(
      <Stack align={align} data-testid="s">
        x
      </Stack>,
    );
    expect(screen.getByTestId('s').className).toContain(`items-${align}`);
  });

  it('aceita className e repassa props nativas', () => {
    render(
      <Stack className="teste-stack" aria-label="pilha" data-testid="s">
        x
      </Stack>,
    );
    const el = screen.getByTestId('s');
    expect(el).toHaveClass('teste-stack');
    expect(el).toHaveAttribute('aria-label', 'pilha');
  });

  // ── A escala é FECHADA, e é isso que o primitivo entrega ─────────────────
  //
  // `--spacing-5` aparece 24 vezes no painel e NÃO tem degrau aqui: ele é o
  // único da lista sem papel declarado na moldura (`--layout-*` usa 2, 4 e 6)
  // e sobreviveu como escolha de tela. Um primitivo que reexportasse a régua
  // inteira do Tailwind não teria fechado nada.
  it('não publica degrau para --spacing-5 — a escala fechada é o serviço', () => {
    render(<Stack data-testid="s">x</Stack>);
    expect(screen.getByTestId('s').className).not.toContain('--spacing-5');
  });

  // O `Stack` não é `Card`: sem superfície, sem elevação, sem padding. Uma
  // pilha com fundo é `<Card>` com um `Stack` DENTRO, nessa ordem.
  it('não pinta superfície nem padding — não é o Card com outro nome', () => {
    render(<Stack data-testid="s">x</Stack>);
    const classes = screen.getByTestId('s').className;
    expect(classes).not.toContain('bg-');
    expect(classes).not.toContain('rounded');
    expect(classes).not.toMatch(/\bp-/);
  });
});
