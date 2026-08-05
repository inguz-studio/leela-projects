// =============================================================================
// @leela/api-client — a área do cliente (S1222-T1 · RN-451)
//
// Wrappers tipados dos dois callables do PRÓPRIO dono da conta. Os contratos
// abaixo são o ESPELHO dos de `functions/src/cliente/*` — o cliente não
// depende de `functions`, e é por isso que os tipos são declarados aqui em vez
// de importados de lá.
//
// POR QUE CALLABLE E NÃO QUERY. `pedidos` e `eventos/{id}/inscritos` são
// tenant-scoped e fechadas ao papel `athlete` nas Rules, e a fila ADMINSEP
// proíbe abri-las. O servidor devolve a PROJEÇÃO — nunca o doc inteiro — e
// cunha o link assinado do ingresso sem que a chave de assinatura desça para
// o navegador.
//
// O `estado` NÃO É DECORAÇÃO. `ok` com lista vazia significa "não há compras";
// os outros dois significam "a pergunta não pôde ser feita". A tela precisa
// dizer coisas diferentes nos três casos — a RN-451 proíbe a lista vazia que
// finge ser resposta.
// =============================================================================

import { httpsCallable } from 'firebase/functions';
import { getLeelaFunctions } from './firebase';

/**
 * Por que a leitura da área pode não acontecer:
 * - `ok` — aconteceu; a lista é verdade, inclusive quando é vazia;
 * - `sessao_anonima` — a sessão é a ANÔNIMA do checkout, que não é identidade;
 * - `email_nao_verificado` — a conta existe mas não provou posse do e-mail.
 */
export type EstadoAreaCliente = 'ok' | 'sessao_anonima' | 'email_nao_verificado';

/** Ciclo financeiro da compra (espelho de `StatusPedido` do core). */
export type StatusCompraCliente = 'pendente' | 'pago' | 'falhou' | 'cancelado';

/** Ciclo da inscrição (espelho de `StatusInscrito` do core). */
export type StatusIngressoCliente = 'confirmado' | 'pendente' | 'cancelado' | 'estornado';

/** Uma linha do histórico de compras. */
export interface CompraDaConta {
  pedidoId: string;
  /** Os cinco símbolos, sem prefixo (RN-474). null = compra pré-S1228. */
  codigoPedido: string | null;
  eventoId: string;
  eventoNome: string;
  eventoSlug: string;
  eventoDataIso: string | null;
  status: StatusCompraCliente;
  valorTotal: number;
  formaPagamento: string | null;
  participantes: number;
  compradoEmIso: string | null;
}

export interface GetMinhasComprasResult {
  estado: EstadoAreaCliente;
  compras: CompraDaConta[];
}

/** Um ingresso da conta — do titular, que pode não ser o dono da conta. */
export interface IngressoDaConta {
  inscritoId: string;
  eventoId: string;
  eventoNome: string;
  eventoSlug: string;
  eventoDataIso: string | null;
  eventoLocal: string;
  titular: string;
  modalidade: string;
  status: StatusIngressoCliente;
  /** Código legível do ingresso (RN-396). null = ainda não emitido. */
  codigoIngresso: string | null;
  emitido: boolean;
  /** URL assinada da página do ingresso (RN-452). null = sem link possível. */
  linkIngresso: string | null;
}

export interface GetMeusIngressosResult {
  estado: EstadoAreaCliente;
  proximos: IngressoDaConta[];
  passados: IngressoDaConta[];
  /** false = a lista pode estar incompleta, e a tela precisa dizer isso. */
  listaCompleta: boolean;
}

/**
 * Histórico de compras do próprio dono da conta. O recorte de autorização é do
 * servidor: só chegam pedidos cujo e-mail do comprador é o e-mail VERIFICADO
 * desta conta.
 */
export async function getMinhasCompras(): Promise<GetMinhasComprasResult> {
  const fn = httpsCallable<Record<string, never>, GetMinhasComprasResult>(
    getLeelaFunctions(),
    'getMinhasCompras'
  );
  const res = await fn({});
  return res.data;
}

/**
 * Ingressos do próprio dono da conta, já separados em próximos e passados pelo
 * relógio do SERVIDOR (o navegador não decide "já passou?" — fuso e relógio da
 * máquina da pessoa não são regra de negócio).
 */
export async function getMeusIngressos(): Promise<GetMeusIngressosResult> {
  const fn = httpsCallable<Record<string, never>, GetMeusIngressosResult>(
    getLeelaFunctions(),
    'getMeusIngressos'
  );
  const res = await fn({});
  return res.data;
}
