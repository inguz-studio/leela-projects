// =============================================================================
// KitsLayout — sub-nav interna da seção Kits (S205-T2). Repassa o evento do
// Outlet às rotas-filhas. Sob o EventoLayout (header + sub-nav do evento).
//
// A leva 11 (12/08) tirou dois itens dos quatro originais:
//
//   S1257 · SAIU "Credenciamento". Ele tinha o MESMO `href` da aba de
//           Credenciamento do menu secundário do evento (`_lib/subnav.ts`), sem
//           tela própria e sem versão resumida: era um atalho de saída, e
//           `active` era `false` em toda rota porque o destino vive fora da
//           árvore de Kits. Quem credencia sai pelo menu do evento, como já faz
//           para Inscritos e Financeiro. Régua da RN-399 — uma porta por destino.
//
//   S1258 · SAIU "Estoque" como aba. A retirada aparecia em três cortes do
//           mesmo número entre Distribuição e Estoque; as duas viraram UMA aba
//           (`kits/distribuicao`), e o endereço `kits/estoque` salta para ela.
//
//   S1259 · a aba-índice deixou de se chamar "Cadastro" e passou a se chamar
//           "Gerenciamento" (RN-572). A medição mostrou que ela já fazia mais
//           que cadastrar — cria E edita kits (por rota própria) e itens (por
//           modal), com KPIs de resumo e configuração de patrocínio. O `id`
//           interno continua `cadastro` e a rota continua `/eventos/:slug/kits`:
//           mesma régua da RN-399, muda o que a pessoa lê, não o identificador.
//
// Sobram duas: a aba-índice e a distribuição.
//
// V2708-03 (fase 2) · TERCIÁRIO em modo ROTA — a seção Kits é navegação
// terciária (nível 3: painel → evento → Kits → seção), e ambas as sub-seções
// são destino de link com dado próprio (critério da RN-574 emendada: rota onde
// cada seção tem endereço colável e dado próprio). A barra horizontal do
// AreaSubNav cede lugar à coluna sticky em ≥ lg e à faixa horizontal < lg.
// =============================================================================

import { Outlet, useLocation, useOutletContext } from 'react-router-dom';
import type { EventoOutletContext } from '../evento/EventoLayout';
import {
  AreaTerciarioNav,
  TerciarioLayout,
  type TerciarioItem,
} from '../../../components/nav/TerciarioNav';

export function KitsLayout(): JSX.Element {
  const ctx = useOutletContext<EventoOutletContext>();
  const { pathname } = useLocation();
  const slug = ctx.evento.slug;
  const base = `/eventos/${slug}/kits`;

  const resto = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\/+/, '') : '';
  const ativa = resto.split('/')[0] || 'cadastro';

  // `href` fica (ctrl+clique, clique do meio, copiar endereço); o clique simples
  // é interceptado pela navegação SPA do AreaTerciarioNav — mesmo contrato do
  // AreaSubNav que este arquivo usava antes, agora com a peça canônica do nível 3.
  //
  // `estoque` continua acendendo a aba de Distribuição: o endereço antigo salta
  // para `distribuicao` pelo RedirectLegado, e durante o salto a aba certa já
  // fica marcada.
  const itens: TerciarioItem[] = [
    { id: 'cadastro', label: 'Gerenciamento', href: base, active: ativa === 'cadastro' },
    {
      id: 'distribuicao',
      label: 'Distribuição',
      href: `${base}/distribuicao`,
      active: ativa === 'distribuicao' || ativa === 'estoque',
    },
  ];

  return (
    <TerciarioLayout nav={<AreaTerciarioNav itens={itens} aria-label="Seções de kits" />}>
      <Outlet context={ctx} />
    </TerciarioLayout>
  );
}

KitsLayout.displayName = 'KitsLayout';
