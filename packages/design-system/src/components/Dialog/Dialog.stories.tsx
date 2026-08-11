import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Button } from '../Button';
import { Dialog } from './Dialog';

/**
 * Diálogo da superfície PÚBLICA — Radix-free por peso de bundle (ADR-017).
 * Entra por `@leela/design-system/dialog`. No painel, o canônico segue sendo o
 * `Modal`; aqui a anatomia (focus trap, retorno de foco, Esc, overlay) é
 * escrita à mão em `useDialogBehavior`.
 */
const meta: Meta<typeof Dialog> = {
  title: 'Organismos/Dialog',
  component: Dialog,
};

export default meta;
type Story = StoryObj<typeof Dialog>;

function Palco(props: Partial<React.ComponentProps<typeof Dialog>>): JSX.Element {
  const [aberto, setAberto] = React.useState(false);
  const gatilho = React.useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={gatilho} onClick={() => setAberto(true)}>
        Abrir diálogo
      </Button>
      <Dialog
        open={aberto}
        onOpenChange={setAberto}
        title="Trocar o tamanho da camiseta"
        description="A troca vale enquanto o kit não for retirado."
        returnFocusRef={gatilho}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setAberto(false)}>Confirmar troca</Button>
          </>
        }
        {...props}
      >
        <p className="text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
          O tamanho atual é M. A troca é registrada no pedido e o balcão vê a
          alteração na hora.
        </p>
      </Dialog>
    </>
  );
}

/** O foco volta para o botão que abriu — é o `returnFocusRef`. */
export const Default: Story = {
  render: () => <Palco />,
};

export const SemDescricao: Story = {
  render: () => <Palco description={undefined} title="Confirmar inscrição" />,
};

export const SemRodape: Story = {
  render: () => <Palco footer={undefined} title="Como funciona a retirada do kit" />,
};

/** A hierarquia da página decide o nível do heading. */
export const TituloH3: Story = {
  render: () => <Palco titleAs="h3" />,
};
