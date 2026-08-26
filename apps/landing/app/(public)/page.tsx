import type { Metadata } from 'next';
import Link from 'next/link';
import { listarEventosPublicados, formatarPreco } from '../../lib/leitor';
import { rotuloEstadoVenda } from '../../lib/estadoVenda';
import { capaDoEvento } from '../../lib/coverEvento';
import { destaqueDaVitrine } from '../../lib/ordemVitrine';
import { cidadesDaVitrine } from '../../lib/fatosVitrine';
import type { EstadoVenda, EventoResumo } from '../../lib/tipos';
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

/**
 * Painel de DESTAQUE do hero (rodada awwwards-20260826).
 *
 * O que ele resolve: em 1440px o hero da home era uma laje de texto com a
 * metade direita vazia — numa plataforma de esporte, a primeira dobra não tinha
 * uma foto, enquanto a dobra logo abaixo estava cheia delas. O padrão que as
 * seis referências premiadas do nicho compartilham (01-research §2, padrões 2,
 * 4 e 5) é o oposto: UMA próxima coisa, com foto de gente real e um número que
 * dá para conferir.
 *
 * O dado é VIVO e já estava na página: é o primeiro evento aberto e futuro da
 * vitrine já ordenada (`destaqueDaVitrine`). Sem evento aberto, o painel não
 * renderiza e o hero volta a uma coluna — slot sem dado não vira slot com dado
 * inventado.
 *
 * ⚠️ O rótulo do botão continua nomeando o DESTINO ("Ver experiência"), e não o
 * ato ("Garantir vaga"), porque este painel leva a `/{slug}`, que é a página do
 * evento. Prometer inscrição e entregar leitura é exatamente o achado G6, já
 * pago uma vez na vitrine — o preço vem COLADO ao rótulo, que é o ganho de
 * conversão que a referência pede, sem a promessa que a página não cumpre.
 */
function DestaqueHero({ evento }: { evento: EventoResumo }): React.JSX.Element {
  const estado = badgeEstado(evento.estadoVenda);
  return (
    <Link
      href={`/${evento.slug}`}
      className="group relative block overflow-hidden rounded-ds-xl shadow-elev-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[16/9] lg:aspect-[4/3]">
        {/* Acima da dobra = LCP: eager, com dimensão intrínseca (zero CLS). */}
        <CoverImage
          src={capaDoEvento(evento)}
          alt={`Capa de ${evento.nome}`}
          priority
          width={1600}
          height={838}
          className="h-full w-full object-cover transition-transform duration-slow ease-ds-default motion-safe:group-hover:scale-105"
        />
        {/* Véu de legibilidade em TRÊS camadas, e não em uma. A capa é foto de
            pôr do sol: a faixa mais clara da imagem cai exatamente onde o texto
            se apoia, e um único gradiente deixava o eyebrow em ~2:1 sobre o sol.
            Camadas de cor de token + `opacity-*` (nunca `from-surface-base/95`,
            que o Tailwind descarta — nota longa no `HeroSection`) empilham-se
            multiplicativamente e dão base sólida sem apagar a foto:
              1. escurecimento geral leve, para o selo do topo respirar;
              2. gradiente longo, que constrói a base;
              3. gradiente curto, que sela o rodapé onde o texto de fato mora. */}
        <div aria-hidden className="absolute inset-0 bg-surface-base opacity-25" />
        {/* 1b. Véu do TOPO — o céu da capa é a região mais clara da foto e é
            exatamente onde o selo e o eyebrow se apoiam. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-surface-base to-transparent opacity-70"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-surface-base to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-surface-base to-transparent opacity-90"
        />

        {/* Selo e eyebrow no TOPO (e não colados ao bloco de texto): ali a foto
            é céu, o contraste é folgado, e o rodapé fica livre para o que
            decide o clique — data, nome, lugar e preço. */}
        <div className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 p-5 sm:p-6">
          <Badge variant={estado.variant}>{estado.label}</Badge>
          <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
            Próxima experiência
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          {/* O número dominante do bloco (01-research, padrão 5) — a data em
              escala display, o mesmo primitivo visual que o card de evento usa
              na capa, aqui em outro degrau de tamanho. */}
          <span className="flex shrink-0 flex-col items-center leading-none">
            <span className="font-display text-4xl font-extrabold text-text-primary sm:text-5xl">
              {evento.diaLabel}
            </span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-text-brand">
              {evento.mesLabel}
            </span>
          </span>
          <h2 className="min-w-0 font-display text-2xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-3xl">
            {evento.nome}
          </h2>
        </div>

        <p className="text-sm text-text-secondary">
          {evento.local}
          {evento.modalidades.length > 0 ? (
            <>
              <span aria-hidden className="px-2 text-text-tertiary">
                ·
              </span>
              {evento.modalidades.join(' · ')}
            </>
          ) : null}
        </p>

        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-semibold text-text-brand">
            {ctaEstado(evento.estadoVenda)}
            <span
              aria-hidden
              className="ml-1 inline-block transition-transform duration-fast ease-ds-default motion-safe:group-hover:translate-x-1"
            >
              →
            </span>
          </span>
          {evento.precoMinimo !== null ? (
            <span className="text-sm text-text-secondary">
              a partir de{' '}
              <span className="font-semibold text-text-primary">
                {formatarPreco(evento.precoMinimo)}
              </span>
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}

/**
 * Faixa de FATOS da vitrine (rodada awwwards-20260826).
 *
 * Prova social acima da dobra aparece em cinco das referências levantadas
 * (01-research, padrão 2) e não existia em lugar nenhum da landing. A régua da
 * casa, porém, é "sem dado → sem seção": nada aqui é depoimento, logo de
 * parceiro nem "milhares de atletas". São TRÊS contagens derivadas, na hora, da
 * mesma lista que a página já leu — quem quiser conferir rola vinte pixels e
 * conta os cards.
 *
 * Sem evento nenhum publicado, a faixa não renderiza: três zeros seriam uma
 * afirmação pior que o silêncio.
 */
function FatosDaVitrine({ eventos }: { eventos: EventoResumo[] }): React.JSX.Element | null {
  if (eventos.length === 0) return null;

  const abertas = eventos.filter((e) => e.estadoVenda === 'aberto').length;
  const cidades = cidadesDaVitrine(eventos).length;
  const modalidades = new Set(eventos.flatMap((e) => e.modalidades)).size;

  const fatos: { valor: number; rotulo: string }[] = [
    { valor: abertas, rotulo: abertas === 1 ? 'inscrição aberta' : 'inscrições abertas' },
    { valor: cidades, rotulo: cidades === 1 ? 'cidade' : 'cidades' },
    { valor: modalidades, rotulo: modalidades === 1 ? 'modalidade' : 'modalidades' },
  ];

  return (
    <section className={CONTAINER_GUTTER} aria-label="A vitrine em números">
      <div className={CONTAINER_LARGURA}>
        <dl className="revela-ao-rolar grid grid-cols-3 gap-3 sm:gap-4">
          {fatos.map((f) => (
            <Card key={f.rotulo} className="border-border-subtle p-4 text-center sm:p-6">
              <dt className="sr-only">{f.rotulo}</dt>
              <dd>
                <span className="block font-display text-3xl font-extrabold leading-none text-text-primary sm:text-4xl">
                  {f.valor}
                </span>
                <span className="mt-2 block text-xs font-semibold uppercase tracking-widest text-text-secondary sm:text-sm sm:normal-case sm:tracking-normal">
                  {f.rotulo}
                </span>
              </dd>
            </Card>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default async function HomePage(): Promise<React.JSX.Element> {
  const eventos = await listarEventosPublicados();
  const destaque = destaqueDaVitrine(eventos);

  return (
    <>
      {/* Dados estruturados schema.org/ItemList dos eventos publicados */}
      <JsonLd data={marketplaceJsonLd(eventos)} />
      {/* ── Hero da marca ─────────────────────────────────────────────── */}
      {/* A laje `bg-surface-sunken` + `border-b` saiu (rodada
          awwwards-20260826): a home passa a fluir sobre o MESMO `surface-base`
          das dobras do evento, que é a decisão de "zero linhas, zero costuras"
          que o dono já tinha tomado uma vez e que só a página de evento estava
          cumprindo. A profundidade vem de luz, não de caixa. */}
      <section className={`relative isolate overflow-hidden ${CONTAINER_GUTTER}`}>
        {/* Atmosfera da marca: as radiais de brasa/vinho que o tema `brasa` já
            define em `--glass-page-glow` e que a landing nunca consumiu.
            Profundidade sem WebGL, sem asset novo e sem cor nova. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-80 [background:var(--glass-page-glow)]"
        />
        {/* Fade inferior: funde na dobra seguinte sem hairline. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-b from-transparent to-surface-base"
        />
        <div
          className={`${CONTAINER_LARGURA} grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-24`}
        >
          <div>
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
                com ele o molde que se repetia na dobra de fechamento do evento.

                ⛔ Copy INTOCADA na rodada awwwards-20260826: direção visual não
                reescreve decisão de marca do dono. */}
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-text-brand">
              Experiências de bem-estar
            </p>
            {/* A escala parou em `sm:text-5xl` de propósito. Em `lg` a coluna de
                texto passa a dividir a calha com o painel de destaque (~500px),
                e o degrau `text-6xl` que servia à coluna inteira quebrava o H1
                em cinco linhas de duas palavras. */}
            <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-5xl">
              Físico, mental, espiritual. Ache sua próxima experiência e garanta a
              vaga em minutos.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-text-secondary">
              Corrida, pedal, retiro, treino de clube. Você escolhe a experiência,
              a gente cuida da inscrição, do kit e da retirada. Sem criar conta
              para começar.
            </p>
            <div className="mt-8">
              <Link href="#eventos" className={cn(CTA_BASE, CTA_ENABLED)}>
                Ver experiências
              </Link>
            </div>
          </div>

          {destaque !== null ? <DestaqueHero evento={destaque} /> : null}
        </div>
      </section>

      <FatosDaVitrine eventos={eventos} />

      {/* ── Dobra de eventos ──────────────────────────────────────────── */}
      {/* Calha (achado 14 · C2): gutter no `<section>`, `max-w-5xl` sozinho no
          `<div>` — mesma fonte que o header/Hero/dobras do evento. */}
      <section id="eventos" className={CONTAINER_GUTTER}>
        <div className={`${CONTAINER_LARGURA} py-14`}>
          <div className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-brand">
              Vitrine
            </p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
              Experiências abertas
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              {eventos.length > 0
                ? `${eventos.length} ${eventos.length === 1 ? 'experiência disponível' : 'experiências disponíveis'}`
                : 'Nenhuma experiência no ar por enquanto.'}
            </p>
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
                <li key={ev.slug} className="revela-ao-rolar flex">
                  <CardEvento
                    // Altura UNIFORME na grade. O `CardEvento` nasce `block`, e
                    // com `meta` de duas linhas (local + modalidades longos) o
                    // rodapé de cada card parava numa altura diferente: a grade
                    // ficava serrilhada e o preço de cada experiência aparecia
                    // num lugar distinto da fileira. As duas variantes fazem o
                    // CORPO do card crescer e o RODAPÉ colar na base, sem tocar
                    // no átomo do DS.
                    //
                    // ⚠️ O lugar certo disso é o átomo, não a tela: a peça
                    // proposta (`CardEvento` com `fill`) está registrada no
                    // 02-direcao-visual §4 e no backlog do DS. Enquanto ela não
                    // existe, isto fica aqui — com o porquê escrito, para não
                    // virar mágica copiada na próxima tela.
                    className="h-full [&>div:last-child]:flex-1 [&>div:last-child>*:last-child]:mt-auto flex flex-col"
                    title={ev.nome}
                    href={`/${ev.slug}`}
                    media={
                      <>
                        {/* ⛔ R14: capa SEMPRE renderiza uma imagem mock rica —
                            nunca o gradiente liso do CardEvento (resolução app-side,
                            RN-153 descarta o path relativo do doc). */}
                        <CoverImage
                          src={capaDoEvento(ev)}
                          alt={`Capa de ${ev.nome}`}
                          className="h-full w-full object-cover transition-transform duration-slow ease-ds-default motion-safe:group-hover:scale-105"
                        />
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
                      <span className="flex items-center justify-between border-t border-border-subtle pt-3">
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
                          className="flex items-center gap-1 text-sm font-semibold text-text-brand"
                        >
                          {ctaEstado(ev.estadoVenda)}
                          <span className="inline-block transition-transform duration-fast ease-ds-default motion-safe:group-hover:translate-x-1">
                            →
                          </span>
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
