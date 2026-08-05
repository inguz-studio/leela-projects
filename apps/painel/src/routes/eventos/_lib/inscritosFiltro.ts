// =============================================================================
// Filtragem pura da lista de inscritos (S203-T2 · §2.5/§2.7).
// Busca por nome (case/acento-insensível) + filtros por status/kit/modalidade.
// Sem React/DOM — 100% testável. A tela pagina o resultado (18/página).
// =============================================================================

import type { Inscrito, KitInscrito, StatusInscrito } from '@leela/core';
import {
  STATUS_INSCRITO,
  normalizarCodigoIngresso,
  normalizarCodigoPedido,
} from '@leela/core';

export interface FiltroInscritos {
  /** Texto de busca por nome do atleta (opcional) */
  busca?: string;
  /** null/undefined = todos */
  status?: StatusInscrito | null;
  kit?: KitInscrito | null;
  modalidade?: string | null;
}

/** Normaliza para busca: minúsculas, sem acento, sem espaços nas pontas. */
export function normalizarBusca(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * O texto digitado casa o CÓDIGO do ingresso (RN-397)?
 *
 * O código é ditado no balcão e digitado na mesma caixa de busca do nome —
 * então a comparação normaliza caixa, espaço e hífen (`ab2-cd3` acha `AB2CD3`)
 * e casa por PREFIXO: o operador digita enquanto a pessoa fala. Não é fuzzy e
 * não conserta caractere ambíguo — `AB0CD3` nunca vira `ABOCD3`, porque
 * adivinhar acharia a inscrição de outra pessoa. @pure
 */
export function codigoCasaBusca(
  codigo: string | undefined,
  busca: string,
): boolean {
  if (typeof codigo !== 'string' || codigo.length === 0) return false;
  const alvo = normalizarCodigoIngresso(busca);
  return alvo.length > 0 && codigo.startsWith(alvo);
}

/**
 * O texto digitado casa o CÓDIGO da COMPRA (RN-474/RN-475)?
 *
 * Mesmo molde da RN-397, e de propósito: quem liga para o atendimento dita o
 * código da compra, e o operador digita na MESMA caixa em que já digita nome e
 * código de ingresso. O espelho do código no inscrito (`Inscrito.codigoPedido`)
 * é o que faz isso custar zero — nenhuma query, nenhum índice, nenhuma tela.
 *
 * A normalização vem do core (`normalizarCodigoPedido`): caixa, espaço, hífen
 * e o PREFIXO de apresentação. O prefixo NUNCA é reescrito aqui — ele vive numa
 * constante única do core justamente para o veto do dono (CODPED-1) custar um
 * redeploy, e não uma varredura de telas.
 *
 * Duas recusas herdadas, ambas deliberadas:
 *  • **Não conserta caractere ambíguo** — `A0B3C` jamais vira `AOB3C`. Aqui o
 *    palpite errado devolve a COMPRA de outra pessoa, não uma linha só.
 *  • **O prefixo só cai no código inteiro** (`PED-A2B3C`), porque `PEDXY` é um
 *    código legítimo. Consequência visível no balcão: digitando COM o prefixo,
 *    a linha aparece quando o quinto símbolo entra; digitando SEM ele, aparece
 *    já no primeiro. Quem dita lê o código todo, então o caminho progressivo é
 *    o de sempre. @pure
 */
export function codigoPedidoCasaBusca(
  codigoPedido: string | undefined,
  busca: string,
): boolean {
  if (typeof codigoPedido !== 'string' || codigoPedido.length === 0) return false;
  const alvo = normalizarCodigoPedido(busca);
  return alvo.length > 0 && codigoPedido.startsWith(alvo);
}

/**
 * Aplica busca + filtros. Ordem preservada (já vem ordenado por nome).
 *
 * A busca casa NOME, **ou** CÓDIGO do ingresso (RN-397), **ou** CÓDIGO da
 * compra (RN-475) — uma caixa só, como a tela já tinha, porque no balcão
 * ninguém escolhe aba antes de procurar. O contador "mostrando X de Y" segue
 * derivado deste mesmo resultado.
 * @pure
 */
export function filtrarInscritos(
  inscritos: readonly Inscrito[],
  filtro: FiltroInscritos,
): Inscrito[] {
  const alvo = filtro.busca ? normalizarBusca(filtro.busca) : '';
  return inscritos.filter((i) => {
    if (
      alvo &&
      !normalizarBusca(i.atletaNome).includes(alvo) &&
      !codigoCasaBusca(i.codigoIngresso, filtro.busca ?? '') &&
      !codigoPedidoCasaBusca(i.codigoPedido, filtro.busca ?? '')
    )
      return false;
    if (filtro.status && i.status !== filtro.status) return false;
    if (filtro.kit && i.kit !== filtro.kit) return false;
    if (filtro.modalidade && i.modalidade !== filtro.modalidade) return false;
    return true;
  });
}

/** Texto do contador "mostrando X de Y" (X = filtrados, Y = total). @pure */
export function contadorInscritos(exibidos: number, total: number): string {
  return `Mostrando ${new Intl.NumberFormat('pt-BR').format(exibidos)} de ${new Intl.NumberFormat('pt-BR').format(total)}`;
}

/** Recorta a página `pagina` (1-based) de `pageSize` itens. @pure */
export function paginar<T>(itens: readonly T[], pagina: number, pageSize: number): T[] {
  const inicio = (pagina - 1) * pageSize;
  return itens.slice(inicio, inicio + pageSize);
}

// ---------------------------------------------------------------------------
// Visibilidade de pagamento (dor #1 do Organizador: "inadimplência invisível —
// não sei quem pagou sem checar manual"). O sinal de pagamento no modelo é
// `status`: 'pendente' = ainda não pagou (deve). Estas derivações são puras e
// alimentam as contagens dos filtros e o banner de inadimplência.
// ---------------------------------------------------------------------------

export type ContagemStatus = Record<StatusInscrito, number> & { total: number };

/** Conta inscritos por status (+ total). Base das contagens dos filtros. @pure */
export function contarPorStatus(inscritos: readonly Inscrito[]): ContagemStatus {
  const base = { total: inscritos.length } as ContagemStatus;
  for (const s of STATUS_INSCRITO) base[s] = 0;
  for (const i of inscritos) if (i.status in base) base[i.status] += 1;
  return base;
}

/** Inscritos com pagamento pendente (status='pendente' = quem deve). @pure */
export function inadimplentes(inscritos: readonly Inscrito[]): Inscrito[] {
  return inscritos.filter((i) => i.status === 'pendente');
}

const HORAS_INADIMPLENCIA = 72;
const MS_POR_HORA = 60 * 60 * 1000;

/**
 * Quantos pendentes já passaram de `horas` desde a inscrição (`criadoEm`) — o
 * recorte "há mais de 72h" do banner. `agora` é injetado (determinismo em
 * teste). Timestamps sem `toMillis` são ignorados (defensivo). @pure
 */
export function contarPendentesAntigos(
  inscritos: readonly Inscrito[],
  agora: Date,
  horas: number = HORAS_INADIMPLENCIA,
): number {
  const limiteMs = agora.getTime() - horas * MS_POR_HORA;
  return inadimplentes(inscritos).filter((i) => {
    const criado = i.criadoEm;
    if (!criado || typeof criado.toMillis !== 'function') return false;
    return criado.toMillis() < limiteMs;
  }).length;
}
