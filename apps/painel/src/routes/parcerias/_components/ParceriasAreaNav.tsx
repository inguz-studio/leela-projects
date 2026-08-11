// =============================================================================
// ParceriasAreaNav — o menu secundário da área de Parcerias (D-1008-R17), no
// ponto de render: SubNav canônica do DS + fiação de SPA (tabsComNavSpa —
// âncoras de verdade com preventDefault; a lei da tabela navegacao-spa vale).
// O indicador de item ativo DESLIZA entre as entradas (D-1008-R14).
//
// Único consumidor: a moldura da área (ParceriasAreaLayout) — a lição do
// D-1008-R16 vale aqui desde o nascimento: menu colado página a página produz
// aba órfã e layout inconsistente.
// =============================================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { SubNav } from '@leela/design-system';
import { tabsComNavSpa } from '../../../lib/navSpa';
import { parceriasAreaNavTabs, type ParceriasAreaId } from '../_lib/areaNav';

export function ParceriasAreaNav({ ativa }: { ativa: ParceriasAreaId }): JSX.Element {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <SubNav
      aria-label="Seções de parcerias"
      tabs={tabsComNavSpa(parceriasAreaNavTabs(ativa), navigate, pathname)}
    />
  );
}

ParceriasAreaNav.displayName = 'ParceriasAreaNav';
