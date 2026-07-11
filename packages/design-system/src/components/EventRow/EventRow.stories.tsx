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

/**
 * Métricas inline ALINHADAS entre linhas (fix FID-EVT-HUB): valores com
 * contagens de dígitos MUITO diferentes ("0" vs "R$ 167.277") mantêm as
 * colunas Inscritos/Receita/Vagas batendo na vertical. Cada métrica ocupa uma
 * coluna de largura mínima fixa (token `--eventrow-metric-col-min-w`) com valor
 * tabular à direita — zero desalinhamento com valor curto OU longo.
 */
export const HubMetricasAlinhadas: Story = {
  render: () => (
    <>
      {(
        [
          ['Meia Maratona Floripa 2026', 'corrida', '461', 'R$ 167.277', '39'],
          ['Noturna da Beira-Mar 2026', 'corrida', '60', 'R$ 8.940', '0'],
          ['Trilha do Pântano do Sul 2026', 'corrida', '0', 'R$ 0', '80'],
          ['Desafio MTB Costa da Lagoa', 'ciclismo', '120', 'R$ 34.800', '180'],
        ] as const
      ).map(([name, variant, inscritos, receita, vagas]) => (
        <EventRow
          key={name}
          name={name}
          thumbVariant={variant}
          metaItems={['14 Jul 2026 · Florianópolis/SC']}
          metrics={[
            { value: inscritos, label: 'Inscritos' },
            { value: receita, label: 'Receita' },
            { value: vagas, label: 'Vagas' },
          ]}
          badge={<Badge variant="vitoria">Ativo</Badge>}
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

/**
 * Refluxo responsivo em <lg (fix M6). No hub em 390×844 a linha híbrida (thumb
 * de foto + métricas Inscritos/Receita/Vagas + status + ação pesada) não cabia
 * em uma faixa: as métricas cortavam no limite direito e status/ação saíam de
 * cena. Abaixo de `lg` (colapso do shell, 1024px) a EventRow reflui p/ 3 linhas
 * à direita do thumb — [nome+meta] / [métricas, própria linha, nunca cortam] /
 * [status + ação, rodapé]. As métricas seguem alinhadas na vertical entre as
 * linhas (mesma col de min-w + valor tabular à direita). Em lg+ o grid de 5
 * colunas volta byte-idêntico. Use o toolbar de viewport (default: Mobile 390).
 */
export const HubReflowMobile: Story = {
  parameters: {
    viewport: {
      viewports: {
        mobile390: {
          name: 'Mobile 390×844',
          styles: { width: '390px', height: '844px' },
        },
      },
      defaultViewport: 'mobile390',
    },
  },
  render: () => (
    <>
      {(
        [
          ['Meia Maratona Floripa 2026', 'corrida', '461', 'R$ 167.277', '39', 'Publicado'],
          ['Noturna da Beira-Mar 2026', 'corrida', '60', 'R$ 8.940', '0', 'Esgotado'],
          ['Desafio MTB Costa da Lagoa', 'ciclismo', '120', 'R$ 34.800', '180', 'Publicado'],
        ] as const
      ).map(([name, variant, inscritos, receita, vagas, status]) => (
        <EventRow
          key={name}
          name={name}
          thumbVariant={variant}
          thumbImage={{ src: 'https://placehold.co/80x80/FF450C/FFFFFF?text=MF' }}
          metaItems={[
            '14 Jul 2026 · Florianópolis/SC',
            <Badge key="mod" variant="neutro">
              Corrida
            </Badge>,
          ]}
          metrics={[
            { value: inscritos, label: 'Inscritos' },
            { value: receita, label: 'Receita' },
            { value: vagas, label: 'Vagas' },
          ]}
          badge={<Badge variant="vitoria">{status}</Badge>}
          onClick={() => {}}
          action={
            <div className="flex items-center gap-[var(--spacing-1)]">
              <Button variant="ghost" size="sm" aria-label="Mais ações">
                ⋯
              </Button>
              <Button variant="secondary" size="sm">
                Gerenciar
              </Button>
            </div>
          }
        />
      ))}
    </>
  ),
};
