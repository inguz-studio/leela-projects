import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, type TabItem } from '../Tabs';

const TABS: TabItem[] = [
  { id: 'inscritos', label: 'Inscritos', count: 128, content: <p>Lista de inscritos</p> },
  { id: 'kits', label: 'Kits', content: <p>Lista de kits</p> },
  { id: 'resultados', label: 'Resultados', count: 0, content: <p>Resultados da prova</p> },
];

describe('Tabs', () => {
  it('renders tablist with all triggers', () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getByRole('tablist', { name: 'Abas' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('keeps ALL panels in the DOM (§2.7 forceMount), inactive hidden', () => {
    render(<Tabs tabs={TABS} />);
    const panels = screen.getAllByRole('tabpanel', { hidden: true });
    expect(panels).toHaveLength(3);
    expect(screen.getByText('Lista de kits')).toBeInTheDocument();
    expect(screen.getByText('Resultados da prova')).toBeInTheDocument();
    const inactive = panels.filter((panel) =>
      panel.className.includes('data-[state=inactive]:hidden'),
    );
    expect(inactive).toHaveLength(3);
  });

  it('activates first tab by default and switches on click', async () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getByRole('tab', { name: /Inscritos/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(screen.getByRole('tab', { name: /Kits/ }));
    expect(screen.getByRole('tab', { name: /Kits/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('respects defaultTab', () => {
    render(<Tabs tabs={TABS} defaultTab="kits" />);
    expect(screen.getByRole('tab', { name: /Kits/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('supports controlled mode via value + onValueChange', async () => {
    const onValueChange = vi.fn();
    render(<Tabs tabs={TABS} value="inscritos" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('tab', { name: /Resultados/ }));
    expect(onValueChange).toHaveBeenCalledWith('resultados');
    // controlado: sem re-render externo, seleção não muda
    expect(screen.getByRole('tab', { name: /Inscritos/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('navigates with arrow keys (Radix roving focus)', async () => {
    render(<Tabs tabs={TABS} />);
    // Entra no tablist como o usuário: Tab (act-wrapped via user-event).
    // `.focus()` cru disparava o onFocus do RovingFocusGroup do Radix
    // (setState de currentTabStopId) FORA de act → warning determinístico.
    // Bônus: também prova o roving tabindex (só a aba ativa é tabbável).
    await userEvent.tab();
    expect(screen.getByRole('tab', { name: /Inscritos/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Kits/ })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /Kits/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('renders count pill including zero (§2.14)', () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('anel de foco e pill de contador usam aliases shadcn→brasa', () => {
    render(<Tabs tabs={TABS} />);
    const tab = screen.getByRole('tab', { name: /Inscritos/ });
    expect(tab.className).toContain('focus-visible:ring-ring');
    expect(screen.getByText('128').className).toContain('bg-background');
  });

  it('active trigger carries the Brasa underline classes (§2.14)', () => {
    render(<Tabs tabs={TABS} />);
    const active = screen.getByRole('tab', { name: /Inscritos/ });
    expect(active.className).toContain(
      'data-[state=active]:after:h-[var(--subnav-underline)]',
    );
    expect(active.className).toContain(
      'data-[state=active]:after:bg-[var(--border-brand)]',
    );
  });
});
