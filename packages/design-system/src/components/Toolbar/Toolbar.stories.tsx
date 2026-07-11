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

/**
 * Refluxo mobile (LEELA-RESP-M2). Abre já em 390×844: abaixo de `lg` a Toolbar
 * empilha — a busca ganha a linha inteira (`w-full`, como o shell faz) e o
 * grupo ajuda + notificações + "Novo evento" desce para a linha de baixo,
 * alinhado à direita. Mata o defeito M2 (busca fixa de 320px + ícones + CTA se
 * sobrepunham no main de ~310px). Alterne para desktop no addon Viewport para
 * ver a linha única do mockup (lg+), intocada. Decisão pela design-principles:
 * empilhar mantém todo controle visível/acessível em vez de esconder a busca
 * num ícone ou as ações num overflow.
 */
export const Responsiva: Story = {
  parameters: {
    viewport: {
      viewports: {
        mobile390: { name: 'Mobile 390×844', styles: { width: '390px', height: '844px' } },
      },
      defaultViewport: 'mobile390',
    },
  },
  render: () => (
    <Toolbar
      start={
        <SearchInput
          placeholder="Buscar atleta, evento, inscrição…"
          className="w-full lg:w-[var(--search-width)]"
        />
      }
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
