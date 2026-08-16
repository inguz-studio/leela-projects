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

import { AreaSubNav } from '../../../components/nav/AreaSubNav';
import { parceriasAreaNavTabs, type ParceriasAreaId } from '../_lib/areaNav';

export function ParceriasAreaNav({ ativa }: { ativa: ParceriasAreaId }): JSX.Element {
  return <AreaSubNav aria-label="Seções de parcerias" tabs={parceriasAreaNavTabs(ativa)} />;
}

ParceriasAreaNav.displayName = 'ParceriasAreaNav';
