// =============================================================================
// packages/core/src/pedidos/aceites.ts
//
// Aceites VERSIONADOS do pedido — "termos no pagar" (LEELA-CKMOD · spec
// CHECKOUT-UX §5.3, ratificada 2026-07-18 · padrão RN-149 do regulamento).
//
// DOIS aceites gateiam o botão de pagar:
//   (a) termos da compra + política de cancelamento — o TEXTO é renderizado
//       da `politicaVendas/config` (RN-338/339/340/343/344, com defaults
//       legais CDC Art. 49); a VERSÃO aceita é a versão VIGENTE da política
//       (`versaoPoliticaVendas` — politicaVendas.ts) no instante da compra;
//   (b) termo de responsabilidade de saúde (padrão Sympla Sports) — template
//       do PRODUTO; a versão vigente é a constante TERMO_SAUDE_VERSAO_VIGENTE
//       daqui (bump da constante SEMPRE que o texto do template mudar —
//       mesma disciplina do regulamentoVersao).
//
// ONDE MORA (premissa CKMOD, aberta a ajuste do Vitor): no PEDIDO
// (`pedidos/{id}.aceites`) — o aceite é UM ato do responsável/pagador no
// passo de pagamento; espelhar N× nos inscritos denormalizaria prova legal
// sem ganho de leitura (o inscrito chega ao pedido por pedidoRef, O(1)).
// Distinto do `regulamentoAceite` POR INSCRITO (RN-149/S1207 — outro lote).
//
// ANTI-FORJA (Schneier): o cliente manda SÓ booleans de confirmação
// ({termos: true, saude: true}); a VERSÃO e o TIMESTAMP são carimbados pelo
// SERVIDOR (versão lida DENTRO da tx do checkout + serverTimestamp). As Rules
// de `pedidos` negam toda escrita de cliente — aceite inforjável e
// irretocável por construção.
//
// A declaração de aptidão (b) é ACEITE DE TERMO, não dado de saúde — pode
// viver no pedido. PAR-Q/atestado (dado sensível real, RN-146/147) seguem
// EXCLUSIVOS da subcoleção `inscritos/{id}/saude` (saudeInscrito.ts) — a
// superfície de coleta no checkout é lote futuro (D-7).
// =============================================================================

import type { Timestamp } from '../index';

/**
 * Versão VIGENTE do termo de responsabilidade de saúde (template Leela,
 * padrão "Termo do Atleta" Sympla Sports). Bump OBRIGATÓRIO a cada mudança
 * do texto do template (contrato legal — RN-149 pattern).
 */
export const TERMO_SAUDE_VERSAO_VIGENTE = 1;

/** Um aceite versionado: qual versão do texto + quando (timestamp servidor). */
export interface AceiteVersionado {
  /** Versão do texto aceita (monotônica — RN-149 pattern). */
  versao: number;
  aceiteEm: Timestamp;
  /**
   * Hash (sha256 hex) do MATERIAL efetivamente vigente no instante do aceite
   * — lido na MESMA tx que grava a prova (fix F-1 da review antagonista
   * CKMOD): o bump de versão é trigger ASSÍNCRONO, então `versao` sozinha
   * pode apontar material defasado na janela edição→bump. Com o hash a prova
   * é AUTOSSUFICIENTE: aponta o conteúdo aceito, não só o número. Presente
   * nos termos (material da politicaVendas); opcional por schema evolution
   * (aceites gravados antes do fix não o carregam).
   */
  materialHash?: string;
}

/** Bloco de aceites do pedido (spec §5.3 — os DOIS são obrigatórios juntos). */
export interface AceitesPedido {
  /** (a) Termos da compra + política de cancelamento (politicaVendas). */
  termos: AceiteVersionado;
  /** (b) Termo de responsabilidade de saúde BASE (template do produto). */
  saude: AceiteVersionado;
  /**
   * (c) Termo de saúde CUSTOM do organizador (CK2-T4 · RN-156 — ADITIVO,
   * nunca substitui o base). Presente SE E SOMENTE SE o evento tinha termo
   * custom ATIVO no instante da compra (fence server-side); versão+hash do
   * texto do organizador carimbados na MESMA tx (termoSaude.ts). Ausente =
   * evento sem termo custom (ou pedido pré-CK2 — schema evolution).
   */
  saudeCustom?: AceiteVersionado;
}

/**
 * Valida o INPUT de aceites do checkout (o que o cliente manda): objeto
 * `{termos: true, saude: true}` — ambos LITERALMENTE true (checkbox parcial
 * nunca deveria chegar ao servidor: o gate da UI é o botão de pagar).
 * `saudeCustom` (CK2-T4 · RN-156) é opcional no SHAPE — presente deve ser
 * true literal; a OBRIGATORIEDADE dele depende da config do evento e é
 * decidida DENTRO da tx do checkout (fence — não aqui, que é pura).
 * Retorna a lista de erros (vazia = válido). @pure
 */
export function validarAceitesCheckoutInput(raw: unknown): string[] {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['"aceites" deve ser objeto {termos: true, saude: true}.'];
  }
  const a = raw as Record<string, unknown>;
  const erros: string[] = [];
  if (a['termos'] !== true) {
    erros.push('"aceites.termos" deve ser true (aceite dos termos da compra é obrigatório).');
  }
  if (a['saude'] !== true) {
    erros.push('"aceites.saude" deve ser true (termo de responsabilidade de saúde é obrigatório).');
  }
  if (a['saudeCustom'] !== undefined && a['saudeCustom'] !== true) {
    erros.push('"aceites.saudeCustom" quando enviado deve ser true (RN-156).');
  }
  return erros;
}

function parseAceite(contexto: string, campo: string, raw: unknown): AceiteVersionado {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${contexto}: "aceites.${campo}" inválido (RN-149 pattern)`);
  }
  const a = raw as Record<string, unknown>;
  const versao = a['versao'];
  if (typeof versao !== 'number' || !Number.isInteger(versao) || versao < 1) {
    throw new Error(
      `${contexto}: "aceites.${campo}.versao" deve ser inteiro ≥ 1 (versão vigente no aceite)`
    );
  }
  if (a['aceiteEm'] == null) {
    throw new Error(
      `${contexto}: "aceites.${campo}.aceiteEm" ausente — aceite sem carimbo não é prova (RN-149)`
    );
  }
  // materialHash (F-1): opcional (schema evolution); presente deve ser hex
  // sha256 plausível — prova corrompida é pior que ausente.
  const materialHash = a['materialHash'];
  if (
    materialHash !== undefined &&
    (typeof materialHash !== 'string' || !/^[0-9a-f]{64}$/.test(materialHash))
  ) {
    throw new Error(
      `${contexto}: "aceites.${campo}.materialHash" deve ser sha256 hex (F-1)`
    );
  }
  return {
    versao,
    aceiteEm: a['aceiteEm'] as Timestamp,
    ...(materialHash !== undefined ? { materialHash: materialHash as string } : {}),
  };
}

/**
 * Parsing defensivo do bloco de aceites persistido no pedido (fail-fast:
 * prova de aceite corrompida é pior que ausente). Os DOIS aceites são
 * obrigatórios quando o bloco existe — a spec §5.3 não admite aceite parcial.
 * @pure
 */
export function parseAceitesPedido(contexto: string, raw: unknown): AceitesPedido {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${contexto}: "aceites" inválido (bloco {termos, saude})`);
  }
  const a = raw as Record<string, unknown>;
  return {
    termos: parseAceite(contexto, 'termos', a['termos']),
    saude: parseAceite(contexto, 'saude', a['saude']),
    // CK2-T4 (RN-156): aceite do termo custom — opcional (só eventos com
    // termo custom ativo no instante da compra o carregam).
    ...(a['saudeCustom'] !== undefined
      ? { saudeCustom: parseAceite(contexto, 'saudeCustom', a['saudeCustom']) }
      : {}),
  };
}
