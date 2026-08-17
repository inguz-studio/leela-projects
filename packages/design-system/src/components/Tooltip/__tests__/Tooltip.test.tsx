/**
 * Tooltip (PoC shadcn+brasa) — prova o pipeline de tokens de ponta a ponta:
 * componente shadcn stock renderiza com classes de ALIAS (bg-popover,
 * text-popover-foreground, border-border) que o preset resolve para os
 * tokens brasa/wine gerados. Padrão de porte de teste para o Lote A.
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

  it('motion tokenizado via preset E atrás de motion-safe (governança §3)', () => {
    renderOpenTooltip();
    const content = screen.getByTestId('tt-content');
    expect(content.className).toContain('motion-safe:animate-in');
    expect(content.className).toContain('motion-safe:data-[state=closed]:animate-out');
    // Nenhuma classe de animação SOLTA: `animate-in` sem o gate voltaria a
    // animar para quem pediu menos movimento, e a regressão é invisível a olho.
    expect(content.className).not.toMatch(/(^|\s)animate-(in|out)\b/);
  });

  /**
   * PORTAL — o conserto do T1, afirmado no nível canônico.
   *
   * Sem portal o Radix renderiza a dica como IRMÃ do gatilho, e qualquer
   * ancestral com retângulo de recorte a corta. Foi o que aconteceu no rail
   * recolhido: 99px de dica, 0px visível, porque o contêiner dos itens rola
   * (`overflow-x:hidden`). O teste monta exatamente essa armadilha — gatilho
   * dentro de um contêiner que recorta — e exige que a dica nasça FORA dele.
   */
  it('conteúdo é portalizado: escapa de ancestral que recorta (overflow hidden)', () => {
    const { container } = render(
      <TooltipProvider>
        <div data-testid="recorta" className="overflow-y-auto overflow-x-hidden">
          <Tooltip open>
            <TooltipTrigger>Salvar</TooltipTrigger>
            <TooltipContent data-testid="tt-content">Atalho: Ctrl+S</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>,
    );

    const content = screen.getByTestId('tt-content');
    const recorta = screen.getByTestId('recorta');

    expect(recorta.contains(screen.getByRole('button', { name: 'Salvar' }))).toBe(true);
    expect(recorta.contains(content)).toBe(false);
    expect(container.contains(content)).toBe(false);
    expect(document.body.contains(content)).toBe(true);
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
