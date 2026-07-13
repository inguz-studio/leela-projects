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
import { httpsCallable, type Functions } from 'firebase/functions';
import {
  COLECAO_CAMPANHAS,
  parseCampanha,
  type Campanha,
  type SegmentoCampanha,
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

// ---------------------------------------------------------------------------
// Callables (estimativa ao vivo + envio) — contrato espelha functions/src/eventos
// ---------------------------------------------------------------------------
//
// Wrappers finos das Cloud Functions de campanha (S401-T4 · E06-L2). O count()
// do alcance e o carimbo de envio (RN-133/idempotência) são EXCLUSIVOS do
// servidor — o cliente só tipa o contrato. Erros (`permission-denied`,
// `invalid-argument`) sobem INTACTOS para a UI (§2.12).

/** Entrada do count() de alcance — o mesmo shape que a Function valida. */
export interface EstimarAlcanceCampanhaInput {
  eventoId: string;
  segmento: Pick<SegmentoCampanha, 'tipo' | 'referencia'>;
}

export interface EstimarAlcanceCampanhaResult {
  /** Contagem de inscritos do segmento (count() no servidor — nunca no cliente). */
  tamanho: number;
}

/**
 * Estima o alcance de um segmento (callable `estimarAlcance` · E06-L2-T1).
 * count() agregado on-demand sobre `inscritos` — nenhum doc/PII trafega, só o
 * número. O editor S401-T3 chama debounced a cada troca de segmento.
 */
export async function estimarAlcanceCampanha(
  functions: Functions,
  input: EstimarAlcanceCampanhaInput
): Promise<EstimarAlcanceCampanhaResult> {
  const callable = httpsCallable<
    EstimarAlcanceCampanhaInput,
    EstimarAlcanceCampanhaResult
  >(functions, 'estimarAlcance');
  const { data } = await callable(input);
  return data;
}

export interface EnviarCampanhaInput {
  eventoId: string;
  campanhaId: string;
}

/**
 * Resultado do envio (callable `enviarCampanha` · S401-T4) — discriminado:
 *   - `ok`: carimbou `enviado` + `alcance` (idempotente; `jaEnviada` = reenvio);
 *   - `limite_push`: cota RN-133 estourada (4 push/janela de 7d) — NÃO carimba;
 *   - `segmento_vazio`: 0 destinatários — NÃO dispara/carimba/consome cota.
 */
export type EnviarCampanhaResult =
  | { ok: true; alcance: number; jaEnviada: boolean }
  | { bloqueado: 'limite_push'; pushNaJanela: number }
  | { bloqueado: 'segmento_vazio' };

/**
 * Dispara uma campanha (callable `enviarCampanha`). Idempotente por design
 * (reenvio de campanha já enviada = no-op, `jaEnviada: true`); o disparo físico
 * é MOCK (registro no log de comunicação — ADR-006). Autorização e cota são do
 * servidor.
 */
export async function enviarCampanha(
  functions: Functions,
  input: EnviarCampanhaInput
): Promise<EnviarCampanhaResult> {
  const callable = httpsCallable<EnviarCampanhaInput, EnviarCampanhaResult>(
    functions,
    'enviarCampanha'
  );
  const { data } = await callable(input);
  return data;
}
