import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toolbar } from '../Toolbar';

describe('Toolbar', () => {
  it('renderiza role="toolbar" com aria-label default', () => {
    render(<Toolbar start={<span>busca</span>} end={<span>ações</span>} />);
    const bar = screen.getByRole('toolbar', { name: 'Ferramentas globais' });
    expect(bar).toContainElement(screen.getByText('busca'));
    expect(bar).toContainElement(screen.getByText('ações'));
  });

  it('fecha em hairline com pb da T1 e gaps por token', () => {
    render(<Toolbar />);
    const bar = screen.getByRole('toolbar');
    expect(bar.className).toContain('pb-[var(--layout-toolbar-pb)]');
    expect(bar.className).toContain('border-b-[var(--border-subtle)]');
    expect(bar.className).toContain('gap-[var(--toolbar-gap)]');
  });

  it('empilha abaixo de lg e volta a linha única em lg+ (M2)', () => {
    render(<Toolbar start={<span>busca</span>} end={<span>ações</span>} />);
    const bar = screen.getByRole('toolbar');
    // <lg: coluna (empilhado) — mata o estouro do search fixo + ícones + CTA.
    expect(bar.className).toContain('flex-col');
    // lg+: linha única space-between do mockup — desktop 1440 intocado.
    expect(bar.className).toContain('lg:flex-row');
    expect(bar.className).toContain('lg:justify-between');
    // Grupo de ações alinha à direita quando estica no empilhado.
    const acoes = screen.getByText('ações').parentElement as HTMLElement;
    expect(acoes.className).toContain('justify-end');
    expect(acoes.className).toContain('shrink-0');
  });

  it('aria-label customizável', () => {
    render(<Toolbar aria-label="Ferramentas do evento" />);
    expect(screen.getByRole('toolbar', { name: 'Ferramentas do evento' })).toBeInTheDocument();
  });
});
