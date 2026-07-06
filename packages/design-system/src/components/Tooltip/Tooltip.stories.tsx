import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip';
import { Button } from '../Button';

const meta: Meta<typeof Tooltip> = {
  title: 'Feedback/Tooltip',
  component: Tooltip,
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

/** Abre em hover e em foco de teclado; fecha em Esc (WAI-APG tooltip). */
export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary">Passe o mouse ou foque</Button>
        </TooltipTrigger>
        <TooltipContent>Dica contextual do painel</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

/** Posicionamento nos quatro lados via prop side do TooltipContent. */
export const QuatroLados: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex items-center gap-[var(--spacing-4)] p-[var(--spacing-8)]">
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger asChild>
              <Button variant="ghost">{side}</Button>
            </TooltipTrigger>
            <TooltipContent side={side}>Tooltip no lado {side}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  ),
};
