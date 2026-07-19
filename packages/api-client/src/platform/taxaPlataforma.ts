// =============================================================================
// packages/api-client/src/platform/taxaPlataforma.ts
//
// Taxa-flex GLOBAL da plataforma (LEELA-TAXAFLEX · RN-178/404).
//
// LEITURA: `platform/config` — Rules permitem read SÓ a platform_admin.
// ESCRITA: NUNCA pelo client SDK (Rules `platform/` = write:false para
// todos) — o caminho é o callable `setTaxaPlataformaGlobal` (Admin SDK no
// servidor, papel checado no token). Este módulo só tipa o contrato.
//
// O OVERRIDE por organizador (`commercialTerms.taxaTabela`) NÃO passa por
// aqui: viaja no fluxo existente de `saveCommercialTerms` (S1602-T1/T2).
// =============================================================================

import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';
import {
  PLATFORM_CONFIG_DOC_PATH,
  CAMPO_TAXA_PLATAFORMA,
  validarTabelaTaxaPlataforma,
  type TabelaTaxaPlataforma,
} from '@leela/core';

/**
 * Lê a tabela GLOBAL de taxa por meio (`platform/config.taxaPlataforma`).
 * `null` = ainda não configurada (o checkout cai no `platformFeePct` legado
 * por tenant — RN-178, cadeia override > global > legado). Shape inválido
 * (doc corrompido) também devolve `null` — leitura fail-safe; a escrita é
 * fail-closed no callable.
 */
export async function getTaxaPlataformaGlobal(
  db: Firestore
): Promise<TabelaTaxaPlataforma | null> {
  const snap = await getDoc(doc(db, PLATFORM_CONFIG_DOC_PATH));
  if (!snap.exists()) return null;
  const tabela = snap.get(CAMPO_TAXA_PLATAFORMA) as unknown;
  if (tabela === undefined || validarTabelaTaxaPlataforma(tabela).length > 0) {
    return null;
  }
  return tabela as TabelaTaxaPlataforma;
}

export interface SetTaxaPlataformaGlobalResult {
  ok: true;
}

/**
 * Grava a tabela GLOBAL via callable `setTaxaPlataformaGlobal` (só
 * platform_admin — enforçado no servidor; RN-178/404). Tabela COMPLETA
 * (pix + cartao + boleto). Mudar a tabela nunca reprecifica pedido feito
 * (RN-179 — congelamento no ato da compra).
 */
export async function setTaxaPlataformaGlobal(
  functions: Functions,
  taxaPlataforma: TabelaTaxaPlataforma
): Promise<SetTaxaPlataformaGlobalResult> {
  const call = httpsCallable<
    { taxaPlataforma: TabelaTaxaPlataforma },
    SetTaxaPlataformaGlobalResult
  >(functions, 'setTaxaPlataformaGlobal');
  return (await call({ taxaPlataforma })).data;
}
