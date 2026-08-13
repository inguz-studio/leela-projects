import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { CheckboxField } from './CheckboxField';

const meta: Meta<typeof CheckboxField> = {
  title: 'Formulário/CheckboxField',
  component: CheckboxField,
  args: { label: 'Receber avisos por e-mail' },
};

export default meta;
type Story = StoryObj<typeof CheckboxField>;

/** Controlado — o pai é a fonte do estado, como em todo controle do DS. */
function Campo(props: React.ComponentProps<typeof CheckboxField>) {
  const [marcado, setMarcado] = React.useState(false);
  return <CheckboxField {...props} checked={marcado} onChange={(e) => setMarcado(e.target.checked)} />;
}

export const Default: Story = {
  render: (args) => <Campo {...args} />,
};

export const ComDescricao: Story = {
  render: (args) => (
    <Campo
      {...args}
      description="Só o resumo semanal. Nada de aviso a cada inscrição."
    />
  ),
};

export const ComErro: Story = {
  render: (args) => (
    <Campo
      {...args}
      label="Li e aceito os termos da compra"
      errorMessage="É preciso aceitar os termos para continuar."
    />
  ),
};

/**
 * O rótulo com link. O `<label htmlFor>` irmão deixa o link clicável sem que a
 * tela precise tirá-lo do rótulo — é o caso do aceite de compra da landing, que
 * hoje resolve movendo o gatilho para fora do `<label>`.
 */
export const RotuloComLink: Story = {
  render: (args) => (
    <Campo
      {...args}
      label={
        <>
          Li e aceito os{' '}
          <a href="#termos" className="underline">
            termos da compra
          </a>{' '}
          e a política de cancelamento deste evento.
        </>
      }
    />
  ),
};

/**
 * O alinhamento ao topo é o que o rótulo de duas linhas exige — e é o mesmo em
 * rótulo de uma linha, para a tela não ter o que escolher.
 */
export const RotuloQueQuebra: Story = {
  render: (args) => (
    <div className="w-[var(--search-width)] max-w-full">
      <Campo
        {...args}
        label="Declaro que estou em boas condições de saúde e apto a participar deste evento, conforme o termo de responsabilidade."
      />
    </div>
  ),
};

export const Desabilitado: Story = {
  render: (args) => <Campo {...args} disabled description="Disponível só no plano avançado." />,
};
