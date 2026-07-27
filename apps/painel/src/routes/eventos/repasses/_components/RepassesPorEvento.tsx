// =============================================================================
// RepassesPorEvento — seção "Por evento" da tela de Repasses (RN-349). Tabela
// densa: evento · vendido · retido · disponível estimado · repassado (Σ dos
// repasses ASSOCIADOS pelo campo exato `eventoId` — LEELA-BEPEND-T2, fim de
// heurística). Presentational puro.
//
// HONESTIDADE DO DINHEIRO (§2.12): o "disponível estimado" é por-evento e NÃO é
// o saldo autoritativo — ele já abate os repasses vivos do evento (DEC-0727),
// mas não a janela D+N, que é grandeza do tenant; uma nota explícita aponta o
// card "Disponível" agregado como número oficial.
// Evento sem termo comercial mostra "—" em retido/disponível (líquido
// indeterminado — nunca fabrica um valor). Repasses SEM `eventoId` (legado
// pré-RN-349) NÃO são atribuídos a evento nenhum: aparecem numa nota "sem
// associação" declarada. Sem eventos com movimento → EmptyState.
// =============================================================================

import { Badge, Skeleton, Table, type TableColumn } from '@leela/design-system';
import { formatBRL } from '../_lib/format';
import type { AssociacaoRepasses, LinhaRepasseEvento } from '../_lib/repassesPorEvento';
import { RepasseErro } from './RepasseErro';

export interface RepassesPorEventoProps {
  linhas: LinhaRepasseEvento[];
  /** Repasses agrupados pelo campo EXATO `eventoId` (RN-349). */
  associacao: AssociacaoRepasses;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

/** Valor com centavos ou "—" honesto (evento sem termo comercial). */
function valorOuTraco(v: number | null): string {
  return v === null ? '—' : formatBRL(v);
}

export function RepassesPorEvento({
  linhas,
  associacao,
  loading,
  error,
  onRetry,
}: RepassesPorEventoProps): JSX.Element {
  const { porEvento, semAssociacao } = associacao;
  const columns: TableColumn<LinhaRepasseEvento>[] = [
    {
      key: 'nome',
      header: 'Evento',
      render: (l) => (
        <span className="flex items-center gap-[var(--spacing-2)]">
          <span className="text-[var(--text-primary)]">{l.nome}</span>
          {l.encerrado && <Badge variant="neutro">Encerrado</Badge>}
        </span>
      ),
    },
    {
      key: 'vendido',
      header: 'Vendido',
      align: 'right',
      render: (l) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatBRL(l.vendido)}</span>
      ),
    },
    {
      key: 'retido',
      header: 'Retido',
      align: 'right',
      render: (l) => (
        <span className="[font-variant-numeric:tabular-nums] text-[var(--feedback-warning-fg)]">
          {valorOuTraco(l.retido)}
        </span>
      ),
    },
    {
      key: 'disponivelEstimado',
      header: 'Disponível estimado',
      align: 'right',
      render: (l) => (
        <span className="[font-variant-numeric:tabular-nums] text-[var(--text-success)]">
          {valorOuTraco(l.disponivelEstimado)}
        </span>
      ),
    },
    {
      key: 'repassado',
      header: 'Repassado',
      align: 'right',
      // Σ dos repasses ASSOCIADOS pelo campo exato eventoId (RN-349) —
      // {solicitado, aprovado, pago}; sem associação = "—" honesto.
      render: (l) => {
        const assoc = porEvento.get(l.eventoId);
        if (assoc === undefined || assoc.qtd === 0) {
          return <span className="[font-variant-numeric:tabular-nums]">—</span>;
        }
        return (
          <span className="[font-variant-numeric:tabular-nums]">
            {formatBRL(assoc.total)}{' '}
            <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
              ({assoc.qtd})
            </span>
          </span>
        );
      },
    },
  ];

  return (
    <section aria-label="Repasse por evento" className="flex flex-col gap-[var(--spacing-3)]">
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Por evento
        </h2>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Estimativa por evento, já descontados os repasses de cada um. O{' '}
          <strong>disponível</strong> oficial — que aplica também a janela de liberação — é o card
          &ldquo;Disponível&rdquo; acima.
        </p>
      </div>

      {loading ? (
        <div role="status" aria-label="Carregando repasse por evento">
          <Skeleton variant="rect" className="h-40" />
        </div>
      ) : error ? (
        <RepasseErro
          message="Não foi possível carregar o repasse por evento."
          onRetry={onRetry}
        />
      ) : (
        <>
          <Table
            columns={columns}
            data={linhas}
            keyExtractor={(l) => l.eventoId}
            caption="Vendido, retido, disponível estimado e repassado por evento"
            emptyTitle="Sem repasse consolidado ainda"
            emptyDescription="Quando seus eventos gerarem saldo, o repasse consolidado de todos eles aparece aqui."
          />
          {semAssociacao.qtd > 0 && (
            <p
              role="note"
              className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)] [font-variant-numeric:tabular-nums]"
            >
              {semAssociacao.qtd === 1
                ? `1 repasse (${formatBRL(semAssociacao.total)}) sem associação a evento`
                : `${semAssociacao.qtd} repasses (${formatBRL(semAssociacao.total)}) sem associação a evento`}
              {' '}— solicitados sobre o saldo geral (anteriores à associação por evento ou sem evento escolhido).
            </p>
          )}
        </>
      )}
    </section>
  );
}

RepassesPorEvento.displayName = 'RepassesPorEvento';
