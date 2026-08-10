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

import { Badge, Button, Card, EmptyState, Skeleton, Table } from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import { capacidadeDoLote, loteAtivo, precoVigente, type Evento, type Lote } from '@leela/core';
import { Plus } from 'lucide-react';
import { formatDataHoraCurta, formatDinheiro, formatInt } from '../_lib/format';
import { estadoLoteBadge, loteDesativavel, loteImutavel } from './_lib/loteForm';

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
  /** Ação rápida: encerrar a venda deste lote agora (frente E). */
  onDesativarLote: (lote: Lote) => void;
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
  onDesativarLote,
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
          (o que ocorrer primeiro). As modalidades abaixo vêm da criação do evento — esta
          tela configura os lotes de cada uma, não a lista de modalidades.
        </p>
      </div>

      {evento.modalidades.length === 0 ? (
        // Texto HONESTO (DIAG-PAINEL-LACUNAS): a versão anterior mandava
        // "cadastrar os percursos na edição do evento", e essa tela não
        // existe — a lista de modalidades é escrita uma vez, pelo
        // `criarEvento`, e nenhuma superfície do painel a edita depois
        // (`atualizarConfiguracoesEvento` não envia `modalidades`). Junto com
        // a dica das Configurações, que mandava de volta para cá, isso
        // formava um círculo em que o organizador nunca chegava a lugar
        // nenhum. Enquanto não existir a edição, o texto conta o estado real
        // em vez de apontar uma porta fechada.
        <EmptyState
          title="Este evento não tem modalidades"
          description="As modalidades (5k, 10k, 21k…) são definidas quando o evento é criado, e o painel ainda não edita essa lista. Sem modalidade não há lote para configurar."
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
            onDesativarLote={onDesativarLote}
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
  onDesativarLote: (lote: Lote) => void;
}

function ModalidadeBloco({
  modalidade,
  lotes,
  agora,
  onNovoLote,
  onEditarLote,
  onRemoverLote,
  onAjustarCapacidade,
  onDesativarLote,
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
    // Os TRÊS números em TRÊS colunas (D-1008-R12: "simplifique para
    // vendidos, disponiveis e total" — a coluna única "150 · 0 · 150" lia
    // como amontoado). Segue sem obrigar subtração de cabeça: os três números
    // continuam lado a lado, cada um com header próprio e alinhamento
    // numérico do padrão da Table (align right + tabular-nums).
    // `capacidadeDoLote` é a aritmética do kernel (disponível = configurado −
    // vendido, nunca negativo).
    {
      key: 'vendidos',
      header: 'Vendidos',
      align: 'right',
      render: (l) => (
        <span className="[font-variant-numeric:tabular-nums] text-[var(--text-secondary)]">
          {formatInt(capacidadeDoLote(l).vendido)}
        </span>
      ),
    },
    {
      key: 'disponiveis',
      header: 'Disponíveis',
      align: 'right',
      render: (l) => (
        <strong className="[font-variant-numeric:tabular-nums] font-[var(--font-weight-semibold)] text-[var(--text-success)]">
          {formatInt(capacidadeDoLote(l).disponivel)}
        </strong>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (l) => (
        <span className="[font-variant-numeric:tabular-nums] text-[var(--text-secondary)]">
          {formatInt(capacidadeDoLote(l).configurado)}
        </span>
      ),
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
    // Card CANÔNICO, não <section> cru com bg (mesma família do D-1008-R11):
    // sob o vidro --surface-raised é filme translúcido que só lê como cartão
    // com a receita blur+borda+elevação do Card. role="region" + aria-label
    // preservam o landmark que o <section> nomeado dava.
    <Card
      role="region"
      aria-label={`Lotes da modalidade ${modalidade}`}
      className="flex flex-col gap-[var(--spacing-3)] p-[var(--spacing-5)]"
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
        renderActions={(lote) => {
          // Desativar = encerrar a venda AGORA, mesmo com a janela vigente
          // (frente E). Só aparece habilitado enquanto o lote ainda vende: um
          // lote já encerrado não tem venda para interromper, e um lote
          // agendado (janela não aberta) sai por Remover.
          const desativavel = loteDesativavel(lote, agora);
          return (
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
                onClick={() => onDesativarLote(lote)}
                disabled={!desativavel}
                title={
                  desativavel
                    ? 'Encerra a venda deste lote agora; as inscrições já vendidas continuam válidas'
                    : 'Este lote já não está vendendo'
                }
              >
                Desativar
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
          );
        }}
      />
    </Card>
  );
}

LotesView.displayName = 'LotesView';
