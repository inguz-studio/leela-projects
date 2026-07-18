import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Dobra } from './Dobra';
import { TituloSecao } from './marca';
import { AVATAR_MOCK } from '@/lib/mockImagem';
import type { OrganizadorPublico } from '@/lib/tipos';

/**
 * Bloco "Organizado por" (LEELA-R12 · Frente 3.1) — quem assina o evento, com
 * nome + avatar, linkando para a PÁGINA PÚBLICA do organizador (`/@handle`,
 * E17). Só aparece quando há um organizador PÚBLICO resolvido pelo leitor (o
 * `null` some sem costura). Server Component; `<img>` de avatar com fallback
 * de inicial (sem `<img>` quebrado).
 */
export function OrganizadorSection({
  organizador,
}: {
  organizador: OrganizadorPublico;
}): React.JSX.Element {
  const inicial = organizador.nome.trim().charAt(0).toUpperCase() || '@';
  return (
    <Dobra>
      <TituloSecao icone={ArrowRight}>Organizado por</TituloSecao>
      <div className="mt-6">
        <Link
          href={`/@${organizador.handle}`}
          className="group inline-flex items-center gap-4 rounded-ds-lg border border-border-subtle bg-surface-raised p-4 pr-6 transition-colors hover:border-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border-subtle bg-surface-overlay">
            {organizador.avatarUrl !== undefined ? (
              <img
                src={organizador.avatarUrl}
                alt={`Avatar de ${organizador.nome}`}
                className="h-full w-full object-cover"
              />
            ) : (
              // Sem avatarUrl: fundo de marca brasa (mock) + inicial real por
              // cima — slot preenchido, sem placeholder cinza (R12-FIX-MOCKIMG).
              <>
                <img src={AVATAR_MOCK} alt="" aria-hidden className="h-full w-full object-cover" />
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold text-text-primary"
                >
                  {inicial}
                </span>
              </>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-bold text-text-primary">
              {organizador.nome}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-text-brand">
              Ver todos os eventos
              <ArrowRight size={15} strokeWidth={2} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </span>
        </Link>
      </div>
    </Dobra>
  );
}
