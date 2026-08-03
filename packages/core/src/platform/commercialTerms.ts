// =============================================================================
// packages/core/src/platform/commercialTerms.ts
//
// Termos comerciais por tenant (LEELA-S1602-T1 · ADR-009 §Termos comerciais).
//
// Doc canônico: `tenants/{tenantId}/commercialTerms/current` — escrita
// EXCLUSIVA do platform_admin (RN-404); o tenant lê read-only; E04 (checkout/
// parcelamento) e E09 (split/taxa) consomem via TermsProvider (S1602-T3).
//
// Versionamento: `current` carrega `versao` (int, começa em 1). Cada save
// grava também um snapshot imutável `commercialTerms/v{versao}` — histórico
// auditável de quem mudou a economia do tenant e quando. As Rules travam:
// create de current exige versao == 1; update exige versao == anterior + 1;
// snapshots v* são create-only (nunca update/delete).
//
// RNs: RN-404 (só admin escreve), RN-405 (saasMonthlyFee 0 é válido —
// produtor-sócio isento), RN-406 (o termo é a FONTE da taxa; nunca constante),
// RN-410 (anticipation existe como campo; mecânica é pós-V1).
// =============================================================================

import type { Timestamp } from '../index';
// Guard puro + tipo do modo da taxa (RN-347) — sem dependência de runtime
// além do próprio guard (repasse-types não importa nada em runtime).
import { isModoTaxa, type ModoTaxa } from '../finance/repasse-types';
// Taxa-flex (TAXAFLEX · RN-178): override por organizador da tabela por meio.
import {
  validarTaxaTabelaOverride,
  type TaxaTabelaOverride,
} from '../finance/taxaPlataforma';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Regras de parcelamento do checkout (consumidas por E04 — RN-311) */
export interface InstallmentRules {
  /** Número máximo de parcelas ofertadas (≥ 1) */
  maxParcelas: number;
  /** Juros ao mês em % (0 = sem juros) */
  jurosAoMes: number;
  /** Valor mínimo de cada parcela em R$ (≥ 0) */
  parcelaMinima: number;
}

/**
 * Antecipação de recebíveis (RN-410).
 * O CAMPO existe e é configurável desde a V1; a MECÂNICA é pós-V1.
 */
export interface Anticipation {
  disponivel: boolean;
  /** Custo da antecipação em % — só faz sentido quando disponivel */
  custoPct?: number;
}

/**
 * Taxa % por método de pagamento (Onda 2 — decisão Vitor 2026-07-05):
 * comissão da plataforma DEDUZIDA da receita do produtor, por método.
 * Métodos V1 = cartão de crédito + PIX (sem boleto). 10/8 são DEFAULTS
 * (nascem do plano "Padrão"), não valores fixos — configurável pelo
 * platform_admin (editor S1602-T2) e estampado por plano (T2-L4).
 */
export interface TaxaPorMetodo {
  credit_card: number;
  pix: number;
}

/**
 * Tabela de taxas por nº de parcelas (2x-12x) — chaves '2'..'12', valor em
 * % sobre o parcelamento (0 = sem taxa). 1x à vista NÃO entra na tabela
 * (sem taxa de parcela por definição); só cartão parcela.
 */
export type TabelaTaxasParcela = Record<string, number>;

/** Chaves canônicas da tabela por parcela (2x..12x). */
export const CHAVES_TABELA_PARCELAS: readonly string[] = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
];

/**
 * Tabela estruturalmente válida? Toda chave deve ser 2..12 e toda taxa
 * finita em [0, 100]. NÃO exige completude — a edição fina por tenant
 * pode ajustar chaves isoladas (o PLANO exige completude na própria
 * validação, ver planoCobranca.ts). @pure
 */
export function isTabelaTaxasParcelaValida(tabela: unknown): tabela is TabelaTaxasParcela {
  if (!tabela || typeof tabela !== 'object' || Array.isArray(tabela)) return false;
  for (const [chave, valor] of Object.entries(tabela)) {
    if (!CHAVES_TABELA_PARCELAS.includes(chave)) return false;
    if (typeof valor !== 'number' || !Number.isFinite(valor)) return false;
    if (valor < 0 || valor > 100) return false;
  }
  return true;
}

/**
 * Termos comerciais do tenant — doc `commercialTerms/current`.
 * Escrita exclusiva do platform_admin (RN-404).
 */
export interface CommercialTerms {
  /** Taxa da plataforma em % sobre receita bruta confirmada (RN-406/RN-330) */
  platformFeePct: number;
  installmentRules: InstallmentRules;
  anticipation: Anticipation;
  /** Habilita mensalidade da comunidade (destrava clube pago — RN-104/407) */
  communityMonthlyEnabled: boolean;
  /** Mensalidade SaaS em R$ — 0 é VÁLIDO (produtor-sócio isento, RN-405) */
  saasMonthlyFee: number;
  /**
   * RN-350/RN-348 (E09s-L1 · decisão #4): retenção % de repasse POR TENANT
   * sobre o LÍQUIDO do produtor até o evento encerrar. OPCIONAL: ausente ⇒
   * vale o default global (RETENCAO_REPASSE_PCT_DEFAULT = 15, em
   * finance/repasse.ts; doc default em `platform/config`). Escrita segue
   * RN-404 — só platform_admin (via setRetencaoRepasse, L2-T4).
   */
  retencaoRepassePct?: number;
  /**
   * RN-348 (E09s-L1): janela D+N em DIAS ÚTEIS antes de o valor entrar em
   * `disponivel`. OPCIONAL: ausente ⇒ default global
   * (DISPONIBILIZACAO_DIAS_UTEIS_DEFAULT = 2). Mesma disciplina RN-404.
   */
  disponibilizacaoDiasUteis?: number;
  /**
   * Onda 2 (T2-L4/E12/E04 · decisão 2026-07-05): taxa % POR MÉTODO
   * (credit_card/pix). OPCIONAL: ausente ⇒ consumo a jusante cai no
   * `platformFeePct` legado. Chega ao tenant via PLANO (aplicarPlano
   * estampa) e segue ajustável campo-a-campo (editor S1602-T2, RN-404).
   */
  taxaPorMetodo?: TaxaPorMetodo;
  /**
   * Onda 2: tabela de taxas por parcela 2x-12x. OPCIONAL (mesma
   * disciplina do taxaPorMetodo) — `finance/calc` a consome quando
   * presente. Estampada por plano; ajustável campo-a-campo.
   */
  tabelaTaxasParcela?: TabelaTaxasParcela;
  /**
   * RN-347 (E03/E04): modo DEFAULT da taxa para eventos NOVOS do tenant
   * ('incorporada' | 'repassada'). OPCIONAL: ausente ⇒ 'incorporada'
   * (MODO_TAXA_DEFAULT do core). `criarEvento` estampa este default no
   * evento quando o input não traz `taxaModo`; dali em diante o modo é
   * POR EVENTO (editável até a 1ª venda — Rules congelam depois).
   * Escrita segue RN-404 — só platform_admin.
   */
  modoTaxaDefault?: ModoTaxa;
  /**
   * TAXAFLEX (RN-178 · rodada 2026-07-19): OVERRIDE por organizador da
   * tabela de taxa por meio (`{pix|cartao|boleto} → {percentual,
   * fixoCentavos}`). PARCIAL: só as linhas negociadas por contrato — linha
   * ausente herda a GLOBAL (`platform/config.taxaPlataforma`); precedência
   * override > global > `platformFeePct` legado. Escrita segue RN-404 —
   * só platform_admin. Congelada por venda no ato da compra (RN-179).
   * Supersede `taxaPorMetodo` (Onda 2 — nunca consumido pelo checkout).
   */
  taxaTabela?: TaxaTabelaOverride;
  /**
   * Auditoria de origem (T2-L4 · CB-T2): id do plano aplicado que estampou
   * esta versão — REFERÊNCIA MORTA (rastro; SEM vínculo vivo: editar o
   * plano depois NÃO retroage; só reaplicar re-estampa).
   */
  planoAplicadoId?: string;
  /** Quando o plano foi aplicado (par do planoAplicadoId — rastro). */
  planoAplicadoEm?: Timestamp;
  /** Versão do termo (int ≥ 1); snapshots v{versao} são imutáveis */
  versao: number;
  /** uid do platform_admin que gravou esta versão */
  atualizadoPor: string;
  atualizadoEm: Timestamp;
}

/** Payload editável dos termos (sem metadados de versionamento/auditoria). */
export type CommercialTermsInput = Omit<
  CommercialTerms,
  'versao' | 'atualizadoPor' | 'atualizadoEm'
>;

// ---------------------------------------------------------------------------
// Defaults canônicos
// ---------------------------------------------------------------------------

/**
 * Termo canônico da V1 (mock Castelo Produções — HANDOFF-05 / E04 / E09):
 * 10,5% de taxa, até 12x com juros de 2,89% a.m., antecipação indisponível,
 * comunidade desabilitada, SaaS R$ 0 (produtor-sócio — RN-405).
 *
 * Usado como default seguro no provisionamento (S1601-T1) quando o admin
 * não informa termos iniciais.
 *
 * ── S314-T2 · por que 2,89 mora AQUI e não no cálculo (RN-436 · D-ACH-8) ───
 *
 * O dono pediu para simular o painel administrativo configurado em 2,89% a.m.
 * O número entra como DADO do termo — que é onde ele já morava, editável em
 * `TermsEditor` — e nenhuma linha de cálculo ganha um literal. Isso importa
 * duas vezes: quando o dono vetar o número, a mudança é de dado; e quando a
 * tabela real negociada por organizador nascer (épico futuro), ela substitui
 * um valor, não uma constante espalhada.
 *
 * O 0 anterior não era "sem juros por decisão": era o motor desligado. Com ele
 * ligado, a diferença entre o composto do prazo inteiro e a tabela Price passa
 * a valer dinheiro — ver `buildInstallmentOptions` (S314-T1).
 *
 * SUPERSEDE os 3,49% a.m. documentados na decisão de 2026-07-05 (registrada em
 * `pedidos/pagamento.ts` e no seed de pedidos). Os dois comentários foram
 * corrigidos na mesma aterrissagem: documentação que contradiz a regra vigente
 * é a próxima armadilha de quem for mexer nisso.
 */
export const DEFAULT_COMMERCIAL_TERMS: CommercialTermsInput = {
  platformFeePct: 10.5,
  installmentRules: {
    maxParcelas: 12,
    jurosAoMes: 2.89,
    parcelaMinima: 10,
  },
  anticipation: { disponivel: false },
  communityMonthlyEnabled: false,
  saasMonthlyFee: 0,
};

// ---------------------------------------------------------------------------
// Validações puras (reusadas por Function, api-client e testes)
// ---------------------------------------------------------------------------

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Valida um payload de termos comerciais. Retorna a lista de erros
 * (vazia = válido). Pura — sem efeitos colaterais.
 *
 * Regras:
 *   - platformFeePct ∈ [0, 100]
 *   - saasMonthlyFee ≥ 0 (0 é VÁLIDO — RN-405)
 *   - maxParcelas inteiro ≥ 1; jurosAoMes ≥ 0; parcelaMinima ≥ 0
 *   - anticipation.custoPct ∈ [0, 100] quando presente
 */
export function validateCommercialTerms(
  input: CommercialTermsInput
): string[] {
  const errors: string[] = [];

  if (!isFiniteNumber(input.platformFeePct) || input.platformFeePct < 0 || input.platformFeePct > 100) {
    errors.push('platformFeePct deve estar entre 0 e 100.');
  }

  if (!isFiniteNumber(input.saasMonthlyFee) || input.saasMonthlyFee < 0) {
    errors.push('saasMonthlyFee deve ser ≥ 0 (0 = isento, RN-405).');
  }

  const rules = input.installmentRules;
  if (!rules || typeof rules !== 'object') {
    errors.push('installmentRules é obrigatório.');
  } else {
    if (!Number.isInteger(rules.maxParcelas) || rules.maxParcelas < 1) {
      errors.push('installmentRules.maxParcelas deve ser inteiro ≥ 1.');
    }
    if (!isFiniteNumber(rules.jurosAoMes) || rules.jurosAoMes < 0) {
      errors.push('installmentRules.jurosAoMes deve ser ≥ 0.');
    }
    if (!isFiniteNumber(rules.parcelaMinima) || rules.parcelaMinima < 0) {
      errors.push('installmentRules.parcelaMinima deve ser ≥ 0.');
    }
  }

  const ant = input.anticipation;
  if (!ant || typeof ant !== 'object' || typeof ant.disponivel !== 'boolean') {
    errors.push('anticipation.disponivel é obrigatório (boolean).');
  } else if (ant.custoPct !== undefined) {
    if (!isFiniteNumber(ant.custoPct) || ant.custoPct < 0 || ant.custoPct > 100) {
      errors.push('anticipation.custoPct deve estar entre 0 e 100.');
    }
  }

  if (typeof input.communityMonthlyEnabled !== 'boolean') {
    errors.push('communityMonthlyEnabled é obrigatório (boolean).');
  }

  // E09s-L1 (RN-348/350 · decisão #4): campos de repasse OPCIONAIS — quando
  // presentes, validam range; ausentes valem os defaults globais do core.
  if (input.retencaoRepassePct !== undefined) {
    if (
      !isFiniteNumber(input.retencaoRepassePct) ||
      input.retencaoRepassePct < 0 ||
      input.retencaoRepassePct > 100
    ) {
      errors.push('retencaoRepassePct deve estar entre 0 e 100 (RN-350).');
    }
  }
  if (input.disponibilizacaoDiasUteis !== undefined) {
    if (
      !Number.isInteger(input.disponibilizacaoDiasUteis) ||
      input.disponibilizacaoDiasUteis < 0
    ) {
      errors.push('disponibilizacaoDiasUteis deve ser inteiro ≥ 0 (RN-348).');
    }
  }

  // Onda 2 (T2-L4): campos por método/parcela OPCIONAIS — quando presentes,
  // ranges travados (mesma disciplina dos campos de repasse acima).
  if (input.taxaPorMetodo !== undefined) {
    const t = input.taxaPorMetodo;
    if (
      !t || typeof t !== 'object' ||
      !isFiniteNumber(t.credit_card) || t.credit_card < 0 || t.credit_card > 100 ||
      !isFiniteNumber(t.pix) || t.pix < 0 || t.pix > 100
    ) {
      errors.push('taxaPorMetodo deve ter credit_card e pix entre 0 e 100.');
    }
  }
  if (input.tabelaTaxasParcela !== undefined) {
    if (!isTabelaTaxasParcelaValida(input.tabelaTaxasParcela)) {
      errors.push(
        'tabelaTaxasParcela inválida (chaves 2..12; taxas entre 0 e 100).'
      );
    }
  }

  // TAXAFLEX (RN-178): override da tabela por meio OPCIONAL — quando
  // presente, cada linha valida range/passo (mesma disciplina dos demais).
  if (input.taxaTabela !== undefined) {
    errors.push(...validarTaxaTabelaOverride(input.taxaTabela));
  }

  // RN-347: modo default da taxa OPCIONAL — quando presente, enum fechado.
  if (input.modoTaxaDefault !== undefined && !isModoTaxa(input.modoTaxaDefault)) {
    errors.push(
      "modoTaxaDefault deve ser 'incorporada' ou 'repassada' (RN-347)."
    );
  }

  return errors;
}

/**
 * Versionamento: o bump válido é SEMPRE `anterior + 1`.
 * `anterior = null` (primeiro save) exige versao 1.
 */
export function isValidTermsVersionBump(
  previous: number | null,
  next: number
): boolean {
  if (!Number.isInteger(next) || next < 1) return false;
  if (previous === null) return next === 1;
  return next === previous + 1;
}
