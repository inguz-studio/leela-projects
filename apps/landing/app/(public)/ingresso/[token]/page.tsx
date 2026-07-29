// =============================================================================
// apps/landing/app/(public)/ingresso/[token]/page.tsx
//
// Rota `/ingresso/{token}` — a página própria do ingresso (S1214-T2 · RN-418).
//
// Server Component, sem login. Quem recebe o e-mail é o comprador, que
// frequentemente nem é inscrito (ADR-011: o pagador pode ter comprado para a
// família) — exigir conta aqui travaria a página atrás de um épico inteiro.
//
// SEMPRE DINÂMICA (RN-418): o estado exibido muda com cancelamento, estorno e
// credenciamento, então nada de pré-render nem de revalidação em cache.
//
// A PÁGINA NÃO ESCREVE NADA (D-ING-10): abrir ingresso não credencia (RN-399,
// RN-221/222 intactas), não emite (quem cura ausência é a RN-382) e não muda
// estado nenhum.
//
// OS TRÊS CABEÇALHOS DA RN-422 e onde cada um mora:
//   - `noindex, nofollow` — aqui, no `metadata.robots` (vira `<meta name=
//     "robots">` E `X-Robots-Tag` pelo `next.config.js`), mais o `disallow` no
//     `robots.txt`. Sem isso, buscador indexa ingresso de gente;
//   - `Referrer-Policy: no-referrer` — no `next.config.js`, por rota. Sem isso
//     o token sai no `Referer` de todo link de saída;
//   - `Cache-Control: no-store` — idem. O token está na URL: CDN e proxy não
//     podem guardar a resposta.
// Os dois últimos são cabeçalhos de RESPOSTA e não têm como sair de dentro de
// um Server Component; por isso a rota está declarada no `headers()` do
// `next.config.js`, com o comentário apontando para cá.
// =============================================================================

import type { Metadata } from 'next';
import { buscarIngressoPorLink } from '../../../../lib/ingresso';
import {
  IngressoIndisponivel,
  IngressoNaoEncontrado,
  IngressoView,
} from './IngressoView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Fora do índice, sempre. O título é genérico DE PROPÓSITO: título com nome de
// pessoa vaza no histórico do navegador e na aba compartilhada em tela.
export const metadata: Metadata = {
  title: 'Seu ingresso · Leela',
  robots: { index: false, follow: false, nocache: true },
};

interface Props {
  params: { token: string };
}

export default async function IngressoPage({ params }: Props): Promise<React.JSX.Element> {
  // O token vem do path, então o Next já o entregou decodificado. Nenhum
  // parse/verificação acontece aqui: a chave mora na Function (D-ING-3).
  const resultado = await buscarIngressoPorLink(params.token);

  return (
    <div className="px-[var(--spacing-4)] py-[var(--spacing-10)] sm:px-[var(--spacing-6)]">
      {resultado.situacao === 'ok' ? (
        <IngressoView ingresso={resultado.ingresso} />
      ) : resultado.situacao === 'indisponivel' ? (
        <IngressoIndisponivel />
      ) : (
        <IngressoNaoEncontrado />
      )}

      {resultado.situacao === 'ok' ? (
        <p className="mx-auto mt-[var(--spacing-6)] w-full max-w-2xl text-center text-sm">
          <a
            href={`/ingresso/${encodeURIComponent(params.token)}/imprimir`}
            className="font-medium text-text-secondary underline underline-offset-4 hover:text-text-primary"
          >
            Versão para imprimir
          </a>
        </p>
      ) : null}
    </div>
  );
}
