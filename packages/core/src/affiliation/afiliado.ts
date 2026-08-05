// =============================================================================
// packages/core/src/affiliation/afiliado.ts
//
// Entidade Afiliado — recorte ANTECIPADO do E08 (LEELA-R9E · S-R9-11 ·
// RN-313..319). Subcoleção: `eventos/{eventoId}/afiliados/{afiliadoId}`.
//
// DECISÃO DE ENTIDADE (spec S-R9-11, justificada em DECISOES-ABERTAS): o
// afiliado-influenciador nasce como subcoleção PRÓPRIA do evento — o dono é o
// ORGANIZADOR (cria o afiliado para o próprio evento), diferente do union
// `parcerias` (dono clube — E05) e de `promotores` (dono promotor — H3). O
// kernel de ATRIBUIÇÃO é 100% reusado: `dentroDaJanelaAtribuicao` (E05) + a
// costura de atribuição-na-venda do checkout (`cupomParceria`, RN-364) —
// nenhum caminho paralelo de atribuição.
//
// UNICIDADE DO refCodigo POR CHAVE (mesmo truque do cupom E04): o docId do
// afiliado É o refCodigo normalizado (trim + UPPER). "refCodigo único por
// evento" vira colisão de docId — o banco garante, sem query de duplicidade.
//
// ∑ `conversoes` / `valorAtribuido` são de escrita EXCLUSIVA de Function
// (RN-314 — Rules negam cliente); trust anchors do PF (`responsavelUid`,
// `tokenAceiteHash`, …) idem (RN-316/318, padrão E18).
//
// SEM COMISSÃO nesta fase (RN-314): `valorAtribuido` é BRUTO informativo.
// Comissionamento/split = fase 2 (decisão aberta).
// =============================================================================

import { sorteioUniforme } from '../aleatorio';
import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Coleção e enums
// ---------------------------------------------------------------------------

/** Subcoleção do evento: `eventos/{eventoId}/afiliados/{afiliadoId}`. */
export const COLECAO_AFILIADOS = 'afiliados';

/** Subcoleção de conversões: `.../afiliados/{id}/conversoes/{pedidoId}`. */
export const SUBCOLECAO_CONVERSOES_AFILIADO = 'conversoes';

/** Tipos de influenciador (adendo 3 do Vitor — RN-315/316). */
export type TipoAfiliado = 'clube' | 'pessoa_fisica';

export const TIPOS_AFILIADO: readonly TipoAfiliado[] = [
  'clube',
  'pessoa_fisica',
];

export function isTipoAfiliado(v: unknown): v is TipoAfiliado {
  return (
    typeof v === 'string' && (TIPOS_AFILIADO as readonly string[]).includes(v)
  );
}

/**
 * Ciclo de vida: `convite_pendente` SÓ existe no PF convidado por e-mail
 * (RN-316 — aguardando aceite); clube nasce `ativo`. `inativo` desliga a
 * atribuição de NOVAS conversões (as registradas ficam — trilha).
 */
export type StatusAfiliado = 'convite_pendente' | 'ativo' | 'inativo';

export const STATUS_AFILIADO: readonly StatusAfiliado[] = [
  'convite_pendente',
  'ativo',
  'inativo',
];

export function isStatusAfiliado(v: unknown): v is StatusAfiliado {
  return (
    typeof v === 'string' && (STATUS_AFILIADO as readonly string[]).includes(v)
  );
}

// ---------------------------------------------------------------------------
// refCodigo (padrão masterLink E05 · unicidade por chave como o cupom E04)
// ---------------------------------------------------------------------------

/** refCodigo normalizado: 4..20 caracteres A-Z/0-9 (após trim + UPPER). */
export const REF_CODIGO_RE = /^[A-Z0-9]{4,20}$/;

/** Normaliza um refCodigo bruto para a forma canônica (trim + UPPER). @pure */
export function normalizarRefCodigo(bruto: string): string {
  return bruto.trim().toUpperCase();
}

/** O refCodigo (já normalizado) tem forma canônica válida? @pure */
export function isRefCodigoValido(codigo: unknown): codigo is string {
  return typeof codigo === 'string' && REF_CODIGO_RE.test(codigo);
}

/**
 * Alfabeto do refCodigo GERADO (sem ambíguos 0/O/1/I/L — mesma família do
 * código de convite RN-101): o link vai para story/bio de influenciador e é
 * digitado/ditado. Códigos INFORMADOS pelo organizador aceitam o RE cheio.
 */
export const ALFABETO_REF_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Comprimento do refCodigo gerado automaticamente. */
export const REF_CODIGO_TAMANHO = 8;

/**
 * Fonte default do sorteio: entropia do sistema (Web Crypto), uniforme sobre
 * os 31 símbolos — ver `aleatorio.ts` para o porquê de não ser `Math.random`.
 * O número de faces vem do alfabeto, nunca escrito à mão.
 */
const SORTEIO_PADRAO = sorteioUniforme(ALFABETO_REF_CODIGO.length);

/**
 * Gera um refCodigo válido (8 chars do alfabeto sem ambíguos).
 * @param random fonte em [0,1); default = entropia do sistema (Web Crypto,
 *   uniforme sobre o alfabeto). Injetável p/ teste determinístico — a injeção
 *   é o seam, e ela continua intacta.
 */
export function gerarRefCodigo(random: () => number = SORTEIO_PADRAO): string {
  let codigo = '';
  for (let i = 0; i < REF_CODIGO_TAMANHO; i++) {
    const r = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);
    codigo += ALFABETO_REF_CODIGO[Math.floor(r * ALFABETO_REF_CODIGO.length)];
  }
  return codigo;
}

// O link copiável do afiliado NÃO mora mais aqui. `montarLinkAfiliado` foi
// removido na S1215-T1 (RN-429): ele montava `{base}/{slug}?ref=` sem cupom e
// sem validar a base, então `montarLinkAfiliado('beh.ro', …)` devolvia uma
// string com domínio de terceiro em vez de recusar. Dois geradores é o jeito de
// "gerador único" morrer no primeiro caminho novo que escolher o errado.
// O gerador é `montarLinkPromocional` em `./linkPromocional`.

// ---------------------------------------------------------------------------
// Janela de atribuição (reusa dentroDaJanelaAtribuicao do E05 no consumo)
// ---------------------------------------------------------------------------

/** Default da janela de atribuição do afiliado (dias) — espelha E05. */
export const JANELA_ATRIBUICAO_AFILIADO_DEFAULT_DIAS = 7;

/** Teto são da janela (anti configuração absurda). */
export const JANELA_ATRIBUICAO_AFILIADO_MAX_DIAS = 90;

/** Janela válida? inteiro 1..90. @pure */
export function isJanelaAtribuicaoValida(v: unknown): v is number {
  return (
    typeof v === 'number' &&
    Number.isInteger(v) &&
    v >= 1 &&
    v <= JANELA_ATRIBUICAO_AFILIADO_MAX_DIAS
  );
}

// ---------------------------------------------------------------------------
// Comissão do afiliado (E08 FASE 2 · COMF2 · DECISOES-ABERTAS item 23)
// ---------------------------------------------------------------------------
//
// DINHEIRO — disciplina cent-exata: todo cálculo interno roda em CENTAVOS
// INTEIROS (nunca float×float solto) e devolve R$ com 2 casas, coerente com
// os agregados vigentes (`receitaConfirmada`, `valorAtribuido`). O acúmulo
// nos ∑ segue read-modify-write + roundMoney na MESMA transação da
// confirmação/estorno (kernel R9-E), NUNCA increment de float.
//
// CONGELAMENTO (anti "forja de percentual pós-venda"): a config de comissão
// vigente no instante da CONFIRMAÇÃO é congelada no doc da conversão
// (`comissaoConfig` + `comissao`). Mudar a config depois só afeta conversões
// FUTURAS; o estorno decrementa pela config congelada — nunca pela vigente.

/** Base da comissão: % sobre o valor FACE ou R$ fixo por INSCRIÇÃO. */
export type TipoComissaoAfiliado = 'percentual' | 'valor_fixo';

export const TIPOS_COMISSAO_AFILIADO: readonly TipoComissaoAfiliado[] = [
  'percentual',
  'valor_fixo',
];

/**
 * Config de comissão do afiliado (RN-310: o ORGANIZADOR define; o afiliado
 * só aceita/recusa). `null` no doc = SEM comissão (recorte R9-E intacto).
 *
 *  - `percentual`: % sobre o valor FACE da conversão — 0,01..100, passo de
 *    0,01 (basis points): garante comissão computável cent-exata.
 *  - `valor_fixo`: R$ POR INSCRIÇÃO confirmada (base coerente com
 *    `conversoes`, que conta inscrições — premissa 1 do R9-E), cent-exato.
 */
export interface ComissaoAfiliado {
  tipo: TipoComissaoAfiliado;
  /** Só tipo 'percentual': 0,01..100 com no máx. 2 casas. */
  percentual?: number;
  /** Só tipo 'valor_fixo': R$ > 0 por inscrição, 2 casas, ≤ teto são. */
  valorPorInscricao?: number;
}

/** Teto são do valor fixo por inscrição (anti configuração absurda). */
export const COMISSAO_VALOR_POR_INSCRICAO_MAX = 100_000;

/** v tem centavos exatos (múltiplo de 0,01 dentro do ruído de float)? @pure */
export function isMoneyCentExato(v: unknown): v is number {
  return (
    typeof v === 'number' &&
    Number.isFinite(v) &&
    Math.abs(v * 100 - Math.round(v * 100)) < 0.001
  );
}

/** Valida a config de comissão (shape discriminado estrito). @pure */
export function isComissaoAfiliadoValida(v: unknown): v is ComissaoAfiliado {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const c = v as Record<string, unknown>;
  if (c['tipo'] === 'percentual') {
    const pct = c['percentual'];
    return (
      c['valorPorInscricao'] === undefined &&
      typeof pct === 'number' &&
      Number.isFinite(pct) &&
      pct > 0 &&
      pct <= 100 &&
      // passo de 0,01% (basis point) — mantém o produto cent-exato
      Math.abs(pct * 100 - Math.round(pct * 100)) < 0.001
    );
  }
  if (c['tipo'] === 'valor_fixo') {
    const val = c['valorPorInscricao'];
    return (
      c['percentual'] === undefined &&
      isMoneyCentExato(val) &&
      (val as number) > 0 &&
      (val as number) <= COMISSAO_VALOR_POR_INSCRICAO_MAX
    );
  }
  return false;
}

/**
 * Comissão de uma conversão (R$, 2 casas) — CENT-EXATA por construção:
 * centavos inteiros × basis points inteiros, arredondamento half-up no
 * centavo. `null` = sem comissão (0). Nunca negativa (inputs clampados a 0).
 * @pure
 */
export function computeComissaoConversao(
  comissao: ComissaoAfiliado | null,
  valorFace: number,
  qtdInscricoes: number
): number {
  if (comissao === null) return 0;
  const qtd = Number.isInteger(qtdInscricoes) && qtdInscricoes > 0 ? qtdInscricoes : 0;
  if (comissao.tipo === 'percentual') {
    // F-1 da review antagonista COMF2 (defesa em profundidade): valorFace
    // não-finito (NaN/Infinity de um doc corrompido) vira 0 — NaN aqui
    // poluiria o ∑ comissaoAcumulada via roundMoney(atual + NaN).
    const centavos = Math.max(
      0,
      Math.round(Number.isFinite(valorFace) ? valorFace * 100 : 0)
    );
    const bp = Math.round((comissao.percentual ?? 0) * 100);
    return Math.round((centavos * bp) / 10_000) / 100;
  }
  const centavosPorInscricao = Math.max(
    0,
    Math.round((comissao.valorPorInscricao ?? 0) * 100)
  );
  return (centavosPorInscricao * qtd) / 100;
}

/**
 * Saldo de comissão do afiliado = acumulada − repassada (R$, 2 casas).
 * PODE ser negativo: estorno DEPOIS de um repasse manual já registrado
 * deixa o afiliado devedor — o saldo mostra a verdade, não esconde. @pure
 */
export function saldoComissaoAfiliado(
  comissaoAcumulada: number,
  comissaoRepassada: number
): number {
  const acumulada = Number.isFinite(comissaoAcumulada) ? comissaoAcumulada : 0;
  const repassada = Number.isFinite(comissaoRepassada) ? comissaoRepassada : 0;
  return Math.round((acumulada - repassada + Number.EPSILON) * 100) / 100;
}

/** Subcoleção de repasses manuais: `.../afiliados/{id}/repasses/{repasseId}`. */
export const SUBCOLECAO_REPASSES_AFILIADO = 'repasses';

/**
 * repasseId (idempotência do registro manual): 8..64 chars URL-safe, gerado
 * pelo CLIENTE (uuid) — replay do mesmo registro colide na chave.
 */
export const REPASSE_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** Teto da observação do repasse manual (higiene de doc). */
export const REPASSE_OBSERVACAO_MAX = 200;

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/** Teto do nome/canal (higiene de doc). */
export const AFILIADO_NOME_MAX = 80;
export const AFILIADO_CANAL_MAX = 60;

/**
 * Afiliado/influenciador do evento (organizador dono — recorte E08).
 * docId == refCodigo normalizado (unicidade por chave).
 */
export interface Afiliado {
  /** docId == refCodigo (unicidade por chave). */
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009). */
  tenantId: string;
  eventoId: string;
  tipo: TipoAfiliado;
  status: StatusAfiliado;
  nome: string;
  /** refCodigo normalizado (== id) — único por evento. */
  refCodigo: string;
  /** Canal de divulgação (instagram/tiktok/…) — livre, opcional. */
  canal?: string;
  /** Janela de atribuição em dias (RN-313 — `dentroDaJanelaAtribuicao`). */
  janelaAtribuicaoDias: number;
  /**
   * RN-315 (clube como influenciador): mínimo de inscrições atribuídas para
   * o DESCONTO do cupom vinculado ativar. null = sem gate (desconto ativo
   * desde a 1ª venda). Antes do mínimo o link RASTREIA conversão, mas o
   * cupom não aplica — SEM retroativo (default ratificado).
   */
  minimoInscricoes: number | null;
  /**
   * Cupom do evento vinculado ao afiliado (desconto do link — RN-315/316).
   * A amarração inversa (`cupom.afiliadoRef`) é escrita SÓ por Function.
   */
  cupomCodigo: string | null;
  /** Clube vinculado (tipo 'clube') — docId de `clubes/{id}`. */
  clubeRef?: string;
  /**
   * Trust anchors do PF (RN-316/318 — padrão E18): escritos SÓ por Function.
   * `responsavelEmail` = chave do convite; `responsavelUid` = conta Auth
   * vinculada no aceite; documento NUNCA em claro (só mascarado).
   */
  responsavelEmail?: string;
  responsavelUid?: string;
  documentoMascarado?: string;
  /** ∑ Conversões atribuídas — escrita EXCLUSIVA de Function (RN-314). */
  conversoes: number;
  /** ∑ Valor bruto atribuído (R$) — informativo, SEM comissão (RN-314). */
  valorAtribuido: number;
  /**
   * Config de comissão (FASE 2 — organizador define, RN-310). null = sem
   * comissão. Mudança só afeta conversões FUTURAS (config congelada por
   * conversão no doc do ledger).
   */
  comissao: ComissaoAfiliado | null;
  /** ∑ Comissão acumulada de conversões CONFIRMADAS (R$) — Function-only. */
  comissaoAcumulada: number;
  /** ∑ Comissão já repassada manualmente (R$) — Function-only. */
  comissaoRepassada: number;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/**
 * Campos de escrita EXCLUSIVA de Function — ∑ (RN-314) + trust anchors do
 * convite PF (RN-316/318). As Rules negam TODA escrita de cliente na
 * subcoleção (a lista documenta a razão e alimenta testes de canário).
 */
export const CAMPOS_FUNCTION_AFILIADO = [
  'conversoes',
  'valorAtribuido',
  'comissaoAcumulada',
  'comissaoRepassada',
  'responsavelUid',
  'responsavelEmail',
  'documentoMascarado',
  'tokenAceiteHash',
  'expiraEm',
  'aceitoEm',
] as const;

// ---------------------------------------------------------------------------
// Gate de desconto (RN-315) — derivação pura
// ---------------------------------------------------------------------------

/**
 * O desconto do cupom vinculado está ATIVO para este afiliado? (RN-315)
 * Sem mínimo configurado = ativo. Com mínimo: ativa SÓ ao cruzar
 * `conversoes >= minimoInscricoes` — sem retroativo (a venda que cruza o
 * mínimo NÃO ganha o desconto; as seguintes sim). @pure
 */
export function descontoAfiliadoAtivo(
  afiliado: Pick<Afiliado, 'status' | 'minimoInscricoes' | 'conversoes'>
): boolean {
  if (afiliado.status !== 'ativo') return false;
  if (afiliado.minimoInscricoes === null) return true;
  return afiliado.conversoes >= afiliado.minimoInscricoes;
}

// ---------------------------------------------------------------------------
// Validação pura do input de salvamento (fronteira do servidor)
// ---------------------------------------------------------------------------

/** Input do `salvarAfiliado` (callable — organizador). */
export interface SalvarAfiliadoInput {
  eventoId: string;
  /** Ausente no create = refCodigo gerado; presente = usa o informado. */
  refCodigo?: string;
  tipo: TipoAfiliado;
  nome: string;
  canal?: string;
  janelaAtribuicaoDias?: number;
  minimoInscricoes?: number | null;
  cupomCodigo?: string | null;
  /** Tipo 'clube': docId do clube vinculado. */
  clubeRef?: string;
  /** Tipo 'pessoa_fisica': e-mail do convite (RN-316). */
  responsavelEmail?: string;
  /** Tipo 'pessoa_fisica': CPF opcional — validado e persistido SÓ mascarado. */
  documento?: string;
  /** Update: inativar/reativar (clube) — nunca cria estado de convite. */
  status?: 'ativo' | 'inativo';
  /**
   * FASE 2: config de comissão. `null` explícito remove (sem comissão);
   * ausente no update preserva a vigente. Só afeta conversões FUTURAS.
   */
  comissao?: ComissaoAfiliado | null;
}

/**
 * Valida o shape do input de salvarAfiliado. Retorna lista de erros (vazia =
 * válido). PII nunca ecoada nas mensagens. @pure
 */
export function validarSalvarAfiliadoInput(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];

  if (typeof input['eventoId'] !== 'string' || input['eventoId'].length === 0) {
    erros.push('"eventoId" é obrigatório.');
  }
  if (!isTipoAfiliado(input['tipo'])) {
    erros.push('"tipo" deve ser clube ou pessoa_fisica.');
  }
  const nome = input['nome'];
  if (
    typeof nome !== 'string' ||
    nome.trim().length === 0 ||
    nome.trim().length > AFILIADO_NOME_MAX
  ) {
    erros.push(`"nome" é obrigatório (1..${AFILIADO_NOME_MAX} caracteres).`);
  }
  const refCodigo = input['refCodigo'];
  if (
    refCodigo !== undefined &&
    !isRefCodigoValido(
      typeof refCodigo === 'string' ? normalizarRefCodigo(refCodigo) : refCodigo
    )
  ) {
    erros.push('"refCodigo" fora do padrão A-Z0-9 (4–20).');
  }
  const canal = input['canal'];
  if (
    canal !== undefined &&
    (typeof canal !== 'string' || canal.trim().length > AFILIADO_CANAL_MAX)
  ) {
    erros.push(`"canal" deve ser texto de até ${AFILIADO_CANAL_MAX} caracteres.`);
  }
  const janela = input['janelaAtribuicaoDias'];
  if (janela !== undefined && !isJanelaAtribuicaoValida(janela)) {
    erros.push(
      `"janelaAtribuicaoDias" deve ser inteiro 1..${JANELA_ATRIBUICAO_AFILIADO_MAX_DIAS}.`
    );
  }
  const minimo = input['minimoInscricoes'];
  if (
    minimo !== undefined &&
    minimo !== null &&
    (!Number.isInteger(minimo) || (minimo as number) < 1)
  ) {
    erros.push('"minimoInscricoes" deve ser inteiro ≥ 1 ou null (RN-315).');
  }
  const cupom = input['cupomCodigo'];
  if (
    cupom !== undefined &&
    cupom !== null &&
    (typeof cupom !== 'string' || cupom.trim().length === 0)
  ) {
    erros.push('"cupomCodigo" deve ser string não vazia ou null.');
  }
  const status = input['status'];
  if (status !== undefined && status !== 'ativo' && status !== 'inativo') {
    erros.push('"status" só aceita ativo|inativo (convite é da Function).');
  }
  const comissao = input['comissao'];
  if (
    comissao !== undefined &&
    comissao !== null &&
    !isComissaoAfiliadoValida(comissao)
  ) {
    erros.push(
      '"comissao" inválida: percentual 0,01..100 (passo 0,01) OU ' +
        `valor_fixo com valorPorInscricao cent-exato > 0 e ≤ ${COMISSAO_VALOR_POR_INSCRICAO_MAX}.`
    );
  }
  if (input['tipo'] === 'clube') {
    const clubeRef = input['clubeRef'];
    if (
      clubeRef !== undefined &&
      (typeof clubeRef !== 'string' || clubeRef.length === 0)
    ) {
      erros.push('"clubeRef" deve ser docId de clube não vazio.');
    }
  }
  return erros;
}

// ---------------------------------------------------------------------------
// Parse fail-fast (borda de I/O do Firestore)
// ---------------------------------------------------------------------------

/** Parsing defensivo de um doc Firestore em `Afiliado` (fail-fast). @pure */
export function parseAfiliado(
  id: string,
  data: Record<string, unknown>
): Afiliado {
  const tenantId = data['tenantId'];
  const eventoId = data['eventoId'];
  const tipo = data['tipo'];
  const status = data['status'];
  const nome = data['nome'];
  const refCodigo = data['refCodigo'];
  const janela = data['janelaAtribuicaoDias'];
  const minimo = data['minimoInscricoes'];
  const cupomCodigo = data['cupomCodigo'];
  const conversoes = data['conversoes'];
  const valorAtribuido = data['valorAtribuido'];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`Afiliado ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new Error(`Afiliado ${id}: campo "eventoId" inválido`);
  }
  if (!isTipoAfiliado(tipo)) {
    throw new Error(`Afiliado ${id}: tipo "${String(tipo)}" fora do enum`);
  }
  if (!isStatusAfiliado(status)) {
    throw new Error(`Afiliado ${id}: status "${String(status)}" fora do enum`);
  }
  if (typeof nome !== 'string' || nome.length === 0) {
    throw new Error(`Afiliado ${id}: "nome" inválido`);
  }
  if (!isRefCodigoValido(refCodigo)) {
    throw new Error(`Afiliado ${id}: "refCodigo" fora do padrão A-Z0-9 4..20`);
  }
  // Unicidade por chave: o refCodigo É o docId — divergência quebra o invariante.
  if (refCodigo !== id) {
    throw new Error(
      `Afiliado ${id}: "refCodigo" (${refCodigo}) deve ser igual ao docId`
    );
  }
  if (!isJanelaAtribuicaoValida(janela)) {
    throw new Error(
      `Afiliado ${id}: "janelaAtribuicaoDias" deve ser inteiro 1..${JANELA_ATRIBUICAO_AFILIADO_MAX_DIAS}`
    );
  }
  if (
    minimo !== null &&
    minimo !== undefined &&
    (!Number.isInteger(minimo) || (minimo as number) < 1)
  ) {
    throw new Error(`Afiliado ${id}: "minimoInscricoes" deve ser int ≥ 1 ou null`);
  }
  if (
    cupomCodigo !== null &&
    cupomCodigo !== undefined &&
    (typeof cupomCodigo !== 'string' || cupomCodigo.length === 0)
  ) {
    throw new Error(`Afiliado ${id}: "cupomCodigo" deve ser string ou null`);
  }
  if (
    conversoes !== undefined &&
    (!Number.isInteger(conversoes) || (conversoes as number) < 0)
  ) {
    throw new Error(`Afiliado ${id}: "conversoes" deve ser inteiro ≥ 0 (∑ Function)`);
  }
  if (
    valorAtribuido !== undefined &&
    (typeof valorAtribuido !== 'number' ||
      !Number.isFinite(valorAtribuido) ||
      (valorAtribuido as number) < 0)
  ) {
    throw new Error(`Afiliado ${id}: "valorAtribuido" deve ser número ≥ 0 (∑ Function)`);
  }
  const comissaoRaw = data['comissao'];
  if (
    comissaoRaw !== undefined &&
    comissaoRaw !== null &&
    !isComissaoAfiliadoValida(comissaoRaw)
  ) {
    throw new Error(`Afiliado ${id}: "comissao" fora do shape (FASE 2)`);
  }
  const comissaoAcumulada = data['comissaoAcumulada'];
  const comissaoRepassada = data['comissaoRepassada'];
  for (const [campo, valor] of [
    ['comissaoAcumulada', comissaoAcumulada],
    ['comissaoRepassada', comissaoRepassada],
  ] as const) {
    if (
      valor !== undefined &&
      (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0)
    ) {
      throw new Error(`Afiliado ${id}: "${campo}" deve ser número ≥ 0 (∑ Function)`);
    }
  }
  // PF convidado exige e-mail do convite (chave do aceite — RN-316).
  const responsavelEmail = data['responsavelEmail'];
  if (
    tipo === 'pessoa_fisica' &&
    status === 'convite_pendente' &&
    (typeof responsavelEmail !== 'string' || responsavelEmail.length === 0)
  ) {
    throw new Error(
      `Afiliado ${id}: PF convite_pendente exige "responsavelEmail" (RN-316)`
    );
  }

  const afiliado: Afiliado = {
    id,
    tenantId,
    eventoId,
    tipo,
    status,
    nome,
    refCodigo,
    janelaAtribuicaoDias: janela,
    minimoInscricoes: typeof minimo === 'number' ? minimo : null,
    cupomCodigo: typeof cupomCodigo === 'string' ? cupomCodigo : null,
    conversoes: typeof conversoes === 'number' ? conversoes : 0,
    valorAtribuido: typeof valorAtribuido === 'number' ? valorAtribuido : 0,
    // Docs R9-E (pré-fase 2) não têm os campos — default = sem comissão.
    comissao: isComissaoAfiliadoValida(comissaoRaw) ? comissaoRaw : null,
    comissaoAcumulada:
      typeof comissaoAcumulada === 'number' ? comissaoAcumulada : 0,
    comissaoRepassada:
      typeof comissaoRepassada === 'number' ? comissaoRepassada : 0,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };
  const canal = data['canal'];
  if (typeof canal === 'string' && canal.length > 0) afiliado.canal = canal;
  const clubeRef = data['clubeRef'];
  if (typeof clubeRef === 'string' && clubeRef.length > 0) {
    afiliado.clubeRef = clubeRef;
  }
  if (typeof responsavelEmail === 'string' && responsavelEmail.length > 0) {
    afiliado.responsavelEmail = responsavelEmail;
  }
  const responsavelUid = data['responsavelUid'];
  if (typeof responsavelUid === 'string' && responsavelUid.length > 0) {
    afiliado.responsavelUid = responsavelUid;
  }
  const documentoMascarado = data['documentoMascarado'];
  if (typeof documentoMascarado === 'string' && documentoMascarado.length > 0) {
    afiliado.documentoMascarado = documentoMascarado;
  }
  return afiliado;
}
