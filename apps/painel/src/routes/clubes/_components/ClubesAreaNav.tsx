// =============================================================================
// ClubesAreaNav — o menu secundário da área de clubs (D-1008-R9), no ponto de
// render: SubNav canônica do DS + fiação de SPA (tabsComNavSpa — âncoras de
// verdade com preventDefault; a lei da tabela navegacao-spa vale). O indicador
// de item ativo DESLIZA entre as entradas (D-1008-R14, no próprio SubNav).
//
// Desde o D-1008-R16, o ÚNICO consumidor é a moldura da área
// (ClubesAreaLayout) — página nenhuma volta a colar este menu por conta
// própria: foi essa anatomia que produziu aba órfã e layout inconsistente.
// =============================================================================

import { AreaSubNav } from '../../../components/nav/AreaSubNav';
import { clubesAreaNavTabs, type ClubesAreaId } from '../_lib/areaNav';

export function ClubesAreaNav({ ativa }: { ativa: ClubesAreaId }): JSX.Element {
  return <AreaSubNav aria-label="Seções de clubs" tabs={clubesAreaNavTabs(ativa)} />;
}

ClubesAreaNav.displayName = 'ClubesAreaNav';
