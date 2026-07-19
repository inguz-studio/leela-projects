import { Suspense } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import type { EventoPublico } from '@/lib/tipos';
import { formatarPreco } from '@/lib/formato';
import { CtaInscricao } from '../CtaInscricao';
import { CtaFallback } from '../CtaFallback';
import { SeloModalidade } from './marca';

/**
 * Hero MÍNIMO (LEELA-R1 · fallback JTBD) — mostrado quando um evento PUBLICADO
 * ainda não tem página de vendas montada (nenhuma seção ativa). O atleta que
 * recebe o link precisa saber, no mínimo, O QUE é, QUANDO é e SE dá pra se
 * inscrever — nunca uma página só com share/QR.
 *
 * Genérico de propósito (sem rótulo de categoria fixo como o HeroSection full,
 * que assume "Corrida de rua"): serve corrida, MTB ou retiro igual. Só dado
 * real do leitor; estado de venda é o `estadoVenda` derivado (aberto/esgotado/
 * encerrado), com CTA honesto. Server Component.
 */
export function HeroMinimo({ evento }: { evento: EventoPublico }): React.JSX.Element {
  const aberta = evento.estadoVenda === 'aberto';

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3">
          <SeloModalidade esporte={evento.modalidadeEsporte} />
        </div>
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-5xl">
          {evento.nome}
        </h1>

        <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
            <dt className="sr-only">Quando</dt>
            <dd className="text-text-primary">
              <time dateTime={evento.dataISO}>
                {evento.diaSemanaLabel} · {evento.dataLabel} · {evento.horaLabel}
              </time>
            </dd>
          </div>
          {evento.local.length > 0 ? (
            <div className="flex items-center gap-2">
              <MapPin size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
              <dt className="sr-only">Onde</dt>
              <dd className="text-text-primary">{evento.local}</dd>
            </div>
          ) : null}
        </dl>

        {evento.modalidades.length > 0 ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {evento.modalidades.map((m) => (
              <span
                key={m.nome}
                className="rounded-ds-pill border border-border-default px-3 py-1 text-sm font-semibold text-text-primary"
              >
                {m.nome}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Suspense fallback={<CtaFallback slug={evento.slug} disabled={!aberta} estado={evento.estadoVenda} />}>
            <CtaInscricao slug={evento.slug} disabled={!aberta} estado={evento.estadoVenda} />
          </Suspense>
          {aberta && evento.precoMinimo !== null ? (
            <p className="text-sm text-text-secondary">
              a partir de{' '}
              <span className="font-semibold text-text-primary">
                {formatarPreco(evento.precoMinimo)}
              </span>
              {/* A-5/CKFORM-T4: sublinha condicional pelo flag RN-347. */}
              {evento.taxaRepassada ? (
                <span className="text-text-tertiary"> + taxa de serviço</span>
              ) : null}
            </p>
          ) : (
            <p className="text-sm font-medium text-text-tertiary">
              {evento.estadoVenda === 'esgotado' ? 'Vagas esgotadas' : 'Inscrições encerradas'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
