// =============================================================================
// apps/landing/app/(public)/_perfil/PerfilView.tsx
//
// Perfil público / link-in-bio `/@{handle}` — S1700 (Onda 3, organizador-only
// DN-1). Server Component: recebe a projeção pública já gateada pelo leitor
// (sem PII) e renderiza mobile-first, reusando o DS da landing:
//   - hero: capa (CoverImage, mesma fonte de fallback RN-166) + avatar +
//     nome + @handle + bio + links externos (o "link-in-bio" em si);
//   - aba Eventos: CardEvento idêntico à home (gate de publicação já veio
//     do leitor — só publicado/ao_vivo);
//   - aba Clubs: CardEvento com capa do clube (RN-165 — só publica/indexavel;
//     sem página pública de clube ainda ⇒ card sem link, dado real);
//   - Feed: EmptyState honesto (posts são Onda 4 — RN-163; nunca inventar);
//   - compartilhar: ShareBlock reusado (URL + QR — S1700-T3).
// =============================================================================

import { CardEvento, EmptyState } from '../../_ds/ds';
import { CoverImage } from '../../components/CoverImage';
import { ShareBlock } from '../[eventSlug]/ShareBlock';
import { formatarPreco } from '../../../lib/formato';
import { rotuloEstadoVenda } from '../../../lib/estadoVenda';
import type { PerfilPublicoCompleto } from '../../../lib/leitorPerfil';

export function PerfilView({
  dados,
  shareUrl,
  qrSvg,
}: {
  dados: PerfilPublicoCompleto;
  shareUrl: string;
  qrSvg: string;
}): React.JSX.Element {
  const { perfil, eventos, clubes } = dados;
  const inicial = perfil.nome.trim().charAt(0).toUpperCase() || '@';

  return (
    <div className="pb-16">
      {/* ── Hero: capa + identidade ─────────────────────────────────────── */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="relative h-40 w-full overflow-hidden sm:h-56">
          <CoverImage
            src={perfil.imagemUrl}
            alt={`Capa do perfil de ${perfil.nome}`}
          />
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
          <div className="-mt-10 mb-4 flex items-end gap-4 sm:-mt-12">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-surface-sunken bg-surface-overlay shadow-elev-1 sm:h-24 sm:w-24">
              {perfil.avatarUrl !== undefined ? (
                // <img> puro com o mesmo racional do CoverImage (sem
                // allowlist de domínio na V1); alt descritivo.
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

      {/* ── Eventos ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6" aria-labelledby="perfil-eventos">
        <h2 id="perfil-eventos" className="mb-5 font-display text-xl font-bold text-text-primary">
          Eventos
        </h2>
        {eventos.length === 0 ? (
          <div className="rounded-ds-lg border border-border-subtle bg-surface-raised py-10">
            <EmptyState
              title="Nenhum evento publicado"
              description="Quando este organizador publicar uma corrida, ela aparece aqui."
            />
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {eventos.map((ev) => (
              <li key={ev.slug}>
                <CardEvento
                  title={ev.nome}
                  href={`/${ev.slug}`}
                  media={
                    ev.imagemUrl !== undefined ? (
                      <CoverImage src={ev.imagemUrl} alt={`Capa de ${ev.nome}`} />
                    ) : undefined
                  }
                  meta={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{ev.dataLabel}</span>
                      <span aria-hidden className="text-text-tertiary">·</span>
                      <span className="text-text-secondary">{ev.local}</span>
                    </span>
                  }
                  footer={
                    <span className="text-sm text-text-secondary">
                      {ev.estadoVenda === 'aberto' && ev.precoMinimo !== null
                        ? `a partir de ${formatarPreco(ev.precoMinimo)}`
                        : rotuloEstadoVenda(ev.estadoVenda)}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Clubs ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6" aria-labelledby="perfil-clubs">
        <h2 id="perfil-clubs" className="mb-5 font-display text-xl font-bold text-text-primary">
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
                {/* Sem página pública de clube ainda (E12-S1202 pendente) —
                    card informativo sem link, só dado real (RN-165). */}
                <CardEvento
                  title={clube.nome}
                  media={
                    clube.imagemUrl !== undefined ? (
                      <CoverImage src={clube.imagemUrl} alt={`Capa de ${clube.nome}`} />
                    ) : undefined
                  }
                  meta={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{clube.categoria}</span>
                      <span aria-hidden className="text-text-tertiary">·</span>
                      <span className="text-text-secondary">{clube.modalidade}</span>
                    </span>
                  }
                  footer={
                    <span className="text-sm text-text-secondary">
                      {clube.qtdMembrosAtivos === 1
                        ? '1 membro ativo'
                        : `${clube.qtdMembrosAtivos} membros ativos`}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Feed (Onda 4 — RN-163) ──────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6" aria-labelledby="perfil-feed">
        <h2 id="perfil-feed" className="mb-5 font-display text-xl font-bold text-text-primary">
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
