import type { Meta, StoryObj } from '@storybook/react';
import { Mail } from 'lucide-react';
import { Alert } from './Alert';
import { Button } from '../Button';
import { Stack } from '../Stack';

const meta: Meta<typeof Alert> = {
  title: 'Feedback/Alert',
  component: Alert,
  args: {
    title: 'Estamos confirmando o seu pedido',
    children: 'Confira a caixa de entrada do e-mail que você informou na compra.',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['info', 'vitoria', 'alerta', 'vulcao'] },
    live: { control: 'inline-radio', options: ['none', 'status', 'alert'] },
    titleAs: { control: 'inline-radio', options: ['h2', 'h3', 'h4'] },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {};

export const Tons: Story = {
  render: () => (
    <Stack gap="md">
      <Alert tone="info" title="Estamos confirmando o seu pedido">
        Confira a caixa de entrada do e-mail que você informou na compra.
      </Alert>
      <Alert tone="vitoria" title="Inscrição confirmada">
        O acesso do seu ingresso já está na sua área.
      </Alert>
      <Alert tone="alerta" title="Este pedido não foi concluído">
        A cobrança não foi confirmada e este pedido não vale mais. Nenhum ingresso será emitido
        por ele.
      </Alert>
      <Alert tone="vulcao" title="Cartão recusado">
        Revise os dados do cartão e tente de novo.
      </Alert>
    </Stack>
  ),
};

/**
 * Os quatro avisos que o checkout escrevia à mão, montados com a peça. Era esta
 * repetição que a lane CKPIX-FLOW encaminhou para a fundação: quatro cópias com
 * cinco divergências de forma, e nenhuma delas era decisão.
 */
export const OsQuatroAvisosDoCheckout: Story = {
  render: () => (
    <Stack gap="md">
      {/* AvisoPedidoEncerrado — desfecho final, canal assertivo */}
      <Alert tone="alerta" titleAs="h2" live="alert" title="Este pedido não foi concluído">
        A cobrança não foi confirmada e este pedido não vale mais. Nenhum ingresso será emitido
        por ele. Se você ainda quer participar, comece uma nova compra.
      </Alert>

      {/* AvisoPedidoEmConfirmacao — espera, canal polido, ícone trocado e CTA */}
      <Alert
        tone="info"
        titleAs="h2"
        live="status"
        icon={<Mail className="w-[var(--alert-icon-size)] h-[var(--alert-icon-size)]" />}
        title="Estamos confirmando o seu pedido"
        actions={<Button variant="secondary">Meus pedidos</Button>}
      >
        Confira a caixa de entrada do e-mail que você informou na compra — o acesso do seu
        ingresso vai por lá. Se não encontrar em alguns minutos, olhe também no spam.
      </Alert>

      {/* ProcessandoPagamento — espera curta, sem título grande */}
      <Alert tone="info" live="status" title="Processando o pagamento">
        Isso leva alguns segundos. Não feche esta aba.
      </Alert>

      {/* DesfechoPosPagamento — PIX vencido */}
      <Alert tone="alerta" live="alert" title="O PIX foi cancelado após o prazo vencer">
        A vaga voltou para o evento. Você pode começar uma nova compra agora.
      </Alert>
    </Stack>
  ),
};

/**
 * O canal de ARIA é prop porque os três arquivos do checkout escolheram canais
 * diferentes, cada um com a razão escrita, e estavam certos. O default é
 * `none`: aviso que já estava na tela quando ela carregou não é live region.
 */
export const CanaisDeAnuncio: Story = {
  render: () => (
    <Stack gap="md">
      <Alert live="none" title='live="none" (default)'>
        Sem live region. Aviso que já estava na tela — anunciar conteúdo estático a cada render é
        ruído, e ruído treina a pessoa a ignorar o canal.
      </Alert>
      <Alert live="status" title='live="status"'>
        Polido, espera a vez. Progresso e espera — não pode atropelar o anúncio de erro que divide
        a tela.
      </Alert>
      <Alert live="alert" tone="vulcao" title='live="alert"'>
        Assertivo, interrompe. Desfecho que muda o que a pessoa precisa fazer.
      </Alert>
    </Stack>
  ),
};

export const SemTituloESemIcone: Story = {
  render: () => (
    <Stack gap="md">
      <Alert title={undefined}>Só o corpo, com o ícone do tom.</Alert>
      <Alert icon={null} title="Sem ícone">
        Quando o aviso já vive dentro de um bloco que carrega o ícone.
      </Alert>
    </Stack>
  ),
};
