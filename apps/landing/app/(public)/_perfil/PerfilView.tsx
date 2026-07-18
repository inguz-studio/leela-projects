// =============================================================================
// apps/landing/app/(public)/_perfil/PerfilView.tsx
//
// Perfil público / link-in-bio `/@{handle}` — S1700 (Onda 3) + LEELA-R12
// (Frente 3): a página do organizador vira um CALENDÁRIO/linha do tempo dos
// eventos, no padrão Luma (https://luma.com/foundersrc):
//   - hero: capa + avatar + nome + @handle + bio + link-in-bio (inalterado);
//   - Próximos eventos: TIMELINE vertical por data (marcador dia/mês + card),
//     mobile-first, brasa/dark; Já aconteceram: mesma linha do tempo, passados
//     em ordem reversa e SEM link (a página do evento encerrado é 404 — honesto);
//   - Patrocinadores: faixa discreta de logos 1:1 com fallback de monograma
//     (adendo do Vitor; some sem estado vazio quando não há patrocinador);
//   - Clubs: cards (RN-165); Feed: EmptyState (Onda 4 — RN-163);
//   - compartilhar: ShareBlock reusado.
//
// Server Component: recebe a projeção já gateada pelo leitor (sem PII). O split
// próximos/passados vem do leitor (`futuro`, relógio do servidor) — a view não
// consulta relógio. Ícones Lucide são server-safe (SVG puro).
// =============================================================================

import { CalendarDays, Handshake, MapPin, Rss, Users } from 'lucide-react';
import { EmptyState } from '../../_ds/ds';
import { CoverImage } from '../../components/CoverImage';
import { ShareBlock } from '../[eventSlug]/ShareBlock';
import { formatarPreco } from '../../../lib/formato';
import { rotuloEstadoVenda } from '../../../lib/estadoVenda';
import type {
  PerfilPublicoCompleto,
  ClubeResumoPublico,
  PatrocinadorPublico,
} from '../../../lib/leitorPerfil';
import type { EventoResumo } from '../../../lib/tipos';

/** Linha da timeline: marcador de data (dia/mês) + card do evento. */
function LinhaEvento({
  ev,
  passado,
}: {
  ev: EventoResumo;
  passado: boolean;
}): React.JSX.Element {
  const precoOuStatus =
    ev.estadoVenda === 'aberto' && ev.precoMinimo !== null
      ? `a partir de ${formatarPreco(ev.precoMinimo)}`
      : rotuloEstadoVenda(ev.estadoVenda);

  // Conteúdo do card. Eventos passados (encerrados) não linkam — a página deles
  // resolve 404 (gate de publicação). Futuros linkam para `/{slug}`.
  const miolo = (
    <div className="flex gap-4">
      <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-ds-md sm:w-24">
        <CoverImage src={ev.imagemUrl} alt={`Capa de ${ev.nome}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold leading-snug text-text-primary sm:text-lg">
          {ev.nome}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
          <MapPin size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
          <span className="truncate">{ev.local}</span>
        </p>
        {ev.modalidades.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ev.modalidades.slice(0, 3).map((m) => (
              <span
                key={m}
                className="rounded-ds-pill border border-border-subtle px-2 py-0.5 text-xs font-semibold text-text-secondary"
              >
                {m}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-sm font-semibold text-text-secondary">{precoOuStatus}</p>
      </div>
    </div>
  );

  return (
    <li className="relative grid grid-cols-[3.25rem_1fr] gap-3 sm:grid-cols-[4rem_1fr] sm:gap-4">
      {/* Marcador de data + nó da timeline */}
      <div className="flex flex-col items-center">
        <div className="flex w-full flex-col items-center rounded-ds-md bg-surface-raised py-1.5 text-center leading-none">
          <span className="font-display text-xl font-extrabold text-text-primary sm:text-2xl">
            {ev.diaLabel}
          </span>
          <span className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-text-brand">
            {ev.mesLabel}
          </span>
        </div>
        {/* Trilho vertical (elemento interno do componente — não é costura de
            dobra; segue a heurística do R7). */}
        <span aria-hidden className="mt-1 w-px flex-1 bg-border-subtle" />
      </div>

      {/* Card */}
      <div className="pb-6">
        {passado ? (
          <div className="rounded-ds-lg border border-border-subtle bg-surface-raised p-3 opacity-80 sm:p-4">
            {miolo}
          </div>
        ) : (
          <a
            href={`/${ev.slug}`}
            className="block rounded-ds-lg border border-border-subtle bg-surface-raised p-3 transition-colors hover:border-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:p-4"
          >
            {miolo}
          </a>
        )}
      </div>
    </li>
  );
}

/** Timeline de uma coleção de eventos, já ordenada. */
function TimelineEventos({
  eventos,
  passado,
}: {
  eventos: EventoResumo[];
  passado: boolean;
}): React.JSX.Element {
  return (
    <ol className="mt-5">
      {eventos.map((ev) => (
        <LinhaEvento key={ev.slug} ev={ev} passado={passado} />
      ))}
    </ol>
  );
}

/** Faixa de patrocinadores — logos 1:1 com fallback de monograma. */
function FaixaPatrocinadores({
  patrocinadores,
}: {
  patrocinadores: PatrocinadorPublico[];
}): React.JSX.Element {
  return (
    <section
      className="mx-auto max-w-3xl px-4 pb-10 sm:px-6"
      aria-labelledby="perfil-patrocinadores"
    >
      <h2
        id="perfil-patrocinadores"
        className="mb-5 flex items-center gap-2 font-display text-xl font-bold text-text-primary"
      >
        <Handshake size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
        Patrocinadores
      </h2>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {patrocinadores.map((p) => (
          <li key={p.nome}>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-ds-md border border-border-subtle bg-surface-raised p-2">
              {p.logoUrl !== undefined ? (
                <img
                  src={p.logoUrl}
                  alt={`Logo de ${p.nome}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                // Fallback digno: monograma da marca (slot pronto p/ a logo).
                <span
                  className="flex h-full w-full flex-col items-center justify-center gap-1 text-center"
                  title={p.nome}
                >
                  <span
                    aria-hidden
                    className="font-display text-2xl font-extrabold text-text-brand"
                  >
                    {p.nome.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                  <span className="line-clamp-1 px-1 text-xs font-semibold text-text-tertiary">
                    {p.nome}
                  </span>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Card de clube (aba Clubs — RN-165). */
function CardClube({ clube }: { clube: ClubeResumoPublico }): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-ds-lg border border-border-subtle bg-surface-raised">
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <CoverImage src={clube.imagemUrl} alt={`Capa de ${clube.nome}`} />
      </div>
      <div className="p-4">
        <p className="font-display text-base font-bold text-text-primary">{clube.nome}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
          <span>{clube.categoria}</span>
          <span aria-hidden className="text-text-tertiary">·</span>
          <span>{clube.modalidade}</span>
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-text-secondary">
          <Users size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
          {clube.qtdMembrosAtivos === 1
            ? '1 membro ativo'
            : `${clube.qtdMembrosAtivos} membros ativos`}
        </p>
      </div>
    </div>
  );
}

export function PerfilView({
  dados,
  shareUrl,
  qrSvg,
}: {
  dados: PerfilPublicoCompleto;
  shareUrl: string;
  qrSvg: string;
}): React.JSX.Element {
  const { perfil, eventos, clubes, patrocinadores } = dados;
  const inicial = perfil.nome.trim().charAt(0).toUpperCase() || '@';

  // Split próximos/passados (relógio do servidor via `futuro`), ordenados por
  // data: futuros ascendente (o mais próximo primeiro), passados descendente.
  const futuros = eventos
    .filter((e) => e.futuro)
    .sort((a, b) => a.dataISO.localeCompare(b.dataISO));
  const passados = eventos
    .filter((e) => !e.futuro)
    .sort((a, b) => b.dataISO.localeCompare(a.dataISO));

  return (
    <div className="pb-16">
      {/* ── Hero: capa + identidade ─────────────────────────────────────── */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="relative h-40 w-full overflow-hidden sm:h-56">
          <CoverImage src={perfil.imagemUrl} alt={`Capa do perfil de ${perfil.nome}`} />
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
          <div className="-mt-10 mb-4 flex items-end gap-4 sm:-mt-12">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-surface-sunken bg-surface-overlay shadow-elev-1 sm:h-24 sm:w-24">
              {perfil.avatarUrl !== undefined ? (
                <img
                  src={perfil.avatarUrl}
                  alt={`Avatar de ${perfil.nome}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-full w-full items-center justify-center font-display text-3xl font-bold text-text-secondary"
                >
                  {inicial}
                </span>
              )}
            </div>
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            {perfil.nome}
          </h1>
          <p className="mt-1 text-sm font-semibold text-text-brand">@{perfil.handle}</p>
          {perfil.bio !== undefined && (
            <p className="mt-3 max-w-2xl text-base text-text-secondary">{perfil.bio}</p>
          )}

          {/* Link-in-bio: os links externos do organizador */}
          {perfil.linksExternos.length > 0 && (
            <ul className="mt-5 flex flex-col gap-2 sm:max-w-md">
              {perfil.linksExternos.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    rel="noopener noreferrer nofollow"
                    target="_blank"
                    className="flex w-full items-center justify-center rounded-ds-pill border border-border-subtle bg-surface-raised px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-border-focus hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Próximos eventos (timeline — padrão Luma) ───────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6" aria-labelledby="perfil-eventos">
        <h2
          id="perfil-eventos"
          className="flex items-center gap-2 font-display text-xl font-bold text-text-primary"
        >
          <CalendarDays size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
          Próximos eventos
        </h2>
        {futuros.length === 0 ? (
          <div className="mt-5 rounded-ds-lg border border-border-subtle bg-surface-raised py-10">
            <EmptyState
              title="Nenhum evento à vista"
              description="Quando este organizador publicar uma corrida, ela aparece aqui na linha do tempo."
            />
          </div>
        ) : (
          <TimelineEventos eventos={futuros} passado={false} />
        )}

        {passados.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
              Já aconteceram
            </h3>
            <TimelineEventos eventos={passados} passado={true} />
          </div>
        )}
      </section>

      {/* ── Patrocinadores (adendo Vitor — some quando vazio) ───────────── */}
      {patrocinadores.length > 0 && <FaixaPatrocinadores patrocinadores={patrocinadores} />}

      {/* ── Clubs ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6" aria-labelledby="perfil-clubs">
        <h2
          id="perfil-clubs"
          className="mb-5 flex items-center gap-2 font-display text-xl font-bold text-text-primary"
        >
          <Users size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
          Clubs
        </h2>
        {clubes.length === 0 ? (
          <div className="rounded-ds-lg border border-border-subtle bg-surface-raised py-10">
            <EmptyState
              title="Nenhum club público"
              description="Os clubs públicos deste organizador aparecem aqui."
            />
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {clubes.map((clube) => (
              <li key={clube.slug}>
                <CardClube clube={clube} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Feed (Onda 4 — RN-163) ──────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6" aria-labelledby="perfil-feed">
        <h2
          id="perfil-feed"
          className="mb-5 flex items-center gap-2 font-display text-xl font-bold text-text-primary"
        >
          <Rss size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
          Feed
        </h2>
        <div className="rounded-ds-lg border border-border-subtle bg-surface-raised py-10">
          <EmptyState
            title="Ainda não há publicações"
            description="As publicações deste perfil aparecem aqui."
          />
        </div>
      </section>

      {/* ── Compartilhar (S1700-T3 — reusa ShareBlock E12) ──────────────── */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6">
        <ShareBlock shareUrl={shareUrl} qrSvg={qrSvg} nome={perfil.nome} />
      </section>
    </div>
  );
}
