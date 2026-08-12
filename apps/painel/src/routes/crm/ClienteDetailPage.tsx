// =============================================================================
// ClienteDetailPage — detalhe de UM cliente (`/crm/:clienteKey`, E19 ·
// S-R9-13 · RN-172). 1 point read: o histórico cross-evento já vem consolidado
// no doc (mapa `eventos`). Exibe SÓ o dado mínimo do doc (nome, gênero,
// aniversário, idade AO VIVO derivada do nascimento — nunca congelada) + LTV/
// valor gasto/nº de eventos e o histórico por evento. Sem CPF/e-mail/telefone.
// =============================================================================

import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  KpiCard,
  PageHeader,
  Skeleton,
  Table,
  type TableColumn,
} from '@leela/design-system';
import type { CrmEventoResumo } from '@leela/core';
import { useTenantSession } from '../../lib/session/tenantSession';
import { useCrmClienteDetalhe } from './_data/clientes';
import { aniversarioLabel, formatBRL, formatInt, generoLabel, idadeAoVivo } from './_lib/format';

interface LinhaEvento extends CrmEventoResumo {
  eventoId: string;
}

const COLUNAS_EVENTO: TableColumn<LinhaEvento>[] = [
  { key: 'nome', header: 'Evento', render: (e) => e.nome },
  { key: 'qtdInscricoes', header: 'Inscrições', align: 'right', render: (e) => formatInt(e.qtdInscricoes) },
  {
    key: 'qtdEstornadas',
    header: 'Estornadas',
    align: 'right',
    render: (e) =>
      e.qtdEstornadas > 0 ? (
        <span className="text-[var(--text-secondary)]">{formatInt(e.qtdEstornadas)}</span>
      ) : (
        <span className="text-[var(--text-tertiary)]">—</span>
      ),
  },
  { key: 'valorPago', header: 'Valor confirmado', align: 'right', render: (e) => formatBRL(e.valorPago) },
];

export function ClienteDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { clienteKey } = useParams<{ clienteKey: string }>();
  const session = useTenantSession();
  const { cliente, naoEncontrado, loading, error } = useCrmClienteDetalhe(
    session.tenantId,
    clienteKey,
  );

  const voltar = (
    <Button variant="secondary" onClick={() => navigate('/crm/clientes')}>
      Voltar para Clientes
    </Button>
  );

  const semTenant = session.status === 'authenticated' && session.tenantId === null;

  const linhasEvento: LinhaEvento[] =
    cliente !== null
      ? Object.entries(cliente.eventos)
          .map(([eventoId, resumo]) => ({ eventoId, ...resumo }))
          .sort((a, b) => b.valorPago - a.valorPago)
      : [];

  const idade = cliente !== null ? idadeAoVivo(cliente.nascimento) : null;

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title={cliente?.nome && cliente.nome.trim() !== '' ? cliente.nome : 'Cliente'}
        subtitle="Histórico consolidado cross-evento — só o dado mínimo do CRM."
        actions={voltar}
      />
      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        {semTenant ? (
          <EmptyState
            title="Sessão sem organizador"
            description="Não foi possível identificar seu tenant. Recarregue a página ou entre novamente."
          />
        ) : loading || session.status === 'loading' ? (
          <div role="status" aria-label="Carregando cliente" className="flex flex-col gap-[var(--spacing-4)]">
            <Skeleton variant="rect" className="h-24" />
            <Skeleton variant="rect" className="h-48" />
          </div>
        ) : error !== null ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            Não foi possível carregar este cliente. Tente novamente.
          </div>
        ) : naoEncontrado || cliente === null ? (
          <EmptyState
            title="Cliente não encontrado"
            description="Este cliente não existe mais no CRM — pode ter sido expurgado (exclusão de conta) ou o link está desatualizado."
          />
        ) : (
          <>
            <section
              aria-label="Dados do cliente"
              className="flex flex-wrap gap-[var(--spacing-6)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]"
            >
              <Campo rotulo="Gênero" valor={generoLabel(cliente.genero)} />
              <Campo rotulo="Idade" valor={idade !== null ? `${idade} anos` : '—'} />
              <Campo rotulo="Aniversário" valor={aniversarioLabel(cliente.aniversario)} />
            </section>

            <section
              aria-label="Indicadores do cliente"
              className="grid grid-cols-2 gap-[var(--spacing-4)] md:grid-cols-4"
            >
              <KpiCard label="LTV" value={formatBRL(cliente.ltv)} hint="receita atribuível confirmada" />
              <KpiCard label="Valor gasto" value={formatBRL(cliente.valorGasto)} hint="inclui o Serviço repassado" />
              <KpiCard label="Eventos" value={formatInt(cliente.qtdEventos)} />
              <KpiCard label="Inscrições" value={formatInt(cliente.qtdInscricoes)} />
            </section>

            <section aria-label="Histórico por evento" className="flex flex-col gap-[var(--spacing-3)]">
              <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                Histórico por evento
              </h2>
              {linhasEvento.length > 0 ? (
                <Table
                  columns={COLUNAS_EVENTO}
                  data={linhasEvento}
                  keyExtractor={(e) => e.eventoId}
                  caption={`Histórico de ${cliente.nome}`}
                />
              ) : (
                <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                  Sem eventos confirmados no histórico.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <span className="text-[length:var(--font-size-xs)] uppercase tracking-wide text-[var(--text-tertiary)]">
        {rotulo}
      </span>
      <span className="text-[length:var(--font-size-md)] text-[var(--text-primary)]">{valor}</span>
    </div>
  );
}

ClienteDetailPage.displayName = 'ClienteDetailPage';
