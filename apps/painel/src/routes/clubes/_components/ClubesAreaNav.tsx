// =============================================================================
// ClubesAreaNav — o menu secundário da área de clubs (D-1008-R9), no ponto de
// render: SubNav canônica do DS + fiação de SPA (tabsComNavSpa — âncoras de
// verdade com preventDefault; a lei da tabela navegacao-spa vale). O indicador
// de item ativo DESLIZA entre as entradas (D-1008-R14, no próprio SubNav).
// =============================================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { SubNav } from '@leela/design-system';
import { tabsComNavSpa } from '../../../lib/navSpa';
import { clubesAreaNavTabs, type ClubesAreaId } from '../_lib/areaNav';

export function ClubesAreaNav({
  ativa,
  className,
}: {
  ativa: ClubesAreaId;
  /** Ex.: `px-0` quando a página já carrega o próprio padding (Assessorias). */
  className?: string;
}): JSX.Element {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <SubNav
      aria-label="Seções de clubes"
      tabs={tabsComNavSpa(clubesAreaNavTabs(ativa), navigate, pathname)}
      {...(className !== undefined ? { className } : {})}
    />
  );
}

ClubesAreaNav.displayName = 'ClubesAreaNav';
