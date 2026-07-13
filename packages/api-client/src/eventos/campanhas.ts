// =============================================================================
// packages/api-client/src/eventos/campanhas.ts
//
// CRUD + queries de Campanhas do evento (LEELA-S401-T1 · E06-L1-T2).
// Subcoleção: `eventos/{eventoId}/campanhas` — write direto SÓ de
// rascunho/agendado (Rules espelham RN-130); o carimbo 'enviado' + ∑
// `alcance`/`enviadoEm` são EXCLUSIVOS da Function `enviarCampanha`
// (S401-T4). Reusa `parseCampanha` (fonte única de parsing fail-fast).
//
// Query por estado = igualdade single-field (`status`) com ordenação em
// memória — zero índice composto (espelho de listarComunicacoesDoInscrito).
// =============================================================================

import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import {
  COLECAO_CAMPANHAS,
  parseCampanha,
  type Campanha,
  type StatusCampanha,
} from '@leela/core';

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

/**
 * Lista as campanhas do evento, opcionalmente filtradas por estado
 * (RN-130: 'rascunho' | 'agendado' | 'enviado' — a lista S401-T2 agrupa).
 * Mais recentes primeiro (por `atualizadoEm`, em memória).
 */
export async function listarCampanhas(
  db: Firestore,
  eventoId: string,
  estado?: StatusCampanha
): Promise<Campanha[]> {
  const col = collection(db, 'eventos', eventoId, COLECAO_CAMPANHAS);
  const q = estado ? query(col, where('status', '==', estado)) : col;
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => parseCampanha(d.id, d.data()))
    .sort((a, b) => b.atualizadoEm.toMillis() - a.atualizadoEm.toMillis());
}

/** Lê uma campanha pelo id (editor S401-T3). Null se não existir. */
export async function getCampanha(
  db: Firestore,
  eventoId: string,
  campanhaId: string
): Promise<Campanha | null> {
  const snap = await getDoc(
    doc(db, 'eventos', eventoId, COLECAO_CAMPANHAS, campanhaId)
  );
  if (!snap.exists()) return null;
  return parseCampanha(snap.id, snap.data() as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Escrita (rascunho/agendado — Rules-guarded; 'enviado' é da Function)
// ---------------------------------------------------------------------------

/** Payload de composição da campanha (editor S401-T3). */
export interface CriarCampanhaInput {
  tenantId: string;
  titulo: string;
  conteudo: string;
  canal: Campanha['canal'];
  origem: Campanha['origem'];
  segmento: Campanha['segmento'];
  /** 'rascunho' ao salvar; 'agendado' exige `agendadoPara`. Nunca 'enviado'. */
  status: 'rascunho' | 'agendado';
  /** Data/hora do agendamento (obrigatória quando status == 'agendado'). */
  agendadoPara?: Date;
  /** Só quando o canal inclui email (RN-135). */
  capaUrl?: string;
}

/**
 * Cria/agenda uma campanha (write direto — Rules permitem rascunho/agendado;
 * o carimbo 'enviado'/alcance é EXCLUSIVO da Function `enviarCampanha`).
 */
export async function criarCampanha(
  db: Firestore,
  eventoId: string,
  input: CriarCampanhaInput
): Promise<{ campanhaId: string }> {
  const ref = doc(collection(db, 'eventos', eventoId, COLECAO_CAMPANHAS));
  const data: Record<string, unknown> = {
    tenantId: input.tenantId,
    titulo: input.titulo,
    conteudo: input.conteudo,
    canal: input.canal,
    origem: input.origem,
    status: input.status,
    segmento: input.segmento,
    alcance: 0,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };
  if (input.status === 'agendado' && input.agendadoPara) {
    data['agendadoPara'] = Timestamp.fromDate(input.agendadoPara);
  }
  if (input.capaUrl) data['capaUrl'] = input.capaUrl;
  await setDoc(ref, data);
  return { campanhaId: ref.id };
}

/** Payload de edição da campanha (modo edit do editor S401-T3). */
export type AtualizarCampanhaInput = Omit<CriarCampanhaInput, 'tenantId'>;

/**
 * Atualiza uma campanha existente (editar não duplica — espelho do fix S2
 * do clube). Write direto guardado pelas Rules: apenas rascunho/agendado
 * editáveis; nunca promove 'enviado' nem toca os ∑ de envio (RN-130).
 * `agendadoPara` é removido quando a campanha volta a rascunho; capa vazia
 * também é removida.
 */
export async function atualizarCampanha(
  db: Firestore,
  eventoId: string,
  campanhaId: string,
  input: AtualizarCampanhaInput
): Promise<void> {
  const patch: Record<string, unknown> = {
    titulo: input.titulo,
    conteudo: input.conteudo,
    canal: input.canal,
    origem: input.origem,
    status: input.status,
    segmento: input.segmento,
    agendadoPara:
      input.status === 'agendado' && input.agendadoPara
        ? Timestamp.fromDate(input.agendadoPara)
        : deleteField(),
    capaUrl: input.capaUrl ? input.capaUrl : deleteField(),
    atualizadoEm: serverTimestamp(),
  };
  await updateDoc(
    doc(db, 'eventos', eventoId, COLECAO_CAMPANHAS, campanhaId),
    patch
  );
}

/**
 * Exclui uma campanha NÃO enviada (Rules negam delete de 'enviado' —
 * trilha de comunicação é preservada).
 */
export async function excluirCampanha(
  db: Firestore,
  eventoId: string,
  campanhaId: string
): Promise<void> {
  await deleteDoc(doc(db, 'eventos', eventoId, COLECAO_CAMPANHAS, campanhaId));
}
