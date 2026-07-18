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
import { CtaInscricao } from './CtaInscricao';
import { CtaFallback } from './CtaFallback';
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
    const titulo = `${perfil.nome} (@${perfil.handle}) · Leela`;
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

  return (
    <div className="pb-24">
      {/* Dados estruturados schema.org/Event (S1205-T1) — no HTML inicial */}
      <JsonLd data={eventoJsonLd(evento)} />

      {/* Seções orientadas por configuração (ativas, na ordem publicada).
          Evento PUBLICADO sem nenhuma seção montada (sem paginaVendas ou tudo
          inativo) cai no HERO MÍNIMO — nome + data + status de vendas, nunca só
          share/QR (LEELA-R1 · JTBD do atleta que recebe o link). */}
      {evento.secoes.length > 0 ? (
        <SectionRenderer evento={evento} />
      ) : (
        <HeroMinimo evento={evento} />
      )}

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
                ? `a partir de R$ ${evento.precoMinimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
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
