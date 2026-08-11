// =============================================================================
// Countdown — card "Próximo evento" recriado FIEL ao protótipo "Visao Geral
// v3" (lane HIFI-REC; a fidelidade é o critério primário, L-004 suspenso).
//
// Anatomia do protótipo: eyebrow com calendário · nome do evento em display
// 1.25rem · linha de meta (calendário + "21 set • local") · régua de QUATRO
// stats entre hairlines (o primeiro na cor da marca) · CTA de largura cheia
// "Gerenciar evento →". O número gigante em gradiente e as três quick-actions
// eram do mockup ANTERIOR — o v3 os substituiu pela régua e pelo CTA.
//
// Verdade de dado (P-REC-4): o protótipo pinta "receita confirmada" POR
// EVENTO; esse agregado não existe no cliente (a receita do `getOverview` é do
// portfólio inteiro). O 4º stat é "vagas livres" — real, do mesmo doc — e a
// divergência está nomeada no handoff. "% ocupado" segue a razão canônica do
// core; capacidade desconhecida mostra "—", nunca 0 falso.
// =============================================================================

import { Skeleton, cn } from '@leela/design-system';
import { Calendar } from 'lucide-react';
import type { CountdownView } from '../_lib/countdown';
import { formatInt } from '../_lib/format';
import { PanelError } from './PanelError';
import { CartaoV3, CtaV3, EyebrowV3, StatV3 } from '../../../components/CartaoV3';

export interface CountdownProps {
  countdown: CountdownView | null;
  loading: boolean;
  /** Falha ao listar eventos — nunca fabricar "Nenhum evento agendado" (#03). */
  error?: boolean;
  onRetry?: (() => void) | undefined;
  onNavigate: (href: string) => void;
}

/** Valor do stat de dias — dia da prova vira "Hoje", nunca "0". @pure */
export function valorDoStatDias(dias: number): string {
  return dias <= 0 ? 'Hoje' : formatInt(dias);
}

/** Rótulo do stat de dias ("dias restantes"/"dia restante"/"dia da prova"). @pure */
export function rotuloDoStatDias(dias: number): string {
  if (dias <= 0) return 'dia da prova';
  return dias === 1 ? 'dia restante' : 'dias restantes';
}

export function Countdown({
  countdown,
  loading,
  error,
  onRetry,
  onNavigate,
}: CountdownProps): JSX.Element {
  return (
    <CartaoV3
      aria="Próximo evento"
      elev={2}
      className={cn(
        'relative overflow-hidden flex flex-col',
        // Tints radiais da marca POR CIMA do surface-raised (protótipo:
        // background-image countdown-bg sobre o card vidro).
        '[background-image:var(--countdown-bg)]',
      )}
    >
      <EyebrowV3 icon={<Calendar />}>Próximo evento</EyebrowV3>

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
          {/* Nome (protótipo: display 800, 1.25rem, lh 1.2, text-pretty) */}
          <p
            className={cn(
              'font-display font-[var(--font-weight-extrabold)]',
              'text-[length:var(--font-size-lg)] leading-[var(--countdown-name-leading)]',
              'text-[var(--text-primary)] text-pretty',
              'mb-[var(--spacing-2)]',
            )}
          >
            {countdown.nome}
          </p>

          {/* Meta: calendário + "27 Abr · Florianópolis/SC" (real, sem hora) */}
          {countdown.quando ? (
            <p
              className={cn(
                'flex items-center gap-[var(--spacing-2)]',
                'text-[length:var(--font-size-sm-plus)] text-[var(--text-tertiary)]',
                'mb-[var(--spacing-5)]',
              )}
            >
              <Calendar
                aria-hidden
                className="w-[var(--v3-icon-sm)] h-[var(--v3-icon-sm)] shrink-0"
              />
              {countdown.quando}
            </p>
          ) : null}

          {/* Régua de 4 stats entre hairlines (protótipo). Tudo real. */}
          <div
            className={cn(
              'grid grid-cols-2 gap-[var(--spacing-4)] sm:grid-cols-4',
              'py-[var(--spacing-4-5)] border-y border-[var(--border-subtle)]',
              'mb-[var(--spacing-5)]',
            )}
          >
            <StatV3
              destaque
              valor={valorDoStatDias(countdown.diasRestantes)}
              rotulo={rotuloDoStatDias(countdown.diasRestantes)}
            />
            <StatV3 valor={formatInt(countdown.qtdInscritos)} rotulo="inscritos" />
            <StatV3
              valor={countdown.ocupacaoPct !== null ? `${formatInt(countdown.ocupacaoPct)}%` : '—'}
              rotulo="ocupado"
            />
            <StatV3
              valor={
                countdown.vagasRestantes !== null ? formatInt(countdown.vagasRestantes) : '—'
              }
              rotulo="vagas livres"
            />
          </div>

          <div className="flex-1" />
          <CtaV3 onClick={() => onNavigate(countdown.gerenciarHref)}>Gerenciar evento</CtaV3>
        </>
      )}
    </CartaoV3>
  );
}

Countdown.displayName = 'Countdown';
