import Link from 'next/link';

/**
 * Header público (S1200-T1). Server Component. Sem navegação de painel
 * (sidebar/breadcrumb ficam no app do organizador).
 *
 * MARCA: a logo da Leela ainda não chegou. Usamos um wordmark textual "LEELA"
 * (fonte display do tema) como placeholder. O <span data-slot="brand-logo"> é
 * o ponto exato de troca: substituir o texto por <Image src="/logo-leela.svg">
 * quando o ativo existir, sem tocar em mais nada.
 */
export function PublicHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-base/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-ds-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          aria-label="Leela — página inicial"
        >
          {/* slot de troca da logo — ver docstring */}
          <span
            data-slot="brand-logo"
            className="font-display text-2xl font-extrabold tracking-tight text-text-brand"
          >
            LEELA
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Ações">
          <Link
            href="/"
            className="rounded-ds-sm px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Eventos
          </Link>
          <span
            className="hidden rounded-ds-pill border border-border-default px-3 py-1.5 text-sm font-medium text-text-tertiary sm:inline-block"
            title="Em breve"
          >
            Baixar o app
          </span>
        </nav>
      </div>
    </header>
  );
}
