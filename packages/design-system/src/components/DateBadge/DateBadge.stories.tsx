import type { Meta, StoryObj } from '@storybook/react';
import { DateBadge } from './DateBadge';

const meta: Meta<typeof DateBadge> = {
  title: 'Átomos/DateBadge',
  component: DateBadge,
  args: { children: 'Domingo, 19 de Abril · 14:32' },
};

export default meta;
type Story = StoryObj<typeof DateBadge>;

/** Pill do page-head do mockup, com o dot verde "ao vivo". */
export const Default: Story = {};

/** Sem dot — quando o texto não carrega estado "ao vivo". */
export const SemDot: Story = {
  args: { showDot: false, children: '27 Abr · 06:00' },
};
