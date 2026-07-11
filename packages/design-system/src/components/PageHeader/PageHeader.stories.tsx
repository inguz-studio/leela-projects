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

/**
 * Header pesado de ações + metadata rica (LEELA-RESP-M4). Reproduz o caso que
 * quebrava em 390: abaixo de `lg` o slot de ações desce para a própria linha
 * (`basis-full`) e a metadata volta a fluir natural, em vez de quebrar 1
 * palavra/linha. Redimensione a viewport abaixo de 1024px para ver o wrap.
 * Em `lg`+ (desktop) o layout é linha única, ações à direita — intocado.
 */
export const AcoesLongasResponsivo: Story = {
  args: {
    title: 'Meia Maratona de Floripa',
    avatar: <Avatar name="Meia Maratona de Floripa" size="lg" />,
    badges: <Badge variant="vitoria">Publicado</Badge>,
    metadata: <span>19 de julho de 2026 · Florianópolis · Faltam 8 dias para o evento</span>,
    actions: (
      <>
        <Button variant="ghost">Ver página pública</Button>
        <Button variant="secondary">Editar evento</Button>
      </>
    ),
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
