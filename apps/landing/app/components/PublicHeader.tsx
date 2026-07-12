import Link from 'next/link';

/**
 * Header público (S1200-T1). Server Component. Sem navegação de painel
 * (sidebar/breadcrumb ficam no app do organizador).
 *
 * MARCA: wordmark oficial da Leela — variante verde-limão sobre transparente
 * (exportada do Figma `112:51`/`112:5`), que casa com o tema `brasa` (dark) do
 * header. SVG em `/leela-logo-brasa.svg` (public). `<img>` puro (não next/image)
 * porque é asset estático local sem allowlist de domínio.
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
          <img
            src="/leela-logo-brasa.svg"
            alt="Leela"
            data-slot="brand-logo"
            className="h-7 w-auto"
          />
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
