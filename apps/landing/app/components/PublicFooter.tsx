import Link from 'next/link';

/**
 * Footer público mínimo (S1200-T1 · LEELA-R12). Server Component. Sem links
 * institucionais fabricados: só a marca, uma linha de contexto e o ano corrente.
 *
 * MARCA (R12 — frente do maestro): o wordmark OFICIAL da Leela, variante CREAM
 * (`brand/leela-wordmark-cream.svg`, recolor do wordmark — nunca box; regra do
 * Vitor). Cream (#F0ECD8) é o mark discreto do rodapé — legível sobre o
 * `surface-sunken` dark e com hierarquia menor que o lime do header. `<img>`
 * puro (asset estático local, sem allowlist de domínio), como no PublicHeader.
 */
export function PublicFooter(): React.JSX.Element {
  const ano = new Date().getFullYear();
  return (
    // `data-shell-publico` — ver a nota no `PublicHeader`: é o seletor que a
    // versão imprimível do ingresso usa para sumir com a navegação.
    <footer data-shell-publico className="mt-16 border-t border-border-subtle bg-surface-sunken">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="inline-flex w-fit rounded-ds-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Leela — página inicial"
          >
            <img
              src="/brand/leela-wordmark-cream.svg"
              alt="Leela"
              data-slot="brand-logo"
              className="h-6 w-auto"
            />
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
