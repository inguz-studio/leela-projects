// =============================================================================
// packages/api-client/src/platform/clientesTenant.ts
//
// Wrapper tipado do callable `listarClientesDoTenant` (ADMIN-VISAO onda 1 ·
// S1612-T5 · RN-539). Espelha o contrato de
// `functions/src/platform/listarClientesDoTenant.ts` — só tipa a chamada;
// autorização e minimização REAIS acontecem no servidor (Admin SDK).
//
// Por que um callable e não uma query direta: `tenants/{tid}/crmClientes`
// fecha `isPlatformAdmin()` de propósito na Rule (`firestore.rules:381`) —
// é a ÚNICA leitura desta spec sem caminho pelo client SDK. O canário de
// S1612-T7 prova que isso continua negado mesmo para platform_admin.
//
// Erros propagados como FirebaseError (mesmo padrão de `platform/mutations.ts`):
//   - 'functions/permission-denied' → caller não é platform_admin (e a
//      negativa já foi registrada em auditoriaAcessos pelo servidor)
//   - 'functions/invalid-argument'  → tenantId ausente/vazio
// =============================================================================

import { httpsCallable, type Functions } from 'firebase/functions';

/** Espelha `CrmEventoResumo` do core (não reimportado para não acoplar
 *  o pacote client-only a um tipo cujo dono é `@leela/core`; o shape é o
 *  mesmo, validado no servidor). */
export interface ClienteTenantEventoResumo {
  nome: string;
  qtdInscricoes: number;
  qtdEstornadas: number;
  valorPago: number;
}

/** Cliente do tenant, projeção mínima do painel master (RN-539). */
export interface ClienteTenantView {
  clienteKey: string;
  nome: string;
  qtdEventos: number;
  qtdInscricoes: number;
  valorGasto: number;
  ltv: number;
  eventos: Record<string, ClienteTenantEventoResumo>;
}

export interface ListarClientesDoTenantInput {
  tenantId: string;
  /** `clienteKey` do último item da página anterior — devolvido em `proxCursor`. */
  cursor?: string;
  /** Default 18 no servidor; clamp em [1, 100]. */
  pageSize?: number;
}

export interface ListarClientesDoTenantResult {
  itens: ClienteTenantView[];
  /** null quando não há próxima página. */
  proxCursor: string | null;
}

/**
 * Lista os clientes de um tenant via callable (Admin SDK) — aba Clientes da
 * ficha (S1612-T6, consumidor). Só `platform_admin` (RN-539); qualquer outro
 * papel autenticado recebe `permission-denied` com a negativa já registrada.
 */
export async function listarClientesDoTenant(
  functions: Functions,
  input: ListarClientesDoTenantInput
): Promise<ListarClientesDoTenantResult> {
  const call = httpsCallable<ListarClientesDoTenantInput, ListarClientesDoTenantResult>(
    functions,
    'listarClientesDoTenant'
  );
  return (await call(input)).data;
}
