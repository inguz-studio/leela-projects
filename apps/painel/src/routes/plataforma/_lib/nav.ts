// =============================================================================
// Navegação da sidebar de plataforma (§Shell). Puro — testável sem router.
//
// A sidebar do super-admin é PRÓPRIA (separada da operação do tenant):
// Tenants, Termos, Billing, Macro. Tenants e Macro são telas da Onda 1;
// Termos é editado por tenant (entrada = lista de tenants); Billing é pós-V1.
// =============================================================================

export interface PlatformNavItem {
  id: string;
  label: string;
  /** Rota de destino; ausente = item informativo (badge "em breve"). */
  href?: string;
  badge?: string;
}

export const PLATFORM_NAV: PlatformNavItem[] = [
  { id: 'tenants', label: 'Tenants', href: '/plataforma/tenants' },
  { id: 'termos', label: 'Termos', href: '/plataforma/tenants' },
  { id: 'planos', label: 'Planos', href: '/plataforma/planos' },
  // TAXAFLEX (S1606 · RN-178): tabela GLOBAL de taxa por meio de pagamento
  { id: 'taxa', label: 'Taxa', href: '/plataforma/taxa' },
  { id: 'repasses', label: 'Repasses', href: '/plataforma/repasses' },
  { id: 'billing', label: 'Billing', badge: 'em breve' },
  { id: 'macro', label: 'Macro', href: '/plataforma/macro' },
];

/** id do item de nav ativo dado o pathname atual (null = nenhum). */
export function activeNavId(pathname: string): string | null {
  if (pathname.startsWith('/plataforma/macro')) return 'macro';
  if (pathname.startsWith('/plataforma/planos')) return 'planos';
  if (pathname.startsWith('/plataforma/taxa')) return 'taxa';
  if (pathname.startsWith('/plataforma/repasses')) return 'repasses';
  if (pathname.startsWith('/plataforma/tenants')) {
    return pathname.includes('/termos') ? 'termos' : 'tenants';
  }
  return null;
}
