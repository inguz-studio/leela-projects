// =============================================================================
// OcupacaoEventos — "Ocupação dos últimos 5 eventos", recriado FIEL ao
// protótipo "Visao Geral v3" (lane HIFI-REC; fidelidade é o critério
// primário, L-004 suspenso).
//
// Anatomia do protótipo: cartão vidro de largura cheia, eyebrow uppercase e
// UMA linha por evento — nome (coluna de 200px) · trilho pill de 10px com a
// barra preenchida · "42/50" à direita (88px). A cor da barra é o acento de
// gráfico do tema; ocupação ≥ 85% acende o âmbar de atenção (regra do
// protótipo: `pct >= 85 → feedback-warning`). O BarChart canônico do DS segue
// sendo o componente de GRÁFICO de barras; esta lista-régua é a apresentação
// específica que o dono desenhou para esta seção — markup da tela, medidas
// por token.
//
// Movimento (README §5): a barra cresce da esquerda em 750ms
// cubic-bezier(.22,1,.36,1) — `animate-barra-v3` no tailwind.config, tokens
// `--motion-bar-*`; desligado sob prefers-reduced-motion.
//
// A honestidade segue na derivação (`_lib/ocupacao`): evento sem capacidade
// não vira barra com denominador inventado — fica de fora e a nota diz
// quantos ficaram.
// =============================================================================

import { EmptyState, Skeleton, cn } from '@leela/design-system';
import { CalendarRange } from 'lucide-react';
import type { OcupacaoDosEventos } from '../_lib/ocupacao';
import { formatInt } from '../_lib/format';
import { PanelError } from './PanelError';
import { CartaoV3, EyebrowV3 } from '../../../components/CartaoV3';

export interface OcupacaoEventosProps {
  ocupacao: OcupacaoDosEventos | null;
  loading: boolean;
  error?: boolean;
  onRetry?: (() => void) | undefined;
  /** Mantido pelo contrato da tela — o hub continua a um clique no rail. */
  onVerEventos?: (() => void) | undefined;
}

/** Limiar do protótipo: barra ≥ 85% de ocupação acende o âmbar. */
export const LIMIAR_ATENCAO_PCT = 85;

/** % inteiro (0-100+) para a largura/cor da barra. @pure */
export function pctDaBarra(ocupacao: number): number {
  return Math.round(ocupacao * 100);
}

export function OcupacaoEventos({
  ocupacao,
  loading,
  error,
  onRetry,
}: OcupacaoEventosProps): JSX.Element {
  const linhas = ocupacao?.linhas ?? [];

  return (
    <CartaoV3 aria="Ocupação dos últimos eventos" elev={2} padding="lg">
      <EyebrowV3>Ocupação dos últimos 5 eventos</EyebrowV3>

      {loading ? (
        <div role="status" aria-label="Carregando ocupação dos eventos">
          <Skeleton variant="rect" className="h-40" />
        </div>
      ) : error ? (
        <PanelError
          message="Não foi possível carregar a ocupação dos seus eventos."
          onRetry={onRetry}
        />
      ) : linhas.length === 0 ? (
        <EmptyState
          icon={<CalendarRange aria-hidden />}
          title="Sem ocupação para mostrar"
          description={
            ocupacao && ocupacao.semCapacidade > 0
              ? 'Seus eventos ainda não têm capacidade definida. Sem o total de vagas não existe taxa de ocupação — defina a capacidade na configuração do evento.'
              : 'Assim que um evento com vagas definidas receber inscrições, a ocupação aparece aqui.'
          }
        />
      ) : (
        <>
          <ul role="list" className="list-none m-0 p-0 flex flex-col gap-[var(--spacing-4)]">
            {linhas.map((linha) => {
              const pct = pctDaBarra(linha.ocupacao);
              const cheia = pct >= LIMIAR_ATENCAO_PCT;
              return (
                <li
                  key={linha.slug}
                  className={cn(
                    'grid items-center gap-[var(--spacing-4)]',
                    'grid-cols-1 sm:grid-cols-[minmax(0,var(--v3-name-col))_minmax(0,1fr)_var(--v3-count-col)]',
                  )}
                >
                  <span className="min-w-0 truncate text-[length:var(--font-size-sm-plus)] font-[var(--font-weight-medium)] text-[var(--text-primary)]">
                    {linha.nome}
                  </span>
                  <span
                    role="img"
                    aria-label={`${linha.nome}: ${formatInt(linha.inscritos)} de ${formatInt(linha.capacidade)} vagas (${formatInt(pct)}%)`}
                    className={cn(
                      'relative block overflow-hidden',
                      'h-[var(--v3-bar-h)] rounded-[var(--radius-pill)] bg-[var(--chart-track)]',
                    )}
                  >
                    <i
                      aria-hidden
                      className={cn(
                        'absolute inset-y-0 left-0 block rounded-[var(--radius-pill)]',
                        'origin-left animate-barra-v3 motion-reduce:animate-none',
                        cheia ? 'bg-[var(--feedback-warning)]' : 'bg-[var(--chart-accent)]',
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </span>
                  <span className="text-right text-[length:var(--font-size-sm)] text-[var(--text-tertiary)] whitespace-nowrap">
                    <b className="font-display font-[var(--font-weight-bold)] text-[length:var(--font-size-base)] text-[var(--text-primary)]">
                      {formatInt(linha.inscritos)}
                    </b>
                    /{formatInt(linha.capacidade)}
                  </span>
                </li>
              );
            })}
          </ul>
          {ocupacao && ocupacao.semCapacidade > 0 ? (
            <p className="mt-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              {ocupacao.semCapacidade === 1
                ? '1 evento ficou de fora por não ter capacidade definida.'
                : `${formatInt(ocupacao.semCapacidade)} eventos ficaram de fora por não ter capacidade definida.`}
            </p>
          ) : null}
        </>
      )}
    </CartaoV3>
  );
}

OcupacaoEventos.displayName = 'OcupacaoEventos';
