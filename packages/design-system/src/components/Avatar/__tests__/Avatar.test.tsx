import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  // ── Render ──────────────────────────────────────────────────────────────
  it('renders with aria-label equal to name', () => {
    render(<Avatar name="João Silva" />);
    expect(screen.getByRole('img', { name: 'João Silva' })).toBeInTheDocument();
  });

  // ── Iniciais ────────────────────────────────────────────────────────────
  it('shows initials when src is not provided', () => {
    render(<Avatar name="Maria Carvalho" />);
    expect(screen.getByText('MC')).toBeInTheDocument();
  });

  it('shows single initial for single-word name', () => {
    render(<Avatar name="Admin" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  // ── Tamanhos ────────────────────────────────────────────────────────────
  it.each(['sm', 'md', 'lg'] as const)('renders size %s', (size) => {
    render(<Avatar name="Teste" size={size} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  // ── Imagem ──────────────────────────────────────────────────────────────
  it('renders img element when src is provided', () => {
    render(<Avatar name="Foto User" src="https://example.com/avatar.jpg" />);
    const img = screen.getByAltText('Foto User');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  // ── VIP ─────────────────────────────────────────────────────────────────
  it('renders without VIP ring by default', () => {
    const { container } = render(<Avatar name="Normal" />);
    expect(container.firstChild).not.toHaveClass('ring-2');
  });

  it('adds ring class when vip=true', () => {
    const { container } = render(<Avatar name="VIP User" vip />);
    expect(container.firstChild).toHaveClass('ring-2');
  });

  it('VIP ring offset usa o alias shadcn→brasa (ring-offset-background)', () => {
    const { container } = render(<Avatar name="VIP User" vip />);
    expect(container.firstChild).toHaveClass('ring-offset-background');
  });

  // ── Custom className ────────────────────────────────────────────────────
  it('accepts custom className', () => {
    render(<Avatar name="X" className="test-avatar" />);
    expect(screen.getByRole('img')).toHaveClass('test-avatar');
  });
});
