// =============================================================================
// packages/core/src/tickets/linkIngresso.ts
//
// Formato do token do LINK da página do ingresso (LEELA-S1214-T1 · RN-419) —
// parte PURA e portável (zero I/O, zero crypto).
//
// Formato (versão LLIP1 — irmão deliberadamente INCOMPATÍVEL do LLQR1):
//   LLIP1.<kid>.<payloadB64url>.<assinaturaB64url>
//
// Por que um token PRÓPRIO e não o `qrToken` na URL (RN-419): o `qrToken` é a
// credencial de presença — `classificarCheckinQr` compara byte a byte com o
// que está gravado no doc, então quem lê o token entra no evento. Numa URL ele
// vaza pelo histórico do navegador, pelo cabeçalho `Referer`, pelo log de
// qualquer proxy, pela barra de endereço numa tela compartilhada e pelo print
// que a pessoa manda no grupo. Reusar o `qrToken` como identificador da página
// seria trocar a credencial de lugar, não protegê-la.
//
// SEPARAÇÃO DE DOMÍNIO PELA CONSTANTE DE VERSÃO (RN-419, ⚔ vetor 4): um token
// `LLQR1` nunca abre a página (este parser recusa) e um token `LLIP1` nunca
// passa no check-in (`parseQrToken` recusa). As duas constantes jamais podem
// ser iguais — e isso é ASSERÇÃO DE TESTE, não convenção de nome.
//
// O que é REUSADO do `LLQR1` de propósito, e por quê:
//   - payload canônico `{i,e,t}` (`codificarPayloadQr`) — mesmo shape mínimo,
//     zero PII no link, e um único lugar onde a serialização pode errar;
//   - alfabeto base64url e o decodificador canônico;
//   - `kidQrValido` — o MESMO critério de kid, porque o ring é o mesmo.
// O que NÃO é reusado: o conteúdo assinado (leva a versão `LLIP1`) e a
// assinatura (cobre também o `qrToken` vigente — RN-420, ver as Functions).
//
// Este módulo NÃO verifica assinatura: verificação exige o segredo e vive em
// `functions/src/eventos/linkIngresso.ts` (node:crypto).
// =============================================================================

import {
  base64UrlParaBytes,
  codificarPayloadQr,
  kidQrValido,
  QR_ASSINATURA_BYTES,
  VERSAO_QR_TOKEN,
  bytesUtf8ParaTexto,
  type QrTokenPayload,
} from '../eventos/qrToken';

// ---------------------------------------------------------------------------
// Constantes do formato
// ---------------------------------------------------------------------------

/**
 * Versão do formato do link — fixa o algoritmo (LLIP1 ⇒ HMAC-SHA256, sig de
 * 32 bytes), exatamente como o `LLQR1` faz. Não existe campo "alg" vindo do
 * cliente: downgrade/alg-confusion não tem por onde entrar.
 *
 * ⚠️ Esta constante NUNCA pode ser igual a `VERSAO_QR_TOKEN`. É o que separa
 * os dois domínios; há teste guardando a desigualdade.
 */
export const VERSAO_LINK_INGRESSO = 'LLIP1';

/** Tamanho máximo aceito para um token de link (defensivo). */
export const LINK_INGRESSO_MAX_CHARS = 512;

/** Bytes da assinatura HMAC-SHA256 do link (fixo pela versão). */
export const LINK_INGRESSO_ASSINATURA_BYTES = QR_ASSINATURA_BYTES;

/** Payload do link — o MESMO shape mínimo do QR: identificação, sem PII. */
export type LinkIngressoPayload = QrTokenPayload;

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

/** Payload → base64url do JSON canônico (mesma serialização do QR). @pure */
export function codificarPayloadLinkIngresso(
  payload: LinkIngressoPayload
): string {
  return codificarPayloadQr(payload);
}

/**
 * Conteúdo coberto pela assinatura NA PARTE VISÍVEL do token:
 * `LLIP1.<kid>.<payloadB64url>`.
 *
 * A assinatura real cobre isto MAIS o `qrToken` vigente do inscrito (RN-420) —
 * o binding entra do lado do servidor, que é quem lê o doc. Aqui fica só a
 * parte que viaja na URL.
 * @pure
 */
export function conteudoVisivelLinkIngresso(
  kid: string,
  payloadB64: string
): string {
  return `${VERSAO_LINK_INGRESSO}.${kid}.${payloadB64}`;
}

/** Monta o token final a partir do conteúdo visível + assinatura. @pure */
export function montarLinkIngressoToken(
  kid: string,
  payloadB64: string,
  assinaturaB64: string
): string {
  return `${conteudoVisivelLinkIngresso(kid, payloadB64)}.${assinaturaB64}`;
}

// ---------------------------------------------------------------------------
// Parse estrutural (SEM verificação criptográfica)
// ---------------------------------------------------------------------------

export type ParseLinkIngressoResult =
  | {
      ok: true;
      kid: string;
      payload: LinkIngressoPayload;
      /** Parte visível sobre a qual a assinatura foi calculada */
      conteudoVisivel: string;
      /** Assinatura decodificada (32 bytes — LLIP1) */
      assinatura: Uint8Array;
    }
  | { ok: false };

const ID_MAX_CHARS = 200;

/**
 * Parse ESTRUTURAL do token do link: versão, kid, payload e assinatura bem
 * formados. NÃO verifica a assinatura (isso exige o segredo — servidor).
 * Falha em qualquer desvio → o chamador trata como link inválido
 * (fail-closed, e com a MESMA resposta de todas as outras causas — RN-419).
 * @pure
 */
export function parseLinkIngressoToken(token: unknown): ParseLinkIngressoResult {
  if (
    typeof token !== 'string' ||
    token.length === 0 ||
    token.length > LINK_INGRESSO_MAX_CHARS
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

  // A separação de domínio mora AQUI: qualquer coisa que não comece em LLIP1
  // morre, e isso inclui um `qrToken` LLQR1 colado na URL (⚔ vetor 4).
  if (versao !== VERSAO_LINK_INGRESSO || !kidQrValido(kid)) {
    return { ok: false };
  }

  const assinatura = base64UrlParaBytes(assinaturaB64);
  if (
    assinatura === null ||
    assinatura.length !== LINK_INGRESSO_ASSINATURA_BYTES
  ) {
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
    conteudoVisivel: conteudoVisivelLinkIngresso(kid, payloadB64),
    assinatura,
  };
}

/**
 * Id bem-formado E utilizável como id de documento do Firestore.
 *
 * POR QUE A SEGUNDA METADE EXISTE (review INGPAGE-REV, achado 1). No check-in
 * (`registrarCheckin.ts`) a ordem é "criptografia PRIMEIRO — o payload só
 * existe após assinatura válida", então o id que vira caminho de documento já
 * foi assinado pelo servidor. O link INVERTE essa ordem por necessidade: o
 * binding da RN-420 cobre o `qrToken` GRAVADO, então é preciso LER o doc antes
 * de poder verificar — e, nesse intervalo, `inscritoId`/`eventoId` são entrada
 * NÃO CONFIÁVEL vinda de um token que ainda não foi verificado.
 *
 * Sem esta guarda, um id com número ímpar de segmentos (`"a/b"`) ou com `//`
 * faz `collection('eventos').doc(id)` LANÇAR de forma síncrona, antes de
 * qualquer verificação. O endpoint transforma essa exceção em `503` com corpo
 * `{"ok":false,"erro":"indisponivel"}` — diferente, byte a byte, da negativa
 * única `{"ok":false}` da RN-419. Ou seja: uma propriedade do token escolhida
 * por quem forja o link seleciona qual das duas respostas sai, e a página
 * renderiza telas diferentes para cada uma. Isso é exatamente o oráculo que a
 * RN-419 proíbe, além de virar um 5xx e um `logger.error` por request num
 * endpoint público e não autenticado.
 *
 * O critério é o do próprio Firestore para id de documento: sem `/`, nunca
 * `.` nem `..`, e fora do espaço reservado `__*__`. Nenhum id legítimo (auto-id
 * ou slug do produto) é recusado por isto — o que ele recusa é só o que o SDK
 * recusaria lançando.
 * @pure
 */
function idValido(valor: unknown): valor is string {
  if (
    typeof valor !== 'string' ||
    valor.length === 0 ||
    valor.length > ID_MAX_CHARS
  ) {
    return false;
  }
  if (valor.includes('/')) return false;
  if (valor === '.' || valor === '..') return false;
  if (/^__.*__$/.test(valor)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Guarda de domínio — exportada para ser asserção de teste E guarda de runtime
// ---------------------------------------------------------------------------

/**
 * As duas versões são distintas? Falso aqui significa que os domínios do QR de
 * presença e do link da página colapsaram num só — um token de link passaria a
 * abrir o portão do evento. Chamado no teste E no carregamento do verificador.
 * @pure
 */
export function dominiosDeTokenSeparados(): boolean {
  return (VERSAO_LINK_INGRESSO as string) !== (VERSAO_QR_TOKEN as string);
}

/**
 * Estado do ingresso EXIBIDO pela página (RN-421). É a matriz de estados em
 * forma de tipo: a página renderiza um ramo por valor, e o `qrDataUri` só
 * acompanha os dois estados que podem mostrar QR.
 *
 * Vive no core porque a Function projeta e a página consome — um enum só,
 * numa fronteira só.
 */
export type EstadoIngressoPagina =
  /** `confirmado`, com `qrToken`, sem `checkinEm` — o caminho feliz */
  | 'valido'
  /** `confirmado` com `checkinEm` — credenciado; o QR CONTINUA visível */
  | 'credenciado'
  /** `confirmado` sem `qrToken` — emissão em andamento (face da RN-382) */
  | 'emitindo'
  /** pagamento ainda não confirmado */
  | 'pendente'
  /** inscrição cancelada — sem QR */
  | 'cancelado'
  /** inscrição estornada — sem QR */
  | 'estornado'
  /** evento encerrado — abre como histórico, com aviso, sem QR */
  | 'encerrado';

/**
 * O estado pode mostrar QR? (RN-421 — decisão de PRODUTO, não de engenharia)
 *
 * `cancelado`/`estornado` não mostram porque mostrar convidaria a pessoa a
 * viajar até o evento e ser barrada na fila às seis da manhã; a tranca real
 * continua no servidor (`inscrito_cancelado`), a página só não mente.
 * `credenciado` MOSTRA porque esconder depois do check-in não protege nada (o
 * servidor já responde `qr_ja_utilizado`) e tira da pessoa a conferência de
 * que aquele é o ingresso dela.
 * @pure
 */
export function estadoMostraQr(estado: EstadoIngressoPagina): boolean {
  return estado === 'valido' || estado === 'credenciado';
}
