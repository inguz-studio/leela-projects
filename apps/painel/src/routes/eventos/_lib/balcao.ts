// =============================================================================
// Derivações puras da tela do balcão (S204-T1 · §2.9). Sem I/O — reusam as
// regras de `@leela/core` (derivarPassosBalcao/podeAtender/presencaRegistrada)
// e classificam o ESTADO da tela para a galeria de estados (RN-208).
// =============================================================================

import {
  chipVinculado,
  chipForaDaFaixa,
  chipOrfao,
  derivarEstoqueChips,
  derivarPassosBalcao,
  presencaRegistrada,
  type EstoqueChips,
  type Evento,
  type FaixaChips,
  type Inscrito,
  type ItemKit,
  type KitInscrito,
  type PassoBalcao,
} from '@leela/core';
import { diasParaEvento } from './format';

/** Estado macro do balcão (§2.9 — cada um é uma tela dedicada na galeria). */
export type EstadoBalcao =
  | 'fora_janela' // evento distante: entrega ainda não abriu
  | 'vazio' // nenhum atleta identificado
  | 'completo' // inscrito já atendido (presença registrada)
  | 'atendendo'; // fluxo de passos em andamento

/**
 * Janela de entrega (afordância de UI, não RN de servidor): abre a partir de
 * `JANELA_ENTREGA_DIAS` antes da prova e enquanto o evento não é encerrado.
 */
export const JANELA_ENTREGA_DIAS = 2;

/** A janela de entrega está aberta? (evento próximo e não encerrado). @pure */
export function janelaEntregaAberta(
  evento: Pick<Evento, 'status' | 'data'>,
  agora: Date = new Date(),
): boolean {
  if (evento.status === 'encerrado') return false;
  if (evento.status === 'ao_vivo') return true;
  const dias = diasParaEvento(evento.data, agora);
  if (dias === null) return true; // sem data definida → não bloqueia o balcão
  return dias <= JANELA_ENTREGA_DIAS;
}

/**
 * Classifica o estado macro do balcão a partir da janela + inscrito em foco.
 * @pure
 */
export function estadoBalcao(
  evento: Pick<Evento, 'status' | 'data'>,
  inscrito: Inscrito | null,
  agora: Date = new Date(),
): EstadoBalcao {
  if (!janelaEntregaAberta(evento, agora)) return 'fora_janela';
  if (!inscrito) return 'vazio';
  if (presencaRegistrada(inscrito)) return 'completo';
  return 'atendendo';
}

/**
 * Índice (0-based) do passo atual/actionable do atendimento.
 * A ordem real de escrita é: vincular chip (se usaChip) → fechar (registra kit
 * + presença juntos, RN-205). O passo "kit" é físico/auto-concluído (o carimbo
 * `kitEntregueEm` nasce no fechamento). Assim o passo destacado bate sempre com
 * a ação exibida: chip pendente → "chip"; senão → "checkin" (fechar). @pure
 */
export function passoAtual(
  passos: readonly PassoBalcao[],
  inscrito: Pick<Inscrito, 'chipNumero'>,
  usaChip: boolean,
): number {
  const chipOk = typeof inscrito.chipNumero === 'string' && inscrito.chipNumero.length > 0;
  if (usaChip && !chipOk) return Math.max(0, passos.indexOf('chip'));
  return Math.max(0, passos.indexOf('checkin'));
}

/** Rótulos pt-BR dos passos do balcão (RN-216: "kit", nunca "tier"). */
export const PASSO_LABEL: Record<PassoBalcao, string> = {
  kit: 'Entregar kit',
  chip: 'Vincular chip',
  checkin: 'Check-in',
};

/** Deriva os passos + rótulos prontos para o Stepper do DS. @pure */
export function passosStepper(
  kit: Inscrito['kit'],
  usaChip: boolean,
): { id: PassoBalcao; label: string }[] {
  return derivarPassosBalcao(kit, usaChip).passos.map((id) => ({
    id,
    label: PASSO_LABEL[id],
  }));
}

/** Resumo ao vivo do balcão (painel operacional). */
export interface ResumoBalcao {
  /** Inscritos aptos (confirmados) */
  confirmados: number;
  /** Já com presença (kit retirado / check-in) */
  atendidos: number;
  /** Confirmados ainda não atendidos */
  pendentes: number;
}

/**
 * Deriva o resumo ao vivo a partir do pool de inscritos (presença = checkinEm).
 * @pure
 */
export function resumoBalcao(inscritos: readonly Inscrito[]): ResumoBalcao {
  let confirmados = 0;
  let atendidos = 0;
  for (const i of inscritos) {
    if (i.status !== 'confirmado') continue;
    confirmados += 1;
    if (presencaRegistrada(i)) atendidos += 1;
  }
  return { confirmados, atendidos, pendentes: confirmados - atendidos };
}

/**
 * Resumo detalhado do painel operacional (S204 · painel lateral): além de
 * atendidos/pendentes, os progressos de RETIRADA de kit e VÍNCULO de chip.
 * Tudo derivado dos carimbos reais do inscrito — sem inventar número.
 */
export interface ResumoBalcaoDetalhado extends ResumoBalcao {
  /** Confirmados com kit a retirar (kit != sem_kit) — denominador de kits. */
  kitElegiveis: number;
  /** Confirmados com `kitEntregueEm` (retirada física registrada — RN-205). */
  kitsEntregues: number;
  /** Confirmados com chip vinculado (`chipNumero`). */
  chipsVinculados: number;
}

/** Deriva o resumo detalhado do painel a partir do pool de inscritos. @pure */
export function resumoBalcaoDetalhado(
  inscritos: readonly Inscrito[],
): ResumoBalcaoDetalhado {
  const base = resumoBalcao(inscritos);
  let kitElegiveis = 0;
  let kitsEntregues = 0;
  let chipsVinculados = 0;
  for (const i of inscritos) {
    if (i.status !== 'confirmado') continue;
    if (i.kit !== 'sem_kit') kitElegiveis += 1;
    if (i.kitEntregueEm !== undefined && i.kitEntregueEm !== null) kitsEntregues += 1;
    if (chipVinculado(i)) chipsVinculados += 1;
  }
  return { ...base, kitElegiveis, kitsEntregues, chipsVinculados };
}

/** Ritmo do balcão (S204 · sparkline): atendimentos por hora + última hora. */
export interface RitmoBalcao {
  /** Série de atendimentos por hora, do mais antigo → mais recente (Sparkline). */
  porHora: number[];
  /** Atendimentos registrados na última hora (headline). */
  ultimaHora: number;
  /** Total de atendimentos com carimbo de presença considerados. */
  total: number;
}

/** Nº de baldes horários default da sparkline de ritmo. */
export const RITMO_JANELA_HORAS = 12;

const MS_POR_HORA = 60 * 60 * 1000;

/**
 * Deriva o ritmo de atendimento por hora a partir dos carimbos `checkinEm`
 * reais (RN-205). Baldes horários terminando em `agora`; `ultimaHora` é o
 * balde mais recente. Sem presença registrada → série vazia (a Sparkline não
 * desenha nada com < 2 pontos — estado honesto). @pure
 */
export function ritmoAtendimentos(
  inscritos: readonly Inscrito[],
  janelaHoras: number = RITMO_JANELA_HORAS,
  agora: Date = new Date(),
): RitmoBalcao {
  const millis: number[] = [];
  for (const i of inscritos) {
    const ci = i.checkinEm;
    if (ci !== undefined && ci !== null && typeof ci.toMillis === 'function') {
      millis.push(ci.toMillis());
    }
  }
  if (millis.length === 0) return { porHora: [], ultimaHora: 0, total: 0 };

  const fim = agora.getTime();
  const porHora = new Array<number>(janelaHoras).fill(0);
  for (const t of millis) {
    const horasAtras = (fim - t) / MS_POR_HORA;
    // idx 0 = balde mais antigo; janelaHoras-1 = última hora.
    const idx = janelaHoras - 1 - Math.floor(horasAtras);
    if (idx >= 0 && idx < janelaHoras) porHora[idx] = (porHora[idx] ?? 0) + 1;
  }
  return { porHora, ultimaHora: porHora[janelaHoras - 1] ?? 0, total: millis.length };
}

/**
 * Alertas de chip do balcão (S204 · FRENTE F) — DERIVADOS dos vínculos reais
 * (RN-203/205/207), nunca de contador fabricado. Cruza as regras canônicas do
 * core (`chipOrfao`, `chipForaDaFaixa`, `derivarEstoqueChips`) para a mesma
 * verdade que a Function usa. Sem `usaChip` não há alerta de chip; sem faixa
 * configurada, `foraDaFaixa` e `estoque` ficam vazios (estado honesto).
 */
export interface AlertasChipBalcao {
  /** Nomes: retiraram o kit mas não vincularam chip (chipOrfao · RN-207). */
  orfaos: string[];
  /** Nomes: chip vinculado FORA do lote do evento (chipForaDaFaixa). */
  foraDaFaixa: string[];
  /** Fotografia do estoque (derivarEstoqueChips) — null sem faixa configurada. */
  estoque: EstoqueChips | null;
}

/**
 * Deriva os alertas de chip a partir do pool de inscritos + faixa do evento.
 * @pure
 */
export function alertasChipBalcao(
  inscritos: readonly Inscrito[],
  faixaChips: FaixaChips | null,
  usaChip: boolean,
): AlertasChipBalcao {
  if (!usaChip) return { orfaos: [], foraDaFaixa: [], estoque: null };
  const orfaos: string[] = [];
  const foraDaFaixa: string[] = [];
  for (const i of inscritos) {
    if (i.status === 'cancelado') continue;
    if (chipOrfao(i, usaChip)) orfaos.push(i.atletaNome);
    if (
      faixaChips !== null &&
      chipVinculado(i) &&
      chipForaDaFaixa(i.chipNumero as string, faixaChips)
    ) {
      foraDaFaixa.push(i.atletaNome);
    }
  }
  const estoque = faixaChips !== null ? derivarEstoqueChips(inscritos, faixaChips) : null;
  return { orfaos, foraDaFaixa, estoque };
}

/**
 * Itens que compõem o kit do inscrito (checklist de conferência do balcão).
 * Filtra o catálogo `itensKit` pelos que referenciam o kit do atleta (RN-215).
 * `sem_kit` → nenhum item. Ordena tamanhados primeiro (conferência do tamanho
 * é o passo que trava a fila).
 *
 * CHAVE CANÔNICA Kit↔enum (FABLE-E-T1): `Kit.id` canônico É o valor do enum
 * (`kit_ouro`) — `item.kits[]` referencia direto, sem de-para de delimitador
 * (`kitDocId` foi removido junto com o seed legado de hífen). @pure
 */
export function itensDoKit(
  itens: readonly ItemKit[],
  kit: KitInscrito,
): ItemKit[] {
  if (kit === 'sem_kit') return [];
  return itens
    .filter((it) => it.kits.includes(kit))
    .sort((a, b) => Number(b.tamanhado) - Number(a.tamanhado));
}
