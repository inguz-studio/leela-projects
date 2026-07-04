// =============================================================================
// InscritosView — lista densa de inscritos (S203-T2 · §2.5/§2.7).
// Presentational: recebe todos os inscritos e deriva filtro + paginação
// client-side. 4 tabs internas (Geral/Pagamento/Comunicação/Histórico), todas
// no DOM (§2.7 — DS Tabs usa forceMount). Slide-in de detalhe ao clicar linha.
// =============================================================================

import * as React from 'react';
import {
  Badge,
  Chip,
  Input,
  Pagination,
  Skeleton,
  Table,
  Tabs,
  type TableColumn,
} from '@leela/design-system';
import { INSCRITOS_PAGE_SIZE } from '@leela/api-client';
import {
  KITS_INSCRITO,
  STATUS_INSCRITO,
  type Inscrito,
  type KitInscrito,
  type StatusInscrito,
} from '@leela/core';
import { kitInscritoBadge } from '../_lib/kitLabels';
import { statusInscritoBadge } from '../_lib/statusInscrito';
import {
  contadorInscritos,
  filtrarInscritos,
  paginar,
} from '../_lib/inscritosFiltro';
import { InscritoSlideIn } from './InscritoSlideIn';

export interface InscritosViewProps {
  inscritos: Inscrito[];
  loading: boolean;
  error: Error | null;
  /** Percursos do evento — origem dos filtros de modalidade. */
  modalidades: string[];
}

const TAB_PLACEHOLDER: Record<string, { titulo: string; texto: string }> = {
  pagamento: {
    titulo: 'Pagamento',
    texto: 'Detalhes de cobrança e reembolso chegam com o módulo financeiro (E04).',
  },
  comunicacao: {
    titulo: 'Comunicação',
    texto: 'Histórico de e-mails e mensagens ao atleta entra com Comunicados (E05).',
  },
  historico: {
    titulo: 'Histórico',
    texto: 'Trilha de eventos da inscrição (alterações, check-in) chega com auditoria.',
  },
};

export function InscritosView({
  inscritos,
  loading,
  error,
  modalidades,
}: InscritosViewProps): JSX.Element {
  const [busca, setBusca] = React.useState('');
  const [status, setStatus] = React.useState<StatusInscrito | null>(null);
  const [kit, setKit] = React.useState<KitInscrito | null>(null);
  const [modalidade, setModalidade] = React.useState<string | null>(null);
  const [pagina, setPagina] = React.useState(1);
  const [selecionado, setSelecionado] = React.useState<Inscrito | null>(null);

  const filtrados = React.useMemo(
    () => filtrarInscritos(inscritos, { busca, status, kit, modalidade }),
    [inscritos, busca, status, kit, modalidade],
  );

  // Qualquer mudança de filtro volta para a página 1 (contador coerente).
  React.useEffect(() => {
    setPagina(1);
  }, [busca, status, kit, modalidade]);

  const pageItems = paginar(filtrados, pagina, INSCRITOS_PAGE_SIZE);

  const columns: TableColumn<Inscrito>[] = [
    { key: 'atletaNome', header: 'Atleta' },
    { key: 'modalidade', header: 'Modalidade', render: (r) => r.modalidade || '—' },
    {
      key: 'kit',
      header: 'Kit',
      render: (r) => {
        const b = kitInscritoBadge(r.kit);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: 'chipNumero',
      header: 'Chip',
      render: (r) => (
        <span className={r.chipNumero ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}>
          {r.chipNumero ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const b = statusInscritoBadge(r.status);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
  ];

  const geral = loading ? (
    <div className="flex flex-col gap-[var(--spacing-2)]" role="status" aria-label="Carregando inscritos">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rect" className="h-[var(--table-row-height)]" />
      ))}
    </div>
  ) : error ? (
    <p className="text-[var(--text-danger)]">Não foi possível carregar os inscritos.</p>
  ) : (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      {/* Busca + contador */}
      <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
        <Input
          type="search"
          aria-label="Buscar atleta"
          placeholder="Buscar atleta pelo nome"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          wrapperClassName="w-[var(--sidebar-width)] max-w-full"
        />
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]" role="status">
          {contadorInscritos(filtrados.length, inscritos.length)}
        </span>
      </div>

      {/* Filtros por chip */}
      <div className="flex flex-col gap-[var(--spacing-2)]">
        <FiltroLinha rotulo="Status">
          <Chip active={status === null} onClick={() => setStatus(null)}>
            Todos
          </Chip>
          {STATUS_INSCRITO.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {statusInscritoBadge(s).label}
            </Chip>
          ))}
        </FiltroLinha>
        <FiltroLinha rotulo="Kit">
          <Chip active={kit === null} onClick={() => setKit(null)}>
            Todos
          </Chip>
          {KITS_INSCRITO.map((k) => (
            <Chip key={k} active={kit === k} onClick={() => setKit(k)}>
              {kitInscritoBadge(k).label}
            </Chip>
          ))}
        </FiltroLinha>
        {modalidades.length > 0 && (
          <FiltroLinha rotulo="Modalidade">
            <Chip active={modalidade === null} onClick={() => setModalidade(null)}>
              Todas
            </Chip>
            {modalidades.map((m) => (
              <Chip key={m} active={modalidade === m} onClick={() => setModalidade(m)}>
                {m}
              </Chip>
            ))}
          </FiltroLinha>
        )}
      </div>

      {/* Tabela densa */}
      <Table
        columns={columns}
        data={pageItems}
        keyExtractor={(r) => r.id}
        caption="Inscritos do evento"
        emptyTitle="Nenhum inscrito encontrado"
        emptyDescription="Ajuste a busca ou os filtros para ver resultados."
        renderActions={(r) => (
          <button
            type="button"
            onClick={() => setSelecionado(r)}
            aria-label={`Ver detalhe de ${r.atletaNome}`}
            className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-brand)] hover:underline"
          >
            Detalhe
          </button>
        )}
      />

      {filtrados.length > INSCRITOS_PAGE_SIZE && (
        <Pagination
          total={filtrados.length}
          page={pagina}
          pageSize={INSCRITOS_PAGE_SIZE}
          onPageChange={setPagina}
        />
      )}
    </div>
  );

  const tabs = [
    { id: 'geral', label: 'Geral', content: geral },
    ...(['pagamento', 'comunicacao', 'historico'] as const).map((id) => ({
      id,
      label: TAB_PLACEHOLDER[id]!.titulo,
      content: (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          {TAB_PLACEHOLDER[id]!.texto}
        </p>
      ),
    })),
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <Tabs tabs={tabs} aria-label="Seções de inscritos" />
      <InscritoSlideIn inscrito={selecionado} onClose={() => setSelecionado(null)} />
    </div>
  );
}

function FiltroLinha({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
      <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)] w-[var(--spacing-12)]">
        {rotulo}
      </span>
      {children}
    </div>
  );
}

InscritosView.displayName = 'InscritosView';
