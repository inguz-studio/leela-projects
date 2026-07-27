// =============================================================================
// EventosHubLayout — moldura das subdivisões de PRIMEIRO nível de Eventos:
// **Eventos** (a lista, `/eventos`) | **Repasses** (a visão macro do dinheiro
// que os eventos geraram, `/eventos/repasses`).
//
// RN-366: o repasse pertence à ORIGEM do dinheiro. Hoje a origem é uma só —
// eventos. Quando o clube pago existir, ele ganha a própria subdivisão de
// repasses, sem herdar nada desta. Por isso a SubNav vive aqui, no hub, e não
// dentro de `:slug`: ela navega ENTRE origens de conteúdo da área, não entre
// abas de um evento (essas são a sub-nav terciária de `eventos/_lib/subnav.ts`,
// que segue intocada).
//
// SubNav no padrão §2.14 com `divider` (RN-229 · divisória 1px em
// --border-subtle) — o mesmo componente e o mesmo par de props que a área
// Financeiro usava antes de morrer, para a troca de casa não virar troca de
// aparência. `/eventos/novo` fica FORA desta moldura de propósito: é fluxo de
// criação em tela cheia, não uma subdivisão do hub.
// =============================================================================

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SubNav, type SubNavTab } from '@leela/design-system';
import { tabsComNavSpa } from '../../lib/navSpa';

/** Sub-navegação de primeiro nível da área Eventos (padrão §2.14). */
export function EventosHubSubNav(): JSX.Element {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Só `/eventos/repasses` (e o que vier abaixo dele) ativa a aba Repasses.
  // Um evento de slug `repasses` NÃO existe por esta rota — a precedência de
  // segmento estático sobre `:slug` está declarada e testada em EventosRoutes.
  const emRepasses = pathname.startsWith('/eventos/repasses');

  // LEELA-DEBT-T4 (H7 do PAINEL-NAV-DIAG-REPORT) — a barra nasceu na rodada
  // IA-MENU navegando por `onClick` SEM `href`: nunca recarregou o documento,
  // mas também não era link (sem ctrl+clique, sem clique do meio, sem "copiar
  // endereço do link"). Agora segue o mesmo par das outras superfícies — `href`
  // no DOM E `onClick` com `preventDefault`, fiado por `tabsComNavSpa`.
  const tabs: SubNavTab[] = tabsComNavSpa(
    [
      { id: 'eventos', label: 'Eventos', href: '/eventos', active: !emRepasses },
      { id: 'repasses', label: 'Repasses', href: '/eventos/repasses', active: emRepasses },
    ],
    navigate,
  );

  return <SubNav aria-label="Seções de Eventos" divider tabs={tabs} />;
}

EventosHubSubNav.displayName = 'EventosHubSubNav';

/** Moldura com a SubNav sobre o conteúdo da subdivisão. */
export function EventosHubLayout(): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <EventosHubSubNav />
      <Outlet />
    </div>
  );
}

EventosHubLayout.displayName = 'EventosHubLayout';
