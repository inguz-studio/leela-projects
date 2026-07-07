// =============================================================================
// OverviewClube — dashboard do club (S102-T2). 4 KPIs + tabela densa de novos
// membros (NUNCA grid de avatares — RN-005/§2.5). Presentational puro.
//
// KPIs disponíveis vêm dos agregados ∑ do doc do club (qtdMembrosAtivos,
// qtdDesafiosAtivos). Dois KPIs dependem de dados fora do E05-L1:
//   - Conversão em eventos → depende de visitas (E12); decisão onda1 #7: null
//     até existir dado. Renderizado como "—".
//   - Receita de parcerias  → depende do motor de parcerias (E05-L2, WIP).
//     Renderizado como "—" até o contrato existir. Ver SUMMARY §Bloqueios.
// =============================================================================

import { Skeleton } from '@leela/design-system';
import type { Clube, Membro } from '@leela/core';
import { KpiCard } from '../../_components/KpiCard';
import { MembrosTable } from '../../_components/MembrosTable';
import { formatInt } from '../../_lib/format';

export interface OverviewClubeProps {
  clube: Clube;
  novosMembros: Membro[] | null;
  novosLoading: boolean;
  /** "Agora" injetável para tempo relativo determinístico em teste. */
  agora?: Date | undefined;
}

function Kpis({ clube }: { clube: Clube }): JSX.Element {
  return (
    <section
      aria-label="Indicadores do clube"
      className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4"
    >
      <KpiCard label="Membros ativos" value={formatInt(clube.qtdMembrosAtivos)} />
      <KpiCard label="Desafios ativos" value={formatInt(clube.qtdDesafiosAtivos)} />
      <KpiCard label="Conversão em eventos" value="—" hint="disponível com dados de visitas" />
      <KpiCard label="Receita de parcerias" value="—" hint="disponível com o motor de parcerias" />
    </section>
  );
}

function NovosMembros({
  membros,
  loading,
  agora,
}: {
  membros: Membro[] | null;
  loading: boolean;
  agora?: Date | undefined;
}): JSX.Element {
  return (
    <section aria-label="Novos membros" className="flex flex-col gap-[var(--spacing-3)]">
      <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        Novos membros
      </h2>
      {loading ? (
        <div role="status" aria-label="Carregando novos membros" className="flex flex-col gap-[var(--spacing-2)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="text" />
          ))}
        </div>
      ) : (
        <MembrosTable
          membros={membros ?? []}
          caption="Novos membros do clube"
          emptyTitle="Nenhum membro novo ainda"
          emptyDescription="Novos membros aparecem aqui nos primeiros 7 dias após entrarem."
          agora={agora}
        />
      )}
    </section>
  );
}

export function OverviewClube({ clube, novosMembros, novosLoading, agora }: OverviewClubeProps): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-8)]">
      <Kpis clube={clube} />
      <NovosMembros membros={novosMembros} loading={novosLoading} agora={agora} />
    </div>
  );
}

OverviewClube.displayName = 'OverviewClube';
