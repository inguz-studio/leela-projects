// =============================================================================
// Navegação da sidebar de plataforma (§Shell). Puro — testável sem router.
//
// A sidebar do super-admin é PRÓPRIA (separada da operação do tenant):
// Tenants, Termos, Billing, Macro. Tenants e Macro são telas da Onda 1;
// Termos é editado por tenant (entrada = lista de tenants); Billing é pós-V1.
// As listas globais (Eventos, Clubs) entraram na ADMIN-VISAO onda 4.
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
  // ADMIN-VISAO onda 4 · S1614-T4: as duas listas globais entram COLADAS em
  // Tenants, e a ordem diz a pergunta que cada uma responde. Tenants é "quem
  // opera na plataforma"; Eventos e Clubs são "o que existe nela, sem passar
  // por tenant". O resto da barra é comercial (Termos…Taxa) e dinheiro
  // (Repasses…Billing) — nenhuma das duas é isso.
  { id: 'eventos', label: 'Eventos', href: '/plataforma/eventos' },
  { id: 'clubs', label: 'Clubs', href: '/plataforma/clubs' },
  // ADMIN-VISAO onda 5 · S1615-T2: o terceiro "o que existe na plataforma", e o
  // único que é gente. Fecha o bloco das varreduras globais em vez de encostar
  // em Convites: o item é o DIRETÓRIO de contas, e a fila de quem espera é o
  // modo padrão dentro dele — quem procura "todos os usuários" procura aqui, no
  // mesmo lugar onde já procura todos os eventos e todos os clubs.
  { id: 'contas', label: 'Contas', href: '/plataforma/contas' },
  { id: 'termos', label: 'Termos', href: '/plataforma/tenants' },
  { id: 'planos', label: 'Planos', href: '/plataforma/planos' },
  // S1608-T2 · RN-413: os códigos que liberam conta de organizador.
  { id: 'convites', label: 'Convites', href: '/plataforma/convites' },
  // TAXAFLEX (S1606 · RN-178): tabela GLOBAL de taxa por meio de pagamento
  { id: 'taxa', label: 'Serviço', href: '/plataforma/taxa' },
  { id: 'repasses', label: 'Repasses', href: '/plataforma/repasses' },
  // T4 · decisão 43-b: o suporte age no tenant alheio por AQUI, não pegando
  // emprestado um login de organizador.
  { id: 'estornos', label: 'Estornos', href: '/plataforma/estornos' },
  { id: 'billing', label: 'Billing', badge: 'em breve' },
  { id: 'macro', label: 'Macro', href: '/plataforma/macro' },
];

/** id do item de nav ativo dado o pathname atual (null = nenhum). */
export function activeNavId(pathname: string): string | null {
  // ADMIN-VISAO onda 4: as listas globais. Ficam ANTES de `tenants` porque a
  // ficha do tenant é que ganha sub-rotas (`/tenants/:id/...`), não elas.
  if (pathname.startsWith('/plataforma/eventos')) return 'eventos';
  if (pathname.startsWith('/plataforma/clubs')) return 'clubs';
  // ADMIN-VISAO onda 5: o diretório de contas. `contas` e `convites` não são
  // prefixo um do outro — nenhum acende o item do outro.
  if (pathname.startsWith('/plataforma/contas')) return 'contas';
  if (pathname.startsWith('/plataforma/macro')) return 'macro';
  if (pathname.startsWith('/plataforma/planos')) return 'planos';
  if (pathname.startsWith('/plataforma/convites')) return 'convites';
  if (pathname.startsWith('/plataforma/taxa')) return 'taxa';
  if (pathname.startsWith('/plataforma/repasses')) return 'repasses';
  if (pathname.startsWith('/plataforma/estornos')) return 'estornos';
  if (pathname.startsWith('/plataforma/tenants')) {
    return pathname.includes('/termos') ? 'termos' : 'tenants';
  }
  return null;
}
