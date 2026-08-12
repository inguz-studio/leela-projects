// =============================================================================
// SectionHeader — o cabeçalho de bloco interno.
//
// Os slots testados são os quatro que o `SecaoHead` do painel acumulou por
// necessidade real (título, contexto, "?" de ajuda, recorte do próprio bloco,
// link de "ver tudo"). O que este arquivo trava, além de cada slot, é a
// fronteira: a ANATOMIA é do DS e o INTERATIVO é do consumidor — é ela que
// mantém a peça pura e, por isso, server-safe.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionHeader } from '../SectionHeader';

describe('SectionHeader', () => {
  it('renderiza o título como h2 por default', () => {
    render(<SectionHeader title="Situação dos membros" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Situação dos membros' })).toBeInTheDocument();
  });

  // Nível de heading é navegação de leitor de tela, não tamanho de letra: o
  // bloco dentro de um cartão que já tem título precisa descer, e sem `as`
  // isso viraria um `<div>` estilizado de heading na primeira tela apertada.
  it.each([2, 3, 4] as const)('titleAs="h%s" muda o NÍVEL, não o tamanho', (level) => {
    const { container } = render(
      <SectionHeader title="Bloco" titleAs={`h${level}` as 'h2' | 'h3' | 'h4'} />,
    );
    const heading = screen.getByRole('heading', { level });
    expect(heading).toBeInTheDocument();
    expect(heading.className).toContain('text-[length:var(--section-eyebrow-size)]');
    expect(container).toBeTruthy();
  });

  it('usa o eyebrow por token — 11px/700 uppercase na tinta da marca', () => {
    render(<SectionHeader title="Bloco" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.className).toContain('text-[length:var(--section-eyebrow-size)]');
    expect(heading.className).toContain('font-[var(--section-eyebrow-weight)]');
    expect(heading.className).toContain('tracking-[var(--section-eyebrow-spacing)]');
    expect(heading.className).toContain('uppercase');
    expect(heading.className).toContain('text-[var(--action-brand-tint-fg)]');
  });

  it('mantém o ritmo da moldura por token', () => {
    render(<SectionHeader title="Bloco" data-testid="h" />);
    expect(screen.getByTestId('h').className).toContain('mb-[var(--layout-section-head-mb)]');
  });

  it('mostra a descrição quando ela existe', () => {
    render(<SectionHeader title="Bloco" description="Uma linha de contexto." />);
    expect(screen.getByText('Uma linha de contexto.')).toBeInTheDocument();
  });

  it('não renderiza parágrafo de descrição quando ela falta', () => {
    const { container } = render(<SectionHeader title="Bloco" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it.each(['help', 'control', 'action'] as const)('renderiza o slot %s', (slot) => {
    render(<SectionHeader title="Bloco" {...{ [slot]: <span>{slot}</span> }} />);
    expect(screen.getByText(slot)).toBeInTheDocument();
  });

  it('o slot de ajuda fica JUNTO do título, não no canto direito', () => {
    render(<SectionHeader title="Bloco" help={<span data-testid="ajuda">?</span>} />);
    const heading = screen.getByRole('heading', { level: 2 });
    const ajuda = screen.getByTestId('ajuda');
    expect(heading.parentElement).toBe(ajuda.parentElement);
  });

  // A fronteira que mantém a peça pura: nada de hook, nada de Radix, nada de
  // estado. É o que permite exportá-la em `server.ts` e a landing consumi-la
  // sem boundary de cliente (ADR-017).
  it('é puro — o mesmo markup em duas renderizações independentes', () => {
    const { container: a, unmount } = render(<SectionHeader title="Bloco" />);
    const primeiro = a.innerHTML;
    unmount();
    const { container: b } = render(<SectionHeader title="Bloco" />);
    expect(b.innerHTML).toBe(primeiro);
  });

  it('aceita className e props nativas', () => {
    render(<SectionHeader title="Bloco" className="teste-head" data-testid="h" />);
    expect(screen.getByTestId('h')).toHaveClass('teste-head');
  });
});
