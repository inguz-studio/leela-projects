// =============================================================================
// TenantFichaLayout — a casca de `/plataforma/tenants/:tenantId/*`
// (ADMIN-VISAO onda 2 · S1612-T1).
//
// UMA rota com abas, não sete rotas (03-spec.md · Parte 1). O layout entrega
// duas coisas e mais nada: a SubNav e a faixa que diz DE QUEM é a ficha.
//
// O RESUMO NÃO É TOCADO. Ele continua sendo `TenantDetailRoute` exatamente
// como está no ar desde a S1601-T4, com o próprio PageHeader, os KPIs e a ação
// de ciclo de vida. Por isso a faixa de identidade deste layout aparece em
// todas as abas MENOS no Resumo (`precisaDeFaixaDeIdentidade`): nas outras ela
// é necessária (uma tabela de vendas sem o nome do tenant é uma tabela de
// vendas de ninguém) e no Resumo ela seria o mesmo nome duas vezes.
//
// A aba TERMOS é a rota que já existia (`TermsEditorRoute`) — entra na barra
// como filha e não muda nada por dentro.
//
// SEM leitura nova: o nome do tenant vem de `useTenantComOwner`, a MESMA chave
// de cache que o Resumo já consome (`['plataforma','tenant',id]`), então
// montar o layout não acrescenta uma ida ao Firestore.
// =============================================================================

import { Outlet, useLocation, useParams } from 'react-router-dom';
import { Badge, Skeleton, type SubNavTab } from '@leela/design-system';
import { AreaSubNav } from '../../../components/nav/AreaSubNav';
import { useTenantComOwner } from '../_data/tenants';
import { statusTenantBadge } from '../_lib/health';
import {
  ABAS_DA_FICHA,
  abaAtivaDoPath,
  caminhoDaAba,
  precisaDeFaixaDeIdentidade,
} from './_lib/fichaSubnav';

export function TenantFichaLayout(): JSX.Element {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const { pathname } = useLocation();

  const ativa = abaAtivaDoPath(pathname, tenantId);
  const { tenant, loading } = useTenantComOwner(tenantId);

  // A fiação de SPA saiu daqui na Leva 14. O `onClick` escrito à mão chamava
  // `preventDefault()` SEM conferir tecla nem botão do mouse, então esta barra —
  // e só ela — matava ctrl/cmd+clique, clique do meio e "abrir em nova aba".
  // O `AreaSubNav` usa `tabsComNavSpa`, que devolve esses cliques ao navegador.
  const tabs: SubNavTab[] = ABAS_DA_FICHA.map((aba) => ({
    id: aba.id,
    label: aba.label,
    href: caminhoDaAba(tenantId, aba),
    active: aba.id === ativa,
  }));

  const status = tenant ? statusTenantBadge(tenant.status) : null;

  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      {precisaDeFaixaDeIdentidade(ativa) ? (
        <div className="flex flex-wrap items-baseline gap-[var(--spacing-3)] px-[var(--spacing-6)] pt-[var(--spacing-6)]">
          {loading && !tenant ? (
            <Skeleton variant="text" className="w-48" />
          ) : (
            <>
              <h1 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                {tenant?.nome ?? tenantId}
              </h1>
              {tenant ? (
                <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                  {tenant.slug}
                </span>
              ) : null}
              {status ? <Badge variant={status.variant}>{status.label}</Badge> : null}
            </>
          )}
        </div>
      ) : null}

      <AreaSubNav tabs={tabs} aria-label="Seções da ficha do tenant" />

      <Outlet />
    </div>
  );
}

TenantFichaLayout.displayName = 'TenantFichaLayout';
