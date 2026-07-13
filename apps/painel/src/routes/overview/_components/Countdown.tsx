// =============================================================================
// Countdown — card "Próximo evento" (S602-T1; recomposto fiel ao mockup
// `.countdown-card` no Lote FIDELIDADE T6): eyebrow com relógio, nome display,
// número grande em gradient-text ("08" + "dias restantes"), linha "when"
// honesta (data · local — SEM hora: o doc não tem horário de largada), stats
// 2-col (Inscritos / Vagas livres) entre hairlines e quick-actions em grade 3.
//
// D3 (2026-07-13): com a aba Comunicação aterrissada (E06-L3), a quick-action
// central volta a ser "Comunicar" (fiel ao mockup: Ver inscritos · Comunicar ·
// Check-in) — resolve a divergência antiga "Comunicar → Gerenciar" (a rota
// agora existe). O bloco "Ações rápidas" geral segue fora (Novo evento na
// Toolbar T3; "Ver todos" no section-link dos eventos T5).
// =============================================================================

import { Skeleton, cn } from '@leela/design-system';
import { Clock, MapPin, Megaphone, QrCode, Users } from 'lucide-react';
import type { CountdownView } from '../_lib/countdown';
import { formatInt } from '../_lib/format';
import { PanelError } from './PanelError';

export interface CountdownProps {
  countdown: CountdownView | null;
  loading: boolean;
  /** Falha ao listar eventos — nunca fabricar "Nenhum evento agendado" (#03). */
  error?: boolean;
  onRetry?: (() => void) | undefined;
  onNavigate: (href: string) => void;
}

interface QuickAction {
  label: string;
  href: (c: CountdownView) => string;
  icon: typeof Users;
}

// Fiel ao mockup: Ver inscritos · Comunicar · Check-in (D3 — a rota de
// comunicação existe desde E06-L3).
const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Ver inscritos', href: (c) => c.inscritosHref, icon: Users },
  { label: 'Comunicar', href: (c) => c.comunicacaoHref, icon: Megaphone },
  { label: 'Check-in', href: (c) => c.checkinHref, icon: QrCode },
];

const LABEL_UPPER = 'uppercase tracking-[var(--countdown-label-spacing)]';

export function Countdown({
  countdown,
  loading,
  error,
  onRetry,
  onNavigate,
}: CountdownProps): JSX.Element {
  return (
    <section
      aria-label="Próximo evento"
      className={cn(
        'relative overflow-hidden',
        'rounded-[var(--card-radius)]',
        // Tints radiais da marca POR CIMA do surface-raised (mockup)
        'bg-[var(--surface-raised)] [background-image:var(--countdown-bg)]',
        'border border-[color:var(--countdown-border)]',
        'p-[var(--countdown-padding)]',
        'shadow-elev-2',
      )}
    >
      {/* Eyebrow */}
      <h2
        className={cn(
          'flex items-center gap-[var(--spacing-1-5)]',
          'text-[length:var(--countdown-eyebrow-size)] font-[var(--font-weight-bold)]',
          'uppercase tracking-[var(--countdown-eyebrow-spacing)]',
          'text-[var(--action-brand-tint-fg)]',
          'mb-[var(--spacing-2-5)]',
        )}
      >
        <Clock
          aria-hidden
          className="w-[var(--countdown-eyebrow-icon-size)] h-[var(--countdown-eyebrow-icon-size)]"
        />
        Próximo evento
      </h2>

      {loading ? (
        <div
          role="status"
          aria-label="Carregando próximo evento"
          className="flex flex-col gap-[var(--spacing-2)]"
        >
          <Skeleton variant="text" />
          <Skeleton variant="rect" className="h-24" />
        </div>
      ) : error ? (
        <PanelError message="Não foi possível carregar o próximo evento." onRetry={onRetry} />
      ) : !countdown ? (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Nenhum evento agendado.
        </p>
      ) : (
        <>
          {/* Nome */}
          <p
            className={cn(
              'font-display italic font-[var(--font-weight-bold)]',
              'text-[length:var(--countdown-name-size)]',
              'leading-[var(--countdown-name-leading)]',
              'text-[var(--text-primary)]',
              'mb-[var(--spacing-4)]',
              'text-pretty',
            )}
          >
            {countdown.nome}
          </p>

          {/* Número grande + unidade */}
          <div className="flex items-baseline gap-[var(--spacing-2-5)] mb-[var(--spacing-1)]">
            <span
              className={cn(
                'font-display italic font-[var(--font-weight-extrabold)]',
                'text-[length:var(--countdown-number-size)] leading-none',
                'tracking-[var(--countdown-number-spacing)]',
                'bg-[image:var(--countdown-number-gradient)] bg-clip-text text-transparent',
              )}
            >
              {countdown.numero}
            </span>
            {countdown.unidade ? (
              <span className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-secondary)] lowercase">
                {countdown.unidade}
              </span>
            ) : null}
          </div>

          {/* When (data · local — sem hora, honesto) */}
          {countdown.quando ? (
            <p
              className={cn(
                'flex items-center gap-[var(--spacing-1-5)]',
                'text-[length:var(--countdown-when-size)] text-[var(--text-tertiary)]',
                'mb-[var(--spacing-5)]',
              )}
            >
              <MapPin
                aria-hidden
                className="w-[var(--countdown-when-icon-size)] h-[var(--countdown-when-icon-size)] shrink-0"
              />
              {countdown.quando}
            </p>
          ) : null}

          {/* Stats 2-col entre hairlines */}
          <dl
            className={cn(
              'grid grid-cols-2 gap-[var(--countdown-stats-gap)]',
              'py-[var(--countdown-stats-py)]',
              'border-y border-[var(--border-subtle)]',
              'mb-[var(--spacing-4)]',
            )}
          >
            <div>
              <dd className="text-[length:var(--countdown-stat-value-size)] font-[var(--font-weight-bold)] tabular-nums text-[var(--text-primary)]">
                {formatInt(countdown.qtdInscritos)}
              </dd>
              <dt
                className={cn(
                  'text-[length:var(--countdown-stat-label-size)] font-[var(--font-weight-semibold)]',
                  LABEL_UPPER,
                  'text-[var(--text-tertiary)] mt-[var(--spacing-0-5)]',
                )}
              >
                Inscritos
              </dt>
            </div>
            <div>
              <dd className="text-[length:var(--countdown-stat-value-size)] font-[var(--font-weight-bold)] tabular-nums text-[var(--text-primary)]">
                {countdown.vagasRestantes !== null ? formatInt(countdown.vagasRestantes) : '—'}
              </dd>
              <dt
                className={cn(
                  'text-[length:var(--countdown-stat-label-size)] font-[var(--font-weight-semibold)]',
                  LABEL_UPPER,
                  'text-[var(--text-tertiary)] mt-[var(--spacing-0-5)]',
                )}
              >
                Vagas livres
              </dt>
            </div>
          </dl>

          {/* Quick actions (grade 3 do mockup) */}
          <div className="grid grid-cols-3 gap-[var(--countdown-quick-gap)]">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => onNavigate(href(countdown))}
                className={cn(
                  'group flex flex-col items-center gap-[var(--spacing-1-5)]',
                  'px-[var(--countdown-quick-px)] py-[var(--countdown-quick-py)]',
                  'rounded-[var(--radius-sm)]',
                  'text-[length:var(--countdown-quick-font-size)] font-[var(--font-weight-medium)]',
                  'text-[var(--text-secondary)] text-center',
                  'transition-colors duration-[var(--motion-duration-fast)]',
                  'hover:bg-[var(--surface-high)] hover:text-[var(--text-primary)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    'w-[var(--countdown-quick-icon-size)] h-[var(--countdown-quick-icon-size)]',
                    'text-[var(--text-tertiary)]',
                    'transition-colors duration-[var(--motion-duration-fast)]',
                    'group-hover:text-[var(--action-brand-tint-fg)]',
                  )}
                />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

Countdown.displayName = 'Countdown';
