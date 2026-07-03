import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Stepper, type StepperStep } from '../Stepper';

const CHECKOUT_STEPS: StepperStep[] = [
  { id: 'kits', label: 'Kits' },
  { id: 'dados', label: 'Dados' },
  { id: 'equipe', label: 'Equipe' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'confirmacao', label: 'Confirmação' },
];

describe('Stepper', () => {
  it('renders the 5 checkout steps as an ordered list', () => {
    render(<Stepper steps={CHECKOUT_STEPS} current={0} />);
    const list = screen.getByRole('list', { name: 'Progresso das etapas' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
  });

  it('marks only the current step with aria-current="step"', () => {
    render(<Stepper steps={CHECKOUT_STEPS} current={2} />);
    const items = screen.getAllByRole('listitem');
    items.forEach((item, index) => {
      if (index === 2) {
        expect(item).toHaveAttribute('aria-current', 'step');
      } else {
        expect(item).not.toHaveAttribute('aria-current');
      }
    });
  });

  it('completed steps show check + sr-only "(concluída)"', () => {
    render(<Stepper steps={CHECKOUT_STEPS} current={2} />);
    const items = screen.getAllByRole('listitem');
    expect(within(items[0] as HTMLElement).getByText('✓')).toBeInTheDocument();
    expect(within(items[1] as HTMLElement).getByText('✓')).toBeInTheDocument();
    expect(screen.getAllByText('(concluída)')).toHaveLength(2);
  });

  it('completed steps use action-primary (Brasa) tokens', () => {
    render(<Stepper steps={CHECKOUT_STEPS} current={1} />);
    const items = screen.getAllByRole('listitem');
    const doneCircle = within(items[0] as HTMLElement).getByText('✓')
      .parentElement as HTMLElement;
    expect(doneCircle.className).toContain('bg-[var(--action-primary)]');
  });

  it('current step has brand ring; future steps use surface-overlay', () => {
    render(<Stepper steps={CHECKOUT_STEPS} current={1} />);
    const items = screen.getAllByRole('listitem');
    const currentCircle = within(items[1] as HTMLElement).getByText('2');
    expect(currentCircle.className).toContain('ring-[color:var(--border-brand)]');
    const futureCircle = within(items[4] as HTMLElement).getByText('5');
    expect(futureCircle.className).toContain('bg-[var(--surface-overlay)]');
  });

  it('accepts a custom aria-label', () => {
    render(<Stepper steps={CHECKOUT_STEPS} current={0} aria-label="Checkout" />);
    expect(screen.getByRole('list', { name: 'Checkout' })).toBeInTheDocument();
  });
});
