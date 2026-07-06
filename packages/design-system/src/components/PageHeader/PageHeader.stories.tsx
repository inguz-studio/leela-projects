import type { Meta, StoryObj } from '@storybook/react';
import { PageHeader } from './PageHeader';
import { Avatar } from '../Avatar';
import { Badge } from '../Badge';
import { Button } from '../Button';

const meta: Meta<typeof PageHeader> = {
  title: 'Organismos/PageHeader',
  component: PageHeader,
  args: {
    title: 'Meia Maratona de Floripa',
  },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

/** Cabeçalho completo 96px (§2.1): avatar + badges + metadados + ações. */
export const Completo: Story = {
  args: {
    subtitle: '12 out 2026 · Florianópolis, SC',
    avatar: <Avatar name="Meia Maratona de Floripa" size="lg" />,
    badges: (
      <>
        <Badge variant="vitoria">Publicado</Badge>
        <Badge variant="neutro">21K</Badge>
      </>
    ),
    metadata: <span>1.284 inscritos · 3 kits</span>,
    actions: <Button variant="primary">Editar evento</Button>,
  },
};

/** Só título — mínimo válido do componente. */
export const SoTitulo: Story = {
  args: { title: 'Configurações' },
};

/** Título + subtítulo, sem slots opcionais. */
export const ComSubtitulo: Story = {
  args: { subtitle: '12 out 2026 · Florianópolis, SC' },
};
