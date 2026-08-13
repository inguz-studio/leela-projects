// =============================================================================
// FinanceiroTab — a aba `/plataforma/tenants/:tenantId/financeiro`
// (ADMIN-VISAO onda 2 · S1613-T4). Presentational: estado async por prop,
// nenhuma leitura aqui.
//
// A DECISÃO DO DONO (V-1 · ADMINVISAO-1), na íntegra: "faturamento gerado é
// para a leela, já que ficamos como que sobra do TPV menos custos operacionais
// e repasses dos organizadores."
//
// E a consequência que esta tela não pode esconder: CUSTO OPERACIONAL NÃO
// EXISTE EM CÓDIGO. `custoGateway`, `custoReal` e `receitaPlataforma` têm zero
// ocorrências no repositório — são da S1610, que está especificada e não foi
// construída. Sem essa parcela, o número que o dono nomeou não é computável.
//
// Então a tela mostra O QUE EXISTE, com o rótulo exato do que é, e NUNCA um
// número que finja ser o total:
//   · TPV — `rollup.gmv`, o valor de face confirmado. É o que entrou.
//   · Serviço acumulado — `rollup.receitaLeela`, a taxa da Leela sobre esse
//     GMV, na taxa do termo vigente do tenant. NÃO é faturamento: faturamento
//     ainda desconta custo e repasse.
//   · Custos operacionais — `EmBreveV3`, com a fonte que falta nomeada.
//   · Faturamento gerado — `EmBreveV3`, e esta é a escolha que mais importa:
//     exibir TPV ou Serviço sob esse rótulo seria um número fingindo ser o
//     total, que é exatamente o que a RN-537 e a RN-455 proíbem.
//
// RN-538 · a idade é parte do número. `platform/rollups` é um retrato; ao lado
// das cifras aparecem a data do retrato e, quando ele passa do limiar
// (`rollupObsoleto`), o aviso de que está velho.
//
// DINHEIRO COM CENTAVOS nesta aba inteira. O `formatBRL` de
// `plataforma/_lib/format` arredonda para inteiro e serve aos KPIs do macro;
// aqui a mesma tela mostra repasse, que é cent-exato por regra (RN-352), e
// duas precisões lado a lado leem como dois números diferentes da mesma coisa.
// =============================================================================

import type { ReactNode } from 'react';
import { Coins, Wallet } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  FormGrid,
  KpiCard,
  MetricGrid,
  PageHeader,
  Skeleton,
} from '@leela/design-system';
import type { TenantRollup, Timestamp } from '@leela/core';
import { EmBreveV3 } from '../../overview/_components/EmBreveV3';
import { formatBRL, formatDataHora } from '../../eventos/repasses/_lib/format';
import { LIMIAR_ROLLUP_OBSOLETO_HORAS, rollupObsoleto } from './_lib/economia';

export interface FinanceiroTabProps {
  /** Linha do tenant em `platform/rollups.tenants[tenantId]`. */
  rollup: TenantRollup | null;
  /** Carimbo do retrato macro (`platform/rollups.atualizadoEm`). */
  atualizadoEm: Timestamp | null;
  loading: boolean;
  error: Error | null;
  /** Relógio injetado — o limiar de frescor é testável sem timer falso. */
  agora: Date;
  /**
   * Bloco de saldo e repasses do tenant (S1613-T5). Entra por SLOT porque ele
   * tem escrita (aprovar/recusar/pagar) e modais próprios: espalhar doze props
   * de mutação por aqui tiraria desta casca a única coisa que ela é, que é
   * apresentacional.
   */
  repasses?: ReactNode;
  /**
   * Dispara o recompute do agregado na hora (RN-538, segunda metade). Ausente
   * = a tela mostra só a idade e o aviso, sem prometer ação que não existe.
   */
  onRecompute?: () => void;
  /** true enquanto o recompute roda (desabilita o botão). */
  recomputando?: boolean;
  /** Mensagem do último recompute que falhou; null quando não houve. */
  erroDoRecompute?: string | null;
}

export function FinanceiroTab({
  rollup,
  atualizadoEm,
  loading,
  error,
  agora,
  repasses,
  onRecompute,
  recomputando = false,
  erroDoRecompute = null,
}: FinanceiroTabProps): JSX.Element {
  const obsoleto = rollupObsoleto(atualizadoEm, agora);

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Financeiro"
        subtitle="O que este produtor movimentou na plataforma e o que a Leela ganhou com ele."
      />

      <div className="flex flex-col gap-[var(--spacing-6)] px-[var(--spacing-6)]">
        {error !== null ? (
          <Card role="alert" className="border-l-4 border-l-[var(--border-danger)]">
            <CardHeader>
              <CardTitle>Não foi possível carregar o retrato macro</CardTitle>
              <CardDescription>
                Os números desta aba vêm do agregado da plataforma e a leitura dele falhou.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : loading ? (
          <div
            role="status"
            aria-label="Carregando o retrato financeiro"
            className="flex flex-col gap-[var(--spacing-3)]"
          >
            <Skeleton variant="rect" className="h-40" />
          </div>
        ) : (
          <section
            aria-label="Movimento do tenant"
            className="flex flex-col gap-[var(--spacing-4)]"
          >
            <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
              <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                Retrato de {formatDataHora(atualizadoEm)}
              </p>
              {obsoleto ? <Badge variant="alerta">Retrato desatualizado</Badge> : null}
              {onRecompute ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={recomputando}
                  onClick={onRecompute}
                >
                  {recomputando ? 'Recalculando…' : 'Recalcular agora'}
                </Button>
              ) : null}
            </div>

            {erroDoRecompute ? (
              <p role="alert" className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
                {erroDoRecompute}
              </p>
            ) : null}

            {obsoleto ? (
              <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                O recompute do agregado roda no minuto 15 de cada hora. Este retrato passou de{' '}
                {LIMIAR_ROLLUP_OBSOLETO_HORAS} horas, então os números abaixo podem estar atrás
                das vendas de hoje.
              </p>
            ) : null}

            {rollup === null ? (
              <p className="text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
                Este tenant ainda não aparece no agregado da plataforma. Ele entra no próximo
                recompute; até lá, não há TPV nem serviço medido para mostrar.
              </p>
            ) : (
              <MetricGrid columns={2}>
                <KpiCard label="TPV" value={formatBRL(rollup.gmv)} hint="Valor de face confirmado" />
                <KpiCard
                  label="Serviço acumulado"
                  value={formatBRL(rollup.receitaLeela)}
                  hint="Taxa da Leela sobre o GMV confirmado, na taxa do termo vigente deste tenant"
                />
              </MetricGrid>
            )}
          </section>
        )}

        <FormGrid as="section" aria-label="O que ainda não tem fonte">
          <EmBreveV3
            titulo="Custos operacionais"
            causa="O custo do gateway por venda ainda não existe no sistema: platform/config.custoGateway e o carimbo do custo na venda nascem na S1610, que está especificada e não foi construída."
            icon={<Coins aria-hidden />}
          />
          <EmBreveV3
            titulo="Faturamento gerado"
            causa="Faturamento gerado é o TPV menos os custos operacionais menos os repasses dos organizadores. O custo operacional não tem fonte hoje, e mostrar o TPV ou o serviço com este rótulo seria um número fingindo ser o total."
            icon={<Wallet aria-hidden />}
          />
        </FormGrid>

        {repasses}
      </div>
    </div>
  );
}

FinanceiroTab.displayName = 'FinanceiroTab';
