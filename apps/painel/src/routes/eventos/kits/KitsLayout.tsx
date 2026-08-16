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
// =============================================================================

import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { SubNav, type SubNavTab } from '@leela/design-system';
import type { EventoOutletContext } from '../evento/EventoLayout';
import { tabsComNavSpa } from '../../../lib/navSpa';

export function KitsLayout(): JSX.Element {
  const ctx = useOutletContext<EventoOutletContext>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const slug = ctx.evento.slug;
  const base = `/eventos/${slug}/kits`;

  const resto = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\/+/, '') : '';
  const ativa = resto.split('/')[0] || 'cadastro';

  // `href` fica (ctrl+clique, clique do meio, copiar endereço); o clique simples
  // é interceptado e navega por SPA — LEELA-NAVFIX-T2.
  const tabs: SubNavTab[] = tabsComNavSpa(
    [
      { id: 'cadastro', label: 'Gerenciamento', href: base, active: ativa === 'cadastro' },
      // `estoque` continua acendendo a aba: o endereço antigo salta para
      // `distribuicao`, e durante o salto a aba certa já fica marcada.
      {
        id: 'distribuicao',
        label: 'Distribuição',
        href: `${base}/distribuicao`,
        active: ativa === 'distribuicao' || ativa === 'estoque',
      },
    ],
    navigate,
    pathname,
  );

  return (
    <div className="flex flex-col gap-[var(--spacing-5)]">
      <SubNav tabs={tabs} aria-label="Seções de kits" divider />
      <Outlet context={ctx} />
    </div>
  );
}

KitsLayout.displayName = 'KitsLayout';
