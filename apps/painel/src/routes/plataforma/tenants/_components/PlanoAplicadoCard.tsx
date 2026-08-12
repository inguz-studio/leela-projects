// =============================================================================
// PlanoAplicadoCard — o plano de cobrança do tenant no Resumo da ficha
// (ADMIN-VISAO onda 2 · S1613-T6 · RN-541).
//
// O que este card existe para impedir: o dono ler "plano Padrão" e a produtora
// estar cobrando com número diferente do Padrão. Aplicar um plano ESTAMPA uma
// cópia nos termos e grava o id como rastro; não há vínculo vivo, então uma
// edição manual posterior deixa o nome do plano descrevendo a origem e não o
// que está cobrando hoje.
//
// Quando os eixos comparáveis divergem, a tela DIZ QUE DIVERGIU e mostra os
// dois lados. Nada é bloqueado — a edição manual é legítima (RN-404) e o sinal
// é de leitura.
//
// FORMATAÇÃO: percentual pelo `formatPct` da plataforma; a mensalidade SaaS
// pelo `formatBRL` CENT-EXATO de `eventos/repasses/_lib/format`, e não pelo
// arredondado dos KPIs. Numa tabela cujo trabalho é comparar dois números
// exatos, arredondar seria esconder justamente a diferença que se está
// procurando.
// =============================================================================

import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
} from '@leela/design-system';
import type { CommercialTerms, PlanoCobranca } from '@leela/core';
import { formatBRL } from '../../../eventos/repasses/_lib/format';
import { formatPct } from '../../_lib/format';
import {
  estadoDoPlanoAplicado,
  type DivergenciaDeEstampa,
} from '../_lib/planoEstampa';

export interface PlanoAplicadoCardProps {
  /** Termo vigente do tenant (`commercialTerms/current`). */
  terms: CommercialTerms | null;
  /** Catálogo de planos nomeados — a origem do nome exibido. */
  planos: PlanoCobranca[] | null;
  loading: boolean;
}

function valorDoEixo(valor: number | null, unidade: DivergenciaDeEstampa['unidade']): string {
  if (valor === null) return 'sem valor';
  return unidade === 'brl' ? formatBRL(valor) : formatPct(valor);
}

function ListaDeDivergencias({
  divergencias,
}: {
  divergencias: DivergenciaDeEstampa[];
}): JSX.Element {
  return (
    <ul className="flex flex-col gap-[var(--spacing-2)]">
      {divergencias.map((d) => (
        <li
          key={d.eixo}
          className="flex flex-wrap items-baseline justify-between gap-[var(--spacing-2)]"
        >
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {d.eixo}
          </span>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
            plano {valorDoEixo(d.doPlano, d.unidade)} · vigente{' '}
            {valorDoEixo(d.vigente, d.unidade)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PlanoAplicadoCard({
  terms,
  planos,
  loading,
}: PlanoAplicadoCardProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando o plano de cobrança">
        <Skeleton variant="rect" className="h-32" />
      </div>
    );
  }

  const estado = estadoDoPlanoAplicado(terms, planos);
  const versao = terms ? `versão ${terms.versao} do termo` : null;

  if (estado.tipo === 'sem_termo') {
    return (
      <Card aria-label="Plano de cobrança">
        <CardHeader>
          <CardTitle>Plano de cobrança</CardTitle>
          <CardDescription>
            Este produtor ainda não tem termo comercial, então não há plano aplicado nem números
            de cobrança para comparar.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (estado.tipo === 'sem_plano') {
    return (
      <Card aria-label="Plano de cobrança">
        <CardHeader>
          <CardTitle>Plano de cobrança</CardTitle>
          <CardDescription>
            Nenhum plano aplicado — os números deste termo foram definidos à mão ({versao}).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (estado.tipo === 'plano_fora_do_catalogo') {
    return (
      <Card aria-label="Plano de cobrança">
        <CardHeader>
          <CardTitle>Plano de cobrança</CardTitle>
          <CardDescription>
            O termo aponta para o plano <code>{estado.planoId}</code>, que não está mais no
            catálogo. O id é rastro de auditoria, não vínculo: os números vigentes são os do
            termo ({versao}).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (estado.tipo === 'identica') {
    return (
      <Card aria-label="Plano de cobrança">
        <CardHeader>
          <CardTitle>Plano {estado.plano.nome}</CardTitle>
          <CardDescription>
            Os números vigentes batem com a estampa do plano ({versao}).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card
      aria-label="Plano de cobrança"
      className="border-l-4 border-l-[color:var(--feedback-warning)]"
    >
      <CardHeader>
        <CardTitle>
          Plano {estado.plano.nome}{' '}
          <Badge variant="alerta">Termo divergente do plano</Badge>
        </CardTitle>
        <CardDescription>
          O termo foi editado depois que o plano foi aplicado ({versao}). O nome do plano descreve
          a origem, não o que está cobrando hoje.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ListaDeDivergencias divergencias={estado.divergencias} />
      </CardContent>
    </Card>
  );
}

PlanoAplicadoCard.displayName = 'PlanoAplicadoCard';
