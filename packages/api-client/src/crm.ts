// =============================================================================
// packages/api-client/src/crm.ts
//
// Leitura de `tenants/{tenantId}/crmClientes` (E19 · S-R9-13 · RN-172) —
// readers tipados para a futura aba CRM (lote de UI).
//
// SÓ leitura: o doc é projeção EXCLUSIVA da Function onInscritoWriteCrm
// (ledger + recompute fechado). As Rules negam TODA escrita de cliente e
// restringem a leitura a owner/staff do tenant (isTenantWriter) — qualquer
// outro papel (promoter, afiliado, atleta, outro tenant, platform_admin via
// client SDK) recebe permission-denied.
//
// ZERO varredura no cliente (padrão RN-820): LTV/contagens/histórico já vêm
// prontos no doc — a lista pagina por cursor e o detalhe é 1 point read.
// O parsing é o parseCrmCliente do core (fonte única, fail-fast: PII fora do
// contrato lança em vez de renderizar dado corrompido).
// =============================================================================

import {
  collection,
  doc,
  endAt,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  startAfter,
  startAt,
  type Firestore,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  parseCrmCliente,
  SUBCOLECAO_CRM_CLIENTES,
  type CrmClienteDoc,
} from '@leela/core';

/** Page size da tabela densa do CRM (§2.5 — mesma régua dos inscritos). */
export const CRM_CLIENTES_PAGE_SIZE = 18;

/** Ordenações suportadas pela lista (campos do doc — índice single-field). */
export type CrmClientesOrdem = 'ltv' | 'valorGasto' | 'qtdEventos' | 'nome';

/** Cliente CRM com a chave do doc (o id NÃO carrega CPF/e-mail — é hash). */
export interface CrmCliente extends CrmClienteDoc {
  /** DocId `{tipo}_{hash}` — passe de volta em getCrmCliente */
  clienteKey: string;
}

/** Cursor opaco de paginação — snapshot do último doc da página anterior. */
export type CrmClientesCursor = QueryDocumentSnapshot;

export interface ListarCrmClientesResult {
  itens: CrmCliente[];
  /** null quando não há próxima página */
  proxCursor: CrmClientesCursor | null;
}

export interface ListarCrmClientesOptions {
  /** Default 'ltv' (maiores clientes primeiro) */
  ordem?: CrmClientesOrdem;
  cursor?: CrmClientesCursor;
  /** Default 18 (CRM_CLIENTES_PAGE_SIZE) */
  pageSize?: number;
}

function colClientes(db: Firestore, tenantId: string) {
  return collection(db, 'tenants', tenantId, SUBCOLECAO_CRM_CLIENTES);
}

function toCliente(d: QueryDocumentSnapshot): CrmCliente {
  return { clienteKey: d.id, ...parseCrmCliente(d.id, d.data()) };
}

/**
 * Lista os clientes do tenant em páginas de cursor estável.
 * Ordem default: LTV desc (o Firestore desempata por docId — cursor estável
 * mesmo com valores repetidos). `proxCursor` volta null no fim da lista.
 */
export async function listarCrmClientes(
  db: Firestore,
  tenantId: string,
  options: ListarCrmClientesOptions = {}
): Promise<ListarCrmClientesResult> {
  const { ordem = 'ltv', cursor, pageSize = CRM_CLIENTES_PAGE_SIZE } = options;
  const constraints: QueryConstraint[] = [
    orderBy(ordem, ordem === 'nome' ? 'asc' : 'desc'),
    firestoreLimit(pageSize),
  ];
  if (cursor) constraints.splice(1, 0, startAfter(cursor));

  const snap = await getDocs(query(colClientes(db, tenantId), ...constraints));
  const itens = snap.docs.map(toCliente);
  const ultimo = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  return {
    itens,
    proxCursor: snap.docs.length === pageSize && ultimo ? ultimo : null,
  };
}

/**
 * Busca por PREFIXO de nome (`orderBy(nome) + startAt/endAt` — padrão de
 * busca barata sem índice composto). Case-sensitive como o Firestore é; a
 * UI decide normalização de exibição. Teto fixo de 50 (busca, não listagem).
 */
export async function buscarCrmClientesPorNome(
  db: Firestore,
  tenantId: string,
  prefixo: string
): Promise<CrmCliente[]> {
  const termo = prefixo.trim();
  if (termo.length === 0) return [];
  const snap = await getDocs(
    query(
      colClientes(db, tenantId),
      orderBy('nome'),
      startAt(termo),
      // endAt com sentinela U+F8FF (char invisível no fim do template —
      // último code point BMP privado: fecha o range do prefixo)
      endAt(`${termo}`),
      firestoreLimit(50)
    )
  );
  return snap.docs.map(toCliente);
}

/**
 * Detalhe de UM cliente (1 point read — histórico consolidado incluso no
 * doc: mapa `eventos` + ledger `inscricoes`). null quando não existe.
 */
export async function getCrmCliente(
  db: Firestore,
  tenantId: string,
  clienteKey: string
): Promise<CrmCliente | null> {
  const snap = await getDoc(
    doc(db, 'tenants', tenantId, SUBCOLECAO_CRM_CLIENTES, clienteKey)
  );
  if (!snap.exists()) return null;
  return { clienteKey: snap.id, ...parseCrmCliente(snap.id, snap.data()) };
}
