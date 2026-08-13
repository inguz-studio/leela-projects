// =============================================================================
// RepassesDoTenant — bloco de saldo + histórico de repasses da aba Financeiro
// da ficha (ADMIN-VISAO onda 2 · S1613-T5). Presentational: estado async e
// callbacks por prop.
//
// RN-356 · "PAGO" É REGISTRO MANUAL. A máquina do repasse marca pago e gera
// comprovante numerado; o sistema NÃO faz transferência bancária. Quem lê a
// ficha de um produtor precisa saber disso na própria linha — senão "Pago"
// lido de longe vira "o dinheiro saiu", e não saiu.
//
// `dentroJanelaDN` VIRA EmBreve, e isso não é preguiça de tela. O tipo do core
// documenta que a Function grava 0 ali SEMPRE, porque a fonte por transação
// não existe (a derivação pura `computeDentroJanelaDN` está pronta e sem
// insumo — pendência do L2-T1). Um card "R$ 0,00" ali seria zero ambíguo: o
// operador leria "nenhum dinheiro em janela" quando a verdade é "ninguém
// mediu". Mesma disciplina do bloco de faturamento.
//
// DINHEIRO COM CENTAVOS — `eventos/repasses/_lib/format`. Repasse é cent-exato
// por regra (RN-352) e a aba inteira usa este formatador.
// =============================================================================

import { Timer } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  FormGrid,
  KpiCard,
  MetricGrid,
  Skeleton,
  Table,
  type TableColumn,
} from '@leela/design-system';
import type { Repasse, SaldoRepasse } from '@leela/core';
import { EmBreveV3 } from '../../../overview/_components/EmBreveV3';
import { badgeEstado } from '../../../eventos/repasses/_lib/estadoRepasse';
import { formatBRL, formatData } from '../../../eventos/repasses/_lib/format';
import { formatInt } from '../../_lib/format';

export interface RepassesDoTenantProps {
  saldo: SaldoRepasse | null;
  saldoLoading: boolean;
  saldoError: Error | null;
  repasses: Repasse[];
  repassesLoading: boolean;
  repassesError: Error | null;
  /** Mutation de repasse em andamento (desabilita as ações da linha). */
  running: boolean;
  onAprovar: (repasse: Repasse) => void;
  onRecusar: (repasse: Repasse) => void;
  onRegistrarPagamento: (repasse: Repasse) => void;
  onRetry: () => void;
}

/** A frase da RN-356, num lugar só. */
export const AVISO_PAGO_MANUAL =
  'Registro manual — o sistema não faz transferência bancária.';

function CardsDeSaldo({ saldo }: { saldo: SaldoRepasse }): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <MetricGrid columns={4}>
        <KpiCard label="Vendido bruto" value={formatBRL(saldo.vendidoBruto)} />
        <KpiCard
          label="Retido"
          value={formatBRL(saldo.retido)}
          hint="Liberado quando o evento encerra"
        />
        <KpiCard label="Disponível" value={formatBRL(saldo.disponivel)} />
        <KpiCard
          label="Comprometido"
          value={formatBRL(saldo.comprometido)}
          hint="Em repasses solicitados, aprovados ou pagos"
        />
      </MetricGrid>

      <FormGrid>
        <KpiCard
          label="Eventos sem termo comercial"
          value={formatInt(saldo.eventosSemTermo)}
          hint="Não entram em retido nem em disponível, e travam a solicitação"
          {...(saldo.eventosSemTermo > 0 ? { emphasis: 'critico' as const } : {})}
        />
        <EmBreveV3
          titulo="Dentro da janela D+N"
          causa="A Function grava zero neste campo sempre: a fonte por transação que a janela D+N exige não existe ainda (pendência do L2-T1). O cálculo puro já está pronto e esperando o insumo."
          icon={<Timer aria-hidden />}
        />
      </FormGrid>
    </div>
  );
}

export function RepassesDoTenant({
  saldo,
  saldoLoading,
  saldoError,
  repasses,
  repassesLoading,
  repassesError,
  running,
  onAprovar,
  onRecusar,
  onRegistrarPagamento,
  onRetry,
}: RepassesDoTenantProps): JSX.Element {
  const colunas: TableColumn<Repasse>[] = [
    {
      key: 'valor',
      header: 'Valor',
      align: 'right',
      render: (r) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatBRL(r.valor)}</span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => {
        const b = badgeEstado(r.estado);
        return (
          <div className="flex flex-col gap-[var(--spacing-1)]">
            <span>
              <Badge variant={b.variant}>{b.label}</Badge>
            </span>
            {r.estado === 'pago' ? (
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                {AVISO_PAGO_MANUAL}
              </span>
            ) : null}
          </div>
        );
      },
    },
    { key: 'criadoEm', header: 'Solicitado em', render: (r) => formatData(r.criadoEm) },
    {
      key: 'comprovante',
      header: 'Comprovante',
      render: (r) =>
        r.comprovanteNumero ? (
          <span className="[font-variant-numeric:tabular-nums]">{r.comprovanteNumero}</span>
        ) : (
          <span className="text-[var(--text-tertiary)]">—</span>
        ),
    },
  ];

  return (
    <section aria-label="Saldo e repasses" className="flex flex-col gap-[var(--spacing-5)]">
      <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        Saldo e repasses
      </h2>

      {saldoError !== null ? (
        <Card role="alert" className="border-l-4 border-l-[var(--border-danger)]">
          <CardHeader>
            <CardTitle>Não foi possível carregar o saldo</CardTitle>
            <CardDescription>
              O saldo é somado no servidor; sem ele, esta tela não estima nada.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : saldoLoading ? (
        <div role="status" aria-label="Carregando o saldo do tenant">
          <Skeleton variant="rect" className="h-32" />
        </div>
      ) : saldo === null ? (
        <p className="text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
          Nenhuma movimentação. O saldo nasce quando a primeira venda deste produtor é confirmada.
        </p>
      ) : (
        <CardsDeSaldo saldo={saldo} />
      )}

      {repassesError !== null ? (
        <Card role="alert" className="border-l-4 border-l-[var(--border-danger)]">
          <CardHeader>
            <CardTitle>Não foi possível carregar os repasses</CardTitle>
            <CardDescription>A leitura do histórico falhou.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          </CardFooter>
        </Card>
      ) : repassesLoading ? (
        <div role="status" aria-label="Carregando os repasses do tenant">
          <Skeleton variant="rect" className="h-40" />
        </div>
      ) : (
        <Table
          columns={colunas}
          data={repasses}
          keyExtractor={(r) => r.id}
          caption="Repasses deste tenant, do mais recente ao mais antigo"
          emptyTitle="Nenhum repasse solicitado"
          emptyDescription="Quando este produtor pedir um saque, a solicitação aparece aqui para aprovação e pagamento."
          renderActions={(r) => {
            if (r.estado === 'solicitado') {
              return (
                <div className="flex items-center justify-end gap-[var(--spacing-2)]">
                  <Button variant="ghost" size="sm" disabled={running} onClick={() => onRecusar(r)}>
                    Recusar
                  </Button>
                  <Button variant="primary" size="sm" disabled={running} onClick={() => onAprovar(r)}>
                    Aprovar
                  </Button>
                </div>
              );
            }
            if (r.estado === 'aprovado') {
              return (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={running}
                  onClick={() => onRegistrarPagamento(r)}
                >
                  Registrar pagamento
                </Button>
              );
            }
            return null;
          }}
        />
      )}
    </section>
  );
}

RepassesDoTenant.displayName = 'RepassesDoTenant';
