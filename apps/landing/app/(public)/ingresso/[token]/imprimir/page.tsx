// =============================================================================
// apps/landing/app/(public)/ingresso/[token]/imprimir/page.tsx
//
// A versão imprimível do ingresso (S1214-T4 · RN-424, que amplia a RN-220).
//
// O PDF É A PRÓPRIA PÁGINA IMPRESSA (D-ING-9). Um gerador server-side custaria
// caro pelo mesmo artefato: Puppeteer arrasta um Chromium para dentro da
// Function (memória na casa do gigabyte, cold start na casa dos dez segundos e
// mais uma imagem a manter); `pdfkit`/`pdf-lib` são leves, mas obrigam a
// redesenhar o ingresso numa segunda linguagem de layout, que diverge da página
// no primeiro ajuste de marca. O botão de imprimir do navegador já produz PDF
// há vinte anos, e é o mesmo botão em todo navegador que a pessoa tem.
//
// Com isso o `S1206-T7` sai do bloqueio: o código identificador aparece no PDF
// porque aparece na página, e a página é o PDF.
//
// MESMA LEITURA, MESMA MATRIZ, MESMOS CABEÇALHOS. Esta rota reusa
// `buscarIngressoPorLink` e `IngressoView`, então estado sem QR continua sem QR
// na impressão — nada de um segundo conjunto de regras que diverge do primeiro.
// Os três cabeçalhos da RN-422 já cobrem esta rota: o `source` declarado no
// `next.config.js` é `/ingresso/:token*`, com o `*`.
//
// SEM NAVEGAÇÃO. O `<style>` inline some com o header e o footer públicos pelo
// `data-shell-publico`, na tela e no papel, e o `@page` fixa A4 com margem de
// impressão. É CSS servido pelo servidor: zero JavaScript no cliente.
// =============================================================================

import type { Metadata } from 'next';
import { buscarIngressoPorLink } from '../../../../../lib/ingresso';
import {
  IngressoIndisponivel,
  IngressoNaoEncontrado,
  IngressoView,
} from '../IngressoView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Ingresso para imprimir · Leela',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * CSS de impressão. Fica aqui, e não no `globals.css`, porque é regra DESTA
 * rota: o `@page` A4 valeria para o site inteiro se morasse no arquivo global.
 *
 * O PAPEL SAI DO TEMA ESCURO, de propósito. O tema `brasa` da superfície
 * pública é escuro; imprimi-lo como está gastaria um cartucho por ingresso e
 * sairia ilegível na impressora a laser do trabalho, que é onde a maioria das
 * pessoas imprime. As cores do bloco de impressão são as PALAVRAS-CHAVE do CSS
 * (`white`/`black`/`transparent`), não valores de marca: não há token de
 * impressão no DS hoje, e inventar um hex de marca aqui seria justamente o que
 * a governança §2 proíbe. Quando o DS ganhar uma paleta de impressão, este
 * bloco troca de fonte sem mudar de forma.
 */
const CSS_IMPRESSAO = `
[data-shell-publico]{display:none !important}
main{padding:0 !important}
@page{size:A4;margin:14mm}
@media print{
  html,body{background:white !important}
  [data-print-esconder]{display:none !important}
  [data-ingresso-folha],[data-ingresso-folha] *{
    background:transparent !important;
    color:black !important;
    box-shadow:none !important;
  }
  [data-ingresso-folha] [data-testid="ingresso"]{border:1px solid black !important}
  a[href]:after{content:none !important}
}
`;

interface Props {
  params: { token: string };
}

export default async function ImprimirIngressoPage({
  params,
}: Props): Promise<React.JSX.Element> {
  const resultado = await buscarIngressoPorLink(params.token);

  return (
    <div
      data-ingresso-folha
      className="mx-auto w-full max-w-3xl px-[var(--spacing-4)] py-[var(--spacing-8)]"
    >
      <style dangerouslySetInnerHTML={{ __html: CSS_IMPRESSAO }} />

      {resultado.situacao === 'ok' ? (
        <IngressoView ingresso={resultado.ingresso} paraImpressao />
      ) : resultado.situacao === 'indisponivel' ? (
        <IngressoIndisponivel />
      ) : (
        <IngressoNaoEncontrado />
      )}

      {/* Fora do papel: instrução e volta. Existem para quem chegou pela tela. */}
      <div
        data-print-esconder
        className="mx-auto mt-[var(--spacing-6)] w-full max-w-2xl text-center text-sm text-text-secondary"
      >
        <p>Use o comando de impressão do navegador e escolha “Salvar como PDF”.</p>
        <p className="mt-[var(--spacing-2)]">
          <a
            href={`/ingresso/${encodeURIComponent(params.token)}`}
            className="font-medium underline underline-offset-4 hover:text-text-primary"
          >
            Voltar para o ingresso
          </a>
        </p>
      </div>
    </div>
  );
}
