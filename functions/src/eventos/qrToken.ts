// =============================================================================
// functions/src/eventos/qrToken.ts
//
// Assinatura e verificação SERVER-SIDE do `qrToken` (LEELA-S208-T3 ·
// RN-221/222; emissão S1206 · RN-218). Complementa a parte pura em
// packages/core/src/eventos/qrToken.ts (formato/parse/decisão).
//
// Segredo (NUNCA no cliente, NUNCA hardcoded — fail-closed sem config):
//   - `QR_TOKEN_KEYS`  — JSON { "<kid>": "<segredo base64url ≥ 32 bytes>" }.
//     Em produção: Cloud Secret Manager (`firebase functions:secrets:set
//     QR_TOKEN_KEYS`) injetado via `runWith({ secrets: [...] })` no callable.
//     No emulator/preview: `functions/.secret.local` ou variável de ambiente.
//   - `QR_TOKEN_KID_ATIVO` — kid usado para ASSINAR novas emissões.
//
// Rotação de chave (documentada — aceite do brief):
//   1. Gerar segredo novo (32+ bytes aleatórios) e ADICIONAR ao JSON com um
//      kid novo (ex.: "k2"), mantendo o antigo — verificação aceita ambos;
//   2. Apontar `QR_TOKEN_KID_ATIVO=k2` e redeployar — emissões novas saem
//      assinadas com k2; ingressos antigos (k1) continuam válidos;
//   3. Re-emitir os ingressos pendentes (S1206) OU esperar os eventos com
//      QRs k1 passarem; então REMOVER k1 do JSON (revoga tudo que k1 assinou).
//   Revogação POR INSCRITO não precisa de rotação: re-emitir o ingresso
//   troca `inscrito.qrToken` e o check-in exige igualdade com o doc
//   (`qr_divergente` — ver classificarCheckinQr no core).
//
// Threat model coberto aqui (Schneier): forja sem segredo (HMAC-SHA256),
// adulteração (assinatura cobre versão+kid+payload), downgrade (algoritmo
// fixo pela versão), timing attack na comparação (timingSafeEqual), segredo
// fraco (mínimo 32 bytes decodificados — recusa config inválida em voz alta),
// kid fora do formato do parse (assinaria mas nunca verificaria — ingresso
// natimorto; recusado na carga do keyring E na assinatura).
// =============================================================================

import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  base64UrlParaBytes,
  bytesParaBase64Url,
  codificarPayloadQr,
  conteudoAssinadoQr,
  kidQrValido,
  parseQrToken,
  type QrTokenPayload,
} from '../../../packages/core/src/eventos/qrToken';

// ---------------------------------------------------------------------------
// Keyring (kid → segredo) — carregado do ambiente, cacheado por instância
// ---------------------------------------------------------------------------

/** Mínimo de bytes do segredo DECODIFICADO (128 bits seria fraco; 256 ok) */
export const QR_SEGREDO_MIN_BYTES = 32;

export interface QrKeyring {
  /** kid usado para assinar emissões novas */
  ativo: string;
  /** kid → segredo (bytes) — verificação aceita QUALQUER kid presente */
  chaves: Record<string, Buffer>;
}

/**
 * Carrega o keyring do ambiente.
 *   - Config AUSENTE → `null` (chamador decide fail-closed);
 *   - Config PRESENTE mas inválida → `Error` alto e claro (config quebrada
 *     não pode degradar silenciosamente para "QR desligado").
 */
export function carregarQrKeyring(
  env: Record<string, string | undefined> = process.env
): QrKeyring | null {
  const bruto = env['QR_TOKEN_KEYS'];
  const ativo = env['QR_TOKEN_KID_ATIVO'];
  if (bruto === undefined || bruto.length === 0) {
    return null;
  }
  if (ativo === undefined || ativo.length === 0) {
    throw new Error(
      'QR_TOKEN_KEYS presente sem QR_TOKEN_KID_ATIVO — defina o kid ativo.'
    );
  }
  // Kid fora do formato do PARSE assina tokens que a verificação SEMPRE
  // recusa (ingresso natimorto — descoberto no dia do evento, com fila).
  // Config inválida grita AQUI, na carga. Re-review Fable C-T1 A2.
  if (!kidQrValido(ativo)) {
    throw new Error(
      `QR_TOKEN_KID_ATIVO='${ativo}' inválido — kid deve casar ` +
        '/^[A-Za-z0-9_-]{1,32}$/ (o parser do token recusa qualquer outro; ' +
        'tokens assinados com ele nunca verificariam).'
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bruto);
  } catch {
    throw new Error('QR_TOKEN_KEYS não é JSON válido ({ "<kid>": "<segredo b64url>" }).');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('QR_TOKEN_KEYS deve ser um objeto { "<kid>": "<segredo b64url>" }.');
  }

  // Mapa null-proto: um kid literal "__proto__"/"constructor" em QR_TOKEN_KEYS
  // vira propriedade PRÓPRIA (não polui protótipo) e o acesso por kid nunca
  // resolve para membros herdados de Object.prototype (hardening barato).
  const chaves: Record<string, Buffer> = Object.create(null);
  for (const [kid, valor] of Object.entries(parsed as Record<string, unknown>)) {
    // Cada kid do ring também precisa parsear (rotação futura apontaria o
    // ativo para ele) — recusar já na carga, não no dia da virada.
    if (!kidQrValido(kid)) {
      throw new Error(
        `QR_TOKEN_KEYS: kid '${kid}' inválido — kids devem casar ` +
          '/^[A-Za-z0-9_-]{1,32}$/ (o parser do token recusa qualquer outro).'
      );
    }
    if (typeof valor !== 'string') {
      throw new Error(`QR_TOKEN_KEYS: segredo do kid '${kid}' deve ser string base64url.`);
    }
    const bytes = base64UrlParaBytes(valor);
    if (bytes === null || bytes.length < QR_SEGREDO_MIN_BYTES) {
      throw new Error(
        `QR_TOKEN_KEYS: segredo do kid '${kid}' inválido ou curto ` +
          `(mínimo ${QR_SEGREDO_MIN_BYTES} bytes decodificados).`
      );
    }
    chaves[kid] = Buffer.from(bytes);
  }

  if (!Object.hasOwn(chaves, ativo)) {
    throw new Error(
      `QR_TOKEN_KID_ATIVO='${ativo}' não existe em QR_TOKEN_KEYS — rotação incompleta.`
    );
  }
  return { ativo, chaves };
}

let keyringCache: QrKeyring | null | undefined;

/** Keyring do processo (cache por instância da Function). */
export function obterQrKeyring(): QrKeyring | null {
  if (keyringCache === undefined) {
    keyringCache = carregarQrKeyring();
  }
  return keyringCache;
}

// ---------------------------------------------------------------------------
// Assinar / verificar (HMAC-SHA256 — algoritmo fixo da versão LLQR1)
// ---------------------------------------------------------------------------

/**
 * Emite um token assinado para o payload (caminho de emissão — S1206/seed).
 * Determinístico: mesmo payload + mesma chave ⇒ mesmo token.
 */
export function assinarQrToken(
  payload: QrTokenPayload,
  keyring: QrKeyring
): string {
  // Kid que o parse recusa NUNCA pode assinar: o token sairia válido na
  // emissão e seria rejeitado em TODA verificação (ingresso natimorto).
  // `carregarQrKeyring` já barra na carga; este guard cobre keyring montado
  // à mão (seed/testes). Re-review Fable C-T1 A2.
  if (!kidQrValido(keyring.ativo)) {
    throw new Error(
      `Kid ativo '${keyring.ativo}' inválido (/^[A-Za-z0-9_-]{1,32}$/) — ` +
        'token assinado com ele jamais verificaria (parse recusa).'
    );
  }
  // Mesma blindagem de posse própria: guarda contra keyring montado à mão com
  // um `ativo` que colidiria com membro herdado de Object.prototype.
  if (!Object.hasOwn(keyring.chaves, keyring.ativo)) {
    throw new Error(`Keyring sem o kid ativo '${keyring.ativo}'.`);
  }
  const chave = keyring.chaves[keyring.ativo];
  if (chave === undefined) {
    // Impossível após carregarQrKeyring; guarda contra keyring montado à mão
    throw new Error(`Keyring sem o kid ativo '${keyring.ativo}'.`);
  }
  const payloadB64 = codificarPayloadQr(payload);
  const conteudo = conteudoAssinadoQr(keyring.ativo, payloadB64);
  const assinatura = createHmac('sha256', chave).update(conteudo, 'utf8').digest();
  return `${conteudo}.${bytesParaBase64Url(new Uint8Array(assinatura))}`;
}

export type VerificacaoQrToken =
  | { ok: true; payload: QrTokenPayload; kid: string }
  | {
      ok: false;
      /**
       * Causa INTERNA (log/teste). Externamente as três colapsam em
       * "QR adulterado" — não dar oráculo de qual parte falhou.
       */
      causa: 'formato' | 'kid_desconhecido' | 'assinatura';
    };

/**
 * Verifica assinatura + estrutura do token apresentado pelo cliente.
 * NUNCA confiar no payload antes deste retorno `ok: true`.
 */
export function verificarQrToken(
  token: unknown,
  keyring: QrKeyring
): VerificacaoQrToken {
  const parsed = parseQrToken(token);
  if (!parsed.ok) {
    return { ok: false, causa: 'formato' };
  }
  // Object.hasOwn ANTES de qualquer acesso: `kid` vem do cliente e KID_REGEX
  // aceita nomes herdados de Object.prototype (constructor, hasOwnProperty,
  // toString, __proto__…). Acesso direto resolveria para a função/objeto
  // herdado (não undefined) e cairia em createHmac(secret=<function>) →
  // ERR_INVALID_ARG_TYPE não tratado → callable devolve `internal` em vez do
  // código acionável. Checar posse própria fecha o oráculo e a exceção.
  if (!Object.hasOwn(keyring.chaves, parsed.kid)) {
    return { ok: false, causa: 'kid_desconhecido' };
  }
  const chave = keyring.chaves[parsed.kid];
  if (chave === undefined) {
    return { ok: false, causa: 'kid_desconhecido' };
  }
  const esperada = createHmac('sha256', chave)
    .update(parsed.conteudoAssinado, 'utf8')
    .digest();
  const apresentada = Buffer.from(parsed.assinatura);
  if (
    esperada.length !== apresentada.length ||
    !timingSafeEqual(esperada, apresentada)
  ) {
    return { ok: false, causa: 'assinatura' };
  }
  return { ok: true, payload: parsed.payload, kid: parsed.kid };
}
