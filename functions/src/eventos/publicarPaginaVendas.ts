// =============================================================================
// functions/src/eventos/publicarPaginaVendas.ts
//
// Callables `publicarPaginaVendas` / `despublicarPaginaVendas`
// (LEELA-S300-T2 · E04 — fecha a lacuna #1 do S300-T3).
//
// O seam do cliente JÁ existe (packages/api-client/src/eventos/paginaVendas.ts)
// e define o contrato: `{ eventoId } -> { publicada: boolean }`. Este arquivo
// materializa o lado servidor: a flag `publicada`/`publicadaEm` é escrita
// EXCLUSIVA de Function (a Rule congela os carimbos no update do cliente —
// `publicacaoIntocada`/`publicacaoZeradaNoCreate`, S300-T1); o conteúdo
// (seções + SEO) segue editável direto pelo tenant writer.
//
// Regras aplicadas (nunca confia no cliente — espelha publicarEvento):
//   - autorização: papel com acesso a `pagina_vendas` — HOJE = tenant writer
//     (a matriz de papéis por evento chega no S304; trocar aqui quando ela
//     existir); tenant ativo (RN-402); evento do MESMO tenant (RN-400);
//   - completude server-side: o doc `config` precisa existir, passar no parse
//     do kernel (seção checkout travada+ativa — invariante S300) e ter SEO
//     completo (título, descrição, slug amigável) — publicar página vazia →
//     failed-precondition com a lista do que falta;
//   - IDEMPOTENTE: publicar página JÁ publicada / despublicar já despublicada
//     devolve o estado atual sem regravar nada (retry de rede não muda estado).
//
// DECISÃO REGISTRADA: publicar a página NÃO exige evento publicado — são
// máquinas de estado independentes (a vitrine pública gateia nas DUAS flags);
// acoplar aqui travaria o fluxo legítimo de preparar a página antes do evento
// ir ao ar. `publicadaEm` é PRESERVADO na despublicação (fato histórico da
// última publicação — parse trata como opcional; "nunca publicada" = ausente).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  PAGINA_VENDAS_DOC_ID,
  parsePaginaVendas,
  type AuthClaims,
  type PaginaVendas,
} from '@leela/core';
import { assertTenantAtivo, assertTenantWriter, type EventoCaller } from './criarEvento';

// ---------------------------------------------------------------------------
// Contratos (espelho do seam do api-client — não divergir)
// ---------------------------------------------------------------------------

export interface PublicarPaginaVendasInput {
  eventoId: string;
}

/** Resultado — o seam do api-client espera exatamente `{ publicada }`. */
export interface PublicarPaginaVendasResult {
  publicada: boolean;
}

/**
 * Completude mínima para publicar (server-side): SEO com título, descrição e
 * slug amigável não-vazios. Devolve a lista do que falta (vazia = completa).
 * O invariante estrutural (checkout travada+ativa, shapes) é do parse. @pure
 */
export function camposFaltantesParaPublicarPagina(pagina: PaginaVendas): string[] {
  const faltam: string[] = [];
  if (pagina.seo.titulo.trim().length === 0) faltam.push('seo.titulo');
  if (pagina.seo.descricao.trim().length === 0) faltam.push('seo.descricao');
  if (pagina.seo.slugAmigavel.trim().length === 0) faltam.push('seo.slugAmigavel');
  return faltam;
}

// ---------------------------------------------------------------------------
// Núcleo compartilhado (testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

async function mudarPublicacaoCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller,
  publicar: boolean
): Promise<PublicarPaginaVendasResult> {
  const tenantId = assertTenantWriter(caller.claims);

  const input = rawInput as Partial<PublicarPaginaVendasInput> | null;
  const eventoId = input?.eventoId;
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"eventoId" é obrigatório.');
  }

  await assertTenantAtivo(db, tenantId);

  const eventoRef = db.collection('eventos').doc(eventoId);
  const paginaRef = eventoRef.collection('paginaVendas').doc(PAGINA_VENDAS_DOC_ID);

  const publicada = await db.runTransaction(async (tx) => {
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) {
      throw new https.HttpsError('not-found', `Evento '${eventoId}' não existe.`);
    }
    // Isolamento multi-tenant (ADR-009/RN-400): só o tenant DONO publica.
    if (eventoSnap.get('tenantId') !== tenantId) {
      throw new https.HttpsError(
        'permission-denied',
        'Evento pertence a outro tenant (RN-400).'
      );
    }

    const paginaSnap = await tx.get(paginaRef);
    if (!paginaSnap.exists) {
      throw new https.HttpsError(
        'failed-precondition',
        'Configure a página de vendas antes de publicar.'
      );
    }
    // Defesa em profundidade: página órfã de outro tenant nunca é operada.
    if (paginaSnap.get('tenantId') !== tenantId) {
      throw new https.HttpsError(
        'permission-denied',
        'Página de vendas pertence a outro tenant (RN-400).'
      );
    }

    const estadoAtual = paginaSnap.get('publicada') === true;

    if (publicar) {
      // Completude server-side (nunca confia no cliente): parse fail-fast do
      // kernel (checkout travada+ativa, shapes) + SEO completo.
      let pagina: PaginaVendas;
      try {
        pagina = parsePaginaVendas(
          paginaSnap.id,
          paginaSnap.data() as Record<string, unknown>
        );
      } catch (err) {
        throw new https.HttpsError(
          'failed-precondition',
          `Página de vendas inválida — ${err instanceof Error ? err.message : String(err)}`
        );
      }
      const faltam = camposFaltantesParaPublicarPagina(pagina);
      if (faltam.length > 0) {
        throw new https.HttpsError(
          'failed-precondition',
          `Página incompleta — preencha: ${faltam.join(', ')}.`
        );
      }

      if (estadoAtual) return true; // idempotente: replay sem escrita

      const now = FieldValue.serverTimestamp();
      tx.update(paginaRef, {
        publicada: true,
        publicadaEm: now,
        atualizadoEm: now,
      });
      return true;
    }

    // Despublicar (volta a rascunho). `publicadaEm` preservado (histórico).
    if (!estadoAtual) return false; // idempotente: replay sem escrita
    tx.update(paginaRef, {
      publicada: false,
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return false;
  });

  // Sem PII no log — só ids (LGPD).
  logger.info(publicar ? 'pagina_vendas_publicada' : 'pagina_vendas_despublicada', {
    tenantId,
    eventoId,
  });

  return { publicada };
}

/** Núcleo de `publicarPaginaVendas` (valida completude server-side). */
export async function publicarPaginaVendasCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller
): Promise<PublicarPaginaVendasResult> {
  return mudarPublicacaoCore(db, rawInput, caller, true);
}

/** Núcleo de `despublicarPaginaVendas` (volta a rascunho). */
export async function despublicarPaginaVendasCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller
): Promise<PublicarPaginaVendasResult> {
  return mudarPublicacaoCore(db, rawInput, caller, false);
}

// ---------------------------------------------------------------------------
// Callables (wrappers finos — mesmo padrão de publicarEvento)
// ---------------------------------------------------------------------------

/** `publicarPaginaVendas` — callable do painel (seam S300-T3). */
export const publicarPaginaVendas = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return publicarPaginaVendasCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});

/** `despublicarPaginaVendas` — callable do painel (seam S300-T3). */
export const despublicarPaginaVendas = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return despublicarPaginaVendasCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
