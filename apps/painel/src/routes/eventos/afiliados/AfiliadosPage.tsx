// =============================================================================
// AfiliadosPage — `/eventos/:slug/afiliados` (R9-E · S-R9-11-T4 · RN-314/317).
// Visão do ORGANIZADOR: lista de afiliados/influenciadores do evento com
// conversões e valor atribuído (BRUTO informativo — sem comissão nesta fase),
// busca/filtro por tipo, EmptyState, link copiável e config via MODAL.
// Dados via reader server-side (getAfiliadosDoTenant — RN-319).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  FilterChips,
  ResultCount,
  RowActions,
  SearchInput,
  Skeleton,
  Table,
  useToast,
} from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import {
  getAfiliadosDoTenant,
  salvarAfiliado,
  type AfiliadoDoTenant,
  type SalvarAfiliadoClientInput,
} from '@leela/api-client';
import { linkPromocional, MSG_SEM_LINK_PROMOCIONAL } from '../../../lib/linkPublico';
import { clubesDoTenantQuery } from '../../../lib/query/queries';
import { useTenantSession } from '../../../lib/session/tenantSession';
import type { EventoOutletContext } from '../evento/EventoLayout';
import { AfiliadoModal } from './AfiliadoModal';

type FiltroTipo = 'todos' | 'clube' | 'pessoa_fisica';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Termos de comissão configurados (FASE 2) em texto curto para a coluna. */
function descreverComissao(c: AfiliadoDoTenant['comissao']): string {
  if (c === null) return '—';
  if (c.tipo === 'percentual') {
    return `${(c.percentual ?? 0).toLocaleString('pt-BR')}%`;
  }
  return `${formatBRL(c.valorPorInscricao ?? 0)}/insc.`;
}

function statusBadge(status: string): { label: string; variant: 'vitoria' | 'heroico' | 'neutro' } {
  if (status === 'ativo') return { label: 'Ativo', variant: 'vitoria' };
  if (status === 'convite_pendente') return { label: 'Convite pendente', variant: 'heroico' };
  return { label: 'Inativo', variant: 'neutro' };
}

export function AfiliadosPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { toast } = useToast();
  const [afiliados, setAfiliados] = useState<AfiliadoDoTenant[] | null>(null);
  const [erro, setErro] = useState<Error | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<AfiliadoDoTenant | null>(null);

  // Onda C1 (conformidade-controles): clubes do tenant para o Combobox de
  // clube vinculado do AfiliadoModal — a mesma leitura que `EngajamentoView`
  // consome (`clubesDoTenantQuery`), tenant-scoped pela sessão, não pelo
  // evento (um clube não pertence a um evento).
  const tenantSession = useTenantSession();
  const clubesQuery = useQuery({
    ...clubesDoTenantQuery(tenantSession.tenantId ?? ''),
    enabled: tenantSession.status === 'authenticated' && !!tenantSession.tenantId,
  });
  const clubesDoTenant = clubesQuery.data
    ? clubesQuery.data.map((c) => ({ id: c.id, nome: c.nome }))
    : null;

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const r = await getAfiliadosDoTenant({ eventoId: evento.id });
      setAfiliados(r.afiliados);
    } catch (e) {
      setErro(e instanceof Error ? e : new Error('falha'));
    }
  }, [evento.id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const lista = afiliados ?? [];
    const q = busca.trim().toLowerCase();
    return lista.filter(
      (a) =>
        (filtroTipo === 'todos' || a.tipo === filtroTipo) &&
        (q === '' ||
          a.nome.toLowerCase().includes(q) ||
          a.refCodigo.toLowerCase().includes(q) ||
          (a.canal ?? '').toLowerCase().includes(q)),
    );
  }, [afiliados, busca, filtroTipo]);

  // S1215-T1 (RN-429): o link sai do gerador ÚNICO do core, com o cupom
  // vinculado dentro. Deixou de ser montado à mão aqui — três superfícies
  // montavam a mesma URL de três jeitos, e só uma delas levaria o cupom.
  function copiarLink(a: AfiliadoDoTenant): void {
    const link = linkPromocional(evento.slug, a.refCodigo, a.cupomCodigo);
    if (link === null) {
      toast({ variant: 'danger', title: 'Sem link', description: MSG_SEM_LINK_PROMOCIONAL });
      return;
    }
    void navigator.clipboard
      .writeText(link)
      .then(() => toast({ variant: 'success', title: 'Link copiado', description: link }))
      .catch(() => toast({ variant: 'danger', title: 'Não foi possível copiar' }));
  }

  async function salvar(input: SalvarAfiliadoClientInput) {
    const r = await salvarAfiliado(input);
    toast({
      variant: 'success',
      title: r.jaExistia ? 'Afiliado atualizado' : 'Afiliado criado',
      ...(r.conviteEnviado === true
        ? { description: 'Convite enviado por e-mail.' }
        : {}),
    });
    void carregar();
    return r;
  }

  const colunas: TableColumn<AfiliadoDoTenant>[] = [
    {
      key: 'nome',
      header: 'Afiliado',
      render: (a) => (
        <div className="flex flex-col">
          <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">{a.nome}</span>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {a.tipo === 'clube' ? 'Clube' : 'Pessoa física'}
            {a.canal ? ` · ${a.canal}` : ''}
          </span>
        </div>
      ),
    },
    { key: 'ref', header: 'Código', render: (a) => <code>{a.refCodigo}</code> },
    {
      key: 'status',
      header: 'Status',
      render: (a) => {
        const b = statusBadge(a.status);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: 'conversoes',
      header: 'Inscrições atribuídas',
      render: (a) => (
        <span>
          {a.conversoes.toLocaleString('pt-BR')}
          {a.minimoInscricoes !== null ? (
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              {' '}/ mín. {a.minimoInscricoes}
            </span>
          ) : null}
        </span>
      ),
    },
    { key: 'valor', header: 'Valor atribuído', render: (a) => formatBRL(a.valorAtribuido) },
    { key: 'comissao', header: 'Comissão', render: (a) => descreverComissao(a.comissao) },
    { key: 'cupom', header: 'Cupom', render: (a) => a.cupomCodigo ?? '—' },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-6)] p-[var(--spacing-6)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-4)]">
        <div>
          <h1 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
            Afiliados e influenciadores
          </h1>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            Links rastreáveis com atribuição por janela e comissão opcional.
            Saldo e repasses ficam na aba Clubs (Influenciadores).
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEmEdicao(null);
            setModalAberto(true);
          }}
        >
          + Novo influenciador
        </Button>
      </div>

      {afiliados === null && erro === null ? (
        <div role="status" aria-label="Carregando afiliados" className="flex flex-col gap-[var(--spacing-3)]">
          <Skeleton variant="rect" className="h-10 max-w-md" />
          <Skeleton variant="rect" className="h-48" />
        </div>
      ) : erro !== null ? (
        <div
          role="alert"
          className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
        >
          Não foi possível carregar os afiliados. Tente novamente.
        </div>
      ) : (afiliados ?? []).length === 0 ? (
        <EmptyState
          title="Nenhum afiliado ainda"
          description="Crie um link rastreável para um influenciador ou clube divulgar este evento."
          action={
            <Button variant="primary" onClick={() => setModalAberto(true)}>
              Criar primeiro afiliado
            </Button>
          }
        />
      ) : (
        <>
          <FilterBar
            label="afiliados"
            search={
              <SearchInput
                aria-label="Buscar afiliado"
                placeholder="Buscar por nome, código ou canal"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                shortcutLabel={null}
              />
            }
            facets={
              <FilterChips
                label="Tipo"
                options={[
                  { id: 'clube', label: 'Clubes' },
                  { id: 'pessoa_fisica', label: 'Pessoas físicas' },
                ]}
                selected={filtroTipo === 'todos' ? [] : [filtroTipo]}
                onChange={(next) => setFiltroTipo((next[0] as FiltroTipo) ?? 'todos')}
              />
            }
            count={
              <ResultCount
                visiveis={filtrados.length}
                total={(afiliados ?? []).length}
                substantivo={{ singular: 'afiliado', plural: 'afiliados' }}
              />
            }
          />

          {filtrados.length === 0 ? (
            <EmptyState
              title="Nenhum afiliado encontrado"
              description="Nenhum afiliado casa com a busca/filtro atual."
            />
          ) : (
            <Table
              columns={colunas}
              data={filtrados}
              keyExtractor={(a) => a.refCodigo}
              caption="Afiliados do evento"
              // Ícone, não escrito (decisão do dono de 17/08). O rótulo nomeia
              // o AFILIADO da linha: numa lista de links rastreáveis, "Copiar
              // link" sem dono é o erro que faz o organizador mandar o link do
              // influenciador errado.
              renderActions={(a) => (
                <RowActions
                  actions={[
                    {
                      id: 'copiar',
                      label: `Copiar link de ${a.nome}`,
                      verbo: 'copiar',
                      onClick: () => copiarLink(a),
                    },
                    {
                      id: 'editar',
                      label: `Editar afiliado ${a.nome}`,
                      verbo: 'editar',
                      onClick: () => {
                        setEmEdicao(a);
                        setModalAberto(true);
                      },
                    },
                  ]}
                />
              )}
            />
          )}
        </>
      )}

      <AfiliadoModal
        key={emEdicao?.refCodigo ?? 'novo'}
        open={modalAberto}
        onOpenChange={setModalAberto}
        eventoId={evento.id}
        afiliado={emEdicao}
        onSalvar={salvar}
        clubes={clubesDoTenant}
      />
    </div>
  );
}

AfiliadosPage.displayName = 'AfiliadosPage';
