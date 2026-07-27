// =============================================================================
// CrmSubNav — sub-navegação da área CRM (padrão SubNav §2.14):
// **Visão geral** | **Clientes** | **Comunicação**.
//
// Sucede a `FinanceiroSubNav` de 2 abas: o item de menu passou a ser um só
// (CRM), e a troca entre as três subdivisões acontece por aqui. A aba ativa
// deriva do pathname, nunca de estado local — a sidebar e a SubNav leem a
// mesma fonte, então voltar pelo histórico do navegador não desalinha as duas.
//
// FRONTEIRA DE PII (RN-820/822 × RN-172): as três abas dividem a casca de
// menu, e só isso. **Visão geral** é agregado sem identidade, com supressão
// k=5 no cohort; **Clientes** é identidade individual. Dividir a moldura não
// autoriza cruzar as camadas — qualquer recorte demográfico na lista de
// clientes reintroduz a diferenciação que o k-anonimato fecha e é bloqueio de
// gate, não decisão de layout.
// =============================================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { SubNav, type SubNavTab } from '@leela/design-system';
import { tabsComNavSpa } from '../../../lib/navSpa';

/** Subdivisão do CRM ativa para um pathname (fonte única da derivação). */
export function crmAbaAtiva(pathname: string): 'visao-geral' | 'clientes' | 'comunicacao' {
  if (pathname.startsWith('/crm/clientes')) return 'clientes';
  if (pathname.startsWith('/crm/comunicacao')) return 'comunicacao';
  // Índice `/crm` e o alias explícito `/crm/visao-geral` — e também qualquer
  // caminho legado ainda não redirecionado: a Visão geral é o padrão da área.
  return 'visao-geral';
}

export function CrmSubNav(): JSX.Element {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const ativa = crmAbaAtiva(pathname);

  // LEELA-DEBT-T4 (H7 do PAINEL-NAV-DIAG-REPORT) — esta barra nasceu na rodada
  // IA-MENU navegando por `onClick` SEM `href`. Nunca recarregou o documento
  // (não era o defeito da NAV-FIX), mas também não era link: sem ctrl+clique,
  // sem clique do meio, sem "copiar endereço do link", sem preview da URL na
  // barra de status, e um `<button>` onde o leitor de tela esperava navegação.
  // Agora é o mesmo par das demais superfícies — `href` no DOM E `onClick` que
  // faz `preventDefault` (a fiação vive em `tabsComNavSpa`, um lugar só).
  const tabs: SubNavTab[] = tabsComNavSpa(
    [
      { id: 'visao-geral', label: 'Visão geral', href: '/crm', active: ativa === 'visao-geral' },
      { id: 'clientes', label: 'Clientes', href: '/crm/clientes', active: ativa === 'clientes' },
      {
        id: 'comunicacao',
        label: 'Comunicação',
        href: '/crm/comunicacao',
        active: ativa === 'comunicacao',
      },
    ],
    navigate,
  );

  return <SubNav aria-label="Seções de CRM" divider tabs={tabs} />;
}

CrmSubNav.displayName = 'CrmSubNav';
