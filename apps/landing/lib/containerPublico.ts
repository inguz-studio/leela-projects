// =============================================================================
// Container público único (DEC-0729 · achado 14 · C2) — fonte ÚNICA das classes
// de largura/gutter que header, hero e dobras do evento devem compartilhar.
//
// Achado do dono: "header e Hero com padding/borda menores, dobras do evento
// mais largas — larguras de container divergem". Causa raiz confirmada por
// leitura: NÃO era só um número diferente — eram DUAS composições distintas
// coexistindo com o MESMO valor nominal `max-w-5xl`:
//   - `Dobra.tsx` (canônico): padding no elemento EXTERNO (`<section>`),
//     `max-w-5xl` sozinho no `<div>` interno — o filho `mx-auto` centraliza
//     dentro da viewport inteira, então o padding do pai não desloca o
//     conteúdo (em telas ≥1024px o `max-w` já é o fator dominante).
//   - `HeroSection.tsx` (divergente): padding e `max-w-5xl` no MESMO elemento
//     — o padding passa a morder PARA DENTRO da caixa já centralizada, então
//     o conteúdo do Hero nasce ~16-32px mais recuado que o das dobras vizinhas,
//     mesmo usando o "mesmo" `max-w-5xl`.
//   - `PublicHeader.tsx` (divergente): `max-w-6xl` (mais largo que o padrão do
//     evento) + a mesma composição de padding-no-mesmo-elemento, e sem o
//     degrau `lg:px-8` que as dobras têm.
//
// Fix: DUAS classes exportadas, para os DOIS papéis que nunca podem morar no
// mesmo elemento:
//   - `CONTAINER_GUTTER` — vai no elemento de largura TOTAL (a calha).
//   - `CONTAINER_LARGURA` — vai no filho `mx-auto`, SEM padding próprio.
// Todo consumidor novo de container público usa as duas, nunca hardcoda
// `max-w-*`/`px-*` de novo (G-001-like: zero container reinventado por tela).
// =============================================================================

/** Gutter horizontal do container público — vai no elemento de largura TOTAL. */
export const CONTAINER_GUTTER = 'px-4 sm:px-6 lg:px-8';

/** Largura máxima do container público — vai no filho `mx-auto`, sem padding. */
export const CONTAINER_LARGURA = 'mx-auto w-full max-w-5xl';
