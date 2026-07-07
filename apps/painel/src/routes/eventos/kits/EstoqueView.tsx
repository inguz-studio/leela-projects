// =============================================================================
// EstoqueView — controle de estoque dos kits (S205-T4 · gap FID-EVT).
//
// Sobe da tabela plana para a visão que serve a dor "kit errado na entrega":
//   · Banner de alerta   — kits sem saldo (esgotados), dado real (presença).
//   · KPIs               — total (Σ capacidade), retirados, disponíveis, risco.
//   · Matriz kit×modalidade — demanda (confirmados) e retirado por célula: a
//     visão densa de "não errar o kit". Reusa o DS `Table` (colunas dinâmicas
//     por modalidade) — sem componente de matriz novo.
//   · Backend-dep HONESTO — estoque por TAMANHO (PP–XG) e MOVIMENTAÇÕES não são
//     modelados (Inscrito não coleta tamanho; não há livro-razão de estoque):
//     EmptyState, nunca número fabricado (mesmo padrão do Financeiro).
//
// Capacidade ausente no modelo → "—" (degradação graciosa). Presentational.
// =============================================================================

import { Badge, EmptyState, Skeleton, Table, type TableColumn } from '@leela/design-system';
import type { Inscrito, Kit } from '@leela/core';
import {
  estoquePorKit,
  matrizEstoque,
  resumoEstoque,
  type LinhaMatriz,
} from '../_lib/distribuicao';
import { formatInt } from '../_lib/format';

export interface EstoqueViewProps {
  kits: Kit[];
  inscritos: Inscrito[];
  modalidades: string[];
  loading: boolean;
  error: Error | null;
}

export function EstoqueView({
  kits,
  inscritos,
  modalidades,
  loading,
  error,
}: EstoqueViewProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando estoque" className="flex flex-col gap-[var(--spacing-3)]">
        <Skeleton variant="rect" className="h-28" />
        <Skeleton variant="rect" className="h-60" />
      </div>
    );
  }
  if (error) {
    return <p className="text-[var(--text-danger)]">Não foi possível carregar o estoque.</p>;
  }

  if (kits.length === 0) {
    return (
      <EmptyState
        title="Nenhum kit para controlar"
        description="Cadastre kits para acompanhar o estoque."
      />
    );
  }

  const resumo = resumoEstoque(kits, inscritos);
  const linhas = matrizEstoque(kits, inscritos, modalidades);
  const esgotados = estoquePorKit(kits, inscritos).filter((l) => l.esgotado);

  const columns: TableColumn<LinhaMatriz>[] = [
    { key: 'nome', header: 'Kit', render: (r) => r.nome },
    ...modalidades.map(
      (mod): TableColumn<LinhaMatriz> => ({
        key: `mod-${mod}`,
        header: mod,
        align: 'right',
        render: (r) => {
          const c = r.celulas.find((x) => x.modalidade === mod);
          if (!c || (!c.oferecido && c.confirmados === 0)) {
            return <span className="text-[var(--text-tertiary)]">—</span>;
          }
          return (
            <span className="[font-variant-numeric:tabular-nums]">
              <span className="text-[var(--text-primary)]">{formatInt(c.retirados)}</span>
              <span className="text-[var(--text-tertiary)]"> / {formatInt(c.confirmados)}</span>
            </span>
          );
        },
      }),
    ),
    {
      key: 'total',
      header: 'Retirados',
      align: 'right',
      render: (r) => (
        <span className="[font-variant-numeric:tabular-nums]">
          {formatInt(r.totalRetirados)} / {formatInt(r.totalConfirmados)}
        </span>
      ),
    },
    {
      key: 'capacidade',
      header: 'Capacidade',
      align: 'right',
      render: (r) => (r.capacidade === null ? '—' : formatInt(r.capacidade)),
    },
    {
      key: 'saldo',
      header: 'Saldo',
      align: 'right',
      render: (r) => (r.saldo === null ? '—' : formatInt(r.saldo)),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.capacidade === null ? (
          <Badge variant="neutro">Sem capacidade</Badge>
        ) : r.esgotado ? (
          <Badge variant="vulcao">Esgotado</Badge>
        ) : (
          <Badge variant="vitoria">Disponível</Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      {esgotados.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-[var(--spacing-3)] rounded-[var(--radius-md)] border-l-[var(--card-critical-border)] border-l-[var(--border-danger)] bg-[var(--feedback-danger-surface)] p-[var(--spacing-4)]"
        >
          <p className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]">
            <strong className="font-[var(--font-weight-bold)]">
              {esgotados.length} kit(s) sem saldo:
            </strong>{' '}
            {esgotados.map((e) => e.nome).join(', ')}. Reponha antes da entrega para não errar o
            kit na retirada.
          </p>
        </div>
      )}

      {/* KPIs — dado real (capacidade + presença) */}
      <section
        aria-label="Resumo de estoque"
        className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4"
      >
        <CardKpi
          rotulo="Total"
          valor={resumo.totalCapacidade === null ? '—' : formatInt(resumo.totalCapacidade)}
          nota="capacidade dos kits"
        />
        <CardKpi rotulo="Retirados" valor={formatInt(resumo.retirados)} nota="presença registrada" />
        <CardKpi
          rotulo="Disponíveis"
          valor={resumo.disponiveis === null ? '—' : formatInt(resumo.disponiveis)}
          nota="saldo por capacidade"
        />
        <CardKpi
          rotulo="Em risco"
          valor={formatInt(resumo.emRisco)}
          nota="kit(s) esgotado(s)"
          tom={resumo.emRisco > 0 ? 'danger' : 'primary'}
        />
      </section>

      {/* Matriz kit × modalidade — a visão de "não errar o kit" */}
      <section aria-label="Estoque por kit e modalidade" className="flex flex-col gap-[var(--spacing-3)]">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Kit por modalidade
          </h3>
          <p className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
            Retirados / confirmados por célula. Célula com "—" = kit não oferecido nessa
            modalidade.
          </p>
        </div>
        <Table
          columns={columns}
          data={linhas}
          keyExtractor={(r) => r.id}
          caption="Retiradas e saldo por kit e modalidade"
        />
      </section>

      {/* Backend-dependency HONESTO: NÃO inventamos estoque por tamanho. A coleta
          de tamanho na inscrição — origem da dor "kit errado por falha de coleta
          de tamanho" — não está no modelo (Inscrito não tem tamanho; ItemKit só
          marca `tamanhado`, sem quantidades por tamanho). */}
      <EmptyState
        title="Estoque por tamanho ainda não disponível"
        description="A matriz tamanho × modalidade (PP–XG) e os itens de tamanho único dependem da coleta de tamanho na inscrição e de um estoque por item — ainda não modelados. É o que fecharia a dor de 'kit errado por falha de coleta de tamanho'."
      />

      {/* Backend-dependency HONESTO: movimentações exigem um livro-razão de
          estoque (entradas/saídas/ajustes) inexistente no agregado atual. */}
      <EmptyState
        title="Movimentações ainda não disponíveis"
        description="Entradas, saídas e ajustes de estoque dependem de um livro-razão de movimentações — ainda não computado neste evento."
      />
    </div>
  );
}

function CardKpi({
  rotulo,
  valor,
  nota,
  tom = 'primary',
}: {
  rotulo: string;
  valor: string;
  nota: string;
  tom?: 'primary' | 'danger';
}): JSX.Element {
  const cor = tom === 'danger' ? 'text-[var(--text-danger)]' : 'text-[var(--text-primary)]';
  return (
    <div className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
        {rotulo}
      </span>
      <span
        className={`text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] [font-variant-numeric:tabular-nums] ${cor}`}
      >
        {valor}
      </span>
      <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">{nota}</span>
    </div>
  );
}

EstoqueView.displayName = 'EstoqueView';
