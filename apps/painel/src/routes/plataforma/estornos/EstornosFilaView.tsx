// =============================================================================
// EstornosFilaView — fila cross-tenant de estornos do platform_admin (T4).
//
// Presentational: recebe estado async + callbacks, decide nada. Tabela densa
// com tenant, evento, inscrito, estado, valor e ORIGEM — a coluna de origem é o
// ponto da tela: mostra se quem abriu foi o organizador ou a própria plataforma,
// e marca em vermelho o que entrou furando o corte de véspera (RN-376). Sem essa
// coluna a fila mentiria por omissão sobre de quem foi a mão.
//
// Skeleton no load, bloco de erro com "Tentar novamente" (§2.12) e EmptyState
// honesto quando não há pendência — nunca zero ambíguo.
// =============================================================================

import { Badge, Button, EmptyState, PageHeader, Skeleton, Table } from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import { formatBRL, formatData } from '../../eventos/repasses/_lib/format';
import {
  TETO_EVENTOS_POR_TENANT_FILA_ADMIN,
  TETO_TENANTS_FILA_ADMIN,
  type EstornoFilaItem,
  type FilaEstornosAdmin,
} from '../../../lib/query/queries';

export interface EstornosFilaViewProps {
  fila: FilaEstornosAdmin;
  loading: boolean;
  error: Error | null;
  running: boolean;
  onRetry: () => void;
  onAprovar: (item: EstornoFilaItem) => void;
  onRecusar: (item: EstornoFilaItem) => void;
}

/**
 * O que esta fila NÃO está mostrando, em frases de operador (item 52 · E-2).
 *
 * Uma fila de dinheiro que corta em silêncio é pior que uma fila curta: o admin
 * lê "nada pendente" e vai embora. As três frases cobrem as três formas de
 * omissão que a leitura tem hoje — ramo que falhou, teto de produtores e teto
 * de eventos por produtor. Vazio = a lista é completa dentro dos tetos. @pure
 */
export function avisosDaFila(fila: FilaEstornosAdmin): string[] {
  const avisos: string[] = [];
  if (fila.ramosComFalha > 0) {
    avisos.push(
      fila.ramosComFalha === 1
        ? 'Uma leitura falhou: há pedido que não entrou nesta lista. Tente novamente para completar a fila.'
        : `${fila.ramosComFalha} leituras falharam: há pedidos que não entraram nesta lista. Tente novamente para completar a fila.`,
    );
  }
  if (fila.tenantsNoTeto) {
    avisos.push(
      `Mostrando os ${TETO_TENANTS_FILA_ADMIN} produtores mais recentes. Um estorno de produtor mais antigo não aparece aqui.`,
    );
  }
  if (fila.tenantsComEventosNoTeto.length > 0) {
    avisos.push(
      `Mostrando até ${TETO_EVENTOS_POR_TENANT_FILA_ADMIN} eventos por produtor: ` +
        `${fila.tenantsComEventosNoTeto.join(', ')} tem mais eventos que isso, e um estorno deles pode estar de fora.`,
    );
  }
  return avisos;
}

/**
 * Rótulo e tom do estado na fila. `aprovado`/`aprovado_auto` que ainda aparecem
 * aqui são os que ficaram AGUARDANDO O GATEWAY (RN-372) — dizer "aprovado" e
 * parar seria esconder que o dinheiro não voltou. @pure
 */
export function rotuloEstadoFila(item: EstornoFilaItem): {
  texto: string;
  variant: 'alerta' | 'heroico';
} {
  if (item.reembolso.estado === 'em_analise') {
    return { texto: 'Em análise', variant: 'alerta' };
  }
  return { texto: 'Aguardando o gateway', variant: 'heroico' };
}

/** Quem abriu, e se furou o corte de véspera. Tipado de ponta a ponta: o core
 *  conhece `origem: 'plataforma'` e `overrideCorte` (RN-376) — nada de cast. @pure */
export function rotuloOrigem(item: EstornoFilaItem): { texto: string; furou: boolean } {
  const furou = item.reembolso.overrideCorte === true;
  const texto =
    item.reembolso.origem === 'plataforma'
      ? 'Plataforma'
      : item.reembolso.origem === 'atleta'
        ? 'Atleta'
        : 'Organizador';
  return { texto: furou ? `${texto} · furou a véspera` : texto, furou };
}

export function EstornosFilaView({
  fila,
  loading,
  error,
  running,
  onRetry,
  onAprovar,
  onRecusar,
}: EstornosFilaViewProps): JSX.Element {
  const itens = fila.itens;
  const avisos = avisosDaFila(fila);
  const columns: TableColumn<EstornoFilaItem>[] = [
    { key: 'tenantNome', header: 'Produtor', render: (r) => r.tenantNome },
    { key: 'eventoNome', header: 'Evento', render: (r) => r.eventoNome },
    { key: 'inscrito', header: 'Inscrito', render: (r) => r.reembolso.inscritoId },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => {
        const { texto, variant } = rotuloEstadoFila(r);
        return <Badge variant={variant}>{texto}</Badge>;
      },
    },
    {
      key: 'origem',
      header: 'Aberto por',
      render: (r) => {
        const { texto, furou } = rotuloOrigem(r);
        return <Badge variant={furou ? 'vulcao' : 'neutro'}>{texto}</Badge>;
      },
    },
    {
      key: 'valor',
      header: 'Valor',
      align: 'right',
      render: (r) => formatBRL(r.reembolso.valorSolicitado),
    },
    {
      key: 'criadoEm',
      header: 'Aberto em',
      render: (r) => formatData(r.reembolso.criadoEm),
    },
  ];

  return (
    <section className="flex flex-col gap-[var(--spacing-4)]">
      <PageHeader
        title="Estornos da plataforma"
        subtitle="Pedidos de reembolso de todos os produtores que ainda dependem de uma decisão, ou que já saíram para o gateway e não voltaram."
      />

      {/* Corte declarado (item 52 · E-2). Aparece ANTES da tabela e TAMBÉM com
          a lista vazia — "nenhum estorno pendente" enquanto a leitura cortou é
          exatamente a mentira por omissão que o item existe para matar. Fora do
          ramo de erro: aqui a fila carregou, só não carregou inteira. */}
      {!loading && !error && avisos.length > 0 && (
        <div
          role="status"
          className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-md)] border-[length:var(--input-border-width)] border-[var(--feedback-warning-fg)] bg-[var(--feedback-warning-surface)] p-[var(--spacing-3)]"
        >
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--feedback-warning-fg)]">
            Esta fila pode estar incompleta
          </span>
          {avisos.map((aviso) => (
            <span
              key={aviso}
              className="text-[length:var(--font-size-sm)] text-[var(--feedback-warning-fg)]"
            >
              {aviso}
            </span>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-[var(--spacing-2)]">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rect" className="h-16" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="flex flex-col items-start gap-[var(--spacing-3)] rounded-[var(--radius-md)] border border-[var(--border-danger)] p-[var(--spacing-4)]"
        >
          <span className="text-[var(--text-primary)]">
            Não foi possível carregar a fila de estornos.
          </span>
          <Button variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!loading && !error && itens.length === 0 && (
        <EmptyState
          title="Nenhum estorno pendente"
          description="Quando um produtor abrir um reembolso fora da janela, ou um estorno ficar preso no gateway, ele aparece aqui."
        />
      )}

      {!loading && !error && itens.length > 0 && (
        <Table
          columns={columns}
          data={itens}
          keyExtractor={(r) => `${r.eventoId}:${r.reembolso.inscritoId}`}
          caption="Fila de estornos de todos os produtores"
          renderActions={(r) =>
            r.reembolso.estado === 'em_analise' ? (
              <div className="flex gap-[var(--spacing-2)]">
                <Button size="sm" disabled={running} onClick={() => onAprovar(r)}>
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={running}
                  onClick={() => onRecusar(r)}
                >
                  Recusar
                </Button>
              </div>
            ) : (
              // Aguardando o gateway: NÃO oferecer botão. Reenviar é o estorno
              // duplo que a RN-371 existe para matar — quem fecha é o webhook.
              <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
                Fecha sozinho quando o gateway confirmar
              </span>
            )
          }
        />
      )}
    </section>
  );
}

EstornosFilaView.displayName = 'EstornosFilaView';
