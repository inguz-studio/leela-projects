// =============================================================================
// packages/core/src/eventos/lote.ts
//
// Entidade Lote — domínio puro (LEELA-S300-T1 · E04).
// Subcoleção: `eventos/{eventoId}/lotes/{loteId}` — tenant-scoped (ADR-009).
//
// ADR-012 (travado 2026-07-11): o LOTE PERTENCE À MODALIDADE. Cada
// modalidade/percurso do evento tem uma lista ORDENADA de lotes; cada lote
// carrega janela própria (`inicioEm`/`fimEm`), vaga própria
// (`quantidadeLimite`), `preco` e `ordem`. A virada (RN-300) opera na
// granularidade (modalidade, lote): `agora ≥ fimEm` OU `vendidos ≥
// quantidadeLimite`, o que ocorrer primeiro. Preço vigente (RN-301) = lote
// ativo daquela modalidade.
//
// FRONTEIRA FIRESTORE (decisão Kleppmann — registrada no S300-T1-REPORT):
// o lote é DOCUMENTO próprio numa subcoleção flat `eventos/{id}/lotes`, com
// `modalidade` como discriminador (mesmo idioma de `evento.modalidades[]` e
// `inscrito.modalidade`) — NÃO embutido no doc grande do evento nem numa
// subcoleção aninhada `modalidades/{id}/lotes`. Razão: `vendidos` é contador
// de ESCRITA DE ALTA FREQUÊNCIA (Function de virada, S300-T2, um increment
// por venda). Doc próprio → o increment é single-object linearizable
// (FieldValue.increment) e contende só com vendas do MESMO lote; embutir num
// array do evento acoplaria toda venda à reescrita do doc gordo (leitura
// amplificada no checkout + risco de lost-update sem transação no array). A
// relação ADR-012 "modalidade 1—N lotes" é a query
// `where modalidade == X orderBy ordem` — a lista ordenada é derivada, não
// materializada. "Data outlives code": o contador quente mora sozinho.
//
// `vendidos` = ∑ contador de ESCRITA EXCLUSIVA de Cloud Function (S300-T2) —
// o cliente NUNCA o escreve (Security Rules negam; espelha CAMPOS_FUNCTION_*).
// O "lote ativo" da modalidade é DERIVADO (loteAtivo), não persistido: estado
// que se computa não se denormaliza.
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Motivo do encerramento de um lote (RN-300 — "data OU quantidade, o que
 * ocorrer primeiro"). Carimbo materializado pela Function de virada (S300-T2).
 */
export type MotivoEncerramentoLote = 'data' | 'quantidade';

/** Lista canônica de motivos — única fonte para validação/UI. */
export const MOTIVOS_ENCERRAMENTO_LOTE: readonly MotivoEncerramentoLote[] = [
  'data',
  'quantidade',
];

/**
 * Lote de venda — pertence a uma modalidade (ADR-012).
 * Subcoleção: `eventos/{eventoId}/lotes/{loteId}`.
 */
export interface Lote {
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /**
   * Modalidade/percurso dona do lote (ADR-012). Discriminador do join —
   * mesmo idioma de `evento.modalidades[]` e `inscrito.modalidade`
   * (ex.: '5k', '10k', '21k'). A lista ordenada de lotes da modalidade é a
   * query `where modalidade == X orderBy ordem`.
   */
  modalidade: string;
  /** Posição na sequência da modalidade (int ≥ 1, única por modalidade). */
  ordem: number;
  /** Nome exibido ("Lote 1", "Lote Promocional"). */
  nome: string;
  /** Início da janela de venda do lote. */
  inicioEm: Timestamp;
  /** Fim da janela de venda do lote (fimEm > inicioEm). */
  fimEm: Timestamp;
  /** Vaga própria do lote — int ≥ 1 (base da virada por quantidade, RN-300). */
  quantidadeLimite: number;
  /** Preço da inscrição neste lote em R$ — ≥ 0 (lote é degrau de preço, não desconto). */
  preco: number;
  /**
   * ∑ Vendas registradas no lote — escrita EXCLUSIVA de Cloud Function
   * (S300-T2). Base da virada por quantidade (RN-300). Cliente nunca escreve.
   */
  vendidos: number;
  /**
   * ∑ Vagas RESERVADAS por pedidos `'pendente'` (RN-543 · S323-T1) —
   * escrita EXCLUSIVA de Cloud Function, mesmo regime do `vendidos`.
   *
   * A decisão do dono (ESTOURO-1): *"se um pedido está com pagamento
   * pendente, a vaga não está disponível para compra."* A vaga sai do
   * estoque quando a COBRANÇA NASCE, não quando ela paga — e volta quando o
   * pendente morre.
   *
   * DUAS DIFERENÇAS DELIBERADAS EM RELAÇÃO A `vendidos`, e as duas
   * importam:
   *
   *   1. NÃO É RATCHET. `vendidos` só sobe (`max(atual, tally)` no
   *      `virarLote`); `reservas` sobe E desce, porque reserva expira.
   *      Monotônico aqui seria o defeito: a primeira reserva vencida
   *      travaria a vaga para sempre.
   *   2. NÃO DISPARA VIRADA NEM CARIMBO. `loteEsgotado`,
   *      `motivoEncerramento` e o ratchet do `virarLote` continuam lendo SÓ
   *      `vendidos` (RN-300 intocada). Um lote com as últimas vagas
   *      reservadas fica INDISPONÍVEL para compra sem estar ENCERRADO — se
   *      as reservas morrerem, as vagas voltam sem reabrir nada, porque
   *      nada foi carimbado. É o que elimina o risco de regressão de preço
   *      que a decisão #1 do `virarLote` já recusou para o estorno.
   *
   * Ausente = 0 (leitura Postel — docs anteriores à RN-543 não têm o campo).
   */
  reservas: number;
  /**
   * CARIMBO de virada (S300-T2 · ADR-012): quando a Function OBSERVOU o
   * encerramento do lote (auditoria/UI). Ausente = nunca encerrado. O estado
   * ativo/encerrado que o checkout consome segue DERIVADO
   * (`loteEncerrado`/`loteAtivo`) — o carimbo é trilha, não fonte de verdade.
   * MONOTÔNICO: uma vez carimbado, a Function nunca apaga nem reescreve.
   */
  encerradoEm?: Timestamp;
  /** Por que encerrou (RN-300): 'quantidade' (esgotou) ou 'data' (fimEm). */
  encerradoMotivo?: MotivoEncerramentoLote;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/**
 * Campos do lote com escrita EXCLUSIVA de Cloud Function — o contador de
 * venda (`vendidos`) e os carimbos de virada (`encerradoEm`/`encerradoMotivo`)
 * são mantidos pela Function de virada (S300-T2). As Security Rules espelham
 * esta lista: create exige 0/ausente, update não pode tocá-los.
 */
export const CAMPOS_FUNCTION_LOTE = [
  'vendidos',
  'reservas',
  'encerradoEm',
  'encerradoMotivo',
] as const;

/**
 * Motivo TIPADO da recusa quando o lote realmente VENDEU tudo (RN-543).
 * Viaja no `details` do `failed-precondition` de `createInscricaoCharge`.
 *
 * Mora no core pela mesma razão de `MOTIVO_PIX_PENDENTE_ATIVO`: é contrato
 * entre servidor e tela. Esperar não resolve — o lote acabou.
 */
export const MOTIVO_LOTE_ESGOTADO = 'lote_esgotado';

/**
 * Motivo TIPADO da recusa quando as últimas vagas estão RESERVADAS por
 * pagamentos pendentes de outras pessoas (RN-543 · RN-544).
 *
 * A diferença para `MOTIVO_LOTE_ESGOTADO` é a instrução ao comprador, e por
 * isso os dois não podem compartilhar o literal: esgotado é definitivo;
 * aqui as vagas podem voltar em minutos, porque um pendente que não paga
 * morre pela varredura da RN-545 e devolve a vaga. Dizer "esgotado" nos dois
 * casos seria mandar embora quem só precisava esperar cinco minutos.
 */
export const MOTIVO_VAGAS_EM_PAGAMENTO = 'vagas_em_pagamento';

/** Mensagem canônica da recusa por lote vendido — a tela pode sobrepor. */
export const MSG_LOTE_ESGOTADO =
  'As vagas deste lote acabaram.';

/**
 * Mensagem canônica da recusa por vaga reservada. Diz as três coisas que o
 * comprador precisa: não é dele a culpa, não é definitivo, e há prazo.
 */
export const MSG_VAGAS_EM_PAGAMENTO =
  'As últimas vagas deste lote estão em pagamento por outras pessoas. ' +
  'Se elas não forem pagas, as vagas voltam em alguns minutos.';

// ---------------------------------------------------------------------------
// Validações puras (shape de um lote isolado)
// ---------------------------------------------------------------------------

/** Millis de um Timestamp estrutural (firebase/admin ou mock de teste). @pure */
function millis(ts: Timestamp): number {
  return ts.toMillis();
}

/**
 * O shape de um lote é válido? (fimEm > inicioEm; quantidadeLimite int ≥ 1;
 * preco número ≥ 0; ordem int ≥ 1; nome/modalidade não-vazios). @pure
 */
export function loteShapeValido(
  lote: Pick<
    Lote,
    'modalidade' | 'ordem' | 'nome' | 'inicioEm' | 'fimEm' | 'quantidadeLimite' | 'preco'
  >
): boolean {
  return (
    typeof lote.modalidade === 'string' &&
    lote.modalidade.length > 0 &&
    typeof lote.nome === 'string' &&
    lote.nome.length > 0 &&
    Number.isInteger(lote.ordem) &&
    lote.ordem >= 1 &&
    Number.isInteger(lote.quantidadeLimite) &&
    lote.quantidadeLimite >= 1 &&
    typeof lote.preco === 'number' &&
    Number.isFinite(lote.preco) &&
    lote.preco >= 0 &&
    millis(lote.fimEm) > millis(lote.inicioEm)
  );
}

// ---------------------------------------------------------------------------
// Validações de LISTA (invariantes cross-doc — a Rule não itera irmãos)
// ---------------------------------------------------------------------------

/**
 * Valida os invariantes de uma sequência de lotes de UM evento, agrupando por
 * modalidade (ADR-012): dentro de cada modalidade, `ordem` é única, as janelas
 * NÃO se sobrepõem e a ordem cronológica bate com `ordem`.
 *
 * DECISÃO (registrada): janelas de lotes de uma MESMA modalidade não se
 * sobrepõem — a virada RN-300 é um hand-off (Lote 1 termina → Lote 2 começa) e
 * "preço vigente" (RN-301) precisa do invariante "no máximo um lote ativo por
 * modalidade por instante". Lacunas ENTRE janelas são estruturalmente válidas,
 * mas NÃO pausam a venda: com o antecessor encerrado o próximo lote assume
 * (hand-off ADR-012 — ver `loteAtivo`). A virada por quantidade
 * (vendidos ≥ limite) só encerra ANTES do fim, nunca cria sobreposição.
 * Sobreposição tornaria o preço vigente ambíguo.
 *
 * Cross-doc por natureza (unicidade/sobreposição olham irmãos) → vive aqui, no
 * editor/Function/seed, não nas Rules (que não iteram coleções).
 *
 * @returns `null` quando válido; a 1ª mensagem de erro caso contrário. @pure
 */
export function validarLotesModalidade(
  lotes: readonly Pick<Lote, 'modalidade' | 'ordem' | 'inicioEm' | 'fimEm'>[]
): string | null {
  const porModalidade = new Map<
    string,
    Pick<Lote, 'modalidade' | 'ordem' | 'inicioEm' | 'fimEm'>[]
  >();
  for (const lote of lotes) {
    const grupo = porModalidade.get(lote.modalidade) ?? [];
    grupo.push(lote);
    porModalidade.set(lote.modalidade, grupo);
  }

  for (const [modalidade, grupo] of porModalidade) {
    const ordens = new Set<number>();
    for (const lote of grupo) {
      if (ordens.has(lote.ordem)) {
        return `Modalidade "${modalidade}": ordem ${lote.ordem} duplicada (ADR-012)`;
      }
      ordens.add(lote.ordem);
    }

    // Ordena por `ordem` e verifica hand-off cronológico + não-sobreposição.
    const porOrdem = [...grupo].sort((a, b) => a.ordem - b.ordem);
    for (let i = 1; i < porOrdem.length; i++) {
      const anterior = porOrdem[i - 1]!;
      const atual = porOrdem[i]!;
      // Sobreposição: anterior.inicio < atual.fim && atual.inicio < anterior.fim
      if (
        millis(anterior.inicioEm) < millis(atual.fimEm) &&
        millis(atual.inicioEm) < millis(anterior.fimEm)
      ) {
        return `Modalidade "${modalidade}": lotes ${anterior.ordem} e ${atual.ordem} têm janelas sobrepostas (RN-300)`;
      }
      // Cronologia coerente com a ordem: lote de ordem maior não começa antes
      // do fim do de ordem menor (a sequência avança no tempo).
      if (millis(atual.inicioEm) < millis(anterior.fimEm)) {
        return `Modalidade "${modalidade}": lote ${atual.ordem} começa antes do fim do lote ${anterior.ordem} (RN-300)`;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Derivações puras — virada RN-300 / preço vigente RN-301
// ---------------------------------------------------------------------------

/**
 * Lote esgotado por quantidade? (vendidos ≥ limite — metade da RN-300)
 *
 * ⛔ LÊ SÓ `vendidos`, e isso é a fronteira 1 da RN-543: reserva NÃO encerra
 * lote. Somar `reservas` aqui faria a virada e o carimbo (RN-300) dispararem
 * por vaga que ainda pode voltar — e o carimbo é monotônico, então a reserva
 * vencida deixaria um lote encerrado para sempre por uma venda que nunca
 * houve. Quem soma a reserva é o GATE DE COMPRA (`cabeNaCapacidade`), não a
 * virada. @pure
 */
export function loteEsgotado(lote: Pick<Lote, 'vendidos' | 'quantidadeLimite'>): boolean {
  return lote.vendidos >= lote.quantidadeLimite;
}

/**
 * Vagas que ainda podem ser COMPRADAS agora (RN-543): o limite menos o que
 * já foi vendido e o que está reservado por pagamento pendente. Nunca
 * negativa — excedente já existente (RN-498) aparece como 0 disponível, não
 * como número negativo na tela. @pure
 */
export function vagasDisponiveis(
  lote: Pick<Lote, 'vendidos' | 'reservas' | 'quantidadeLimite'>
): number {
  return Math.max(0, lote.quantidadeLimite - lote.vendidos - lote.reservas);
}

/**
 * Cabem `linhas` vagas novas neste lote? (RN-543 — o gate de compra)
 *
 * `vendidos + reservas + linhas > quantidadeLimite` recusa. É a aritmética
 * que impede a segunda cobrança pela mesma última vaga, e ela roda DENTRO da
 * transação que cria a cobrança — nenhuma janela entre checar e gravar.
 * Multi-inscrito no mesmo lote conta cada linha. @pure
 */
export function cabeNaCapacidade(
  lote: Pick<Lote, 'vendidos' | 'reservas' | 'quantidadeLimite'>,
  linhas: number
): boolean {
  return lote.vendidos + lote.reservas + linhas <= lote.quantidadeLimite;
}

/**
 * A recusa é porque o lote VENDEU tudo, ou porque as últimas vagas estão em
 * pagamento por outra pessoa? (RN-543 · insumo do estado honesto da S323-T5)
 *
 * A conta é "sem as reservas, caberia?": se `vendidos + linhas` já estoura o
 * limite, o lote está esgotado de verdade e nenhuma reserva morrendo muda
 * isso. Se só estoura COM as reservas, as vagas podem voltar em minutos — e
 * a tela tem o direito de dizer isso em vez do "esgotado" seco.
 *
 * Só faz sentido quando `cabeNaCapacidade` já respondeu `false`. @pure
 */
export function recusaPorReserva(
  lote: Pick<Lote, 'vendidos' | 'reservas' | 'quantidadeLimite'>,
  linhas: number
): boolean {
  return lote.vendidos + linhas <= lote.quantidadeLimite;
}

/**
 * Lote ENCERRADO no instante `agora`? (RN-300 — virada por data OU quantidade,
 * o que ocorrer primeiro). Derivação pura da elegibilidade de virada que a
 * Function de S300-T2 materializa. @pure
 */
export function loteEncerrado(
  lote: Pick<Lote, 'fimEm' | 'vendidos' | 'quantidadeLimite'>,
  agora: Date
): boolean {
  return agora.getTime() >= millis(lote.fimEm) || loteEsgotado(lote);
}

/**
 * MOTIVO do encerramento no instante `agora` (RN-300 — "o que ocorrer
 * primeiro"), ou `null` quando o lote NÃO está encerrado. Derivação pura que a
 * Function de virada (S300-T2) materializa no carimbo `encerradoMotivo`.
 *
 * Quando data E quantidade estão ambos satisfeitos no instante observado, a
 * atribuição é DETERMINÍSTICA: 'quantidade' tem precedência — o esgotamento é
 * um fato de contagem (aconteceu numa venda concreta), enquanto a data só
 * marca que a janela expirou em algum momento até `agora`. @pure
 */
export function motivoEncerramento(
  lote: Pick<Lote, 'fimEm' | 'vendidos' | 'quantidadeLimite'>,
  agora: Date
): MotivoEncerramentoLote | null {
  if (loteEsgotado(lote)) return 'quantidade';
  if (agora.getTime() >= millis(lote.fimEm)) return 'data';
  return null;
}

/**
 * Lote VIGENTE no instante `agora`? (janela começou E ainda não encerrou por
 * data/quantidade). NOTA: vigência olha o lote ISOLADO — o hand-off por
 * antecessor encerrado (ADR-012) vive em `loteAtivo`. @pure
 */
export function loteVigente(
  lote: Pick<Lote, 'inicioEm' | 'fimEm' | 'vendidos' | 'quantidadeLimite'>,
  agora: Date
): boolean {
  return agora.getTime() >= millis(lote.inicioEm) && !loteEncerrado(lote, agora);
}

/**
 * O lote ATIVO de uma modalidade no instante `agora` (RN-300 · ADR-012).
 *
 * Derivação do HAND-OFF: o ativo é o PRIMEIRO lote por `ordem` ainda não
 * encerrado (data/quantidade) cuja janela já começou OU cujo antecessor
 * imediato está encerrado (esgotado/fim passado) — "esgotou o L1, vira
 * sozinho pro L2" (ADR-012), mesmo que o `inicioEm` do L2 ainda não tenha
 * chegado. Sem o hand-off, a virada por QUANTIDADE com janelas encostadas
 * deixava a modalidade sem lote ativo e travava a venda (re-review S300 #2).
 *
 * `null` quando: antes do 1º início (sem antecessor não há hand-off) ou
 * quando TODOS os lotes encerraram — venda fechada, que NUNCA reabre no
 * preço legado (ver `precoVigente`). @pure
 */
export function loteAtivo<
  T extends Pick<Lote, 'ordem' | 'inicioEm' | 'fimEm' | 'vendidos' | 'quantidadeLimite'>,
>(lotesDaModalidade: readonly T[], agora: Date): T | null {
  const porOrdem = [...lotesDaModalidade].sort((a, b) => a.ordem - b.ordem);
  for (let i = 0; i < porOrdem.length; i++) {
    const lote = porOrdem[i]!;
    if (loteEncerrado(lote, agora)) continue;
    // Primeiro não-encerrado da sequência (com janelas não-sobrepostas e
    // cronologia coerente — validarLotesModalidade — todos os anteriores
    // estão encerrados): ativo se a própria janela começou OU por hand-off
    // do antecessor imediato encerrado.
    const janelaComecou = agora.getTime() >= millis(lote.inicioEm);
    const antecessorEncerrado = i > 0 && loteEncerrado(porOrdem[i - 1]!, agora);
    return janelaComecou || antecessorEncerrado ? lote : null;
  }
  return null;
}

/**
 * Preço VIGENTE de uma modalidade (RN-301 evoluído por ADR-012).
 *
 * EVOLUÇÃO DE `PercursoEvento` (registrada): o preço vigente deriva do LOTE
 * ATIVO da modalidade. `PercursoEvento.preco` (S201) permanece como preço-base
 * LEGADO/fallback — mas SÓ para modalidade SEM lotes configurados
 * (legado/seed). Com lotes configurados e nenhum ativo a venda está FECHADA
 * (`null`): devolver o preço-base na janela-morta reabriria a venda sem teto
 * de vaga depois de todos os lotes esgotarem/encerrarem (re-review S300 #1 —
 * dinheiro entrando por porta que a RN-300 fechou). Schema evolution
 * backward-compatible (Kleppmann): o campo antigo não é removido e readers
 * antigos (eventos sem lotes) não quebram; o caminho novo (lote) tem
 * precedência quando existe.
 *
 * @returns preço do lote ativo; senão `precoLegado` SE a modalidade não tem
 * lotes configurados; senão `null` (venda fechada). @pure
 */
export function precoVigente(params: {
  lotesDaModalidade: readonly Pick<
    Lote,
    'ordem' | 'inicioEm' | 'fimEm' | 'vendidos' | 'quantidadeLimite' | 'preco'
  >[];
  agora: Date;
  precoLegado?: number;
}): number | null {
  const ativo = loteAtivo(params.lotesDaModalidade, params.agora);
  if (ativo !== null) return ativo.preco;
  // Modalidade COM lotes e nenhum ativo = venda fechada — nunca preço legado.
  if (params.lotesDaModalidade.length > 0) return null;
  return params.precoLegado ?? null;
}

// ---------------------------------------------------------------------------
// Parse fail-fast (borda de I/O do Firestore)
// ---------------------------------------------------------------------------

/** Parsing defensivo de um doc Firestore em `Lote` (fail-fast). @pure */
export function parseLote(id: string, data: Record<string, unknown>): Lote {
  const tenantId = data['tenantId'];
  const modalidade = data['modalidade'];
  const ordem = data['ordem'];
  const nome = data['nome'];
  const inicioEm = data['inicioEm'];
  const fimEm = data['fimEm'];
  const quantidadeLimite = data['quantidadeLimite'];
  const preco = data['preco'];
  const vendidos = data['vendidos'];
  const reservas = data['reservas'];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`Lote ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof modalidade !== 'string' || modalidade.length === 0) {
    throw new Error(`Lote ${id}: campo "modalidade" inválido (ADR-012)`);
  }
  if (typeof nome !== 'string' || nome.length === 0) {
    throw new Error(`Lote ${id}: campo "nome" inválido`);
  }
  if (!Number.isInteger(ordem) || (ordem as number) < 1) {
    throw new Error(`Lote ${id}: "ordem" deve ser inteiro ≥ 1 (ADR-012)`);
  }
  if (!Number.isInteger(quantidadeLimite) || (quantidadeLimite as number) < 1) {
    throw new Error(`Lote ${id}: "quantidadeLimite" deve ser inteiro ≥ 1 (RN-300)`);
  }
  if (typeof preco !== 'number' || !Number.isFinite(preco) || preco < 0) {
    throw new Error(`Lote ${id}: "preco" deve ser número ≥ 0 (RN-301)`);
  }
  if (!isTimestampLike(inicioEm) || !isTimestampLike(fimEm)) {
    throw new Error(`Lote ${id}: "inicioEm"/"fimEm" devem ser Timestamp`);
  }
  if (fimEm.toMillis() <= inicioEm.toMillis()) {
    throw new Error(`Lote ${id}: "fimEm" deve ser depois de "inicioEm" (janela RN-300)`);
  }
  // vendidos é ∑ de Function — ausente em doc recém-criado normaliza para 0;
  // presente e inválido lança (contador corrompido é dado financeiro).
  if (vendidos !== undefined && (typeof vendidos !== 'number' || !Number.isInteger(vendidos) || vendidos < 0)) {
    throw new Error(`Lote ${id}: "vendidos" deve ser inteiro ≥ 0 (∑ de Function)`);
  }
  // `reservas` (RN-543) segue a MESMA leitura Postel do `vendidos`: ausente
  // em doc anterior à regra normaliza para 0; presente e inválido LANÇA —
  // contador de vaga corrompido decide venda, e adivinhar aqui seria vender
  // a mesma vaga duas vezes em silêncio.
  if (
    reservas !== undefined &&
    (typeof reservas !== 'number' || !Number.isInteger(reservas) || reservas < 0)
  ) {
    throw new Error(`Lote ${id}: "reservas" deve ser inteiro ≥ 0 (∑ de Function)`);
  }

  // Carimbos de virada (S300-T2) — opcionais; presentes e inválidos lançam
  // (trilha de auditoria corrompida em dado comercial é fail-fast).
  const encerradoEm = data['encerradoEm'];
  const encerradoMotivo = data['encerradoMotivo'];
  if (encerradoEm !== undefined && !isTimestampLike(encerradoEm)) {
    throw new Error(`Lote ${id}: "encerradoEm" deve ser Timestamp (carimbo S300-T2)`);
  }
  if (
    encerradoMotivo !== undefined &&
    !(MOTIVOS_ENCERRAMENTO_LOTE as readonly unknown[]).includes(encerradoMotivo)
  ) {
    throw new Error(
      `Lote ${id}: "encerradoMotivo" deve ser 'data'|'quantidade' (RN-300)`
    );
  }

  const lote: Lote = {
    id,
    tenantId,
    modalidade,
    ordem: ordem as number,
    nome,
    inicioEm,
    fimEm,
    quantidadeLimite: quantidadeLimite as number,
    preco,
    vendidos: typeof vendidos === 'number' ? vendidos : 0,
    reservas: typeof reservas === 'number' ? reservas : 0,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };
  // exactOptionalPropertyTypes: carimbos só entram quando presentes.
  if (encerradoEm !== undefined) lote.encerradoEm = encerradoEm;
  if (encerradoMotivo !== undefined) {
    lote.encerradoMotivo = encerradoMotivo as MotivoEncerramentoLote;
  }
  return lote;
}

/** Guard estrutural mínimo de Timestamp (tem toMillis()). @pure */
function isTimestampLike(value: unknown): value is Timestamp {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as Partial<Timestamp>).toMillis === 'function'
  );
}
