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
} from '@leela/core';

/** Agregado demográfico de UM evento (espelho do doc mantido pela Function). */
export interface DemografiaEvento {
  tenantId: string;
  /** Nº de inscritos confirmados considerados na recontagem */
  totalConfirmados: number;
  /** Contagem por faixa etária (idade na data civil do evento) */
  faixasEtarias: Record<FaixaEtaria, number>;
  /** Confirmados sem nascimento válido (checkout mínimo/legado) */
  semNascimento: number;
  /** Contagem por gênero declarado (enum canônico) */
  porGenero: Record<GeneroInscrito, number>;
  /** Confirmados sem gênero válido */
  semGenero: number;
}

function toCount(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
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
  return {
    tenantId: typeof data['tenantId'] === 'string' ? data['tenantId'] : '',
    totalConfirmados: toCount(data['totalConfirmados']),
    faixasEtarias,
    semNascimento: toCount(data['semNascimento']),
    porGenero,
    semGenero: toCount(data['semGenero']),
  };
}

/**
 * Lê o agregado demográfico do evento (`demografia/current`). Retorna null
 * quando ainda não foi computado. Só o tenant dono (owner/staff) ou
 * platform_admin lê — cross-tenant vira permission-denied (Rules).
 */
export async function getDemografiaEvento(
  db: Firestore,
  eventoId: string
): Promise<DemografiaEvento | null> {
  const snap = await getDoc(doc(db, 'eventos', eventoId, 'demografia', 'current'));
  if (!snap.exists()) return null;
  return parseDemografiaDoc(snap.data());
}
