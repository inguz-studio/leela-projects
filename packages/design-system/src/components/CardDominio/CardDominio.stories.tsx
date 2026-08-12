import type { Meta, StoryObj } from '@storybook/react';
import { MoreVertical } from 'lucide-react';
import { CardDominio } from './CardDominio';
import { Avatar } from '../Avatar';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { KpiCard } from '../KpiCard';
import { MetricGrid } from '../MetricGrid';
import { Stack } from '../Stack';

const meta: Meta<typeof CardDominio> = {
  title: 'Cartões/CardDominio',
  component: CardDominio,
  argTypes: {
    accent: {
      control: 'select',
      options: ['none', 'brand', 'vitoria', 'alerta', 'vulcao', 'heroico', 'neutro'],
    },
    titleAs: { control: 'inline-radio', options: ['h2', 'h3', 'h4'] },
    as: { control: 'inline-radio', options: ['article', 'div', 'section', 'li'] },
    clamp: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof CardDominio>;

export const Default: Story = {
  args: {
    title: 'Clube Vento Sul',
    description: 'Corrida de rua e trail, sábados às 7h na Beira-Mar.',
  },
};

/**
 * As cinco famílias que a §7.2 do inventário encontrou órfãs, montadas com a
 * MESMA peça. É esta story que sustenta a decisão de publicar um componente em
 * vez de cinco: o que muda entre elas é o conteúdo dos slots, não a montagem.
 */
export const AsCincoFamilias: Story = {
  render: () => (
    <Stack gap="lg">
      {/* Clube — Avatar à esquerda, indicadores no corpo, ação no rodapé */}
      <CardDominio
        title="Clube Vento Sul"
        leading={<Avatar name="Clube Vento Sul" size="lg" />}
        badges={<Badge variant="brand">Corrida</Badge>}
        meta={<span>312 membros · 4 desafios</span>}
        actions={
          <IconButton aria-label="Ações de Clube Vento Sul">
            <MoreVertical />
          </IconButton>
        }
        footer={<Button variant="primary">Abrir clube</Button>}
      >
        <MetricGrid columns={2}>
          <KpiCard label="Membros ativos" value="312" />
          <KpiCard label="Desafios ativos" value="4" />
        </MetricGrid>
      </CardDominio>

      {/* Comunicado — acento lateral de estado, descrição cortada em 2 linhas */}
      <CardDominio
        title="Retirada de kit começa quinta"
        accent="vitoria"
        badges={<Badge variant="vitoria">Enviado</Badge>}
        description="A retirada acontece na loja parceira, das 10h às 20h, mediante documento com foto. Quem não retirar até sábado pega no dia da prova."
        meta={
          <>
            <span>WhatsApp + e-mail</span>
            <span aria-hidden>·</span>
            <span>1.102 alcançados</span>
          </>
        }
        actions={
          <IconButton aria-label="Ações do comunicado">
            <MoreVertical />
          </IconButton>
        }
      />

      {/* Campanha — dois selos, acento de alerta */}
      <CardDominio
        title="Última chamada do lote 2"
        accent="alerta"
        badges={
          <>
            <Badge variant="alerta">Agendada</Badge>
            <Badge variant="brand">Automação</Badge>
          </>
        }
        description="Dispara na véspera do encerramento do lote para quem abriu a página e não concluiu."
        meta={<span>E-mail · carrinho abandonado · agendada para 11/10</span>}
        actions={
          <IconButton aria-label="Ações da campanha">
            <MoreVertical />
          </IconButton>
        }
      />

      {/* Parceria — selo à direita no lugar do menu, dois botões no rodapé */}
      <CardDominio
        title="Meia Floripa 2026"
        description="Comissão 12% · cupom VENTO12 · janela de 30 dias"
        actions={<Badge variant="heroico">Convite pendente</Badge>}
        footer={
          <>
            <Button variant="ghost">Recusar</Button>
            <Button variant="primary">Aceitar</Button>
          </>
        }
      />

      {/* Afiliação — indicadores no corpo, título em h2 (é o bloco da página) */}
      <CardDominio
        title="Circuito das Dunas"
        titleAs="h2"
        actions={<Badge variant="vitoria">Ativa</Badge>}
        meta={<span>Link ?ref=VENTO · janela 30 dias · cupom VENTO12</span>}
      >
        <MetricGrid columns={3}>
          <KpiCard label="Inscrições atribuídas" value="86" />
          <KpiCard label="Valor atribuído" value="R$ 9.420,00" />
          <KpiCard label="Comissão acumulada" value="R$ 942,00" />
        </MetricGrid>
      </CardDominio>
    </Stack>
  ),
};

/**
 * O acento lateral de estado. No painel ele era `style={{ borderLeftColor }}`
 * a partir de um mapa de status — cor por objeto de estilo inline, que é por
 * onde valor cru entra sem o gate de marca ver.
 */
export const Acentos: Story = {
  render: () => (
    <Stack gap="sm">
      {(['none', 'brand', 'vitoria', 'alerta', 'vulcao', 'heroico', 'neutro'] as const).map(
        (accent) => (
          <CardDominio key={accent} title={`accent="${accent}"`} accent={accent} />
        ),
      )}
    </Stack>
  ),
};

/** Em lista, o cartão é `<li>` — `<div>` filho direto de `<ul>` quebra a semântica. */
export const EmLista: Story = {
  render: () => (
    <Stack as="ul" gap="sm">
      <CardDominio as="li" title="Primeiro comunicado" accent="neutro" />
      <CardDominio as="li" title="Segundo comunicado" accent="neutro" />
    </Stack>
  ),
};
