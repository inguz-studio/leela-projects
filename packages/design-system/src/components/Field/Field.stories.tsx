import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '../Checkbox';
import { Field } from './Field';

/**
 * Casca de campo para controle CRU: recebe UM filho e injeta por `cloneElement`
 * o `id`, o `aria-describedby` (descrição + erro), o `aria-invalid` e o
 * `required`. Zero wiring manual.
 *
 * Quando NÃO usar: `Input`, `Select` e `Textarea` já trazem a própria casca —
 * envolvê-los no `Field` renderiza duas labels.
 */
const meta: Meta<typeof Field> = {
  title: 'Moléculas/Field',
  component: Field,
};

export default meta;
type Story = StoryObj<typeof Field>;

/** O controle cru dentro do Field é o caso legítimo — é assim que o DS constrói. */
export const Default: Story = {
  args: {
    label: 'Limite de inscrições',
    children: (
      <input
        type="number"
        className="h-[var(--input-height)] w-full rounded-[var(--input-radius)] bg-[var(--surface-sunken)] px-[var(--input-px)] text-[var(--text-primary)]"
      />
    ),
  },
};

export const ComDescricao: Story = {
  args: {
    label: 'Código do cupom',
    description: 'Maiúsculas, sem espaço. O participante digita exatamente assim.',
    children: (
      <input
        className="h-[var(--input-height)] w-full rounded-[var(--input-radius)] bg-[var(--surface-sunken)] px-[var(--input-px)] text-[var(--text-primary)]"
      />
    ),
  },
};

export const Obrigatorio: Story = {
  args: {
    label: 'CPF do responsável',
    required: true,
    description: 'Só o número, sem ponto nem traço.',
    children: (
      <input
        className="h-[var(--input-height)] w-full rounded-[var(--input-radius)] bg-[var(--surface-sunken)] px-[var(--input-px)] text-[var(--text-primary)]"
      />
    ),
  },
};

/** O erro tem `role="alert"` e entra no `aria-describedby` junto com a descrição. */
export const ComErro: Story = {
  args: {
    label: 'CPF do responsável',
    description: 'Só o número, sem ponto nem traço.',
    errorMessage: 'CPF inválido — confira os 11 dígitos.',
    children: (
      <input
        defaultValue="123"
        className="h-[var(--input-height)] w-full rounded-[var(--input-radius)] bg-[var(--surface-sunken)] px-[var(--input-px)] text-[var(--text-primary)]"
      />
    ),
  },
};

export const Desabilitado: Story = {
  args: {
    label: 'Chave Pix',
    disabled: true,
    description: 'Bloqueada enquanto houver repasse em andamento.',
    children: (
      <input
        defaultValue="financeiro@evento.com.br"
        className="h-[var(--input-height)] w-full rounded-[var(--input-radius)] bg-[var(--surface-sunken)] px-[var(--input-px)] text-[var(--text-primary)]"
      />
    ),
  },
};

/** Também serve o controle do DS que é nu por desenho — o `Checkbox`. */
export const EnvolvendoCheckbox: Story = {
  args: {
    label: 'Aceite do regulamento',
    description: 'Sem o aceite a inscrição não é emitida.',
    children: <Checkbox />,
  },
};
