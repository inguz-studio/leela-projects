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
