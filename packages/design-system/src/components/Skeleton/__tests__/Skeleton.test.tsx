import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('is decorative: aria-hidden, no role', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden');
    expect(el).not.toHaveAttribute('role');
  });

  it('uses motion-safe pulse (respeita prefers-reduced-motion)', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('motion-safe:animate-pulse');
  });

  it('defaults to rect with skeleton-radius token', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute('data-variant', 'rect');
    expect(el.className).toContain('rounded-[var(--skeleton-radius)]');
  });

  it('text variant is a full-width single line', () => {
    const { container } = render(<Skeleton variant="text" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute('data-variant', 'text');
    expect(el.className).toContain('h-[var(--spacing-4)]');
    expect(el.className).toContain('w-full');
  });

  it('circle variant uses radius-pill token', () => {
    const { container } = render(<Skeleton variant="circle" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('rounded-[var(--radius-pill)]');
  });

  it('merges custom className for sizing', () => {
    const { container } = render(
      <Skeleton className="h-[var(--spacing-10)] w-[var(--spacing-10)]" />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('h-[var(--spacing-10)]');
  });
});
