/**
 * AppShell — composição de layout: Sidebar + área de conteúdo principal.
 *
 * Uso:
 *   <AppShell sidebar={<Sidebar ... />}>
 *     <PageHeader ... />
 *     <SubNav ... />
 *     {children}
 *   </AppShell>
 *
 * Responsivo (LEELA-RESP-M1-T2): o rail fixo da Sidebar só existe a partir de
 * `lg` (1024px, ponto de colapso declarado no tailwind-preset). Abaixo de `lg`
 * o rail SOME do fluxo (não ocupa mais os 240px) — é o que devolve a largura
 * ao documento em mobile 390×844 e IMPEDE o scroll horizontal (a raiz M1 do
 * QA-LIVE-2). No mobile a MESMA Sidebar vira drawer off-canvas, acionado por um
 * hambúrguer visível na barra superior. Desktop 1440 fica INTOCADO (o rail e o
 * layout de duas colunas são idênticos ao anterior).
 *
 * A11y: main landmark para o conteúdo; hambúrguer com nome acessível; drawer
 * com focus-trap/Esc/aria-dialog (via Drawer → Radix Dialog);
 * `prefers-reduced-motion` respeitado pelo Drawer.
 */

import * as React from 'react';
import { Menu } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Drawer } from '../Drawer';
import { IconButton } from '../IconButton';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AppShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Nome acessível do hambúrguer (mobile). Default: 'Abrir menu de navegação'. */
  menuLabel?: string;
  /** Nome acessível do drawer de navegação (mobile). Default: 'Menu de navegação'. */
  drawerLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AppShell({
  sidebar,
  children,
  className,
  menuLabel = 'Abrir menu de navegação',
  drawerLabel = 'Menu de navegação',
}: AppShellProps): JSX.Element {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div
      className={cn(
        'flex h-screen w-full overflow-hidden',
        'bg-[var(--surface-base)]',
        className,
      )}
    >
      {/* Rail fixo da Sidebar — só a partir de lg (desktop 1440 intocado).
          Abaixo de lg some do fluxo: o <main> recupera a largura total. */}
      <div className="hidden lg:block shrink-0 h-full overflow-hidden">
        {sidebar}
      </div>

      {/* Drawer mobile (< lg): a MESMA Sidebar off-canvas. Fecha ao navegar
          (clique borbulha do item para o wrapper) e nas vias do Radix. */}
      <Drawer open={menuOpen} onOpenChange={setMenuOpen} title={drawerLabel}>
        <div className="contents" onClick={() => setMenuOpen(false)}>
          {sidebar}
        </div>
      </Drawer>

      {/* Main content — min-w-0 permite encolher abaixo do conteúdo (trava o
          scroll horizontal em mobile: a constraint IMPEDE, não só esconde). */}
      <main className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Barra superior mobile com o hambúrguer — só abaixo de lg. */}
        <div
          className={cn(
            'lg:hidden flex items-center shrink-0',
            'px-[var(--spacing-4)] py-[var(--spacing-3)]',
            'border-b border-b-[var(--border-subtle)]',
          )}
        >
          <IconButton aria-label={menuLabel} onClick={() => setMenuOpen(true)}>
            <Menu aria-hidden />
          </IconButton>
        </div>

        {children}
      </main>
    </div>
  );
}

AppShell.displayName = 'AppShell';

export { AppShell };
