// =============================================================================
// PlanosView — catálogo de planos de cobrança do platform_admin (CB-T3).
// Presentational: recebe estado async + callbacks. Tabela densa (§2.5) com
// nome, taxa por método (cartão à vista / PIX), resumo da tabela de parcelas e
// mensalidade SaaS; botão "Novo plano" no topo; ações por linha (Editar /
// Aplicar a tenant). Skeleton no load, bloco de erro com "Tentar novamente" no
// fail (§2.12), EmptyState honesto quando o catálogo está vazio (§2.12) — nunca
// spinner solto nem linha fake.
//
// Reuso: os MESMOS primitivos e o mesmo esqueleto de estados da fila de repasses
// (PageHeader/Table/Skeleton/Button) e os formatadores puros de plataforma
// (formatBRL/formatPct). A taxa NUNCA é recalculada aqui — a tela só exibe os
// campos do plano (a regra de taxa mora no core, RN-406).
// =============================================================================

import { Button, PageHeader, Skeleton, Table } from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import type { PlanoCobranca } from '@leela/core';
import { formatBRL, formatPct } from '../_lib/format';
import { resumoTabelaParcelas } from './_lib/resumo';

export interface PlanosViewProps {
  planos: PlanoCobranca[] | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onNovo: () => void;
  onEditar: (plano: PlanoCobranca) => void;
  onAplicar: (plano: PlanoCobranca) => void;
}

export function PlanosView({
  planos,
  loading,
  error,
  onRetry,
  onNovo,
  onEditar,
  onAplicar,
}: PlanosViewProps): JSX.Element {
  const itens = planos ?? [];

  const columns: TableColumn<PlanoCobranca>[] = [
    {
      key: 'nome',
      header: 'Plano',
      render: (p) => (
        <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">{p.nome}</span>
      ),
    },
    {
      key: 'cartao',
      header: 'Cartão à vista',
      align: 'right',
      render: (p) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatPct(p.taxaCartaoAVista)}</span>
      ),
    },
    {
      key: 'pix',
      header: 'PIX',
      align: 'right',
      render: (p) => <span className="[font-variant-numeric:tabular-nums]">{formatPct(p.taxaPix)}</span>,
    },
    {
      key: 'parcelas',
      header: 'Parcelamento',
      render: (p) => (
        <span className="text-[var(--text-secondary)]">{resumoTabelaParcelas(p.tabelaTaxasParcela)}</span>
      ),
    },
    {
      key: 'mensalidade',
      header: 'Mensalidade',
      align: 'right',
      render: (p) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatBRL(p.saasMonthlyFee)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Planos de cobrança"
        subtitle="Modelos nomeados de taxa e mensalidade — aplique um plano para estampar os termos de um organizador"
      />

      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        {loading ? (
          <div role="status" aria-label="Carregando planos de cobrança" className="flex flex-col gap-[var(--spacing-4)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rect" className="h-16" />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-[var(--spacing-3)] rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            <p>Não foi possível carregar os planos de cobrança.</p>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-[var(--spacing-4)]">
              <p aria-live="polite" className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                {itens.length} {itens.length === 1 ? 'plano' : 'planos'}
              </p>
              <Button variant="primary" size="sm" onClick={onNovo}>
                Novo plano
              </Button>
            </div>

            <Table
              columns={columns}
              data={itens}
              keyExtractor={(p) => p.id}
              caption="Planos de cobrança nomeados"
              emptyTitle="Nenhum plano de cobrança ainda"
              emptyDescription="Crie um plano nomeado (taxa por método, tabela de parcelas e mensalidade) para aplicá-lo aos organizadores."
              renderActions={(p) => (
                <div className="flex items-center justify-end gap-[var(--spacing-2)]">
                  <Button variant="ghost" size="sm" onClick={() => onEditar(p)}>
                    Editar
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => onAplicar(p)}>
                    Aplicar
                  </Button>
                </div>
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}

PlanosView.displayName = 'PlanosView';
