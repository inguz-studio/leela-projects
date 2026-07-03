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
 * A11y: main landmark para o conteúdo principal.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AppShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AppShell({ sidebar, children, className }: AppShellProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex h-screen w-full overflow-hidden',
        'bg-[var(--surface-base)]',
        className,
      )}
    >
      {/* Sidebar */}
      <div className="shrink-0 h-full overflow-hidden">
        {sidebar}
      </div>

      {/* Main content */}
      <main className="flex flex-col flex-1 h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}

AppShell.displayName = 'AppShell';

export { AppShell };
