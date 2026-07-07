import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { EventRow } from './EventRow';

const meta: Meta<typeof EventRow> = {
  title: 'Moléculas/EventRow',
  component: EventRow,
  decorators: [
    (Story) => (
      <div className="flex flex-col gap-[var(--layout-list-gap)] max-w-3xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EventRow>;

/** Linha do mockup: Meia Maratona Floripa (últimas vagas, 453/500). */
export const Corrida: Story = {
  args: {
    name: 'Meia Maratona Floripa 2026',
    thumbVariant: 'corrida',
    metaItems: [
      '27 Abr · Florianópolis/SC',
      <Badge key="vagas" variant="alerta">Últimas vagas</Badge>,
    ],
    count: { value: '453', total: '500', label: 'Inscrições' },
    badge: <Badge variant="vitoria">Publicado</Badge>,
    action: (
      <Button variant="secondary" size="sm">
        Gerenciar
      </Button>
    ),
  },
};

/** As 5 variantes de thumb (gradiente token por modalidade). */
export const TodasAsModalidades: Story = {
  render: () => (
    <>
      {(
        [
          ['corrida', 'Meia Maratona Floripa 2026', '27 Abr · Florianópolis/SC'],
          ['ciclismo', 'Desafio Serra do Mar · MTB', '11 Mai · Cunha/SP'],
          ['yoga', 'Retiro Bem-Estar · Edição Outono', '23 Mai · Campos do Jordão/SP'],
          ['virtual', 'Desafio Virtual 21 Dias', 'Online'],
          ['crossfit', 'Throwdown de Inverno', '02 Jun · São Paulo/SP'],
        ] as const
      ).map(([variant, name, meta]) => (
        <EventRow
          key={variant}
          name={name}
          thumbVariant={variant}
          metaItems={[meta]}
          count={{ value: '120', total: '300', label: 'Inscrições' }}
          badge={<Badge variant="vitoria">Publicado</Badge>}
          action={
            <Button variant="secondary" size="sm">
              Gerenciar
            </Button>
          }
        />
      ))}
    </>
  ),
};

/**
 * Hub híbrido "Meus Eventos" (decisão FID-EVT-HUB): thumb de FOTO da capa +
 * métricas inline (Inscritos/Receita/Vagas) + badge de status + ação. Serve a
 * triagem veloz do Organizador ("abrir rápido o evento que gerencio").
 */
export const HubHibrido: Story = {
  args: {
    name: 'Meia Maratona Floripa 2026',
    thumbVariant: 'corrida',
    thumbImage: { src: 'https://placehold.co/80x80/FF450C/FFFFFF?text=MF' },
    metaItems: [
      '14 Jul 2026 · Florianópolis/SC',
      <Badge key="mod" variant="neutro">Corrida</Badge>,
      <Badge key="vagas" variant="alerta">Últimas vagas</Badge>,
    ],
    metrics: [
      { value: '453', label: 'Inscritos' },
      { value: 'R$ 85.617', label: 'Receita' },
      { value: '47', label: 'Vagas' },
    ],
    badge: <Badge variant="vitoria">Ativo</Badge>,
    action: (
      <Button variant="secondary" size="sm">
        Gerenciar
      </Button>
    ),
  },
};

/** Sem capacidade conhecida: contagem sem "/ total" (estado honesto). */
export const SemCapacidade: Story = {
  args: {
    name: 'Corrida de Inverno',
    thumbVariant: 'corrida',
    metaItems: ['14 Jul · Curitiba/PR'],
    count: { value: '90', label: 'Inscrições' },
    badge: <Badge variant="neutro">Rascunho</Badge>,
    action: (
      <Button variant="secondary" size="sm">
        Gerenciar
      </Button>
    ),
  },
};
