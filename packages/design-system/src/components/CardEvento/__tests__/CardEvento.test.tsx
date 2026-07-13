import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { CardEvento } from '../CardEvento';

describe('CardEvento', () => {
  it('renders title as heading', () => {
    render(<CardEvento title="Meia Maratona de Floripa" />);
    expect(
      screen.getByRole('heading', { name: 'Meia Maratona de Floripa' }),
    ).toBeInTheDocument();
  });

  it('renders default gradient media from semantic tokens when no media', () => {
    render(<CardEvento title="Evento" />);
    const gradient = screen.getByTestId('card-evento-gradient');
    expect(gradient.className).toContain('var(--action-primary)');
    expect(gradient.className).toContain('var(--surface-high)');
  });

  it('renders custom media instead of gradient', () => {
    render(
      <CardEvento title="Evento" media={<img src="/capa.jpg" alt="Capa do evento" />} />,
    );
    expect(screen.getByRole('img', { name: 'Capa do evento' })).toBeInTheDocument();
    expect(screen.queryByTestId('card-evento-gradient')).not.toBeInTheDocument();
  });

  it('renders modality badge over the media', () => {
    render(<CardEvento title="Evento" modality={<span>21K</span>} />);
    expect(screen.getByText('21K')).toBeInTheDocument();
  });

  it('renders meta and footer slots', () => {
    render(
      <CardEvento
        title="Evento"
        meta={<span>12 out · Florianópolis</span>}
        footer={<span>128 inscritos</span>}
      />,
    );
    expect(screen.getByText('12 out · Florianópolis')).toBeInTheDocument();
    expect(screen.getByText('128 inscritos')).toBeInTheDocument();
  });

  it('renders as link when href is provided', () => {
    render(<CardEvento title="Evento" href="/eventos/1" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/eventos/1');
  });

  it('renders as button and fires onClick when no href', async () => {
    const onClick = vi.fn();
    render(<CardEvento title="Evento" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders as static article without href/onClick', () => {
    render(<CardEvento title="Evento" />);
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies hover translateY + elevation classes (motion-safe)', () => {
    render(<CardEvento title="Evento" href="/e/1" />);
    const root = screen.getByRole('link');
    expect(root.className).toContain('hover:-translate-y-[var(--spacing-1)]');
    expect(root.className).toContain('hover:shadow-[var(--elevation-2)]');
  });

  it('forwards the DOM event to onClick (so it can preventDefault)', async () => {
    let hasEvent = false;
    const onClick = vi.fn((event: React.MouseEvent) => {
      hasEvent = typeof event.preventDefault === 'function';
    });
    render(<CardEvento title="Evento" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
    expect(hasEvent).toBe(true);
  });

  it('href + onClick: fires onClick with the event and keeps the link', async () => {
    let hasEvent = false;
    const onClick = vi.fn((event: React.MouseEvent) => {
      event.preventDefault();
      hasEvent = typeof event.preventDefault === 'function';
    });
    render(<CardEvento title="Evento" href="/eventos/1" onClick={onClick} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/eventos/1');
    await userEvent.click(link);
    expect(onClick).toHaveBeenCalledOnce();
    expect(hasEvent).toBe(true);
  });
});
