// =============================================================================
// apps/landing/lib/painel.ts
//
// Endereço do PAINEL do organizador visto de dentro da landing (S1213-T1 · P10).
//
// A landing (Next, site `leela-landing`) e o painel (Vite, site `leela-hub`)
// são dois deploys distintos: o link entre eles é ABSOLUTO e por env pública,
// nunca uma rota relativa (`/entrar` na landing é 404) nem uma URL escrita à
// mão em cada componente que precisar dela.
//
// `NEXT_PUBLIC_PAINEL_URL` é a fonte de verdade — trocar de domínio muda AQUI
// e em nenhum outro lugar. A leitura é ESTÁTICA (`process.env['CHAVE']`
// literal) porque o Next só inlina a env no bundle do browser nessa forma;
// lookup dinâmico viraria `undefined` no cliente e o fallback venceria sempre
// (mesma armadilha que derrubou o CTA de compra na LANDING-EMUPORTS).
//
// O fallback existe para que um build sem env não renderize link morto: é o
// canal LIVE do site do painel no projeto real. Ele é default, não decisão —
// domínio próprio (item 12 do painel de decisões) entra pela env.
// =============================================================================

/** Canal live do site de Hosting do painel no projeto real. */
export const PAINEL_URL_PADRAO = 'https://leela-hub.web.app';

/** Rotas de conta do painel que a landing endereça (S020). */
export type RotaPainel = '/entrar' | '/cadastrar';

/** Base sem barra final — concatenar duas barras quebra o Hosting. */
function baseDoPainel(): string {
  const bruto = process.env['NEXT_PUBLIC_PAINEL_URL'];
  const base = bruto !== undefined && bruto.trim().length > 0 ? bruto.trim() : PAINEL_URL_PADRAO;
  return base.replace(/\/+$/, '');
}

/** URL absoluta de uma rota de conta do painel. */
export function painelUrl(rota: RotaPainel): string {
  return `${baseDoPainel()}${rota}`;
}
