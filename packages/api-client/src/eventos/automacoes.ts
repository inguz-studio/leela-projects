// =============================================================================
// @leela/api-client — automações do evento (LEELA-S402-T1 · E06 · RN-132)
//
// Comunicação por GATILHO: `eventos/{eventoId}/automacoes/{automacaoId}`. CRUD +
// toggle por ESCRITA DIRETA guardada pelas Rules (mesma natureza de campanhas):
// o cliente configura gatilho/template/canal/ativa/offset; o DISPARO é EXCLUSIVO
// das Functions (trigger `novo_inscrito` + cron véspera/pós/kit), que reusam o
// pipeline único `executarDisparoCampanha` — nunca um segundo mecanismo.
//
// ∑ `disparos` = recontagem writer-only por Function (postura pós-19c8afe): o
// create nasce 0/ausente e o update NUNCA o toca (a Rule nega). Este wrapper
// jamais envia `disparos`.
// =============================================================================

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  COLECAO_AUTOMACOES,
  parseAutomacao,
  type Automacao,
  type AutomacaoInput,
} from '@leela/core';

/** Payload de composição da automação (form S402). Espelha `AutomacaoInput`. */
export interface SalvarAutomacaoInput extends AutomacaoInput {
  /** Propagado do evento pai (ADR-009) — a Rule exige == tenant do evento. */
  tenantId: string;
}

/**
 * Lista as automações do evento (`eventos/{id}/automacoes`), mais recentes
 * primeiro. Um doc corrompido (parse fail-fast) é isolado + logado, não derruba
 * a lista (mesma disciplina de `listarCampanhas`/`listRepasses`).
 */
export async function listarAutomacoes(
  db: Firestore,
  eventoId: string
): Promise<Automacao[]> {
  const snap = await getDocs(
    collection(db, 'eventos', eventoId, COLECAO_AUTOMACOES)
  );
  const out: Automacao[] = [];
  for (const d of snap.docs) {
    try {
      out.push(parseAutomacao(d.id, d.data()));
    } catch (err) {
      console.error(`[listarAutomacoes] automação "${d.id}" corrompida — omitida`, err);
    }
  }
  return out.sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis());
}

/** Monta o doc de escrita (nunca inclui `disparos` — ∑ writer-only). @pure */
function docDeAutomacao(input: SalvarAutomacaoInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    tenantId: input.tenantId,
    gatilho: input.gatilho,
    templateRef: input.templateRef,
    canal: input.canal,
    ativa: input.ativa,
    atualizadoEm: serverTimestamp(),
  };
  // offset SÓ nos gatilhos de relógio (a Rule nega em novo_inscrito/kit).
  if (
    input.offsetHoras !== undefined &&
    (input.gatilho === 'vespera_evento' || input.gatilho === 'pos_evento')
  ) {
    data['offsetHoras'] = input.offsetHoras;
  }
  return data;
}

/**
 * Cria (`automacaoId` ausente) ou atualiza uma automação (write direto —
 * Rules-guarded: shape + enum fechado + `disparos` intocável). No create,
 * `disparos: 0` + `criadoEm`; no update, o ∑ nunca é tocado. Devolve o id.
 */
export async function salvarAutomacao(
  db: Firestore,
  eventoId: string,
  input: SalvarAutomacaoInput,
  automacaoId?: string
): Promise<{ automacaoId: string }> {
  if (automacaoId) {
    await updateDoc(
      doc(db, 'eventos', eventoId, COLECAO_AUTOMACOES, automacaoId),
      docDeAutomacao(input)
    );
    return { automacaoId };
  }
  const ref = doc(collection(db, 'eventos', eventoId, COLECAO_AUTOMACOES));
  await setDoc(ref, {
    ...docDeAutomacao(input),
    disparos: 0,
    criadoEm: serverTimestamp(),
  });
  return { automacaoId: ref.id };
}

/**
 * Liga/pausa uma automação (toggle `ativa`) — write direto pontual. Pausada
 * NUNCA dispara (o gate real segue no servidor). `disparos` intocado.
 */
export async function alternarAutomacao(
  db: Firestore,
  eventoId: string,
  automacaoId: string,
  ativa: boolean
): Promise<void> {
  await updateDoc(
    doc(db, 'eventos', eventoId, COLECAO_AUTOMACOES, automacaoId),
    { ativa, atualizadoEm: serverTimestamp() }
  );
}

/**
 * Remove uma automação (Rules permitem delete do writer — a trilha REAL do que
 * foi enviado vive no log de comunicação RN-219, que nunca some).
 */
export async function removerAutomacao(
  db: Firestore,
  eventoId: string,
  automacaoId: string
): Promise<void> {
  await deleteDoc(doc(db, 'eventos', eventoId, COLECAO_AUTOMACOES, automacaoId));
}
