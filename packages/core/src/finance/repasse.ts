// =============================================================================
// packages/core/src/finance/repasse.ts
//
// Núcleo PURO do repasse do organizador (LEELA-E09s-L1-T3 · E09-slim).
//
// Toda a matemática e a máquina de estados do saque vivem AQUI e são
// consumidas pelas Functions do L2 (updateSaldoRepasse, requestRepasse,
// approve/reject/markRepassePago, cancelRepasse) — o cliente NUNCA recalcula
// saldo nem transiciona estado (RN-357; Rules negam write nas 4 coleções).
//
// REGRA DE OURO (RN-406): taxa NUNCA é constante deste módulo — o líquido do
// produtor reusa `computeReceitaLiquida` (calc.ts) com o % do TERMO do
// tenant. A retenção (RN-350) e a janela D+N (RN-348) têm DEFAULTS aqui
// (15% / 2 dias úteis), sobrescritos pelos campos opcionais de
// `commercialTerms/current` (decisão #4) — sempre por parâmetro.
//
// Convenção monetária: reais (number), 2 casas, half-up via `roundMoney` —
// consistente com calc.ts e com os agregados (`receitaConfirmada` etc.).
//
// Sem I/O, sem Firebase, sem relógio implícito (`agora` é sempre parâmetro).
// =============================================================================

import { computeReceitaLiquida, roundMoney } from './calc';
import {
  computeTaxaPlataformaReais,
  taxaMeioValoresValidos,
  type TaxaMeio,
} from './taxaPlataforma';
import { FUSO_EVENTO, dataLocalISO } from '../eventos/dataEvento';
import type {
  AtorRepasse,
  EstadoRepasse,
  EventoSaldoInput,
  ModoTaxa,
  RepasseSaldoInput,
  TransacaoJanelaInput,
} from './repasse-types';

// ---------------------------------------------------------------------------
// Defaults canônicos (RN-348/350 — sobrescritos pelo termo do tenant)
// ---------------------------------------------------------------------------

/** Retenção % default sobre o LÍQUIDO até o evento encerrar (RN-350). */
export const RETENCAO_REPASSE_PCT_DEFAULT = 15;

/** Janela D+N default em DIAS ÚTEIS antes de o valor liberar (RN-348). */
export const DISPONIBILIZACAO_DIAS_UTEIS_DEFAULT = 2;

/** Modo da taxa vigente até o toggle E04 existir (RN-347). */
export const MODO_TAXA_DEFAULT: ModoTaxa = 'incorporada';

/** Prefixo canônico do comprovante de repasse (RN-355). */
export const COMPROVANTE_PREFIXO = 'REP';

// ---------------------------------------------------------------------------
// RN-347 — líquido do produtor com modo de taxa EXPLÍCITO
// ---------------------------------------------------------------------------

/**
 * Líquido do produtor a partir do valor de face (RN-347 · RN-180/182):
 *   'incorporada' — a taxa sai do face: líquido = face − taxa;
 *   'repassada'   — a taxa é cobrada por fora do comprador: líquido = face.
 *
 * `platformFee` (TAXAFLEX · RN-180/183) aceita as DUAS fontes:
 *   - `number` — percentual LEGADO do termo (comportamento vigente byte a
 *     byte: reusa `computeReceitaLiquida`, RN-406 — nunca reimplementa);
 *   - `TaxaMeio` — linha da tabela por meio `{percentual, fixoCentavos}`
 *     (RN-178): taxa cent-exata via `computeTaxaPlataformaReais` (half-up
 *     em centavos — RN-183), fixo incluído.
 *
 * O modo é SEMPRE parâmetro (default 'incorporada' = comportamento vigente);
 * fee inválida valida nos DOIS modos — termo/tabela lixo falha cedo.
 * @pure
 */
export function computeLiquidoProdutor(
  receitaBruta: number,
  platformFee: number | TaxaMeio,
  modo: ModoTaxa = MODO_TAXA_DEFAULT
): number {
  if (!Number.isFinite(receitaBruta) || receitaBruta < 0) {
    throw new RangeError('receitaBruta deve ser um número ≥ 0.');
  }
  if (typeof platformFee === 'number') {
    if (!Number.isFinite(platformFee) || platformFee < 0 || platformFee > 100) {
      throw new RangeError('platformFeePct deve estar entre 0 e 100.');
    }
    if (modo === 'repassada') return roundMoney(receitaBruta);
    return computeReceitaLiquida(receitaBruta, platformFee);
  }
  if (!taxaMeioValoresValidos(platformFee)) {
    throw new RangeError(
      'platformFee (TaxaMeio) inválida — {percentual 0–100 passo 0,01, fixoCentavos int ≥ 0} (RN-178).'
    );
  }
  if (modo === 'repassada') return roundMoney(receitaBruta);
  return roundMoney(receitaBruta - computeTaxaPlataformaReais(receitaBruta, platformFee));
}

// ---------------------------------------------------------------------------
// RN-350 — retenção pós-evento
// ---------------------------------------------------------------------------

/**
 * Retenção anti-fraude sobre o LÍQUIDO do produtor (decisão #3):
 * evento NÃO encerrado ⇒ `liquido × pct/100`; encerrado ⇒ 0 (liberou).
 * O encerramento é automático por data (cron L2-T6) — o organizador não
 * encerra o próprio evento para liberar o próprio retido.
 * @pure
 */
export function computeRetido(
  liquido: number,
  pct: number,
  encerrado: boolean
): number {
  if (!Number.isFinite(liquido) || liquido < 0) {
    throw new RangeError('liquido deve ser um número ≥ 0.');
  }
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    throw new RangeError('retencaoPct deve estar entre 0 e 100.');
  }
  if (encerrado) return 0;
  return roundMoney(liquido * (pct / 100));
}

/**
 * Parcela do líquido de UM evento que conta para o disponível (RN-351):
 * `encerrado ? liquido : liquido − retido` — derivada via `computeRetido`
 * para manter a consistência de centavo (liberado + retido == liquido).
 * @pure
 */
export function computeLiberadoPorEvento(
  liquido: number,
  pct: number,
  encerrado: boolean
): number {
  return roundMoney(liquido - computeRetido(liquido, pct, encerrado));
}

/**
 * Disponível de UM evento DEPOIS de abater os repasses vivos daquele evento
 * (DEC-0727 · RN-349/RN-351): `max(0, liberado − repassadoVivo)`.
 *
 * Repasse VIVO é o MESMO conjunto de `comprometeSaldo` — {solicitado,
 * aprovado, pago} (RN-351): dinheiro que já saiu ou está a caminho de sair.
 * Estorno de repasse (`cancelRepasse` → 'cancelado', `rejectRepasse` →
 * 'recusado') tira o doc desse conjunto, e o valor volta ao disponível POR
 * CONSTRUÇÃO — não existe um caminho de devolução separado para manter em
 * sincronia (RN-353).
 *
 * `liberado` é o disponível do evento ANTES do abatimento; cada tela entra com
 * a própria base (a Caixa do evento parte da receita total menos a retenção
 * que ela exibe; a visão macro parte de `computeLiberadoPorEvento` sobre o
 * líquido). Este helper NÃO escolhe a base: crava num lugar só o que abate e
 * o clamp, para as duas telas não divergirem na semântica — a incoerência que
 * a DEC-0727 fechou nasceu de subtração faltando numa delas.
 *
 * Clamp em 0 como em RN-351 — disponível nunca é negativo. Repasse vivo maior
 * que o liberado é estado alcançável (a retenção volta a incidir quando um
 * evento encerrado é reaberto), e nesse caso a resposta honesta é zero, não
 * um negativo que a tela formataria como "-R$ 120,00".
 * @pure
 */
export function computeDisponivelPorEvento(
  liberado: number,
  repassadoVivo: number
): number {
  if (!Number.isFinite(liberado) || liberado < 0) {
    throw new RangeError('liberado deve ser um número ≥ 0.');
  }
  if (!Number.isFinite(repassadoVivo) || repassadoVivo < 0) {
    throw new RangeError('repassadoVivo deve ser um número ≥ 0 (Σ dos repasses vivos).');
  }
  return Math.max(0, roundMoney(liberado - repassadoVivo));
}

// ---------------------------------------------------------------------------
// RN-367 — a BASE ÚNICA do "Disponível para Repasse" de UM evento
// ---------------------------------------------------------------------------

export interface DisponivelDoEventoParams {
  /**
   * `financeiro/current.receitaLiquida` do evento — LÍQUIDO do produtor.
   * `null` = tenant sem termo comercial (decisão #7): nada libera e o número
   * é INDETERMINADO, nunca zero.
   */
  receitaLiquida: number | null;
  /** `evento.status === 'encerrado'` (RN-350 — encerrar libera a retenção). */
  encerrado: boolean;
  /** % do termo do tenant; ausente ⇒ default 15 (RN-350). */
  retencaoPct?: number;
  /** Σ dos repasses VIVOS ({solicitado, aprovado, pago}) DAQUELE evento. */
  repassadoVivo: number;
}

export interface DisponivelDoEvento {
  /** Liberado do evento ANTES do abatimento (null = sem termo). */
  liberado: number | null;
  /** Disponível DEPOIS de abater os repasses vivos, clamp 0 (null = sem termo). */
  disponivel: number | null;
  /**
   * Quanto da Σ de repasse CABE no liberado — o que o disponível de fato
   * ABSORVEU. Existe porque o clamp de RN-351 trava em 0: com liberado 8.500 e
   * repasse vivo 9.000, o número absorveu 8.500, e qualquer frase que afirme
   * "já desconta 9.000" descreve um desconto que não aconteceu (review
   * CAIXADISP-REV, R-2). Sem termo ⇒ 0 (não há de onde abater).
   */
  absorvido: number;
  /** `receitaLiquida === null` — o disponível é indeterminado, não zero. */
  semTermo: boolean;
}

/**
 * Disponível para repasse de UM evento (RN-367 · DEC-0727C) — a base ÚNICA do
 * número, compartilhada pela Caixa do evento, pela coluna por-evento e pelo
 * guard do `requestRepasse`:
 *
 *   liberado   = encerrado ? líquido : líquido − líquido × pct/100   (RN-350)
 *   disponível = max(0, liberado − Σ repasses vivos do evento)       (RN-351)
 *
 * A base é o LÍQUIDO do produtor, nunca a receita bruta. A taxa da plataforma
 * nunca foi dinheiro do organizador e não é repassável, então literalizar
 * "tudo que entrou − tudo que saiu" para dentro dela produziria um disponível
 * sistematicamente ACIMA do que o saque aceita — a divergência de R$ 4.774,45
 * que a review CAIXADISP-REV mediu no mock canônico do repo (vetor 3), e que a
 * DEC-0727C fechou mandando a Caixa usar a base do saque. A diferença entre a
 * receita total e este número é retido + taxa, e fica IMPLÍCITA na tela: o
 * organizador vê três números, não a margem da plataforma (RN-404).
 *
 * Sem termo (`receitaLiquida === null`) devolve `null` nos dois valores — "—"
 * honesto na tela, rejeição honesta no servidor. Zero seria mentira: não é que
 * não haja dinheiro, é que não há como saber quanto. @pure
 */
export function computeDisponivelDoEvento(
  params: DisponivelDoEventoParams
): DisponivelDoEvento {
  const pct = params.retencaoPct ?? RETENCAO_REPASSE_PCT_DEFAULT;
  if (!Number.isFinite(params.repassadoVivo) || params.repassadoVivo < 0) {
    throw new RangeError('repassadoVivo deve ser um número ≥ 0 (Σ dos repasses vivos).');
  }
  if (params.receitaLiquida === null) {
    return { liberado: null, disponivel: null, absorvido: 0, semTermo: true };
  }
  const liberado = computeLiberadoPorEvento(
    params.receitaLiquida,
    pct,
    params.encerrado
  );
  return {
    liberado,
    disponivel: computeDisponivelPorEvento(liberado, params.repassadoVivo),
    absorvido: roundMoney(Math.min(params.repassadoVivo, liberado)),
    semTermo: false,
  };
}

// ---------------------------------------------------------------------------
// RN-351 — saldo consolidado (∑ do tenant)
// ---------------------------------------------------------------------------

/**
 * Estados de repasse que COMPROMETEM o disponível (RN-351). `recusado` e
 * `cancelado` ficam FORA — recusa/cancelamento devolvem o valor (RN-353).
 * `pago` permanece comprometido: o dinheiro saiu, nunca volta ao disponível.
 */
export const ESTADOS_REPASSE_COMPROMETIDOS: readonly EstadoRepasse[] = [
  'solicitado',
  'aprovado',
  'pago',
];

/** O repasse neste estado abate o disponível? (RN-351) @pure */
export function comprometeSaldo(estado: EstadoRepasse): boolean {
  return (ESTADOS_REPASSE_COMPROMETIDOS as readonly string[]).includes(estado);
}

export interface ComputeSaldoRepasseParams {
  /** Projeção dos eventos do tenant (financeiro/current + status) */
  eventos: readonly EventoSaldoInput[];
  /** TODOS os repasses do tenant (o filtro de estado é daqui, não do caller) */
  repasses: readonly RepasseSaldoInput[];
  /** % de retenção do termo do tenant — ausente ⇒ default 15 (RN-350) */
  retencaoPct?: number;
  /**
   * Σ fundos ainda na janela D+N (RN-348), pré-computado por
   * `computeDentroJanelaDN` quando a fonte por transação existir.
   * Ausente ⇒ 0 (fonte agregada atual não tem granularidade — pendência
   * L2-T1 documentada no modelo; NUNCA fabricar valor aqui).
   */
  dentroJanelaDN?: number;
}

/** Resultado puro do recompute — a Function persiste em `saldo/current`. */
export interface SaldoRepasseComputado {
  vendidoBruto: number;
  retido: number;
  disponivel: number;
  comprometido: number;
  dentroJanelaDN: number;
  eventosSemTermo: number;
}

/**
 * Recompute INTEGRAL do saldo do tenant (RN-350/351 — full recompute
 * idempotente, padrão dos agregados ∑ do repo):
 *
 *   liberadoPorEvento = encerrado ? liquido : liquido × (1 − pct/100)
 *   comprometido      = Σ valor dos repasses em {solicitado, aprovado, pago}
 *   disponivel        = max(0, Σ liberado − comprometido − dentroJanelaDN)
 *
 * Evento com `receitaLiquida === null` (tenant sem termo — decisão #7) conta
 * no `vendidoBruto` e em `eventosSemTermo`, mas NÃO gera retido/liberado —
 * repasse fica bloqueado até existir termo (a Function L2-T3 rejeita).
 * `disponivel` NUNCA fica negativo (RN-351) — clamp explícito em 0.
 * @pure
 */
export function computeSaldoRepasse(
  params: ComputeSaldoRepasseParams
): SaldoRepasseComputado {
  const pct = params.retencaoPct ?? RETENCAO_REPASSE_PCT_DEFAULT;
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    throw new RangeError('retencaoPct deve estar entre 0 e 100.');
  }
  const janela = params.dentroJanelaDN ?? 0;
  if (!Number.isFinite(janela) || janela < 0) {
    throw new RangeError('dentroJanelaDN deve ser um número ≥ 0.');
  }

  let vendidoBruto = 0;
  let retido = 0;
  let liberado = 0;
  let eventosSemTermo = 0;

  for (const ev of params.eventos) {
    if (!Number.isFinite(ev.receitaBruta) || ev.receitaBruta < 0) {
      throw new RangeError(`receitaBruta inválida no evento ${ev.eventoId}.`);
    }
    vendidoBruto = roundMoney(vendidoBruto + ev.receitaBruta);

    if (ev.receitaLiquida === null) {
      eventosSemTermo += 1; // decisão #7: sem termo ⇒ nada libera
      continue;
    }
    if (!Number.isFinite(ev.receitaLiquida) || ev.receitaLiquida < 0) {
      throw new RangeError(`receitaLiquida inválida no evento ${ev.eventoId}.`);
    }
    const retidoEvento = computeRetido(ev.receitaLiquida, pct, ev.encerrado);
    retido = roundMoney(retido + retidoEvento);
    liberado = roundMoney(liberado + roundMoney(ev.receitaLiquida - retidoEvento));
  }

  let comprometido = 0;
  for (const rep of params.repasses) {
    if (!comprometeSaldo(rep.estado)) continue; // recusado/cancelado devolvem
    if (!Number.isFinite(rep.valor) || rep.valor <= 0) {
      throw new RangeError('repasse com valor inválido no cálculo do saldo.');
    }
    comprometido = roundMoney(comprometido + rep.valor);
  }

  const disponivel = Math.max(0, roundMoney(liberado - comprometido - janela));

  return {
    vendidoBruto,
    retido,
    disponivel,
    comprometido,
    dentroJanelaDN: roundMoney(janela),
    eventosSemTermo,
  };
}

// ---------------------------------------------------------------------------
// RN-352 — validação da solicitação de saque
// ---------------------------------------------------------------------------

export interface ResultadoValidacaoSolicitacao {
  ok: boolean;
  /** Vazia quando ok — mensagens acionáveis para o failed-precondition */
  erros: string[];
}

/**
 * Solicitação válida: `0 < valor ≤ disponivel`, cent-exato (RN-352).
 * O SERVIDOR (L2-T3) relê `disponivel` e valida TRANSACIONALMENTE — duas
 * solicitações concorrentes somando mais que o disponível ⇒ a segunda
 * falha na releitura (o espelho client é só UX).
 * @pure
 */
export function validarSolicitacao(
  valor: number,
  disponivel: number
): ResultadoValidacaoSolicitacao {
  const erros: string[] = [];

  if (!Number.isFinite(valor)) {
    erros.push('valor deve ser um número finito.');
  } else if (roundMoney(valor) !== valor) {
    erros.push('valor deve ser cent-exato (R$, 2 casas).');
  } else if (valor <= 0) {
    erros.push('valor deve ser maior que zero (RN-352).');
  }

  if (!Number.isFinite(disponivel) || disponivel < 0) {
    erros.push('disponivel inválido — recompute o saldo antes de validar.');
  } else if (Number.isFinite(valor) && valor > disponivel) {
    erros.push('valor excede o disponível (RN-352).');
  }

  return { ok: erros.length === 0, erros };
}

// ---------------------------------------------------------------------------
// RN-353 — máquina de estados do repasse
// ---------------------------------------------------------------------------

/**
 * Matriz de transições VÁLIDAS (RN-353 + decisão #11):
 * `recusado`/`pago`/`cancelado` são TERMINAIS. Nunca re-derivar localmente —
 * Functions consultam esta matriz via `transitionRepasse`.
 */
export const TRANSICOES_REPASSE: Readonly<
  Record<EstadoRepasse, readonly EstadoRepasse[]>
> = {
  solicitado: ['aprovado', 'recusado', 'cancelado'],
  aprovado: ['pago'],
  recusado: [],
  pago: [],
  cancelado: [],
};

/** A transição de→para existe na matriz? (RN-353) @pure */
export function podeTransicionarRepasse(
  de: EstadoRepasse,
  para: EstadoRepasse
): boolean {
  return (TRANSICOES_REPASSE[de] as readonly string[]).includes(para);
}

/** Comandos da máquina — 1:1 com as callables do L2-T3/T4. */
export type EventoRepasseMaquina = 'aprovar' | 'recusar' | 'pagar' | 'cancelar';

export const EVENTOS_REPASSE_MAQUINA: readonly EventoRepasseMaquina[] = [
  'aprovar',
  'recusar',
  'pagar',
  'cancelar',
];

/** Estado-destino de cada comando. */
const DESTINO_DO_EVENTO: Readonly<Record<EventoRepasseMaquina, EstadoRepasse>> = {
  aprovar: 'aprovado',
  recusar: 'recusado',
  pagar: 'pago',
  cancelar: 'cancelado',
};

/**
 * Quem pode executar cada comando (decisão #11 + RN-353):
 * aprovar/recusar/pagar = platform_admin; cancelar = SÓ o tenant_owner
 * (e a matriz já restringe a enquanto `solicitado`).
 */
export const ATOR_DO_EVENTO_REPASSE: Readonly<
  Record<EventoRepasseMaquina, AtorRepasse>
> = {
  aprovar: 'platform_admin',
  recusar: 'platform_admin',
  pagar: 'platform_admin',
  cancelar: 'tenant_owner',
};

export type ResultadoTransicaoRepasse =
  | { ok: true; para: EstadoRepasse }
  | { ok: false; motivo: string };

/**
 * Executa um comando da máquina (RN-353). Rejeita — sem lançar — quando:
 *   - o ATOR não é o dono do comando (owner aprovando/pagando; admin
 *     cancelando — cancelamento é direito exclusivo do owner, decisão #11);
 *   - a transição não existe na matriz (ex.: solicitado→pago pula aprovação;
 *     qualquer saída de estado terminal).
 * A Function que chamar DEVE fazer append em `transicoes[]` com de→para,
 * quando e quem (auditoria) e recomputar o saldo (recusa/cancelamento
 * devolvem o valor ao disponível — via `comprometeSaldo`).
 * @pure
 */
export function transitionRepasse(
  estado: EstadoRepasse,
  evento: EventoRepasseMaquina,
  ator: AtorRepasse
): ResultadoTransicaoRepasse {
  const atorEsperado = ATOR_DO_EVENTO_REPASSE[evento];
  if (ator !== atorEsperado) {
    return {
      ok: false,
      motivo: `'${evento}' é exclusivo de ${atorEsperado} (RN-353/decisão #11).`,
    };
  }
  const para = DESTINO_DO_EVENTO[evento];
  if (!podeTransicionarRepasse(estado, para)) {
    return {
      ok: false,
      motivo: `transição inválida: ${estado} → ${para} (RN-353).`,
    };
  }
  return { ok: true, para };
}

// ---------------------------------------------------------------------------
// RN-355 — comprovante numerado (formatação pura; contador vive no L2-T4)
// ---------------------------------------------------------------------------

/**
 * Formata o número do comprovante (RN-355): `REP-{ano}-{seq}` com seq em
 * 4 dígitos (0007) e SEM truncar acima de 9999 (10000 → REP-2026-10000).
 * PURO e determinístico — a sequência GAPLESS por tenant vem do contador
 * TRANSACIONAL da Function `markRepassePago` (L2-T4); `tenantId` entra só
 * para validar o escopo (dois tenants podem ter o mesmo seq — os docs são
 * tenant-scoped, não colidem).
 * @pure
 */
export function formatarNumeroComprovante(
  tenantId: string,
  seq: number,
  ano: number
): string {
  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
    throw new RangeError('tenantId é obrigatório para escopo do comprovante.');
  }
  if (!Number.isInteger(seq) || seq < 1) {
    throw new RangeError('seq deve ser inteiro ≥ 1 (sequência gapless — RN-355).');
  }
  if (!Number.isInteger(ano) || ano < 2000 || ano > 9999) {
    throw new RangeError('ano deve ser inteiro de 4 dígitos (≥ 2000).');
  }
  return `${COMPROVANTE_PREFIXO}-${ano}-${String(seq).padStart(4, '0')}`;
}

// ---------------------------------------------------------------------------
// RN-348 — janela D+N em DIAS ÚTEIS (derivação pura; fonte por transação
// é pendência do L2-T1 — até lá a Function grava dentroJanelaDN: 0)
// ---------------------------------------------------------------------------

const DIA_MS = 24 * 60 * 60 * 1000;

/** Meia-noite UTC do DIA CIVIL do instante no fuso do produto. */
function diaCivilUTC(instante: Date, fuso: string): Date {
  if (!Number.isFinite(instante.getTime())) {
    throw new RangeError('instante inválido (Date).');
  }
  return new Date(`${dataLocalISO(instante, fuso)}T00:00:00Z`);
}

/**
 * O instante cai num dia ÚTIL (seg–sex) no fuso do produto?
 * V1: feriados NÃO considerados (documentado no modelo — Brasil-only,
 * mesmo recorte pragmático do FUSO_EVENTO).
 * @pure
 */
export function isDiaUtil(instante: Date, fuso: string = FUSO_EVENTO): boolean {
  const dow = diaCivilUTC(instante, fuso).getUTCDay();
  return dow >= 1 && dow <= 5;
}

/**
 * Dias ÚTEIS decorridos DEPOIS do dia civil de `confirmadaEm` até o dia
 * civil de `agora` (inclusive). Ex.: confirmada sex, agora seg ⇒ 1;
 * confirmada seg, agora qua ⇒ 2. `agora` no mesmo dia (ou antes) ⇒ 0.
 * @pure
 */
export function diasUteisDecorridos(
  confirmadaEm: Date,
  agora: Date,
  fuso: string = FUSO_EVENTO
): number {
  const inicio = diaCivilUTC(confirmadaEm, fuso).getTime();
  const fim = diaCivilUTC(agora, fuso).getTime();
  let uteis = 0;
  for (let t = inicio + DIA_MS; t <= fim; t += DIA_MS) {
    const dow = new Date(t).getUTCDay();
    if (dow >= 1 && dow <= 5) uteis += 1;
  }
  return uteis;
}

/**
 * A transação ainda está DENTRO da janela D+N (RN-348)? Dentro ⇒ o valor
 * NÃO entra em `disponivel`. `diasUteis = 0` ⇒ libera imediato.
 * @pure
 */
export function transacaoDentroJanelaDN(
  confirmadaEm: Date,
  agora: Date,
  diasUteis: number = DISPONIBILIZACAO_DIAS_UTEIS_DEFAULT,
  fuso: string = FUSO_EVENTO
): boolean {
  if (!Number.isInteger(diasUteis) || diasUteis < 0) {
    throw new RangeError('diasUteis deve ser inteiro ≥ 0 (RN-348).');
  }
  return diasUteisDecorridos(confirmadaEm, agora, fuso) < diasUteis;
}

/**
 * Σ do valor líquido das transações AINDA dentro da janela D+N (RN-348) —
 * alimenta `saldo.dentroJanelaDN` quando a fonte por transação existir
 * (pendência L2-T1; NUNCA fabricar transações a partir do agregado).
 * @pure
 */
export function computeDentroJanelaDN(
  transacoes: readonly TransacaoJanelaInput[],
  agora: Date,
  diasUteis: number = DISPONIBILIZACAO_DIAS_UTEIS_DEFAULT,
  fuso: string = FUSO_EVENTO
): number {
  let soma = 0;
  for (const t of transacoes) {
    if (!Number.isFinite(t.valorLiquido) || t.valorLiquido < 0) {
      throw new RangeError('transação com valorLiquido inválido.');
    }
    if (transacaoDentroJanelaDN(t.confirmadaEm, agora, diasUteis, fuso)) {
      soma = roundMoney(soma + t.valorLiquido);
    }
  }
  return soma;
}
