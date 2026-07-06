import type { Meta, StoryObj } from '@storybook/react';
import { Bell, CircleHelp, Plus } from 'lucide-react';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { SearchInput } from '../SearchInput';
import { Toolbar } from './Toolbar';

const meta: Meta<typeof Toolbar> = {
  title: 'Shell/Toolbar',
  component: Toolbar,
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

/** Composição completa do mockup: busca ⌘K + ajuda + notificações + ação. */
export const PainelDoOrganizador: Story = {
  render: () => (
    <Toolbar
      start={<SearchInput placeholder="Buscar atleta, evento, inscrição…" />}
      end={
        <>
          <IconButton aria-label="Ajuda">
            <CircleHelp />
          </IconButton>
          <IconButton aria-label="Notificações (não lidas)" pip>
            <Bell />
          </IconButton>
          <Button variant="primary" size="sm">
            <Plus aria-hidden className="w-[var(--search-icon-size)] h-[var(--search-icon-size)]" />
            Novo evento
          </Button>
        </>
      }
    />
  ),
};

export const SoBusca: Story = {
  render: () => <Toolbar start={<SearchInput />} />,
};
