// =============================================================================
// ClubesAreaLayout — a MOLDURA da área de clubs (D-1008-R16).
//
// A auditoria do R16 achou a causa das abas órfãs: o R9 colou o `ClubesAreaNav`
// página a página, e quem não colou (detalhe de assessoria) ficou SEM menu;
// quem colou diferente (Assessorias, dentro de coluna `max-w-5xl` com `px-0`)
// quebrou o layout — o menu saltava de posição e largura entre abas irmãs.
//
// O conserto é anatomia, não remendo: este layout route é o ÚNICO dono do menu
// secundário da área — toda rota-filha o herda, na mesma posição, com a aba
// ativa derivada do pathname (`clubesAreaAtiva`, puro). Mesmo padrão do
// `EventosHubLayout`, incluindo o respiro do topo (`pt-5`): o primeiro elemento
// da área de rolagem é uma SubNav de 48px sem padding vertical, não um
// PageHeader com `min-h` de 96px.
//
// FORA desta moldura, por design (vereditos da auditoria, afirmados em teste):
//   · `/clubes/novo` e `/clubes/assessorias/nova` — fluxos de criação em tela
//     cheia com retorno próprio (precedente declarado no EventosHubLayout:
//     "`/eventos/novo` fica FORA desta moldura de propósito").
//   · `/clubes/:slug/*` — o painel de um club tem shell próprio (ClubeShell:
//     breadcrumb "Clubes › {nome}" do D-1008-R10 + abas do clube).
// =============================================================================

import { Outlet, useLocation } from 'react-router-dom';
import { ClubesAreaNav } from './_components/ClubesAreaNav';
import { clubesAreaAtiva } from './_lib/areaNav';

export function ClubesAreaLayout(): JSX.Element {
  const { pathname } = useLocation();
  return (
    <div className="flex flex-col gap-[var(--spacing-4)] pt-[var(--spacing-5)]">
      <ClubesAreaNav ativa={clubesAreaAtiva(pathname)} />
      <Outlet />
    </div>
  );
}

ClubesAreaLayout.displayName = 'ClubesAreaLayout';
