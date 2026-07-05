// =============================================================================
// DeletarClubeModal - exclusao do clube (S110-T2 / 2.15 + LGPD). Modal do DS
// com preview de consequencias (o que se perde), disclaimer LGPD de
// irreversibilidade + retencao de 90 dias (RN-144) e confirmacao por DIGITACAO
// do nome do clube (guarda anti-acidente). Oferece exportar os dados antes de
// excluir. As mutacoes (deletar/exportar) sao injetadas pelo container e
// atendidas pelas Functions do lote Fable (S110-T2 backend).
// =============================================================================

import { useState } from 'react';
import { Badge, Button, Modal } from '@leela/design-system';

export interface DeletarClubeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nome do clube — o usuário deve digitá-lo para habilitar a exclusão. */
  nomeClube: string;
  onExportar: () => void | Promise<void>;
  onConfirmar: () => void | Promise<void>;
}

const PERDAS = [
  'Todos os membros e seus históricos no clube',
  'Todos os desafios, pontuações e progresso',
  'Parcerias, comunicados e configurações',
  'A página pública e o código de convite',
];

export function DeletarClubeModal({
  open,
  onOpenChange,
  nomeClube,
  onExportar,
  onConfirmar,
}: DeletarClubeModalProps): JSX.Element {
  const [confirmacao, setConfirmacao] = useState('');
  const [processando, setProcessando] = useState(false);
  const podeExcluir = confirmacao.trim() === nomeClube.trim();

  async function excluir(): Promise<void> {
    if (!podeExcluir) return;
    setProcessando(true);
    try {
      await onConfirmar();
    } finally {
      setProcessando(false);
    }
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={() => onOpenChange(false)}>
        Cancelar
      </Button>
      <Button variant="destructive" disabled={!podeExcluir || processando} onClick={() => void excluir()}>
        {processando ? 'Excluindo…' : 'Excluir clube permanentemente'}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Deletar clube"
      description="Esta ação é irreversível."
      footer={footer}
    >
      <div className="flex flex-col gap-[var(--spacing-4)]">
        <Badge variant="alerta">Irreversível</Badge>

        <div className="flex flex-col gap-[var(--spacing-2)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            O que você perde
          </span>
          <ul className="flex flex-col gap-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {PERDAS.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </div>

        <p className="rounded-[var(--radius-md)] bg-[var(--surface-base)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Conforme a LGPD, os dados ficam disponíveis para exportação por até 90 dias
          após a exclusão e depois são apagados definitivamente (RN-144). Exporte antes
          de excluir se quiser guardar uma cópia.
        </p>

        <div>
          <Button variant="ghost" onClick={() => void onExportar()}>
            Exportar dados do clube
          </Button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Digite <strong>{nomeClube}</strong> para confirmar
          </span>
          <input
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            aria-label="Confirmar nome do clube"
            placeholder={nomeClube}
            className="rounded-[var(--input-radius)] border-[length:var(--input-border-width)] border-[var(--border-strong)] bg-[var(--surface-base)] px-[var(--input-px)] py-[var(--spacing-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]"
          />
        </label>
      </div>
    </Modal>
  );
}

DeletarClubeModal.displayName = 'DeletarClubeModal';
