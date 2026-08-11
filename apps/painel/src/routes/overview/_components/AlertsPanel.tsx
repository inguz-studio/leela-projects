// =============================================================================
// AlertsPanel — os alertas operacionais, recriados FIÉIS à seção "Alertas" do
// protótipo "Visao Geral v3" (lane HIFI-REC).
//
// Anatomia do protótipo: cartão vidro com eyebrow uppercase, itens em faixas
// `surface-overlay` (raio md, padding 14) com ÍCONE num círculo de 38px
// pintado pelos pares de feedback, título 0.875/700 e link "Ver agora →" à
// direita quando o alerta tem destino. O protótipo fecha com "Ver todos os
// alertas" — não existe hub de alertas no produto; o rodapé fica de fora e a
// divergência está nomeada no handoff.
//
// Consome o `alerts[]` do MESMO `getOverview` (contrato único). Severidade
// real → família de feedback real (warn/info/ok); o protótipo usa danger e
// warning porque os exemplos dele são financeiros — a cor aqui segue a
// severidade do dado, não o exemplo. Sem alertas → "Tudo em dia."
// =============================================================================

import { Skeleton, cn } from '@leela/design-system';
import { AlertTriangle, Bell, Check, Info, type LucideIcon } from 'lucide-react';
import type { OverviewAlert, SeveridadeAlerta } from '@leela/core';
import { PanelError } from './PanelError';
import { CartaoV3, EyebrowV3, LinkV3 } from '../../../components/CartaoV3';

export interface AlertsPanelProps {
  alerts: OverviewAlert[] | null;
  loading: boolean;
  /** Falha do getOverview — nunca fabricar "Tudo em dia" sobre erro (#03). */
  error?: boolean;
  onRetry?: (() => void) | undefined;
  /** Navegação SPA do "Ver agora" (alertas com href). */
  onNavigate?: ((href: string) => void) | undefined;
}

interface IconeSeveridade {
  icon: LucideIcon;
  classes: string;
}

// Círculo de 38px com tint + fg de feedback por severidade (protótipo).
const ICONE_SEVERIDADE: Record<SeveridadeAlerta, IconeSeveridade> = {
  warn: {
    icon: AlertTriangle,
    classes: 'bg-[var(--feedback-warning-surface)] text-[var(--feedback-warning-fg)]',
  },
  info: {
    icon: Info,
    classes: 'bg-[var(--feedback-info-surface)] text-[var(--feedback-info-fg)]',
  },
  ok: {
    icon: Check,
    classes: 'bg-[var(--feedback-success-surface)] text-[var(--feedback-success-fg)]',
  },
};

export function AlertsPanel({
  alerts,
  loading,
  error,
  onRetry,
  onNavigate,
}: AlertsPanelProps): JSX.Element {
  return (
    <CartaoV3 aria="Alertas operacionais">
      <div className="flex items-center justify-between gap-[var(--spacing-3)]">
        <EyebrowV3 icon={<Bell />}>Alertas</EyebrowV3>
        {alerts && alerts.length > 0 ? (
          <span className="mb-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {alerts.length} {alerts.length === 1 ? 'ativo' : 'ativos'}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div
          role="status"
          aria-label="Carregando alertas"
          className="flex flex-col gap-[var(--spacing-3)]"
        >
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-14" />
          ))}
        </div>
      ) : error ? (
        <PanelError message="Não foi possível carregar os alertas." onRetry={onRetry} />
      ) : !alerts || alerts.length === 0 ? (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Tudo em dia. Nenhum alerta.
        </p>
      ) : (
        <ul role="list" className="list-none m-0 p-0 flex flex-col gap-[var(--spacing-3)]">
          {alerts.map((alerta) => {
            const severidade = ICONE_SEVERIDADE[alerta.severidade] ?? ICONE_SEVERIDADE.info;
            const Icone = severidade.icon;
            return (
              <li
                key={alerta.id}
                role="alert"
                className={cn(
                  'flex items-center gap-[var(--spacing-3-5)]',
                  'p-[var(--spacing-3-5)] rounded-[var(--radius-md)] bg-[var(--surface-overlay)]',
                )}
              >
                <span
                  aria-hidden
                  data-testid={`alert-icon-${alerta.severidade}`}
                  className={cn(
                    'flex items-center justify-center shrink-0',
                    'w-[var(--v3-alert-icon)] h-[var(--v3-alert-icon)]',
                    'rounded-[var(--radius-pill)]',
                    severidade.classes,
                  )}
                >
                  <Icone className="w-[var(--v3-alert-icon-svg)] h-[var(--v3-alert-icon-svg)]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[length:var(--font-size-base)] font-[var(--font-weight-bold)] text-[var(--text-primary)] text-pretty">
                    {alerta.titulo}
                  </span>
                  <span className="block mt-[var(--spacing-0-5)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                    {alerta.quando}
                  </span>
                </span>
                {alerta.href && onNavigate ? (
                  <LinkV3 onClick={() => onNavigate(alerta.href as string)}>Ver agora</LinkV3>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </CartaoV3>
  );
}

AlertsPanel.displayName = 'AlertsPanel';
