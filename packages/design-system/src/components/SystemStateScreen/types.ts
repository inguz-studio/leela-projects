// =============================================================================
// SystemStateScreen — contrato de props compartilhado (LEELA-E07 · S500-T1).
//
// Componente ÚNICO de estado de sistema (404/403/500/offline/manutenção) do DS.
// Puro/presentacional: a copy vem SEMPRE por prop (glossário HANDOFF-07), nunca
// embutida — cada superfície (Painel Vite, Landing Next) passa título/mensagem/
// ações e a navegação. Declara as 5 variantes para forward-compat; a Onda 2
// (E07-web) só liga 3 (notFound/forbidden/error) — offline/maintenance entram
// com S503/S504 na V1.1.
// =============================================================================

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** As 5 variantes canônicas de estado de sistema (S500-T1). */
export type SystemStateVariant =
  | 'notFound'
  | 'forbidden'
  | 'error'
  | 'offline'
  | 'maintenance';

/**
 * Uma ação de recuperação. `onPress` é sempre chamado no clique; `href`, quando
 * presente, renderiza a ação como âncora (navegação nativa / `mailto:`) sem
 * abandonar o `onPress`. §DS: no máximo 1 ação `primary` por tela.
 */
export interface SystemStateAction {
  label: string;
  onPress: () => void;
  variant: 'primary' | 'secondary' | 'ghost';
  href?: string;
}

/**
 * Props do `SystemStateScreen`. Componente puro: nenhum acesso a dados.
 * - `layout='shell'`   → renderiza no slot de conteúdo (mantém sidebar/header).
 * - `layout='fullscreen'` → ocupa a viewport, sem container de shell.
 * - `detail` → texto auxiliar (ex.: id de erro do Sentry na variante `error`).
 */
export interface SystemStateScreenProps {
  variant: SystemStateVariant;
  title: string;
  message: string;
  actions: SystemStateAction[];
  icon?: LucideIcon;
  illustration?: ReactNode;
  detail?: string;
  layout?: 'shell' | 'fullscreen';
}
