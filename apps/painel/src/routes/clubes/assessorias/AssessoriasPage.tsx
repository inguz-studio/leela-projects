// =============================================================================
// AssessoriasPage (`/clubes/assessorias`) — gestão das assessorias parceiras
// (E18 · S1803). Lista densa com status/documento/condição + busca + EmptyState
// honesto; "Cadastrar assessoria" abre o form (S1800); encerrar = ConfirmModal
// §2.15 com disclaimer de retenção 90d (RN-144). A linha leva ao detalhe
// (condição de desconto — S1802).
//
// Leitura tenant-scoped (Rules: só papel de escrita do tenant lê CPF/CNPJ de
// terceiros — LGPD). Escrita SÓ por callable (encerrarParceriaAssessoria); o
// valor/estado é decisão do servidor (máquina RN-123).
// =============================================================================

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  ConfirmModal,
  EmptyState,
  SearchInput,
  Skeleton,
  Table,
  useToast,
  type TableColumn,
} from '@leela/design-system';
import { encerrarParceriaAssessoria } from '@leela/api-client';
import type { ParceriaAssessoria } from '@leela/core';
import { useTenantSession } from '../../../lib/session/tenantSession';
import { useParceriasAssessoria } from './_data/assessorias';
import { ClubesAreaNav } from '../_components/ClubesAreaNav';
import {
  formatarDocumentoValor,
  statusParceriaBadge,
} from './_lib/assessoriaForm';

/** Copy honesta para os códigos de erro do callable de encerramento. */
function mensagemErroEncerrar(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code.includes('permission-denied')) {
    return 'Você não tem permissão para encerrar esta parceria (apenas o organizador dono/staff de escrita).';
  }
  if (code.includes('not-found')) {
    return 'Parceria não encontrada — pode já ter sido removida.';
  }
  return 'Não foi possível encerrar a parceria. Tente novamente.';
}

export function AssessoriasPage(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();
  const session = useTenantSession();
  const { data: parcerias, loading, error, refetch } = useParceriasAssessoria(session.tenantId);

  const [busca, setBusca] = useState('');
  const [alvo, setAlvo] = useState<ParceriaAssessoria | null>(null);
  const [encerrando, setEncerrando] = useState(false);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (termo.length === 0) return parcerias;
    return parcerias.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        p.documento.valor.includes(termo.replace(/\D/g, '')) ||
        p.responsavelEmail.includes(termo)
    );
  }, [parcerias, busca]);

  async function confirmarEncerramento(): Promise<void> {
    if (!alvo) return;
    setEncerrando(true);
    try {
      const { statusAnterior } = await encerrarParceriaAssessoria({ parceriaId: alvo.id });
      toast({
        variant: 'success',
        title: statusAnterior === 'inativa' ? 'Parceria já estava encerrada' : 'Parceria encerrada',
      });
      setAlvo(null);
      refetch();
    } catch (err) {
      toast({ variant: 'danger', title: mensagemErroEncerrar(err) });
    } finally {
      setEncerrando(false);
    }
  }

  const colunas: TableColumn<ParceriaAssessoria>[] = [
    { key: 'nome', header: 'Assessoria', render: (p) => p.nome },
    {
      key: 'documento',
      header: 'CNPJ/CPF',
      render: (p) => (
        <span className="font-mono text-[length:var(--font-size-sm)]">
          {formatarDocumentoValor(p.documento.tipo, p.documento.valor)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const b = statusParceriaBadge(p.status);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: 'condicao',
      header: 'Condição',
      render: (p) =>
        p.condicaoDesconto
          ? `${p.condicaoDesconto.codigo} · ${
              p.condicaoDesconto.tipo === 'percentual'
                ? `${p.condicaoDesconto.valor}%`
                : `R$ ${p.condicaoDesconto.valor.toFixed(2)}`
            }`
          : '—',
    },
    { key: 'responsavel', header: 'Responsável', render: (p) => p.responsavelEmail },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[var(--spacing-6)] p-[var(--spacing-6)]">
      {/* D-1008-R9: menu secundário canônico da área de clubs. O px próprio do
          SubNav sai (px-0) porque esta página já carrega o padding do wrapper. */}
      <ClubesAreaNav ativa="assessorias" className="px-0" />
      <header className="flex flex-wrap items-start justify-between gap-[var(--spacing-3)]">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
            Assessorias parceiras
          </h1>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Clubs parceiros com condição de desconto exclusiva — sem comissão, sem split (E18).
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/clubes/assessorias/nova')}>
          Cadastrar assessoria
        </Button>
      </header>

      {session.status === 'authenticated' && session.tenantId === null ? (
        <EmptyState
          title="Sessão sem organizador"
          description="Não foi possível identificar seu tenant. Recarregue a página ou entre novamente."
        />
      ) : loading || session.status === 'loading' ? (
        <div className="flex flex-col gap-[var(--spacing-3)]" role="status" aria-label="Carregando parcerias">
          <Skeleton variant="rect" className="h-12" />
          <Skeleton variant="rect" className="h-40" />
        </div>
      ) : error ? (
        <EmptyState
          title="Não foi possível carregar as parcerias"
          description="Ocorreu um erro ao ler as assessorias parceiras."
          action={<Button variant="secondary" onClick={refetch}>Tentar novamente</Button>}
        />
      ) : parcerias.length === 0 ? (
        <EmptyState
          title="Nenhuma assessoria cadastrada"
          description="Cadastre uma assessoria como club parceiro para dar condição de desconto aos atletas dela."
          action={
            <Button variant="primary" onClick={() => navigate('/clubes/assessorias/nova')}>
              Cadastrar assessoria
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-[var(--spacing-4)]">
          <SearchInput
            id="assessorias-busca"
            aria-label="Buscar assessoria"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome, documento ou e-mail do responsável"
            shortcutLabel={null}
            className="w-full max-w-md"
          />
          {filtradas.length === 0 ? (
            <EmptyState title="Nenhum resultado" description="Nenhuma assessoria bate com a busca." />
          ) : (
            <Table
              columns={colunas}
              data={filtradas}
              keyExtractor={(p) => p.id}
              caption="Assessorias parceiras do organizador"
              onRowClick={(p) => navigate(`/clubes/assessorias/${p.id}`)}
              renderActions={(p) => (
                <div className="flex items-center gap-[var(--spacing-2)]">
                  <Button variant="ghost" onClick={() => navigate(`/clubes/assessorias/${p.id}`)}>
                    Detalhes
                  </Button>
                  {p.status !== 'inativa' ? (
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAlvo(p);
                      }}
                    >
                      Encerrar
                    </Button>
                  ) : null}
                </div>
              )}
            />
          )}
        </div>
      )}

      <ConfirmModal
        open={alvo !== null}
        onOpenChange={(o) => !o && setAlvo(null)}
        title="Encerrar parceria"
        description="Encerrar a parceria desativa a condição de desconto no checkout e invalida convites pendentes. O registro é retido por 90 dias (RN-144) e não pode ser reativado — recadastro é uma nova parceria."
        target={
          alvo ? (
            <div className="flex flex-col gap-[var(--spacing-1)]">
              <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                {alvo.nome}
              </span>
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                {formatarDocumentoValor(alvo.documento.tipo, alvo.documento.valor)}
              </span>
            </div>
          ) : undefined
        }
        loses={[
          'A condição de desconto exclusiva no checkout',
          'Convites de aceite ainda pendentes (o link deixa de valer)',
        ]}
        keeps={[
          'O histórico da parceria (retido 90 dias — RN-144)',
          'O clube parceiro em si (vira clube comum, sem desconto)',
        ]}
        confirmLabel="Encerrar parceria"
        loading={encerrando}
        onConfirm={() => void confirmarEncerramento()}
      />
    </div>
  );
}

AssessoriasPage.displayName = 'AssessoriasPage';
