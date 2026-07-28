// =============================================================================
// packages/core/src/affiliation/marcoComissao.ts
//
// MARCO DE COMISSÃO — a régua do aviso "sua comissão chegou a X" (RN-386,
// S706-T1). Puro, sem IO: quem decide se houve marco é esta função; quem
// dispara é a Function.
//
// O PASSO É CONSTANTE ÚNICA (padrão `PIX_EXPIRACAO_SEGUNDOS`/RN-157): o Vitor
// ajusta a régua num lugar só e nada mais no sistema conhece o número 100.
//
// A DECISÃO DE MODELAGEM que importa (Kleppmann — o estado é derivado, não
// guardado): não existe campo "último marco avisado" no afiliado. O marco é
// função de DOIS valores da comissão acumulada — antes e depois da conversão —
// e a não-duplicação nasce do docId determinístico do log de comunicação
// (`marco-{faixa}`), não de um contador paralelo. Consequências:
//
//   1. Marco atravessado PARA BAIXO por estorno não avisa (a função só olha
//      subida) e não REARMA a faixa: quando a comissão volta a 110 depois de
//      cair a 80, a função devolve 100 de novo, mas o log já tem
//      `marco-100` e o segundo aviso morre na chave. É o comportamento que a
//      RN-386 pede — "aviso de comissão é boa notícia, não cobrança" — e ele
//      cai de graça do modelo em vez de exigir uma tabela de controle.
//   2. Subida que pula duas faixas avisa SÓ a maior alcançada (90 → 350 avisa
//      300, não 100 e 200): três e-mails por uma venda seria ruído.
//
// ARITMÉTICA EM CENTAVOS INTEIROS: comparar múltiplos com `%` de float faz
// 300.00 virar 299.99999999999994 e o marco somem. Toda a conta roda em
// inteiros e só o resultado volta a reais.
// =============================================================================

/**
 * Passo do marco de comissão, em REAIS (RN-386). Ajuste aqui e em lugar
 * nenhum mais — nenhuma tela, Function ou template repete este número.
 */
export const PASSO_MARCO_COMISSAO = 100;

/**
 * Marco especial "primeira comissão do afiliado naquele evento" (RN-386).
 * Vale `0` porque é literalmente a travessia de zero: o afiliado não tinha
 * comissão e passou a ter. Fica distinto de qualquer múltiplo real, que é
 * sempre ≥ `PASSO_MARCO_COMISSAO`.
 */
export const MARCO_PRIMEIRA_COMISSAO = 0;

/** Reais → centavos inteiros (a conta de marco nunca vê float). @pure */
function emCentavos(valorEmReais: number): number {
  return Math.round(valorEmReais * 100);
}

/**
 * Maior múltiplo do passo já alcançado por um acumulado. @pure
 * Ex. (passo 100): 0 → 0 · 99,99 → 0 · 100 → 100 · 350 → 300.
 */
export function faixaDoAcumulado(acumulado: number): number {
  if (!Number.isFinite(acumulado) || acumulado <= 0) return 0;
  const passoCents = emCentavos(PASSO_MARCO_COMISSAO);
  if (passoCents <= 0) return 0;
  return Math.floor(emCentavos(acumulado) / passoCents) * PASSO_MARCO_COMISSAO;
}

/**
 * Houve marco entre `anterior` e `atual`? @pure
 *
 * @returns o marco ALCANÇADO (em reais) quando a comissão subiu e cruzou a
 *   régua — `MARCO_PRIMEIRA_COMISSAO` (0) para a primeira comissão do
 *   afiliado, ou o múltiplo do passo mais alto alcançado. `null` quando não
 *   houve marco: comissão que desceu, que ficou igual, ou que subiu dentro da
 *   mesma faixa.
 *
 * Nunca devolve mais de um marco: quem pula faixas recebe só a maior.
 */
export function faixaCruzada(anterior: number, atual: number): number | null {
  if (!Number.isFinite(anterior) || !Number.isFinite(atual)) return null;
  const antes = Math.max(0, anterior);
  const depois = Math.max(0, atual);
  if (emCentavos(depois) <= emCentavos(antes)) return null;

  const faixaAntes = faixaDoAcumulado(antes);
  const faixaDepois = faixaDoAcumulado(depois);
  if (faixaDepois > faixaAntes) return faixaDepois;

  // Mesma faixa: só é marco se o afiliado saiu do zero agora (primeira
  // comissão dele no evento). Subir de 40 para 60 não é notícia.
  if (emCentavos(antes) === 0 && emCentavos(depois) > 0) {
    return MARCO_PRIMEIRA_COMISSAO;
  }
  return null;
}

/**
 * Chave de idempotência do aviso de marco, no formato que o log de comunicação
 * aceita (`CHAVE_LOG_COMUNICACAO_RE` — sem `_`, que é o separador do docId).
 * `marco-primeira` para a primeira comissão; `marco-300` para os múltiplos.
 * @pure
 */
export function chaveAvisoMarco(faixa: number): string {
  if (!Number.isFinite(faixa) || faixa < 0) {
    throw new Error(`chaveAvisoMarco: faixa inválida "${String(faixa)}"`);
  }
  if (faixa === MARCO_PRIMEIRA_COMISSAO) return 'marco-primeira';
  return `marco-${Math.round(faixa)}`;
}
