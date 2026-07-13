// =============================================================================
// SystemStateScreen (web) — LEELA-E07 · S500-T1 (recorte web-only).
//
// Bloco central: ilustração/ícone (aria-hidden) + título (H2, sentence case) +
// mensagem + detalhe auxiliar opcional (id de erro) + fileira de ações. Foco
// programático na ação primária ao montar (a11y AA). §2.16 flat — exceção
// permitida: `border-left` Vulcão (danger) SÓ na variante `error` (500). Zero
// valor hardcoded: todo visual referencia token semântico (var(--...)).
//
// A copy nunca é embutida (vem por prop); o componente só decide layout,
// severidade (role/border/cor do ícone) e o ícone-fallback por variante.
// =============================================================================

import * as React from 'react';
import { Compass, Lock, TriangleAlert, WifiOff, Wrench, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../Button';
import type { SystemStateScreenProps, SystemStateVariant } from './types';

// Ícone-fallback por variante (usado quando `illustration`/`icon` não vêm).
// Lucide 24×24 stroke 1.75 (tokens --icon-size / --icon-stroke).
const DEFAULT_ICON: Record<SystemStateVariant, LucideIcon> = {
  notFound: Compass,
  forbidden: Lock,
  error: TriangleAlert,
  offline: WifiOff,
  maintenance: Wrench,
};

function SystemStateScreen({
  variant,
  title,
  message,
  actions,
  icon,
  illustration,
  detail,
  layout = 'shell',
}: SystemStateScreenProps): JSX.Element {
  const isError = variant === 'error';

  // Índice da ação primária — foco inicial cai aqui (fallback: 1ª ação).
  const primaryIndex = Math.max(
    0,
    actions.findIndex((a) => a.variant === 'primary'),
  );
  const primaryRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  // Guarda de contrato (§DS: máx 1 primary). Dev-only e defensiva contra
  // ambientes sem `process` (browser ESM) — nunca quebra em runtime.
  const primaryCount = actions.filter((a) => a.variant === 'primary').length;
  React.useEffect(() => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && primaryCount > 1) {
      console.error(
        `SystemStateScreen: recebeu ${primaryCount} ações 'primary'; o design system permite no máximo 1 por tela.`,
      );
    }
  }, [primaryCount]);

  const Icon = icon ?? DEFAULT_ICON[variant];

  const card = (
    <div
      // role="alert" só na severidade de erro (500); ausente nas demais.
      role={isError ? 'alert' : undefined}
      className={cn(
        'flex flex-col items-center gap-[var(--spacing-4)] text-center',
        'max-w-md w-full',
        // Exceção §2.16: card crítico Vulcão (border-left danger) SÓ no erro.
        isError && [
          'items-start text-left',
          'rounded-[var(--radius-lg)] bg-[var(--surface-raised)]',
          'p-[var(--spacing-6)]',
          'border-l-4 border-l-[color:var(--border-danger)]',
        ],
      )}
    >
      <div
        aria-hidden="true"
        className={cn(isError ? 'text-[var(--text-danger)]' : 'text-[var(--text-secondary)]')}
      >
        {illustration ?? (
          <Icon className="w-[var(--icon-size)] h-[var(--icon-size)] [stroke-width:var(--icon-stroke)]" />
        )}
      </div>

      <div className="flex flex-col gap-[var(--spacing-2)]">
        <h2 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">{message}</p>
      </div>

      {detail !== undefined && detail.length > 0 && (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          ID do erro: {detail}
        </p>
      )}

      {actions.length > 0 && (
        <div
          className={cn(
            'flex flex-wrap gap-[var(--spacing-3)]',
            isError ? 'justify-start' : 'justify-center',
          )}
        >
          {actions.map((action, index) => {
            const isPrimaryAction = index === primaryIndex;
            const setRef = isPrimaryAction
              ? (node: HTMLElement | null) => {
                  primaryRef.current = node;
                }
              : undefined;

            if (action.href !== undefined) {
              return (
                <Button key={action.label} asChild variant={action.variant}>
                  <a
                    ref={setRef as React.Ref<HTMLAnchorElement> | undefined}
                    href={action.href}
                    onClick={() => action.onPress()}
                  >
                    {action.label}
                  </a>
                </Button>
              );
            }

            return (
              <Button
                key={action.label}
                ref={setRef as React.Ref<HTMLButtonElement> | undefined}
                variant={action.variant}
                onClick={action.onPress}
              >
                {action.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );

  if (layout === 'fullscreen') {
    return (
      <div
        data-layout="fullscreen"
        className="min-h-screen w-full flex items-center justify-center bg-[var(--surface-base)] p-[var(--spacing-8)]"
      >
        {card}
      </div>
    );
  }

  return (
    <div
      data-layout="shell"
      className="w-full flex items-center justify-center p-[var(--spacing-8)]"
    >
      {card}
    </div>
  );
}

SystemStateScreen.displayName = 'SystemStateScreen';

export { SystemStateScreen };
