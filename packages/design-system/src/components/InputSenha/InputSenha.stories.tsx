import type { Meta, StoryObj } from '@storybook/react';
import { InputSenha } from './InputSenha';

/**
 * Campo de senha da casa. Nasce OCULTA sempre; o olho alterna sem trocar o nó
 * (o `autocomplete` do gerenciador sobrevive) e anuncia o estado por
 * `aria-pressed`. O medidor de força é OPCIONAL: sem `avaliacao` o campo é o
 * de login, onde medir a força de uma senha existente não orienta ninguém e
 * entrega ao vizinho que ela é fraca.
 */
const meta: Meta<typeof InputSenha> = {
  title: 'Átomos/InputSenha',
  component: InputSenha,
  args: { label: 'Senha' },
};

export default meta;
type Story = StoryObj<typeof InputSenha>;

/** Login — sem medidor. */
export const Default: Story = {
  args: { autoComplete: 'current-password', defaultValue: 'segredo-do-login' },
};

export const Fraca: Story = {
  args: {
    autoComplete: 'new-password',
    defaultValue: 'corrida',
    avaliacao: {
      forca: 'fraca',
      rotulo: 'Fraca',
      pendencias: ['um número', 'um caractere especial'],
    },
  },
};

export const Media: Story = {
  args: {
    autoComplete: 'new-password',
    defaultValue: 'corrida2026',
    avaliacao: { forca: 'media', rotulo: 'Média', pendencias: ['um caractere especial'] },
  },
};

/** Forte não é só a cor: a pendência some e o rótulo diz o estado por escrito. */
export const Forte: Story = {
  args: {
    autoComplete: 'new-password',
    defaultValue: 'corrida2026!',
    avaliacao: { forca: 'forte', rotulo: 'Forte', pendencias: [] },
  },
};

export const ComErro: Story = {
  args: {
    autoComplete: 'new-password',
    defaultValue: 'abc',
    errorMessage: 'A senha precisa de 8 caracteres, um número e um caractere especial.',
  },
};

export const Desabilitado: Story = {
  args: { disabled: true, defaultValue: 'bloqueado' },
};
