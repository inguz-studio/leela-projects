// =============================================================================
// ComunidadeResumo — o bloco "Clubs" da Visão Geral (REDESIGN-DS · v3).
//
// POR QUE ELE EXISTE, e não é só "o mockup pediu". O objetivo escrito do épico
// LEELA-E02 é "consolidar eventos e clubes do profissional numa única leitura de
// negócio", e a tela entregue consolidava só eventos: os dois números de
// comunidade (`membrosAtivosTotais`, `desafiosAtivosTotais`) já vinham no
// retorno de `getOverview` e não eram desenhados em lugar nenhum. O protótipo
// não acrescenta uma métrica nova aqui — ele fecha um buraco entre a story e a
// tela.
//
// CUSTO DE REDE ZERO, de propósito. O protótipo mostra a identidade de um club
// ("FC · Floripa Run Coletivo"), o que exigiria listar clubes na tela inicial.
// A Visão Geral é a primeira tela depois do login e o orçamento de LCP dela é
// gate, não aspiração: um fetch a mais para desenhar um nome não paga. Os dois
// agregados já chegam no MESMO round-trip dos KPIs. Quem quer o nome está a um
// clique — que é o que o CTA faz.
//
// Números são AGREGADOS ∑ mantidos por Function; o cliente só lê (governança do
// épico). Nada é somado aqui.
// =============================================================================

import { Button, EmptyState, KpiCard, Skeleton } from '@leela/design-system';
import { Heart } from 'lucide-react';
import type { OverviewKPIs } from '@leela/core';
import { formatInt } from '../_lib/format';
import { PanelError } from './PanelError';

export interface ComunidadeResumoProps {
  kpis: OverviewKPIs | null;
  loading: boolean;
  error?: boolean;
  onRetry?: (() => void) | undefined;
  /** "Gerenciar clubs" — hub de clubs (E05). */
  onGerenciarClubs: () => void;
  /** CTA do estado vazio — criação de club. */
  onNovoClube: () => void;
}

export function ComunidadeResumo({
  kpis,
  loading,
  error,
  onRetry,
  onGerenciarClubs,
  onNovoClube,
}: ComunidadeResumoProps): JSX.Element {
  const semComunidade =
    kpis !== null && kpis.membrosAtivosTotais === 0 && kpis.desafiosAtivosTotais === 0;

  return (
    <section
      aria-label="Clubs"
      className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]"
    >
      <div className="flex items-center gap-[var(--spacing-2)]">
        <Heart
          aria-hidden
          className="w-[var(--kpi-label-icon-size)] h-[var(--kpi-label-icon-size)] text-[var(--text-tertiary)]"
        />
        <h2 className="text-[length:var(--font-size-sm)] font-[var(--peso-medio)] uppercase tracking-[var(--section-title-spacing)] text-[var(--text-secondary)]">
          Clubs
        </h2>
      </div>

      {loading ? (
        <div role="status" aria-label="Carregando resumo dos clubs" className="grid grid-cols-2 gap-[var(--spacing-3)]">
          <Skeleton variant="rect" className="h-20" />
          <Skeleton variant="rect" className="h-20" />
        </div>
      ) : error || kpis === null ? (
        <PanelError
          message="Não foi possível carregar o resumo dos seus clubs."
          onRetry={onRetry}
        />
      ) : semComunidade ? (
        <EmptyState
          title="Nenhuma comunidade ativa"
          description="Um club reúne quem treina com você entre um evento e outro."
          action={
            <Button variant="secondary" size="sm" onClick={onNovoClube}>
              Criar um club
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-[var(--spacing-3)]">
            <KpiCard
              label="Membros ativos"
              value={formatInt(kpis.membrosAtivosTotais)}
              className="bg-[var(--surface-overlay)]"
            />
            <KpiCard
              label="Desafios ativos"
              value={formatInt(kpis.desafiosAtivosTotais)}
              className="bg-[var(--surface-overlay)]"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={onGerenciarClubs}>
            Gerenciar clubs
          </Button>
        </>
      )}
    </section>
  );
}

ComunidadeResumo.displayName = 'ComunidadeResumo';
