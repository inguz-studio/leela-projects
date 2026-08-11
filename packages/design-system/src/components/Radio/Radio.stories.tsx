import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Badge } from '../Badge';
import { Radio, RadioCard, RadioGroup } from './Radio';

/**
 * Escolha exclusiva. O `RadioGroup` vira `<fieldset>` + `<legend>` e agrupa os
 * radios nativos, então a navegação por seta vem de fábrica. Quando a opção
 * precisa de descrição e peso visual, o canônico é o `RadioCard`.
 */
const meta: Meta<typeof RadioGroup> = {
  title: 'Átomos/Radio',
  component: RadioGroup,
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: function DefaultStory() {
    const [valor, setValor] = React.useState('organizador');
    return (
      <RadioGroup name="origem" label="Quem cadastra o evento" value={valor} onValueChange={setValor}>
        <Radio value="organizador" label="Organizador" />
        <Radio value="assessoria" label="Assessoria" />
        <Radio value="patrocinador" label="Patrocinador" />
      </RadioGroup>
    );
  },
};

export const Horizontal: Story = {
  render: function HorizontalStory() {
    const [valor, setValor] = React.useState('pix');
    return (
      <RadioGroup
        name="pagamento"
        label="Forma de pagamento"
        orientation="horizontal"
        value={valor}
        onValueChange={setValor}
      >
        <Radio value="pix" label="Pix" />
        <Radio value="cartao" label="Cartão" />
        <Radio value="boleto" label="Boleto" />
      </RadioGroup>
    );
  },
};

export const ComDescricaoPorOpcao: Story = {
  render: function ComDescricaoStory() {
    const [valor, setValor] = React.useState('retirada');
    return (
      <RadioGroup
        name="kit"
        label="Entrega do kit"
        description="Dá para trocar até 48h antes da largada."
        value={valor}
        onValueChange={setValor}
      >
        <Radio
          value="retirada"
          label="Retirada presencial"
          description="Nas janelas do evento, mediante documento."
        />
        <Radio value="sem-kit" label="Sem kit" description="Só a inscrição." />
      </RadioGroup>
    );
  },
};

export const ComErro: Story = {
  render: () => (
    <RadioGroup
      name="modalidade"
      label="Modalidade"
      errorMessage="Escolha uma modalidade para seguir."
    >
      <Radio value="5k" label="5 km" />
      <Radio value="10k" label="10 km" />
    </RadioGroup>
  ),
};

export const Desabilitado: Story = {
  render: () => (
    <RadioGroup name="lote" label="Lote" value="lote-1" disabled>
      <Radio value="lote-1" label="1º lote — esgotado" />
      <Radio value="lote-2" label="2º lote" />
    </RadioGroup>
  ),
};

/** Escolha exclusiva com descrição e peso — a decisão que merece a tela. */
export const Cards: Story = {
  render: function CardsStory() {
    const [valor, setValor] = React.useState('completo');
    return (
      <RadioGroup name="plano" label="Plano do evento" value={valor} onValueChange={setValor}>
        <RadioCard
          value="basico"
          title="Básico"
          description="Inscrição e pagamento. Sem kit nem check-in."
        />
        <RadioCard
          value="completo"
          title="Completo"
          description="Inscrição, kit por tamanho, check-in no balcão e repasse."
          badge={<Badge variant="vitoria">Recomendado</Badge>}
        >
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            O conteúdo revelado só aparece quando ESTE card está marcado.
          </p>
        </RadioCard>
      </RadioGroup>
    );
  },
};
