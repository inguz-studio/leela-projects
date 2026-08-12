// =============================================================================
// @leela/design-system/server — entrada SERVER-SAFE (ADR-017 · S1706 aceite a).
//
// Contrato: TUDO que sai daqui é importável e renderizável em Server
// Component puro (Next App Router) — ZERO `@radix-ui`, ZERO `createContext`,
// ZERO hook, ZERO 'use client' necessário. O barrel principal (`index.ts`)
// avalia createContext no topo (ThemeProvider/Toast) e por isso só entra em
// grafo de cliente; esta entrada existe para a superfície pública (landing)
// consumir os primitivos ESTÁTICOS sem boundary e sem hydration JS.
//
// A garantia é EXECUTÁVEL: `src/test/server-safety.test.ts` caminha o grafo
// de imports desta entrada e falha o build se algo proibido entrar. Ao
// adicionar um export aqui, o componente precisa ser puro (react + cva/cn).
// =============================================================================

export { Badge, badgeVariants } from './components/Badge';
export type { BadgeProps } from './components/Badge';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/Card';
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
} from './components/Card';

export { CardEvento } from './components/CardEvento';
export type { CardEventoProps } from './components/CardEvento';

// Moldura (Onda 0 Parte B · CANONE-1). As cinco peças são puras — react + cva
// + cn, zero hook e zero Radix — então entram na entrada server-safe e a
// landing as consome sem boundary de cliente e sem custo de bundle público. O
// `server-safety.test.ts` caminha o grafo e reprova se isso deixar de valer.
export { Stack, stackVariants } from './components/Stack';
export type { StackProps, StackElement } from './components/Stack';
export { FormGrid, formGridVariants } from './components/FormGrid';
export type { FormGridProps, FormGridElement } from './components/FormGrid';
export { MetricGrid, metricGridVariants } from './components/MetricGrid';
export type { MetricGridProps, MetricGridElement } from './components/MetricGrid';
export { SplitPanel, splitPanelVariants } from './components/SplitPanel';
export type { SplitPanelProps, SplitPanelElement } from './components/SplitPanel';
export { SectionHeader } from './components/SectionHeader';
export type { SectionHeaderProps } from './components/SectionHeader';
export { CardDominio } from './components/CardDominio';
export type { CardDominioProps, CardDominioAccent } from './components/CardDominio';

export { DateBadge } from './components/DateBadge';
export type { DateBadgeProps } from './components/DateBadge';

export { EmptyState } from './components/EmptyState';
export type { EmptyStateProps } from './components/EmptyState';

// Receita do Button para composição server-side (ex.: CTA/link estilizado de
// botão). O COMPONENTE Button fica fora: usa Radix Slot (asChild).
export { buttonVariants } from './components/Button/variants';
