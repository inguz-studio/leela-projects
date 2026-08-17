// =============================================================================
// ReembolsosView — fila de reembolsos + registro de transferências (S904-T5).
// Presentational: duas tabelas densas (§2.5). Reembolsos com estado, valor
// (SEMPRE do backend — RN-337), origem e motivo; os `em_analise` ganham as ações
// Aprovar/Recusar (o container abre o ConfirmModal). Transferências em leitura:
// tipo (titularidade/troca), estado, titular anterior→novo e a DIFERENÇA que o
// backend registrou (RN-344). Nada de valor recalculado aqui. EmptyState honesto
// quando não há reembolso/transferência (nunca dado fake).
// =============================================================================

import { Badge, EmptyState, RowActions, Skeleton, Table, type TableColumn } from '@leela/design-system';
import type { BadgeProps } from '@leela/design-system';
import type { EstadoReembolso, Reembolso, Transferencia } from '@leela/core';
import { formatDinheiro, formatDataHoraCurta } from '../_lib/format';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

/** Estado do reembolso → rótulo + variante de Badge (a11y: nunca só cor). */
const REEMBOLSO_BADGE: Record<EstadoReembolso, { label: string; variant: BadgeVariant }> = {
  solicitado: { label: 'Solicitado', variant: 'alerta' },
  em_analise: { label: 'Em análise', variant: 'alerta' },
  aprovado_auto: { label: 'Aprovado (auto)', variant: 'vitoria' },
  aprovado: { label: 'Aprovado', variant: 'vitoria' },
  estornado: { label: 'Estornado', variant: 'vitoria' },
  recusado: { label: 'Recusado', variant: 'vulcao' },
};

/** Valor a exibir: o estornado (quando concluído) senão o solicitado. @pure */
function valorReembolso(r: Reembolso): number {
  return r.estado === 'estornado' && typeof r.valorEstornado === 'number'
    ? r.valorEstornado
    : r.valorSolicitado;
}

/** Ref curta do inscrito (o doc é keyed por inscritoId — sem join de nome aqui). */
function refCurta(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export interface ReembolsosViewProps {
  reembolsos: Reembolso[];
  transferencias: Transferencia[];
  loading: boolean;
  error: Error | null;
  /** Abre a decisão (o container confirma + chama o callable). */
  onDecidir: (reembolso: Reembolso, decisao: 'aprovar' | 'recusar') => void;
  /** true enquanto uma decisão roda (desabilita as ações). */
  decidindo: boolean;
  /**
   * Resolve o NOME do inscrito (join da subcoleção canônica `inscritos` —
   * `atletaNome`; nunca PII sensível). null = ainda não resolveu (fila carrega
   * antes dos nomes) → a coluna cai na ref opaca, fallback digno e honesto.
   */
  nomeInscrito?: (inscritoId: string) => string | null;
}

export function ReembolsosView({
  reembolsos,
  transferencias,
  loading,
  error,
  onDecidir,
  decidindo,
  nomeInscrito,
}: ReembolsosViewProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando reembolsos" className="flex flex-col gap-[var(--spacing-3)]">
        <Skeleton variant="rect" className="h-40" />
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title="Não foi possível carregar a fila"
        description="Tente recarregar a página. Se persistir, verifique sua conexão."
      />
    );
  }

  const emAnalise = reembolsos.filter((r) => r.estado === 'em_analise').length;

  /** Nome do inscrito quando o join resolveu; senão a ref opaca (fallback digno). */
  const rotuloInscrito = (inscritoId: string): string =>
    nomeInscrito?.(inscritoId) ?? refCurta(inscritoId);

  const colunasReembolso: TableColumn<Reembolso>[] = [
    { key: 'inscrito', header: 'Inscrito', render: (r) => rotuloInscrito(r.inscritoId) },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => {
        const b = REEMBOLSO_BADGE[r.estado];
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: 'valor',
      header: 'Valor',
      align: 'right',
      render: (r) => formatDinheiro(valorReembolso(r)),
    },
    {
      key: 'origem',
      header: 'Origem',
      // T4 (RN-376): a plataforma também abre reembolso no tenant — o
      // organizador vê a mão de quem foi, não um "Organizador" mentiroso.
      render: (r) =>
        r.origem === 'atleta' ? 'Atleta' : r.origem === 'plataforma' ? 'Plataforma' : 'Organizador',
    },
    { key: 'motivo', header: 'Motivo', render: (r) => r.motivo || '—' },
  ];

  const colunasTransferencia: TableColumn<Transferencia>[] = [
    {
      key: 'tipo',
      header: 'Tipo',
      render: (t) => (
        <Badge variant={t.tipo === 'titularidade' ? 'brand' : 'neutro'}>
          {t.tipo === 'titularidade' ? 'Titularidade' : 'Troca de ingresso'}
        </Badge>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (t) => (
        <Badge variant={t.estado === 'concluida' ? 'vitoria' : 'alerta'}>
          {t.estado === 'concluida' ? 'Concluída' : 'Registrada'}
        </Badge>
      ),
    },
    {
      key: 'mudanca',
      header: 'Mudança',
      render: (t) =>
        t.tipo === 'titularidade'
          ? `${t.titularAnterior.nome || rotuloInscrito(t.inscritoId)} → ${t.novoTitular?.nome ?? '—'}`
          : `${t.titularAnterior.nome || rotuloInscrito(t.inscritoId)} → ${t.novaModalidade ?? '—'}`,
    },
    {
      key: 'diff',
      header: 'Diferença',
      align: 'right',
      render: (t) => formatDinheiro(t.diffCobrada),
    },
    { key: 'data', header: 'Data', render: (t) => formatDataHoraCurta(t.criadoEm) },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <section aria-label="Reembolsos" className="flex flex-col gap-[var(--spacing-3)]">
        <div className="flex flex-wrap items-baseline justify-between gap-[var(--spacing-2)]">
          <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Reembolsos
          </h2>
          {emAnalise > 0 ? (
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              {emAnalise === 1 ? '1 aguardando análise' : `${emAnalise} aguardando análise`}
            </span>
          ) : null}
        </div>
        {reembolsos.length === 0 ? (
          <EmptyState
            title="Nenhum reembolso"
            description="Solicitações de reembolso aparecem aqui. As em análise trazem os botões Aprovar e Recusar."
          />
        ) : (
          <Table
            columns={colunasReembolso}
            data={reembolsos}
            keyExtractor={(r) => r.id}
            caption="Reembolsos do evento por estado"
            renderActions={(r) =>
              r.estado === 'em_analise' ? (
                // Ícone no lugar do escrito (decisão do dono, 17/08). O rótulo
                // carrega DE QUEM é o reembolso: numa fila de decisão, "Aprovar"
                // sozinho não diz o que se está aprovando.
                <RowActions
                  actions={[
                    {
                      id: 'aprovar',
                      label: `Aprovar reembolso de ${rotuloInscrito(r.inscritoId)}`,
                      verbo: 'aprovar',
                      onClick: () => onDecidir(r, 'aprovar'),
                      disabled: decidindo,
                    },
                    {
                      id: 'recusar',
                      label: `Recusar reembolso de ${rotuloInscrito(r.inscritoId)}`,
                      verbo: 'recusar',
                      onClick: () => onDecidir(r, 'recusar'),
                      destructive: true,
                      disabled: decidindo,
                    },
                  ]}
                />
              ) : null
            }
          />
        )}
      </section>

      <section aria-label="Transferências" className="flex flex-col gap-[var(--spacing-3)]">
        <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Transferências
        </h2>
        {transferencias.length === 0 ? (
          <EmptyState
            title="Nenhuma transferência"
            description="Transferências de titularidade e trocas de ingresso aparecem aqui, com a diferença registrada pelo sistema."
          />
        ) : (
          <Table
            columns={colunasTransferencia}
            data={transferencias}
            keyExtractor={(t) => t.id}
            caption="Transferências de titularidade e trocas de ingresso"
          />
        )}
      </section>
    </div>
  );
}

ReembolsosView.displayName = 'ReembolsosView';
