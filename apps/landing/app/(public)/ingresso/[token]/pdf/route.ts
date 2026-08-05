// =============================================================================
// apps/landing/app/(public)/ingresso/[token]/pdf/route.ts
//
// Rota `/ingresso/{token}/pdf` — o ingresso baixado como arquivo (S1214-T5 ·
// RN-473, nascida da D-0804-4).
//
// POR QUE UM ROUTE HANDLER NA LANDING, e não uma Function nova nem geração no
// navegador: a decisão está tomada e argumentada em
// `leela-specs/02-rodadas/2026-08-04-pos-pagamento/05-spec-pdf-ingresso.md`.
// Em uma frase: o link chega por e-mail, boa parte dos cliques acontece dentro
// de webview de app de e-mail, e é `Content-Disposition: attachment` que esses
// webviews sabem baixar — não um `Blob` criado por JavaScript.
//
// A CHAVE NÃO DESCE (RN-419 · D-ING-3). Esta rota NÃO verifica token: ela
// chama `buscarIngressoPorLink` exatamente como a página chama, e a fronteira
// criptográfica continua na Function `ingressoPorLink`. Se alguma versão futura
// deste arquivo parecer precisar de `QR_TOKEN_KEYS`, ela está errada.
//
// A ROTA NÃO ESCREVE NADA (RN-418 · D-ING-10): baixar ingresso não credencia,
// não emite e não muda estado.
//
// DOIS DESFECHOS, E SÓ DOIS — é isso que a mantém sem oráculo:
//   1. o arquivo, nos estados que mostram QR (`valido` e `credenciado`);
//   2. um 303 de volta para `/ingresso/{token}` em TODO o resto — os cinco
//      estados sem QR, o token que não verifica, o inscrito inexistente e a
//      indisponibilidade. Quem tem o token já lê aquele estado na página, então
//      voltar para lá não revela nada de novo, e é o desfecho certo do caso que
//      importa: a aba que ficou aberta com o ingresso válido e o clique que
//      aconteceu depois do cancelamento. A pessoa aterrissa na verdade de agora
//      em vez de baixar um arquivo que mente — porque a página é relida a cada
//      abertura e o ARQUIVO CONGELA.
//
// O ESTADO É LIDO NO ATO DA GERAÇÃO, nunca herdado da tela que estava aberta.
//
// OS TRÊS CABEÇALHOS DA RN-422 já cobrem esta rota sem uma linha nova de
// configuração: o `source` do `next.config.js` é `/ingresso/:token*`, e o `*`
// casa qualquer rota filha. Eles são repetidos na resposta do arquivo de
// propósito — um binário que sai do navegador e vai para a pasta de downloads
// não pode depender de uma segunda camada para não ser cacheado por proxy.
// =============================================================================

import { estadoMostraQr } from '@leela/core';
import { buscarIngressoPorLink } from '../../../../../lib/ingresso';
import { contentDispositionIngresso, gerarPdfIngresso } from '../../../../../lib/ingressoPdf';

// Node, não Edge: `pdf-lib` e o `Buffer` do decode do QR são de servidor Node.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Contexto {
  params: { token: string };
}

export async function GET(_req: Request, { params }: Contexto): Promise<Response> {
  // `encodeURIComponent` mantém o token dentro de UM segmento de caminho: nem
  // barra, nem CR/LF, nem redirecionamento para fora do domínio saem daqui.
  const pagina = `/ingresso/${encodeURIComponent(params.token)}`;

  const resultado = await buscarIngressoPorLink(params.token);
  if (resultado.situacao !== 'ok') return deVoltaParaAPagina(pagina);

  const { ingresso } = resultado;
  // O PDF PARA ONDE O QR PARA (RN-421 espelhada). O predicado é o do core, o
  // mesmo que a Function usa para decidir se projeta a imagem — uma regra só,
  // num lugar só.
  if (!estadoMostraQr(ingresso.estado)) return deVoltaParaAPagina(pagina);

  let arquivo: Uint8Array;
  try {
    arquivo = await gerarPdfIngresso(ingresso);
  } catch {
    // Projeção sem QR embutível, ou falha na geração. Nunca um 500 e nunca um
    // PDF pela metade: a pessoa volta para a página, que sabe dizer a verdade.
    return deVoltaParaAPagina(pagina);
  }

  // `Uint8Array` não é `BodyInit` na tipagem do DOM que este app usa; a cópia
  // para um `ArrayBuffer` cru é o caminho tipado, e custa uma cópia de dezenas
  // de quilobytes numa rota que já gastou uma ida à Function.
  const corpo = new ArrayBuffer(arquivo.byteLength);
  new Uint8Array(corpo).set(arquivo);

  return new Response(corpo, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      // Montado pelo predicado canônico do core, nunca por concatenação de
      // valor cru do banco — ver `lib/ingressoPdf.ts`.
      'Content-Disposition': contentDispositionIngresso(ingresso.codigo),
      'Content-Length': String(arquivo.byteLength),
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

/**
 * 303 para a página do ingresso. `See Other` e não 302: o desfecho é "olhe
 * aquele recurso", e o 303 é o único que diz isso sem ambiguidade de método.
 */
function deVoltaParaAPagina(pagina: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: pagina, 'Cache-Control': 'no-store' },
  });
}
