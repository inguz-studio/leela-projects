// =============================================================================
// packages/api-client/src/eventos/comunicacoes.ts
//
// Leitura do LOG DE COMUNICAÇÃO (FABLE-G-T1 · Onda 2) — as duas visões
// consultáveis do agregado único:
//   - POR INSCRITO (S1206-T2 / aba Comunicação do slide-in G-T2):
//     `listarComunicacoesDoInscrito` — query de igualdade sobre
//     `destinatario.ref` (índice single-field automático; ordenação em
//     memória — o N por inscrito é pequeno: ingresso + campanhas);
//   - POR EVENTO (E06-L3): `getResumoComunicacoes` — point read do agregado
//     ∑ `comunicacoesResumo/current` mantido pela Function (a aba NUNCA
//     conta logs no cliente).
//
// SÓ LEITURA: escrita do log é EXCLUSIVA de Function (Rules: write false).
// Leitura protegida pelas Rules via tenant do EVENTO PAI (papel de gestão —
// owner/staff; promoter/athlete não leem: PII).
// =============================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import {
  COLECAO_LOG_COMUNICACAO,
  COLECAO_RESUMO_COMUNICACOES,
  DOC_RESUMO_COMUNICACOES,
  parseLogComunicacao,
  parseResumoComunicacoes,
  type LogComunicacao,
  type ResumoComunicacoes,
} from '@leela/core';

/**
 * Lista as comunicações enviadas a UM inscrito do evento (e-mail/push, com
 * status de entrega/abertura), mais recentes primeiro (por `enfileiradoEm`).
 *
 * Filtro único de igualdade (`destinatario.ref`) → índice single-field
 * automático do Firestore; a ordenação roda em memória de propósito (evita
 * índice composto para uma coleção cujo N por inscrito é de dígito único).
 * Reusa `parseLogComunicacao` (fonte única de parsing fail-fast).
 */
export async function listarComunicacoesDoInscrito(
  db: Firestore,
  eventoId: string,
  inscritoId: string
): Promise<LogComunicacao[]> {
  const snap = await getDocs(
    query(
      collection(db, 'eventos', eventoId, COLECAO_LOG_COMUNICACAO),
      where('destinatario.ref', '==', inscritoId)
    )
  );

  return snap.docs
    .map((d) => parseLogComunicacao(d.id, d.data()))
    .sort((a, b) => b.enfileiradoEm.toMillis() - a.enfileiradoEm.toMillis());
}

/**
 * Lê o agregado ∑ de comunicações do evento (`comunicacoesResumo/current`)
 * — contagens por status/canal/tipo mantidas pela Function. Retorna null
 * quando o evento ainda não tem resumo (nenhuma comunicação registrada).
 */
export async function getResumoComunicacoes(
  db: Firestore,
  eventoId: string
): Promise<ResumoComunicacoes | null> {
  const snap = await getDoc(
    doc(
      db,
      'eventos',
      eventoId,
      COLECAO_RESUMO_COMUNICACOES,
      DOC_RESUMO_COMUNICACOES
    )
  );
  if (!snap.exists()) return null;
  return parseResumoComunicacoes(snap.data() as Record<string, unknown>);
}
