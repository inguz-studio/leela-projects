import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../Card';

function Composed() {
  return (
    <Card data-testid="card">
      <CardHeader>
        <CardTitle>Meia Floripa</CardTitle>
        <CardDescription>21k pela orla da Beira-Mar</CardDescription>
      </CardHeader>
      <CardContent>
        <p>128 inscritos</p>
      </CardContent>
      <CardFooter>
        <button type="button">Ver evento</button>
      </CardFooter>
    </Card>
  );
}

describe('Card', () => {
  it('renders full composition (header, title, description, content, footer)', () => {
    render(<Composed />);
    expect(screen.getByText('Meia Floripa')).toBeInTheDocument();
    expect(screen.getByText('21k pela orla da Beira-Mar')).toBeInTheDocument();
    expect(screen.getByText('128 inscritos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver evento' })).toBeInTheDocument();
  });

  it('title is a level-3 heading (a11y landmark inside listings)', () => {
    render(<Composed />);
    expect(screen.getByRole('heading', { level: 3, name: 'Meia Floripa' })).toBeInTheDocument();
  });

  it('frame adota aliases shadcn→brasa (bg-card + border-border + shadow token)', () => {
    render(<Composed />);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('bg-card');
    expect(card.className).toContain('text-card-foreground');
    expect(card.className).toContain('border-border');
    expect(card.className).toContain('shadow-elev-1');
  });

  it('description usa o alias muted-foreground (par AA text-tertiary/surface-raised)', () => {
    render(<Composed />);
    expect(screen.getByText('21k pela orla da Beira-Mar').className).toContain(
      'text-muted-foreground',
    );
  });

  it('merges custom className on every part', () => {
    render(
      <Card className="c-root" data-testid="card">
        <CardHeader className="c-header">
          <CardTitle className="c-title">T</CardTitle>
          <CardDescription className="c-desc">D</CardDescription>
        </CardHeader>
        <CardContent className="c-content">C</CardContent>
        <CardFooter className="c-footer">F</CardFooter>
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveClass('c-root');
    expect(screen.getByText('T')).toHaveClass('c-title');
    expect(screen.getByText('D')).toHaveClass('c-desc');
    expect(screen.getByText('C')).toHaveClass('c-content');
    expect(screen.getByText('F')).toHaveClass('c-footer');
  });

  it('forwards refs (composição com Slot/medidas)', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>x</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('spacing interno vem de tokens (zero valor cru)', () => {
    render(<Composed />);
    const header = screen.getByText('Meia Floripa').parentElement as HTMLElement;
    expect(header.className).toContain('p-[var(--spacing-6)]');
    expect(header.className).toContain('gap-[var(--spacing-1)]');
  });
});

// ===========================================================================
// `as` — Onda 0 Parte B · CANONE-1
//
// O handoff da Onda 1 nomeou a lacuna: o `Card` renderizava `<div>` sempre, e
// converter um `<article>` de lista ou uma `<section aria-label>` para o
// canônico APAGAVA a semântica. `asChild` do Radix resolveria e está barrado
// na landing pelo ADR-017 (a entrada `/server` é Radix-free).
// ===========================================================================

describe('Card · as (a semântica que a conversão não pode apagar)', () => {
  it('renderiza <div> por default — nada mudou para quem já usa', () => {
    render(<Card data-testid="card">x</Card>);
    expect(screen.getByTestId('card').tagName).toBe('DIV');
  });

  it.each(['div', 'article', 'section', 'li', 'aside'] as const)('as="%s"', (tag) => {
    render(
      <Card as={tag} data-testid="card">
        x
      </Card>,
    );
    expect(screen.getByTestId('card').tagName).toBe(tag.toUpperCase());
  });

  // A polimorfia é de SEMÂNTICA, não de visual: se um dia ela começar a mudar
  // classe por tag, o cartão de lista deixa de parecer com o cartão de grade
  // na mesma tela e ninguém vai achar a causa.
  it('a tag muda e o className NÃO muda', () => {
    const { rerender } = render(
      <Card className="x" data-testid="card">
        c
      </Card>,
    );
    const comoDiv = screen.getByTestId('card').className;
    rerender(
      <Card as="article" className="x" data-testid="card">
        c
      </Card>,
    );
    expect(screen.getByTestId('card').className).toBe(comoDiv);
  });

  // O caso que a Onda 1 aprendeu na landing: `<div>` filho direto de `<ul>`
  // quebra a semântica de lista.
  it('as="li" dentro de <ul> produz listitem de verdade', () => {
    render(
      <ul>
        <Card as="li" data-testid="card">
          item
        </Card>
      </ul>,
    );
    expect(screen.getByRole('listitem')).toBe(screen.getByTestId('card'));
  });

  // O outro caso do handoff: `<section aria-label>` que vira `<div>` perde o
  // landmark. Com `as="section"` o marco de navegação sobrevive à conversão.
  it('as="section" com aria-label continua sendo landmark', () => {
    render(
      <Card as="section" aria-label="Aceites da compra" data-testid="card">
        x
      </Card>,
    );
    expect(screen.getByRole('region', { name: 'Aceites da compra' })).toBe(
      screen.getByTestId('card'),
    );
  });

  it('CardTitle desce de nível por `as` sem mudar de tamanho', () => {
    const { rerender } = render(<CardTitle>T</CardTitle>);
    expect(screen.getByRole('heading', { level: 3, name: 'T' })).toBeInTheDocument();
    const tamanho = screen.getByText('T').className;
    rerender(<CardTitle as="h4">T</CardTitle>);
    expect(screen.getByRole('heading', { level: 4, name: 'T' })).toBeInTheDocument();
    expect(screen.getByText('T').className).toBe(tamanho);
  });
});
