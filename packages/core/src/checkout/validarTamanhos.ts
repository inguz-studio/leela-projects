// =============================================================================
// packages/core/src/checkout/validarTamanhos.ts
//
// Validação PURA de tamanhos do kit no checkout (LEELA-S209-T2 · RN-223/212 ·
// ratificação 3d "validação de tamanho na origem" — LEELA-BEPEND-T4).
//
// Fecha na ORIGEM o vetor "tamanho forjado no payload" (FABLE-D dependência
// declarada): antes deste módulo, um tamanho fora de `tamanhosDisponiveis`
// só era percebido na agregação de estoque (SKU fantasma recontado). Aqui o
// PRODUTOR DE ESCRITA (createInscricaoCharge) rejeita fail-closed — tamanho
// que não existe entre os SKUs configurados do evento NUNCA vira doc.
//
// Reutilizável web (E12) + mobile (E13): função pura, sem Firestore — o
// caller carrega os `itensKit` do evento e injeta a projeção.
//
// `exigirTamanhado` (default false): quando true, TODO item tamanhado do kit
// escolhido EXIGE tamanho (aceite S209 "a inscrição não conclui sem ele") —
// o flip é do S209-T3, quando a UI do checkout passar a coletar. Enquanto a
// coleta não existe, a ausência é tolerada (docs nascem `tamanhos: {}` como
// hoje) e SÓ o que foi informado é validado — fail-closed no forjado, zero
// quebra no fluxo vigente.
// =============================================================================

import { parseSufixoTamanho, SEPARADOR_SKU } from '../eventos/aprovisionamento';
import { gradeEfetivaDoItem, tamanhosDoCorte, type GradeCorte, type ItemKit } from '../eventos/kit';

/** Projeção mínima de um ItemKit para a validação de tamanhos.
 *  RN-231: `grade` opcional — ausente valida contra o legado
 *  `tamanhosDisponiveis` (≡ grade unissex, via gradeEfetivaDoItem). */
export type ItemKitParaTamanhos = Pick<
  ItemKit,
  'id' | 'tamanhado' | 'tamanhosDisponiveis' | 'kits'
> & { grade?: GradeCorte[] };

/**
 * Teto SANITÁRIO de entradas no map `tamanhos` (review antagonista T4):
 * nenhum kit real tem dezenas de itens tamanhados — acima disso é payload
 * sem sentido físico (loop O(n) + eco de erro gigante), rejeitado cedo.
 * Espelha a postura do MAX_QTD_TRANSICAO_APROVISIONAMENTO (guarda, não RN).
 */
export const TAMANHOS_MAX_ENTRADAS = 30;

/** Eco SEGURO de id/valor vindo do payload nas mensagens de erro (review
 *  antagonista T4): trunca — nunca devolver strings arbitrárias inteiras. */
function eco(valor: string): string {
  return valor.length > 40 ? `${valor.slice(0, 40)}…` : valor;
}

/** Parâmetros da validação — por INSCRITO (ADR-011: tamanho é por inscrito). */
export interface ValidarTamanhosParams {
  /**
   * Map `itemId → sufixo de SKU` informado no checkout (RN-223/RN-231):
   * `'M'` (grade unissex/legado) ou `'feminina__M'` (grade por corte) —
   * exatamente o sufixo da chave de aprovisionamento (sufixoSku).
   */
  tamanhos: Readonly<Record<string, string>>;
  /** Kit escolhido pelo inscrito (`kitId` real do evento) — undefined = sem kit */
  kitId: string | undefined;
  /** Catálogo `itensKit` do EVENTO (fonte da verdade dos SKUs — RN-223) */
  itensDoEvento: readonly ItemKitParaTamanhos[];
  /** true ⇒ item tamanhado do kit SEM tamanho é erro (S209-T3) */
  exigirTamanhado?: boolean;
}

/**
 * Valida os tamanhos de UM inscrito contra os SKUs configurados do evento.
 * Retorna a lista de erros (vazia = válido) — mesma disciplina de
 * `validarCreateInscricaoChargeInput`. Fail-closed: item inexistente, item
 * fora do kit escolhido, item não tamanhado ou tamanho fora de
 * `tamanhosDisponiveis` são TODOS rejeitados (nunca persistir e "ver depois
 * no estoque"). Não ecoa nada além de ids/valores de catálogo (sem PII).
 * @pure
 */
export function validarTamanhosInscrito(params: ValidarTamanhosParams): string[] {
  const { tamanhos, kitId, itensDoEvento, exigirTamanhado = false } = params;
  const erros: string[] = [];
  const entradas = Object.entries(tamanhos);

  if (entradas.length > TAMANHOS_MAX_ENTRADAS) {
    // Teto sanitário — rejeita cedo, sem iterar o payload inteiro.
    return [
      `tamanhos excede ${TAMANHOS_MAX_ENTRADAS} entradas — payload sem sentido físico (review T4).`,
    ];
  }

  if (entradas.length > 0 && (kitId === undefined || kitId.length === 0)) {
    // Tamanho sem kit não referencia SKU nenhum — payload incoerente.
    return ['tamanhos informados sem kit escolhido (RN-223 — tamanho é por item do kit).'];
  }

  const porId = new Map<string, ItemKitParaTamanhos>();
  for (const item of itensDoEvento) porId.set(item.id, item);

  for (const [itemId, sufixo] of entradas) {
    if (itemId.length === 0 || itemId.includes(SEPARADOR_SKU) || typeof sufixo !== 'string') {
      // "__" no itemId quebraria o round-trip da chave de SKU (S210-T2)
      erros.push(
        `tamanhos["${eco(itemId)}"]: item deve ser não-vazio sem "${SEPARADOR_SKU}" (RN-223/S210-T2).`
      );
      continue;
    }
    // RN-231: o valor é o SUFIXO do SKU — `tamanho` (unissex) ou
    // `corte__tamanho`. Malformado (vazio, `__` sobrando, corte forjado,
    // `unissex` explícito) morre AQUI, antes de virar doc.
    const decomposto = sufixo.length > 0 ? parseSufixoTamanho(sufixo) : null;
    if (decomposto === null) {
      erros.push(
        `tamanhos["${eco(itemId)}"]: valor '${eco(sufixo)}' fora do padrão ` +
          `tamanho ou corte${SEPARADOR_SKU}tamanho (RN-231/S210-T2).`
      );
      continue;
    }
    const item = porId.get(itemId);
    if (item === undefined) {
      erros.push(`tamanhos["${eco(itemId)}"]: item não existe no evento (RN-223).`);
      continue;
    }
    if (kitId !== undefined && !item.kits.includes(kitId)) {
      erros.push(`tamanhos["${eco(itemId)}"]: item não pertence ao kit '${eco(kitId)}' (RN-215/223).`);
      continue;
    }
    if (!item.tamanhado) {
      erros.push(`tamanhos["${eco(itemId)}"]: item não é tamanhado (RN-212).`);
      continue;
    }
    const grade = gradeEfetivaDoItem(item);
    const daGrade = tamanhosDoCorte(grade, decomposto.corte);
    if (daGrade.length === 0) {
      erros.push(
        `tamanhos["${eco(itemId)}"]: corte '${decomposto.corte}' fora da grade ` +
          `[${grade.map((g) => g.corte).join(', ')}] (RN-231).`
      );
      continue;
    }
    if (!daGrade.includes(decomposto.tamanho)) {
      erros.push(
        `tamanhos["${eco(itemId)}"]: tamanho '${eco(decomposto.tamanho)}' fora dos disponíveis ` +
          `do corte ${decomposto.corte} [${daGrade.join(', ')}] (RN-223/231).`
      );
    }
  }

  // S209-T3 (atrás do flag): todo item tamanhado do kit exige tamanho.
  if (exigirTamanhado && kitId !== undefined && kitId.length > 0) {
    for (const item of itensDoEvento) {
      if (
        item.tamanhado &&
        item.kits.includes(kitId) &&
        gradeEfetivaDoItem(item).length > 0 &&
        tamanhos[item.id] === undefined
      ) {
        erros.push(`tamanhos["${item.id}"]: tamanho é obrigatório para item tamanhado (RN-223).`);
      }
    }
  }

  return erros;
}
