import { cache } from 'react';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { getEventoPublicado } from '../../../lib/leitor';
import { getPublicPerfil } from '../../../lib/leitorPerfil';
import { eventoJsonLd, urlEvento, urlPerfil } from '../../../lib/seo';
import { JsonLd } from '../../components/JsonLd';
import { SectionRenderer } from './SectionRenderer';
import { HeroMinimo } from './sections/HeroMinimo';
import { GaleriaSection } from './sections/GaleriaSection';
import { RegulamentoSection } from './sections/RegulamentoSection';
import { OrganizadorSection } from './sections/OrganizadorSection';
import { CtaInscricao } from './CtaInscricao';
import { CtaFallback } from './CtaFallback';
import { RefTracker } from './RefTracker';
import { CupomTracker } from './CupomTracker';
import { CupomLinkBanner } from './sections/CupomLinkBanner';
import { ShareBlock } from './ShareBlock';
import { PerfilView } from '../_perfil/PerfilView';

// ISR: o conteúdo do evento muda pouco (republicação do organizador). Cacheia
// no servidor e revalida periodicamente. A rota é dinâmica por slug e NÃO é
// pré-renderizada no build (sem generateStaticParams) — o primeiro acesso
// renderiza contra o dado real (emulator/prod) e cacheia. A atribuição de
// afiliado (?c=) é preservada no CLIENTE (CtaInscricao/useSearchParams), então
// o HTML cacheado é agnóstico de query e o link é enriquecido na hidratação.
export const revalidate = 300;

// Convenção de tag de revalidação (republicação → revalidateTag) para o hook
// de publicação (fora do escopo deste lote): `event:{slug}`.
export const dynamicParams = true;

interface PageProps {
  params: { eventSlug: string };
}

/** Leitura memoizada por requisição (dedup metadata + render). */
const carregarEvento = cache((slug: string) => getEventoPublicado(slug));
const carregarPerfil = cache((handle: string) => getPublicPerfil(handle));

// ── Rota do PERFIL `/@{handle}` (S1700) ──────────────────────────────────
// O App Router NÃO permite segmentos dinâmicos irmãos com nomes diferentes
// (`[handle]` colidiria com `[eventSlug]`), então a rota do perfil vive NESTE
// segmento e é desambiguada pelo prefixo `@` — que nunca ocorre em slug de
// evento (kebab `a-z0-9-`). PREMISSA registrada no report do lote.
// Convenção de revalidação (par do `event:{slug}`): tag `perfil:{handle}`.

/** Handle (sem `@`) quando o segmento é uma rota de perfil; senão null. */
function handleDoSegmento(segmento: string): string | null {
  let decodificado = segmento;
  try {
    decodificado = decodeURIComponent(segmento);
  } catch {
    return null;
  }
  return decodificado.startsWith('@') ? decodificado.slice(1) : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Perfil `/@{handle}`: metadata própria (RN-161 — `indexavel` ⇒ index;
  // `publica` ⇒ noindex, mesmo contrato RN-140 do S1205-T2).
  const handle = handleDoSegmento(params.eventSlug);
  if (handle !== null) {
    const dados = await carregarPerfil(handle);
    if (dados === null) {
      return { title: 'Perfil não encontrado', robots: { index: false, follow: false } };
    }
    const { perfil } = dados;
    // O sufixo de marca vem do template do layout (`%s · Leela`) para o <title>
    // e do `siteName: 'Leela'` no OpenGraph/Twitter — nunca embutido aqui, senão
    // o <title> duplica ("… · Leela · Leela"). Mesmo contrato da rota de evento
    // (usa `evento.seo.titulo` puro). Bug do reviewer R12 fechado no R14.
    const titulo = `${perfil.nome} (@${perfil.handle})`;
    const descricao =
      perfil.bio ?? `Eventos e clubs de ${perfil.nome} na Leela.`;
    const imagens =
      perfil.imagemUrl !== undefined
        ? [perfil.imagemUrl]
        : perfil.avatarUrl !== undefined
          ? [perfil.avatarUrl]
          : undefined;
    const canonical = `/@${perfil.handle}`;
    return {
      title: titulo,
      description: descricao,
      alternates: { canonical },
      openGraph: {
        title: titulo,
        description: descricao,
        type: 'profile',
        url: canonical,
        siteName: 'Leela',
        locale: 'pt_BR',
        ...(imagens !== undefined ? { images: imagens } : {}),
      },
      twitter: {
        card: imagens !== undefined ? 'summary_large_image' : 'summary',
        title: titulo,
        description: descricao,
        ...(imagens !== undefined ? { images: imagens } : {}),
      },
      robots: { index: perfil.indexavel, follow: true },
    };
  }

  const evento = await carregarEvento(params.eventSlug);
  // Rascunho/inexistente (→ 404): não indexar a rota-fantasma.
  if (evento === null) {
    return { title: 'Evento não encontrado', robots: { index: false, follow: false } };
  }

  const canonical = `/${evento.slug}`;
  // Capa só entra em OG/Twitter quando é URL válida (RN-153/RN-166); sem ela,
  // o card social cai para `summary` — nunca fabricamos imagem.
  const imagens =
    evento.imagemUrl !== undefined && evento.imagemUrl.length > 0 ? [evento.imagemUrl] : undefined;

  return {
    title: evento.seo.titulo,
    description: evento.seo.descricao,
    alternates: { canonical },
    openGraph: {
      title: evento.seo.titulo,
      description: evento.seo.descricao,
      type: 'website',
      url: canonical,
      siteName: 'Leela',
      locale: 'pt_BR',
      ...(imagens !== undefined ? { images: imagens } : {}),
    },
    twitter: {
      card: imagens !== undefined ? 'summary_large_image' : 'summary',
      title: evento.seo.titulo,
      description: evento.seo.descricao,
      ...(imagens !== undefined ? { images: imagens } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function EventoPage({ params }: PageProps): Promise<React.JSX.Element> {
  // Perfil `/@{handle}` (S1700): gate RN-161 no leitor — privada/inexistente
  // ⇒ 404 público honesto, idêntico ao gate de publicação do evento.
  const handle = handleDoSegmento(params.eventSlug);
  if (handle !== null) {
    const dados = await carregarPerfil(handle);
    if (dados === null) {
      notFound();
    }
    const perfilUrl = urlPerfil(dados.perfil.handle);
    const perfilQr = await QRCode.toString(perfilUrl, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    return <PerfilView dados={dados} shareUrl={perfilUrl} qrSvg={perfilQr} />;
  }

  const evento = await carregarEvento(params.eventSlug);

  // GATE de publicação: rascunho/inexistente → 404 público (S1201-T3).
  if (evento === null) {
    notFound();
  }

  const shareUrl = urlEvento(evento.slug);
  const qrSvg = await QRCode.toString(shareUrl, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  const vendaAberta = evento.estadoVenda === 'aberto';

  // Faixa do cupom do link (S1215-T3 · RN-431), logo DEPOIS da Hero. Atrás de
  // Suspense pelo mesmo motivo do RefTracker e do CTA: ela lê a querystring no
  // cliente, então a página do evento continua estática. Quando o cupom não se
  // aplica — ou quando não há cupom nenhum —, o componente devolve `null` e a
  // página fica exatamente como está hoje.
  const faixaCupom = (
    <Suspense fallback={null}>
      <CupomLinkBanner slug={evento.slug} />
    </Suspense>
  );

  return (
    <div className="pb-24">
      {/* Dados estruturados schema.org/Event (S1205-T1) — no HTML inicial */}
      <JsonLd data={eventoJsonLd(evento)} />

      {/* Captura do `?ref=` do link de afiliado (R9-E · RN-313): registra o
          PRIMEIRO clique em localStorage p/ a janela de atribuição do
          checkout. Client-only + useSearchParams → atrás de Suspense (mesmo
          padrão do CtaInscricao); zero efeito no HTML cacheado. */}
      <Suspense fallback={null}>
        <RefTracker slug={evento.slug} />
      </Suspense>

      {/* Captura do cupom do link (S1215-T2 · RN-430): guarda por evento com a
          MESMA disciplina do `?ref=`, para o desconto sobreviver à navegação
          (hoje ele morre no primeiro clique em "regulamento"). Mesmo padrão de
          Suspense — client-only, `useSearchParams`, zero efeito no HTML
          cacheado: a página do evento continua estática. */}
      <Suspense fallback={null}>
        <CupomTracker slug={evento.slug} />
      </Suspense>

      {/* Seções orientadas por configuração (ativas, na ordem publicada).
          Evento PUBLICADO sem nenhuma seção montada (sem paginaVendas ou tudo
          inativo) cai no HERO MÍNIMO — nome + data + status de vendas, nunca só
          share/QR (LEELA-R1 · JTBD do atleta que recebe o link). */}
      {evento.secoes.length > 0 ? (
        <SectionRenderer evento={evento} aposHero={faixaCupom} />
      ) : (
        <>
          <HeroMinimo evento={evento} />
          {faixaCupom}
        </>
      )}

      {/* Regulamento da experiência em MODAL (LP-VENDAS-KIT/T2). Self-gated: some sem
          costura quando o organizador não publicou regulamento (RN-153). */}
      <RegulamentoSection evento={evento} />

      {/* Galeria de imagens de EXEMPLO (LEELA-R12 · Frente 2.4) — só na página
          completa (evento com seções). Assets locais brasa, app-side (RN-153). */}
      {evento.secoes.length > 0 ? <GaleriaSection /> : null}

      {/* "Organizado por" (LEELA-R12 · Frente 3.1) — some sem costura quando não
          há organizador público resolvido. */}
      {evento.organizador !== null ? (
        <OrganizadorSection organizador={evento.organizador} />
      ) : null}

      {/* Bloco de compartilhamento (URL + QR) — S1201-T3 / RN-201. Mesma calha
          (max-w-5xl) e ritmo vertical das demais dobras — sem borda/costura. */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <ShareBlock shareUrl={shareUrl} qrSvg={qrSvg} nome={evento.nome} />
        </div>
      </section>

      {/* CTA persistente colado ao rodapé (Shotgun: CTA amarrado ao lote). Sem
          hairline no topo: uma sombra suave para cima levanta a barra do
          conteúdo (elevação, não linha). */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-surface-raised/95 shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.6)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{evento.nome}</p>
            <p className="text-xs text-text-secondary">
              {vendaAberta && evento.precoMinimo !== null
                ? // A-5/CKFORM-T4: "+ taxa" SÓ quando o evento repassa (RN-347).
                  `a partir de R$ ${evento.precoMinimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${evento.taxaRepassada ? ' + Serviço' : ''}`
                : 'Inscrições encerradas'}
            </p>
          </div>
          <Suspense fallback={<CtaFallback slug={evento.slug} disabled={!vendaAberta} estado={evento.estadoVenda} />}>
            <CtaInscricao slug={evento.slug} disabled={!vendaAberta} estado={evento.estadoVenda} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
