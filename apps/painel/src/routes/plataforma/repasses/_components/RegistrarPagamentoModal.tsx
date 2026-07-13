// =============================================================================
// RegistrarPagamentoModal — pagamento manual auditado de um repasse `aprovado`
// (E09s-L4-T2). Compõe sobre o <Modal> do DS (mesma receita do ConfirmModal),
// porque o corpo é específico: ao abrir, busca o dado bancário COMPLETO
// just-in-time (`getBankDetailsForPayout`, RN-354/L2-T5) e o exibe COM o aviso
// de auditoria LGPD ("acesso registrado") + o aviso EXPLÍCITO de registro manual
// (RN-356: nenhuma transferência bancária é feita pelo sistema nesta versão).
//
// LGPD (crítico): o número em claro vive SÓ enquanto o modal está aberto. Ao
// fechar (X / Esc / overlay / cancelar / após confirmar), o estado é LIMPO —
// nunca persiste no cliente além do necessário; nunca vai para log/console.
//
// A confirmação chama `markRepassePago` (Function — gera o comprovante gapless,
// RN-355) via o callback do container; o cliente NUNCA marca pago direto (RN-357).
// =============================================================================

import * as React from 'react';
import { Button, Modal, Skeleton } from '@leela/design-system';
import type { GetBankDetailsInput, GetBankDetailsResult } from '@leela/api-client';
import { formatBRL } from '../../../financeiro/repasses/_lib/format';
import type { RepasseFilaItem } from '../../../../lib/query/queries';

export interface RegistrarPagamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Repasse `aprovado` a pagar (null = modal fechado, nada a buscar). */
  item: RepasseFilaItem | null;
  /** Leitura AUDITADA do dado bancário completo (injetada — api-client wrapper). */
  fetchBankDetails: (input: GetBankDetailsInput) => Promise<GetBankDetailsResult>;
  /** Confirma o registro manual do pagamento (o container chama markRepassePago). */
  onConfirm: () => void;
  /** true enquanto markRepassePago roda (desabilita as ações). */
  confirming: boolean;
}

type Fetch = { status: 'loading' } | { status: 'ok'; dados: GetBankDetailsResult } | { status: 'erro' };

export function RegistrarPagamentoModal({
  open,
  onOpenChange,
  item,
  fetchBankDetails,
  onConfirm,
  confirming,
}: RegistrarPagamentoModalProps): JSX.Element {
  const [fetch, setFetch] = React.useState<Fetch>({ status: 'loading' });

  const tenantId = item?.repasse.tenantId;
  const repasseId = item?.repasse.id;

  React.useEffect(() => {
    // Fechado ou sem item: LIMPA o dado em claro (LGPD — não persistir no cliente).
    if (!open || !tenantId || !repasseId) {
      setFetch({ status: 'loading' });
      return;
    }
    let ativo = true;
    setFetch({ status: 'loading' });
    void fetchBankDetails({ tenantId, repasseId })
      .then((dados) => {
        if (ativo) setFetch({ status: 'ok', dados });
      })
      .catch(() => {
        if (ativo) setFetch({ status: 'erro' });
      });
    return () => {
      // Troca de item / desmontagem: descarta o resultado em voo e o dado em claro.
      ativo = false;
      setFetch({ status: 'loading' });
    };
  }, [open, tenantId, repasseId, fetchBankDetails]);

  const podeConfirmar = fetch.status === 'ok' && !confirming;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar pagamento"
      size="md"
      footer={
        <>
          <Button variant="secondary" disabled={confirming} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!podeConfirmar} onClick={onConfirm}>
            {confirming ? 'Registrando…' : 'Registrar pagamento'}
          </Button>
        </>
      }
    >
      {item && (
        <div className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-md)] bg-[var(--surface-overlay)] p-[var(--spacing-4)]">
          <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
            {item.tenantNome}
          </span>
          <span className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
            {formatBRL(item.repasse.valor)}
          </span>
        </div>
      )}

      {fetch.status === 'loading' && (
        <div role="status" aria-label="Carregando dados bancários">
          <Skeleton variant="rect" className="h-40" />
        </div>
      )}

      {fetch.status === 'erro' && (
        <div
          role="alert"
          className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-overlay)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
        >
          Não foi possível carregar os dados bancários. Feche e tente novamente.
        </div>
      )}

      {fetch.status === 'ok' && (
        <div className="flex flex-col gap-[var(--spacing-4)]">
          {/* Aviso de auditoria LGPD — acima do número, texto vindo do servidor. */}
          <div
            role="note"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--feedback-warning)] bg-[var(--surface-overlay)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
          >
            {fetch.dados.avisoAuditoria}
          </div>

          <dl className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
            <Campo rotulo="Banco" valor={fetch.dados.banco} />
            <Campo rotulo="Agência" valor={fetch.dados.agencia} />
            <Campo rotulo="Conta" valor={fetch.dados.conta} destaque />
            <Campo rotulo="Tipo" valor={fetch.dados.tipo} />
            <Campo rotulo="Titular" valor={fetch.dados.titular} />
            <Campo rotulo="CPF/CNPJ" valor={fetch.dados.cpfCnpjMascarado} />
            {fetch.dados.pix && <Campo rotulo="Chave PIX" valor={fetch.dados.pix} destaque />}
          </dl>

          {/* Aviso RN-356 — registro manual, sem transferência real. */}
          <div
            role="note"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--feedback-warning)] bg-[var(--surface-overlay)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
          >
            Registro manual — nenhuma transferência bancária é feita pelo sistema nesta versão. Ao
            confirmar, o repasse fica marcado como pago e um comprovante numerado é gerado.
          </div>
        </div>
      )}
    </Modal>
  );
}

function Campo({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }): JSX.Element {
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

RegistrarPagamentoModal.displayName = 'RegistrarPagamentoModal';
