// =============================================================================
// ParceriasView — tela de parcerias do clube (S107-T2). 3 blocos (SPEC §2.7):
// convites pendentes (aceitar/recusar), eventos promovidos (tabela densa +
// ações) e patrocinadores (cards). Comissão/cupom/link/termos são espelhados do
// organizador — read-only (RN-120/122). Presentational puro; ações via props.
// =============================================================================

import {
  Badge,
  Button,
  EmptyState,
  Skeleton,
  Table,
} from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import type {
  Parceria,
  ParceriaEventoAfiliado,
  ParceriaPatrocinador,
} from '@leela/core';
import { formatInt } from '../../_lib/format';
import {
  formatBRL,
  modeloComercialLabel,
  separarParcerias,
  statusParceriaBadge,
} from '../../_lib/parcerias';

export interface ParceriasViewProps {
  parcerias: Parceria[] | null;
  loading: boolean;
  error: Error | null;
  onAceitar?: (p: ParceriaEventoAfiliado) => void;
  onRecusar?: (p: ParceriaEventoAfiliado) => void;
  onCopiarLink?: (p: ParceriaEventoAfiliado) => void;
  onVerTermos?: (p: ParceriaEventoAfiliado) => void;
  onRemoverEvento?: (p: ParceriaEventoAfiliado) => void;
  onAdicionarPatrocinador?: () => void;
  onDesativarPatrocinador?: (p: ParceriaPatrocinador) => void;
}

function ConviteCard({
  p,
  onAceitar,
  onRecusar,
}: {
  p: ParceriaEventoAfiliado;
  onAceitar?: ((p: ParceriaEventoAfiliado) => void) | undefined;
  onRecusar?: ((p: ParceriaEventoAfiliado) => void) | undefined;
}): JSX.Element {
  return (
    <article className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <div className="flex items-start justify-between gap-[var(--spacing-3)]">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {p.eventoId}
          </h3>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            Comissão {p.comissaoPct}% · cupom {p.cupom ?? '—'} · janela {p.janelaAtribuicaoDias} dias
          </p>
        </div>
        <Badge variant="heroico">Convite pendente</Badge>
      </div>
      <div className="flex items-center gap-[var(--spacing-2)]">
        <Button variant="primary" onClick={() => onAceitar?.(p)}>
          Aceitar
        </Button>
        <Button variant="ghost" onClick={() => onRecusar?.(p)}>
          Recusar
        </Button>
      </div>
    </article>
  );
}

function PatrocinadorCard({
  p,
  onDesativar,
}: {
  p: ParceriaPatrocinador;
  onDesativar?: ((p: ParceriaPatrocinador) => void) | undefined;
}): JSX.Element {
  const badge = statusParceriaBadge(p.status);
  return (
    <article className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <div className="flex items-start justify-between gap-[var(--spacing-3)]">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {p.nome}
          </h3>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {modeloComercialLabel(p.modeloComercial)}
            {p.modeloComercial === 'financeiro' && p.valorAnual !== undefined
              ? ` · ${formatBRL(p.valorAnual)}/ano`
              : ''}
          </p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">{p.contrapartida}</p>
      <div>
        <Button variant="ghost" onClick={() => onDesativar?.(p)}>
          Desativar
        </Button>
      </div>
    </article>
  );
}

export function ParceriasView({
  parcerias,
  loading,
  error,
  onAceitar,
  onRecusar,
  onCopiarLink,
  onVerTermos,
  onRemoverEvento,
  onAdicionarPatrocinador,
  onDesativarPatrocinador,
}: ParceriasViewProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando parcerias" className="flex flex-col gap-[var(--spacing-4)]">
        <Skeleton variant="rect" className="h-32" />
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
      >
        Não foi possível carregar as parcerias. Tente novamente.
      </div>
    );
  }

  const { convitesPendentes, eventosPromovidos, patrocinadores } = separarParcerias(parcerias ?? []);
  const vazioTotal =
    convitesPendentes.length === 0 && eventosPromovidos.length === 0 && patrocinadores.length === 0;

  const colunas: TableColumn<ParceriaEventoAfiliado>[] = [
    { key: 'evento', header: 'Evento', render: (p) => p.eventoId },
    { key: 'comissao', header: 'Comissão', render: (p) => `${p.comissaoPct}%` },
    { key: 'cupom', header: 'Cupom', render: (p) => p.cupom ?? '—' },
    { key: 'conversoes', header: 'Conversões', render: (p) => formatInt(p.conversoes) },
    { key: 'aReceber', header: 'A receber', render: (p) => formatBRL(p.valorAReceber) },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-8)]">
      {vazioTotal ? (
        <EmptyState
          title="Nenhuma parceria ainda"
          description="Convites de eventos e patrocinadores aparecem aqui."
          action={
            <Button variant="primary" onClick={onAdicionarPatrocinador}>
              + Adicionar patrocinador
            </Button>
          }
        />
      ) : null}

      {convitesPendentes.length > 0 ? (
        <section aria-label="Convites pendentes" className="flex flex-col gap-[var(--spacing-3)]">
          <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Convites pendentes ({convitesPendentes.length})
          </h2>
          <div className="grid grid-cols-1 gap-[var(--spacing-4)] lg:grid-cols-2">
            {convitesPendentes.map((p) => (
              <ConviteCard key={p.id} p={p} onAceitar={onAceitar} onRecusar={onRecusar} />
            ))}
          </div>
        </section>
      ) : null}

      {eventosPromovidos.length > 0 ? (
        <section aria-label="Eventos promovidos" className="flex flex-col gap-[var(--spacing-3)]">
          <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Eventos promovidos ({eventosPromovidos.length})
          </h2>
          <Table
            columns={colunas}
            data={eventosPromovidos}
            keyExtractor={(p) => p.id}
            caption="Eventos promovidos pelo clube"
            renderActions={(p) => (
              <div className="flex items-center gap-[var(--spacing-2)]">
                <Button variant="ghost" onClick={() => onCopiarLink?.(p)}>
                  Copiar link
                </Button>
                <Button variant="ghost" onClick={() => onVerTermos?.(p)}>
                  Ver termos
                </Button>
                <Button variant="ghost" onClick={() => onRemoverEvento?.(p)}>
                  Remover
                </Button>
              </div>
            )}
          />
        </section>
      ) : null}

      {!vazioTotal ? (
        <section aria-label="Patrocinadores" className="flex flex-col gap-[var(--spacing-3)]">
          <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
            <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
              Patrocinadores ({patrocinadores.length})
            </h2>
            <Button variant="primary" onClick={onAdicionarPatrocinador}>
              + Adicionar patrocinador
            </Button>
          </div>
          {patrocinadores.length > 0 ? (
            <div className="grid grid-cols-1 gap-[var(--spacing-4)] lg:grid-cols-3">
              {patrocinadores.map((p) => (
                <PatrocinadorCard key={p.id} p={p} onDesativar={onDesativarPatrocinador} />
              ))}
            </div>
          ) : (
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              Nenhum patrocinador ativo.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}

ParceriasView.displayName = 'ParceriasView';
