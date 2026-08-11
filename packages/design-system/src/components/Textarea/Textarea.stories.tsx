import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';

/**
 * Texto de múltiplas linhas — descrição de evento, comunicado, regulamento.
 * Mesma casca do `Input` (label + erro + aria-describedby) sobre o
 * `<textarea>` nativo.
 */
const meta: Meta<typeof Textarea> = {
  title: 'Átomos/Textarea',
  component: Textarea,
  args: {
    label: 'Descrição do evento',
    placeholder: 'Percurso, retirada de kit, regras de troca…',
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};

/** Flat é o default global (LEELA-FLAT-DEFAULT): sem borda em repouso. */
export const Flat: Story = {
  args: { variant: 'flat', defaultValue: 'Largada às 6h no Parque de Coqueiros.' },
};

/**
 * Opt-out §2.16 — quando o fill sunken encosta no fundo da superfície, a borda
 * volta a ser o identificador do campo (WCAG 1.4.11 ≥3:1).
 */
export const Bordered: Story = {
  args: { variant: 'bordered', defaultValue: 'Largada às 6h no Parque de Coqueiros.' },
};

export const Invalido: Story = {
  args: {
    id: 'evento-descricao',
    errorMessage: 'A descrição precisa de pelo menos 20 caracteres.',
    defaultValue: 'Corrida.',
  },
};

export const Desabilitado: Story = {
  args: { disabled: true, defaultValue: 'Regulamento travado após a publicação.' },
};

/** Cresce só na vertical: `resize-x` estouraria o container em 390px. */
export const AlturaMaior: Story = {
  args: { rows: 8, label: 'Regulamento', placeholder: 'Cole o regulamento completo…' },
};

export const SemLabelVisivel: Story = {
  render: () => (
    <Textarea aria-label="Motivo do cancelamento" placeholder="Motivo (opcional)" rows={3} />
  ),
};
