// =============================================================================
// AplicarPlanoModal — confirma a aplicação de um plano a um organizador (CB-T3).
// Confirmação §2.15 sobre o Modal base (o mesmo primitivo que a ConfirmModal do
// DS compõe): card do alvo (plano + valores que serão estampados), Select de
// tenant e o aviso EXPLÍCITO da semântica de estampa. A ConfirmModal padrão do
// DS tem shape fixo (target/loses/keeps) e não hospeda o Select de tenant; aqui
// o Select vive dentro da própria confirmação, num único passo testável.
//
// SEMÂNTICA CANÔNICA (repetida na tela, decisão #15): aplicar = estampar a versão
// ATUAL do plano nos commercialTerms/current do organizador (nova versão
// versionada, mecanismo S1602-T1) — SEM vínculo vivo. Editar o plano DEPOIS não
// retroage; só reaplicar re-estampa. A escrita vai por Cloud Function
// (aplicarPlano); a tela nunca toca commercialTerms direto (RN-404).
// =============================================================================

import { Badge, Button, Modal, Select } from '@leela/design-system';
import type { SelectOption } from '@leela/design-system';
import type { PlanoCobranca } from '@leela/core';
import { formatBRL, formatPct } from '../../_lib/format';
import { resumoTabelaParcelas } from '../_lib/resumo';

export interface AplicarPlanoModalTenant {
  id: string;
  nome: string;
}

export interface AplicarPlanoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plano escolhido para aplicar (null quando o modal está fechado). */
  plano: PlanoCobranca | null;
  tenants: AplicarPlanoModalTenant[] | null;
  tenantsLoading: boolean;
  selectedTenantId: string;
  onSelectTenant: (id: string) => void;
  applying: boolean;
  applyError: Error | null;
  /** Confirma a aplicação (o container já detém plano + tenant selecionados). */
  onConfirm: () => void;
}

const SEM_TENANT = '';

export function AplicarPlanoModal({
  open,
  onOpenChange,
  plano,
  tenants,
  tenantsLoading,
  selectedTenantId,
  onSelectTenant,
  applying,
  applyError,
  onConfirm,
}: AplicarPlanoModalProps): JSX.Element | null {
  if (!plano) return null;

  const tenantOptions: SelectOption[] = [
    { value: SEM_TENANT, label: 'Selecione o organizador…' },
    ...(tenants ?? []).map((t) => ({ value: t.id, label: t.nome })),
  ];

  const podeAplicar = selectedTenantId !== SEM_TENANT && !applying && !tenantsLoading;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Aplicar plano de cobrança"
      size="md"
      footer={
        <>
          <Button variant="secondary" disabled={applying} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!podeAplicar} onClick={onConfirm}>
            {applying ? 'Aplicando…' : 'Aplicar plano'}
          </Button>
        </>
      }
    >
      {/* Card do alvo — valores que serão estampados (§2.15, border-left crítico) */}
      <div className="rounded-[var(--card-radius)] border-l-4 border-l-[color:var(--feedback-danger)] bg-[var(--surface-overlay)] p-[var(--spacing-4)]">
        <div className="flex items-center justify-between gap-[var(--spacing-3)]">
          <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">{plano.nome}</span>
          <Badge variant="neutro">plano</Badge>
        </div>
        <dl className="mt-[var(--spacing-3)] grid grid-cols-2 gap-[var(--spacing-2)] text-[length:var(--font-size-sm)]">
          <dt className="text-[var(--text-tertiary)]">Cartão à vista</dt>
          <dd className="text-right text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
            {formatPct(plano.taxaCartaoAVista)}
          </dd>
          <dt className="text-[var(--text-tertiary)]">PIX</dt>
          <dd className="text-right text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
            {formatPct(plano.taxaPix)}
          </dd>
          <dt className="text-[var(--text-tertiary)]">Parcelamento</dt>
          <dd className="text-right text-[var(--text-primary)]">{resumoTabelaParcelas(plano.tabelaTaxasParcela)}</dd>
          <dt className="text-[var(--text-tertiary)]">Mensalidade</dt>
          <dd className="text-right text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
            {formatBRL(plano.saasMonthlyFee)}
          </dd>
        </dl>
      </div>

      <Select
        id="aplicar-plano-tenant"
        label="Organizador (tenant)"
        options={tenantOptions}
        value={selectedTenantId}
        onChange={(e) => onSelectTenant(e.target.value)}
        disabled={tenantsLoading || applying}
      />

      {/* Aviso EXPLÍCITO da semântica de estampa (§2.15, decisão #15) */}
      <p role="note" className="rounded-[var(--card-radius)] bg-[var(--surface-overlay)] p-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
        Isto grava uma <strong className="text-[var(--text-primary)]">nova versão</strong> dos termos comerciais deste
        organizador com os valores <strong className="text-[var(--text-primary)]">atuais</strong> do plano. Editar o
        plano depois <strong className="text-[var(--text-primary)]">não altera</strong> organizadores já aplicados —
        não há vínculo vivo; só reaplicar re-estampa.
      </p>

      {applyError && (
        <div
          role="alert"
          className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-overlay)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
        >
          Não foi possível aplicar o plano. Tente novamente.
        </div>
      )}
    </Modal>
  );
}

AplicarPlanoModal.displayName = 'AplicarPlanoModal';
