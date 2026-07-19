// =============================================================================
// functions/src/affiliation/readers.ts
//
// Readers server-side de afiliação (LEELA-R9E · S-R9-11-T7/T8 · RN-318/319).
//
// PROJEÇÃO FECHADA (RN-318 — o coração): o influenciador (PF ou dono do
// clube-afiliado) vê SÓ as PRÓPRIAS conversões — quantidade, valor e status;
// NUNCA dado de outro comprador (sem nome/CPF/e-mail de terceiros — as
// conversões nem os carregam por construção) e NUNCA afiliado de terceiro.
// O organizador (tenant writer) vê os afiliados do PRÓPRIO tenant (RN-319).
//
// Ambos os lados leem por CALLABLE (Admin SDK server-side, shape montado
// aqui) — as Rules ainda permitem a leitura direta do PRÓPRIO doc
// (responsavelUid) como fallback, mas a superfície do painel consome estes
// readers (defesa em profundidade: o shape do reader é a API, não o doc).
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import {
  COLECAO_AFILIADOS,
  SUBCOLECAO_CONVERSOES_AFILIADO,
  SUBCOLECAO_REPASSES_AFILIADO,
  isComissaoAfiliadoValida,
  saldoComissaoAfiliado,
  type AuthClaims,
  type ComissaoAfiliado,
  type StatusAfiliado,
  type TipoAfiliado,
} from '@leela/core';
import { assertTenantWriter } from '../eventos/criarEvento';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Shapes fechados
// ---------------------------------------------------------------------------

/** Conversão projetada — SEM qualquer dado de comprador (RN-318). */
export interface ConversaoProjetada {
  valor: number;
  qtdInscricoes: number;
  /** Comissão congelada da conversão (FASE 2) — 0 em docs pré-fase-2. */
  comissao: number;
  convertidoEmMillis: number | null;
}

/** Repasse manual projetado (FASE 2 — extrato do saldo de comissão). */
export interface RepasseProjetado {
  valor: number;
  observacao: string | null;
  criadoEmMillis: number | null;
}

/** Lado do INFLUENCIADOR (próprio): uma afiliação com as próprias somas. */
export interface MinhaAfiliacao {
  eventoId: string;
  eventoNome: string;
  /** Slug público do evento (E08-PROMOTOR · TAMANHOS-GRADE T-extra) — o
   *  painel monta o LINK completo `{landing}/{slug}?ref=` sem query extra. */
  eventoSlug: string;
  refCodigo: string;
  tipo: TipoAfiliado;
  status: StatusAfiliado | string;
  janelaAtribuicaoDias: number;
  minimoInscricoes: number | null;
  cupomCodigo: string | null;
  conversoes: number;
  valorAtribuido: number;
  /**
   * FASE 2 — termos e saldo de comissão (RN-310: config read-only para o
   * afiliado; RN-318: só os PRÓPRIOS números). saldoComissao PODE ser
   * negativo (estorno pós-repasse — verdade, não esconde).
   */
  comissao: ComissaoAfiliado | null;
  comissaoAcumulada: number;
  comissaoRepassada: number;
  saldoComissao: number;
  ultimasConversoes: ConversaoProjetada[];
  /** Extrato de repasses manuais registrados (mais recentes primeiro). */
  ultimosRepasses: RepasseProjetado[];
}

/** Lado do ORGANIZADOR: afiliado do tenant (inclui dados que ELE cadastrou). */
export interface AfiliadoDoTenant extends MinhaAfiliacao {
  nome: string;
  canal: string | null;
  clubeRef: string | null;
  /** PII do PF que o PRÓPRIO organizador cadastrou (e-mail do convite). */
  responsavelEmail: string | null;
  documentoMascarado: string | null;
}

const ULTIMAS_CONVERSOES_LIMITE = 20;

// ---------------------------------------------------------------------------
// Montagem comum
// ---------------------------------------------------------------------------

async function conversoesDoAfiliado(
  ref: admin.firestore.DocumentReference
): Promise<ConversaoProjetada[]> {
  const snap = await ref
    .collection(SUBCOLECAO_CONVERSOES_AFILIADO)
    .orderBy('convertidoEm', 'desc')
    .limit(ULTIMAS_CONVERSOES_LIMITE)
    .get();
  return snap.docs.map((d) => {
    const convertidoEm = d.get('convertidoEm') as
      | { toMillis?: () => number }
      | undefined;
    return {
      valor: typeof d.get('valor') === 'number' ? (d.get('valor') as number) : 0,
      qtdInscricoes:
        typeof d.get('qtdInscricoes') === 'number'
          ? (d.get('qtdInscricoes') as number)
          : 1,
      comissao:
        typeof d.get('comissao') === 'number' ? (d.get('comissao') as number) : 0,
      convertidoEmMillis:
        typeof convertidoEm?.toMillis === 'function'
          ? convertidoEm.toMillis()
          : null,
    };
  });
}

async function repassesDoAfiliado(
  ref: admin.firestore.DocumentReference
): Promise<RepasseProjetado[]> {
  const snap = await ref
    .collection(SUBCOLECAO_REPASSES_AFILIADO)
    .orderBy('criadoEm', 'desc')
    .limit(ULTIMAS_CONVERSOES_LIMITE)
    .get();
  return snap.docs.map((d) => {
    const criadoEm = d.get('criadoEm') as { toMillis?: () => number } | undefined;
    return {
      valor: typeof d.get('valor') === 'number' ? (d.get('valor') as number) : 0,
      observacao:
        typeof d.get('observacao') === 'string'
          ? (d.get('observacao') as string)
          : null,
      criadoEmMillis:
        typeof criadoEm?.toMillis === 'function' ? criadoEm.toMillis() : null,
    };
  });
}

/** Nome + slug públicos do evento (1 leitura). Slug ausente ⇒ o docId (a
 *  convenção do seed é slug ≡ id — fallback honesto, nunca link quebrado). */
async function dadosDoEvento(
  db: Db,
  eventoId: string
): Promise<{ nome: string; slug: string }> {
  const snap = await db.collection('eventos').doc(eventoId).get();
  const nome = snap.get('nome');
  const slug = snap.get('slug');
  return {
    nome: typeof nome === 'string' && nome.length > 0 ? nome : eventoId,
    slug: typeof slug === 'string' && slug.length > 0 ? slug : eventoId,
  };
}

function baseDaAfiliacao(
  d: admin.firestore.QueryDocumentSnapshot
): Omit<
  MinhaAfiliacao,
  'eventoNome' | 'eventoSlug' | 'ultimasConversoes' | 'ultimosRepasses'
> {
  const comissaoRaw = d.get('comissao');
  const comissaoAcumulada =
    typeof d.get('comissaoAcumulada') === 'number'
      ? (d.get('comissaoAcumulada') as number)
      : 0;
  const comissaoRepassada =
    typeof d.get('comissaoRepassada') === 'number'
      ? (d.get('comissaoRepassada') as number)
      : 0;
  return {
    eventoId: (d.get('eventoId') ?? '') as string,
    refCodigo: d.id,
    tipo: d.get('tipo') as TipoAfiliado,
    status: (d.get('status') ?? '') as string,
    janelaAtribuicaoDias:
      typeof d.get('janelaAtribuicaoDias') === 'number'
        ? (d.get('janelaAtribuicaoDias') as number)
        : 0,
    minimoInscricoes:
      typeof d.get('minimoInscricoes') === 'number'
        ? (d.get('minimoInscricoes') as number)
        : null,
    cupomCodigo:
      typeof d.get('cupomCodigo') === 'string'
        ? (d.get('cupomCodigo') as string)
        : null,
    conversoes:
      typeof d.get('conversoes') === 'number' ? (d.get('conversoes') as number) : 0,
    valorAtribuido:
      typeof d.get('valorAtribuido') === 'number'
        ? (d.get('valorAtribuido') as number)
        : 0,
    comissao: isComissaoAfiliadoValida(comissaoRaw) ? comissaoRaw : null,
    comissaoAcumulada,
    comissaoRepassada,
    saldoComissao: saldoComissaoAfiliado(comissaoAcumulada, comissaoRepassada),
  };
}

// ---------------------------------------------------------------------------
// Lado do INFLUENCIADOR — getMinhasAfiliacoes (RN-318)
// ---------------------------------------------------------------------------

export async function getMinhasAfiliacoesCore(
  db: Db,
  uid: string
): Promise<{ afiliacoes: MinhaAfiliacao[] }> {
  // collectionGroup keyed no TRUST ANCHOR responsavelUid (estampado SÓ por
  // Function) — o caller nunca escolhe o escopo da query. Índice CG
  // registrado em firestore.indexes.json (deploy-only).
  const snap = await db
    .collectionGroup(COLECAO_AFILIADOS)
    .where('responsavelUid', '==', uid)
    .get();

  const afiliacoes: MinhaAfiliacao[] = [];
  for (const d of snap.docs) {
    const base = baseDaAfiliacao(d);
    const evento = await dadosDoEvento(db, base.eventoId);
    afiliacoes.push({
      ...base,
      eventoNome: evento.nome,
      eventoSlug: evento.slug,
      ultimasConversoes: await conversoesDoAfiliado(d.ref),
      ultimosRepasses: await repassesDoAfiliado(d.ref),
    });
  }
  afiliacoes.sort((a, b) => b.valorAtribuido - a.valorAtribuido);
  return { afiliacoes };
}

/** `getMinhasAfiliacoes` — callable do influenciador (PF/dono de clube). */
export const getMinhasAfiliacoes = https.onCall(async (_data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return getMinhasAfiliacoesCore(admin.firestore(), context.auth.uid);
});

// ---------------------------------------------------------------------------
// Lado do ORGANIZADOR — getAfiliadosDoTenant (RN-319)
// ---------------------------------------------------------------------------

export async function getAfiliadosDoTenantCore(
  db: Db,
  claims: AuthClaims,
  rawInput: unknown
): Promise<{ afiliados: AfiliadoDoTenant[] }> {
  const tenantId = assertTenantWriter(claims);
  const input = rawInput as { eventoId?: unknown } | null;
  const eventoIdFiltro =
    typeof input?.eventoId === 'string' && input.eventoId.length > 0
      ? input.eventoId
      : null;

  // Escopo SEMPRE derivado da claim (RN-400) — nunca de input do cliente.
  let query: admin.firestore.Query = db
    .collectionGroup(COLECAO_AFILIADOS)
    .where('tenantId', '==', tenantId);
  if (eventoIdFiltro !== null) {
    query = query.where('eventoId', '==', eventoIdFiltro);
  }
  const snap = (await query.get()) as admin.firestore.QuerySnapshot;

  const afiliados: AfiliadoDoTenant[] = [];
  for (const d of snap.docs) {
    const base = baseDaAfiliacao(d);
    const evento = await dadosDoEvento(db, base.eventoId);
    afiliados.push({
      ...base,
      eventoNome: evento.nome,
      eventoSlug: evento.slug,
      ultimasConversoes: await conversoesDoAfiliado(d.ref),
      ultimosRepasses: await repassesDoAfiliado(d.ref),
      nome: (d.get('nome') ?? '') as string,
      canal: typeof d.get('canal') === 'string' ? (d.get('canal') as string) : null,
      clubeRef:
        typeof d.get('clubeRef') === 'string' ? (d.get('clubeRef') as string) : null,
      responsavelEmail:
        typeof d.get('responsavelEmail') === 'string'
          ? (d.get('responsavelEmail') as string)
          : null,
      documentoMascarado:
        typeof d.get('documentoMascarado') === 'string'
          ? (d.get('documentoMascarado') as string)
          : null,
    });
  }
  afiliados.sort((a, b) => b.valorAtribuido - a.valorAtribuido);
  return { afiliados };
}

/** `getAfiliadosDoTenant` — callable do organizador (aba Clubs, RN-319). */
export const getAfiliadosDoTenant = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return getAfiliadosDoTenantCore(
    admin.firestore(),
    context.auth.token as unknown as AuthClaims,
    data
  );
});
