// =============================================================================
// ComprovanteModal — comprovante de um repasse PAGO (E09s-L3-T4). Registro
// numerado (REP-…, RN-355), valor, dados bancários MASCARADOS (snapshot
// congelado — RN-354) e a data do pagamento.
//
// Aviso RN-356 (explícito): "pagamento processado manualmente (sem transferência
// automática nesta versão)" — "pago" é registro mock, não uma transferência
// bancária real. PDF ausente por ora (V1.1, decisão #9) — nota honesta no rodapé.
// =============================================================================

import { Modal } from '@leela/design-system';
import type { Repasse } from '@leela/core';
import { formatBRL, formatDataHora } from '../_lib/format';
import { rotuloTipoConta } from '../_lib/dadosBancariosForm';
import { pagoEm } from '../_lib/estadoRepasse';

export interface ComprovanteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Repasse a exibir — o comprovante só faz sentido em estado `pago`. */
  repasse: Repasse;
}

export function ComprovanteModal({ open, onOpenChange, repasse }: ComprovanteModalProps): JSX.Element {
  const d = repasse.dadosBancariosSnapshot;
  const numero = repasse.comprovanteNumero ?? '—';

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Comprovante de repasse" size="md">
      <div className="flex flex-col gap-[var(--spacing-4)]">
        <div className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-md)] bg-[var(--surface-overlay)] p-[var(--spacing-4)]">
          <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">Comprovante</span>
          <span className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
            {numero}
          </span>
        </div>

        <dl className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
          <Campo rotulo="Valor pago" valor={formatBRL(repasse.valor)} destaque />
          <Campo rotulo="Data do pagamento" valor={formatDataHora(pagoEm(repasse))} />
          <Campo rotulo="Banco" valor={d.banco} />
          <Campo rotulo="Agência" valor={d.agencia} />
          <Campo rotulo="Conta" valor={d.contaMascarada} />
          <Campo rotulo="Tipo" valor={rotuloTipoConta(d.tipo)} />
          <Campo rotulo="Titular" valor={d.titular} />
          <Campo rotulo="CPF/CNPJ" valor={d.cpfCnpjMascarado} />
          {d.pixMascarado && <Campo rotulo="Chave PIX" valor={d.pixMascarado} />}
        </dl>

        {/* Aviso RN-356 — pagamento manual mock, sem transferência real. */}
        <div
          role="note"
          className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--feedback-warning)] bg-[var(--surface-overlay)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
        >
          Registro de repasse — pagamento processado manualmente (sem transferência automática nesta versão).
        </div>

        <p className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
          Exportação em PDF disponível em uma próxima versão.
        </p>
      </div>
    </Modal>
  );
}

function Campo({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <dt className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">{rotulo}</dt>
      <dd
        className={
          destaque
            ? 'text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]'
            : 'text-[length:var(--font-size-base)] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]'
        }
      >
        {valor}
      </dd>
    </div>
  );
}

ComprovanteModal.displayName = 'ComprovanteModal';
