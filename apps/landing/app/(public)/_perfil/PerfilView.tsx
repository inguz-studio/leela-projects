// =============================================================================
// apps/landing/app/(public)/_perfil/PerfilView.tsx
//
// Perfil público / link-in-bio `/@{handle}` — S1700 (Onda 3) + LEELA-R12
// (Frente 3): a página do organizador vira um CALENDÁRIO/linha do tempo dos
// eventos, no padrão Luma (https://luma.com/foundersrc):
//   - hero: capa + avatar + nome + @handle + bio + link-in-bio — que em
//     S1707-T2 (RN-444) deixou de ser pílula de texto de largura inteira e
//     virou fileira de ÍCONES, com a rede inferida do endereço;
//   - Próximos eventos: TIMELINE vertical por data (marcador dia/mês + card),
//     mobile-first, brasa/dark; Já aconteceram: mesma linha do tempo, passados
//     em ordem reversa e SEM link (a página do evento encerrado é 404 — honesto);
//   - Patrocinadores: faixa discreta de logos 1:1 com fallback de monograma
//     (adendo do Vitor; some sem estado vazio quando não há patrocinador);
//   - Clubs: cards (RN-165); Feed: EmptyState (Onda 4 — RN-163);
//   - compartilhar: ShareBlock reusado.
//
// S1707-T3 (RN-443): as três seções que se empilhavam viraram as abas Feed ·
// Eventos · Clubs, num menu secundário logo abaixo da identidade. Elas seguem
// RENDERIZADAS AQUI, no servidor, e entram no `Tabs` do design system como
// conteúdo pronto — quem atravessa a fronteira de cliente é só a troca de aba
// (`PerfilTabs`). A faixa de patrocinadores e o bloco de compartilhar ficam
// FORA das abas: não são conteúdo do produtor, são moldura da página.
//
// Server Component: recebe a projeção já gateada pelo leitor (sem PII). O split
// próximos/passados vem do leitor (`futuro`, relógio do servidor) — a view não
// consulta relógio. Ícones Lucide são server-safe (SVG puro).
// =============================================================================

// O `Rss` saiu com a S1707-T3: o título da aba Feed virou `sr-only` (quem
// rotula na tela é a própria aba) e um ícone invisível não tem função.
import { CalendarDays, Handshake, MapPin, Users } from 'lucide-react';
// ADR-017: estático via subpath server-safe do DS (sem boundary de cliente).
import { Card, EmptyState } from '@leela/design-system/server';
import { CoverImage } from '../../components/CoverImage';
import { ShareBlock } from '../[eventSlug]/ShareBlock';
import { formatarPreco } from '../../../lib/formato';
import { rotuloEstadoVenda } from '../../../lib/estadoVenda';
import { AVATAR_MOCK, mockLogoPara } from '../../../lib/mockImagem';
import { IconeRede } from './IconesRede';
import { PerfilTabs } from './PerfilTabs';
import { SecaoFeed } from './SecaoFeed';
import { inferirRede, nomeAcessivelDoLink } from './redes';
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
          <Card className="border-border-subtle p-3 opacity-80 sm:p-4">{miolo}</Card>
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
            <Card className="flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-ds-md border-border-subtle p-3">
              {p.logoUrl !== undefined ? (
                <img
                  src={p.logoUrl}
                  alt={`Logo de ${p.nome}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                // Sem logoUrl: logo 1:1 brasa (mock) + nome — slot preenchido
                // com imagem, sem monograma solto (R12-FIX-MOCKIMG).
                <>
                  <img
                    src={mockLogoPara(p.nome)}
                    alt={`Logo de exemplo de ${p.nome}`}
                    className="min-h-0 w-full flex-1 object-contain"
                  />
                  <span className="line-clamp-1 w-full px-1 text-center text-xs font-semibold text-text-tertiary">
                    {p.nome}
                  </span>
                </>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Card de clube (aba Clubs — RN-165).
 *
 * D-ACH-20: SEM afordância de clique enquanto não existir página pública de
 * clube. Nada de `<a>`, de cursor de link, de realce de foco ou de elevação ao
 * passar o ponteiro. Promover a lista a aba deixou estes cards mais visíveis, e
 * visibilidade que promete um destino inexistente vira frustração. Quando a
 * página de clube nascer, isto vira link numa linha — a regra existe para que
 * ninguém o faça antes disso.
 */
function CardClube({ clube }: { clube: ClubeResumoPublico }): React.JSX.Element {
  return (
    <Card className="overflow-hidden border-border-subtle">
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
    </Card>
  );
}

/**
 * Painel da aba Eventos (S1707-T3). Continua RENDERIZADO NO SERVIDOR: só
 * atravessa a fronteira de cliente como conteúdo pronto.
 *
 * O título interno é "Próximos eventos", que não repete o nome da aba — ele
 * nomeia a primeira das duas listas. As abas Feed e Clubs, cujo único título
 * seria o próprio nome da aba, ficam com título `sr-only`: o leitor de tela e o
 * buscador mantêm a estrutura do documento, e a tela não mostra o mesmo rótulo
 * duas vezes coladas.
 */
function SecaoEventos({
  futuros,
  passados,
}: {
  futuros: EventoResumo[];
  passados: EventoResumo[];
}): React.JSX.Element {
  return (
    <section aria-labelledby="perfil-eventos">
      <h2
        id="perfil-eventos"
        className="flex items-center gap-2 font-display text-xl font-bold text-text-primary"
      >
        <CalendarDays size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
        Próximos eventos
      </h2>
      {futuros.length === 0 ? (
        <Card className="mt-5 border-border-subtle py-10">
          <EmptyState
            title="Nenhum evento à vista"
            description="Quando este organizador publicar uma experiência, ela aparece aqui na linha do tempo."
          />
        </Card>
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
  );
}

/** Painel da aba Clubs (S1707-T3 · RN-165). Cards sem clique — D-ACH-20. */
function SecaoClubs({ clubes }: { clubes: ClubeResumoPublico[] }): React.JSX.Element {
  return (
    <section aria-labelledby="perfil-clubs">
      <h2 id="perfil-clubs" className="sr-only">
        Clubs
      </h2>
      {clubes.length === 0 ? (
        <Card className="border-border-subtle py-10">
          <EmptyState
            title="Nenhum club público"
            description="Os clubs públicos deste organizador aparecem aqui."
          />
        </Card>
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
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-surface-sunken bg-surface-overlay shadow-elev-1 sm:h-24 sm:w-24">
              {perfil.avatarUrl !== undefined ? (
                <img
                  src={perfil.avatarUrl}
                  alt={`Avatar de ${perfil.nome}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                // Sem avatarUrl: fundo de marca brasa (mock) + inicial real por
                // cima — slot preenchido, sem placeholder cinza (R12-FIX-MOCKIMG).
                <>
                  <img src={AVATAR_MOCK} alt="" aria-hidden className="h-full w-full object-cover" />
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center font-display text-3xl font-bold text-text-primary"
                  >
                    {inicial}
                  </span>
                </>
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

          {/* Link-in-bio: os links externos do organizador, agora em ÍCONES
              (S1707-T2 · RN-444). A rede sai do endereço; o rótulo digitado
              vira nome acessível e dica. Alvo de 44px — acima do mínimo da
              WCAG 2.2 (2.5.8), que é o que uma fileira de ícones colados
              costuma perder. */}
          {perfil.linksExternos.length > 0 && (
            <ul className="mt-5 flex flex-wrap items-center gap-2">
              {perfil.linksExternos.map((link) => {
                const nome = nomeAcessivelDoLink(link.label, link.url);
                return (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      rel="noopener noreferrer nofollow"
                      target="_blank"
                      aria-label={nome}
                      title={nome}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-surface-raised text-text-primary transition-colors hover:border-border-focus hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <IconeRede rede={inferirRede(link.url)} />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ── Menu secundário: Feed · Eventos · Clubs (S1707-T3 · RN-443) ─── */}
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <PerfilTabs
          feed={<SecaoFeed />}
          eventos={<SecaoEventos futuros={futuros} passados={passados} />}
          clubs={<SecaoClubs clubes={clubes} />}
        />
      </div>

      {/* ── Patrocinadores (adendo Vitor — some quando vazio) ───────────── */}
      {patrocinadores.length > 0 && <FaixaPatrocinadores patrocinadores={patrocinadores} />}

      {/* ── Compartilhar (S1700-T3 — reusa ShareBlock E12) ──────────────── */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6">
        <ShareBlock shareUrl={shareUrl} qrSvg={qrSvg} nome={perfil.nome} />
      </section>
    </div>
  );
}
