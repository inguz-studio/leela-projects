// =============================================================================
// RecentRegistrations — "Últimas inscrições" cross-evento (S601-T2; Lote
// FIDELIDADE T6: a QUEIXA Nº 1 — vira TABELA de 6 colunas do mockup, não mais
// lista empilhada). Table do DS (wrap card + densidade) com: Atleta (avatar-sm
// 28px gradiente + nome), Evento, Modalidade, Valor (right, mono tabular),
// Status (badge RN-204: Pago=vitoria · Pendente=alerta · Recusado=vulcao) e
// Data (right, tertiary 12px). Valor null → "—" (preço não derivável dos
// percursos — nunca inventa).
//
// Honestidade (#13): a fonte na Onda 1 é a 1ª página de cada evento ordenada
// por atletaNome (api-client `listarInscritos`), reordenada por data DENTRO
// dessa amostra alfabética — logo NÃO é o feed de chegada global. Enquanto o
// helper collection-group por criadoEm não existir, a UI rotula a degradação
// em vez de prometer recência que não entrega.
// =============================================================================

import { Avatar, Badge, Skeleton, Table, cn, type TableColumn } from '@leela/design-system';
import { ChevronRight } from 'lucide-react';
import type { InscricaoRecenteView } from '../_lib/recentRegistrations';
import { formatBRLExato } from '../_lib/format';
import { PanelError } from './PanelError';

export interface RecentRegistrationsProps {
  inscricoes: InscricaoRecenteView[] | null;
  loading: boolean;
  /** Falha ao carregar (própria ou herdada da lista de eventos) — não trava
   *  em skeleton eterno nem finge "nenhuma inscrição" (#03/#39). */
  error?: boolean;
  onRetry?: (() => void) | undefined;
  /** Link do section-head "Ver todas" (mockup `.section-link`). */
  onVerTodas?: (() => void) | undefined;
}

// 6 colunas do mockup (`Painel do Organizador.html`, seção Últimas inscrições)
const COLUNAS: TableColumn<InscricaoRecenteView>[] = [
  {
    key: 'atleta',
    header: 'Atleta',
    width: '25%',
    render: (i) => (
      <span className="flex items-center gap-[var(--spacing-2-5)] font-[var(--font-weight-medium)] text-[var(--text-primary)]">
        <Avatar size="xs" name={i.atletaNome} />
        <span className="truncate">{i.atletaNome}</span>
      </span>
    ),
  },
  {
    key: 'evento',
    header: 'Evento',
    render: (i) => i.eventoNome ?? '—',
  },
  {
    key: 'modalidade',
    header: 'Modalidade',
    render: (i) => i.modalidade,
  },
  {
    key: 'valor',
    header: 'Valor',
    align: 'right',
    // `.col-value` + brief: valor em mono à direita, tabular; null → "—"
    render: (i) =>
      i.valor === null ? (
        <span className="text-[var(--text-tertiary)]">—</span>
      ) : (
        <span className="[font-family:var(--font-family-mono)] tabular-nums font-[var(--font-weight-medium)] text-[var(--text-primary)]">
          {formatBRLExato(i.valor)}
        </span>
      ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (i) => <Badge variant={i.badge.variant}>{i.badge.label}</Badge>,
  },
  {
    key: 'data',
    header: 'Data',
    align: 'right',
    // `.col-date`: 12px tertiary tabular à direita
    render: (i) => (
      <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)] tabular-nums whitespace-nowrap">
        {i.quando}
      </span>
    ),
  },
];

export function RecentRegistrations({
  inscricoes,
  loading,
  error,
  onRetry,
  onVerTodas,
}: RecentRegistrationsProps): JSX.Element {
  return (
    <section aria-label="Últimas inscrições" className="flex flex-col">
      {/* Section head do mockup: título display + link à direita */}
      <div className="flex items-baseline justify-between gap-[var(--spacing-3)] mb-[var(--layout-section-head-mb)]">
        <h2
          className={cn(
            'font-display italic',
            'text-[length:var(--section-title-size)] font-[var(--font-weight-bold)]',
            'tracking-[var(--section-title-spacing)]',
            'text-[var(--text-primary)]',
          )}
        >
          Últimas inscrições
        </h2>
        {onVerTodas ? (
          <button
            type="button"
            onClick={onVerTodas}
            className={cn(
              'inline-flex items-center gap-[var(--spacing-1)]',
              'text-[length:var(--section-link-size)] text-[var(--text-tertiary)]',
              'transition-colors duration-[var(--motion-duration-fast)]',
              'hover:text-[var(--action-brand-tint-fg)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
            )}
          >
            Ver todas
            <ChevronRight
              aria-hidden
              className="w-[var(--section-link-icon-size)] h-[var(--section-link-icon-size)]"
            />
          </button>
        ) : null}
      </div>

      {loading ? (
        <div
          role="status"
          aria-label="Carregando inscrições"
          className="flex flex-col gap-[var(--spacing-2)]"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="text" />
          ))}
        </div>
      ) : error ? (
        <PanelError message="Não foi possível carregar as inscrições." onRetry={onRetry} />
      ) : !inscricoes || inscricoes.length === 0 ? (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Nenhuma inscrição recente.
        </p>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Amostra por evento, não a ordem de chegada completa.
          </p>
          <Table<InscricaoRecenteView>
            columns={COLUNAS}
            data={inscricoes}
            keyExtractor={(i) => i.id}
            caption="Últimas inscrições nos seus eventos"
          />
        </div>
      )}
    </section>
  );
}

RecentRegistrations.displayName = 'RecentRegistrations';
