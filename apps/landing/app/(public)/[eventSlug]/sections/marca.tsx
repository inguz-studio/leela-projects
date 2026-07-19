// =============================================================================
// apps/landing/app/(public)/[eventSlug]/sections/marca.tsx
//
// Primitivos LOCAIS de identidade da landing (LEELA-R12 · Frente 1).
//
// Contexto: a landing usa os TOKENS do DS, mas os COMPONENTES divergiam do
// showroom do painel (achado do Vitor: tipografia, bordas, ícones de apoio
// ausentes, botões diferentes). A restrição do lote é preservar o SSR puro dos
// Server Components — o barrel do DS avalia `createContext` no topo e só entra
// pelo boundary 'use client' de `_ds/ds.ts`. Então, em vez de IMPORTAR os
// componentes do DS aqui, replicamos os VALORES do showroom localmente, como
// Server Components puros:
//   - iconografia Lucide de apoio (24px equivalência via `size`, stroke 1.75,
//     currentColor — mesmo contrato de `IconsPage` do showcase);
//   - selo/badge FLAT, uppercase, radius do DS (espelha `Badge` do showroom:
//     border-0, tracking, `rounded-ds-*`), sem reimportar o componente;
//   - título de seção com ícone de apoio + escala `font-display` consistente.
//
// ADR-017 (lote MODAL-ADR) — status desta réplica: o constraint que a originou
// MORREU (o DS agora expõe `@leela/design-system/server`, estáticos server-safe
// consumidos direto pela home/perfil). SeloModalidade e TituloSecao PERMANECEM
// locais DE PROPÓSITO: são escala própria da landing (selo hero text-sm/pill ≠
// Badge 10px uppercase do DS) — forçá-los nos átomos mudaria o visual aprovado.
// Seção NOVA da landing deve consumir o subpath server do DS, não crescer este
// arquivo. Gate de conformidade landing×showroom segue pendente (S1706 c).
//
// Lucide-react é seguro em Server Component (SVG puro, sem hooks/contexto).
// =============================================================================

import type { ReactNode } from 'react';
import {
  Bike,
  Flame,
  Flower2,
  Footprints,
  type LucideIcon,
  Medal,
  Mountain,
  Waves,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Mapeia a modalidade esportiva ao ícone Lucide de apoio (assinatura brasa). */
export function iconeDoEsporte(esporte: string): LucideIcon {
  const e = esporte.toLowerCase();
  if (e.includes('mountain') || e.includes('bike') || e.includes('cicl')) return Bike;
  if (e.includes('trail') || e.includes('trilha') || e.includes('montanha')) return Mountain;
  if (e.includes('bem-estar') || e.includes('bem estar') || e.includes('yoga')) return Flower2;
  if (e.includes('nata')) return Waves;
  if (e.includes('triathlon') || e.includes('triatlo')) return Medal;
  if (e.includes('corrida') || e.includes('caminhada')) return Footprints;
  return Flame;
}

/**
 * Selo da MODALIDADE esportiva (R12 · Frente 2) — destaque equivalente ao do
 * percurso. Flat + uppercase + brand-tint, espelhando o Badge `brand`/`neutro`
 * do showroom, com o ícone de apoio da modalidade. Server-safe.
 */
export function SeloModalidade({
  esporte,
  className,
}: {
  esporte: string;
  className?: string;
}): React.JSX.Element {
  const Icone = iconeDoEsporte(esporte);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-ds-pill bg-[var(--action-brand-tint)] px-3 py-1',
        'text-sm font-semibold uppercase tracking-wide text-text-brand',
        className,
      )}
    >
      <Icone size={16} strokeWidth={1.75} aria-hidden className="shrink-0" />
      {esporte}
    </span>
  );
}

/**
 * Título de seção com ÍCONE de apoio (R12 · Frente 1) — fecha o "ícones de
 * apoio ausentes". Escala `font-display` consistente com o showroom (h2 do
 * painel). O ícone é decorativo (aria-hidden); o texto carrega o significado.
 */
export function TituloSecao({
  icone: Icone,
  children,
  className,
}: {
  icone: LucideIcon;
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <h2
      className={cn(
        'flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl',
        className,
      )}
    >
      <Icone
        size={26}
        strokeWidth={1.75}
        aria-hidden
        className="shrink-0 text-text-brand"
      />
      <span>{children}</span>
    </h2>
  );
}
