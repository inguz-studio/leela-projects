// =============================================================================
// HubClubes — tela `/clubes` (S101-T2). Presentational: recebe estado async e
// callbacks. KPIs globais no topo, Zona A (meus clubes) + Zona B (parceiros com
// busca), EmptyState com CTA quando zero clubes, skeleton no load, bloco de
// erro no fail (§2.12). Popover exclusivo (C3): um único aberto por vez.
// =============================================================================

import { useMemo, useState } from 'react';
import { KpiCard, Button, EmptyState, Input, PageHeader, Skeleton } from '@leela/design-system';
import type { Clube } from '@leela/core';
import { formatarLocalizacaoClube } from '@leela/core';
import { ClubeCard } from './ClubeCard';
import { formatInt } from '../_lib/format';

export interface HubClubesProps {
  clubes: Clube[] | null;
  loading: boolean;
  error: Error | null;
  /** id do profissional logado — separa Zona A (owner) de Zona B (parceiros). */
  ownUserId: string | null;
  onCriarClube: () => void;
  onAbrirClube: (slug: string) => void;
}

interface KpisGlobais {
  totalClubes: number;
  meusClubes: number;
  atletasAlcancados: number;
  desafiosAtivos: number;
}

function agregaKpis(clubes: Clube[], ownUserId: string | null): KpisGlobais {
  return clubes.reduce<KpisGlobais>(
    (acc, c) => ({
      totalClubes: acc.totalClubes + 1,
      meusClubes: acc.meusClubes + (ownUserId && c.ownerId === ownUserId ? 1 : 0),
      atletasAlcancados: acc.atletasAlcancados + c.qtdMembrosAtivos,
      desafiosAtivos: acc.desafiosAtivos + c.qtdDesafiosAtivos,
    }),
    { totalClubes: 0, meusClubes: 0, atletasAlcancados: 0, desafiosAtivos: 0 },
  );
}

function Kpis({ kpis }: { kpis: KpisGlobais }): JSX.Element {
  return (
    <section
      aria-label="Indicadores globais"
      className="grid grid-cols-2 gap-[var(--spacing-4)] md:grid-cols-4"
    >
      <KpiCard label="Clubes ativos" value={formatInt(kpis.totalClubes)} hint={`${formatInt(kpis.meusClubes)} seu(s)`} />
      <KpiCard label="Atletas alcançados" value={formatInt(kpis.atletasAlcancados)} hint="somados entre os clubes" />
      <KpiCard label="Desafios ativos" value={formatInt(kpis.desafiosAtivos)} />
      <KpiCard label="Meus clubes" value={formatInt(kpis.meusClubes)} />
    </section>
  );
}

export function HubClubes({
  clubes,
  loading,
  error,
  ownUserId,
  onCriarClube,
  onAbrirClube,
}: HubClubesProps): JSX.Element {
  const [busca, setBusca] = useState('');
  // C3 — popover exclusivo: um único card com popover aberto por vez.
  const [popoverAberto, setPopoverAberto] = useState<string | null>(null);

  const { meus, parceiros } = useMemo(() => {
    const lista = clubes ?? [];
    return {
      meus: lista.filter((c) => ownUserId && c.ownerId === ownUserId),
      parceiros: lista.filter((c) => !ownUserId || c.ownerId !== ownUserId),
    };
  }, [clubes, ownUserId]);

  const parceirosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return parceiros;
    return parceiros.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        formatarLocalizacaoClube(c.localizacao).toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q),
    );
  }, [parceiros, busca]);

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Clubes"
        subtitle="Comunidades em torno dos seus eventos"
        actions={
          <Button variant="primary" onClick={onCriarClube}>
            + Criar clube
          </Button>
        }
      />

      <div className="flex flex-col gap-[var(--spacing-8)] px-[var(--spacing-6)]">
        {loading ? (
          <div role="status" aria-label="Carregando clubes" className="flex flex-col gap-[var(--spacing-6)]">
            <div className="grid grid-cols-2 gap-[var(--spacing-4)] md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-24" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-[var(--spacing-5)] lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-48" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            Não foi possível carregar seus clubes. Tente novamente.
          </div>
        ) : !clubes || clubes.length === 0 ? (
          <EmptyState
            title="Você ainda não tem nenhum clube"
            description="Crie seu primeiro clube para reunir uma comunidade em torno dos seus eventos."
            action={
              <Button variant="primary" onClick={onCriarClube}>
                Criar clube
              </Button>
            }
          />
        ) : (
          <>
            <Kpis kpis={agregaKpis(clubes, ownUserId)} />

            <section aria-label="Meus clubes" className="flex flex-col gap-[var(--spacing-4)]">
              <h2 className="text-[length:var(--font-size-sm)] uppercase tracking-[var(--table-header-spacing)] text-[var(--text-tertiary)]">
                Meus clubes · {formatInt(meus.length)}
              </h2>
              {meus.length === 0 ? (
                <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                  Você ainda não administra nenhum clube.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-[var(--spacing-5)] lg:grid-cols-2">
                  {meus.map((c) => (
                    <ClubeCard key={c.id} clube={c} variant="own" onAbrir={onAbrirClube} />
                  ))}
                </div>
              )}
            </section>

            <section aria-label="Clubes parceiros" className="flex flex-col gap-[var(--spacing-4)]">
              <h2 className="text-[length:var(--font-size-sm)] uppercase tracking-[var(--table-header-spacing)] text-[var(--text-tertiary)]">
                Clubes parceiros · {formatInt(parceiros.length)}
              </h2>
              {parceiros.length > 0 ? (
                <Input
                  type="search"
                  aria-label="Buscar clube parceiro"
                  placeholder="Buscar por nome, categoria ou localização"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  wrapperClassName="max-w-md"
                />
              ) : null}
              {parceiros.length === 0 ? (
                <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                  Nenhum clube parceiro ainda.
                </p>
              ) : parceirosFiltrados.length === 0 ? (
                <EmptyState
                  title="Nenhum clube encontrado"
                  description="Nenhum clube parceiro casa com a sua busca."
                />
              ) : (
                <div className="grid grid-cols-1 gap-[var(--spacing-5)] lg:grid-cols-2">
                  {parceirosFiltrados.map((c) => (
                    <ClubeCard
                      key={c.id}
                      clube={c}
                      variant="parceiro"
                      onAbrir={onAbrirClube}
                      popoverOpen={popoverAberto === c.id}
                      onPopoverOpenChange={(open) => setPopoverAberto(open ? c.id : null)}
                      popoverActions={[
                        { id: 'detalhes', label: 'Ver detalhes', onClick: () => onAbrirClube(c.slug) },
                        { id: 'convidar', label: 'Convidar para novo evento', onClick: () => {} },
                        { id: 'cupom', label: 'Criar cupom exclusivo', onClick: () => {} },
                      ]}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

HubClubes.displayName = 'HubClubes';
