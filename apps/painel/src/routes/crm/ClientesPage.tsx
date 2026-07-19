// =============================================================================
// ClientesPage — hub "Clientes & Comunicação" (`/crm`, E19 · S-R9-13 · RN-172).
// Visão única dos clientes do organizador (atletas que compraram em QUALQUER
// evento do tenant): lista densa paginada por cursor, busca por prefixo de
// nome, ordenação por LTV/valor/nº de eventos/nome. A linha leva ao detalhe.
//
// PII/LGPD (RN-172): leitura tenant-scoped (Rules só isTenantWriter); o doc é o
// DADO MÍNIMO (sem CPF/e-mail/telefone) — a tela exibe só o que o doc traz.
// Reconciliação com Comunicação (E06/E05): o hub é a superfície NOVA; a
// comunicação por evento/clube segue dona do próprio fluxo (nada refeito aqui).
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  SearchInput,
  PageHeader,
  Select,
  Skeleton,
  Table,
  type SelectOption,
  type TableColumn,
} from '@leela/design-system';
import type { CrmCliente, CrmClientesOrdem } from '@leela/api-client';
import { useCrmSession } from './_data/session';
import { useBuscaClientes, useCrmClientes } from './_data/clientes';
import { formatBRL, formatInt, generoLabel } from './_lib/format';

const ORDENS: SelectOption[] = [
  { value: 'ltv', label: 'Maior LTV' },
  { value: 'valorGasto', label: 'Maior valor gasto' },
  { value: 'qtdEventos', label: 'Mais eventos' },
  { value: 'nome', label: 'Nome (A→Z)' },
];

function colunas(): TableColumn<CrmCliente>[] {
  return [
    {
      key: 'nome',
      header: 'Cliente',
      render: (c) => (
        <div className="flex flex-col">
          <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {c.nome.trim() === '' ? 'Sem nome' : c.nome}
          </span>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {generoLabel(c.genero)}
          </span>
        </div>
      ),
    },
    { key: 'qtdEventos', header: 'Eventos', align: 'right', render: (c) => formatInt(c.qtdEventos) },
    { key: 'valorGasto', header: 'Valor gasto', align: 'right', render: (c) => formatBRL(c.valorGasto) },
    { key: 'ltv', header: 'LTV', align: 'right', render: (c) => formatBRL(c.ltv) },
  ];
}

export function ClientesPage(): JSX.Element {
  const navigate = useNavigate();
  const session = useCrmSession();
  const tenantId = session.tenantId;

  const [ordem, setOrdem] = useState<CrmClientesOrdem>('ltv');
  const [busca, setBusca] = useState('');
  const [buscaDebounce, setBuscaDebounce] = useState('');

  // Debounce da busca (300ms) — o reader tem teto próprio; evitamos disparar a
  // cada tecla sem varrer nada no cliente.
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounce(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const lista = useCrmClientes(tenantId, ordem);
  const pesquisa = useBuscaClientes(tenantId, buscaDebounce);

  const cols = useMemo(colunas, []);

  function abrirDetalhe(c: CrmCliente): void {
    navigate(`/crm/${encodeURIComponent(c.clienteKey)}`);
  }

  const semTenant = session.status === 'authenticated' && tenantId === null;

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Clientes & Comunicação"
        subtitle="Seus clientes cross-evento com LTV, valor gasto e histórico. A comunicação por evento e por clube segue nas próprias telas."
      />
      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        {semTenant ? (
          <EmptyState
            title="Sessão sem organizador"
            description="Não foi possível identificar seu tenant. Recarregue a página ou entre novamente."
          />
        ) : session.status === 'loading' ? (
          <div role="status" aria-label="Carregando clientes" className="flex flex-col gap-[var(--spacing-4)]">
            <Skeleton variant="rect" className="h-12" />
            <Skeleton variant="rect" className="h-48" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-[var(--spacing-4)]">
              <SearchInput
                id="crm-busca"
                aria-label="Buscar por nome"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Início do nome (ex.: Ana)"
                shortcutLabel={null}
                className="w-full max-w-md flex-1"
              />
              <Select
                id="crm-ordem"
                label="Ordenar por"
                options={ORDENS}
                value={ordem}
                onChange={(e) => setOrdem(e.target.value as CrmClientesOrdem)}
                disabled={pesquisa.ativa}
                wrapperClassName="w-full sm:w-56"
              />
            </div>

            {pesquisa.ativa ? (
              <ResultadoBusca
                buscando={pesquisa.buscando}
                error={pesquisa.error}
                resultados={pesquisa.resultados}
                colunas={cols}
                onRow={abrirDetalhe}
              />
            ) : (
              <ListaPaginada lista={lista} colunas={cols} onRow={abrirDetalhe} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultadoBusca({
  buscando,
  error,
  resultados,
  colunas,
  onRow,
}: {
  buscando: boolean;
  error: Error | null;
  resultados: CrmCliente[];
  colunas: TableColumn<CrmCliente>[];
  onRow: (c: CrmCliente) => void;
}): JSX.Element {
  if (error !== null) {
    return (
      <div
        role="alert"
        className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
      >
        Não foi possível buscar clientes. Tente novamente.
      </div>
    );
  }
  if (buscando) {
    return (
      <div role="status" aria-label="Buscando clientes">
        <Skeleton variant="rect" className="h-32" />
      </div>
    );
  }
  if (resultados.length === 0) {
    return (
      <EmptyState
        title="Nada encontrado"
        description="A busca casa pelo início do nome (diferencia maiúsculas). Ajuste o termo e tente de novo."
      />
    );
  }
  return (
    <Table
      columns={colunas}
      data={resultados}
      keyExtractor={(c) => c.clienteKey}
      caption="Clientes encontrados pela busca"
      onRowClick={onRow}
    />
  );
}

function ListaPaginada({
  lista,
  colunas,
  onRow,
}: {
  lista: ReturnType<typeof useCrmClientes>;
  colunas: TableColumn<CrmCliente>[];
  onRow: (c: CrmCliente) => void;
}): JSX.Element {
  if (lista.error !== null) {
    return (
      <div
        role="alert"
        className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
      >
        Não foi possível carregar os clientes.{' '}
        <button
          type="button"
          className="underline"
          onClick={lista.refetch}
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  if (lista.loading) {
    return (
      <div role="status" aria-label="Carregando clientes" className="flex flex-col gap-[var(--spacing-3)]">
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }
  if (lista.itens.length === 0) {
    return (
      <EmptyState
        title="Seu CRM ainda está vazio"
        description="Os clientes aparecem aqui conforme as inscrições são confirmadas nos seus eventos. Nada é inventado — a lista reflete só quem já comprou."
      />
    );
  }
  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <Table
        columns={colunas}
        data={lista.itens}
        keyExtractor={(c) => c.clienteKey}
        caption="Clientes do organizador"
        onRowClick={onRow}
      />
      {lista.temMais ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            disabled={lista.loadingMore}
            onClick={lista.carregarMais}
          >
            {lista.loadingMore ? 'Carregando…' : 'Carregar mais'}
          </Button>
        </div>
      ) : (
        <p className="text-center text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
          {lista.itens.length === 1 ? '1 cliente' : `${formatInt(lista.itens.length)} clientes`} · fim da lista
        </p>
      )}
    </div>
  );
}

ClientesPage.displayName = 'ClientesPage';
