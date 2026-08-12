// =============================================================================
// RepassesDoTenantSecao — container do bloco de saldo + repasses da aba
// Financeiro (ADMIN-VISAO onda 2 · S1613-T5).
//
// REUSO, NÃO CÓPIA. As ações são as MESMAS da fila global: os hooks de escrita
// (`useRepasseAdminActions`) e o `RegistrarPagamentoModal` são importados de
// `plataforma/repasses/`, não reimplementados. Repasse é um domínio só — a
// ficha do tenant não redefine a máquina de estado (RN-353) nem o fluxo
// auditado de dado bancário (RN-354).
//
// Toda escrita passa por Cloud Function (RN-357). Sucesso invalida a família
// `['repasse', tenantId]` (saldo + histórico), que é exatamente a razão pela
// qual essa família existe com prefixo por tenant em `lib/query/keys.ts`.
// =============================================================================

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmModal, useToast } from '@leela/design-system';
import { getBankDetailsForPayout } from '@leela/api-client';
import type { Repasse } from '@leela/core';
import { RepassesDoTenant } from './RepassesDoTenant';
import { RegistrarPagamentoModal } from '../../repasses/_components/RegistrarPagamentoModal';
import { useRepasseAdminActions } from '../../repasses/_data/repassesAdmin';
import { useSaldoDoTenant, useRepassesDoTenant } from '../_data/repassesTenant';
import { useTenantComOwner } from '../../_data/tenants';
import { mensagemDaRecusa } from '../../_lib/errors';
import { formatBRL } from '../../../eventos/repasses/_lib/format';
import { queryKeys } from '../../../../lib/query/keys';

type ConfirmKind = 'aprovar' | 'recusar';

export interface RepassesDoTenantSecaoProps {
  tenantId: string;
}

export function RepassesDoTenantSecao({ tenantId }: RepassesDoTenantSecaoProps): JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; repasse: Repasse } | null>(null);
  const [pagamento, setPagamento] = useState<Repasse | null>(null);

  // Mesma chave de cache que a SubNav e o Resumo já consomem — o nome do
  // tenant sai daqui sem uma ida a mais ao Firestore.
  const { tenant } = useTenantComOwner(tenantId);
  const tenantNome = tenant?.nome ?? tenantId;

  const saldo = useSaldoDoTenant(tenantId);
  const historico = useRepassesDoTenant(tenantId);
  const acoes = useRepasseAdminActions();

  function revalidar(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.repasse.saldo(tenantId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.repasse.historico(tenantId) });
  }

  async function handleConfirm(): Promise<void> {
    if (!confirm) return;
    const { kind, repasse } = confirm;
    const result =
      kind === 'aprovar'
        ? await acoes.approve(tenantId, repasse.id)
        : await acoes.reject(tenantId, repasse.id);

    if (result) {
      setConfirm(null);
      revalidar();
      toast(
        kind === 'aprovar'
          ? {
              variant: 'success',
              title: 'Repasse aprovado',
              description: `${tenantNome} · ${formatBRL(repasse.valor)}`,
            }
          : {
              variant: 'success',
              title: 'Repasse recusado',
              description: `Valor devolvido ao disponível de ${tenantNome}`,
            },
      );
    } else {
      toast({
        variant: 'danger',
        title: kind === 'aprovar' ? 'Não foi possível aprovar' : 'Não foi possível recusar',
        description: mensagemDaRecusa(acoes.ultimoErro()),
      });
    }
  }

  async function handleConfirmPagamento(): Promise<void> {
    if (!pagamento) return;
    const result = await acoes.markPago(tenantId, pagamento.id);
    if (result) {
      setPagamento(null); // fecha o modal → o dado bancário em claro é LIMPO (LGPD)
      revalidar();
      toast({
        variant: 'success',
        title: 'Pagamento registrado',
        description: `Comprovante ${result.comprovanteNumero} · ${tenantNome}`,
      });
    } else {
      toast({
        variant: 'danger',
        title: 'Não foi possível registrar o pagamento',
        description: mensagemDaRecusa(acoes.ultimoErro()),
      });
    }
  }

  return (
    <>
      <RepassesDoTenant
        saldo={saldo.saldo}
        saldoLoading={saldo.loading}
        saldoError={saldo.error}
        repasses={historico.repasses}
        repassesLoading={historico.loading}
        repassesError={historico.error}
        running={acoes.running}
        onAprovar={(repasse) => setConfirm({ kind: 'aprovar', repasse })}
        onRecusar={(repasse) => setConfirm({ kind: 'recusar', repasse })}
        onRegistrarPagamento={setPagamento}
        onRetry={historico.refetch}
      />

      {confirm && (
        <ConfirmModal
          open
          onOpenChange={(aberto) => {
            if (!aberto) setConfirm(null);
          }}
          title={confirm.kind === 'aprovar' ? 'Aprovar repasse' : 'Recusar repasse'}
          description={
            confirm.kind === 'aprovar'
              ? 'O repasse avança para pagamento. Confirme antes de prosseguir.'
              : 'O repasse é recusado e o valor volta ao disponível do produtor.'
          }
          target={
            <div className="flex flex-col gap-[var(--spacing-1)]">
              <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                {tenantNome}
              </span>
              <span className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                {formatBRL(confirm.repasse.valor)}
              </span>
            </div>
          }
          loses={confirm.kind === 'recusar' ? ['O produtor não recebe este saque agora'] : []}
          keeps={
            confirm.kind === 'aprovar'
              ? ['O repasse fica pronto para o registro de pagamento']
              : ['O valor volta ao disponível do tenant para uma nova solicitação']
          }
          confirmLabel={confirm.kind === 'aprovar' ? 'Aprovar' : 'Recusar'}
          loading={acoes.running}
          onConfirm={handleConfirm}
        />
      )}

      <RegistrarPagamentoModal
        open={pagamento !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setPagamento(null);
        }}
        item={pagamento ? { repasse: pagamento, tenantNome } : null}
        fetchBankDetails={getBankDetailsForPayout}
        onConfirm={handleConfirmPagamento}
        confirming={acoes.running}
      />
    </>
  );
}

RepassesDoTenantSecao.displayName = 'RepassesDoTenantSecao';
