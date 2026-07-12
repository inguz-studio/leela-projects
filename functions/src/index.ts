// =============================================================================
// @leela/functions — entry point
// Cloud Functions são exportadas aqui e importadas por firebase-tools.
// Cada domínio tem seu próprio módulo em src/{domínio}/.
// =============================================================================

import * as admin from 'firebase-admin';

// Inicializa o Admin SDK uma única vez (idempotente)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Auth
export { onCreateUser } from './auth/onCreateUser';

// Plataforma — multi-tenancy (E16-S1600-T2)
export { setTenantClaims } from './platform/setTenantClaims';

// Plataforma — lifecycle do tenant (RN-402; wire de canTransition)
export { transitionTenant } from './platform/tenantLifecycle';

// Eventos — índice inverso N:N Kit↔Item "usado em" (E03-S205-T1 · RN-215)
export { onItemKitWrite, onKitWrite } from './eventos/itemKitIndex';

// Plataforma — provisionamento atômico do tenant (E16-S1601-T1 · RN-403)
export { provisionTenant } from './platform/provisionTenant';

// Plataforma — rollups macro cross-tenant (E16-S1605-T2 · RN-409)
export { recomputePlatformRollups } from './platform/rollups';

// Clubs — status derivado do membro (RN-102) + agregado ∑ qtdMembrosAtivos
// por recontagem idempotente (E05-S103-T1)
export { onMembroWrite } from './clubs/onMembroWrite';
export { recalcularStatusMembros } from './clubs/recalcularStatusMembros';

// Clubs — agregado ∑ qtdDesafiosAtivos por recontagem idempotente
// (E05-S105-T1 — fecha a pendência herdada do L1)
export { onDesafioWrite } from './clubs/onDesafioWrite';

// Clubs — mutations de membros + convites (E05 · contrato das telas L3):
// removerMembro (guarda owner + recontagem ∑), transferirPropriedade
// (troca atômica de ownerId/papéis) e enviarConvites (RN-106 no servidor)
export {
  removerMembro,
  transferirPropriedade,
} from './clubs/membrosMutations';
export { enviarConvites } from './clubs/enviarConvites';

// Clubs — exclusão irreversível em cascata + exportação LGPD com retenção
// de 90 dias (E05 · S110-T2 · RN-144). Delete de clube pelo cliente é
// NEGADO nas Rules — só a Function exclui (retenção nunca é pulada).
export { deleteClube } from './clubs/deleteClube';
export { exportClubeData } from './clubs/exportClubeData';

// Overview — dashboard do profissional (E02-S600-T2): fan-out eventos/clubes
// → profissionais/{profId}/dashboard/current + callable de leitura
export {
  onEventoWriteDashboard,
  onClubeWriteDashboard,
} from './overview/aggregateProfessionalDashboard';
export { getOverview } from './overview/getOverview';

// Eventos — criação/publicação transacional (E03-S201-T2 · RN-201)
export { criarEvento } from './eventos/criarEvento';
export { publicarEvento } from './eventos/publicarEvento';

// Eventos — balcão: chip + entrega/presença (E03-S204-T2 · RN-205/206/207)
export { vincularChip } from './eventos/vincularChip';
export { registrarEntrega } from './eventos/registrarEntrega';
export { registrarCheckin } from './eventos/registrarCheckin';

// Eventos — agregado financeiro por recontagem idempotente (E03-S207-T2)
export { onInscritoWrite } from './eventos/agregarFinanceiro';

// Eventos — LOG DE COMUNICAÇÃO, agregado único (FABLE-G-T1 · Onda 2):
// resumo ∑ `comunicacoesResumo/current` por recontagem idempotente. Os
// helpers de escrita (registrarComunicacao/aplicarEventoProvedorNoLog) são
// consumidos por S1206-T3 (e-mail do ingresso) e E06-L2 (enviarCampanha) —
// não são endpoints. ⚠️ Fable (PII).
export { onComunicacaoWrite } from './eventos/agregarComunicacoes';

// Checkout — fundação E12 (sandbox sem chave Asaas — ADR-006/ADR-011):
// createInscricaoCharge cria pedido/inscritos + emite a cobrança (provider
// selecionado por selectPaymentProvider — Mock sem chave, fail-safe);
// pagamentoWebhook é a ÚNICA porta de confirmação (assinado + idempotente).
export { createInscricaoCharge } from './checkout/createInscricaoCharge';
export { pagamentoWebhook } from './checkout/webhookPagamento';
// Cotação READ-ONLY do Resumo (S1203 — consome computeSaleState com os termos
// PRIVADOS do tenant; não escreve nada).
export { cotarInscricaoCheckout } from './checkout/cotarInscricaoCheckout';
// Disparo do webhook de confirmação no SANDBOX (S1203 — "o Mock dispara o
// webhook"; fail-closed com chave Asaas real). ⚠️ Fable-review.
export { confirmarPagamentoSandbox } from './checkout/confirmarPagamentoSandbox';
// Estorno POR INSCRITO do pedido em grupo (FABLE-B · ADR-011 · RN-337/341):
// saga idempotente ledger→refund→efeito; só organizador (tenant writer);
// reverte a receita agregada e audita quem/quando/quanto/motivo. ⚠️ Fable.
export { estornarInscricao } from './checkout/estornarInscricao';
