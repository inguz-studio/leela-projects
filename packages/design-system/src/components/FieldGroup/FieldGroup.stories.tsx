import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { FieldGroup } from './FieldGroup';
import { CheckboxField } from '../CheckboxField';
import { FilterChips } from '../FilterChips';

const meta: Meta<typeof FieldGroup> = {
  title: 'Formulário/FieldGroup',
  component: FieldGroup,
  argTypes: {
    gap: { control: 'inline-radio', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
};

export default meta;
type Story = StoryObj<typeof FieldGroup>;

function Marcacoes() {
  const [avisos, setAvisos] = React.useState(true);
  const [resumo, setResumo] = React.useState(false);
  return (
    <>
      <CheckboxField
        label="Avisar quando alguém se inscrever"
        checked={avisos}
        onChange={(e) => setAvisos(e.target.checked)}
      />
      <CheckboxField
        label="Resumo semanal do evento"
        checked={resumo}
        onChange={(e) => setResumo(e.target.checked)}
      />
    </>
  );
}

export const Default: Story = {
  render: (args) => (
    <FieldGroup {...args} legend="Notificações">
      <Marcacoes />
    </FieldGroup>
  ),
};

export const ComDescricao: Story = {
  render: (args) => (
    <FieldGroup
      {...args}
      legend="Notificações"
      description="Valem para este evento. As da conta ficam no seu perfil."
    >
      <Marcacoes />
    </FieldGroup>
  ),
};

/** O erro é DO GRUPO — "escolha ao menos uma" —, não de um campo. */
export const ComErroDoGrupo: Story = {
  render: (args) => (
    <FieldGroup
      {...args}
      legend="Grade de tamanhos"
      errorMessage="Escolha ao menos um corte para publicar o kit."
    >
      <Marcacoes />
    </FieldGroup>
  ),
};

/** O `disabled` do fieldset é nativo e propaga a todos os controles de dentro. */
export const Desabilitado: Story = {
  render: (args) => (
    <FieldGroup {...args} legend="Notificações" disabled description="Disponível no plano avançado.">
      <Marcacoes />
    </FieldGroup>
  ),
};

/** Oito dos onze grupos medidos hospedam `Chip` e `Input`, não `Checkbox`. */
export const ComFaceta: Story = {
  render: (args) => (
    <FieldGroup {...args} legend="Modalidades aceitas">
      <FilterChips
        label="Modalidades"
        multiple
        options={[
          { id: 'corrida', label: 'Corrida' },
          { id: 'ciclismo', label: 'Ciclismo' },
          { id: 'natacao', label: 'Natação' },
        ]}
        selected={['corrida']}
        onChange={() => {}}
      />
    </FieldGroup>
  ),
};
