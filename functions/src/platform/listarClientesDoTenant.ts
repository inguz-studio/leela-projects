// =============================================================================
// functions/src/platform/listarClientesDoTenant.ts
//
// Callable `listarClientesDoTenant` (ADMIN-VISAO onda 1 · S1612-T5 · RN-539).
//
// `tenants/{tid}/crmClientes/{clienteKey}` é a ÚNICA coleção tenant-scoped
// do sistema cujo `allow read` omite `isPlatformAdmin()` DE PROPÓSITO
// (`firestore.rules:381` — comentário na própria Rule: perfil comportamental
// individual + LTV, back-office cruza por Admin SDK, nunca client SDK). Esta
// Function canoniza essa escolha em vez de contorná-la — a Rule permanece
// EXATAMENTE como está (o canário de S1612-T7 prova isso).
//
// Autorização: `isPlatformAdmin()` do CORE (as DUAS pernas — RN-401), não a
// comparação `claims.role === 'platform_admin'` na mão que quase todo
// callable de plataforma usa hoje (dívida registrada em 03-spec.md Parte 4 /
// 04-fila-build.md "Fora das ondas"). Esta Function nasce já no lado certo
// da dívida — uma conta só com a CAPACIDADE (sem o papel legado) lê aqui.
//
// Minimização (RN-539/RN-172): o retorno é exatamente o subconjunto que o
// job story pede — nome, qtdEventos, qtdInscricoes, valorGasto, ltv, eventos
// — e NADA além disso. O doc CRM não guarda CPF/e-mail/telefone/endereço
// (minimização já feita na origem — E19), e mesmo os campos que o doc GUARDA
// mas o contrato não pede (genero, nascimento, aniversario, chaveTipo, o
// ledger `inscricoes`) são propositalmente OMITIDOS da resposta — defesa em
// profundidade contra um consumidor futuro que decida "já que está ali,
// mostra".
//
// Auditoria (molde `getBankDetailsForPayout` — RN-354/RN-539): TODO desfecho
// vira registro em `auditoriaAcessos` — concedido E negado — gravado FORA de
// transação e ANTES do throw. Sem uid autenticado não há a quem atribuir a
// tentativa: `unauthenticated` não registra (mesma doutrina do vizinho).
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  isPlatformAdmin,
  parseCrmCliente,
  SUBCOLECAO_CRM_CLIENTES,
  type AuthClaims,
  type CrmEventoResumo,
} from '@leela/core';
import { registrarAcessoAuditado } from '../shared/auditoriaAcessos';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Página canônica (espelha CRM_CLIENTES_PAGE_SIZE do api-client — organizador). */
export const LISTAR_CLIENTES_TENANT_PAGE_SIZE = 18;

/**
 * Teto do pageSize (mesma disciplina de `CRM_CLIENTES_PAGE_SIZE_MAX` —
 * review antagonista E19 · A4): sem clamp, um input adulterado varre a
 * subcoleção de PII inteira num único request.
 */
export const LISTAR_CLIENTES_TENANT_PAGE_SIZE_MAX = 100;

export interface ListarClientesDoTenantInput {
  tenantId: string;
  /** `clienteKey` (docId) do último item da página anterior — opaco para o chamador. */
  cursor?: string;
  /** Default 18 (LISTAR_CLIENTES_TENANT_PAGE_SIZE); clamp em [1, 100]. */
  pageSize?: number;
}

/**
 * Projeção do cliente CRM para o painel master — SÓ os campos da RN-539.
 * `clienteKey` é o docId (hash — não é PII, é a chave de linking já
 * minimizada na origem).
 */
export interface ClienteTenantView {
  clienteKey: string;
  nome: string;
  qtdEventos: number;
  qtdInscricoes: number;
  valorGasto: number;
  ltv: number;
  eventos: Record<string, CrmEventoResumo>;
}

export interface ListarClientesDoTenantResult {
  itens: ClienteTenantView[];
  /** `clienteKey` a passar como `cursor` da próxima chamada; null = fim da lista. */
  proxCursor: string | null;
}

type ResultadoAcesso = 'concedido' | 'negado_papel';

interface Caller {
  uid: string;
  claims: AuthClaims;
}

// ---------------------------------------------------------------------------
// Auditoria (fora de tx, antes de qualquer throw — molde getBankDetailsForPayout)
// ---------------------------------------------------------------------------

async function registrarAcesso(
  db: Db,
  registro: {
    tenantId: string;
    uid: string;
    papel: string;
    resultado: ResultadoAcesso;
  }
): Promise<void> {
  await registrarAcessoAuditado(
    db,
    'acesso_clientes_tenant',
    registro,
    'acesso_clientes_tenant'
  );
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

export async function listarClientesDoTenantCore(
  db: Db,
  rawInput: unknown,
  caller: Caller
): Promise<ListarClientesDoTenantResult> {
  const input = rawInput as Partial<ListarClientesDoTenantInput> | null;
  const tenantId = input?.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new https.HttpsError(
      'invalid-argument',
      '"tenantId" é obrigatório.'
    );
  }

  const papel =
    typeof caller.claims.role === 'string' ? caller.claims.role : 'desconhecido';

  // Autorização — RN-539: predicado isPlatformAdmin (as duas pernas do
  // RN-401), NÃO a comparação de role na mão. Negação é REGISTRADA.
  if (!isPlatformAdmin(caller.claims)) {
    await registrarAcesso(db, {
      tenantId,
      uid: caller.uid,
      papel,
      resultado: 'negado_papel',
    });
    throw new https.HttpsError(
      'permission-denied',
      'Apenas platform_admin lista os clientes de um tenant — acesso registrado (RN-539).'
    );
  }

  const pageSize = Math.min(
    Math.max(1, input?.pageSize ?? LISTAR_CLIENTES_TENANT_PAGE_SIZE),
    LISTAR_CLIENTES_TENANT_PAGE_SIZE_MAX
  );

  const col = db.collection(`tenants/${tenantId}/${SUBCOLECAO_CRM_CLIENTES}`);
  let q = col.orderBy('ltv', 'desc').limit(pageSize);

  if (typeof input?.cursor === 'string' && input.cursor.length > 0) {
    const cursorSnap = await col.doc(input.cursor).get();
    // Cursor apontando doc que sumiu entre páginas (raro — cliente
    // reagregado/expurgado no meio da varredura): degrada para a primeira
    // página em vez de lançar. Uma lista de PII não é o lugar para um erro
    // opaco por causa de uma corrida inofensiva.
    if (cursorSnap.exists) {
      q = q.startAfter(cursorSnap);
    }
  }

  const snap = await q.get();

  const itens: ClienteTenantView[] = [];
  for (const d of snap.docs) {
    try {
      const parsed = parseCrmCliente(d.id, d.data());
      itens.push({
        clienteKey: d.id,
        nome: parsed.nome,
        qtdEventos: parsed.qtdEventos,
        qtdInscricoes: parsed.qtdInscricoes,
        valorGasto: parsed.valorGasto,
        ltv: parsed.ltv,
        eventos: parsed.eventos,
      });
    } catch (err) {
      // Um doc corrompido não pode derrubar a página inteira de um painel
      // administrativo (disponibilidade > fail-fast aqui — fail-fast é
      // doutrina de ESCRITA; isto é leitura). Loga e pula; nenhum dado
      // errado é servido.
      logger.error('listar_clientes_tenant_doc_corrompido', {
        tenantId,
        clienteKey: d.id,
        erro: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const ultimo = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  const proxCursor = snap.docs.length === pageSize && ultimo ? ultimo.id : null;

  await registrarAcesso(db, {
    tenantId,
    uid: caller.uid,
    papel,
    resultado: 'concedido',
  });

  return { itens, proxCursor };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

export const listarClientesDoTenant = https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      // Sem uid não há a quem atribuir a tentativa — nega sem registro
      // (mesma doutrina de getBankDetailsForPayout: a auditoria é de
      // ACESSO IDENTIFICADO).
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }
    return listarClientesDoTenantCore(admin.firestore(), data, {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    });
  }
);
