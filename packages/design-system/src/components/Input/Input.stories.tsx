import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Átomos/Input',
  component: Input,
  args: { label: 'Nome do evento', placeholder: 'Meia Maratona de Floripa' },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const Invalido: Story = {
  args: {
    id: 'evento-nome',
    errorMessage: 'Informe um nome com pelo menos 3 caracteres.',
    defaultValue: 'Ab',
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Campo bloqueado' },
};

export const SemLabelVisivel: Story = {
  render: () => <Input aria-label="Buscar inscritos" placeholder="Buscar…" />,
};

/** A régua permanente do campo — o que vale sempre, e não o que deu errado agora. */
export const ComDica: Story = {
  args: {
    id: 'lote-preco',
    label: 'Preço da inscrição (R$)',
    placeholder: 'Ex.: 99,90',
    hint: 'O ponto separa o milhar (1.234 = mil duzentos e trinta e quatro). Para centavos, use vírgula (1,23).',
  },
};

/** A dica NÃO se move quando a recusa aparece: ela fica entre o campo e o erro. */
export const ComDicaEErro: Story = {
  args: {
    id: 'lote-preco-invalido',
    label: 'Preço da inscrição (R$)',
    defaultValue: '1,234.56',
    hint: 'O ponto separa o milhar (1.234 = mil duzentos e trinta e quatro). Para centavos, use vírgula (1,23).',
    errorMessage:
      'Pontuação fora do padrão. Ponto separa milhar e vírgula separa centavos (ex.: 1.234,56).',
  },
};
