// =============================================================================
// @leela/api-client — marcas/patrocinadores reutilizáveis (LEELA-R9E ·
// S-R9-12 · RN-171 — seed antecipada do E10-S811)
//
// CRUD direto de `profissionais/{profId}/marcas` pelo client SDK — as Rules
// são OWNER-ONLY (uid == profId) com shape validado (RN-123). Nada de
// Function aqui: a marca é registro pessoal do profissional, sem ∑ nem
// trust anchor (as ativações consolidadas do E10-S812 ficam FORA deste
// recorte).
//
// RN-171: quem cadastra patrocinador uma vez encontra a listagem no próximo
// cadastro (autocomplete/seleção) — `listarMarcas` + `upsertMarcaDoPatrocinio`
// alimentam esse ciclo.
// =============================================================================

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  parseMarca,
  SUBCOLECAO_MARCAS,
  validarMarcaInput,
  type Marca,
  type MarcaInput,
} from '@leela/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function marcasCol(db: Firestore, profId: string) {
  return collection(db, 'profissionais', profId, SUBCOLECAO_MARCAS);
}

/** docId derivado do nome (estável p/ dedupe simples por nome normalizado). */
export function marcaIdDoNome(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function docDoInput(input: MarcaInput): Record<string, unknown> {
  const dados: Record<string, unknown> = {
    nome: input.nome.trim(),
    modeloComercial: input.modeloComercial,
    status: input.status ?? 'ativa',
    atualizadoEm: serverTimestamp(),
  };
  if (typeof input.valorAnual === 'number') dados['valorAnual'] = input.valorAnual;
  if (typeof input.contrapartida === 'string' && input.contrapartida.trim().length > 0) {
    dados['contrapartida'] = input.contrapartida.trim();
  }
  if (typeof input.logoUrl === 'string' && input.logoUrl.length > 0) {
    dados['logoUrl'] = input.logoUrl;
  }
  if (typeof input.contratoUrl === 'string' && input.contratoUrl.length > 0) {
    dados['contratoUrl'] = input.contratoUrl;
  }
  return dados;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/** Lista as marcas do profissional (ordenadas por nome). */
export async function listarMarcas(
  db: Firestore,
  profId: string
): Promise<Marca[]> {
  const snap = await getDocs(query(marcasCol(db, profId), orderBy('nome')));
  return snap.docs.map((d) => parseMarca(d.id, d.data()));
}

/**
 * Cria/atualiza uma marca (upsert por docId derivado do nome). Valida o
 * shape ANTES de escrever (a Rule revalida — defesa em profundidade).
 */
export async function salvarMarca(
  db: Firestore,
  profId: string,
  input: MarcaInput,
  marcaId?: string
): Promise<string> {
  const erros = validarMarcaInput(input);
  if (erros.length > 0) {
    throw new Error(`Marca inválida: ${erros.join(' ')}`);
  }
  const id = marcaId ?? marcaIdDoNome(input.nome);
  if (id.length === 0) throw new Error('Nome da marca não gera id válido.');
  const ref = doc(marcasCol(db, profId), id);
  await setDoc(
    ref,
    { ...docDoInput(input), criadoEm: serverTimestamp() },
    { merge: true }
  );
  return id;
}

/** Inativa (soft) — a exclusão dura fica p/ E10 (preview de ativações). */
export async function inativarMarca(
  db: Firestore,
  profId: string,
  marcaId: string
): Promise<void> {
  await updateDoc(doc(marcasCol(db, profId), marcaId), {
    status: 'inativa',
    atualizadoEm: serverTimestamp(),
  });
}

/** Remove de vez (owner-only; sem ativações modeladas neste recorte). */
export async function excluirMarca(
  db: Firestore,
  profId: string,
  marcaId: string
): Promise<void> {
  await deleteDoc(doc(marcasCol(db, profId), marcaId));
}

/**
 * RN-171 (o ciclo completo): ao cadastrar um patrocínio num evento/clube, o
 * patrocinador entra/atualiza no registro reutilizável — o PRÓXIMO cadastro
 * parte da listagem. Upsert idempotente por nome; nunca lança para não
 * quebrar o fluxo principal do patrocínio (best-effort registrado).
 */
export async function upsertMarcaDoPatrocinio(
  db: Firestore,
  profId: string,
  input: MarcaInput
): Promise<string | null> {
  try {
    return await salvarMarca(db, profId, input);
  } catch {
    return null;
  }
}
