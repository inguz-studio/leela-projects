import { Suspense } from 'react';
import type { EventoPublico } from '@/lib/tipos';
import { formatarPreco } from '@/lib/formato';
import { CtaInscricao } from '../CtaInscricao';
import { CtaFallback } from '../CtaFallback';
import { HeroCover } from './HeroCover';

/**
 * Hero da página de evento (S1201-T2): nome, data, local, chip, CTA "Garantir
 * inscrição" e o "a partir de" derivado do preço vigente. A capa usa o
 * `HeroCover`: gradiente de tokens (igual aos cards da home) quando não há URL
 * de capa, e fallback resiliente para o MESMO gradiente se a imagem falhar —
 * nunca um `<img>` quebrado com alt à mostra.
 */
export function HeroSection({ evento }: { evento: EventoPublico }): React.JSX.Element {
  const aberta = evento.estadoVenda === 'aberto';

  return (
    <section className="border-b border-border-subtle bg-surface-sunken">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
        {/* Conteúdo */}
        <div className="order-2 lg:order-1">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-text-brand">
            Corrida de rua
          </p>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-5xl">
            {evento.nome}
          </h1>

          <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <div className="flex items-center gap-2">
              <dt className="font-semibold text-text-secondary">Quando</dt>
              <dd className="text-text-primary">
                <time dateTime={evento.dataISO}>
                  {evento.diaSemanaLabel} · {evento.dataLabel} · {evento.horaLabel}
                </time>
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="font-semibold text-text-secondary">Onde</dt>
              <dd className="text-text-primary">{evento.local}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {evento.modalidades.map((m) => (
              <span
                key={m.nome}
                className="rounded-ds-pill border border-border-default px-3 py-1 text-sm font-semibold text-text-primary"
              >
                {m.nome}
              </span>
            ))}
            {evento.usaChip ? (
              <span className="rounded-ds-pill bg-feedback-info-surface px-3 py-1 text-sm font-medium text-feedback-info-fg">
                Cronometragem por chip
              </span>
            ) : null}
          </div>

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
              </p>
            ) : (
              <p className="text-sm font-medium text-text-tertiary">
                {evento.estadoVenda === 'esgotado' ? 'Vagas esgotadas' : 'Inscrições encerradas'}
              </p>
            )}
          </div>

          {evento.qtdInscritos > 0 ? (
            <p className="mt-4 text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">
                {evento.qtdInscritos.toLocaleString('pt-BR')}
              </span>{' '}
              pessoas já garantiram presença.
            </p>
          ) : null}
        </div>

        {/* Media 16/10 — imagem de capa ou gradiente de tokens */}
        <div className="order-1 lg:order-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-ds-lg shadow-elev-2">
            <HeroCover imagemUrl={evento.imagemUrl} nome={evento.nome} />
            <div className="absolute left-4 top-4 flex flex-col items-center rounded-ds-md bg-surface-overlay px-4 py-2 text-center leading-none shadow-elev-1">
              <span className="font-display text-2xl font-extrabold text-text-primary">
                {evento.dataLabel.split(' ')[0]}
              </span>
              <span className="text-xs font-semibold uppercase text-text-secondary">
                {evento.horaLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
