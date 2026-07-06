import type { Meta, StoryObj } from '@storybook/react';
import { Stepper, type StepperStep } from './Stepper';

const CHECKOUT: StepperStep[] = [
  { id: 'kits', label: 'Kits' },
  { id: 'dados', label: 'Dados' },
  { id: 'equipe', label: 'Equipe' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'confirmacao', label: 'Confirmação' },
];

const meta: Meta<typeof Stepper> = {
  title: 'Fluxo/Stepper',
  component: Stepper,
  args: { steps: CHECKOUT, current: 2, 'aria-label': 'Checkout' },
};

export default meta;
type Story = StoryObj<typeof Stepper>;

/** Checkout em 5 etapas — concluídas em Brasa com ✓, atual com ring brand. */
export const Checkout: Story = {};

export const Inicio: Story = { args: { current: 0 } };

export const UltimaEtapa: Story = { args: { current: 4 } };
