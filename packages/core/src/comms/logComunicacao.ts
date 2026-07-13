// =============================================================================
// packages/core/src/comms/logComunicacao.ts
//
// LOG DE COMUNICAÇÃO — agregado ÚNICO (LEELA-FABLE-G-T1 · Onda 2).
// Registra cada comunicação enviada (e-mail/push) a um destinatário do
// evento, com status de entrega/abertura. É a FONTE de:
//   - E06-L3 (aba Comunicação do evento / campanhas) — visão por evento;
//   - S1206-T2 (log de envio do ingresso, RN-219) — visão por inscrito +
//     idempotência do disparo (hasSent/markSent).
// V1-CHECKLIST: "o log de envio do ingresso é o MESMO agregado do log de
// comunicação — não modelar um 2º".
//
// DECISÃO DE MODELAGEM (Kleppmann — log vs agregado):
//   1. FONTE DA VERDADE = log flat por evento:
//        `eventos/{eventoId}/comunicacoes/{comunicacaoId}`
//      e não subcoleção por inscrito. Motivos:
//        - as duas visões são QUERIES sobre a mesma coleção: por inscrito
//          (`where destinatario.ref ==`, single-field auto-index) e por
//          campanha (`where campanhaRef ==`) — sem collectionGroup, sem
//          índice composto, sem match de Rules coringa (`/{path=**}/`)
//          que ampliaria a superfície de ataque (Schneier);
//        - o rollup por evento (E06-L3) reconta com count() de escopo de
//          COLEÇÃO — espelho exato do padrão `agregarFinanceiro`.
//   2. IDEMPOTÊNCIA ESTRUTURAL = docId DETERMINÍSTICO
//        `{destinatarioRef}_{chave}_{canal}`
//      Reprocessar o webhook deriva o MESMO docId → a existência do doc É o
//      hasSent (RN-219: "e-mail não é reenviado"). Registrar-antes-de-enviar
//      = at-most-once (a spec RN-219 pede exatamente isso: nunca duplicar;
//      um doc `enfileirado` órfão de crash é recuperável por sweeper — a
//      transição enfileirado→enviado continua válida).
//   3. STATUS = reticulado MONOTÔNICO (enfileirado < enviado < entregue <
//      aberto; falhou = ramo terminal a partir de enfileirado/enviado).
//      Webhooks de provider chegam fora de ordem e em at-least-once: o merge
//      `aplicarEventoProvedor` só avança o status (max do reticulado) e só
//      preenche carimbo AUSENTE — reaplicar o mesmo evento é no-op puro.
//   4. AGREGADO CONSULTÁVEL por evento = `comunicacoesResumo/current`
//      (contagens por status/canal/tipo), recomputado INTEGRALMENTE por
//      Function (substituição total, idempotente por construção — mesmo
//      padrão de `financeiro/current`).
//
// PII (LGPD): o log revela A QUEM se comunicou e SE abriu — é dado pessoal.
//   - o doc NÃO carrega corpo/HTML da mensagem (só assunto + templateRef);
//     `parseLogComunicacao` REJEITA docs com corpo/conteudo/html/body;
//   - leitura nas Rules = papel de GESTÃO (owner/staff) + platform_admin,
//     espelhando `inscritos`/`pedidos`; escrita de cliente = NUNCA.
// =============================================================================

import type { Timestamp } from '../index';
// Reuso-first: canal (push/email) é a MESMA primitiva agnóstica do clube e
// do evento — extração Camada A concluída (E06-L1-T1): importa da fonte
// única `core/comunicacao` (o clube re-exporta os mesmos símbolos).
import {
  CANAIS_COMUNICADO,
  isCanalComunicado,
  type CanalComunicado,
} from '../comunicacao/canal';

// ---------------------------------------------------------------------------
// Literais de domínio
// ---------------------------------------------------------------------------

/** Canal do envio — mesmo literal do comunicado do clube (uma fonte). */
export type CanalLogComunicacao = CanalComunicado;

/** Lista canônica de canais do log (alias do literal compartilhado). */
export const CANAIS_LOG_COMUNICACAO: readonly CanalLogComunicacao[] =
  CANAIS_COMUNICADO;

/** Type guard de canal (delegado à fonte única). */
export function isCanalLogComunicacao(v: unknown): v is CanalLogComunicacao {
  return isCanalComunicado(v);
}

/**
 * Tipo da comunicação:
 *   - `ingresso`    — e-mail/push do ingresso digital (S1206);
 *   - `campanha`    — disparo de campanha do evento (E06);
 *   - `transacional`— demais mensagens de sistema (confirmações, avisos).
 */
export type TipoLogComunicacao = 'ingresso' | 'campanha' | 'transacional';

export const TIPOS_LOG_COMUNICACAO: readonly TipoLogComunicacao[] = [
  'ingresso',
  'campanha',
  'transacional',
];

export function isTipoLogComunicacao(v: unknown): v is TipoLogComunicacao {
  return TIPOS_LOG_COMUNICACAO.includes(v as TipoLogComunicacao);
}

/**
 * Status de entrega — reticulado monotônico + ramo terminal:
 *   enfileirado → enviado → entregue → aberto
 *   enfileirado|enviado → falhou (terminal; entregue/aberto NÃO retro-falham)
 */
export type StatusLogComunicacao =
  | 'enfileirado'
  | 'enviado'
  | 'entregue'
  | 'aberto'
  | 'falhou';

export const STATUS_LOG_COMUNICACAO: readonly StatusLogComunicacao[] = [
  'enfileirado',
  'enviado',
  'entregue',
  'aberto',
  'falhou',
];

export function isStatusLogComunicacao(
  v: unknown
): v is StatusLogComunicacao {
  return STATUS_LOG_COMUNICACAO.includes(v as StatusLogComunicacao);
}

/**
 * Matriz CANÔNICA de transição (espelha TRANSICOES_STATUS_INSCRITO/PEDIDO):
 * Functions consultam ESTA matriz — nunca re-derivam transições localmente.
 * `enviado → aberto` existe porque webhook de entrega PODE se perder e
 * abertura IMPLICA entrega; `aberto`/`falhou` são terminais.
 */
export const TRANSICOES_STATUS_LOG_COMUNICACAO: Readonly<
  Record<StatusLogComunicacao, readonly StatusLogComunicacao[]>
> = {
  enfileirado: ['enviado', 'falhou'],
  enviado: ['entregue', 'aberto', 'falhou'],
  entregue: ['aberto'],
  aberto: [],
  falhou: [],
};

/** Transição de status permitida? @pure */
export function podeTransicionarStatusLogComunicacao(
  de: StatusLogComunicacao,
  para: StatusLogComunicacao
): boolean {
  return TRANSICOES_STATUS_LOG_COMUNICACAO[de].includes(para);
}

/**
 * Rank do reticulado de progresso (falhou fica FORA — é ramo, não degrau).
 * Usado pelo merge monotônico: o status nunca regride de rank.
 */
const RANK_STATUS: Readonly<Record<StatusLogComunicacao, number>> = {
  enfileirado: 0,
  enviado: 1,
  entregue: 2,
  aberto: 3,
  falhou: -1,
};

// ---------------------------------------------------------------------------
// Destinatário
// ---------------------------------------------------------------------------

/** A quem a comunicação foi enviada. V1 usa `inscrito` (evento); `membro`
 *  existe no TIPO para o mesmo modelo servir o clube depois (reuso). */
export type TipoDestinatarioComunicacao = 'inscrito' | 'membro';

export const TIPOS_DESTINATARIO_COMUNICACAO: readonly TipoDestinatarioComunicacao[] =
  ['inscrito', 'membro'];

export function isTipoDestinatarioComunicacao(
  v: unknown
): v is TipoDestinatarioComunicacao {
  return TIPOS_DESTINATARIO_COMUNICACAO.includes(
    v as TipoDestinatarioComunicacao
  );
}

export interface DestinatarioComunicacao {
  tipo: TipoDestinatarioComunicacao;
  /** inscritoId (→ eventos/{e}/inscritos) ou membroId (→ clubes/{c}/membros) */
  ref: string;
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/** Nome da subcoleção do log — `eventos/{eventoId}/comunicacoes`. */
export const COLECAO_LOG_COMUNICACAO = 'comunicacoes';

/** Subcoleção do agregado ∑ — `eventos/{eventoId}/comunicacoesResumo`. */
export const COLECAO_RESUMO_COMUNICACOES = 'comunicacoesResumo';

/** docId único do agregado (padrão `financeiro/current`). */
export const DOC_RESUMO_COMUNICACOES = 'current';

/**
 * LogComunicacao — UM envio a UM destinatário por UM canal.
 * Subcoleção: `eventos/{eventoId}/comunicacoes/{comunicacaoId}`;
 * docId determinístico = `{destinatario.ref}_{chave}_{canal}`.
 * Escrita EXCLUSIVA de Function (Rules: write false); leitura owner/staff.
 * SEM corpo da mensagem — PII mínima (assunto + templateRef apenas).
 */
export interface LogComunicacao {
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Denormalizado do pai — self-locating (consultas futuras cross-evento) */
  eventoId: string;
  destinatario: DestinatarioComunicacao;
  canal: CanalLogComunicacao;
  tipo: TipoLogComunicacao;
  /**
   * Componente de idempotência do docId (RN-219):
   *   tipo `ingresso`    → 'ingresso' (1 ingresso por inscrito/canal);
   *   tipo `campanha`    → campanhaRef (1 disparo por campanha/canal);
   *   tipo `transacional`→ subtipo estável (ex.: 'emailConfirmacao').
   * Sem `_` (o separador do docId) — ver CHAVE_LOG_COMUNICACAO_RE.
   */
  chave: string;
  /** Exigido SE E SOMENTE SE tipo === 'campanha' (e igual à chave) */
  campanhaRef?: string;
  status: StatusLogComunicacao;
  /** Assunto/título curto — NUNCA o corpo (PII mínima) */
  assunto: string;
  /** Referência do template usado (o conteúdo mora no template, não aqui) */
  templateRef?: string;
  /** Id da mensagem no provider (correlação de webhooks de status) */
  providerMessageId?: string;
  /** Código de falha SEM PII (ex.: 'bounce', 'provider_5xx') */
  falhaMotivo?: string;
  // ── Carimbos (escritos pela Function na transição correspondente) ────────
  enfileiradoEm: Timestamp;
  enviadoEm?: Timestamp;
  entregueEm?: Timestamp;
  abertoEm?: Timestamp;
  falhouEm?: Timestamp;
}

/**
 * Agregado ∑ consultável por evento (E06-L3) —
 * `eventos/{eventoId}/comunicacoesResumo/current`.
 * Recomputado INTEGRALMENTE pela Function (substituição total, idempotente).
 */
export interface ResumoComunicacoes {
  tenantId: string;
  total: number;
  porStatus: Record<StatusLogComunicacao, number>;
  porCanal: Record<CanalLogComunicacao, number>;
  porTipo: Record<TipoLogComunicacao, number>;
}

// ---------------------------------------------------------------------------
// docId determinístico (idempotência estrutural — RN-219)
// ---------------------------------------------------------------------------

/**
 * Chave sem `_`: o docId é `{ref}_{chave}_{canal}` e proibir `_` na chave
 * elimina colisão de fronteira entre componentes (ref pode conter `_`, mas
 * é sempre o prefixo; com a chave sem `_`, dois trios distintos nunca
 * serializam no mesmo docId).
 */
export const CHAVE_LOG_COMUNICACAO_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,63}$/;

/**
 * Deriva a chave de idempotência a partir do tipo. @pure
 *   - `ingresso`     → 'ingresso' (ref ignorada);
 *   - `campanha`     → ref = campanhaRef (obrigatória);
 *   - `transacional` → ref = subtipo estável (obrigatória).
 * Fail-fast em chave ausente/inválida.
 */
export function chaveLogComunicacao(
  tipo: TipoLogComunicacao,
  ref?: string
): string {
  const chave = tipo === 'ingresso' ? 'ingresso' : ref;
  if (typeof chave !== 'string' || !CHAVE_LOG_COMUNICACAO_RE.test(chave)) {
    throw new Error(
      `chaveLogComunicacao: tipo "${tipo}" exige ref válida ` +
        `(${CHAVE_LOG_COMUNICACAO_RE.source}); recebido "${String(ref)}"`
    );
  }
  return chave;
}

/**
 * docId determinístico do log — a MESMA (destinatário, chave, canal) produz
 * SEMPRE o mesmo id: reprocessar um webhook colide no doc existente e o
 * envio não duplica (RN-219). @pure
 */
export function logComunicacaoDocId(
  destinatarioRef: string,
  chave: string,
  canal: CanalLogComunicacao
): string {
  if (typeof destinatarioRef !== 'string' || destinatarioRef.length === 0) {
    throw new Error('logComunicacaoDocId: destinatarioRef vazio');
  }
  if (!CHAVE_LOG_COMUNICACAO_RE.test(chave)) {
    throw new Error(
      `logComunicacaoDocId: chave "${chave}" inválida (sem "_"; ` +
        `${CHAVE_LOG_COMUNICACAO_RE.source})`
    );
  }
  if (!isCanalLogComunicacao(canal)) {
    throw new Error(`logComunicacaoDocId: canal "${String(canal)}" inválido`);
  }
  return `${destinatarioRef}_${chave}_${canal}`;
}

// ---------------------------------------------------------------------------
// Merge monotônico de eventos de provider (webhooks at-least-once)
// ---------------------------------------------------------------------------

/** Evento de status vindo do provider (webhook de envio/entrega/abertura). */
export type TipoEventoProvedor = 'enviado' | 'entregue' | 'aberto' | 'falhou';

export const TIPOS_EVENTO_PROVEDOR: readonly TipoEventoProvedor[] = [
  'enviado',
  'entregue',
  'aberto',
  'falhou',
];

export function isTipoEventoProvedor(v: unknown): v is TipoEventoProvedor {
  return TIPOS_EVENTO_PROVEDOR.includes(v as TipoEventoProvedor);
}

export interface EventoProvedor {
  tipo: TipoEventoProvedor;
  em: Timestamp;
  /** Só faz sentido no evento 'enviado' (id que o provider devolve) */
  providerMessageId?: string;
  /** Só faz sentido no evento 'falhou' — código sem PII */
  falhaMotivo?: string;
}

/** Campos que o merge pode alterar (subset de LogComunicacao). */
export type MudancasLogComunicacao = Partial<
  Pick<
    LogComunicacao,
    | 'status'
    | 'enviadoEm'
    | 'entregueEm'
    | 'abertoEm'
    | 'falhouEm'
    | 'providerMessageId'
    | 'falhaMotivo'
  >
>;

/**
 * Aplica um evento de provider ao log — merge MONOTÔNICO e idempotente:
 *   - carimbo do evento só é escrito se AUSENTE (primeiro vence — reentrega
 *     do mesmo webhook não move timestamps);
 *   - status só AVANÇA no reticulado (max de rank) — 'entregue' chegando
 *     depois de 'aberto' preenche `entregueEm` sem regredir o status;
 *   - avançar além de 'enviado' sem `enviadoEm` faz backfill com `em`
 *     (invariante: status ≥ enviado ⇒ enviadoEm presente);
 *   - 'falhou' só a partir de enfileirado/enviado (entregue/aberto não
 *     retro-falham); 'falhou' e 'aberto' são terminais.
 *
 * Retorna as mudanças a persistir, ou null quando o evento é no-op
 * (idempotência: reaplicar o mesmo evento → null). @pure
 */
export function aplicarEventoProvedor(
  log: Pick<
    LogComunicacao,
    | 'status'
    | 'enviadoEm'
    | 'entregueEm'
    | 'abertoEm'
    | 'falhouEm'
    | 'providerMessageId'
  >,
  evento: EventoProvedor
): MudancasLogComunicacao | null {
  if (!isTipoEventoProvedor(evento.tipo)) {
    throw new Error(
      `aplicarEventoProvedor: tipo "${String(evento.tipo)}" inválido`
    );
  }

  // Terminais: nada muda um log falhado; um log aberto só aceita
  // carimbo retroativo de entrega (tratado no ramo monotônico abaixo).
  if (log.status === 'falhou') return null;

  const mudancas: MudancasLogComunicacao = {};

  if (evento.tipo === 'falhou') {
    // entregue/aberto NÃO retro-falham (a mensagem chegou).
    if (log.status !== 'enfileirado' && log.status !== 'enviado') return null;
    mudancas.status = 'falhou';
    mudancas.falhouEm = evento.em;
    if (evento.falhaMotivo !== undefined) {
      mudancas.falhaMotivo = evento.falhaMotivo;
    }
    return mudancas;
  }

  // Carimbo do próprio evento — só se ausente (primeiro vence).
  const carimboAtual =
    evento.tipo === 'enviado'
      ? log.enviadoEm
      : evento.tipo === 'entregue'
        ? log.entregueEm
        : log.abertoEm;
  if (carimboAtual === undefined) {
    if (evento.tipo === 'enviado') mudancas.enviadoEm = evento.em;
    if (evento.tipo === 'entregue') mudancas.entregueEm = evento.em;
    if (evento.tipo === 'aberto') mudancas.abertoEm = evento.em;
  }

  // providerMessageId — só no evento 'enviado', só se ausente.
  if (
    evento.tipo === 'enviado' &&
    evento.providerMessageId !== undefined &&
    log.providerMessageId === undefined
  ) {
    mudancas.providerMessageId = evento.providerMessageId;
  }

  // Status: avanço monotônico (nunca regride).
  const rankEvento = RANK_STATUS[evento.tipo];
  if (rankEvento > RANK_STATUS[log.status]) {
    mudancas.status = evento.tipo;
    // Backfill do invariante: status ≥ enviado ⇒ enviadoEm presente.
    if (log.enviadoEm === undefined && mudancas.enviadoEm === undefined) {
      mudancas.enviadoEm = evento.em;
    }
  }

  return Object.keys(mudancas).length > 0 ? mudancas : null;
}

// ---------------------------------------------------------------------------
// Parsing defensivo (fail-fast)
// ---------------------------------------------------------------------------

/**
 * Campos de CONTEÚDO proibidos no log (PII-minimização): o corpo da mensagem
 * NUNCA é persistido aqui — mora no template. O parse REJEITA docs que os
 * carreguem (mantém as Functions honestas; cliente nem escreve — Rules).
 */
export const CAMPOS_PROIBIDOS_LOG_COMUNICACAO = [
  'corpo',
  'conteudo',
  'html',
  'body',
] as const;

/**
 * Parsing defensivo de um doc Firestore em `LogComunicacao` (fail-fast).
 * Valida enums, coerência tipo↔chave↔campanhaRef e a coerência dos
 * carimbos com o status (log corrompido lança — melhor não renderizar
 * histórico do que renderizar histórico errado). @pure
 */
export function parseLogComunicacao(
  id: string,
  data: Record<string, unknown>
): LogComunicacao {
  const ctx = `LogComunicacao ${id}`;

  for (const campo of CAMPOS_PROIBIDOS_LOG_COMUNICACAO) {
    if (campo in data) {
      throw new Error(
        `${ctx}: campo "${campo}" proibido — o log NÃO carrega corpo de ` +
          `mensagem (PII mínima; conteúdo mora no template)`
      );
    }
  }

  const tenantId = data['tenantId'];
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`${ctx}: "tenantId" inválido (ADR-009)`);
  }
  const eventoId = data['eventoId'];
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new Error(`${ctx}: "eventoId" inválido`);
  }

  const dest = data['destinatario'];
  if (dest === null || typeof dest !== 'object' || Array.isArray(dest)) {
    throw new Error(`${ctx}: "destinatario" deve ser map {tipo, ref}`);
  }
  const destTipo = (dest as Record<string, unknown>)['tipo'];
  const destRef = (dest as Record<string, unknown>)['ref'];
  if (!isTipoDestinatarioComunicacao(destTipo)) {
    throw new Error(
      `${ctx}: destinatario.tipo "${String(destTipo)}" fora do enum`
    );
  }
  if (typeof destRef !== 'string' || destRef.length === 0) {
    throw new Error(`${ctx}: destinatario.ref inválida`);
  }

  const canal = data['canal'];
  if (!isCanalLogComunicacao(canal)) {
    throw new Error(`${ctx}: canal "${String(canal)}" fora do enum`);
  }
  const tipo = data['tipo'];
  if (!isTipoLogComunicacao(tipo)) {
    throw new Error(`${ctx}: tipo "${String(tipo)}" fora do enum`);
  }
  const status = data['status'];
  if (!isStatusLogComunicacao(status)) {
    throw new Error(`${ctx}: status "${String(status)}" fora do enum`);
  }

  const chave = data['chave'];
  if (typeof chave !== 'string' || !CHAVE_LOG_COMUNICACAO_RE.test(chave)) {
    throw new Error(`${ctx}: "chave" inválida (idempotência RN-219)`);
  }

  // Coerência tipo↔chave↔campanhaRef
  const campanhaRef = data['campanhaRef'];
  if (tipo === 'campanha') {
    if (typeof campanhaRef !== 'string' || campanhaRef.length === 0) {
      throw new Error(`${ctx}: tipo "campanha" exige "campanhaRef"`);
    }
    if (campanhaRef !== chave) {
      throw new Error(
        `${ctx}: chave "${chave}" difere de campanhaRef "${campanhaRef}" — ` +
          `a chave de idempotência de campanha É a campanhaRef`
      );
    }
  } else {
    if (campanhaRef !== undefined) {
      throw new Error(
        `${ctx}: "campanhaRef" presente com tipo "${tipo}" — só campanha`
      );
    }
    if (tipo === 'ingresso' && chave !== 'ingresso') {
      throw new Error(
        `${ctx}: tipo "ingresso" exige chave "ingresso" (1 por canal)`
      );
    }
  }

  const assunto = data['assunto'];
  if (typeof assunto !== 'string' || assunto.trim().length === 0) {
    throw new Error(`${ctx}: "assunto" inválido`);
  }

  const enfileiradoEm = data['enfileiradoEm'];
  if (enfileiradoEm === undefined || enfileiradoEm === null) {
    throw new Error(`${ctx}: "enfileiradoEm" obrigatório`);
  }

  // Coerência carimbos ↔ status (fail-fast — trilha corrompida lança):
  //   enfileirado: nenhum carimbo além de enfileiradoEm;
  //   enviado:     enviadoEm; sem entregue/aberto/falhou;
  //   entregue:    enviadoEm + entregueEm; sem aberto/falhou;
  //   aberto:      enviadoEm + abertoEm (entregueEm OPCIONAL — webhook de
  //                entrega pode se perder; abertura implica entrega);
  //   falhou:      falhouEm; sem entregue/aberto (não retro-falha).
  const tem = (campo: string): boolean =>
    data[campo] !== undefined && data[campo] !== null;
  const exigir = (campo: string): void => {
    if (!tem(campo)) {
      throw new Error(`${ctx}: status "${status}" exige carimbo "${campo}"`);
    }
  };
  const proibir = (campo: string): void => {
    if (tem(campo)) {
      throw new Error(
        `${ctx}: carimbo "${campo}" presente com status "${status}" — ` +
          `carimbo à frente do status indica escrita fora da Function`
      );
    }
  };
  switch (status) {
    case 'enfileirado':
      proibir('enviadoEm');
      proibir('entregueEm');
      proibir('abertoEm');
      proibir('falhouEm');
      break;
    case 'enviado':
      exigir('enviadoEm');
      proibir('entregueEm');
      proibir('abertoEm');
      proibir('falhouEm');
      break;
    case 'entregue':
      exigir('enviadoEm');
      exigir('entregueEm');
      proibir('abertoEm');
      proibir('falhouEm');
      break;
    case 'aberto':
      exigir('enviadoEm');
      exigir('abertoEm');
      proibir('falhouEm');
      break;
    case 'falhou':
      exigir('falhouEm');
      proibir('entregueEm');
      proibir('abertoEm');
      break;
  }

  const falhaMotivo = data['falhaMotivo'];
  if (falhaMotivo !== undefined && status !== 'falhou') {
    throw new Error(
      `${ctx}: "falhaMotivo" presente com status "${status}" — só falhou`
    );
  }
  if (falhaMotivo !== undefined && typeof falhaMotivo !== 'string') {
    throw new Error(`${ctx}: "falhaMotivo" deve ser string`);
  }

  const providerMessageId = data['providerMessageId'];
  if (
    providerMessageId !== undefined &&
    (typeof providerMessageId !== 'string' || providerMessageId.length === 0)
  ) {
    throw new Error(`${ctx}: "providerMessageId" inválido`);
  }

  const templateRef = data['templateRef'];
  if (
    templateRef !== undefined &&
    (typeof templateRef !== 'string' || templateRef.length === 0)
  ) {
    throw new Error(`${ctx}: "templateRef" inválido`);
  }

  const log: LogComunicacao = {
    id,
    tenantId,
    eventoId,
    destinatario: { tipo: destTipo, ref: destRef },
    canal,
    tipo,
    chave,
    status,
    assunto,
    enfileiradoEm: enfileiradoEm as Timestamp,
  };

  // Opcionais só entram quando o doc os carrega (exactOptionalPropertyTypes)
  if (typeof campanhaRef === 'string') log.campanhaRef = campanhaRef;
  if (typeof templateRef === 'string') log.templateRef = templateRef;
  if (typeof providerMessageId === 'string') {
    log.providerMessageId = providerMessageId;
  }
  if (typeof falhaMotivo === 'string') log.falhaMotivo = falhaMotivo;
  if (tem('enviadoEm')) log.enviadoEm = data['enviadoEm'] as Timestamp;
  if (tem('entregueEm')) log.entregueEm = data['entregueEm'] as Timestamp;
  if (tem('abertoEm')) log.abertoEm = data['abertoEm'] as Timestamp;
  if (tem('falhouEm')) log.falhouEm = data['falhouEm'] as Timestamp;

  return log;
}

/**
 * Parsing defensivo do agregado `comunicacoesResumo/current` (fail-fast).
 * Contadores ausentes NÃO são imputados como 0 — resumo corrompido lança.
 * @pure
 */
export function parseResumoComunicacoes(
  data: Record<string, unknown>
): ResumoComunicacoes {
  const ctx = 'ResumoComunicacoes';
  const tenantId = data['tenantId'];
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`${ctx}: "tenantId" inválido (ADR-009)`);
  }
  const total = data['total'];
  if (typeof total !== 'number' || !Number.isInteger(total) || total < 0) {
    throw new Error(`${ctx}: "total" inválido`);
  }

  const lerMapa = <K extends string>(
    campo: string,
    chaves: readonly K[]
  ): Record<K, number> => {
    const bruto = data[campo];
    if (bruto === null || typeof bruto !== 'object' || Array.isArray(bruto)) {
      throw new Error(`${ctx}: "${campo}" deve ser map de contagens`);
    }
    const mapa = {} as Record<K, number>;
    for (const chave of chaves) {
      const v = (bruto as Record<string, unknown>)[chave];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
        throw new Error(`${ctx}: ${campo}.${chave} inválido`);
      }
      mapa[chave] = v;
    }
    return mapa;
  };

  return {
    tenantId,
    total,
    porStatus: lerMapa('porStatus', STATUS_LOG_COMUNICACAO),
    porCanal: lerMapa('porCanal', CANAIS_LOG_COMUNICACAO),
    porTipo: lerMapa('porTipo', TIPOS_LOG_COMUNICACAO),
  };
}
