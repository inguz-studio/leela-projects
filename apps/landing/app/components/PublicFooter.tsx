import Link from 'next/link';

/**
 * Footer público mínimo (S1200-T1). Server Component. Sem links institucionais
 * fabricados: só a marca, uma linha de contexto e o ano corrente.
 */
export function PublicFooter(): React.JSX.Element {
  const ano = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-border-subtle bg-surface-sunken">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-1">
          <Link
            href="/"
            className="font-display text-lg font-extrabold tracking-tight text-text-brand"
          >
            LEELA
          </Link>
          <p className="text-sm text-text-tertiary">
            Inscrições para corridas de rua, sem enrolação.
          </p>
        </div>
        <p className="text-xs text-text-tertiary">© {ano} Leela</p>
      </div>
    </footer>
  );
}
