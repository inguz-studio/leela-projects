// =============================================================================
// ajustarProporcao — ajuste automático de proporção client-side (RN-170).
//
// DEC-0719 / RN-170: "imagem fora da proporção da superfície é ajustada para
// caber (fit/crop client-side antes do upload), sem exigir que o usuário edite
// fora". A estratégia é COVER (center-crop): a imagem preenche a proporção-alvo
// e o excesso é cortado no centro — o mesmo que `object-cover` faz na exibição,
// então o WYSIWYG do preview bate com a página pública.
//
// Divisão de responsabilidade (mesma da validação de tipo/tamanho): isto é UX
// client-side. A fronteira REAL continua nas storage.rules (allowlist de
// contentType + tamanho). O ajuste NÃO substitui `problemaDoArquivoImagem` — o
// consumidor valida tipo/tamanho ANTES (rejeita >5MB/formato) e ajusta DEPOIS.
//
// Degradação HONESTA (mesma linha de `problemaProporcaoQuadrada` no api-client):
// sem `createImageBitmap`/canvas em runtime (ex.: jsdom nos testes), ou para
// tipos que o canvas não re-encoda com fidelidade (GIF animado, AVIF), a função
// devolve o ARQUIVO ORIGINAL inalterado — nunca lança, nunca corrompe. O
// servidor não re-checa proporção, então o pior caso é a imagem original subir
// como estava (comportamento pré-RN-170), não um erro.
// =============================================================================

// Teto de bytes padrão da saída — ESPELHO de `IMAGEM_UPLOAD_MAX_BYTES` do
// api-client (5MB, limite das storage.rules). Duplicado como literal DE
// PROPÓSITO: manter esta util sem dependência do api-client a deixa auto-contida
// e testável sem mock (o consumidor `ImageUploadField` passa o teto real via
// `opts.maxBytes`, então este default só vale em chamadas diretas).
const MAX_BYTES_DEFAULT = 5 * 1024 * 1024;

/** Tipos que o canvas re-encoda com fidelidade (raster estático, sem animação). */
const TIPOS_REENCODAVEIS = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Retângulo-fonte do recorte COVER (em pixels da imagem original). */
export interface RecorteCover {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Recorte COVER centralizado: dado o tamanho da origem e a proporção-alvo
 * (alvoW:alvoH), devolve o maior retângulo com a proporção-alvo que cabe na
 * origem, centralizado. É a geometria por trás de `object-fit: cover`. @pure
 */
export function calcularCropCover(
  srcW: number,
  srcH: number,
  alvoW: number,
  alvoH: number
): RecorteCover {
  if (srcW <= 0 || srcH <= 0 || alvoW <= 0 || alvoH <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(srcW, 0), sh: Math.max(srcH, 0) };
  }
  const razaoAlvo = alvoW / alvoH;
  const razaoSrc = srcW / srcH;
  if (razaoSrc > razaoAlvo) {
    // Origem mais LARGA que o alvo: corta as laterais (mantém a altura).
    const sw = Math.round(srcH * razaoAlvo);
    const sx = Math.round((srcW - sw) / 2);
    return { sx, sy: 0, sw, sh: srcH };
  }
  // Origem mais ALTA (ou igual): corta topo/base (mantém a largura).
  const sh = Math.round(srcW / razaoAlvo);
  const sy = Math.round((srcH - sh) / 2);
  return { sx: 0, sy, sw: srcW, sh };
}

/**
 * Dimensões de SAÍDA: mantém a proporção do recorte, mas limita o maior lado a
 * `maxLado` (evita subir um 6000px quando a superfície nunca passa de ~1600).
 * Nunca AMPLIA (só reduz). @pure
 */
export function calcularSaidaDims(
  cropW: number,
  cropH: number,
  maxLado: number
): { w: number; h: number } {
  if (cropW <= 0 || cropH <= 0) return { w: 0, h: 0 };
  const maiorLado = Math.max(cropW, cropH);
  if (maxLado <= 0 || maiorLado <= maxLado) {
    return { w: Math.round(cropW), h: Math.round(cropH) };
  }
  const escala = maxLado / maiorLado;
  return { w: Math.max(1, Math.round(cropW * escala)), h: Math.max(1, Math.round(cropH * escala)) };
}

export interface AjustarOpts {
  /** Maior lado da imagem de saída em px (default 1600). */
  maxLadoPx?: number;
  /** Teto de bytes da saída (default = teto do upload, 5MB). */
  maxBytes?: number;
  /** Qualidade inicial de encode para jpeg/webp (default 0.9). */
  qualidade?: number;
}

/** Detecta suporte a decode + canvas 2D neste runtime (false em jsdom). */
function suportaCanvas(): boolean {
  if (typeof createImageBitmap !== 'function') return false;
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return false;
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    return ctx !== null;
  } catch {
    return false;
  }
}

/** Promisifica canvas.toBlob (jsdom devolve null → tratado no chamador). */
function canvasParaBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), tipo, qualidade);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Ajusta a imagem para a proporção `alvoW:alvoH` por COVER (center-crop) antes
 * do upload. Devolve um novo File já na proporção-alvo; em qualquer falha ou
 * runtime sem suporte, devolve o `file` original inalterado (degradação
 * honesta). Preserva o tipo quando re-encodável; pula GIF/AVIF.
 */
export async function ajustarProporcaoImagem(
  file: File,
  alvoW: number,
  alvoH: number,
  opts: AjustarOpts = {}
): Promise<File> {
  const maxLadoPx = opts.maxLadoPx ?? 1600;
  const maxBytes = opts.maxBytes ?? MAX_BYTES_DEFAULT;
  const qualidadeInicial = opts.qualidade ?? 0.9;

  // Tipos não re-encodáveis (GIF animado / AVIF): sobe original — nunca quebra
  // a animação nem lança. Também sai cedo se o runtime não decodifica/desenha.
  const tipoAlvo = (TIPOS_REENCODAVEIS as readonly string[]).includes(file.type)
    ? file.type
    : null;
  if (tipoAlvo === null || !suportaCanvas()) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    if (width <= 0 || height <= 0) return file;

    const crop = calcularCropCover(width, height, alvoW, alvoH);
    const saida = calcularSaidaDims(crop.sw, crop.sh, maxLadoPx);
    if (saida.w <= 0 || saida.h <= 0) return file;

    const canvas = document.createElement('canvas');
    canvas.width = saida.w;
    canvas.height = saida.h;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return file;
    // PNG preserva transparência; JPEG não tem alpha e precisa de matte (senão
    // pixels transparentes viram preto). Cor literal por necessidade técnica: o
    // canvas não resolve CSS var (`fillStyle` exige cor concreta); `white` é o
    // matte convencional de flatten de JPEG, não um token de UI.
    if (tipoAlvo === 'image/jpeg') {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, saida.w, saida.h);
    }
    ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, saida.w, saida.h);

    // Encode; se estourar o teto, reduz qualidade (jpeg/webp). PNG não tem
    // qualidade: se o PNG cortado ainda estourar (raro depois de <=1600px), cai
    // para JPEG com matte branco (compressão com perda) antes de desistir —
    // assim o ajuste efetivamente REDUZ o tamanho em vez de deixar o consumidor
    // rejeitar com "5MB" logo após "recortar" (review antagonista, BAIXO-1).
    let blob: Blob | null = null;
    let tipoSaida = tipoAlvo;
    const passos = tipoAlvo === 'image/png' ? [1] : [qualidadeInicial, 0.8, 0.7, 0.6];
    for (const q of passos) {
      blob = await canvasParaBlob(canvas, tipoAlvo, q);
      if (blob && blob.size <= maxBytes) break;
    }
    if ((!blob || blob.size > maxBytes) && tipoAlvo === 'image/png') {
      // Fallback PNG→JPEG (perde alpha; o matte já foi pintado só p/ jpeg, então
      // pinta agora antes de reencodar).
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, saida.w, saida.h);
      ctx.globalCompositeOperation = 'source-over';
      for (const q of [qualidadeInicial, 0.8, 0.7, 0.6]) {
        const jpg = await canvasParaBlob(canvas, 'image/jpeg', q);
        if (jpg && jpg.size <= maxBytes) {
          blob = jpg;
          tipoSaida = 'image/jpeg';
          break;
        }
      }
    }
    // Sem blob, ou ainda acima do teto: devolve o ORIGINAL (o consumidor/Rules
    // decidem) — nunca sobe um blob transformado que segue estourando.
    if (!blob || blob.size > maxBytes) return file;

    const nome = renomear(file.name, tipoSaida);
    return new File([blob], nome, { type: tipoSaida, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

/** Troca a extensão do nome para bater com o tipo de saída. @pure */
function renomear(nome: string, tipo: string): string {
  const ext = tipo === 'image/jpeg' ? 'jpg' : tipo === 'image/webp' ? 'webp' : 'png';
  const base = nome.replace(/\.[^./\\]+$/, '') || 'imagem';
  return `${base}.${ext}`;
}
