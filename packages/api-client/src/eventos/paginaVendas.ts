// =============================================================================
// packages/api-client/src/eventos/paginaVendas.ts
//
// Acesso à página de vendas do evento — subcoleção
// `eventos/{eventoId}/paginaVendas/{config}` (LEELA-S300 · E04). O SHAPE e as
// invariantes (checkout travada, SEO) vivem no kernel (`@leela/core`
// paginaVendas). Esta camada só LÊ/ESCREVE o documento; nada de regra de
// negócio recalculada aqui.
//
// Duas naturezas de escrita (ADR-009 · aceite S300):
//   - CONTEÚDO (seções + SEO): escrita DIRETA do organizador, Rules-guarded como
//     lotes/kits. `salvarConteudoPaginaVendas` faz merge — NUNCA toca a flag de
//     publicação (a Rule congela `publicada`/`publicadaEm` no update do cliente).
//   - PUBLICAÇÃO (`publicada`/`publicadaEm`): escrita EXCLUSIVA de Cloud Function
//     — `publicar/despublicarPaginaVendas` são o SEAM callable (par de
//     `publicarEvento`). A Function valida completude server-side.
//     ⚠ DEPENDÊNCIA: as Functions `publicarPaginaVendas`/`despublicarPaginaVendas`
//     ainda NÃO existem em `functions/` (fora do escopo deste lote). O seam está
//     pronto; enquanto a Function não subir, a chamada falha e a UI mostra Toast
//     de erro (nunca finge sucesso).
// =============================================================================

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';
import {
  PAGINA_VENDAS_DOC_ID,
  parsePaginaVendas,
  type PaginaVendas,
  type SecaoVendas,
  type SeoVendas,
} from '@leela/core';

/**
 * Lê a página de vendas de um evento (docId canônico `config`) — leitura direta
 * O(1). Retorna null quando o organizador ainda não configurou a página (o
 * editor então parte das seções padrão do kernel). A Rule garante que só o
 * tenant dono lê; cross-tenant vira permission-denied.
 */
export async function getPaginaVendas(
  db: Firestore,
  eventoId: string
): Promise<PaginaVendas | null> {
  const snap = await getDoc(
    doc(db, 'eventos', eventoId, 'paginaVendas', PAGINA_VENDAS_DOC_ID)
  );
  if (!snap.exists()) return null;
  return parsePaginaVendas(snap.id, snap.data());
}

/**
 * Payload de escrita de CONTEÚDO da página (seções + SEO). Sem `publicada`:
 * a publicação é escrita EXCLUSIVA de Function (a Rule congela a flag no update
 * do cliente). `tenantId` deve casar com o tenant do evento pai (ADR-009).
 */
export interface SalvarConteudoPaginaVendasInput {
  tenantId: string;
  secoes: SecaoVendas[];
  seo: SeoVendas;
}

/**
 * Salva (cria/edita) o conteúdo da página de vendas (merge). `criar` inclui
 * `publicada: false` + `criadoEm` só na criação — o primeiro save materializa o
 * doc como RASCUNHO (nunca publicado direto). Edições nunca reescrevem o carimbo
 * nem tocam a flag de publicação. A invariante do checkout (travada+ativa) é
 * garantida pela UI e revalidada pela Rule/parse na leitura.
 */
export async function salvarConteudoPaginaVendas(
  db: Firestore,
  eventoId: string,
  input: SalvarConteudoPaginaVendasInput,
  criar: boolean
): Promise<void> {
  // exactOptionalPropertyTypes: imagemUrl só entra quando presente e não-vazia.
  const seo: Record<string, unknown> = {
    titulo: input.seo.titulo,
    descricao: input.seo.descricao,
    slugAmigavel: input.seo.slugAmigavel,
  };
  if (input.seo.imagemUrl !== undefined && input.seo.imagemUrl.length > 0) {
    seo['imagemUrl'] = input.seo.imagemUrl;
  }

  const data: Record<string, unknown> = {
    id: PAGINA_VENDAS_DOC_ID,
    tenantId: input.tenantId,
    eventoId,
    secoes: input.secoes,
    seo,
    atualizadoEm: serverTimestamp(),
  };
  if (criar) {
    data['publicada'] = false;
    data['criadoEm'] = serverTimestamp();
  }

  await setDoc(
    doc(db, 'eventos', eventoId, 'paginaVendas', PAGINA_VENDAS_DOC_ID),
    data,
    { merge: true }
  );
}

/** Resultado da (des)publicação — a Function devolve o novo estado da flag. */
export interface PublicarPaginaVendasResult {
  publicada: boolean;
}

/**
 * Publica a página de vendas via Cloud Function `publicarPaginaVendas` (valida
 * completude server-side). Escrita EXCLUSIVA de Function — o cliente nunca
 * carimba `publicada` direto.
 *
 * ⚠ A Function ainda não existe em `functions/` (fora do escopo deste lote):
 * este é o seam pronto; a chamada falha até a Function subir.
 */
export async function publicarPaginaVendas(
  functions: Functions,
  eventoId: string
): Promise<PublicarPaginaVendasResult> {
  const call = httpsCallable<{ eventoId: string }, PublicarPaginaVendasResult>(
    functions,
    'publicarPaginaVendas'
  );
  return (await call({ eventoId })).data;
}

/**
 * Despublica a página (volta a rascunho) via Cloud Function
 * `despublicarPaginaVendas`. Mesmo seam/observação de `publicarPaginaVendas`.
 */
export async function despublicarPaginaVendas(
  functions: Functions,
  eventoId: string
): Promise<PublicarPaginaVendasResult> {
  const call = httpsCallable<{ eventoId: string }, PublicarPaginaVendasResult>(
    functions,
    'despublicarPaginaVendas'
  );
  return (await call({ eventoId })).data;
}
