import Link from 'next/link';
import { listarEventosPublicados, formatarPreco } from '../../lib/leitor';
import { rotuloEstadoVenda } from '../../lib/estadoVenda';
import { CardEvento, EmptyState } from '../_ds/ds';

// Home marketplace: listagem viva dos eventos publicados. Renderização
// dinâmica por requisição (SSR) — um evento recém-publicado aparece na hora,
// e o build não precisa do emulator (nada é pré-renderizado). Server
// Component: a leitura (Admin SDK) fica 100% no servidor.
export const dynamic = 'force-dynamic';

export default async function HomePage(): Promise<React.JSX.Element> {
  const eventos = await listarEventosPublicados();

  return (
    <>
      {/* ── Hero da marca ─────────────────────────────────────────────── */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-text-brand">
            Corrida de rua
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-6xl">
            Ache sua próxima corrida e garanta a inscrição em minutos.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-text-secondary">
            Percurso, kit e retirada num lugar só. Você escolhe a distância, a
            gente cuida do resto — sem criar conta para começar.
          </p>
          <div className="mt-8">
            <Link
              href="#eventos"
              className="inline-flex items-center gap-2 rounded-ds-pill bg-action-primary px-6 py-3 text-base font-semibold text-action-primary-fg transition-colors hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Ver eventos
            </Link>
          </div>
        </div>
      </section>

      {/* ── Dobra de eventos ──────────────────────────────────────────── */}
      <section id="eventos" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
              Eventos abertos
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {eventos.length > 0
                ? `${eventos.length} ${eventos.length === 1 ? 'evento disponível' : 'eventos disponíveis'}`
                : 'Nenhum evento no ar por enquanto.'}
            </p>
          </div>
        </div>

        {eventos.length === 0 ? (
          <div className="rounded-ds-lg border border-border-subtle bg-surface-raised py-16">
            <EmptyState
              title="Ainda não há eventos publicados"
              description="Quando um organizador publicar uma corrida, ela aparece aqui na hora."
            />
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {eventos.map((ev) => (
              <li key={ev.slug}>
                <CardEvento
                  title={ev.nome}
                  href={`/${ev.slug}`}
                  modality={
                    <span className="inline-flex flex-col items-center rounded-ds-md bg-surface-overlay px-3 py-1.5 text-center leading-none shadow-elev-1">
                      <span className="font-display text-lg font-bold text-text-primary">
                        {ev.diaLabel}
                      </span>
                      <span className="text-xs font-semibold uppercase text-text-secondary">
                        {ev.mesLabel}
                      </span>
                    </span>
                  }
                  meta={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{ev.local}</span>
                      <span aria-hidden className="text-text-tertiary">
                        ·
                      </span>
                      <span className="text-text-secondary">
                        {ev.modalidades.join(' · ')}
                      </span>
                    </span>
                  }
                  footer={
                    <span className="flex items-center justify-between">
                      {ev.estadoVenda === 'aberto' && ev.precoMinimo !== null ? (
                        <span className="text-sm text-text-secondary">
                          a partir de{' '}
                          <span className="font-semibold text-text-primary">
                            {formatarPreco(ev.precoMinimo)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-text-tertiary">
                          {rotuloEstadoVenda(ev.estadoVenda)}
                        </span>
                      )}
                      <span
                        aria-hidden
                        className="text-sm font-semibold text-text-brand"
                      >
                        Ver →
                      </span>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
