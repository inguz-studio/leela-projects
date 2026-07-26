// =============================================================================
// packages/core/src/checkout/carrinho.ts
//
// PRAZO DO CARRINHO (LEELA-PIX-CARRINHO-T2 · **RN-158, nova**) — item 26 da
// rodada DEC-0726B, verbatim do Vitor:
//
//   "não existem carrinhos simultâneos, para isso temos o timer de 15 minutos
//    ao momento de abertura do checkout, para conclusão de compra, não
//    concluiu? cancelamo."
//
// ── RN-158 · as duas definições que a regra exige ───────────────────────────
//
// **ABERTURA** = a primeira COTAÇÃO daquele (comprador, evento) no servidor.
// É o primeiro instante em que a plataforma sabe que existe um carrinho: a
// tela pede o preço ao servidor assim que há uma modalidade escolhida, e
// nenhum evento anterior a esse chega ao backend. Não se inventou sinal novo
// de tela para isso.
//
// **CONCLUIR** = criar o PEDIDO com a cobrança (`createInscricaoCharge`). É a
// fronteira em que a compra deixa de ser intenção e vira dinheiro em trânsito.
//
// ── A COMPOSIÇÃO DOS DOIS RELÓGIOS (a pergunta que a decisão mandou cravar) ──
//
// Os relógios são SEQUENCIAIS, nunca concorrentes:
//
//   abertura ──15 min (RN-158)──▶ conclusão ──30 min (RN-157)──▶ fim do PIX
//
// O relógio do CARRINHO governa o tempo até concluir; o do MEIO governa a
// validade da cobrança depois de concluída. Um carrinho concluído aos 14:59
// tem 30 minutos INTEIROS de PIX — a soma dos dois não é um teto de 15
// minutos sobre o pagamento, e nenhum dos dois encurta o outro. Um carrinho
// que não concluiu em 15 minutos morre sem nunca ter tido cobrança, e por
// isso seu estado terminal é `expirado_sem_concluir`, DISTINTO do
// `pix_expirado` do pedido (que só existe onde houve cobrança).
//
// ── O QUE O PRAZO NÃO É ─────────────────────────────────────────────────────
//
// Não é reserva de vaga: carrinho aberto não segura estoque de lote (a vaga
// continua sendo contada na CONFIRMAÇÃO do pagamento — RN-300/virarLote), e
// esta RN não muda isso.
// =============================================================================

/**
 * Prazo do carrinho em segundos (RN-158): 15 minutos da ABERTURA para
 * CONCLUIR. Fonte ÚNICA — a Function carimba `expiraEmMillis` com ela e o
 * gate de conclusão a relê do doc, nunca a recalcula.
 *
 * Mesmo padrão do `PIX_EXPIRACAO_SEGUNDOS` (RN-157): o Vitor muda o número
 * num lugar só.
 */
export const CARRINHO_PRAZO_SEGUNDOS = 15 * 60;

/** Estado do carrinho de checkout (RN-158). */
export type StatusCarrinho = 'aberto' | 'concluido' | 'expirado_sem_concluir';

/** Lista canônica — única fonte para validação. */
export const STATUS_CARRINHO: readonly StatusCarrinho[] = [
  'aberto',
  'concluido',
  'expirado_sem_concluir',
];

export function isStatusCarrinho(v: unknown): v is StatusCarrinho {
  return typeof v === 'string' && (STATUS_CARRINHO as readonly string[]).includes(v);
}

/**
 * Estado TERMINAL do carrinho que não concluiu (RN-158). Distinto do
 * `pix_expirado` do PEDIDO de propósito: são coisas diferentes na linha do
 * tempo (aqui nunca houve cobrança) e a fase 2 precisa contá-las separadas.
 * Escrita EXCLUSIVA de Function.
 */
export const STATUS_CARRINHO_EXPIRADO: StatusCarrinho = 'expirado_sem_concluir';

/**
 * Motivo TIPADO da recusa de conclusão fora do prazo (RN-158) — viaja no
 * `details` do `failed-precondition` de `createInscricaoCharge`, no mesmo
 * contrato servidor↔cliente dos motivos do PIX.
 */
export const MOTIVO_CARRINHO_EXPIRADO = 'carrinho_expirado';

/** Cadência do cron que carimba os carrinhos vencidos (ADR-015). */
export const CARRINHO_CRON_INTERVALO_MIN = 5;

/**
 * Tolerância de CICLO do cron (mesma premissa da decisão 17 / RN-136): o
 * carimbo do carrinho vencido pode atrasar até 2 rodadas — 1 ciclo é o
 * atraso NORMAL, o 2º cobre jitter do Scheduler e rodada morta recuperada
 * pela seguinte.
 *
 * ⚠️ A DIFERENÇA que vale declarar em relação à RN-136: lá a tolerância
 * DECIDE (disparo vencido além dela não acontece); aqui ela não decide nada.
 * O veredito de "concluiu no prazo?" é sempre do RELÓGIO DO SERVIDOR contra
 * `expiraEmMillis`, lido na transação que cria o pedido — o cron só
 * materializa o carimbo para a visibilidade da fase 2. Cron atrasado desloca
 * `expiradoEmMillis`, nunca o veredito. Por isso os dois instantes são
 * gravados separados: a diferença entre eles É a medida do atraso.
 */
export const CARRINHO_CARIMBO_TOLERANCIA_MS =
  CARRINHO_CRON_INTERVALO_MIN * 2 * 60 * 1000;

/**
 * O carrinho ainda está DENTRO do prazo em `agoraMs`? Fronteira: exatamente
 * em `expiraEmMillis` já venceu (o prazo é o intervalo [abertura, expira)).
 * Comparação em epoch ms — imune a fuso. @pure
 */
export function carrinhoNoPrazo(expiraEmMillis: number, agoraMs: number): boolean {
  return expiraEmMillis > agoraMs;
}
