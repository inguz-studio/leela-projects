// =============================================================================
// packages/core/src/eventos/campanha.ts
//
// Entidade Campanha — comunicação segmentada do EVENTO (LEELA-S401-T1 ·
// E06-L1-T2). Subcoleção: `eventos/{eventoId}/campanhas/{campanhaId}`.
//
// REUSO (E06-L1-T1): canal/status/origem + limites de push vêm da fonte
// única `core/comunicacao` (Camada A) — os MESMOS símbolos do comunicado do
// clube. Aqui vive só a Camada C do evento: a taxonomia de segmento
// derivada do Inscrito (E03-S203-T1) e a entidade.
//
// Decisões vinculantes do brief onda2-E06 (cortes 4/5 + item 9):
//   - SEM `aberturasPct` (corte 4): não há provider de entrega/open-tracking
//     em V1 — o disparo físico é MOCK (padrão PaymentProvider/ADR-006).
//     `alcance` (contagem real) fica. O parse REJEITA doc com aberturasPct.
//   - SEM `por_engajamento` (corte 5): inscrito não tem fonte de engajamento
//     até E11/E13. Taxonomia V1 = todos_inscritos|por_modalidade|por_kit|
//     por_status.
//   - Códigos de status MASCULINOS compartilhados (item 9, verificado):
//     `rascunho`/`agendado`/`enviado` — um literal nas Rules dos dois lados,
//     zero drift de enum. "Enviada/Agendada" é RÓTULO de UI (glossário).
//     Idem carimbos: `agendadoPara`/`enviadoEm` (mesmo shape que o envelope
//     compartilhado de envio carimba — functions/shared/comunicacaoEnvio).
//   - Scheduler de `agendado` NÃO entra na V1 (decisão 4): o estado fica no
//     modelo; o gatilho time-based é Onda 3.
//
// RNs: RN-130 (3 estados), RN-131 (2 canais), RN-132 (2 origens),
//      RN-133 (4 push/semana — Function), RN-134 (push ≤ 160),
//      RN-135 (capa só email).
//
// Agregado ∑ `alcance` + carimbo de envio (status='enviado', enviadoEm) são
// de escrita EXCLUSIVA da Function `enviarCampanha` (S401-T4) — o cliente
// cria/edita apenas rascunho/agendado (Rules espelham).
// =============================================================================

import type { Timestamp } from '../index';
import type {
  CanalComunicado,
  OrigemComunicado,
  StatusComunicado,
} from '../comunicacao/canal';
import {
  isCanalComunicado,
  isOrigemComunicado,
  isStatusComunicado,
} from '../comunicacao/canal';
import { validarComunicacaoBase } from '../comunicacao/validacao-base';
import { isKitInscrito, isStatusInscrito } from './inscrito';

// ---------------------------------------------------------------------------
// Aliases dos literais compartilhados (fonte única — NUNCA redeclarar)
// ---------------------------------------------------------------------------

/** Canal da campanha (RN-131) — MESMO literal do clube (`core/comunicacao`). */
export type CanalCampanha = CanalComunicado;

/** Estado da campanha (RN-130) — códigos masculinos compartilhados (item 9). */
export type StatusCampanha = StatusComunicado;

/** Origem da campanha (RN-132) — mesmo literal compartilhado. */
export type OrigemCampanha = OrigemComunicado;

// ---------------------------------------------------------------------------
// Vencimento de disparo agendado (RN-136 · decisão 17 do Vitor, 2026-07-17)
// ---------------------------------------------------------------------------
//
// Verbatim: "Se for agendada vencida, não dispara. Fica vencida, a priori,
// depois posso revisar isso se ver que é um problema."
//
// Campanha `agendado` cujo `agendadoPara` passou além da TOLERÂNCIA de ciclo
// do cron NÃO dispara — vira o estado TERMINAL 'vencido' (sem reagendamento
// por ora; reagendar = decisão futura). O atraso NORMAL entre rodadas do
// cron não é vencimento: a tolerância cobre 2 ciclos (jitter + rodada morta
// no meio recuperada pela seguinte). Só a Function escreve 'vencido'.
//
// Código MASCULINO como os demais (item 9): o dado é `vencido`; "Vencida"
// é rótulo de UI (pendência do lote de painel).
//
// ⚠️ DIRECTIVE (raio de tipo): 'vencido' NÃO entra em `StatusCampanha` — o
// painel tem `Record<StatusCampanha, ...>` que quebraria o typecheck da lane
// de UI (território paralelo). O union persistido completo é
// `StatusCampanhaPersistido`; a adoção no painel (grupo/label/badge
// "Vencida") é pendência registrada do lote Opus. Runtime do painel degrada
// gracioso até lá (fallback de badge + grupos omitem o estado).

/** Estado terminal da decisão 17 — escrita EXCLUSIVA de Function. */
export const STATUS_CAMPANHA_VENCIDO = 'vencido' as const;

/** União REAL persistida no Firestore (RN-130 + RN-136). */
export type StatusCampanhaPersistido =
  | StatusCampanha
  | typeof STATUS_CAMPANHA_VENCIDO;

export function isStatusCampanhaPersistido(
  v: unknown
): v is StatusCampanhaPersistido {
  return v === STATUS_CAMPANHA_VENCIDO || isStatusComunicado(v);
}

/** Cadência do cron de disparo (ADR-015 — `every 5 minutes`). */
export const DISPARO_CRON_INTERVALO_MIN = 5;

/**
 * Tolerância de vencimento = 2 ciclos do cron (premissa da decisão 17):
 * 1 ciclo é o atraso NORMAL (agendou para t ⇒ dispara até t+5min); o 2º é
 * margem para jitter do Scheduler e rodada morta no meio (timeout/crash)
 * curada pela seguinte. Além disso = vencido.
 */
export const DISPARO_VENCIMENTO_CICLOS = 2;

export const DISPARO_VENCIMENTO_TOLERANCIA_MS =
  DISPARO_CRON_INTERVALO_MIN * DISPARO_VENCIMENTO_CICLOS * 60 * 1000;

/**
 * O momento devido `momentoMs` está VENCIDO além da tolerância em `agoraMs`?
 * Fronteira: exatamente na tolerância (agora − 10min) já é vencido; a janela
 * de disparo válida é (agora − tolerância, agora]. Comparação em epoch ms —
 * imune a fuso (Timestamp é UTC; fuso só existe na formatação de UI). @pure
 */
export function disparoVencido(momentoMs: number, agoraMs: number): boolean {
  return momentoMs <= agoraMs - DISPARO_VENCIMENTO_TOLERANCIA_MS;
}

// ---------------------------------------------------------------------------
// Taxonomia de segmento do EVENTO (Camada C — deriva do Inscrito)
// ---------------------------------------------------------------------------

/**
 * Tipo de segmentação sobre `eventos/{id}/inscritos` (corte 5: SEM
 * por_engajamento — não há agregado de engajamento no evento até E11/E13).
 */
export type TipoSegmentoCampanha =
  | 'todos_inscritos'
  | 'por_modalidade'
  | 'por_kit'
  | 'por_status';

export const TIPOS_SEGMENTO_CAMPANHA: readonly TipoSegmentoCampanha[] = [
  'todos_inscritos',
  'por_modalidade',
  'por_kit',
  'por_status',
];

export function isTipoSegmentoCampanha(
  v: unknown
): v is TipoSegmentoCampanha {
  return TIPOS_SEGMENTO_CAMPANHA.includes(v as TipoSegmentoCampanha);
}

/**
 * Segmento embutido na campanha: quem recebe.
 * `referencia` aponta a modalidade (por_modalidade: '5k'|'10k'|'21k'…), o
 * kit (por_kit: enum RN-202) ou o status do inscrito (por_status: enum
 * RN-204). `tamanhoEstimado` é a fotografia da estimativa no momento do
 * envio (callable `estimarAlcance` — E06-L2-T1); para segmento específico é
 * o valor persistido em `alcance` pelo envio (todos_inscritos reconta real).
 */
export interface SegmentoCampanha {
  tipo: TipoSegmentoCampanha;
  referencia?: string;
  tamanhoEstimado?: number;
}

/**
 * Valida o segmento do evento (predicado da Camada C). Retorna erros
 * (vazio = válido). Referências validadas contra os ENUMS canônicos do
 * Inscrito — `isKitInscrito` (RN-202) e `isStatusInscrito` (RN-204);
 * modalidade é string livre do evento (não-vazia). @pure
 */
export function validarSegmentoCampanha(
  segmento: Pick<SegmentoCampanha, 'tipo' | 'referencia'> | null | undefined
): string[] {
  if (!segmento || !isTipoSegmentoCampanha(segmento.tipo)) {
    return ['segmento é obrigatório (todos_inscritos, por_modalidade, por_kit ou por_status)'];
  }

  const erros: string[] = [];
  const ref = segmento.referencia;

  switch (segmento.tipo) {
    case 'todos_inscritos':
      break;
    case 'por_modalidade':
      if (typeof ref !== 'string' || ref.trim().length === 0) {
        erros.push('segmento por_modalidade requer referência (ex.: 21k)');
      }
      break;
    case 'por_kit':
      if (!isKitInscrito(ref)) {
        erros.push(
          `segmento por_kit requer kit válido (RN-202) — recebido "${String(ref)}"`
        );
      }
      break;
    case 'por_status':
      if (!isStatusInscrito(ref)) {
        erros.push(
          `segmento por_status requer status de inscrito válido (RN-204) — recebido "${String(ref)}"`
        );
      }
      break;
  }

  return erros;
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/** Nome da subcoleção — `eventos/{eventoId}/campanhas`. */
export const COLECAO_CAMPANHAS = 'campanhas';

/**
 * Campanha — subcoleção `eventos/{eventoId}/campanhas/{campanhaId}`.
 * Herda tenantId do evento pai (ADR-009). SEM `aberturasPct` (corte 4).
 */
export interface Campanha {
  id: string;
  /** Propagado do evento pai (ADR-009) */
  tenantId: string;
  /** ≥ 5 chars (validação compartilhada — core/comunicacao) */
  titulo: string;
  /** ≥ 10 chars; push ≤ 160 (RN-134) */
  conteudo: string;
  /** Imagem de capa — APENAS email (RN-135) */
  capaUrl?: string;
  /** 1..2 canais (RN-131) */
  canal: CanalCampanha[];
  origem: OrigemCampanha;
  /**
   * Código compartilhado rascunho/agendado/enviado — UI rotula no feminino.
   * ⚠️ O dado persistido pode ainda carregar 'vencido' (RN-136 — decisão
   * 17); o tipo fica no subconjunto ATÉ o painel adotar
   * `StatusCampanhaPersistido` (pendência do lote Opus — ver DIRECTIVE
   * acima). `parseCampanha` ACEITA 'vencido'.
   */
  status: StatusCampanha;
  segmento: SegmentoCampanha;
  /** Obrigatório quando status ∈ {'agendado','vencido'} (era um agendamento) */
  agendadoPara?: Timestamp;
  /** ∑ Carimbo do envio — escrito APENAS pela Function `enviarCampanha` */
  enviadoEm?: Timestamp;
  /** ∑ Carimbo do vencimento (RN-136) — escrito APENAS pelo cron ADR-015 */
  vencidoEm?: Timestamp;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  /** ∑ Destinatários alcançados no envio — mantido por Function */
  alcance: number;
}

/**
 * Campos de escrita exclusiva da Function de envio (Rules negam cliente).
 * `aberturasPct` NÃO existe no modelo V1 (corte 4), mas fica na deny-list:
 * cliente que tentar gravá-lo é negado hoje E quando o provider chegar.
 */
export const CAMPOS_FUNCTION_CAMPANHA = [
  'alcance',
  'aberturasPct',
  'enviadoEm',
  'vencidoEm',
] as const;

// ---------------------------------------------------------------------------
// Validação de formulário (miolo compartilhado + segmento do evento)
// ---------------------------------------------------------------------------

/** Payload do formulário do editor de campanha (S401-T3). */
export interface CampanhaInput {
  titulo: string;
  conteudo: string;
  canal: CanalCampanha[];
  segmento?: SegmentoCampanha | null;
  capaUrl?: string;
}

/**
 * Valida a campanha para envio/agendamento. Retorna a lista de erros
 * (vazia = válido). Copy-neutra — a tela formata os toasts.
 * Composição: miolo agnóstico (Camada A) + segmento do evento (Camada C).
 * O que é de servidor (RN-133) fica na Function `enviarCampanha`. @pure
 */
export function validarCampanha(input: CampanhaInput): string[] {
  const base: Parameters<typeof validarComunicacaoBase>[0] = {
    titulo: input.titulo,
    conteudo: input.conteudo,
    canal: input.canal,
  };
  if (input.capaUrl !== undefined) base.capaUrl = input.capaUrl;

  return [
    ...validarComunicacaoBase(base),
    ...validarSegmentoCampanha(input.segmento),
  ];
}

// ---------------------------------------------------------------------------
// Parsing defensivo (fail-fast)
// ---------------------------------------------------------------------------

/**
 * Parsing defensivo de um doc Firestore em `Campanha` (fail-fast).
 * Valida enums compartilhados, taxonomia de segmento do evento, coerência
 * carimbo↔status e a AUSÊNCIA de `aberturasPct` (corte 4 — presença indica
 * escrita fora do contrato V1). @pure
 */
export function parseCampanha(
  id: string,
  data: Record<string, unknown>
): Campanha {
  const ctx = `Campanha ${id}`;

  if ('aberturasPct' in data) {
    throw new Error(
      `${ctx}: "aberturasPct" presente — o campo foi DEFERIDO da V1 ` +
        `(corte 4: sem provider de entrega, o dado não é real)`
    );
  }

  const tenantId = data['tenantId'];
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`${ctx}: "tenantId" inválido (ADR-009)`);
  }
  const titulo = data['titulo'];
  if (typeof titulo !== 'string' || titulo.trim().length === 0) {
    throw new Error(`${ctx}: "titulo" inválido`);
  }
  const conteudo = data['conteudo'];
  if (typeof conteudo !== 'string' || conteudo.trim().length === 0) {
    throw new Error(`${ctx}: "conteudo" inválido`);
  }

  const canal = data['canal'];
  if (
    !Array.isArray(canal) ||
    canal.length < 1 ||
    canal.length > 2 ||
    canal.some((c) => !isCanalComunicado(c)) ||
    new Set(canal).size !== canal.length
  ) {
    throw new Error(`${ctx}: "canal" inválido (1..2 de push/email — RN-131)`);
  }

  const origem = data['origem'];
  if (!isOrigemComunicado(origem)) {
    throw new Error(`${ctx}: origem "${String(origem)}" fora do enum (RN-132)`);
  }
  const status = data['status'];
  if (!isStatusCampanhaPersistido(status)) {
    throw new Error(
      `${ctx}: status "${String(status)}" fora do enum (RN-130/136)`
    );
  }

  const segBruto = data['segmento'];
  if (
    segBruto === null ||
    typeof segBruto !== 'object' ||
    Array.isArray(segBruto)
  ) {
    throw new Error(`${ctx}: "segmento" deve ser map {tipo, referencia?}`);
  }
  const seg = segBruto as Record<string, unknown>;
  const segErros = validarSegmentoCampanha({
    tipo: seg['tipo'] as TipoSegmentoCampanha,
    ...(typeof seg['referencia'] === 'string'
      ? { referencia: seg['referencia'] }
      : {}),
  });
  if (segErros.length > 0) {
    throw new Error(`${ctx}: segmento inválido — ${segErros.join('; ')}`);
  }
  const tamanhoEstimado = seg['tamanhoEstimado'];
  if (
    tamanhoEstimado !== undefined &&
    (typeof tamanhoEstimado !== 'number' ||
      !Number.isInteger(tamanhoEstimado) ||
      tamanhoEstimado < 0)
  ) {
    throw new Error(`${ctx}: segmento.tamanhoEstimado inválido`);
  }

  const capaUrl = data['capaUrl'];
  if (capaUrl !== undefined) {
    if (typeof capaUrl !== 'string' || capaUrl.length === 0) {
      throw new Error(`${ctx}: "capaUrl" inválida`);
    }
    if (!canal.includes('email')) {
      throw new Error(`${ctx}: capa presente sem canal email (RN-135)`);
    }
  }

  const alcance = data['alcance'];
  if (
    typeof alcance !== 'number' ||
    !Number.isInteger(alcance) ||
    alcance < 0
  ) {
    throw new Error(`${ctx}: "alcance" inválido (∑ int ≥ 0)`);
  }

  // Coerência carimbo ↔ status (espelha o parse do log FABLE-G):
  //   'enviado' exige enviadoEm; não-enviado NÃO carrega enviadoEm nem
  //   alcance > 0 (carimbo à frente do status = escrita fora da Function);
  //   'agendado' exige agendadoPara.
  const enviadoEm = data['enviadoEm'];
  if (status === 'enviado') {
    if (enviadoEm === undefined || enviadoEm === null) {
      throw new Error(`${ctx}: status "enviado" exige carimbo "enviadoEm"`);
    }
  } else {
    if (enviadoEm !== undefined && enviadoEm !== null) {
      throw new Error(
        `${ctx}: "enviadoEm" presente com status "${status}" — carimbo é ` +
          `exclusivo da Function de envio`
      );
    }
    if (alcance !== 0) {
      throw new Error(
        `${ctx}: alcance ${alcance} com status "${status}" — ∑ só existe ` +
          `após o envio`
      );
    }
  }

  const agendadoPara = data['agendadoPara'];
  if (
    (status === 'agendado' || status === STATUS_CAMPANHA_VENCIDO) &&
    (agendadoPara === undefined || agendadoPara === null)
  ) {
    throw new Error(
      `${ctx}: status "${status}" exige "agendadoPara" (foi um agendamento)`
    );
  }

  // RN-136 (decisão 17): 'vencido' exige o carimbo `vencidoEm` do cron;
  // carimbo presente fora do estado = escrita fora da Function (espelho da
  // disciplina de `enviadoEm`).
  const vencidoEm = data['vencidoEm'];
  if (status === STATUS_CAMPANHA_VENCIDO) {
    if (vencidoEm === undefined || vencidoEm === null) {
      throw new Error(`${ctx}: status "vencido" exige carimbo "vencidoEm"`);
    }
  } else if (vencidoEm !== undefined && vencidoEm !== null) {
    throw new Error(
      `${ctx}: "vencidoEm" presente com status "${status}" — carimbo é ` +
        `exclusivo do cron de disparo (RN-136)`
    );
  }

  const segmento: SegmentoCampanha = {
    tipo: seg['tipo'] as TipoSegmentoCampanha,
  };
  if (typeof seg['referencia'] === 'string') {
    segmento.referencia = seg['referencia'];
  }
  if (typeof tamanhoEstimado === 'number') {
    segmento.tamanhoEstimado = tamanhoEstimado;
  }

  const campanha: Campanha = {
    id,
    tenantId,
    titulo,
    conteudo,
    canal: canal as CanalCampanha[],
    origem,
    // Cast deliberado (DIRECTIVE acima): o dado real é o union persistido
    // (inclui 'vencido'); o campo estreita p/ StatusCampanha até o painel
    // adotar StatusCampanhaPersistido (pendência do lote Opus).
    status: status as StatusCampanha,
    segmento,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
    alcance,
  };

  if (typeof capaUrl === 'string') campanha.capaUrl = capaUrl;
  if (agendadoPara !== undefined && agendadoPara !== null) {
    campanha.agendadoPara = agendadoPara as Timestamp;
  }
  if (enviadoEm !== undefined && enviadoEm !== null) {
    campanha.enviadoEm = enviadoEm as Timestamp;
  }
  if (vencidoEm !== undefined && vencidoEm !== null) {
    campanha.vencidoEm = vencidoEm as Timestamp;
  }

  return campanha;
}
