/**
 * ConfirmModal — confirmação de ação destrutiva com preview de consequências
 * (§2.15, C15).
 *
 * PROVENIÊNCIA: COMPOSIÇÃO sobre o <Modal> (Radix Dialog restilizado ao brasa) —
 * NÃO reimplementa o dialog. Herda do Modal as 4 vias de fechamento, o focus
 * trap/retorno de foco e o MOTION tokenizado (fade+zoom); adiciona por cima o
 * card do alvo, as listas de consequência e os controles opcionais
 * (motivo/notificar). API pública INTACTA (mesmos props/exports). Botão de
 * confirmar é o Button variant="destructive" (bg-[var(--action-destructive)],
 * token referenciado direto pela matriz de contraste — não alias).
 *
 * OS CONTROLES SÃO OS CANÔNICOS (Onda 0 · S005): motivo é o `Textarea` do DS,
 * notificar é o `Checkbox` do DS. Até 11/08 este arquivo montava os dois à mão
 * — um `<textarea>` cru e um `<input type="checkbox">` com `accent-color` —
 * dentro do próprio design system. O inventário §3 classificou as duas
 * instâncias como as mais graves das cinco medidas no repositório: o componente
 * que serve de referência carregava por dentro o defeito que a governança §8
 * proíbe nas telas, e as ~26 telas que consomem o ConfirmModal herdavam
 * estados que nunca passaram pelo AA por estado do `Checkbox`.
 *
 * O que a composição paga, concretamente:
 *   - o textarea cru nasceu ANTES do LEELA-FLAT-DEFAULT (ratificado 2026-07-17)
 *     e ficou parado no `bg-surface-base` + `border-strong` da §2.16 antiga —
 *     divergindo de todo campo do produto sem que nenhum gate visse;
 *   - o checkbox cru pintava o marcador por `accent-color`, que não cobre o
 *     check em todos os browsers; o `Checkbox` desenha a marca sobre
 *     `appearance-none` e traz o estado `indeterminate` de fábrica.
 *
 * Estrutura:
 *   - Card do alvo (crítico: border-left 3px Vulcão — exceção §2.16)
 *   - "O que você perde" — lista em Vulcão (danger)
 *   - "O que se mantém" — lista em Vitória (success)
 *   - Motivo opcional (textarea) quando `reasonLabel` é passado
 *   - Checkbox de notificação quando `notifyLabel` é passado
 *   - Cancelar (secondary) + Confirmar (destructive/Vulcão)
 *
 * Fechamento herda as 4 vias do Modal (cancelar / X / overlay / Esc).
 * onConfirm recebe { reason, notify }; o consumidor decide quando fechar
 * (fluxos reais mostram spinner + toast antes de navegar).
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { Textarea } from '../Textarea';
import { Modal, type ModalSize } from './Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfirmModalDetails {
  reason: string;
  notify: boolean;
}

export interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Card do alvo da ação (nome/resumo do que será afetado). */
  target?: React.ReactNode;
  /** Consequências: o que se perde (Vulcão). */
  loses: string[];
  /** Consequências: o que se mantém (Vitória). */
  keeps: string[];
  confirmLabel: string;
  cancelLabel?: string;
  /** Quando presente, exibe textarea de motivo opcional. */
  reasonLabel?: string;
  /** Quando presente, exibe checkbox de notificação. */
  notifyLabel?: string;
  /** Desabilita ações enquanto a operação roda. */
  loading?: boolean;
  size?: ModalSize;
  onConfirm: (details: ConfirmModalDetails) => void;
}

// ---------------------------------------------------------------------------
// Consequence list
// ---------------------------------------------------------------------------

function ConsequenceList({
  heading,
  items,
  tone,
}: {
  heading: string;
  items: string[];
  tone: 'danger' | 'success';
}): JSX.Element | null {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <p
        className={cn(
          'text-[length:var(--font-size-sm)]',
          'font-[var(--font-weight-semibold)]',
          'uppercase tracking-[var(--table-header-spacing)]',
          tone === 'danger' ? 'text-[var(--text-danger)]' : 'text-[var(--text-success)]',
        )}
      >
        {heading}
      </p>
      <ul role="list" className="flex flex-col gap-[var(--spacing-1)]">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-[var(--spacing-2)] text-[length:var(--font-size-base)] text-[var(--text-secondary)]"
          >
            <span
              aria-hidden
              className={cn(
                'shrink-0 font-[var(--font-weight-semibold)]',
                tone === 'danger' ? 'text-[var(--text-danger)]' : 'text-[var(--text-success)]',
              )}
            >
              {tone === 'danger' ? '✕' : '✓'}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  target,
  loses,
  keeps,
  confirmLabel,
  cancelLabel = 'Cancelar',
  reasonLabel,
  notifyLabel,
  loading = false,
  size = 'sm',
  onConfirm,
}: ConfirmModalProps): JSX.Element {
  const [reason, setReason] = React.useState('');
  const [notify, setNotify] = React.useState(false);
  const reasonId = React.useId();
  const notifyId = React.useId();

  // Zera estado interno a cada abertura
  React.useEffect(() => {
    if (open) {
      setReason('');
      setNotify(false);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={() => onConfirm({ reason, notify })}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {/* Card do alvo — crítico (border-left Vulcão, exceção §2.16) */}
      {target && (
        <div
          className={cn(
            'bg-[var(--surface-overlay)]',
            'rounded-[var(--card-radius)]',
            'border-l-[length:var(--card-critical-border)]',
            'border-l-[color:var(--feedback-danger)]',
            'p-[var(--spacing-4)]',
          )}
        >
          {target}
        </div>
      )}

      <ConsequenceList heading="O que você perde" items={loses} tone="danger" />
      <ConsequenceList heading="O que se mantém" items={keeps} tone="success" />

      {/* Motivo — Textarea do DS: casca (label + aria) e aparência flat vêm do
          motor canônico, não deste arquivo. */}
      {reasonLabel && (
        <Textarea
          id={reasonId}
          label={reasonLabel}
          value={reason}
          disabled={loading}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          wrapperClassName="gap-[var(--spacing-2)]"
        />
      )}

      {/* Notificar — Checkbox do DS. A label fica aqui porque o Checkbox é o
          controle nu (é assim que a tabela densa o usa); o htmlFor liga os
          dois e o nome acessível sai igual ao de antes. */}
      {notifyLabel && (
        <div className="flex items-center gap-[var(--spacing-2)]">
          <Checkbox
            id={notifyId}
            checked={notify}
            disabled={loading}
            onChange={(e) => setNotify(e.target.checked)}
          />
          <label
            htmlFor={notifyId}
            className="text-[length:var(--font-size-base)] text-[var(--text-secondary)] select-none"
          >
            {notifyLabel}
          </label>
        </div>
      )}
    </Modal>
  );
}

ConfirmModal.displayName = 'ConfirmModal';

export { ConfirmModal };
