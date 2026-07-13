// =============================================================================
// RepassesAdminRoute — container de `/plataforma/repasses` (E09s-L4-T1).
// Liga a fila cross-tenant (fan-out via gateway), o editor de retenção por
// tenant e as transições de aprovação. platform_admin-only (o PlatformShell já
// dá 403 sem a claim). Toda ação vira Cloud Function (RN-357); o cliente NUNCA
// transiciona estado direto. Sucesso ⇒ reloadKey++ (a fila + a retenção
// revalidam) + Toast.
//
// Aprovar/Recusar passam por ConfirmModal (§2.15) com preview de consequência —
// aprovar avança para pagamento; recusar devolve o valor ao disponível do tenant
// (RN-351). O pagamento auditado do `aprovado` chega no T2 (RegistrarPagamento).
// =============================================================================

import { useMemo, useState } from 'react';
import { ConfirmModal, useToast } from '@leela/design-system';
import { getBankDetailsForPayout } from '@leela/api-client';
import { formatBRL } from '../../financeiro/repasses/_lib/format';
import { RepassesFilaView } from './RepassesFilaView';
import { RetencaoEditor } from './_components/RetencaoEditor';
import { RegistrarPagamentoModal } from './_components/RegistrarPagamentoModal';
import {
  useFilaRepasses,
  useRepasseAdminActions,
  useRetencaoTenant,
} from './_data/repassesAdmin';
import { useTenants } from '../_data/tenants';
import { platformErrorMessage } from '../_lib/errors';
import type { EstadoFilaFilter, TenantFilaFilter } from './_lib/fila';
import type { RepasseFilaItem } from '../../../lib/query/queries';

type ConfirmKind = 'aprovar' | 'recusar';
interface ConfirmState {
  kind: ConfirmKind;
  item: RepasseFilaItem;
}

export function RepassesAdminRoute(): JSX.Element {
  const { toast } = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilaFilter>('todos');
  const [tenantFilter, setTenantFilter] = useState<TenantFilaFilter>('todos');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [pagamento, setPagamento] = useState<RepasseFilaItem | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const fila = useFilaRepasses(reloadKey);
  const { data: tenants, loading: tenantsLoading } = useTenants();
  const filaActions = useRepasseAdminActions();
  const retencaoActions = useRepasseAdminActions();
  const retencao = useRetencaoTenant(selectedTenantId || null, reloadKey);

  const tenantsRetencao = useMemo(
    () => (tenants ?? []).map((t) => ({ id: t.id, nome: t.nome })),
    [tenants],
  );

  function revalidar() {
    setReloadKey((k) => k + 1);
  }

  async function handleConfirm() {
    if (!confirm) return;
    const { kind, item } = confirm;
    const { tenantId, id } = item.repasse;
    const result =
      kind === 'aprovar'
        ? await filaActions.approve(tenantId, id)
        : await filaActions.reject(tenantId, id);

    if (result) {
      setConfirm(null);
      revalidar();
      toast(
        kind === 'aprovar'
          ? { variant: 'success', title: 'Repasse aprovado', description: `${item.tenantNome} · ${formatBRL(item.repasse.valor)}` }
          : { variant: 'success', title: 'Repasse recusado', description: `Valor devolvido ao disponível de ${item.tenantNome}` },
      );
    } else {
      toast({
        variant: 'danger',
        title: kind === 'aprovar' ? 'Não foi possível aprovar' : 'Não foi possível recusar',
        description: platformErrorMessage(filaActions.error),
      });
    }
  }

  async function handleSalvarRetencao(tenantId: string, pct: number) {
    const result = await retencaoActions.setRetencao(tenantId, pct);
    if (result) {
      revalidar();
      toast({ variant: 'success', title: 'Retenção salva', description: `${pct}% · versão ${result.versao}` });
    } else {
      toast({
        variant: 'danger',
        title: 'Não foi possível salvar a retenção',
        description: platformErrorMessage(retencaoActions.error),
      });
    }
  }

  async function handleConfirmPagamento() {
    if (!pagamento) return;
    const { tenantId, id } = pagamento.repasse;
    const alvo = pagamento;
    const result = await filaActions.markPago(tenantId, id);
    if (result) {
      setPagamento(null); // fecha o modal → o dado bancário em claro é LIMPO (LGPD)
      revalidar(); // a fila remove o item pago no próximo recompute
      toast({
        variant: 'success',
        title: 'Pagamento registrado',
        description: `Comprovante ${result.comprovanteNumero} · ${alvo.tenantNome}`,
      });
    } else {
      toast({
        variant: 'danger',
        title: 'Não foi possível registrar o pagamento',
        description: platformErrorMessage(filaActions.error),
      });
    }
  }

  return (
    <>
      <div className="flex flex-col gap-[var(--spacing-8)] pb-[var(--spacing-8)]">
        <RepassesFilaView
          itens={fila.data}
          loading={fila.loading}
          error={fila.error}
          estadoFilter={estadoFilter}
          tenantFilter={tenantFilter}
          onEstadoFilterChange={setEstadoFilter}
          onTenantFilterChange={setTenantFilter}
          onRetry={fila.refetch}
          onAprovar={(item) => setConfirm({ kind: 'aprovar', item })}
          onRecusar={(item) => setConfirm({ kind: 'recusar', item })}
          onRegistrarPagamento={(item) => setPagamento(item)}
        />

        <RetencaoEditor
          tenants={tenantsRetencao}
          tenantsLoading={tenantsLoading}
          selectedTenantId={selectedTenantId}
          onSelectTenant={setSelectedTenantId}
          retencao={retencao}
          saving={retencaoActions.running}
          saveError={retencaoActions.error}
          onSave={handleSalvarRetencao}
        />
      </div>

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
                {confirm.item.tenantNome}
              </span>
              <span className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                {formatBRL(confirm.item.repasse.valor)}
              </span>
            </div>
          }
          loses={
            confirm.kind === 'recusar'
              ? ['O produtor não recebe este saque agora']
              : []
          }
          keeps={
            confirm.kind === 'aprovar'
              ? ['O repasse fica pronto para o registro de pagamento']
              : ['O valor volta ao disponível do tenant para uma nova solicitação']
          }
          confirmLabel={confirm.kind === 'aprovar' ? 'Aprovar' : 'Recusar'}
          loading={filaActions.running}
          onConfirm={handleConfirm}
        />
      )}

      <RegistrarPagamentoModal
        open={pagamento !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setPagamento(null);
        }}
        item={pagamento}
        fetchBankDetails={getBankDetailsForPayout}
        onConfirm={handleConfirmPagamento}
        confirming={filaActions.running}
      />
    </>
  );
}

RepassesAdminRoute.displayName = 'RepassesAdminRoute';
