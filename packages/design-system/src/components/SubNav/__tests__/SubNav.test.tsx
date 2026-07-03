import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubNav } from '../SubNav';
import type { SubNavTab } from '../SubNav';

const tabs: SubNavTab[] = [
  { id: 'overview', label: 'Visão Geral', active: true, onClick: vi.fn() },
  { id: 'inscricoes', label: 'Inscrições', count: 42, onClick: vi.fn() },
  { id: 'kits', label: 'Kits', onClick: vi.fn() },
];

describe('SubNav', () => {
  it('renders nav landmark with default aria-label', () => {
    render(<SubNav tabs={tabs} />);
    expect(
      screen.getByRole('navigation', { name: 'Navegação de seções' }),
    ).toBeInTheDocument();
  });

  it('renders all tabs as list items', () => {
    render(<SubNav tabs={tabs} />);
    expect(screen.getAllByRole('listitem').length).toBe(3);
  });

  it('active tab has aria-current="page"', () => {
    render(<SubNav tabs={tabs} />);
    const active = screen.getByRole('button', { name: /Visão Geral/i });
    expect(active).toHaveAttribute('aria-current', 'page');
  });

  it('inactive tabs do not have aria-current', () => {
    render(<SubNav tabs={tabs} />);
    const inactive = screen.getByRole('button', { name: /Inscrições/i });
    expect(inactive).not.toHaveAttribute('aria-current');
  });

  it('renders count pill when tab has count', () => {
    render(<SubNav tabs={tabs} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('count pill uses §2.14 pill tokens (bg-surface-base)', () => {
    render(<SubNav tabs={tabs} />);
    const pill = screen.getByText('42');
    expect(pill.className).toContain('bg-[var(--surface-base)]');
    expect(pill.className).toContain('h-[var(--subnav-pill-height)]');
  });

  it('calls onClick when tab is clicked', async () => {
    const onClick = vi.fn();
    const tabsWithClick: SubNavTab[] = [
      { id: 'overview', label: 'Visão Geral', active: true },
      { id: 'inscricoes', label: 'Inscrições', onClick },
    ];
    render(<SubNav tabs={tabsWithClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Inscrições' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders anchor when href is provided', () => {
    const tabsWithHref: SubNavTab[] = [
      { id: 'overview', label: 'Visão Geral', href: '/eventos/1', active: true },
    ];
    render(<SubNav tabs={tabsWithHref} />);
    const link = screen.getByRole('link', { name: 'Visão Geral' });
    expect(link).toHaveAttribute('href', '/eventos/1');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('all tabs are reachable via Tab key (no roving tabindex)', async () => {
    render(<SubNav tabs={tabs} />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Visão Geral/i })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Inscrições/i })).toHaveFocus();
  });

  it('is keyboard navigable even when no tab is active', async () => {
    const noActive: SubNavTab[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    render(<SubNav tabs={noActive} />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();
  });

  it('supports arrow key navigation', async () => {
    render(<SubNav tabs={tabs} />);
    screen.getByRole('button', { name: /Visão Geral/i }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /Inscrições/i })).toHaveFocus();
  });

  it('wraps arrow navigation at the ends', async () => {
    const twoTabs: SubNavTab[] = [
      { id: 'a', label: 'A', active: true },
      { id: 'b', label: 'B' },
    ];
    render(<SubNav tabs={twoTabs} />);
    screen.getByRole('button', { name: 'B' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: 'B' })).toHaveFocus();
  });

  it('container applies §2.14 (bg-surface-raised + px token + border-b)', () => {
    render(<SubNav tabs={tabs} />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('bg-[var(--surface-raised)]');
    expect(nav.className).toContain('px-[var(--subnav-px)]');
    expect(nav.className).toContain('border-b');
  });
});
