import type { ReactNode } from 'react';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';

/**
 * Layout público (S1200-T1): header + conteúdo + footer, sem shell de painel.
 * Server Component. O tema `brasa` já vem do <html data-theme> no root layout.
 */
export default function PublicLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-text-primary">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
