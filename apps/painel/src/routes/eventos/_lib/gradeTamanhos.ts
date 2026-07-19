// =============================================================================
// gradeTamanhos — derivações puras da grade corte→tamanho (RN-231 · RN-232 ·
// TAMANHOS-GRADE). Sem I/O: rótulos pt-BR de corte/sufixo e o acompanhamento
// de ENTREGAS por SKU (entregues vs pendentes) derivado dos inscritos usando
// o MESMO conceito de fulfillment do balcão (presença registrada = kit
// retirado, RN-205) — nada de estado novo no servidor.
// =============================================================================

import {
  parseSufixoTamanho,
  presencaRegistrada,
  skuId,
  type CorteItem,
  type Inscrito,
} from '@leela/core';

/** Rótulos pt-BR do corte (RN-231). */
export const CORTE_LABEL: Record<CorteItem, string> = {
  feminina: 'Feminina',
  masculina: 'Masculina',
  unissex: 'Unissex',
};

/** Ordem de EXIBIÇÃO dos cortes (feminina → masculina → unissex). */
export const ORDEM_CORTES: readonly CorteItem[] = ['feminina', 'masculina', 'unissex'];

/**
 * Rótulo curto do sufixo de SKU armazenado em `inscrito.tamanhos[itemId]`:
 * `'M'` → "M" (unissex/legado) · `'feminina__M'` → "Feminina M".
 * Sufixo malformado ecoa cru (dado é do servidor; UI não esconde). @pure
 */
export function rotuloSufixo(sufixo: string): string {
  const d = parseSufixoTamanho(sufixo);
  if (d === null) return sufixo;
  return d.corte === 'unissex' ? d.tamanho : `${CORTE_LABEL[d.corte]} ${d.tamanho}`;
}

/** Entregas de um SKU: confirmados que escolheram o SKU × já atendidos. */
export interface EntregasSku {
  entregues: number;
  pendentes: number;
}

/**
 * Acompanhamento de ENTREGAS por corte×tamanho (RN-232·e): para cada inscrito
 * CONFIRMADO com escolha no map `tamanhos`, o SKU correspondente soma
 * `entregues` (presença registrada — kit retirado no balcão, RN-205) ou
 * `pendentes`. Chave = docId do SKU (`itemId__[corte__]tamanho`), a mesma da
 * subcoleção de aprovisionamento. Sufixo malformado é PULADO (nunca inventa
 * SKU). @pure
 */
export function entregasPorSku(
  inscritos: readonly Inscrito[],
): Map<string, EntregasSku> {
  const porSku = new Map<string, EntregasSku>();
  for (const inscrito of inscritos) {
    if (inscrito.status !== 'confirmado') continue;
    const entregue = presencaRegistrada(inscrito);
    for (const [itemId, sufixo] of Object.entries(inscrito.tamanhos)) {
      const d = parseSufixoTamanho(sufixo);
      if (itemId.length === 0 || itemId.includes('__') || d === null) continue;
      const sku = skuId(itemId, d.tamanho, d.corte);
      const atual = porSku.get(sku) ?? { entregues: 0, pendentes: 0 };
      if (entregue) atual.entregues += 1;
      else atual.pendentes += 1;
      porSku.set(sku, atual);
    }
  }
  return porSku;
}
