// =============================================================================
// ComunidadeResumo — o bloco "Clubs" da Visão Geral, recriado FIEL ao
// protótipo "Visao Geral v3" (lane HIFI-REC).
//
// Anatomia do protótipo: eyebrow com coração · dois stats grandes lado a lado
// · CTA neutro de largura cheia "Gerenciar clubs →". O protótipo mostra ainda
// a IDENTIDADE de um club (avatar "FC · Floripa Run Coletivo") — isso exigiria
// listar clubes na primeira tela depois do login, e o orçamento de LCP dela é
// gate: os dois agregados chegam no MESMO round-trip dos KPIs, o nome não.
// Divergência nomeada no handoff da lane; quem quer o nome está a um clique.
//
// Verdade de dado (P-REC-4): o protótipo rotula o 2º stat como "check-ins" —
// check-in de club NÃO existe no backend (nota do REFACTOR item 7). O 2º stat
// é "desafios ativos", que é o agregado real que chega. Rótulo segue o dado.
// =============================================================================

import { Button, EmptyState, Skeleton } from '@leela/design-system';
import { Heart } from 'lucide-react';
import type { OverviewKPIs } from '@leela/core';
import { formatInt } from '../_lib/format';
import { PanelError } from './PanelError';
import { CartaoV3, CtaV3, EyebrowV3, StatV3 } from './CartaoV3';

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
    <CartaoV3 aria="Clubs" className="flex flex-col">
      <EyebrowV3 icon={<Heart />}>Clubs</EyebrowV3>

      {loading ? (
        <div
          role="status"
          aria-label="Carregando resumo dos clubs"
          className="grid grid-cols-2 gap-[var(--spacing-3)]"
        >
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
          <div className="grid grid-cols-2 gap-[var(--spacing-2-5)] mb-[var(--spacing-5)]">
            <StatV3 valor={formatInt(kpis.membrosAtivosTotais)} rotulo="membros ativos" />
            <StatV3 valor={formatInt(kpis.desafiosAtivosTotais)} rotulo="desafios ativos" />
          </div>
          <div className="flex-1" />
          <CtaV3 variant="neutro" onClick={onGerenciarClubs}>
            Gerenciar clubs
          </CtaV3>
        </>
      )}
    </CartaoV3>
  );
}

ComunidadeResumo.displayName = 'ComunidadeResumo';
