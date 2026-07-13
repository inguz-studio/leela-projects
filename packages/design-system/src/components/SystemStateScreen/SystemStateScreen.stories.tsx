import type { Meta, StoryObj } from '@storybook/react';
import { SystemStateScreen } from './SystemStateScreen';

// Copy dos exemplos = glossário HANDOFF-07 (3 estados da Onda 2). Ações usam
// `onPress` no-op nos stories (a navegação real é fiada nas superfícies).
const meta: Meta<typeof SystemStateScreen> = {
  title: 'Feedback/SystemStateScreen',
  component: SystemStateScreen,
};

export default meta;
type Story = StoryObj<typeof SystemStateScreen>;

const noop = (): void => undefined;

/** 404 dentro do shell do Painel (título/mensagem canônicos HANDOFF-07). */
export const NotFoundShell: Story = {
  args: {
    variant: 'notFound',
    layout: 'shell',
    title: 'Essa página saiu para correr',
    message: 'O link que você seguiu não existe ou mudou de lugar.',
    actions: [
      { label: 'Voltar', onPress: noop, variant: 'secondary' },
      { label: 'Ir para a Visão Geral', onPress: noop, variant: 'primary' },
    ],
  },
};

/** 404 em tela cheia (Landing pública, sem shell). */
export const NotFoundFullscreen: Story = {
  args: {
    variant: 'notFound',
    layout: 'fullscreen',
    title: 'Essa página saiu para correr',
    message: 'O link que você seguiu não existe ou mudou de lugar.',
    actions: [{ label: 'Ir para a página inicial', onPress: noop, variant: 'primary', href: '/' }],
  },
};

/** 403 dentro do shell — casado com a matriz de papéis (E04-S304). */
export const Forbidden: Story = {
  args: {
    variant: 'forbidden',
    layout: 'shell',
    title: 'Esse espaço ainda não é seu',
    message: 'Você não tem permissão para ver esta área.',
    actions: [
      { label: 'Voltar', onPress: noop, variant: 'secondary' },
      { label: 'Falar com o organizador', onPress: noop, variant: 'ghost', href: 'mailto:suporte@leela' },
    ],
  },
};

/** 500 com id de erro — exceção §2.16 (border-left Vulcão) + role="alert". */
export const Error500: Story = {
  args: {
    variant: 'error',
    layout: 'shell',
    title: 'Tropeçamos aqui, não foi você',
    message: 'Algo quebrou do nosso lado e a equipe já foi avisada.',
    detail: 'a1b2c3d4',
    actions: [
      { label: 'Tentar novamente', onPress: noop, variant: 'primary' },
      { label: 'Voltar', onPress: noop, variant: 'secondary' },
    ],
  },
};

/** 500 em tela cheia (erro de raiz — sem shell). */
export const Error500Fullscreen: Story = {
  args: {
    variant: 'error',
    layout: 'fullscreen',
    title: 'Tropeçamos aqui, não foi você',
    message: 'Algo quebrou do nosso lado e a equipe já foi avisada.',
    detail: 'a1b2c3d4',
    actions: [
      { label: 'Tentar novamente', onPress: noop, variant: 'primary' },
      { label: 'Voltar', onPress: noop, variant: 'secondary' },
    ],
  },
};
