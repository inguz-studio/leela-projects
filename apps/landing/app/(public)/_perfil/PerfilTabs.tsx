'use client';
// =============================================================================
// apps/landing/app/(public)/_perfil/PerfilTabs.tsx
//
// Menu secundário da página do produtor — S1707-T3 · RN-443 · D-ACH-15/16.
//
// A FRONTEIRA. `PerfilView` é Server Component puro e o `Tabs` do design
// system é de cliente (Radix). Este arquivo é a casca fina que atravessa a
// fronteira: recebe as três seções JÁ RENDERIZADAS no servidor como props e
// entrega ao `Tabs`. O que vai para o cliente é a troca de aba, e só ela —
// nenhum dado, nenhuma credencial, nenhum leitor.
//
// Por que o `Tabs` e não o `SubNav`: `SubNav` é navegação ENTRE ROTAS. Usá-lo
// aqui exigiria uma rota por aba ou parâmetro de consulta, e parâmetro tira a
// página do regime estático — trocaria uma troca instantânea por uma ida ao
// servidor. O `Tabs` mantém todos os painéis no documento (`forceMount`), o
// que preserva o que um link na bio existe para fazer: os eventos do produtor
// continuam alcançáveis por busca, mesmo os que estão numa aba fechada.
//
// Aba inicial: Eventos (D-ACH-16) — é o conteúdo com valor transacional e o
// que a página já entrega. Abrir no Feed levaria todo visitante a um estado
// vazio em produção.
//
// A11y vem do Radix de fábrica: `tablist`/`tab`/`tabpanel`, setas ← →,
// Home/End e o vínculo `aria-controls`. Nada disso é reimplementado aqui.
// =============================================================================

import { Tabs } from '../../_ds/ds';

export function PerfilTabs({
  feed,
  eventos,
  clubs,
}: {
  feed: React.ReactNode;
  eventos: React.ReactNode;
  clubs: React.ReactNode;
}): React.JSX.Element {
  return (
    <Tabs
      aria-label="Seções do perfil"
      defaultTab="eventos"
      tabs={[
        { id: 'feed', label: 'Feed', content: feed },
        { id: 'eventos', label: 'Eventos', content: eventos },
        { id: 'clubs', label: 'Clubs', content: clubs },
      ]}
    />
  );
}
