// =============================================================================
// MembrosList — tela de membros do club (S103-T2). KPIs + filtros combináveis
// (busca × status × papel = INTERSEÇÃO) + tabela densa com popover por linha.
// Remover / transferir abrem ConfirmModal (§2.15). DropdownMenu exclusivo (C3): um
// único aberto por vez. Stateful de UI (filtros/popover/confirm); os dados e a
// ação de convidar vêm por props.
// =============================================================================

import { useMemo, useState } from 'react';
import {
  KpiCard,
  Button,
  Chip,
  ConfirmModal,
  Input,
  DropdownMenu,
  Skeleton,
} from '@leela/design-system';
import type { PapelMembro, StatusMembro, Membro } from '@leela/core';
import { MembrosTable } from '../../_components/MembrosTable';
import {
  filtrarMembros,
  kpisMembros,
  papelMembroLabel,
} from '../../_lib/membros';
import { formatInt } from '../../_lib/format';

export interface MembrosListProps {
  membros: Membro[] | null;
  loading: boolean;
  error: Error | null;
  onConvidar: () => void;
  /** Executa a remoção do membro (mutation do backend) — injetada pelo container. */
  onRemover?: (membro: Membro) => void;
  /** Executa a transferência de propriedade — injetada pelo container. */
  onTransferir?: (membro: Membro) => void;
  agora?: Date | undefined;
}

const STATUS_OPCOES: { id: StatusMembro; label: string }[] = [
  { id: 'ativo', label: 'Ativos' },
  { id: 'novo', label: 'Novos' },
  { id: 'inativo', label: 'Inativos' },
];

const PAPEL_OPCOES: { id: PapelMembro; label: string }[] = [
  { id: 'owner', label: 'Owner' },
  { id: 'admin', label: 'Admins' },
  { id: 'membro', label: 'Membros' },
];

type ConfirmAlvo = { membro: Membro; tipo: 'remover' | 'transferir' };

export function MembrosList({
  membros,
  loading,
  error,
  onConvidar,
  onRemover,
  onTransferir,
  agora,
}: MembrosListProps): JSX.Element {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusMembro | null>(null);
  const [papel, setPapel] = useState<PapelMembro | null>(null);
  const [popoverAberto, setPopoverAberto] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<ConfirmAlvo | null>(null);

  const todos = membros ?? [];
  const kpis = useMemo(() => kpisMembros(todos), [todos]);
  const filtrados = useMemo(
    () => filtrarMembros(todos, { status, papel, busca }),
    [todos, status, papel, busca],
  );

  if (loading) {
    return (
      <div role="status" aria-label="Carregando membros" className="flex flex-col gap-[var(--spacing-4)]">
        <div className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-24" />
          ))}
        </div>
        <Skeleton variant="rect" className="h-80" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
      >
        Não foi possível carregar os membros. Tente novamente.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <section
        aria-label="Indicadores de membros"
        className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4"
      >
        <KpiCard label="Total de membros" value={formatInt(kpis.total)} hint={`${formatInt(kpis.admins)} admins`} />
        <KpiCard label="Ativos" value={formatInt(kpis.ativos)} />
        <KpiCard label="Novos" value={formatInt(kpis.novos)} />
        <KpiCard label="Inativos" value={formatInt(kpis.inativos)} hint="candidatos a reengajamento" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-4)]">
        <div>
          <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Membros
          </h2>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {formatInt(kpis.total)} membros · {formatInt(kpis.ativos)} ativos
          </p>
        </div>
        <Button variant="primary" onClick={onConvidar}>
          + Convidar membros
        </Button>
      </div>

      <div className="flex flex-col gap-[var(--spacing-3)]">
        <Input
          type="search"
          aria-label="Buscar membro por nome"
          placeholder="Buscar por nome"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          wrapperClassName="max-w-md"
        />
        <div className="flex flex-wrap items-center gap-[var(--spacing-4)]">
          <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-[var(--spacing-2)]">
            <Chip active={status === null} onClick={() => setStatus(null)}>
              Todos
            </Chip>
            {STATUS_OPCOES.map((s) => (
              <Chip key={s.id} active={status === s.id} onClick={() => setStatus(status === s.id ? null : s.id)}>
                {s.label}
              </Chip>
            ))}
          </div>
          <div role="group" aria-label="Filtrar por papel" className="flex flex-wrap gap-[var(--spacing-2)]">
            {PAPEL_OPCOES.map((p) => (
              <Chip key={p.id} active={papel === p.id} onClick={() => setPapel(papel === p.id ? null : p.id)}>
                {p.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
        Mostrando {formatInt(filtrados.length)} de {formatInt(kpis.total)} membros
      </p>

      <MembrosTable
        membros={filtrados}
        caption="Membros do clube"
        emptyTitle="Nenhum membro encontrado"
        emptyDescription="Nenhum membro casa com os filtros aplicados."
        agora={agora}
        renderActions={(m) => (
          <DropdownMenu
            open={popoverAberto === m.id}
            onOpenChange={(open) => setPopoverAberto(open ? m.id : null)}
            align="right"
            actions={[
              { id: 'perfil', label: 'Ver perfil', onClick: () => {} },
              { id: 'promover', label: 'Promover para Admin', onClick: () => {}, disabled: m.papel !== 'membro' },
              { id: 'transferir', label: 'Transferir propriedade', onClick: () => setConfirmar({ membro: m, tipo: 'transferir' }) },
              { id: 'remover', label: 'Remover do clube', destructive: true, onClick: () => setConfirmar({ membro: m, tipo: 'remover' }) },
            ]}
            trigger={
              <button
                type="button"
                aria-label={`Ações de ${m.atletaNome}`}
                className="rounded-[var(--radius-sm)] px-[var(--spacing-2)] py-[var(--spacing-1)] text-[var(--text-secondary)] hover:bg-[var(--action-ghost-hover)] hover:text-[var(--text-primary)]"
              >
                <span aria-hidden>⋯</span>
              </button>
            }
          />
        )}
      />

      {confirmar ? (
        <ConfirmModal
          open
          onOpenChange={(open) => !open && setConfirmar(null)}
          title={confirmar.tipo === 'remover' ? 'Remover membro do clube' : 'Transferir propriedade do clube'}
          description={
            confirmar.tipo === 'remover'
              ? `${confirmar.membro.atletaNome} perderá o acesso ao clube.`
              : `${confirmar.membro.atletaNome} passará a ser o owner do clube.`
          }
          target={<strong>{confirmar.membro.atletaNome}</strong>}
          loses={
            confirmar.tipo === 'remover'
              ? ['Acesso ao clube', 'Histórico de participação nos desafios']
              : ['Seu papel de owner', 'A gestão de membros, desafios e parcerias']
          }
          keeps={
            confirmar.tipo === 'remover'
              ? ['A conta do atleta na Be Hero']
              : [`${papelMembroLabel(confirmar.membro.papel)} vira owner`, 'Todos os membros e dados do clube']
          }
          confirmLabel={confirmar.tipo === 'remover' ? 'Remover membro' : 'Transferir propriedade'}
          onConfirm={() => {
            if (confirmar.tipo === 'remover') onRemover?.(confirmar.membro);
            else onTransferir?.(confirmar.membro);
            setConfirmar(null);
          }}
        />
      ) : null}
    </div>
  );
}

MembrosList.displayName = 'MembrosList';
