// =============================================================================
// InfluenciadoresPage — `/clubes/influenciadores` (R9-E · S-R9-11-T8 ·
// RN-319, lado do ORGANIZADOR). Vendas/conversões de clube-influenciador e
// influenciador PF de TODOS os eventos do tenant, na aba Clubs. Dados via
// reader server-side (getAfiliadosDoTenant — escopo da claim, nunca do input).
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  KpiCard,
  PageHeader,
  Skeleton,
  Table,
} from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import { getAfiliadosDoTenant, type AfiliadoDoTenant } from '@leela/api-client';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function badgeDoStatus(status: string): JSX.Element {
  if (status === 'ativo') return <Badge variant="vitoria">Ativo</Badge>;
  if (status === 'convite_pendente') return <Badge variant="heroico">Convite pendente</Badge>;
  return <Badge variant="neutro">Inativo</Badge>;
}

export function InfluenciadoresPage(): JSX.Element {
  const navigate = useNavigate();
  const [afiliados, setAfiliados] = useState<AfiliadoDoTenant[] | null>(null);
  const [erro, setErro] = useState<Error | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let vivo = true;
    getAfiliadosDoTenant()
      .then((r) => {
        if (vivo) setAfiliados(r.afiliados);
      })
      .catch((e) => {
        if (vivo) setErro(e instanceof Error ? e : new Error('falha'));
      });
    return () => {
      vivo = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const lista = afiliados ?? [];
    const q = busca.trim().toLowerCase();
    if (q === '') return lista;
    return lista.filter(
      (a) =>
        a.nome.toLowerCase().includes(q) ||
        a.refCodigo.toLowerCase().includes(q) ||
        a.eventoNome.toLowerCase().includes(q),
    );
  }, [afiliados, busca]);

  const kpis = useMemo(() => {
    const lista = afiliados ?? [];
    return {
      afiliados: lista.length,
      inscricoes: lista.reduce((acc, a) => acc + a.conversoes, 0),
      valor: lista.reduce((acc, a) => acc + a.valorAtribuido, 0),
    };
  }, [afiliados]);

  const colunas: TableColumn<AfiliadoDoTenant>[] = [
    {
      key: 'afiliado',
      header: 'Influenciador',
      render: (a) => (
        <div className="flex flex-col">
          <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">{a.nome}</span>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {a.tipo === 'clube' ? 'Clube' : 'Pessoa física'} · <code>{a.refCodigo}</code>
          </span>
        </div>
      ),
    },
    { key: 'evento', header: 'Evento', render: (a) => a.eventoNome },
    { key: 'status', header: 'Status', render: (a) => badgeDoStatus(a.status) },
    {
      key: 'inscricoes',
      header: 'Inscrições',
      render: (a) =>
        `${a.conversoes.toLocaleString('pt-BR')}${a.minimoInscricoes !== null ? ` / mín. ${a.minimoInscricoes}` : ''}`,
    },
    { key: 'valor', header: 'Valor atribuído', render: (a) => formatBRL(a.valorAtribuido) },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Influenciadores"
        subtitle="Conversões de clubes-influenciadores e pessoas físicas por evento"
        actions={
          <Button variant="secondary" onClick={() => navigate('/clubes')}>
            Voltar para Clubes
          </Button>
        }
      />
      <div className="flex flex-col gap-[var(--spacing-6)] px-[var(--spacing-6)]">
        {afiliados === null && erro === null ? (
          <div role="status" aria-label="Carregando influenciadores" className="flex flex-col gap-[var(--spacing-4)]">
            <Skeleton variant="rect" className="h-24" />
            <Skeleton variant="rect" className="h-48" />
          </div>
        ) : erro !== null ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            Não foi possível carregar os influenciadores. Tente novamente.
          </div>
        ) : (afiliados ?? []).length === 0 ? (
          <EmptyState
            title="Nenhum influenciador ainda"
            description="Crie afiliados na aba Afiliados de um evento — clubes e pessoas físicas aparecem aqui com as conversões."
          />
        ) : (
          <>
            <section
              aria-label="Indicadores de influenciadores"
              className="grid grid-cols-1 gap-[var(--spacing-4)] md:grid-cols-3"
            >
              <KpiCard label="Afiliados" value={String(kpis.afiliados)} />
              <KpiCard label="Inscrições atribuídas" value={kpis.inscricoes.toLocaleString('pt-BR')} />
              <KpiCard label="Valor atribuído (bruto)" value={formatBRL(kpis.valor)} hint="informativo — sem comissão nesta fase" />
            </section>

            <Input
              type="search"
              aria-label="Buscar influenciador"
              placeholder="Buscar por nome, código ou evento"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              wrapperClassName="max-w-md"
            />
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
              mostrando {filtrados.length} de {(afiliados ?? []).length}
            </span>

            {filtrados.length === 0 ? (
              <EmptyState title="Nada encontrado" description="Nenhum influenciador casa com a busca." />
            ) : (
              <Table
                columns={colunas}
                data={filtrados}
                keyExtractor={(a) => `${a.eventoId}:${a.refCodigo}`}
                caption="Influenciadores do tenant"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

InfluenciadoresPage.displayName = 'InfluenciadoresPage';
