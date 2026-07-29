// =============================================================================
// functions/src/eventos/linkIngresso.ts
//
// Assinatura e verificação SERVER-SIDE do token do link da página do ingresso
// (LEELA-S1214-T1 · RN-419/RN-420). Complementa a parte pura em
// `packages/core/src/tickets/linkIngresso.ts` (formato, parse estrutural).
//
// SEGREDO: o MESMO keyring do `qrToken` (`QR_TOKEN_KEYS` + `QR_TOKEN_KID_ATIVO`,
// carregado por `./qrToken.ts`). Reusar o ring em vez de criar um segredo novo
// é decisão de OPERAÇÃO, não de preguiça (D-ING-2): dois segredos são duas
// rotações, dois lugares para errar e duas chances de alguém deixar um deles
// para trás. A separação entre os dois domínios não vem do segredo — vem da
// constante de versão, que participa do HMAC.
//
// BINDING AO `qrToken` VIGENTE (RN-420 · D-ING-4) — a parte que a review vai
// atacar (⚔ vetor 5), porque é fácil confundir com rotação:
//
//   assinatura = HMAC(chave[kid], "LLIP1.<kid>.<payloadB64>" + "\n" + qrToken)
//
//   1. ROTAÇÃO DE CHAVE NÃO INVALIDA LINK EMITIDO. O `kid` viaja dentro do
//      token e o ring guarda os kids antigos; trocar o kid ATIVO muda só o que
//      passa a ser assinado dali em diante.
//   2. TIRAR O KID DO RING REVOGA EM MASSA tudo que aquele kid assinou. É a
//      alavanca de emergência.
//   3. RE-EMITIR O INGRESSO INVALIDA O LINK ANTIGO daquele inscrito, porque a
//      assinatura cobre o `qrToken` gravado e a re-emissão o troca. Revogação
//      individual sem campo novo, sem coleção nova e sem contador — a MESMA
//      semântica que o balcão já aplica (`qr_divergente`).
//
// O separador `\n` entre a parte visível e o `qrToken` não é decoração: sem
// ele, "A" + "BC" e "AB" + "C" produziriam o mesmo material assinado. O
// alfabeto base64url e o formato do `qrToken` (que também é base64url pontuado)
// não contêm `\n`, então o separador é INAMBÍGUO por construção.
//
// SEM `exp`. O ingresso é comprovante de uma compra e a pessoa abre o link na
// fila da largada, meses depois, com a rede ruim (D-ING-5). O que expira é o
// ESTADO do inscrito, lido a cada abertura.
// =============================================================================

import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  codificarPayloadLinkIngresso,
  conteudoVisivelLinkIngresso,
  dominiosDeTokenSeparados,
  montarLinkIngressoToken,
  parseLinkIngressoToken,
  type LinkIngressoPayload,
} from '../../../packages/core/src/tickets/linkIngresso';
import { bytesParaBase64Url, kidQrValido } from '../../../packages/core/src/eventos/qrToken';
import type { QrKeyring } from './qrToken';

// Guarda de CARGA: se algum dia as duas constantes de versão colapsarem, um
// token de link passaria a abrir o portão do evento (e vice-versa). Falhar no
// import é barulhento e acontece antes de qualquer request — que é onde este
// tipo de erro tem de morrer. Espelha a disciplina de `carregarQrKeyring`.
if (!dominiosDeTokenSeparados()) {
  throw new Error(
    'VERSAO_LINK_INGRESSO === VERSAO_QR_TOKEN — os domínios do link e do QR ' +
      'de presença colapsaram; um token de link abriria o check-in.'
  );
}

/**
 * Material assinado: parte visível do token + `\n` + `qrToken` vigente.
 * Isolado numa função porque assinar e verificar TÊM de derivar do mesmo
 * lugar — duas montagens equivalentes são exatamente onde o binding some sem
 * ninguém notar. @pure
 */
export function materialAssinadoLinkIngresso(
  conteudoVisivel: string,
  qrTokenVigente: string
): string {
  return `${conteudoVisivel}\n${qrTokenVigente}`;
}

/**
 * Emite o token do link para um inscrito que JÁ TEM ingresso emitido.
 *
 * `qrTokenVigente` vazio é ERRO, não caso degradado: sem token gravado não há
 * a que amarrar o link, e um link amarrado ao vazio (a) não seria revogável
 * pela re-emissão e (b) morreria no instante em que o ingresso ficasse pronto.
 * Quem não tem ingresso não recebe link — recebe, no e-mail, a frase de
 * emissão em andamento que a RN-398 já escreve (ver a premissa P-INGPAGE-1 do
 * handoff da lane).
 */
export function assinarLinkIngresso(
  payload: LinkIngressoPayload,
  qrTokenVigente: string,
  keyring: QrKeyring
): string {
  if (typeof qrTokenVigente !== 'string' || qrTokenVigente.length === 0) {
    throw new Error(
      'Link do ingresso exige o `qrToken` vigente do inscrito (RN-420) — ' +
        'inscrito sem ingresso emitido não recebe link.'
    );
  }
  // Kid que o parse recusa NUNCA pode assinar: o link sairia válido na emissão
  // e seria rejeitado em TODA verificação (link natimorto). Mesma guarda de
  // `assinarQrToken`.
  if (!kidQrValido(keyring.ativo)) {
    throw new Error(
      `Kid ativo '${keyring.ativo}' inválido (/^[A-Za-z0-9_-]{1,32}$/) — ` +
        'link assinado com ele jamais verificaria (parse recusa).'
    );
  }
  if (!Object.hasOwn(keyring.chaves, keyring.ativo)) {
    throw new Error(`Keyring sem o kid ativo '${keyring.ativo}'.`);
  }
  const chave = keyring.chaves[keyring.ativo];
  if (chave === undefined) {
    throw new Error(`Keyring sem o kid ativo '${keyring.ativo}'.`);
  }

  const payloadB64 = codificarPayloadLinkIngresso(payload);
  const visivel = conteudoVisivelLinkIngresso(keyring.ativo, payloadB64);
  const assinatura = createHmac('sha256', chave)
    .update(materialAssinadoLinkIngresso(visivel, qrTokenVigente), 'utf8')
    .digest();
  return montarLinkIngressoToken(
    keyring.ativo,
    payloadB64,
    bytesParaBase64Url(new Uint8Array(assinatura))
  );
}

export type VerificacaoLinkIngresso =
  | { ok: true; payload: LinkIngressoPayload; kid: string }
  | {
      ok: false;
      /**
       * Causa INTERNA (log/teste). Externamente TODAS colapsam numa resposta
       * só — o endpoint não dá oráculo de qual parte falhou (RN-419).
       */
      causa: 'formato' | 'kid_desconhecido' | 'sem_ingresso' | 'assinatura';
    };

/**
 * Parse estrutural do token, SEM tocar no segredo. Serve ao endpoint para
 * descobrir QUAL inscrito ler antes de poder verificar o binding — o payload
 * lido aqui é entrada não confiável até o `verificarLinkIngresso` dizer `ok`.
 */
export function lerAlvoDoLinkIngresso(
  token: unknown
): { ok: true; payload: LinkIngressoPayload; kid: string } | { ok: false } {
  const parsed = parseLinkIngressoToken(token);
  if (!parsed.ok) return { ok: false };
  return { ok: true, payload: parsed.payload, kid: parsed.kid };
}

/**
 * Verifica o token apresentado contra o `qrToken` que está GRAVADO no doc.
 * NUNCA confiar no payload antes deste retorno `ok: true`.
 *
 * @param qrTokenVigente valor lido de `inscrito.qrToken`; `null`/vazio quando o
 *   ingresso ainda não foi emitido — nesse caso não existe material de binding
 *   e a verificação falha (`sem_ingresso`), colapsando na resposta genérica.
 */
export function verificarLinkIngresso(
  token: unknown,
  qrTokenVigente: string | null | undefined,
  keyring: QrKeyring
): VerificacaoLinkIngresso {
  const parsed = parseLinkIngressoToken(token);
  if (!parsed.ok) {
    return { ok: false, causa: 'formato' };
  }
  // `Object.hasOwn` ANTES de qualquer acesso: `kid` vem do cliente e o regex de
  // kid aceita nomes herdados de Object.prototype (constructor, toString,
  // __proto__…). Acesso direto resolveria para o membro herdado e cairia em
  // createHmac(secret=<function>) → exceção não tratada. Mesma blindagem do
  // `verificarQrToken`.
  if (!Object.hasOwn(keyring.chaves, parsed.kid)) {
    return { ok: false, causa: 'kid_desconhecido' };
  }
  const chave = keyring.chaves[parsed.kid];
  if (chave === undefined) {
    return { ok: false, causa: 'kid_desconhecido' };
  }
  if (typeof qrTokenVigente !== 'string' || qrTokenVigente.length === 0) {
    return { ok: false, causa: 'sem_ingresso' };
  }

  const esperada = createHmac('sha256', chave)
    .update(
      materialAssinadoLinkIngresso(parsed.conteudoVisivel, qrTokenVigente),
      'utf8'
    )
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
