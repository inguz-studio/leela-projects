// =============================================================================
// ClubeCard — card de clube no hub (S101-T2). Duas variantes:
//   own      — clube próprio (Zona A): destaque com borda de marca + stats.
//   parceiro — club parceiro (Zona B): card flat + popover contextual (•••).
// Presentational puro: recebe o Clube, callbacks e o estado do popover (a
// exclusividade C3 é gerida pelo hub, que mantém um único popover aberto).
// =============================================================================

import { Avatar, Badge, Button, DropdownMenu } from '@leela/design-system';
import type { DropdownMenuAction } from '@leela/design-system';
import type { Clube } from '@leela/core';
import { formatarLocalizacaoClube } from '@leela/core';
import { anoDe, formatInt } from '../_lib/format';

export interface ClubeCardProps {
  clube: Clube;
  variant: 'own' | 'parceiro';
  /** Abre o painel interno do club (SPA). */
  onAbrir: (slug: string) => void;
  /** Ações do popover contextual (só variante parceiro). */
  popoverActions?: DropdownMenuAction[];
  popoverOpen?: boolean;
  onPopoverOpenChange?: (open: boolean) => void;
}

function Meta({ clube }: { clube: Clube }): JSX.Element {
  const desde = anoDe(clube.criadoEm);
  return (
    <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
      {formatarLocalizacaoClube(clube.localizacao)}
      <span aria-hidden> · </span>
      {formatInt(clube.qtdMembrosAtivos)} membros
      {desde ? (
        <>
          <span aria-hidden> · </span>desde {desde}
        </>
      ) : null}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <span className="text-[length:var(--font-size-xs)] uppercase tracking-[var(--table-header-spacing)] text-[var(--text-tertiary)]">
        {label}
      </span>
      <span className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

export function ClubeCard({
  clube,
  variant,
  onAbrir,
  popoverActions,
  popoverOpen = false,
  onPopoverOpenChange,
}: ClubeCardProps): JSX.Element {
  const isOwn = variant === 'own';

  return (
    <article
      aria-label={clube.nome}
      className={
        'flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] p-[var(--spacing-5)] ' +
        (isOwn
          ? 'border-2 border-[var(--border-brand)] bg-[var(--surface-raised)]'
          : 'bg-[var(--surface-raised)]')
      }
    >
      <div className="flex items-start gap-[var(--spacing-4)]">
        <Avatar name={clube.nome} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[var(--spacing-2)]">
            <h3 className="truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
              {clube.nome}
            </h3>
            <Badge variant={isOwn ? 'brand' : 'neutro'}>{clube.categoria}</Badge>
          </div>
          <div className="mt-[var(--spacing-1)]">
            <Meta clube={clube} />
          </div>
        </div>
        {variant === 'parceiro' && popoverActions && popoverActions.length > 0 ? (
          <DropdownMenu
            actions={popoverActions}
            open={popoverOpen}
            onOpenChange={onPopoverOpenChange ?? (() => {})}
            align="right"
            trigger={
              <button
                type="button"
                aria-label={`Ações de ${clube.nome}`}
                className="shrink-0 rounded-[var(--radius-sm)] px-[var(--spacing-2)] py-[var(--spacing-1)] text-[var(--text-secondary)] hover:bg-[var(--action-ghost-hover)] hover:text-[var(--text-primary)]"
              >
                <span aria-hidden>⋯</span>
              </button>
            }
          />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-[var(--spacing-4)]">
        <Stat label="Membros ativos" value={formatInt(clube.qtdMembrosAtivos)} />
        <Stat label="Desafios ativos" value={formatInt(clube.qtdDesafiosAtivos)} />
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={() => onAbrir(clube.slug)}>
          Acessar painel
        </Button>
      </div>
    </article>
  );
}

ClubeCard.displayName = 'ClubeCard';
