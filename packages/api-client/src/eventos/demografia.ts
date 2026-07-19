// =============================================================================
// packages/api-client/src/eventos/demografia.ts
//
// Leitura de `eventos/{eventoId}/demografia/current` (LEELA-BEPEND-T1 · E11
// §RN-820). SÓ leitura: as contagens são recomputadas pela Function
// `agregarDemografia` — as Rules negam TODA escrita de cliente e restringem a
// leitura a papel de gestão (owner/staff do tenant dono).
//
// O doc carrega SÓ buckets agregados (faixa etária × gênero) — nenhum dado
// individual de inscrito passa por aqui (LGPD). `null` quando o agregado
// ainda não foi computado (evento sem inscrito confirmado / gatilho não
// rodou) — ausência honesta; a tela mostra EmptyState, nunca número fake.
// =============================================================================

import { doc, getDoc, type Firestore } from 'firebase/firestore';
import {
  FAIXAS_ETARIAS,
  GENEROS_INSCRITO,
  type FaixaEtaria,
  type GeneroInscrito,
  type MatrizFaixaGenero,
} from '@leela/core';

/** Agregado demográfico de UM evento (espelho do doc mantido pela Function). */
export interface DemografiaEvento {
  tenantId: string;
  /** Nº de inscritos confirmados considerados na recontagem */
  totalConfirmados: number;
  /** Contagem por faixa etária (bandas de 5 anos — RN-822) */
  faixasEtarias: Record<FaixaEtaria, number>;
  /** Confirmados sem nascimento válido (checkout mínimo/legado) */
  semNascimento: number;
  /** Contagem por gênero declarado (enum canônico) */
  porGenero: Record<GeneroInscrito, number>;
  /** Confirmados sem gênero válido */
  semGenero: number;
  /**
   * Cohort idade×sexo (RN-822) — contagens BRUTAS do servidor. A exposição
   * na UI OBRIGATORIAMENTE passa por `suprimirCohortPorK` (@leela/core) —
   * k-anonimato, pós-soma (nunca renderizar esta matriz diretamente).
   */
  faixaXGenero: MatrizFaixaGenero;
}

function toCount(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Parse defensivo do doc `demografia/current` (chaves canônicas completas —
 * bucket ausente/lixo vira 0; contagem nunca é fabricada além do que o
 * servidor gravou). Fonte única de parsing da demografia.
 */
function parseDemografiaDoc(data: Record<string, unknown>): DemografiaEvento {
  const faixasRaw = (data['faixasEtarias'] ?? {}) as Record<string, unknown>;
  const faixasEtarias = {} as Record<FaixaEtaria, number>;
  for (const f of FAIXAS_ETARIAS) faixasEtarias[f] = toCount(faixasRaw[f]);
  const generoRaw = (data['porGenero'] ?? {}) as Record<string, unknown>;
  const porGenero = {} as Record<GeneroInscrito, number>;
  for (const g of GENEROS_INSCRITO) porGenero[g] = toCount(generoRaw[g]);
  const matrizRaw = (data['faixaXGenero'] ?? {}) as Record<string, unknown>;
  const faixaXGenero = {} as MatrizFaixaGenero;
  for (const f of FAIXAS_ETARIAS) {
    const linhaRaw = isRecord(matrizRaw[f]) ? (matrizRaw[f] as Record<string, unknown>) : {};
    const linha = {} as Record<GeneroInscrito, number>;
    for (const g of GENEROS_INSCRITO) linha[g] = toCount(linhaRaw[g]);
    faixaXGenero[f] = linha;
  }
  return {
    tenantId: typeof data['tenantId'] === 'string' ? data['tenantId'] : '',
    totalConfirmados: toCount(data['totalConfirmados']),
    faixasEtarias,
    semNascimento: toCount(data['semNascimento']),
    porGenero,
    semGenero: toCount(data['semGenero']),
    faixaXGenero,
  };
}

/**
 * Lê o agregado demográfico do evento (`demografia/current`). Retorna null
 * quando ainda não foi computado — INCLUSIVE quando o doc está no shape
 * PRÉ-RN822 (6 faixas grossas, sem `faixaXGenero`): as faixas antigas não
 * são re-bucketizáveis no cliente e exibi-las como zero seria número
 * fabricado; o doc é reescrito pelo reprocesso que anda JUNTO com o deploy
 * da Function (premissa RN-822) — até lá a tela mostra o EmptyState honesto.
 * Só o tenant dono (owner/staff) ou platform_admin lê — cross-tenant vira
 * permission-denied (Rules).
 */
export async function getDemografiaEvento(
  db: Firestore,
  eventoId: string
): Promise<DemografiaEvento | null> {
  const snap = await getDoc(doc(db, 'eventos', eventoId, 'demografia', 'current'));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!isRecord(data['faixaXGenero'])) return null; // shape pré-RN822 — aguarda reprocesso
  return parseDemografiaDoc(data);
}
