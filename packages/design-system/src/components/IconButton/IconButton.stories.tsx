import type { Meta, StoryObj } from '@storybook/react';
import { Bell, CircleHelp } from 'lucide-react';
import { IconButton } from './IconButton';

const meta: Meta<typeof IconButton> = {
  title: 'Átomos/IconButton',
  component: IconButton,
  args: {
    'aria-label': 'Notificações',
    pip: false,
    children: <Bell />,
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {};

export const ComPip: Story = {
  args: { 'aria-label': 'Notificações (não lidas)', pip: true },
};

export const Ajuda: Story = {
  args: { 'aria-label': 'Ajuda', children: <CircleHelp /> },
};

export const Disabled: Story = {
  args: { disabled: true },
};
