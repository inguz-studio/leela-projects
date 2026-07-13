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

// Eventos — VIRADA DE LOTE (S300-T2 · RN-300 · ADR-012): ∑ `vendidos` por
// (modalidade, lote) + carimbos `encerradoEm`/`encerradoMotivo`, escrita
// EXCLUSIVA de Function. Quantidade via onWrite de inscrito; data via cron.
// Estado ativo/preço vigente seguem DERIVADOS no kernel (@leela/core).
// ⚠️ Fable (dinheiro — degrau de preço).
export { onInscritoWriteVirada, virarLoteCron } from './eventos/virarLote';

// Eventos — publicação da página de vendas (S300-T2, lacuna #1 do S300-T3):
// flag `publicada`/`publicadaEm` = escrita EXCLUSIVA de Function; valida
// completude server-side (parse do kernel + SEO). Seam do api-client.
export {
  publicarPaginaVendas,
  despublicarPaginaVendas,
} from './eventos/publicarPaginaVendas';

// Eventos — LOG DE COMUNICAÇÃO, agregado único (FABLE-G-T1 · Onda 2):
// resumo ∑ `comunicacoesResumo/current` por recontagem idempotente. Os
// helpers de escrita (registrarComunicacao/aplicarEventoProvedorNoLog) são
// consumidos por S1206-T3 (e-mail do ingresso) e E06-L2 (enviarCampanha) —
// não são endpoints. ⚠️ Fable (PII).
export { onComunicacaoWrite } from './eventos/agregarComunicacoes';

// Eventos — aprovisionamento de kit POR SKU (item tamanhado × tamanho):
// Σ qtdVendida/aEncomendar por recontagem idempotente (RN-224) + máquina de
// estados estimativa→encomendado→em_estoque (RN-226) via callable do
// organizador (FABLE-D-T2 · S210-T3 · Onda 2). ⚠️ Fable (integridade de
// estoque/movimentação).
export {
  onInscritoWriteEstoque,
  transicaoAprovisionamento,
} from './eventos/agregarEstoque';

// Eventos — EQUIPE: 4 papéis por evento em custom claims (S304-T1 · RN-320 ·
// ADR-008): merge PRESERVADOR (padrão mergeTenantClaims — nunca apaga claims
// de tenant/outros eventos) + âncora `equipe/{uid}` p/ token velho (RN-401).
// ⚠️ Fable (autorização/escalada de papel).
export { setClaimsEquipe } from './eventos/setClaimsEquipe';

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

// Finance — SALDO DE REPASSE do tenant (E09s-L2-T1 · RN-348/350/351/357):
// full recompute idempotente de `tenants/{tid}/saldo/current` via
// computeSaldoRepasse (@leela/core). Gatilhos: financeiro/current (E03
// escreve, E09s reage) e repasses (comprometido/devolução). Janela D+N
// derivada dos pagamentos confirmados (fonte real por transação).
// ⚠️ Fable (dinheiro — payout do organizador).
export {
  onFinanceiroEventoWrite,
  onRepasseWrite,
} from './finance/updateSaldoRepasse';

// Finance — DADOS BANCÁRIOS do organizador (E09s-L2-T2 · RN-354/357 ·
// ADR-014 PROPOSTA): cifra AES-256-GCM (AAD=tenantId, chave Secret Manager)
// no `dadosBancariosSecret` + persistência SÓ mascarada no `dadosBancarios`.
// tenant_owner-only; fail-closed sem BANK_DATA_KEY. ⚠️ Fable (LGPD).
export { saveDadosBancarios } from './finance/saveDadosBancarios';

// Finance — SOLICITAÇÃO/CANCELAMENTO de repasse (E09s-L2-T3 · RN-351/352/
// 353 · decisão #11): validação transacional contra o disponível RELIDO no
// servidor (corrida de 2 solicitações > disponível ⇒ a 2ª falha); snapshot
// bancário mascarado congelado; cancelamento devolve ao disponível.
// ⚠️ Fable (dinheiro).
export { requestRepasse, cancelRepasse } from './finance/requestRepasse';

// Finance — TRANSIÇÕES ADMIN + comprovante gapless + retenção (E09s-L2-T4 ·
// RN-353/355/356 · RN-404): approve/reject/markPago via matriz do core;
// contador transacional por tenant (2 pagos concorrentes ⇒ 0007/0008 sem
// buraco); "pago" = registro manual mock, SEM transferência real;
// setRetencaoRepasse bumpa versao do termo + snapshot v{n}. ⚠️ Fable.
export {
  approveRepasse,
  rejectRepasse,
  markRepassePago,
  setRetencaoRepasse,
} from './finance/transicoesRepasse';

// Finance — LEITURA AUDITADA do dado bancário completo (E09s-L2-T5 ·
// RN-354 · decisão #8): único ponto onde conta/PIX voltam em claro
// (just-in-time, platform_admin, repasse aprovado); TODO desfecho —
// concedido, negado, erro de decifra — vira registro em
// `auditoriaAcessos` (deny-by-default p/ cliente). ⚠️ Fable (LGPD).
export { getBankDetailsForPayout } from './finance/getBankDetailsForPayout';

// Eventos — ENCERRAMENTO AUTOMÁTICO por data (E09s-L2-T6 · RN-350 ·
// decisão #6): cron 03:10 (ADR-007, slot após 03:00/03:05) transiciona
// publicado/ao_vivo→encerrado no dia seguinte à prova e dispara o
// recompute de saldo (retido→0). O organizador NÃO encerra o próprio
// evento (anti-fraude — Rules já negam status de cliente). ⚠️ Fable.
export { encerrarEventos } from './eventos/encerrarEventos';

// Eventos — CAMPANHAS (E06 · S401): estimativa de alcance por segmento
// (count() on-demand sobre inscritos — E06-L2-T1; o evento NÃO tem
// agregados por-modalidade/por-kit, diferença deliberada vs. o clube puro).
export { estimarAlcance } from './eventos/estimarAlcance';

// Eventos — CAMPANHAS (E06 · S401-T4): disparo idempotente com limite push
// RN-133 (envelope compartilhado Camada B) + fan-out MOCK no LOG de
// comunicação FABLE-G (docId determinístico {ref}_{campanhaId}_{canal} —
// RN-219; o agregado comunicacoesResumo recomputa via onComunicacaoWrite).
export { enviarCampanha } from './eventos/enviarCampanha';

// Analytics — COLETA DIÁRIA de snapshots de KPIs (S821-T1b · E11 · T2-L1):
// cron 03:05 (ADR-007 — slot entre o 03:00 do RN-102 e o 03:10 do
// encerramento; lê membros.status JÁ envelhecidos). Copia dashboard/current
// (subset OverviewKPIs, sem alerts) para analyticsSnapshots/{YYYY-MM-DD}
// por substituição total idempotente; nunca toca dias passados. Hook
// BigQuery atrás de flag DESLIGADA (LEELA_BQ_EXPORT). ⚠️ Fable (histórico
// não-backfillável).
export { coletaDiaria } from './analytics/coletaDiaria';

// Jornada — REGISTRO DE AÇÃO do atleta (S1307-T1 · E13 adiantado · T2-L2):
// onWrite de atletas/{uid}/registros recomputa a participação
// (calcularPontos + bônus RN-115 acumuláveis) em participantes/{uid} e os
// ∑ do desafio (qtdParticipantes por recontagem, progressoPct). Recompute
// total idempotente; SÓ agrega quem já participa (gate RN-117 =
// entrarNoDesafio). Path do desafio = aninhado ADR-009. ⚠️ Fable
// (integridade de pontuação/board).
export { onRegistroWrite } from './jornada/onRegistroWrite';
