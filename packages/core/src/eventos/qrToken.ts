// =============================================================================
// packages/core/src/eventos/qrToken.ts
//
// Formato ASSINADO do `qrToken` do ingresso (LEELA-S208-T3 · RN-221/222;
// emissão S1206 · RN-218) — parte PURA e portável (zero I/O, zero crypto).
//
// Formato do token (versão LLQR1):
//   LLQR1.<kid>.<payloadB64url>.<assinaturaB64url>
//   - `kid`: id da chave no keyring do servidor (rotação sem invalidar
//     ingressos emitidos — ver functions/src/eventos/qrToken.ts);
//   - `payload`: JSON canônico `{"i":inscritoId,"e":eventoId,"t":tenantId}`
//     em base64url — payload MÍNIMO (LGPD: nenhum dado pessoal no QR);
//   - `assinatura`: HMAC-SHA256 (32 bytes) sobre o conteúdo
//     `LLQR1.<kid>.<payloadB64url>` com segredo que SÓ o servidor conhece.
//
// Decisões de segurança (threat model Schneier — ver FABLE-C-T1-REPORT):
//   - Algoritmo FIXO pela versão (`LLQR1` ⇒ HMAC-SHA256). Não existe campo
//     "alg" vindo do cliente — elimina downgrade/alg-confusion (a lição dos
//     CVEs de JWT). Formato público, segurança 100% na chave (Kerckhoffs).
//   - Payload mínimo: identificação, nunca autorização de estado. O QR é
//     token de identificação/presença (RN-221) — o ESTADO (já usado,
//     cancelado) mora no Firestore e é decidido em transação no servidor.
//   - Este módulo NÃO verifica assinatura (não tem segredo): ele faz parse
//     ESTRUTURAL + a decisão pura de check-in. A verificação criptográfica
//     vive em `functions/src/eventos/qrToken.ts` (node:crypto).
//
// A UI do balcão (S208-T4) pode usar `parseQrToken` para UX (ex.: detectar
// QR estranho antes do roundtrip), mas NUNCA como validação de segurança —
// nunca confiar no cliente.
// =============================================================================

import type { StatusInscrito } from './inscrito';

// ---------------------------------------------------------------------------
// Constantes do formato
// ---------------------------------------------------------------------------

/** Versão do formato — fixa o algoritmo (LLQR1 ⇒ HMAC-SHA256, sig 32 bytes) */
export const VERSAO_QR_TOKEN = 'LLQR1';

/** Tamanho máximo aceito para um token (defensivo — QR real fica ~140 chars) */
export const QR_TOKEN_MAX_CHARS = 512;

/** Bytes da assinatura HMAC-SHA256 (fixo pela versão) */
export const QR_ASSINATURA_BYTES = 32;

const ID_MAX_CHARS = 200;
const KID_REGEX = /^[A-Za-z0-9_-]{1,32}$/;

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

/** Payload mínimo do QR — identificação, sem PII e sem estado (RN-221) */
export interface QrTokenPayload {
  inscritoId: string;
  eventoId: string;
  tenantId: string;
}

/**
 * Serialização CANÔNICA do payload (ordem fixa i→e→t) — determinística:
 * o mesmo payload sempre gera o mesmo token sob a mesma chave.
 * @pure
 */
export function serializarPayloadQr(payload: QrTokenPayload): string {
  return JSON.stringify({
    i: payload.inscritoId,
    e: payload.eventoId,
    t: payload.tenantId,
  });
}

/** Payload → base64url do JSON canônico. @pure */
export function codificarPayloadQr(payload: QrTokenPayload): string {
  return bytesParaBase64Url(textoParaBytesUtf8(serializarPayloadQr(payload)));
}

/**
 * Conteúdo coberto pela assinatura: `LLQR1.<kid>.<payloadB64url>`.
 * A versão e o kid participam do HMAC — adulterar qualquer parte invalida.
 * @pure
 */
export function conteudoAssinadoQr(kid: string, payloadB64: string): string {
  return `${VERSAO_QR_TOKEN}.${kid}.${payloadB64}`;
}

/** Monta o token final a partir do conteúdo assinado + assinatura. @pure */
export function montarQrToken(
  kid: string,
  payloadB64: string,
  assinaturaB64: string
): string {
  return `${conteudoAssinadoQr(kid, payloadB64)}.${assinaturaB64}`;
}

// ---------------------------------------------------------------------------
// Parse estrutural (SEM verificação criptográfica)
// ---------------------------------------------------------------------------

export type ParseQrTokenResult =
  | {
      ok: true;
      kid: string;
      payload: QrTokenPayload;
      /** Conteúdo sobre o qual a assinatura foi calculada */
      conteudoAssinado: string;
      /** Assinatura decodificada (32 bytes — LLQR1) */
      assinatura: Uint8Array;
    }
  | { ok: false };

/**
 * Parse ESTRUTURAL do token: versão, kid, payload e assinatura bem formados.
 * NÃO verifica a assinatura (isso exige o segredo — servidor). Falha em
 * qualquer desvio → o chamador trata como QR adulterado (fail-closed).
 * @pure
 */
export function parseQrToken(token: unknown): ParseQrTokenResult {
  if (
    typeof token !== 'string' ||
    token.length === 0 ||
    token.length > QR_TOKEN_MAX_CHARS
  ) {
    return { ok: false };
  }

  const partes = token.split('.');
  if (partes.length !== 4) {
    return { ok: false };
  }
  const [versao, kid, payloadB64, assinaturaB64] = partes as [
    string,
    string,
    string,
    string,
  ];

  if (versao !== VERSAO_QR_TOKEN || !KID_REGEX.test(kid)) {
    return { ok: false };
  }

  const assinatura = base64UrlParaBytes(assinaturaB64);
  if (assinatura === null || assinatura.length !== QR_ASSINATURA_BYTES) {
    return { ok: false };
  }

  const payloadBytes = base64UrlParaBytes(payloadB64);
  if (payloadBytes === null) {
    return { ok: false };
  }
  const payloadJson = bytesUtf8ParaTexto(payloadBytes);
  if (payloadJson === null) {
    return { ok: false };
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(payloadJson);
  } catch {
    return { ok: false };
  }
  if (bruto === null || typeof bruto !== 'object' || Array.isArray(bruto)) {
    return { ok: false };
  }
  const campos = bruto as Record<string, unknown>;
  const inscritoId = campos['i'];
  const eventoId = campos['e'];
  const tenantId = campos['t'];
  if (!idValido(inscritoId) || !idValido(eventoId) || !idValido(tenantId)) {
    return { ok: false };
  }

  return {
    ok: true,
    kid,
    payload: { inscritoId, eventoId, tenantId },
    conteudoAssinado: conteudoAssinadoQr(kid, payloadB64),
    assinatura,
  };
}

function idValido(valor: unknown): valor is string {
  return (
    typeof valor === 'string' && valor.length > 0 && valor.length <= ID_MAX_CHARS
  );
}

// ---------------------------------------------------------------------------
// Decisão pura do check-in (S208 · RN-221/222) — o servidor aplica em
// transação; a UI do balcão deriva os estados de erro dos mesmos códigos.
// ---------------------------------------------------------------------------

/**
 * Causas de rejeição do check-in por QR — DISTINTAS por desenho (aceite
 * S208: adulterado ≠ outro-evento ≠ já-usado renderizam estados diferentes).
 */
export type CausaCheckinQr =
  | 'qr_outro_evento'
  | 'inscrito_nao_encontrado'
  | 'qr_divergente'
  | 'inscrito_cancelado'
  | 'inscrito_nao_confirmado'
  | 'qr_ja_utilizado';

/** Recorte do inscrito necessário para decidir o check-in. */
export interface EstadoInscritoCheckin {
  status: StatusInscrito;
  /** `checkinEm != null` — presença já registrada (replay se true) */
  jaTemCheckin: boolean;
  /** `qrToken` gravado no doc pela emissão (S1206) — null se nunca emitido */
  qrTokenEmitido: string | null;
}

export type ResultadoCheckinQr =
  | { ok: true }
  | { ok: false; causa: CausaCheckinQr };

/**
 * Decide o check-in dado um payload JÁ VERIFICADO criptograficamente.
 * Ordem das guardas (do contexto para o estado):
 *   1. evento/tenant do payload ≠ contexto do balcão → `qr_outro_evento`
 *      (tenant divergente colapsa aqui de propósito: para o operador o
 *      estado é o mesmo — "QR não é deste evento" — sem vazar detalhe);
 *   2. inscrito inexistente → `inscrito_nao_encontrado`;
 *   3. token ≠ `qrToken` gravado (nunca emitido, re-emitido ou revogado)
 *      → `qr_divergente` — a igualdade com o doc dá revogação por
 *      inscrito de graça: re-emitir o ingresso invalida o QR antigo mesmo
 *      com assinatura válida;
 *   4. cancelado → `inscrito_cancelado`; não confirmado → recusa;
 *   5. `checkinEm` presente → `qr_ja_utilizado` (replay — RN-222).
 * @pure
 */
export function classificarCheckinQr(args: {
  payload: QrTokenPayload;
  /** Token exatamente como apresentado pelo scanner */
  tokenApresentado: string;
  /** Evento do balcão/portal onde o QR foi escaneado */
  eventoIdBalcao: string;
  /** Tenant do operador autenticado (claims — nunca do cliente) */
  tenantIdCaller: string;
  inscrito: EstadoInscritoCheckin | null;
}): ResultadoCheckinQr {
  const { payload, tokenApresentado, eventoIdBalcao, tenantIdCaller, inscrito } =
    args;

  if (payload.eventoId !== eventoIdBalcao || payload.tenantId !== tenantIdCaller) {
    return { ok: false, causa: 'qr_outro_evento' };
  }
  if (inscrito === null) {
    return { ok: false, causa: 'inscrito_nao_encontrado' };
  }
  if (
    inscrito.qrTokenEmitido === null ||
    inscrito.qrTokenEmitido !== tokenApresentado
  ) {
    return { ok: false, causa: 'qr_divergente' };
  }
  if (inscrito.status === 'cancelado') {
    return { ok: false, causa: 'inscrito_cancelado' };
  }
  if (inscrito.status !== 'confirmado') {
    return { ok: false, causa: 'inscrito_nao_confirmado' };
  }
  if (inscrito.jaTemCheckin) {
    return { ok: false, causa: 'qr_ja_utilizado' };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// base64url + UTF-8 portáveis (sem Buffer/atob — rodam em Node e browser)
// ---------------------------------------------------------------------------

const B64URL_ALFABETO =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64URL_CHAR_REGEX = /^[A-Za-z0-9_-]*$/;

/** Bytes → base64url (sem padding). @pure */
export function bytesParaBase64Url(bytes: Uint8Array): string {
  let saida = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] as number;
    const b1 = i + 1 < bytes.length ? (bytes[i + 1] as number) : undefined;
    const b2 = i + 2 < bytes.length ? (bytes[i + 2] as number) : undefined;

    saida += B64URL_ALFABETO.charAt(b0 >> 2);
    saida += B64URL_ALFABETO.charAt(((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4));
    if (b1 !== undefined) {
      saida += B64URL_ALFABETO.charAt(((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6));
    }
    if (b2 !== undefined) {
      saida += B64URL_ALFABETO.charAt(b2 & 0x3f);
    }
  }
  return saida;
}

/** base64url (sem padding) → bytes; null se malformado. @pure */
export function base64UrlParaBytes(texto: string): Uint8Array | null {
  if (!B64URL_CHAR_REGEX.test(texto) || texto.length % 4 === 1) {
    return null;
  }
  const bytes: number[] = [];
  for (let i = 0; i < texto.length; i += 4) {
    const c0 = B64URL_ALFABETO.indexOf(texto.charAt(i));
    const c1 = i + 1 < texto.length ? B64URL_ALFABETO.indexOf(texto.charAt(i + 1)) : -1;
    const c2 = i + 2 < texto.length ? B64URL_ALFABETO.indexOf(texto.charAt(i + 2)) : -1;
    const c3 = i + 3 < texto.length ? B64URL_ALFABETO.indexOf(texto.charAt(i + 3)) : -1;
    if (c0 < 0 || c1 < 0) {
      return null;
    }
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 >= 0) {
      bytes.push(((c1 & 0x0f) << 4) | (c2 >> 2));
    }
    if (c3 >= 0) {
      bytes.push(((c2 & 0x03) << 6) | c3);
    }
  }
  return new Uint8Array(bytes);
}

/** Texto → bytes UTF-8 (portável, sem TextEncoder). @pure */
export function textoParaBytesUtf8(texto: string): Uint8Array {
  const bytes: number[] = [];
  for (const ch of texto) {
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80) {
      bytes.push(cp);
    } else if (cp < 0x800) {
      bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      bytes.push(
        0xe0 | (cp >> 12),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

/** Bytes UTF-8 → texto; null se sequência inválida (fail-closed). @pure */
export function bytesUtf8ParaTexto(bytes: Uint8Array): string | null {
  let saida = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i] as number;
    let extras: number;
    let cp: number;
    if (b0 < 0x80) {
      extras = 0;
      cp = b0;
    } else if ((b0 & 0xe0) === 0xc0) {
      extras = 1;
      cp = b0 & 0x1f;
    } else if ((b0 & 0xf0) === 0xe0) {
      extras = 2;
      cp = b0 & 0x0f;
    } else if ((b0 & 0xf8) === 0xf0) {
      extras = 3;
      cp = b0 & 0x07;
    } else {
      return null;
    }
    if (i + extras >= bytes.length) {
      return null;
    }
    for (let j = 1; j <= extras; j++) {
      const bj = bytes[i + j] as number;
      if ((bj & 0xc0) !== 0x80) {
        return null;
      }
      cp = (cp << 6) | (bj & 0x3f);
    }
    if (cp > 0x10ffff) {
      return null;
    }
    saida += String.fromCodePoint(cp);
    i += extras + 1;
  }
  return saida;
}
