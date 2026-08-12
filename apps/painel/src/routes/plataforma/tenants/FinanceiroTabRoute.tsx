// =============================================================================
// FinanceiroTabRoute — container de `/plataforma/tenants/:tenantId/financeiro`
// (ADMIN-VISAO onda 2 · S1613-T4).
//
// SEM LEITURA NOVA: os números macro saem de `platform/rollups`, o mesmo doc e
// a mesma chave de cache que o dashboard macro já consome
// (`usePlatformRollups` → `platformRollupsQuery`). A linha do tenant é
// `rollups.tenants[tenantId]` — indexação, não varredura.
//
// O RECOMPUTE MANUAL fecha a segunda metade da RN-538, que é critério de aceite
// da S1613: "dado que o rollup está obsoleto, quando olho a tela, então consigo
// disparar o recompute dali mesmo e o número atualiza". O agendamento horário
// da onda 1 tirou a dependência de alguém lembrar de clicar; o botão tira a
// espera de até uma hora quando o retrato já está velho na cara do operador.
//
// Read-your-writes por invalidação de chave (ADR-010): terminado o recompute,
// a família `['plataforma','rollups']` é invalidada e o número na tela vem do
// doc reescrito — nada é remendado no cliente, que é o que a RN-537 exige de
// toda cifra do painel master.
//
// O recompute é INTEGRAL e idempotente por construção (`set()` completo sobre a
// varredura de `tenants`), então dois cliques não contam nada em dobro. Ainda
// assim o botão desabilita enquanto roda: é varredura de todos os tenants, e
// disparar em rajada só gasta.
// =============================================================================

import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getLeelaFunctions, recomputePlatformRollups } from '@leela/api-client';
import { FinanceiroTab } from './FinanceiroTab';
import { RepassesDoTenantSecao } from './_components/RepassesDoTenantSecao';
import { usePlatformRollups } from '../_data/rollups';
import { platformErrorMessage } from '../_lib/errors';

export function FinanceiroTabRoute(): JSX.Element {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const { data: rollups, loading, error } = usePlatformRollups();

  const queryClient = useQueryClient();
  const [recomputando, setRecomputando] = useState(false);
  const [erroDoRecompute, setErroDoRecompute] = useState<string | null>(null);

  const recalcular = useCallback(() => {
    setRecomputando(true);
    setErroDoRecompute(null);
    recomputePlatformRollups(getLeelaFunctions())
      .then(() => queryClient.invalidateQueries({ queryKey: ['plataforma', 'rollups'] }))
      .catch((err: unknown) => {
        setErroDoRecompute(platformErrorMessage(err as Error));
      })
      .finally(() => setRecomputando(false));
  }, [queryClient]);

  return (
    <FinanceiroTab
      rollup={rollups?.tenants[tenantId] ?? null}
      atualizadoEm={rollups?.atualizadoEm ?? null}
      loading={loading}
      error={error}
      agora={new Date()}
      repasses={<RepassesDoTenantSecao tenantId={tenantId} />}
      onRecompute={recalcular}
      recomputando={recomputando}
      erroDoRecompute={erroDoRecompute}
    />
  );
}

FinanceiroTabRoute.displayName = 'FinanceiroTabRoute';
