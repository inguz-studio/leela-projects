// =============================================================================
// VendasTab — a aba `/plataforma/tenants/:tenantId/vendas` (ADMIN-VISAO onda 2
// · S1613-T2). Presentational: estado async e callbacks entram por prop,
// nenhuma leitura acontece aqui.
//
// NÃO REUSA A CASCA `ListaGlobal`, e a razão é o que a casca exige: ela nasceu
// com um slot de RECORTE (`role="toolbar"`) porque as listas globais filtram
// por tenant e por status. Vendas não tem recorte — a ficha já É o recorte — e
// uma toolbar vazia é um controle anunciado ao leitor de tela que não existe.
// O que a casca traz de regra, esse sim é reusado: `rotuloContagem`, o mesmo
// contrato `ListaGlobalState` e a mesma composição sobre o DS.
//
// A RÉGUA FICA NA TELA. A onda 4 deixou dinheiro fora da lista global de
// eventos de propósito, "porque lá não havia régua ao lado". Aqui há: a linha
// abaixo do cabeçalho diz de onde as duas cifras saem, e é essa frase que
// autoriza a coluna de dinheiro nesta superfície.
//
// DINHEIRO COM CENTAVOS. Esta tela usa UM formatador só — o de
// `eventos/repasses/_lib/format`, cent-exato. O `formatBRL` de
// `plataforma/_lib/format` arredonda para inteiro, o que serve a KPI de GMV e
// mentiria numa linha de venda de R$ 85,50.
// =============================================================================

import { useMemo } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  EmptyState,
  PageHeader,
  ResultCount,
  Skeleton,
  Table,
  type TableColumn,
} from '@leela/design-system';
import { formatarCodigoPedido } from '@leela/core';
import { formatBRL, formatDataHora } from '../../eventos/repasses/_lib/format';
import {
  FORMA_PAGAMENTO_LABEL,
  SUBSTANTIVO_VENDAS,
  liquidoDoProdutor,
  rotuloEconomiaAusente,
  rotuloParcelas,
  servicoDaVenda,
} from './_lib/economia';
import type { ListaGlobalState } from '../_data/listasGlobais';
import type { VendaDoTenant } from './_data/vendas';

export interface VendasTabProps {
  estado: ListaGlobalState<VendaDoTenant>;
}

/** Célula de cifra: número quando há carimbo, rótulo da causa quando não há. */
function CifraDoCarimbo({
  valor,
  ausente,
}: {
  valor: number | null;
  ausente: string;
}): JSX.Element {
  if (valor === null) {
    return (
      <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
        {ausente}
      </span>
    );
  }
  return <span className="[font-variant-numeric:tabular-nums]">{formatBRL(valor)}</span>;
}

export function VendasTab({ estado }: VendasTabProps): JSX.Element {
  const colunas = useMemo<TableColumn<VendaDoTenant>[]>(
    () => [
      {
        key: 'codigo',
        header: 'Pedido',
        render: (v) => {
          // RN-475: código ausente é AUSÊNCIA. O id do doc nunca ocupa o lugar
          // dele — compra anterior à S1228 ganha código por backfill.
          const codigo = formatarCodigoPedido(v.pedido?.codigoPedido);
          return codigo === '' ? (
            <span className="text-[var(--text-tertiary)]">—</span>
          ) : (
            <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
              {codigo}
            </span>
          );
        },
      },
      { key: 'data', header: 'Data', render: (v) => formatDataHora(v.pagamento.criadoEm) },
      {
        key: 'responsavel',
        header: 'Responsável',
        render: (v) =>
          v.pedido ? (
            v.pedido.responsavel.nome
          ) : (
            <span className="text-[var(--text-tertiary)]">—</span>
          ),
      },
      {
        key: 'forma',
        header: 'Forma',
        render: (v) => FORMA_PAGAMENTO_LABEL[v.pagamento.forma],
      },
      { key: 'parcelas', header: 'Parcelas', render: (v) => rotuloParcelas(v.pagamento) },
      {
        key: 'valorFinal',
        header: 'Valor final',
        align: 'right',
        render: (v) => (
          <span className="[font-variant-numeric:tabular-nums]">
            {formatBRL(v.pagamento.valorFinal)}
          </span>
        ),
      },
      {
        // "Serviço" é o nome da taxa da Leela em toda superfície (SERV-3).
        key: 'servico',
        header: 'Serviço',
        align: 'right',
        render: (v) => (
          <CifraDoCarimbo
            valor={servicoDaVenda(v.pagamento)}
            ausente={rotuloEconomiaAusente(v.pagamento.status)}
          />
        ),
      },
      {
        key: 'liquido',
        header: 'Líquido do produtor',
        align: 'right',
        render: (v) => (
          <CifraDoCarimbo
            valor={liquidoDoProdutor(v.pagamento)}
            ausente={rotuloEconomiaAusente(v.pagamento.status)}
          />
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Vendas"
        subtitle="Cada linha é uma cobrança. Um pedido de grupo é uma linha e vários inscritos."
      />

      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Serviço e líquido do produtor vêm do carimbo da conciliação, gravado na confirmação da
          venda. Em evento com taxa repassada ao comprador, o líquido é o valor de face cheio.
        </p>

        {estado.error !== null ? (
          <Card role="alert" className="border-l-4 border-l-[var(--border-danger)]">
            <CardHeader>
              <CardTitle>Não foi possível carregar as vendas</CardTitle>
              <CardDescription>
                A leitura das cobranças falhou. Tente de novo em alguns instantes.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="secondary" onClick={estado.refetch}>
                Tentar novamente
              </Button>
            </CardFooter>
          </Card>
        ) : estado.loading ? (
          <div
            role="status"
            aria-label="Carregando vendas"
            className="flex flex-col gap-[var(--spacing-3)]"
          >
            <Skeleton variant="rect" className="h-40" />
          </div>
        ) : estado.itens.length === 0 ? (
          <EmptyState
            title="Nenhuma venda neste tenant"
            description="As cobranças aparecem aqui conforme os compradores fecham pedidos nos eventos deste produtor."
          />
        ) : (
          <div className="flex flex-col gap-[var(--spacing-4)]">
            <ResultCount
              visiveis={estado.itens.length}
              temMais={estado.temMais}
              substantivo={SUBSTANTIVO_VENDAS}
              className="text-right"
            />

            <Table
              columns={colunas}
              data={estado.itens}
              keyExtractor={(v) => v.pagamento.id}
              caption="Vendas do tenant, com serviço e líquido lidos do carimbo da conciliação"
            />

            {estado.temMais ? (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  disabled={estado.loadingMore}
                  onClick={estado.carregarMais}
                >
                  {estado.loadingMore ? 'Carregando…' : 'Carregar mais'}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

VendasTab.displayName = 'VendasTab';
