/**
 * Tooltip (PoC shadcn+brasa) — prova o pipeline de tokens de ponta a ponta:
 * componente shadcn stock renderiza com classes de ALIAS (bg-popover,
 * text-popover-foreground, border-border) que o preset resolve para os
 * tokens brasa/leela gerados. Padrão de porte de teste para o Lote A.
 */

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../Tooltip';

function renderOpenTooltip(contentProps: React.ComponentProps<typeof TooltipContent> = {}) {
  return render(
    <TooltipProvider>
      {/* open controlado: jsdom não emite pointer events reais */}
      <Tooltip open>
        <TooltipTrigger>Salvar</TooltipTrigger>
        <TooltipContent data-testid="tt-content" {...contentProps}>Atalho: Ctrl+S</TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  );
}

describe('Tooltip (shadcn stock + aliases brasa)', () => {
  it('renderiza o conteúdo com role="tooltip" quando aberto', () => {
    renderOpenTooltip();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Atalho: Ctrl+S');
  });

  it('não renderiza conteúdo quando fechado', () => {
    render(
      <TooltipProvider>
        <Tooltip open={false}>
          <TooltipTrigger>Salvar</TooltipTrigger>
          <TooltipContent>Atalho: Ctrl+S</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('trigger expõe o estado aberto via data-state (contrato Radix)', () => {
    renderOpenTooltip();
    const trigger = screen.getByRole('button', { name: 'Salvar' });
    expect(trigger.getAttribute('data-state')).toMatch(/open/);
  });

  it('consome as classes de ALIAS shadcn (bg-popover, text-popover-foreground, border-border)', () => {
    renderOpenTooltip();
    const content = screen.getByTestId('tt-content');
    expect(content.className).toContain('bg-popover');
    expect(content.className).toContain('text-popover-foreground');
    expect(content.className).toContain('border-border');
  });

  it('spacing e tipografia vêm de tokens (zero valor cru)', () => {
    renderOpenTooltip();
    const content = screen.getByTestId('tt-content');
    expect(content.className).toContain('px-[var(--spacing-3)]');
    expect(content.className).toContain('py-[var(--spacing-1)]');
    expect(content.className).toContain('text-[length:var(--font-size-base)]');
    expect(content.className).toContain('shadow-elev-2');
  });

  it('motion stock devolvido (A2): TooltipContent carrega animate-in (tokenizado via preset)', () => {
    renderOpenTooltip();
    const content = screen.getByTestId('tt-content');
    expect(content.className).toContain('animate-in');
    expect(content.className).toContain('data-[state=closed]:animate-out');
  });

  it('aceita className extra sem perder as classes base (cn merge)', () => {
    renderOpenTooltip({ className: 'max-w-[var(--modal-width-sm)]' });
    const content = screen.getByTestId('tt-content');
    expect(content.className).toContain('max-w-[var(--modal-width-sm)]');
    expect(content.className).toContain('bg-popover');
  });

  it('encaminha props do Radix Content (side) para o DOM', () => {
    renderOpenTooltip({ side: 'bottom' });
    expect(screen.getByTestId('tt-content').getAttribute('data-side')).toBe('bottom');
  });
});
