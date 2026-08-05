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
import { estadoMostraQr } from '@leela/core';
import { buttonVariants } from '@leela/design-system/server';
import { buscarIngressoPorLink } from '../../../../lib/ingresso';
import { cn } from '../../../../lib/utils';
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
        <div className="mx-auto mt-[var(--spacing-6)] flex w-full max-w-2xl flex-col items-center gap-[var(--spacing-4)]">
          {/* O BOTÃO SÓ EXISTE ONDE O QR EXISTE (RN-473 sobre RN-421). Nos cinco
              estados sem QR ele não é renderizado — e quem chegar na rota do
              arquivo mesmo assim volta para cá, onde o estado é lido de novo.

              É `<a href>` DE VERDADE, não `<button>` com JavaScript: link
              nativo é focável por teclado, abre com Enter, aceita ctrl+clique e
              "copiar endereço", funciona sem JavaScript e mantém esta rota com
              ZERO cliente. Quem força o download é o `Content-Disposition` do
              servidor; o atributo `download` entra como reforço, nunca como o
              mecanismo. Sem indicador próprio de progresso, pelo mesmo motivo:
              é trade-off declarado na spec (PDF-5), e quem dá o retorno visual
              é o indicador de download do navegador.

              `aria-label` com o texto visível DENTRO dele e na mesma ordem —
              é o que satisfaz o critério de rótulo no nome (WCAG 2.5.3) em vez
              de quebrá-lo. Altura `lg` = 48px de alvo de toque (o mínimo é 44),
              e o anel de foco vem do token do DS. */}
          {estadoMostraQr(resultado.ingresso.estado) ? (
            <a
              href={`/ingresso/${encodeURIComponent(params.token)}/pdf`}
              download
              aria-label="Salvar ingresso como PDF"
              data-testid="ingresso-baixar-pdf"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'w-full sm:w-auto')}
            >
              Salvar como PDF
            </a>
          ) : null}

          <p className="text-center text-sm">
            <a
              href={`/ingresso/${encodeURIComponent(params.token)}/imprimir`}
              className="font-medium text-text-secondary underline underline-offset-4 hover:text-text-primary"
            >
              Versão para imprimir
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}
