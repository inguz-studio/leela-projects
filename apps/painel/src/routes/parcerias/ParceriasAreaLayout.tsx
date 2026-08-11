// =============================================================================
// ParceriasAreaLayout — a MOLDURA da área de Parcerias (D-1008-R17, com a
// anatomia do D-1008-R16).
//
// Layout route ÚNICO dono do menu secundário de 3 abas (Marcas · Assessorias
// parceiras · Afiliações): toda rota-filha o herda, na mesma posição, com a
// aba ativa derivada do pathname (`parceriasAreaAtiva`, puro). Mesmo padrão do
// ClubesAreaLayout/EventosHubLayout, incluindo o respiro do topo (`pt-5`) — o
// primeiro elemento da área de rolagem é uma SubNav de 48px sem padding
// vertical, não um PageHeader com `min-h` de 96px.
//
// FORA desta moldura, por design: `/parcerias/assessorias/nova` — fluxo de
// criação em tela cheia com retorno próprio (o MESMO veredito da auditoria
// R16; precedente declarado no EventosHubLayout para `/eventos/novo`).
// =============================================================================

import { Outlet, useLocation } from 'react-router-dom';
import { ParceriasAreaNav } from './_components/ParceriasAreaNav';
import { parceriasAreaAtiva } from './_lib/areaNav';

export function ParceriasAreaLayout(): JSX.Element {
  const { pathname } = useLocation();
  return (
    <div className="flex flex-col gap-[var(--spacing-4)] pt-[var(--spacing-5)]">
      <ParceriasAreaNav ativa={parceriasAreaAtiva(pathname)} />
      <Outlet />
    </div>
  );
}

ParceriasAreaLayout.displayName = 'ParceriasAreaLayout';
