// =============================================================================
// LotesView — config de lotes POR MODALIDADE (S300 · E04 · ADR-012).
// Presentational: agrupa os lotes por modalidade do evento e, por modalidade,
// mostra o PREÇO VIGENTE e o LOTE ATIVO (derivados do kernel — precoVigente/
// loteAtivo, nunca recalculados aqui) e uma tabela densa (§2.5) dos lotes com
// janela, vaga, preço e estado. Ações por lote: Editar / Remover (Remover
// bloqueado quando o lote já vendeu — RN-200/300). "Novo lote" por modalidade.
//
// Modalidades vêm de `evento.modalidades` (a criação/edição de modalidade é do
// editor do evento — E03-S201); aqui o organizador configura os LOTES de cada
// uma. Modalidade sem lote → dica + botão para configurar o primeiro.
// =============================================================================

import { Badge, Button, EmptyState, Skeleton, Table } from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import { loteAtivo, precoVigente, type Evento, type Lote } from '@leela/core';
import { Plus } from 'lucide-react';
import { formatDataHoraCurta, formatDinheiro, formatInt } from '../_lib/format';
import { estadoLoteBadge, loteImutavel } from './_lib/loteForm';

export interface LotesViewProps {
  evento: Evento;
  lotes: Lote[];
  loading: boolean;
  error: Error | null;
  onNovoLote: (modalidade: string) => void;
  onEditarLote: (lote: Lote) => void;
  onRemoverLote: (lote: Lote) => void;
  /** Abre o ajuste de capacidade (reabrir vagas — S307-T2). */
  onAjustarCapacidade: (lote: Lote) => void;
  /** Instante de referência (default `new Date()`) — injetável para teste. */
  agora?: Date;
}

export function LotesView({
  evento,
  lotes,
  loading,
  error,
  onNovoLote,
  onEditarLote,
  onRemoverLote,
  onAjustarCapacidade,
  agora = new Date(),
}: LotesViewProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando lotes" className="flex flex-col gap-[var(--spacing-4)]">
        <Skeleton variant="rect" className="h-40" />
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Não foi possível carregar os lotes"
        description="Tente recarregar a página. Se persistir, verifique sua conexão."
      />
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
          Lotes por modalidade
        </h2>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Cada modalidade tem sua própria sequência de lotes (Lote 1 → 2 → 3), com janela,
          vaga e preço próprios. A virada é automática: por data ou por esgotamento da vaga
          (o que ocorrer primeiro).
        </p>
      </div>

      {evento.modalidades.length === 0 ? (
        <EmptyState
          title="Este evento ainda não tem modalidades"
          description="Cadastre os percursos (5k, 10k, 21k…) na edição do evento antes de configurar lotes."
        />
      ) : (
        evento.modalidades.map((modalidade) => (
          <ModalidadeBloco
            key={modalidade}
            modalidade={modalidade}
            lotes={lotes.filter((l) => l.modalidade === modalidade)}
            agora={agora}
            onNovoLote={onNovoLote}
            onEditarLote={onEditarLote}
            onRemoverLote={onRemoverLote}
            onAjustarCapacidade={onAjustarCapacidade}
          />
        ))
      )}
    </div>
  );
}

interface ModalidadeBlocoProps {
  modalidade: string;
  lotes: Lote[];
  agora: Date;
  onNovoLote: (modalidade: string) => void;
  onEditarLote: (lote: Lote) => void;
  onRemoverLote: (lote: Lote) => void;
  onAjustarCapacidade: (lote: Lote) => void;
}

function ModalidadeBloco({
  modalidade,
  lotes,
  agora,
  onNovoLote,
  onEditarLote,
  onRemoverLote,
  onAjustarCapacidade,
}: ModalidadeBlocoProps): JSX.Element {
  const ordenados = [...lotes].sort((a, b) => a.ordem - b.ordem);
  // Preço vigente e lote ativo: DERIVAÇÃO do kernel (RN-300/301) — sem
  // precoLegado (a config de preço-base de percurso é outra tela); sem lote
  // ativo = venda fechada/não iniciada.
  const preco = precoVigente({ lotesDaModalidade: ordenados, agora });
  const ativo = loteAtivo(ordenados, agora);

  const colunas: TableColumn<Lote>[] = [
    { key: 'ordem', header: 'Ordem', width: 72, render: (l) => `L${l.ordem}` },
    { key: 'nome', header: 'Lote', render: (l) => l.nome },
    {
      key: 'janela',
      header: 'Janela',
      render: (l) => `${formatDataHoraCurta(l.inicioEm)} → ${formatDataHoraCurta(l.fimEm)}`,
    },
    {
      key: 'vaga',
      header: 'Vaga',
      align: 'right',
      render: (l) => `${formatInt(l.vendidos)} / ${formatInt(l.quantidadeLimite)}`,
    },
    {
      key: 'preco',
      header: 'Preço',
      align: 'right',
      render: (l) => formatDinheiro(l.preco),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (l) => {
        const badge = estadoLoteBadge(l, ordenados, agora);
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
  ];

  return (
    <section
      aria-label={`Lotes da modalidade ${modalidade}`}
      className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <div className="flex items-center gap-[var(--spacing-3)]">
            <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
              {modalidade}
            </h3>
            {preco !== null ? (
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                Preço vigente{' '}
                <strong className="font-[var(--font-weight-semibold)] text-[var(--text-brand)]">
                  {formatDinheiro(preco)}
                </strong>
                {ativo ? <> · lote ativo <strong className="text-[var(--text-primary)]">{ativo.nome}</strong></> : null}
              </span>
            ) : (
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                {ordenados.length === 0 ? 'Sem lote configurado' : 'Nenhum lote ativo (venda fechada ou não iniciada)'}
              </span>
            )}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => onNovoLote(modalidade)}>
          <Plus className="h-[var(--icon-size)] w-[var(--icon-size)] [stroke-width:var(--icon-stroke)]" />
          Novo lote
        </Button>
      </header>

      <Table
        columns={colunas}
        data={ordenados}
        keyExtractor={(l) => l.id}
        caption={`Lotes de ${modalidade}`}
        emptyTitle="Nenhum lote nesta modalidade"
        emptyDescription="Configure o primeiro lote para abrir a venda desta modalidade."
        renderActions={(lote) => (
          <div className="flex items-center gap-[var(--spacing-2)]">
            <Button variant="ghost" size="sm" onClick={() => onEditarLote(lote)}>
              Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onAjustarCapacidade(lote)}>
              Capacidade
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoverLote(lote)}
              disabled={loteImutavel(lote)}
              title={loteImutavel(lote) ? 'Lote com venda não pode ser removido' : undefined}
            >
              Remover
            </Button>
          </div>
        )}
      />
    </section>
  );
}

LotesView.displayName = 'LotesView';
