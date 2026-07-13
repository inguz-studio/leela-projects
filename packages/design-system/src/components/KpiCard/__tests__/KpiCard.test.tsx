import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from '../KpiCard';

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard label="Inscritos" value="1.284" />);
    expect(screen.getByText('Inscritos')).toBeInTheDocument();
    expect(screen.getByText('1.284')).toBeInTheDocument();
  });

  it('renders the hint when provided and omits it otherwise', () => {
    const { rerender } = render(<KpiCard label="Receita" value="R$ 42.180" hint="vs. 7 dias" />);
    expect(screen.getByText('vs. 7 dias')).toBeInTheDocument();

    rerender(<KpiCard label="Receita" value="R$ 42.180" />);
    expect(screen.queryByText('vs. 7 dias')).not.toBeInTheDocument();
  });

  it('bakes tabular-nums into the value (KPI numbers must not jitter)', () => {
    render(<KpiCard label="Vagas" value="128" />);
    expect(screen.getByText('128').className).toContain('[font-variant-numeric:tabular-nums]');
  });

  it('value inherits text-primary by default', () => {
    render(<KpiCard label="Total" value="42" />);
    expect(screen.getByText('42').className).toContain('text-[var(--text-primary)]');
  });

  it('tone="danger" paints the value with the danger token', () => {
    render(<KpiCard label="Em risco" value="3" tone="danger" />);
    const value = screen.getByText('3');
    expect(value.className).toContain('text-[var(--text-danger)]');
    expect(value.className).not.toContain('text-[var(--text-primary)]');
  });

  it('emphasis="critico" adds the left-border (§2.16 exception), default stays flat', () => {
    const { rerender } = render(<KpiCard label="Falhas" value="7" emphasis="critico" />);
    const critico = screen.getByText('Falhas').parentElement as HTMLElement;
    expect(critico.className).toContain('border-l-[var(--border-danger)]');

    rerender(<KpiCard label="Falhas" value="7" />);
    const flat = screen.getByText('Falhas').parentElement as HTMLElement;
    expect(flat.className).not.toContain('border-l-[var(--border-danger)]');
  });

  it('accepts a custom className on the root', () => {
    render(<KpiCard label="Total" value="42" className="col-span-2" />);
    const root = screen.getByText('Total').parentElement as HTMLElement;
    expect(root.className).toContain('col-span-2');
  });

  it('is tokenized — no raw hex/px leaks in the value styling', () => {
    render(<KpiCard label="Total" value="42" />);
    const value = screen.getByText('42');
    expect(value.className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(value.className).toContain('text-[length:var(--font-size-xl)]');
  });
});
