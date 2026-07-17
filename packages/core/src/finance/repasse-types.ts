// =============================================================================
// packages/core/src/finance/repasse-types.ts
//
// Modelo de dados do REPASSE do organizador (LEELA-E09s-L1-T1 · Onda 2).
//
// E09-slim (recorte vinculante, decisões-escopo-2026-07-04 item 4): fluxo de
// saque do produtor SEM afiliação, SEM reembolso (S904) e SEM painel rico.
// Coleções tenant-scoped (decisão #1 do consolidador — isolamento cross-tenant
// herda isTenantMember de graça):
//
//   tenants/{tid}/dadosBancarios/current        → DadosBancarios (MASCARADO)
//   tenants/{tid}/dadosBancariosSecret/current  → DadosBancariosSecret
//        (blob CIFRADO — RN-354: read:false nas Rules até para o owner;
//         escrita/leitura EXCLUSIVA de Function via Admin SDK)
//   tenants/{tid}/repasses/{repasseId}          → Repasse (RN-353)
//   tenants/{tid}/saldo/current                 → SaldoRepasse (∑ por Function)
//
// RNs deste modelo (canonizadas pelo consolidador em 2026-07-05):
//   RN-347  modo da taxa (incorporada|repassada) — parâmetro EXPLÍCITO do
//           cálculo do líquido do produtor; default hoje = 'incorporada'
//   RN-348  disponibilização D+N (default 2 dias úteis) + retenção %
//           (default 15) POR TENANT em commercialTerms; o saldo separa
//           `dentroJanelaDN` (fundos ainda na janela ≠ disponíveis)
//   RN-350  retenção pós-evento (% config, base = LÍQUIDO do produtor —
//           decisão #3; libera quando evento.status === 'encerrado')
//   RN-351  disponível = Σ liberado − Σ comprometido, NUNCA negativo
//   RN-352  solicitação válida: 0 < valor ≤ disponível
//   RN-353  máquina: solicitado→{aprovado,recusado,cancelado}; aprovado→pago;
//           recusa/cancelamento devolvem o valor ao disponível
//   RN-354  dados bancários LGPD: número cifrado Function-only + read:false;
//           cliente lê SÓ o mascarado; nunca cross-tenant
//   RN-355  comprovante numerado — sequência GAPLESS por tenant
//   RN-356  "pago" é registro manual (mock) — sem transferência real
//   RN-357  repasse/saldo/dados bancários: escrita SÓ por Function
//
// Este arquivo é SÓ shape (tipos + enums + guards). A matemática pura
// (computeRetido/computeSaldoRepasse/transitionRepasse/…) vive em
// `./repasse.ts` (E09s-L1-T3). Sem I/O, sem Firebase (regra do workspace).
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Enums / unions fechadas
// ---------------------------------------------------------------------------

/** Estados do repasse — union FECHADA (RN-353; 'cancelado' = decisão #11). */
export type EstadoRepasse =
  | 'solicitado'
  | 'aprovado'
  | 'recusado'
  | 'pago'
  | 'cancelado';

export const ESTADOS_REPASSE: readonly EstadoRepasse[] = [
  'solicitado',
  'aprovado',
  'recusado',
  'pago',
  'cancelado',
];

/** @pure */
export function isEstadoRepasse(v: unknown): v is EstadoRepasse {
  return (ESTADOS_REPASSE as readonly unknown[]).includes(v);
}

/**
 * Modo da taxa da plataforma no cálculo do LÍQUIDO do produtor (RN-347):
 *   'incorporada' — taxa sai do valor de face (líquido = face − taxa);
 *   'repassada'   — taxa é cobrada por fora do comprador (líquido = face).
 * O toggle por evento chega no E04; até lá o modo é parâmetro explícito
 * com default 'incorporada' (comportamento vigente) — nunca hardcoded.
 */
export type ModoTaxa = 'incorporada' | 'repassada';

export const MODOS_TAXA: readonly ModoTaxa[] = ['incorporada', 'repassada'];

/** @pure */
export function isModoTaxa(v: unknown): v is ModoTaxa {
  return (MODOS_TAXA as readonly unknown[]).includes(v);
}

/** Tipo de conta bancária do recebedor. */
export type TipoContaBancaria = 'corrente' | 'poupanca';

export const TIPOS_CONTA_BANCARIA: readonly TipoContaBancaria[] = [
  'corrente',
  'poupanca',
];

/** @pure */
export function isTipoContaBancaria(v: unknown): v is TipoContaBancaria {
  return (TIPOS_CONTA_BANCARIA as readonly unknown[]).includes(v);
}

// ---------------------------------------------------------------------------
// Dados bancários (RN-354 — LGPD)
// ---------------------------------------------------------------------------

/**
 * Doc `tenants/{tid}/dadosBancarios/current` — versão MASCARADA, a única
 * legível pelo cliente (RN-354). Nunca carrega número de conta/PIX em claro:
 * `contaMascarada` = `****1234` (só os 4 últimos dígitos), idem PIX/CPF-CNPJ.
 * Escrita EXCLUSIVA da Function `saveDadosBancarios` (L2-T2 — RN-357), que
 * mascara server-side; o cliente envia o dado em claro SÓ pelo callable.
 */
export interface DadosBancarios {
  /** Tenant dono (ADR-009 — coerência com o caminho do doc) */
  tenantId: string;
  /** Nome/código do banco (ex.: "260 — Nubank") */
  banco: string;
  /** Agência SEM dígito sensível (agência não é segredo bancário) */
  agencia: string;
  /** Conta mascarada — SÓ os 4 últimos dígitos visíveis (`****1234`) */
  contaMascarada: string;
  tipo: TipoContaBancaria;
  /** Chave PIX mascarada (`***@g***.com`, `***.***.***-12`…) — null = sem PIX */
  pixMascarado: string | null;
  /** Nome do titular (necessário para o admin conferir o favorecido) */
  titular: string;
  /** CPF/CNPJ do titular mascarado — só o final visível (`***.***.***-12`) */
  cpfCnpjMascarado: string;
  criadoEm: Timestamp;
  /** Reenvio sobrescreve idempotente PRESERVANDO criadoEm (aceite L2-T2) */
  atualizadoEm: Timestamp;
}

/**
 * Doc `tenants/{tid}/dadosBancariosSecret/current` — blob CIFRADO do número
 * de conta/PIX em claro (RN-354). Nas Rules: `read: false` e `write: false`
 * para TODO cliente, INCLUSIVE tenant_owner e platform_admin via client SDK —
 * só Function (Admin SDK) lê/escreve; a leitura admin passa pelo callable
 * auditado `getBankDetailsForPayout` (L2-T5, decisão #8).
 *
 * Mecanismo (decisão #5 do consolidador): AES-256-GCM com chave no Secret
 * Manager — ADR curto antes de L2-T2 fecha rotação/versionamento; KMS pós-V1.
 * Este shape é o ENVELOPE; a cifra em si é implementada no L2-T2.
 */
export interface DadosBancariosSecret {
  tenantId: string;
  /** Algoritmo do envelope (decisão #5) — literal fechado, sem "ou" */
  algoritmo: 'aes-256-gcm';
  /** Payload cifrado (JSON {conta, pix} em claro → base64 do ciphertext) */
  ciphertext: string;
  /** IV/nonce do GCM (base64, 12 bytes) — único por escrita */
  iv: string;
  /** Auth tag do GCM (base64, 16 bytes) — integridade do blob */
  authTag: string;
  /** Versão da chave no Secret Manager (rotação sem re-cifrar em massa) */
  keyVersion: number;
  atualizadoEm: Timestamp;
}

/**
 * Snapshot dos dados bancários CONGELADO no repasse no momento da
 * solicitação (sempre a versão mascarada — RN-354): trocar a conta depois
 * não reescreve para onde um repasse já solicitado/pago apontava.
 */
export type DadosBancariosSnapshot = Omit<
  DadosBancarios,
  'criadoEm' | 'atualizadoEm'
>;

// ---------------------------------------------------------------------------
// Repasse (RN-352/353/355/356)
// ---------------------------------------------------------------------------

/** Papéis que atuam na máquina do repasse (RN-353 + decisão #11). */
export type AtorRepasse = 'tenant_owner' | 'platform_admin';

/**
 * Entrada do histórico `transicoes[]` — APPEND-ONLY (trilha de auditoria:
 * de→para, quando, quem). A 1ª entrada nasce com o doc (de: null →
 * 'solicitado'); cada transição posterior faz append via Function. Nenhum
 * cliente escreve (RN-357) — as Rules negam write na coleção inteira.
 */
export interface TransicaoRepasse {
  /** Estado anterior — null SÓ na entrada de criação */
  de: EstadoRepasse | null;
  para: EstadoRepasse;
  em: Timestamp;
  /** uid de quem executou (owner solicita/cancela; admin aprova/recusa/paga) */
  por: string;
  papel: AtorRepasse;
}

/**
 * Doc `tenants/{tid}/repasses/{repasseId}` — UMA solicitação de saque.
 * Escrita EXCLUSIVA de Function (RN-357): requestRepasse cria em
 * 'solicitado'; cancelRepasse/approveRepasse/rejectRepasse/markRepassePago
 * transicionam via `transitionRepasse` (core — RN-353).
 */
export interface Repasse {
  id: string;
  tenantId: string;
  /**
   * RN-349 (LEELA-BEPEND-T2) — associação EXATA repasse↔evento. Escrito SÓ
   * pela Function `requestRepasse` (valida que o evento existe e pertence ao
   * tenant do caller; Rules congelam — cliente nunca escreve). OPCIONAL:
   * ausente = repasse do saldo geral do tenant, sem associação a evento
   * (docs legados pré-RN-349 incluídos) — a tela "Repasses por evento"
   * declara "sem associação", nunca adivinha por período/valor.
   */
  eventoId?: string;
  /** Valor solicitado (R$, 2 casas — validado por RN-352 no servidor) */
  valor: number;
  estado: EstadoRepasse;
  /** Dados bancários MASCARADOS congelados na solicitação (RN-354) */
  dadosBancariosSnapshot: DadosBancariosSnapshot;
  /**
   * Número do comprovante (RN-355) — presente SÓ em estado 'pago'.
   * Sequência GAPLESS por tenant via contador transacional (L2-T4);
   * formato determinístico em `formatarNumeroComprovante` (ex.: REP-2026-0007).
   * "Pago" é REGISTRO MANUAL mock — sem transferência real (RN-356).
   */
  comprovanteNumero?: string;
  /** Histórico append-only de transições (auditoria — RN-353) */
  transicoes: TransicaoRepasse[];
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// ---------------------------------------------------------------------------
// Saldo (RN-348/350/351)
// ---------------------------------------------------------------------------

/**
 * Doc `tenants/{tid}/saldo/current` — ∑ CONSOLIDADO do tenant (decisão #2),
 * recomputado INTEGRALMENTE pela Function `updateSaldoRepasse` (L2-T1) com
 * `computeSaldoRepasse` (core). Cliente NUNCA escreve (RN-357) nem soma no
 * cliente — os 3 cards do painel-slim leem SÓ este doc.
 *
 * Invariantes: disponivel ≥ 0 SEMPRE (RN-351); retido do evento zera quando
 * `evento.status === 'encerrado'` (RN-350 — encerramento automático por
 * data, cron L2-T6; o organizador NÃO encerra o próprio evento).
 */
export interface SaldoRepasse {
  tenantId: string;
  /** Σ receita bruta confirmada dos eventos do tenant (R$) */
  vendidoBruto: number;
  /** Σ retenção dos eventos NÃO encerrados (RN-350; base = líquido) */
  retido: number;
  /** Σ liberado − comprometido − dentroJanelaDN, clamp em 0 (RN-351) */
  disponivel: number;
  /** Σ valor dos repasses em {solicitado, aprovado, pago} (RN-351) */
  comprometido: number;
  /**
   * RN-348: Σ fundos com MENOS de D+N dias úteis desde a transação — ainda
   * NÃO entram em `disponivel`. A fonte agregada atual (financeiro/current,
   * por evento) não tem granularidade por transação: até o L2-T1 integrar a
   * fonte por transação, a Function grava 0 AQUI (documentado — nunca
   * fabricar dado). A derivação pura já existe (computeDentroJanelaDN).
   */
  dentroJanelaDN: number;
  /**
   * Nº de eventos com `receitaLiquida === null` (tenant sem termo comercial
   * — decisão #7): esses eventos NÃO contribuem para retido/disponível e o
   * repasse fica BLOQUEADO até existir termo (a Function de solicitação
   * rejeita com failed-precondition).
   */
  eventosSemTermo: number;
  atualizadoEm: Timestamp;
}

// ---------------------------------------------------------------------------
// Inputs puros do cálculo de saldo (consumidos por computeSaldoRepasse)
// ---------------------------------------------------------------------------

/**
 * Projeção de UM evento para o cálculo do saldo — derivada de
 * `eventos/{id}/financeiro/current` (E03-S207, shape FinanceiroEvento) +
 * `evento.status`. `receitaLiquida === null` ⇒ tenant sem termo (decisão #7).
 */
export interface EventoSaldoInput {
  eventoId: string;
  /** `financeiro/current.receitaBruta` (R$) */
  receitaBruta: number;
  /** `financeiro/current.receitaLiquida` — null quando taxaPct === null */
  receitaLiquida: number | null;
  /** `evento.status === 'encerrado'` (RN-350 — libera a retenção) */
  encerrado: boolean;
}

/** Projeção de UM repasse para o cálculo do comprometido (RN-351). */
export interface RepasseSaldoInput {
  valor: number;
  estado: EstadoRepasse;
}

/**
 * Transação individual para a janela D+N (RN-348) — granularidade POR
 * TRANSAÇÃO. A fonte real desta projeção é pendência do L2-T1 (o agregado
 * por evento não a expõe); o cálculo puro já está pronto para recebê-la.
 */
export interface TransacaoJanelaInput {
  /** Valor líquido da transação (R$) */
  valorLiquido: number;
  /** Instante da confirmação do pagamento */
  confirmadaEm: Date;
}
