import { cache } from 'react';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { getEventoPublicado } from '../../../lib/leitor';
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
  if (evento === null) {
    return { title: 'Evento não encontrado' };
  }
  return {
    title: evento.seo.titulo,
    description: evento.seo.descricao,
    openGraph: {
      title: evento.seo.titulo,
      description: evento.seo.descricao,
      type: 'website',
    },
  };
}

function baseUrl(): string {
  return process.env['NEXT_PUBLIC_LEELA_URL'] ?? 'http://localhost:3000';
}

export default async function EventoPage({ params }: PageProps): Promise<React.JSX.Element> {
  const evento = await carregarEvento(params.eventSlug);

  // GATE de publicação: rascunho/inexistente → 404 público (S1201-T3).
  if (evento === null) {
    notFound();
  }

  const shareUrl = `${baseUrl()}/${evento.slug}`;
  const qrSvg = await QRCode.toString(shareUrl, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  const vendaAberta = evento.estadoVenda === 'aberto';

  return (
    <div className="pb-24">
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
