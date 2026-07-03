import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Modal, type ModalSize } from './Modal';
import { ConfirmModal } from './ConfirmModal';
import { Button } from '../Button';
import { Input } from '../Input';

const meta: Meta<typeof Modal> = {
  title: 'Organismos/Modal',
  component: Modal,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Modal>;

function ModalDemo({ size }: { size: ModalSize }): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir modal ({size})</Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        size={size}
        title="Editar kit"
        description="Altere os dados do kit. As 4 vias de fechamento funcionam: cancelar, X, overlay e Esc."
        footer={
          <div className="flex justify-end gap-[var(--spacing-3)]">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setOpen(false)}>Salvar</Button>
          </div>
        }
      >
        <Input label="Nome do kit" defaultValue="Kit Completo" />
      </Modal>
    </>
  );
}

/** Larguras 480/560/640 (§2.15) + 4 vias de fechamento. */
export const Sm: Story = { render: () => <ModalDemo size="sm" /> };
export const Md: Story = { render: () => <ModalDemo size="md" /> };
export const Lg: Story = { render: () => <ModalDemo size="lg" /> };

function ConfirmDemo(): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Cancelar evento
      </Button>
      <ConfirmModal
        open={open}
        onOpenChange={setOpen}
        title="Cancelar Meia Maratona de Floripa?"
        description="Esta ação não pode ser desfeita."
        target={
          <div className="flex flex-col gap-[var(--spacing-1)]">
            <span className="font-[var(--font-weight-semibold)]">Meia Maratona de Floripa</span>
            <span className="text-[var(--text-secondary)]">12 out 2026 · 1.284 inscritos</span>
          </div>
        }
        loses={['Todas as 1.284 inscrições ativas', 'Página pública do evento', 'Integração de resultados']}
        keeps={['Histórico financeiro', 'Relatórios já exportados', 'Dados dos membros do club']}
        reasonLabel="Motivo do cancelamento (opcional)"
        notifyLabel="Notificar todos os inscritos por e-mail"
        confirmLabel="Cancelar evento"
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}

/** ConfirmModal §2.15 — card do alvo + perde (Vulcão) + mantém (Vitória) + motivo + notificar. */
export const Confirmacao: Story = { render: () => <ConfirmDemo /> };
