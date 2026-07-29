import Link from 'next/link';
import { CONTAINER_GUTTER, CONTAINER_LARGURA } from '@/lib/containerPublico';

/**
 * Footer público mínimo (S1200-T1 · LEELA-R12). Server Component. Sem links
 * institucionais fabricados: só a marca, uma linha de contexto e o ano corrente.
 *
 * MARCA (R12 — frente do maestro): o wordmark OFICIAL da Leela, variante CREAM
 * (`brand/leela-wordmark-cream.svg`, recolor do wordmark — nunca box; regra do
 * Vitor). Cream (#F0ECD8) é o mark discreto do rodapé — legível sobre o
 * `surface-sunken` dark e com hierarquia menor que o lime do header. `<img>`
 * puro (asset estático local, sem allowlist de domínio), como no PublicHeader.
 *
 * Achado 14 · C2 (varredura pós-deploy): tinha `max-w-6xl` — mesma classe de
 * divergência de container do header antigo. Passa a consumir
 * `lib/containerPublico`, igual header/Hero/dobras/home.
 * Achado 11 · D-0729-1 · C1 (varredura pós-deploy): a tagline dizia "Inscrições
 * para corridas de rua" — o footer é RENDERIZADO na jornada de compra inteira
 * (mesmo layout do checkout), então estava dentro do escopo do C1 e passou
 * batido na primeira varredura.
 */
export function PublicFooter(): React.JSX.Element {
  const ano = new Date().getFullYear();
  return (
    // `data-shell-publico` — ver a nota no `PublicHeader`: é o seletor que a
    // versão imprimível do ingresso usa para sumir com a navegação.
    <footer
      data-shell-publico
      className={`mt-16 border-t border-border-subtle bg-surface-sunken ${CONTAINER_GUTTER}`}
    >
      <div
        className={`${CONTAINER_LARGURA} flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between`}
      >
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
            Inscrições para eventos de bem-estar, sem enrolação.
          </p>
        </div>
        <p className="text-xs text-text-tertiary">© {ano} Leela</p>
      </div>
    </footer>
  );
}
