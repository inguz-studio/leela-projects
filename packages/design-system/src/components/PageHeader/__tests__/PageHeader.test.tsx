import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('renders h1 with title', () => {
    render(<PageHeader title="Meia Floripa 2026" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Meia Floripa 2026' })).toBeInTheDocument();
  });

  it('renders header landmark with aria-label matching title', () => {
    render(<PageHeader title="Meia Floripa 2026" />);
    expect(screen.getByRole('banner', { name: 'Meia Floripa 2026' })).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Evento" subtitle="21 de Junho · Florianópolis" />);
    expect(screen.getByText('21 de Junho · Florianópolis')).toBeInTheDocument();
  });

  it('renders avatar slot when provided', () => {
    render(<PageHeader title="Evento" avatar={<img src="/logo.png" alt="logo" />} />);
    expect(screen.getByAltText('logo')).toBeInTheDocument();
  });

  it('renders actions slot when provided', () => {
    render(<PageHeader title="Evento" actions={<button type="button">Editar</button>} />);
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('renders badges slot when provided', () => {
    render(<PageHeader title="Evento" badges={<span>Publicado</span>} />);
    expect(screen.getByText('Publicado')).toBeInTheDocument();
  });

  it('renders metadata slot when provided', () => {
    render(<PageHeader title="Evento" metadata={<span>1.200 inscritos</span>} />);
    expect(screen.getByText('1.200 inscritos')).toBeInTheDocument();
  });

  it('does not render avatar container when absent', () => {
    const { container } = render(<PageHeader title="Evento" />);
    // Only the h1 and header should exist, no extra avatar wrapper
    expect(container.querySelector('[aria-hidden]')).not.toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<PageHeader title="Evento" className="test-class" />);
    expect(container.firstChild).toHaveClass('test-class');
  });
});
