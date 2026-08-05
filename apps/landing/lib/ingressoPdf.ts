// =============================================================================
// apps/landing/lib/ingressoPdf.ts
//
// O ingresso em forma de ARQUIVO (S1214-T5 · RN-473, que refina a RN-424).
//
// SÓ SERVIDOR. Este módulo é importado por um Route Handler e por nada mais —
// nenhum componente de cliente o alcança, então `pdf-lib` fica no bundle do
// servidor da landing, ao lado de `firebase-admin` e `qrcode`, e a rota do
// ingresso continua com zero JavaScript de cliente (critério de aceite da
// S1214). Quem quebrar essa propriedade quebra o teste que caminha os imports.
//
// POR QUE UM SEGUNDO LAYOUT EXISTE, já que a folha A4 (T4) desenha o mesmo
// ingresso em HTML: porque o dono pediu um arquivo GERADO e baixado, não o
// diálogo de impressão (D-0804-4). O custo é conhecido e está declarado na
// spec: uma segunda linguagem de layout que pode divergir da página no
// primeiro ajuste de marca. A amarra contra a deriva é o teste que cobra deste
// arquivo os campos da RN-422 e NENHUM a mais — ele lê o PDF de verdade, não a
// intenção.
//
// O ARQUIVO NÃO CARREGA O LINK NEM O TOKEN (RN-419 aplicada a arquivo), e a
// garantia é de ASSINATURA: `gerarPdfIngresso` recebe a projeção e só ela — o
// token não entra aqui nem por engano, porque não existe parâmetro para ele.
// Um PDF com o token dentro viraria uma segunda credencial num meio onde não
// há `no-store`, não há prazo e não há volta.
//
// CINZA, NÃO MARCA. As cores deste arquivo são preto, branco e dois cinzas —
// pelo mesmo motivo que a folha de impressão sai do tema escuro: o PDF é
// impresso e lido em tela clara, e o DS não tem paleta de impressão hoje
// (`imprimir/page.tsx` registrou o precedente). Inventar um hex de marca aqui
// seria justamente o que a governança §2 proíbe. Quando o DS ganhar tokens de
// impressão, este bloco troca de fonte sem mudar de forma.
// =============================================================================

import { isCodigoIngressoValido } from '@leela/core';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  ESTADO_INGRESSO_UI,
  formatarCarimbo,
  formatarDataEvento,
  type IngressoProjetado,
} from './ingresso';

/** Nome de queda quando não há código válido (RN-473). */
export const NOME_ARQUIVO_PADRAO = 'ingresso.pdf';

/**
 * O nome do arquivo (RN-473) — `ingresso-<codigo>.pdf`.
 *
 * A ÚNICA SUPERFÍCIE DE ATAQUE NOVA DESTA TASK mora aqui: o valor vem do
 * Firestore e vai parar dentro de um cabeçalho HTTP. A porta é o predicado
 * canônico do core (`isCodigoIngressoValido`, RN-396: seis símbolos maiúsculos
 * de um alfabeto sem `0`, `O`, `1`, `I` e `L`) — e NÃO um sanitizador novo. A
 * diferença não é estética: sanitizador escapa o que passou, predicado decide
 * quem passa. Como o alfabeto não tem aspas, ponto-e-vírgula, barra, espaço,
 * CR nem LF, o cabeçalho fica fechado a injeção por construção, e a fonte
 * única de verdade sobre o formato do código continua sendo o core.
 *
 * O nome do TITULAR nunca entra: nome de pessoa em nome de arquivo vaza na
 * lista de downloads, no seletor de anexo e na tela compartilhada.
 * @pure
 */
export function nomeArquivoIngresso(codigo: unknown): string {
  return isCodigoIngressoValido(codigo) ? `ingresso-${codigo}.pdf` : NOME_ARQUIVO_PADRAO;
}

/**
 * O `Content-Disposition` completo, montado a partir do nome já decidido.
 * Existe para que nenhum chamador monte a string por concatenação própria.
 * @pure
 */
export function contentDispositionIngresso(codigo: unknown): string {
  return `attachment; filename="${nomeArquivoIngresso(codigo)}"`;
}

// ---------------------------------------------------------------------------
// O conteúdo, antes de virar desenho
// ---------------------------------------------------------------------------

/** Uma linha `termo: valor` da ficha. */
export interface CampoPdf {
  termo: string;
  valor: string;
}

/** O conteúdo inteiro do arquivo, em texto — a lista fechada da RN-422. */
export interface ConteudoPdf {
  titular: string;
  estado: string;
  campos: CampoPdf[];
  codigo: string;
  aviso: string;
}

/**
 * O que o arquivo diz, e nada mais (RN-422).
 *
 * A lista é FECHADA de propósito: o PDF não faz spread da projeção, então um
 * campo novo que apareça no contrato lá atrás não vaza para o arquivo por
 * descuido. Acrescentar campo ao PDF passa a ser escolha declarada — que é a
 * amarra que a spec pediu contra a deriva do segundo layout.
 *
 * Fora, sem exceção: valor pago, CPF, telefone, e-mail, nascimento, endereço,
 * contato de emergência, resposta de formulário, o `qrToken` e o token do
 * link. Num arquivo a RN-422 pesa mais do que na página: a página é relida a
 * cada abertura e pode passar a esconder algo; o arquivo é para sempre.
 * @pure
 */
export function conteudoDoPdf(ingresso: IngressoProjetado): ConteudoPdf {
  const ui = ESTADO_INGRESSO_UI[ingresso.estado];
  const dataEvento = formatarDataEvento(ingresso.evento.dataISO);
  const carimbo = formatarCarimbo(ingresso.credenciadoEm);

  const campos: CampoPdf[] = [{ termo: 'Evento', valor: ingresso.evento.nome }];
  if (dataEvento !== '') campos.push({ termo: 'Data', valor: dataEvento });
  if (ingresso.evento.local !== '') campos.push({ termo: 'Local', valor: ingresso.evento.local });
  if (ingresso.modalidade !== '') campos.push({ termo: 'Modalidade', valor: ingresso.modalidade });
  if (ingresso.kit !== null) {
    campos.push({
      termo: 'Kit',
      valor:
        ingresso.tamanho !== null ? `${ingresso.kit} - tamanho ${ingresso.tamanho}` : ingresso.kit,
    });
  }
  if (carimbo !== '') campos.push({ termo: 'Credenciado em', valor: carimbo });

  return {
    titular: ingresso.titular,
    estado: ui.rotulo,
    campos,
    codigo: ingresso.codigo,
    aviso: ui.aviso,
  };
}

// ---------------------------------------------------------------------------
// Texto que a fonte do PDF consegue escrever
// ---------------------------------------------------------------------------

/**
 * Símbolos fora do Latin-1 que a WinAnsi ESCREVE, e por isso passam inteiros.
 * O resto vira o equivalente ASCII mais próximo ou some.
 */
const EXTRAS_WINANSI = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152,
  0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a,
  0x0153, 0x017e, 0x0178,
]);

/**
 * Deixa o texto escrevível pelas fontes padrão do PDF (WinAnsi).
 *
 * NÃO é o sanitizador do cabeçalho — aquele não existe, e a porta de lá é o
 * predicado do core. Este aqui é sobre TIPOGRAFIA: as fontes Standard 14 do
 * PDF codificam WinAnsi, e um caractere fora dela faz a geração explodir. Nome
 * de pessoa e nome de evento são texto livre vindo do mundo, então um emoji no
 * nome do evento não pode derrubar o download de ninguém. Latin-1 cobre o
 * português inteiro; o que sobra vira espaço.
 * @pure
 */
export function textoParaPdf(valor: string): string {
  let saida = '';
  for (const simbolo of valor.normalize('NFC')) {
    const ponto = simbolo.codePointAt(0) ?? 0;
    const imprimivel =
      (ponto >= 0x20 && ponto <= 0x7e) || (ponto >= 0xa0 && ponto <= 0xff) || EXTRAS_WINANSI.has(ponto);
    saida += imprimivel ? simbolo : ' ';
  }
  return saida.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// O desenho
// ---------------------------------------------------------------------------

/** A4 retrato, em pontos — a mesma folha do `@page{size:A4}` da rota de impressão. */
const A4 = { largura: 595.28, altura: 841.89 } as const;
const MARGEM = 56;
const PRETO = rgb(0, 0, 0);
const CINZA = rgb(0.42, 0.42, 0.42);
const CINZA_CLARO = rgb(0.85, 0.85, 0.85);

const PREFIXO_PNG = 'data:image/png;base64,';

/** O QR chega da Function como data URI de PNG; aqui vira bytes ou nada. @pure */
export function bytesDoQr(qrDataUri: string | undefined): Uint8Array | null {
  if (typeof qrDataUri !== 'string' || !qrDataUri.startsWith(PREFIXO_PNG)) return null;
  const base64 = qrDataUri.slice(PREFIXO_PNG.length);
  if (base64.length === 0) return null;
  try {
    const binario = Buffer.from(base64, 'base64');
    return binario.length > 0 ? new Uint8Array(binario) : null;
  } catch {
    return null;
  }
}

/**
 * Gera o PDF do ingresso.
 *
 * Recebe a PROJEÇÃO e só ela — sem token, sem link, sem URL (RN-419). Lança
 * quando o QR não puder ser embutido: um documento com cara de ingresso e sem
 * o que serve é pior do que arquivo nenhum, porque faz a pessoa viajar para
 * ser barrada na fila. Quem chama trata o erro levando de volta à página.
 */
export async function gerarPdfIngresso(ingresso: IngressoProjetado): Promise<Uint8Array> {
  const qr = bytesDoQr(ingresso.qrDataUri);
  if (qr === null) throw new Error('ingresso_sem_qr');

  const conteudo = conteudoDoPdf(ingresso);
  const doc = await PDFDocument.create();

  // Metadados genéricos DE PROPÓSITO: título de PDF aparece na barra do leitor
  // e no gerenciador de arquivos, pelo mesmo motivo que o `<title>` da página é
  // genérico. Nome de pessoa não entra aqui, como não entra no nome do arquivo.
  doc.setTitle('Ingresso');
  doc.setProducer('Leela');
  doc.setCreator('Leela');

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const pagina = doc.addPage([A4.largura, A4.altura]);
  const imagemQr = await doc.embedPng(qr);

  const larguraUtil = A4.largura - MARGEM * 2;
  let y = A4.altura - MARGEM;

  const escrever = (
    texto: string,
    fonte: typeof regular,
    tamanho: number,
    cor: ReturnType<typeof rgb>,
    x = MARGEM
  ): void => {
    pagina.drawText(textoParaPdf(texto), { x, y, size: tamanho, font: fonte, color: cor });
  };

  escrever('Ingresso de', regular, 10, CINZA);
  y -= 26;
  escrever(conteudo.titular, negrito, 22, PRETO);
  y -= 22;
  escrever(conteudo.estado, negrito, 11, CINZA);

  y -= 26;
  pagina.drawLine({
    start: { x: MARGEM, y },
    end: { x: MARGEM + larguraUtil, y },
    thickness: 1,
    color: CINZA_CLARO,
  });

  for (const campo of conteudo.campos) {
    y -= 30;
    escrever(campo.termo.toUpperCase(), regular, 8, CINZA);
    y -= 14;
    escrever(campo.valor, regular, 12, PRETO);
  }

  // O QR ocupa o centro da folha, no tamanho que o leitor de catraca lê sem
  // aproximar o celular: 180pt ≈ 6,3 cm impressos.
  const lado = 180;
  y -= 40 + lado;
  pagina.drawImage(imagemQr, { x: (A4.largura - lado) / 2, y, width: lado, height: lado });

  if (conteudo.codigo !== '') {
    y -= 34;
    const rotulo = 'CÓDIGO DO INGRESSO';
    const larguraRotulo = regular.widthOfTextAtSize(textoParaPdf(rotulo), 8);
    escrever(rotulo, regular, 8, CINZA, (A4.largura - larguraRotulo) / 2);
    y -= 26;
    const larguraCodigo = mono.widthOfTextAtSize(textoParaPdf(conteudo.codigo), 22);
    escrever(conteudo.codigo, mono, 22, PRETO, (A4.largura - larguraCodigo) / 2);
  }

  y -= 40;
  for (const linha of quebrarLinhas(textoParaPdf(conteudo.aviso), regular, 10, larguraUtil)) {
    escrever(linha, regular, 10, CINZA);
    y -= 14;
  }

  return doc.save();
}

/**
 * Quebra o aviso em linhas que cabem na largura útil. Existe porque o PDF não
 * tem fluxo de texto: quem não mede, escreve para fora da folha.
 * @pure
 */
export function quebrarLinhas(
  texto: string,
  fonte: { widthOfTextAtSize: (t: string, s: number) => number },
  tamanho: number,
  largura: number
): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    const tentativa = atual === '' ? palavra : `${atual} ${palavra}`;
    if (atual !== '' && fonte.widthOfTextAtSize(tentativa, tamanho) > largura) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual !== '') linhas.push(atual);
  return linhas;
}
