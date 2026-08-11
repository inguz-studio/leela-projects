// =============================================================================
// apps/landing/app/(public)/_perfil/SecaoFeed.tsx
//
// Painel da aba Feed — S1707-T4 · RN-445 · D-ACH-19.
//
// Dois comportamentos, e a diferença entre eles é a honestidade da superfície:
//
//   PREVIEW  → publicações de EXEMPLO, rotuladas como exemplo. É o degrau que a
//              casa já usa em imagem de kit, em patrocinador e em galeria: a
//              mesma função `ehPreview()`, o mesmo princípio de que o slot não
//              some por falta de dado no seed. O veto do dono foi colhido na
//              spec: o feed nasce mockado PARA O TESTER.
//
//   PRODUÇÃO → estado vazio digno. Sem publicação real, a página não inventa
//              conteúdo que o produtor não publicou. É a mesma regra da cascata
//              de imagem: dado real ou nada, nunca um post falso numa página
//              que alguém abre pelo link da bio.
//
// O rótulo de exemplo aparece DUAS vezes de propósito: uma na nota do topo da
// seção e uma em cada publicação. A do topo explica; a de cada card sobrevive a
// um recorte de tela — que é como o mock costuma vazar para fora do contexto.
//
// Composição, curtida, comentário e publicação real não existem aqui: são épico
// futuro (D-ACH-21). Este painel é leitura, e nesta rodada nem isso — é formato.
//
// Server Component puro: `Badge`/`EmptyState` entram pelo subpath server-safe do
// DS (ADR-017), sem boundary de cliente e sem JS de hidratação.
// =============================================================================

import { Badge, Card, EmptyState } from '@leela/design-system/server';
import { ehPreview, FEED_MOCK } from '../../../lib/mockImagem';

export function SecaoFeed(): React.JSX.Element {
  return (
    <section aria-labelledby="perfil-feed">
      <h2 id="perfil-feed" className="sr-only">
        Feed
      </h2>
      {ehPreview() ? <FeedDeExemplo /> : <FeedVazio />}
    </section>
  );
}

/** Produção sem publicação real: estado vazio digno, sem pedir desculpa. */
function FeedVazio(): React.JSX.Element {
  return (
    <Card className="border-border-subtle py-10">
      <EmptyState
        title="Ainda não há publicações"
        description="Quando este organizador publicar, os avisos e bastidores das experiências aparecem aqui."
      />
    </Card>
  );
}

/** Preview: o formato do feed, declarado como exemplo em dois lugares. */
function FeedDeExemplo(): React.JSX.Element {
  return (
    <>
      <p className="text-sm text-text-tertiary">
        Publicações de exemplo — o feed real deste perfil aparece aqui.
      </p>
      <ul className="mt-5 flex flex-col gap-4">
        {FEED_MOCK.map((post) => (
          <li key={post.id}>
            <article className="overflow-hidden rounded-ds-lg border border-border-subtle bg-surface-raised">
              <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
                <Badge variant="neutro">Exemplo</Badge>
                <span className="text-sm text-text-tertiary">{post.quando}</span>
              </div>
              <p className="px-4 pb-4 pt-3 text-base text-text-secondary">{post.texto}</p>
              {post.imagemUrl !== undefined && (
                <div className="relative aspect-[16/9] w-full overflow-hidden border-t border-border-subtle">
                  {/* Decorativa, pela mesma razão da galeria (X1): é imagem de
                      exemplo servida a qualquer perfil, então descrevê-la seria
                      afirmar ao leitor de tela algo que não está na página. */}
                  <img
                    src={post.imagemUrl}
                    alt=""
                    width={1200}
                    height={675}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
