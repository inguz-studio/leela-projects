// =============================================================================
// CountdownHero — faixa de contagem regressiva do Overview (LEELA-FID-EVT-T3),
// fiel ao `.countdown-card` do mockup `Overview do Evento.html`: número grande em
// gradient-text (dias), rótulo + data, 3 ministats (capacidade · inscritos % ·
// vagas restantes) e barra de preenchimento. Presentational puro.
//
// Reuso-first: tokens `--countdown-*` (mesmos do card "Próximo evento" da Visão
// geral) — zero token novo. Honesto sem capacidade: esconde %/vagas/barra.
// =============================================================================

import { cn } from '@leela/design-system';
import { formatInt } from '../../_lib/format';

export interface CountdownHeroProps {
  /** Dias até a prova (>0 futuro, 0 hoje, <0 passado); null = sem data. */
  dias: number | null;
  qtdInscritos: number;
  /** Capacidade total; null = desconhecida (esconde %/vagas/barra). */
  capacidade: number | null;
  /** Linha secundária (ex.: "Domingo, 27 de abril · 06:00"). */
  dataLinha?: string | undefined;
}

function Ministat({ label, value, sub }: { label: string; value: string; sub: string }): JSX.Element {
  return (
    <div>
      <div className="text-[length:var(--countdown-stat-label-size)] font-[var(--font-weight-semibold)] uppercase tracking-[var(--countdown-label-spacing)] text-[var(--text-tertiary)]">
        {label}
      </div>
      <div className="text-[length:var(--countdown-stat-value-size)] font-[var(--font-weight-bold)] tabular-nums text-[var(--text-primary)] leading-tight">
        {value}
      </div>
      <div className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)] mt-[var(--spacing-0-5)]">
        {sub}
      </div>
    </div>
  );
}

export function CountdownHero({
  dias,
  qtdInscritos,
  capacidade,
  dataLinha,
}: CountdownHeroProps): JSX.Element {
  const temCap = typeof capacidade === 'number' && capacidade > 0;
  const pct = temCap ? Math.min(100, Math.round((qtdInscritos / (capacidade as number)) * 100)) : null;
  const vagas = temCap ? Math.max(0, (capacidade as number) - qtdInscritos) : null;

  const numeroBig = dias === null ? '—' : String(Math.abs(dias));
  const bigLabel =
    dias === null
      ? 'sem data definida'
      : dias > 0
        ? 'dias para o evento'
        : dias === 0
          ? 'o evento é hoje'
          : 'dias desde o evento';

  return (
    <section
      aria-label="Contagem regressiva"
      className={cn(
        'relative overflow-hidden rounded-[var(--card-radius)]',
        'bg-[var(--surface-raised)] [background-image:var(--countdown-bg)]',
        'border border-[color:var(--countdown-border)]',
        'p-[var(--countdown-padding)] shadow-elev-2',
      )}
    >
      <div className="grid grid-cols-1 items-center gap-[var(--spacing-8)] md:grid-cols-[auto_1fr]">
        {/* Número + rótulo */}
        <div className="flex items-end gap-[var(--spacing-5)]">
          <span
            className={cn(
              'font-display italic font-[var(--font-weight-extrabold)]',
              'text-[length:var(--countdown-number-size)] leading-none',
              'tracking-[var(--countdown-number-spacing)] tabular-nums',
              'bg-[image:var(--countdown-number-gradient)] bg-clip-text text-transparent',
            )}
          >
            {numeroBig}
          </span>
          <div className="pb-[var(--spacing-3)]">
            <div className="font-display italic font-[var(--font-weight-bold)] text-[length:var(--font-size-lg)] text-[var(--text-primary)]">
              {bigLabel}
            </div>
            {dataLinha ? (
              <div className="mt-[var(--spacing-0-5)] text-[length:var(--font-size-xs)] uppercase tracking-[var(--countdown-label-spacing)] font-[var(--font-weight-semibold)] text-[var(--text-tertiary)]">
                {dataLinha}
              </div>
            ) : null}
          </div>
        </div>

        {/* Ministats */}
        <dl className="grid grid-cols-3 gap-[var(--spacing-4)] md:border-l md:border-[var(--border-subtle)] md:pl-[var(--spacing-8)]">
          <Ministat
            label="Capacidade total"
            value={temCap ? formatInt(capacidade as number) : '—'}
            sub="limite de inscrições"
          />
          <Ministat
            label="Inscritos"
            value={pct !== null ? `${formatInt(qtdInscritos)} (${pct}%)` : formatInt(qtdInscritos)}
            sub="pagos + confirmados"
          />
          <Ministat
            label="Vagas restantes"
            value={vagas !== null ? formatInt(vagas) : '—'}
            sub="até o encerramento"
          />
        </dl>
      </div>

      {/* Barra de preenchimento (só com capacidade conhecida) */}
      {pct !== null ? (
        <div className="mt-[var(--spacing-5)] flex items-center gap-[var(--spacing-3)] border-t border-[var(--border-subtle)] pt-[var(--spacing-4)]">
          <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">Preenchimento</span>
          <div
            className="h-[var(--spacing-1-5)] flex-1 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--surface-base)]"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Preenchimento das vagas"
          >
            <div
              className="h-full rounded-[var(--radius-pill)] bg-[image:var(--countdown-number-gradient)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] tabular-nums text-[var(--text-primary)]">
            {pct}%
          </span>
        </div>
      ) : null}
    </section>
  );
}

CountdownHero.displayName = 'CountdownHero';
