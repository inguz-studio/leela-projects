// =============================================================================
// packages/api-client/src/platform/convites.ts
//
// Convites de organizador do super-admin (E16 · S1608-T2 · RN-413).
//
// Gerar e revogar são writes DIRETOS do client SDK — as Rules exigem
// `platform_admin` e fecham o shape (nasce `ativo`, sem carimbo de uso; só a
// transição `ativo → revogado` passa). RESGATAR não mora aqui: é callable
// (`resgatarConviteOrganizador`), porque quem resgata jamais pode enxergar a
// coleção (RN-414).
//
// Colisão de código: `setDoc` cru sobrescreveria um convite existente em
// silêncio — inclusive um já USADO, apagando a prova de quem entrou. Por isso
// a geração usa `create` de transação (falha se o doc existe) e tenta de novo
// com outro sorteio. Com 31^8 combinações a segunda tentativa é folclore, mas
// o custo dela é uma linha e o custo do bug é auditoria perdida.
// =============================================================================

import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  COLECAO_CONVITES_ORGANIZADOR,
  gerarCodigoOrganizador,
  NOTA_CONVITE_MAX,
  type ConviteOrganizador,
} from '@leela/core';

/** Tentativas de sorteio antes de desistir (colisão de código é remota). */
const MAX_TENTATIVAS_SORTEIO = 5;

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

/**
 * Lista os convites, mais recentes primeiro. SÓ platform_admin — as Rules
 * negam a leitura a qualquer outro papel (a coleção inteira é o dicionário de
 * códigos válidos).
 */
export async function listarConvitesOrganizador(
  db: Firestore
): Promise<ConviteOrganizador[]> {
  const snap = await getDocs(
    query(collection(db, COLECAO_CONVITES_ORGANIZADOR), orderBy('criadoEm', 'desc'))
  );
  return snap.docs.map((d) => ({ ...(d.data() as ConviteOrganizador), codigo: d.id }));
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

export interface GerarConviteInput {
  /** Quem está gerando (uid do platform_admin) — a Rule confere. */
  criadoPor: string;
  /** Nota livre ("para o Francisco"). Opcional. */
  nota?: string;
  /** Validade opcional (P3: sem validade por default). */
  expiraEm?: Date;
}

/**
 * Gera um convite `ativo` com código sorteado. Devolve o código gerado.
 * Nunca sobrescreve doc existente (create dentro de transação).
 */
export async function gerarConviteOrganizador(
  db: Firestore,
  input: GerarConviteInput
): Promise<string> {
  const nota = input.nota?.trim() ?? '';
  if (nota.length > NOTA_CONVITE_MAX) {
    throw new Error(`A nota do convite passa de ${NOTA_CONVITE_MAX} caracteres.`);
  }

  let ultimoErro: unknown = null;
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS_SORTEIO; tentativa++) {
    const codigo = gerarCodigoOrganizador();
    const ref = doc(db, COLECAO_CONVITES_ORGANIZADOR, codigo);
    try {
      await runTransaction(db, async (tx) => {
        const atual = await tx.get(ref);
        if (atual.exists()) throw new Error('codigo_em_uso');
        tx.set(ref, {
          codigo,
          status: 'ativo',
          criadoPor: input.criadoPor,
          criadoEm: serverTimestamp(),
          ...(nota.length > 0 ? { nota } : {}),
          ...(input.expiraEm ? { expiraEm: input.expiraEm } : {}),
        });
      });
      return codigo;
    } catch (err) {
      if (err instanceof Error && err.message === 'codigo_em_uso') {
        ultimoErro = err;
        continue;
      }
      throw err;
    }
  }
  throw ultimoErro instanceof Error
    ? ultimoErro
    : new Error('Não foi possível gerar um código livre.');
}

/**
 * Revoga um convite (RN-413). A Rule só aceita `ativo → revogado`: revogar não
 * alcança código já usado e, portanto, não desfaz tenant provisionado.
 */
export async function revogarConviteOrganizador(
  db: Firestore,
  codigo: string,
  revogadoPor: string
): Promise<void> {
  await updateDoc(doc(db, COLECAO_CONVITES_ORGANIZADOR, codigo), {
    status: 'revogado',
    revogadoPor,
    revogadoEm: serverTimestamp(),
  });
}
