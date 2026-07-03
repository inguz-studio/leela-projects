import type { Meta, StoryObj } from '@storybook/react';
import { Toast } from './Toast';
import { ToastProvider, useToast } from './ToastProvider';
import { Button } from '../Button';

const meta: Meta<typeof Toast> = {
  title: 'Feedback/Toast',
  component: Toast,
  tags: ['autodocs'],
  args: { title: 'Evento salvo', variant: 'success' },
  argTypes: {
    variant: { control: 'select', options: ['success', 'danger', 'warning', 'info'] },
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Success: Story = {};

export const Danger: Story = {
  args: { title: 'Falha no pagamento', description: 'Tente novamente.', variant: 'danger' },
};

export const TodasAsVariantes: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--spacing-3)]">
      <Toast title="Inscrição confirmada" variant="success" onDismiss={() => undefined} />
      <Toast title="Falha ao salvar" description="Persiste até fechar." variant="danger" onDismiss={() => undefined} />
      <Toast title="Kit quase esgotado" variant="warning" onDismiss={() => undefined} />
      <Toast title="Sincronizando resultados" variant="info" onDismiss={() => undefined} />
    </div>
  ),
};

function PlaygroundDemo(): JSX.Element {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-[var(--spacing-3)]">
      <Button onClick={() => toast({ title: 'Evento salvo', variant: 'success' })}>
        Success (some em 4s)
      </Button>
      <Button
        variant="destructive"
        onClick={() =>
          toast({ title: 'Falha no pagamento', description: 'Persiste até fechar.', variant: 'danger' })
        }
      >
        Danger (persiste)
      </Button>
    </div>
  );
}

/** Fila real com auto-dismiss 4s; danger persiste até dismiss manual. */
export const ComProvider: Story = {
  render: () => (
    <ToastProvider>
      <PlaygroundDemo />
    </ToastProvider>
  ),
};
