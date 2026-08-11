// =============================================================================
// packages/core/src/eventos/faceMinimaVenda.ts
//
// RN-559 — a venda PAGA tem face mínima de R$ 10,00 (E04 · decisão do dono em
// 2026-08-11, item SERV-2: "venda minima é de 10 reais").
//
// POR QUE ELA EXISTE: com o piso do Serviço em R$ 3,00 (RN-491), uma venda de
// R$ 2,00 deixaria o líquido do organizador NEGATIVO, e o clamp da RN-494
// ("o Serviço nunca ultrapassa a face") só esconderia a divergência uma camada
// acima. A RN-559 resolve na ORIGEM: a face que nasce abaixo de R$ 10,00 não
// existe, então o caso some antes de virar dinheiro. A RN-494 PERMANECE como
// cinto de segurança de camada — defesa em profundidade, não substituto.
//
// GRATUITO CONTINUA PERMITIDO: a frase do dono fala de "venda", e gratuidade
// não é venda. R$ 0,00 passa; o mínimo vale para qualquer face > 0. Default do
// maestro registrado e VETÁVEL — se o dono quiser mínimo também no gratuito, a
// mudança é `preco === 0` sair de `faceMinimaVendaPagaValida`.
//
// SEM MIGRAÇÃO DE LEGADO (default registrado): nenhum lote de produção nasceu
// entre R$ 0,01 e R$ 9,99 (a purga deixou um evento, face 10). A regra nasce
// sem retroagir — por isso ela NÃO entra em `parseLote`/`loteShapeValido`, que
// são LEITURA e shape: um doc legado com face de R$ 5,00 tem de continuar
// legível. A validação vive só nos caminhos de ESCRITA, e é lá que ela barra.
//
// Enforcement em três camadas (defesa em profundidade — molde de
// `precoBloqueado.ts`):
//   1. Tela: `validarFormLote` (apps/painel/.../lotes/_lib/loteForm.ts) recusa
//      antes de enviar, com MSG_FACE_MINIMA_VENDA_PAGA no campo de preço;
//   2. Security Rules: `faceMinimaVendaPagaOk()` dentro de `match /lotes` —
//      a fechadura, aplicada no create e no update que TOCA o preço;
//   3. Functions: `guardPrecoLote.assertFaceMinimaVendaPaga` — o Admin SDK
//      bypassa as Rules, então toda Function que grave preço de lote passa
//      por ele e recusa com motivo NOMEADO.
// =============================================================================

/**
 * Face mínima de uma venda PAGA, em R$ (RN-559). Valor do dono, não é config
 * de tabela: mudar exige decisão dele (condição de reabertura registrada em
 * `02-rodadas/2026-08-11-decisoes-dono/01-decisoes-dono.md`).
 */
export const FACE_MINIMA_VENDA_PAGA_REAIS = 10;

/** A mesma face mínima em centavos inteiros — para quem conta em centavos. */
export const FACE_MINIMA_VENDA_PAGA_CENTAVOS = 1000;

/**
 * Motivo NOMEADO da recusa (RN-559). Recusa genérica não serve: quem lê o log
 * ou o erro precisa distinguir "abaixo do mínimo" de "número inválido", que
 * têm conserto diferente.
 */
export type MotivoFaceInvalida =
  /** 0 < face < R$ 10,00 — a venda paga barata que a RN-559 recusa. */
  | 'face_abaixo_da_minima'
  /** Não é número finito ≥ 0 — shape, jurisdição de `loteShapeValido`. */
  | 'face_nao_e_numero_valido';

/** Aviso canônico da recusa por face mínima — português comum, sem jargão. */
export const MSG_FACE_MINIMA_VENDA_PAGA =
  'A venda paga mínima é R$ 10,00. Para não cobrar nada, deixe R$ 0,00 — ' +
  'a inscrição gratuita continua permitida.';

/** Aviso da recusa por número inválido (negativo, infinito, não-número). */
export const MSG_FACE_NAO_E_NUMERO_VALIDO =
  'O preço precisa ser um valor em reais de R$ 0,00 para cima.';

/** Resultado da validação: passou, ou recusou com motivo nomeado e mensagem. */
export type ResultadoFaceMinima =
  | { ok: true }
  | { ok: false; motivo: MotivoFaceInvalida; mensagem: string };

/**
 * A face proposta é aceitável para uma venda? (RN-559)
 *
 * `true` para R$ 0,00 (gratuito) e para qualquer face ≥ R$ 10,00.
 * `false` para 0 < face < 10 e para tudo que não é número finito ≥ 0.
 * @pure
 */
export function faceMinimaVendaPagaValida(preco: unknown): preco is number {
  if (typeof preco !== 'number' || !Number.isFinite(preco) || preco < 0) return false;
  return preco === 0 || preco >= FACE_MINIMA_VENDA_PAGA_REAIS;
}

/**
 * Valida a face proposta e NOMEIA a recusa (RN-559). É esta função que as três
 * camadas consomem quando precisam dizer POR QUE recusaram. @pure
 */
export function validarFaceMinimaVendaPaga(preco: unknown): ResultadoFaceMinima {
  if (typeof preco !== 'number' || !Number.isFinite(preco) || preco < 0) {
    return {
      ok: false,
      motivo: 'face_nao_e_numero_valido',
      mensagem: MSG_FACE_NAO_E_NUMERO_VALIDO,
    };
  }
  if (preco === 0 || preco >= FACE_MINIMA_VENDA_PAGA_REAIS) return { ok: true };
  return {
    ok: false,
    motivo: 'face_abaixo_da_minima',
    mensagem: MSG_FACE_MINIMA_VENDA_PAGA,
  };
}
