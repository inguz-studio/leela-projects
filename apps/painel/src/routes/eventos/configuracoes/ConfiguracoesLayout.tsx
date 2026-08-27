// =============================================================================
// ConfiguracoesLayout — casca da seção Configurações do evento (S304-T2/T3 ·
// E04-L5). Sob o EventoLayout (header + sub-nav do evento). Resolve o papel do
// usuário (usePapelEvento) e GATEIA por papel (§ aceite E04-L5: "só Organizador/
// Administrador gerem equipe"; configurações idem): monta a sub-nav interna só
// com as sub-áreas que o papel acessa (fonte única = matriz `podeAcessar`) e,
// quando o papel não acessa nenhuma, mostra EmptyState honesto em vez da tela.
// A Rule é a autoridade final — este gate só decide o que a UI expõe.
//
// Repassa `{ evento, papel }` às rotas-filhas via Outlet context (elas não
// recomputam o papel).
// =============================================================================

import { Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { EmptyState, Skeleton } from '@leela/design-system';
import type { Evento, PapelEvento } from '@leela/core';
import type { EventoOutletContext } from '../evento/EventoLayout';
import { usePapelEvento } from '../_data/papelEvento';
import {
  AreaTerciarioNav,
  TerciarioLayout,
  type TerciarioItem,
} from '../../../components/nav/TerciarioNav';
import { podeEditarConfiguracoes, podeGerirEquipe, podeEditarPaginaVendas } from './_lib/gateEvento';

export interface ConfiguracoesOutletContext {
  evento: Evento;
  papel: PapelEvento | null;
}

interface SubAba {
  id: string;
  label: string;
  segmento: string;
  visivel: boolean;
}

export function ConfiguracoesLayout(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { pathname } = useLocation();
  // Hook no topo: abaixo há retornos antecipados (loading, sem acesso).
  const { papel, loading } = usePapelEvento(evento);

  const base = `/eventos/${evento.slug}/configuracoes`;

  if (loading) {
    return (
      <div role="status" aria-label="Carregando configurações" className="flex flex-col gap-[var(--spacing-4)]">
        <Skeleton variant="rect" className="h-[var(--subnav-height)]" />
        <Skeleton variant="rect" className="h-60" />
      </div>
    );
  }

  const abas: SubAba[] = [
    { id: 'geral', label: 'Geral', segmento: '', visivel: podeEditarConfiguracoes(papel) },
    {
      id: 'politica',
      label: 'Política de vendas',
      segmento: 'politica',
      visivel: podeEditarConfiguracoes(papel),
    },
    // V2708-11 · "configurações pode unificar a página de vendas no menu
    // terciário, em eventos". Ela entra DEPOIS de Política de vendas porque as
    // duas falam da mesma coisa (o que se vende e como), e antes de Exigências,
    // que é o bloco de regulamento. `visivel` sai da célula PRÓPRIA da matriz.
    {
      id: 'pagina-vendas',
      label: 'Página de vendas',
      segmento: 'pagina-vendas',
      visivel: podeEditarPaginaVendas(papel),
    },
    {
      id: 'saude',
      label: 'Exigências e regulamento',
      segmento: 'saude',
      visivel: podeEditarConfiguracoes(papel),
    },
    { id: 'equipe', label: 'Equipe e permissões', segmento: 'equipe', visivel: podeGerirEquipe(papel) },
  ];
  const visiveis = abas.filter((a) => a.visivel);

  if (visiveis.length === 0) {
    return (
      <EmptyState
        title="Sem acesso às configurações"
        description="Seu papel neste evento não inclui as configurações nem a equipe. Fale com o organizador."
      />
    );
  }

  const resto = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\/+/, '') : '';
  const ativa = resto.split('/')[0] || 'geral';

  const context: ConfiguracoesOutletContext = { evento, papel };

  // `href` fica (ctrl+clique, clique do meio, copiar endereço); o clique simples
  // é interceptado e navega por SPA — LEELA-NAVFIX-T2.
  const itens: TerciarioItem[] = visiveis.map((a) => ({
    id: a.id,
    label: a.label,
    href: a.segmento ? `${base}/${a.segmento}` : base,
    active: a.id === ativa,
  }));

  // V2708-03 · o terciário que o dono aprovou em Clubs vira o padrão aqui: a
  // coluna sticky de `lg` para cima, faixa horizontal abaixo. Em modo ROTA — as
  // cinco seções continuam sendo rotas com dado próprio, guard próprio e
  // endereço colável, que é o que a régua da RN-574 manda preservar.
  //
  // Menu de UM item continua não sendo menu (comportamento herdado): o papel que
  // só alcança uma seção vê a seção, não uma coluna com uma linha.
  return (
    <TerciarioLayout
      nav={
        itens.length > 1 ? (
          <AreaTerciarioNav itens={itens} aria-label="Seções de configurações" />
        ) : null
      }
    >
      <Outlet context={context} />
    </TerciarioLayout>
  );
}

ConfiguracoesLayout.displayName = 'ConfiguracoesLayout';
