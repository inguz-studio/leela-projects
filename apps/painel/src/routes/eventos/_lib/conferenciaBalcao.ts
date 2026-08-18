// =============================================================================
// Conferência de balcão — a derivação PURA do card que o operador lê enquanto a
// pessoa está na frente dele (CRED-BUSCA · 17/08).
//
// POR QUE EXISTE. A busca do credenciamento devolvia o NOME e nada mais, e a
// ficha que vinha depois trazia nome + modalidade + selo do kit. Quem credencia
// não tinha como conferir se a pessoa na fila é a dona daquela inscrição: nem
// lote, nem contato de compra, e o tamanho do kit escondido atrás de um catálogo
// que pode estar vazio. O dono achou isso EM USO, no balcão do mock.
//
// O CARD É DE CONFERÊNCIA, NÃO É A FICHA. "Não precisa tudo" — a ficha inteira
// já existe e mora no slide-in dos Inscritos (`InscritoSlideIn`, 4 abas). Aqui
// entram os seis campos que respondem "é essa pessoa, e é isso que ela comprou",
// porque densidade de balcão é uma fila esperando, não uma auditoria.
//
// ⚠️ CPF FICA DE FORA, DE PROPÓSITO. Ele virou CHAVE DE BUSCA nesta mesma lane
// (`inscritosFiltro.cpfCasaBusca`) e não vira campo exibido: a tela do balcão
// fica virada para um salão com gente atrás na fila, e o CPF é o identificador
// que mais machuca quando vaza. Buscar por CPF sem nunca mostrar CPF é a postura
// inteira desta lane, e ela é deliberada — não é campo esquecido.
//
// A AUSÊNCIA TEM CAUSA, E A CAUSA APARECE. Três dos campos (lote, e-mail e
// telefone de compra) moram em `pedidos`/`pagamentos`, e a taxonomia das Rules
// nega essas duas coleções a papel de EVENTO (`firestore.rules:2739` e `:2599`
// exigem `isTenantWriter`) — que é justamente o papel que serve o balcão. Um
// operador puro vai ver o card degradado, e precisa saber POR QUÊ: um traço
// mudo faria ele concluir que a pessoa comprou sem e-mail. `ausenciaDaCompra`
// devolve a frase certa para cada estado, e `DefinitionItem.emptyLabel` a
// carrega. Mesmo espírito do `FichaDoClienteDrawer`, que já sobrescreve a
// ausência campo a campo.
// =============================================================================

import type { Inscrito, Kit, Pagamento, Pedido } from '@leela/core';
import { kitInscritoLabel } from './kitLabels';
import { rotuloSufixo } from './gradeTamanhos';
import { formatarTelefone } from './pii';

/** Separador dos itens do kit e dos tamanhos — o mesmo do resto do painel. */
const SEPARADOR = ' · ';

/**
 * Em que pé está a leitura de `pedido`/`pagamento` do inscrito em foco.
 *
 * `negada` e `sem_pedido` são coisas DIFERENTES e a tela não pode confundi-las:
 * a primeira é "este operador não tem permissão", a segunda é "esta inscrição
 * não tem compra registrada" (legado pré-ADR-011). Dizer "sem compra" para quem
 * só não pode ler seria mentira sobre o dado da pessoa.
 */
export type EstadoCompra = 'carregando' | 'lida' | 'negada' | 'sem_pedido';

/**
 * Deriva o estado da leitura a partir do que o hook devolve.
 *
 * Qualquer erro cai em `negada` — e isso é uma simplificação CONSCIENTE.
 * `getPedidoEPagamentoDoInscrito` traduz `permission-denied` em
 * `VinculoPedidoCorrompidoError` (`inscritoPedido.ts:128`), tradução escrita
 * para o slide-in dos Inscritos, onde o leitor é sempre `isTenantWriter` e
 * portanto a negação só poderia ser ref pendurada. No balcão a premissa cai: o
 * operador de evento recebe negação legítima com nome de vínculo corrompido.
 * Separar os dois exigiria mexer no api-client, e o balcão não precisa da
 * distinção — para quem está atendendo, os dois casos são "não consegui ler a
 * compra". A distinção fica registrada no handoff como achado. @pure
 */
export function estadoDaCompra(
  loading: boolean,
  erro: Error | null,
  pedido: Pedido | null,
): EstadoCompra {
  if (erro !== null) return 'negada';
  if (loading) return 'carregando';
  return pedido === null ? 'sem_pedido' : 'lida';
}

/** A frase da ausência, por estado — nunca um traço mudo. @pure */
export function ausenciaDaCompra(estado: EstadoCompra): string {
  switch (estado) {
    case 'carregando':
      return 'Carregando…';
    case 'negada':
      return 'Sem permissão para ler a compra';
    case 'sem_pedido':
      return 'Inscrição sem compra registrada';
    case 'lida':
      return 'Não informado';
  }
}

/**
 * Os tamanhos ESCOLHIDOS pelo inscrito, em rótulo de gente.
 *
 * O valor guardado é sufixo de SKU (`'M'` ou `'feminina__M'` — RN-223/231), um
 * por item tamanhado. Repetição some: kit com camiseta e regata no mesmo M
 * lê "M", não "M · M". A ordem segue a das chaves, que é a do checkout. @pure
 */
export function tamanhosEscolhidos(tamanhos: Record<string, string>): string {
  const rotulos: string[] = [];
  for (const sufixo of Object.values(tamanhos)) {
    const rotulo = rotuloSufixo(sufixo);
    if (!rotulos.includes(rotulo)) rotulos.push(rotulo);
  }
  return rotulos.join(SEPARADOR);
}

/**
 * O kit COBRADO, achado pelo id exato (`kitId` — fulfillment E12).
 *
 * Por `kitId` e não pelo enum `kit`: o enum colapsa os kits custom do
 * organizador em `sem_kit` (RN-202), então casar por ele entregaria o kit errado
 * no balcão. Ausente (doc legado) ou null (sem kit) devolve null, e a tela
 * declara a ausência. @pure
 */
export function kitCobrado(
  kits: readonly Kit[],
  kitId: string | null | undefined,
): Kit | null {
  if (typeof kitId !== 'string' || kitId.length === 0) return null;
  return kits.find((k) => k.id === kitId) ?? null;
}

/** O que o operador lê no card, campo a campo. `''` = ausente. */
export interface ConferenciaBalcao {
  /** Nome completo do participante. */
  nome: string;
  /** Modalidade — a string É o rótulo (não há doc de modalidade). */
  modalidade: string;
  /** Rótulo do lote (`Pagamento.loteNome`, 🔁 desnormalizado). */
  lote: string;
  /** Rótulo do kit pelo enum — sempre disponível, vem do próprio inscrito. */
  kitLabel: string;
  /** "O que está incluso" em linguagem de produto (`Kit.itens` — RN-230). */
  incluso: string;
  /** Tamanho(s) escolhido(s). */
  tamanho: string;
  /** E-mail do responsável pela compra. */
  emailCompra: string;
  /**
   * Telefone do responsável pela compra, JÁ formatado para leitura em voz alta
   * — o banco guarda só dígitos (`normalizarTelefone` no checkout) e ler
   * "48999990001" de um balcão barulhento é como não ter o número.
   *
   * Em claro, e não mascarado como no slide-in dos Inscritos: lá a lista é
   * densa e o organizador está conferindo cadastro; aqui o dono pediu o contato
   * de compra explicitamente, e o card só existe DEPOIS de o operador escolher
   * uma pessoa — não é despejo de lista. O CPF, que seria o dado pior de
   * expor, fica fora do card inteiro.
   */
  telefoneCompra: string;
  /** Inscrição sem kit — muda a frase de ausência de `incluso`/`tamanho`. */
  semKit: boolean;
}

export interface ConferenciaParams {
  inscrito: Inscrito;
  /** Kits do evento — para achar o cobrado por `kitId`. */
  kits: readonly Kit[];
  /** null enquanto carrega, negado ou sem compra. */
  pedido: Pedido | null;
  /** null quando o pedido ainda não gerou cobrança. */
  pagamento: Pagamento | null;
}

/**
 * Monta o card de conferência.
 *
 * Cada campo sai do doc que o operador tem MAIS chance de conseguir ler: nome,
 * modalidade e tamanho vêm do inscrito; o incluso, do kit — e as Rules dão as
 * duas coleções ao papel de evento (`:931` e `:1039`). Só lote e contato de
 * compra dependem de `pedidos`/`pagamentos`, que o papel de evento não lê. Não
 * é acaso: é o que sobra depois de escolher a fonte legível para tudo que tinha
 * escolha. O `Kit.itens` em vez do catálogo `itensKit`, em particular, é o que
 * faz o incluso e o tamanho aparecerem mesmo quando o catálogo está vazio — que
 * é, muito provavelmente, o estado em que o dono encontrou a tela. @pure
 */
export function conferenciaDoInscrito({
  inscrito,
  kits,
  pedido,
  pagamento,
}: ConferenciaParams): ConferenciaBalcao {
  const kit = kitCobrado(kits, inscrito.kitId);
  const semKit = inscrito.kit === 'sem_kit';

  return {
    nome: inscrito.atletaNome,
    modalidade: inscrito.modalidade,
    lote: pagamento?.loteNome ?? '',
    kitLabel: kitInscritoLabel(inscrito.kit),
    incluso: semKit ? '' : (kit?.itens ?? []).join(SEPARADOR),
    tamanho: semKit ? '' : tamanhosEscolhidos(inscrito.tamanhos),
    emailCompra: pedido?.responsavel.email ?? '',
    telefoneCompra: formatarTelefone(pedido?.responsavel.telefone ?? ''),
    semKit,
  };
}
