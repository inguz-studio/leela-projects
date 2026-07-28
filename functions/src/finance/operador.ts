// =============================================================================
// functions/src/finance/operador.ts
//
// Quem opera o CANCELAMENTO/ESTORNO e sobre qual tenant (decisão 43-b · T4).
//
// O problema que este módulo resolve: `platform_admin` é cross-tenant por
// construção e NÃO carrega `tenantId` no claim (packages/core/platform/roles).
// Todo guard de escrita do repo pede claim COM tenantId, então o back-office
// da plataforma simplesmente não tinha porta — `permission-denied` em tudo.
// Aqui o tenant vem do DOCUMENTO ALVO, não do token: apontar para um pedido
// já diz sobre qual tenant se está agindo, e a operação sai carimbada com a
// trilha `plataforma` (o organizador continua saindo como `organizador`).
//
// Ordem deliberada (Schneier — falha fechada e mensagem estável): o papel é
// checado ANTES de validar o payload, para que athlete/promoter continuem
// recebendo `permission-denied` e não uma dica de formato. Só o ramo admin
// paga a leitura extra do doc alvo.
// =============================================================================

import type * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import type { AuthClaims } from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
  assertTenantWriterOuAdmin,
  type EventoCaller,
  type OperadorDoTenant,
} from '../eventos/criarEvento';

type Db = admin.firestore.Firestore;

export type { OperadorDoTenant };

/**
 * Guard BARATO de entrada: quem não é admin da plataforma tem de ser writer de
 * algum tenant. Não decide o tenant da operação (isso é do `resolverOperador`)
 * — existe para manter athlete/promoter caindo em `permission-denied` antes de
 * qualquer leitura ou validação de payload.
 */
export function assertPapelDeEscritaOuAdmin(claims: AuthClaims): void {
  if (claims.role === 'platform_admin') return;
  assertTenantWriter(claims);
}

/** Alvo cujo tenant já é conhecido, ou doc a ler para descobri-lo. */
export type AlvoDaOperacao =
  | { tenantId: string }
  | { colecao: 'pedidos'; docId: string };

/**
 * Resolve QUEM opera e sobre qual tenant. Para o organizador o claim manda e o
 * alvo tem de ser dele (RN-400 segue negando cross-tenant); para o admin o
 * tenant é o do alvo e a trilha vira `plataforma`.
 */
export async function resolverOperador(
  db: Db,
  caller: EventoCaller,
  alvo: AlvoDaOperacao
): Promise<OperadorDoTenant> {
  if ('tenantId' in alvo) {
    return assertTenantWriterOuAdmin(caller.claims, alvo.tenantId);
  }
  if (caller.claims.role !== 'platform_admin') {
    return { tenantId: assertTenantWriter(caller.claims), trilha: 'organizador' };
  }
  const snap = await db.collection(alvo.colecao).doc(alvo.docId).get();
  if (!snap.exists) {
    throw new https.HttpsError('not-found', `Pedido '${alvo.docId}' não existe.`);
  }
  return assertTenantWriterOuAdmin(caller.claims, snap.get('tenantId') as string);
}

/**
 * Tenant ATIVO é guarda do ORGANIZADOR (RN-402). O admin da plataforma opera
 * justamente quando o tenant está suspenso — travá-lo aqui prenderia o dinheiro
 * do comprador no exato caso em que alguém precisa devolvê-lo.
 */
export async function assertTenantAtivoSeOrganizador(
  db: Db,
  operador: OperadorDoTenant
): Promise<void> {
  if (operador.trilha === 'organizador') {
    await assertTenantAtivo(db, operador.tenantId);
  }
}
