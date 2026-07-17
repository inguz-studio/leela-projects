import { cache } from 'react';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { getEventoPublicado } from '../../../lib/leitor';
import { eventoJsonLd, urlEvento } from '../../../lib/seo';
import { JsonLd } from '../../components/JsonLd';
import { SectionRenderer } from './SectionRenderer';
import { CtaInscricao } from './CtaInscricao';
import { CtaFallback } from './CtaFallback';
import { ShareBlock } from './ShareBlock';

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
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

      {/* Seções orientadas por configuração (ativas, na ordem publicada) */}
      <SectionRenderer evento={evento} />

      {/* Bloco de compartilhamento (URL + QR) — S1201-T3 / RN-201 */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ShareBlock shareUrl={shareUrl} qrSvg={qrSvg} nome={evento.nome} />
      </section>

      {/* CTA persistente colado ao rodapé (Shotgun: CTA amarrado ao lote) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface-raised/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
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
