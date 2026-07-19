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

export { DateBadge } from './components/DateBadge';
export type { DateBadgeProps } from './components/DateBadge';

export { EmptyState } from './components/EmptyState';
export type { EmptyStateProps } from './components/EmptyState';

// Receita do Button para composição server-side (ex.: CTA/link estilizado de
// botão). O COMPONENTE Button fica fora: usa Radix Slot (asChild).
export { buttonVariants } from './components/Button/variants';
