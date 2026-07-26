import { Suspense } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import type { EventoPublico } from '@/lib/tipos';
import { formatarPreco } from '@/lib/formato';
import { CtaInscricao } from '../CtaInscricao';
import { CtaFallback } from '../CtaFallback';
import { CoverImage } from '@/app/components/CoverImage';
import { HeroCover } from './HeroCover';
import { capaDoEvento } from '@/lib/coverEvento';
import { SeloModalidade } from './marca';

/**
 * Hero da página de evento (S1201-T2 · LEELA-R7 · R12): nome, MODALIDADE
 * esportiva em destaque, data, local, percursos, CTA "Garantir inscrição" e o
 * "a partir de" derivado do preço vigente.
 *
 * LEELA-R12 (Frente 1/2): eyebrow de categoria hardcoded ("Corrida de rua")
 * virou o SELO da modalidade real do evento (com ícone de apoio); os fatos
 * Quando/Onde ganham ícones Lucide; o badge "Cronometragem por chip" e a prova
 * social "N pessoas garantiram presença" foram removidos (pedidos do Vitor —
 * dado de inscritos preservado no tipo, só não exibido).
 *
 * A MESMA capa aparece duas vezes (pedido do brief): NÍTIDA no painel de mídia
 * (`HeroCover`) e BORRADA como plano de fundo do hero inteiro (`filter: blur`
 * em camada própria + overlay de escurecimento p/ contraste AA do texto). Sem
 * capa do organizador, ambas caem na capa mock local (`resolverCapa`). A camada
 * de fundo é `absolute` (fora do fluxo) e o painel de mídia reserva `aspect`
 * fixo — zero CLS. Sem borda e sem troca de fundo: o hero funde na próxima dobra
 * por um gradiente do MESMO eixo dark (zero linha na divisória).
 */
export function HeroSection({ evento }: { evento: EventoPublico }): React.JSX.Element {
  const aberta = evento.estadoVenda === 'aberto';
  // Capa do hero: FOTO temática por evento (T1) — mesma resolução dos cards da
  // home (`capaDoEvento`), unificada. Capa http(s) do organizador tem precedência;
  // sem ela, a foto mock do tema (nome + percursos). Nunca gradiente liso.
  const capa = capaDoEvento({
    nome: evento.nome,
    modalidades: evento.modalidades.map((m) => m.nome),
    ...(evento.imagemUrl !== undefined ? { imagemUrl: evento.imagemUrl } : {}),
  });

  return (
    <section className="relative isolate overflow-hidden">
      {/* Plano de fundo: MESMA capa, borrada + escurecida p/ AA. aria-hidden e
          alt vazio — é decoração; o conteúdo abaixo carrega a informação. */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {/* Via CoverImage: se a capa REAL do organizador falhar em runtime, cai
            no gradiente de tokens (nunca `<img>` quebrado atrás do overlay). */}
        <CoverImage src={capa} alt="" className="h-full w-full scale-110 object-cover blur-2xl opacity-50" />
        {/* Escurecimento base — garante contraste AA do texto sobre a imagem */}
        <div className="absolute inset-0 bg-surface-base/80" />
        {/* Reforço lateral no lado do texto (esquerda) */}
        <div className="absolute inset-0 bg-gradient-to-r from-surface-base/80 via-surface-base/40 to-transparent" />
        {/* Fade inferior: funde no surface-base da próxima dobra, sem linha */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-surface-base" />
      </div>

      <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
        {/* Conteúdo */}
        <div className="order-2 lg:order-1">
          <div className="mb-3">
            <SeloModalidade esporte={evento.modalidadeEsporte} />
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-5xl">
            {evento.nome}
          </h1>

          <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-base">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
              <dt className="sr-only">Quando</dt>
              <dd className="text-text-primary">
                <time dateTime={evento.dataISO}>
                  {evento.diaSemanaLabel} · {evento.dataLabel} · {evento.horaLabel}
                </time>
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={18} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
              <dt className="sr-only">Onde</dt>
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
                {/* A-5/CKFORM-T4: sublinha SÓ quando o evento repassa a taxa
                    (RN-347 — flag do leitor; nunca o percentual do tenant). */}
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

        {/* Media 16/10 — capa NÍTIDA (mesma imagem do fundo borrado) */}
        <div className="order-1 lg:order-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-ds-lg shadow-elev-2">
            <HeroCover src={capa} nome={evento.nome} />
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
