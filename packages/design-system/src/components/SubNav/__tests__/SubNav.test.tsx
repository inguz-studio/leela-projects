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
  it('renders tablist with aria-label', () => {
    render(<SubNav tabs={tabs} />);
    expect(screen.getByRole('tablist', { name: 'Navegação de seções' })).toBeInTheDocument();
  });

  it('renders all tabs', () => {
    render(<SubNav tabs={tabs} />);
    expect(screen.getAllByRole('tab').length).toBe(3);
  });

  it('active tab has aria-selected=true', () => {
    render(<SubNav tabs={tabs} />);
    const activeTab = screen.getByRole('tab', { name: /Visão Geral/i });
    expect(activeTab).toHaveAttribute('aria-selected', 'true');
  });

  it('inactive tabs have aria-selected=false', () => {
    render(<SubNav tabs={tabs} />);
    const inactiveTab = screen.getByRole('tab', { name: /Inscrições/i });
    expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
  });

  it('renders count pill when tab has count', () => {
    render(<SubNav tabs={tabs} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('calls onClick when tab is clicked', async () => {
    const onClick = vi.fn();
    const tabsWithClick: SubNavTab[] = [
      { id: 'overview', label: 'Visão Geral', active: true },
      { id: 'inscricoes', label: 'Inscrições', onClick },
    ];
    render(<SubNav tabs={tabsWithClick} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Inscrições' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders anchor tab when href is provided', () => {
    const tabsWithHref: SubNavTab[] = [
      { id: 'overview', label: 'Visão Geral', href: '/eventos/1', active: true },
    ];
    render(<SubNav tabs={tabsWithHref} />);
    expect(screen.getByRole('tab', { name: 'Visão Geral' }).tagName).toBe('A');
  });

  it('supports arrow key navigation', async () => {
    render(<SubNav tabs={tabs} />);
    const firstTab = screen.getByRole('tab', { name: /Visão Geral/i });
    firstTab.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Inscrições/i })).toHaveFocus();
  });

  it('wraps arrow navigation at end', async () => {
    const twoTabs: SubNavTab[] = [
      { id: 'a', label: 'A', active: true },
      { id: 'b', label: 'B' },
    ];
    render(<SubNav tabs={twoTabs} />);
    const lastTab = screen.getByRole('tab', { name: 'B' });
    lastTab.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'A' })).toHaveFocus();
  });
});
