// =============================================================================
// Hooks de dados da back-office de repasses (E09s-L4). Leitura da fila
// cross-tenant via gateway (fan-out reusando listTenants + listRepasses) e da
// retenção vigente por tenant (commercialTerms.retencaoRepassePct). AÇÕES SEMPRE
// via Cloud Function (RN-357): approve/reject/markPago/setRetencao + a leitura
// AUDITADA do dado bancário completo (getBankDetailsForPayout, RN-354). Nenhuma
// escrita de estado/valor no cliente; nenhuma soma de dinheiro aqui.
// =============================================================================

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  approveRepasse,
  markRepassePago,
  rejectRepasse,
  setRetencaoRepasse,
  type MarkRepassePagoResult,
  type SetRetencaoRepasseResult,
  type TransicaoRepasseAdminResult,
} from '@leela/api-client';
import { RETENCAO_REPASSE_PCT_DEFAULT } from '@leela/core';
import {
  commercialTermsQuery,
  repassesFilaAdminQuery,
  type RepasseFilaItem,
} from '../../../../lib/query/queries';

export interface AsyncQuery<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fila cross-tenant de repasses `solicitado`/`aprovado` (mais recentes primeiro).
 * `reloadKey` entra na chave: as ações incrementam um contador e a fila revalida
 * SEM tocar a tela (ponte strangler-fig, ADR-010). Lista vazia = nada pendente
 * (EmptyState honesto).
 */
export function useFilaRepasses(reloadKey = 0): AsyncQuery<RepasseFilaItem[]> {
  const query = useQuery(repassesFilaAdminQuery(reloadKey));
  return {
    data: query.data ?? [],
    loading: query.isPending,
    error: query.error ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}

export interface RetencaoTenant {
  /** % vigente (do termo) OU o default global quando o tenant não tem valor. */
  value: number;
  /** true quando o valor exibido é o default global (tenant sem override). */
  usandoDefault: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * Retenção % vigente do tenant — lida de `commercialTerms/current`
 * (RN-350/RN-348, decisão #4). Ausente ⇒ vale o default global
 * (RETENCAO_REPASSE_PCT_DEFAULT), sinalizado por `usandoDefault`. `reloadKey`
 * revalida após `setRetencaoRepasse` (que faz bump de versão do termo).
 */
export function useRetencaoTenant(tenantId: string | null, reloadKey = 0): RetencaoTenant {
  const query = useQuery({
    ...commercialTermsQuery(tenantId ?? '', reloadKey),
    enabled: !!tenantId,
  });
  const pct = query.data?.retencaoRepassePct;
  const temValor = typeof pct === 'number';
  return {
    value: temValor ? pct : RETENCAO_REPASSE_PCT_DEFAULT,
    usandoDefault: !temValor,
    loading: !!tenantId && query.isPending,
    error: query.error ?? null,
  };
}

export interface AdminActionsState {
  running: boolean;
  error: Error | null;
}

/**
 * Ações de escrita da back-office de repasses (SÓ platform_admin — o servidor
 * nega o resto com permission-denied, RN-357). Cada uma devolve o resultado
 * tipado da Function ou null em falha; o erro fica no estado para a UI mostrar
 * Toast/mensagem clara. NUNCA transiciona estado direto no cliente.
 */
export function useRepasseAdminActions() {
  const [state, setState] = useState<AdminActionsState>({ running: false, error: null });

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      setState({ running: true, error: null });
      try {
        const result = await fn();
        setState({ running: false, error: null });
        return result;
      } catch (err) {
        setState({ running: false, error: err as Error });
        return null;
      }
    },
    [],
  );

  const approve = useCallback(
    (tenantId: string, repasseId: string): Promise<TransicaoRepasseAdminResult | null> =>
      run(() => approveRepasse({ tenantId, repasseId })),
    [run],
  );

  const reject = useCallback(
    (tenantId: string, repasseId: string): Promise<TransicaoRepasseAdminResult | null> =>
      run(() => rejectRepasse({ tenantId, repasseId })),
    [run],
  );

  const markPago = useCallback(
    (tenantId: string, repasseId: string): Promise<MarkRepassePagoResult | null> =>
      run(() => markRepassePago({ tenantId, repasseId })),
    [run],
  );

  const setRetencao = useCallback(
    (tenantId: string, retencaoRepassePct: number): Promise<SetRetencaoRepasseResult | null> =>
      run(() => setRetencaoRepasse({ tenantId, retencaoRepassePct })),
    [run],
  );

  return { ...state, approve, reject, markPago, setRetencao };
}
