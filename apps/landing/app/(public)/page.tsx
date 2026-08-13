import type { Metadata } from 'next';
import Link from 'next/link';
import { listarEventosPublicados, formatarPreco } from '../../lib/leitor';
import { rotuloEstadoVenda } from '../../lib/estadoVenda';
import { capaDoEvento } from '../../lib/coverEvento';
import type { EstadoVenda } from '../../lib/tipos';
import { marketplaceJsonLd } from '../../lib/seo';
import { CONTAINER_GUTTER, CONTAINER_LARGURA } from '../../lib/containerPublico';
import { JsonLd } from '../components/JsonLd';
import { CoverImage } from '../components/CoverImage';
// ADR-017: estáticos vêm do subpath SERVER-SAFE do DS — renderizam como
// Server Component puro, sem passar pelo boundary 'use client' de `_ds/ds.ts`
// (zero hydration JS para conteúdo sem interatividade).
import { Badge, Card, CardEvento, EmptyState } from '@leela/design-system/server';
import { cn } from '../../lib/utils';
// O CTA da home reescrevia, classe por classe, a MESMA receita de
// `ctaStyles.ts` — a pílula de marketing que o ADR-017 ratificou como
// composição de app (pendência 4: rebasear sobre `buttonVariants` muda visual
// e é decisão do designer). A Onda 1 mata a duplicata importando a receita;
// não redesenha o botão mais caro do produto por conta própria.
import { CTA_BASE, CTA_ENABLED } from './[eventSlug]/ctaStyles';

// Badge de ESTADO na capa (⛔ R14: estado visível por card). Variantes semânticas
// do DS — vitória (verde/aberto), alerta (âmbar/esgotado), neutro (encerrado).
function badgeEstado(estado: EstadoVenda): {
  variant: 'vitoria' | 'alerta' | 'neutro';
  label: string;
} {
  switch (estado) {
    case 'aberto':
      return { variant: 'vitoria', label: 'Inscrições abertas' };
    case 'esgotado':
      return { variant: 'alerta', label: 'Esgotado' };
    case 'encerrado':
      return { variant: 'neutro', label: 'Inscrições encerradas' };
  }
}

/**
 * CTA coerente por estado: o rótulo nomeia o DESTINO do clique.
 *
 * G6 (rodada 2026-08-12-copy-landing): o rótulo aberto era "Inscreva-se" e o
 * card leva a `/{slug}`, que é a página do evento — não o formulário, que vive
 * em `/{slug}/inscricao`. O rótulo prometia o formulário e entregava leitura.
 * "Ver experiência" nomeia o destino real e fala a mesma língua da dobra
 * ("Experiências abertas", D-0802-1); "Ver evento" foi a proposta da review e
 * foi ajustada aqui para não deixar a vitrine e o hero em vocabulários
 * diferentes na mesma tela. O convite fica no botão que realmente inscreve.
 */
function ctaEstado(estado: EstadoVenda): string {
  return estado === 'aberto' ? 'Ver experiência' : 'Ver detalhes';
}

// Home marketplace: listagem viva dos eventos publicados. Renderização
// dinâmica por requisição (SSR) — um evento recém-publicado aparece na hora,
// e o build não precisa do emulator (nada é pré-renderizado). Server
// Component: a leitura (Admin SDK) fica 100% no servidor.
export const dynamic = 'force-dynamic';

// SEO da home (S1205-T1): canonical na raiz + preview social. Título/descrição
// herdam o default do root layout; aqui fixamos canonical e OG/Twitter.
//
// S1256-T3 (rodada 2026-08-12-copy-landing): o preview social dizia "corridas"
// enquanto o rodapé da MESMA resposta HTTP dizia bem-estar. Agora o snippet e a
// página dizem a mesma coisa, e a corrida aparece como instância — nunca como a
// categoria (D-0802-1).
export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Leela',
    locale: 'pt_BR',
    title: 'Leela — inscrições para experiências de bem-estar',
    description:
      'Corrida, pedal, retiro, treino de clube. Ache sua próxima experiência de bem-estar e garanta a vaga em minutos.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leela — inscrições para experiências de bem-estar',
    description:
      'Corrida, pedal, retiro, treino de clube. Ache sua próxima experiência de bem-estar e garanta a vaga em minutos.',
  },
  robots: { index: true, follow: true },
};

export default async function HomePage(): Promise<React.JSX.Element> {
  const eventos = await listarEventosPublicados();

  return (
    <>
      {/* Dados estruturados schema.org/ItemList dos eventos publicados */}
      <JsonLd data={marketplaceJsonLd(eventos)} />
      {/* ── Hero da marca ─────────────────────────────────────────────── */}
      <section className={`border-b border-border-subtle bg-surface-sunken ${CONTAINER_GUTTER}`}>
        <div className={`${CONTAINER_LARGURA} py-16 sm:py-24`}>
          {/* S1256-T1 · a direção do dono, fechada em 12/08: a Leela é um
              ecossistema de experiências de bem-estar, com os 3 pilares
              presentes, e nunca só corridas. O eyebrow declara a categoria
              (D-0802-1), o H1 abre pelos pilares e conserva o esqueleto que já
              estava no ar ("ache sua próxima X e garanta Y em minutos"), e a
              subline nomeia as instâncias que fazem a pessoa se reconhecer em
              três segundos. Os pilares usam as palavras canônicas da RN-114
              (Físico, Mental, Espiritual) para a home falar a mesma língua da
              Arena, do onboarding e das preferências (RN-564).

              M5 pago junto: o travessão que emendava "sem criar conta" saiu, e
              com ele o molde que se repetia na dobra de fechamento do evento. */}
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-text-brand">
            Experiências de bem-estar
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-6xl">
            Físico, mental, espiritual. Ache sua próxima experiência e garanta a
            vaga em minutos.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-text-secondary">
            Corrida, pedal, retiro, treino de clube. Você escolhe a experiência,
            a gente cuida da inscrição, do kit e da retirada. Sem criar conta
            para começar.
          </p>
          <div className="mt-8">
            <Link
              href="#eventos"
              className={cn(CTA_BASE, CTA_ENABLED)}
            >
              Ver experiências
            </Link>
          </div>
        </div>
      </section>

      {/* ── Dobra de eventos ──────────────────────────────────────────── */}
      {/* Calha (achado 14 · C2): gutter no `<section>`, `max-w-5xl` sozinho no
          `<div>` — mesma fonte que o header/Hero/dobras do evento. */}
      <section id="eventos" className={CONTAINER_GUTTER}>
        <div className={`${CONTAINER_LARGURA} py-14`}>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
              Experiências abertas
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {eventos.length > 0
                ? `${eventos.length} ${eventos.length === 1 ? 'experiência disponível' : 'experiências disponíveis'}`
                : 'Nenhuma experiência no ar por enquanto.'}
            </p>
          </div>
        </div>

        {eventos.length === 0 ? (
          <Card className="border-border-subtle py-16">
            <EmptyState
              title="Ainda não há experiências publicadas"
              description="Quando um organizador publicar uma experiência, ela aparece aqui na hora."
            />
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {eventos.map((ev) => (
              <li key={ev.slug}>
                <CardEvento
                  title={ev.nome}
                  href={`/${ev.slug}`}
                  media={
                    <>
                      {/* ⛔ R14: capa SEMPRE renderiza uma imagem mock rica —
                          nunca o gradiente liso do CardEvento (resolução app-side,
                          RN-153 descarta o path relativo do doc). */}
                      <CoverImage src={capaDoEvento(ev)} alt={`Capa de ${ev.nome}`} />
                      <div className="absolute right-[var(--spacing-3)] top-[var(--spacing-3)]">
                        <Badge variant={badgeEstado(ev.estadoVenda).variant}>
                          {badgeEstado(ev.estadoVenda).label}
                        </Badge>
                      </div>
                    </>
                  }
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
                        {ctaEstado(ev.estadoVenda)} →
                      </span>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
        </div>
      </section>
    </>
  );
}
