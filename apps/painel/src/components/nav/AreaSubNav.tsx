// =============================================================================
// AreaSubNav — o ÚNICO menu secundário do painel (Leva 14).
//
// A fala do dono que criou este arquivo, na íntegra (13/08):
//
//   "o menu secundário de clubs está coreto, mas nas outras telas, a linha esta
//    aparecendo, aonde os seletores laranja ficam. Isso é um exemplo de que voce
//    naoe stá retulizando e padronizando os componentes."
//
// Ele leu certo o sintoma e certo a causa. O sintoma era a prop `divider` do
// `SubNav` (RN-229), que oito dos onze menus passavam e o de clubs não —
// `border-b` em `--border-subtle` assentando no MESMO `bottom: 0` do indicador
// Brasa, então onde o laranja não estava sobrava o traço cinza. Essa metade
// morreu na origem: a prop não existe mais no DS.
//
// A causa é esta aqui. O `SubNav` sempre foi um componente só do design system,
// mas o MENU não era: onze pontos de render repetiam o mesmo trio
// (`useNavigate` + `useLocation` + `tabsComNavSpa`) e cada um decidia sozinho
// as props da barra. Reuso de primitivo sem reuso de MONTAGEM é exatamente a
// forma de divergência que dá gate verde com telas diferentes — a mesma lição
// que o cânone registra nas 223 instâncias de 11/08.
//
// Por que a peça mora aqui e não no `@leela/design-system`: ela existe para
// fiar `react-router`, que o DS não tem como dependência e não deve ter (o
// pacote é consumido também pela landing Next e pelo mobile). A FRONTEIRA é
// essa e vale ler antes de crescer o arquivo: aparência, a11y e anatomia são do
// `SubNav`; roteamento é daqui. Este componente não tem uma linha de estilo, e
// não pode passar a ter — no dia em que ele precisar de `className`, o que
// mudou é o contrato visual e o lugar do conserto é o DS.
//
// O gate: a catraca `menu-secundario-cru` do `scripts/gate-canon.mjs` conta os
// renders diretos de `<SubNav>` em `apps/` e as barras reescritas à mão, com
// baseline ZERO. Entrada nova reprova.
// =============================================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { SubNav, type SubNavTab } from '@leela/design-system';
import { tabsComNavSpa } from '../../lib/navSpa';

export interface AreaSubNavProps {
  /**
   * As entradas da barra, já com `href` e `active` resolvidos pela área. Quem
   * decide o que é a aba ativa continua sendo a MOLDURA da área (a lição do
   * D-1008-R16: menu colado página a página produz aba órfã), e as funções
   * `@pure` que montam as entradas seguem onde estão, uma por área.
   */
  tabs: readonly SubNavTab[];
  /** Rótulo do landmark. Obrigatório: cada área nomeia o próprio menu. */
  'aria-label': string;
}

/**
 * A navegação de SPA vem de graça e igual em todas as áreas — `href` real no
 * DOM (ctrl/cmd+clique, clique do meio, copiar endereço) com o clique simples
 * interceptado. Era a parte que mais divergia: `TenantFichaLayout` escrevia o
 * `onClick` à mão e chamava `preventDefault()` incondicionalmente, o que MATAVA
 * o ctrl+clique naquela barra e em nenhuma outra. Passando por aqui, o defeito
 * não tem onde existir.
 */
export function AreaSubNav({ tabs, 'aria-label': ariaLabel }: AreaSubNavProps): JSX.Element {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return <SubNav aria-label={ariaLabel} tabs={tabsComNavSpa(tabs, navigate, pathname)} />;
}

AreaSubNav.displayName = 'AreaSubNav';
