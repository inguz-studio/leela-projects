// =============================================================================
// functions/src/cliente/minhasCompras.ts
//
// `getMinhasCompras` — o histórico de compras do PRÓPRIO dono da conta
// (S1222-T1 · RN-451). Molde do `getCheckoutPrefill`: callable do próprio
// dono, Rules intocadas (ver o cabeçalho de `gateAreaCliente.ts`).
//
// O QUE A PROJEÇÃO DEIXA DE FORA, E POR QUÊ. O doc de pedido carrega PII do
// comprador (endereço, telefone, e-mail) e a decomposição monetária por
// inscrito. O comprador tem direito a tudo isso — a RN-469 já o autoriza a ler
// o documento inteiro —, mas a LISTA não precisa disso para existir, e cada
// campo que atravessa a fronteira sem ser usado é um campo que alguém vai
// logar sem querer. A lista devolve o que a lista mostra. O detalhe da compra
// continua onde já está: a tela de consulta do pedido (S1225), que lê o doc
// direto pela RN-469.
//
// `codigoPedido` AUSENTE É AUSENTE (RN-475). Compras anteriores à S1228 não
// têm o código curto; a lista devolve `null` e a UI não põe o id no lugar. Um
// identificador que a pessoa não consegue ditar por telefone não é um
// identificador, é ruído com cara de dado.
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { isCodigoPedidoValido, isStatusPedido, type StatusPedido } from '@leela/core';
import {
  callerDoToken,
  resolverContaDoCliente,
  type CallerAreaCliente,
  type Db,
  type EstadoAreaCliente,
} from './gateAreaCliente';
import { isoDoCampo, lerPedidosDaConta, lerResumoDosEventos } from './leituraArea';

/** Uma linha do histórico — o que a lista da área mostra, e nada além. */
export interface CompraDaConta {
  pedidoId: string;
  /** Os cinco símbolos, sem prefixo (RN-474). null = compra pré-S1228. */
  codigoPedido: string | null;
  eventoId: string;
  eventoNome: string;
  eventoSlug: string;
  /** Data da experiência em ISO 8601. null = evento sem data legível. */
  eventoDataIso: string | null;
  status: StatusPedido;
  valorTotal: number;
  /** Espelho de `pagamentos.forma`; null antes da cobrança. */
  formaPagamento: string | null;
  /** Quantos participantes entraram nesta compra (ADR-011 — sempre ≥ 1). */
  participantes: number;
  /** Quando a compra foi feita, ISO 8601. null = carimbo ilegível. */
  compradoEmIso: string | null;
}

export interface GetMinhasComprasResult {
  estado: EstadoAreaCliente;
  compras: CompraDaConta[];
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function getMinhasComprasCore(
  db: Db,
  caller: CallerAreaCliente
): Promise<GetMinhasComprasResult> {
  const resolucao = await resolverContaDoCliente(db, caller);
  if (resolucao.estado !== 'ok') return { estado: resolucao.estado, compras: [] };

  const pedidos = await lerPedidosDaConta(db, resolucao.conta);
  const eventos = await lerResumoDosEventos(
    db,
    pedidos.map((p) => p.eventoId)
  );

  const compras: CompraDaConta[] = pedidos.map((pedido) => {
    const evento = eventos.get(pedido.eventoId);
    const statusBruto = pedido.snap.get('status') as unknown;
    const codigo = pedido.snap.get('codigoPedido') as unknown;
    const forma = pedido.snap.get('formaPagamento') as unknown;
    const refs = pedido.snap.get('inscritoRefs') as unknown;
    const valor = pedido.snap.get('valorTotal') as unknown;
    return {
      pedidoId: pedido.id,
      codigoPedido: isCodigoPedidoValido(codigo) ? (codigo as string) : null,
      eventoId: pedido.eventoId,
      eventoNome: evento?.nome ?? '',
      eventoSlug: evento?.slug ?? pedido.eventoId,
      eventoDataIso: evento?.dataIso ?? null,
      // Status fora da lista canônica degrada para 'pendente': a compra
      // existe, e esconder a linha por causa de um enum torto seria a lista
      // que mente. `pendente` é o estado que não promete nada.
      status: isStatusPedido(statusBruto) ? statusBruto : 'pendente',
      valorTotal: typeof valor === 'number' && Number.isFinite(valor) ? valor : 0,
      formaPagamento: typeof forma === 'string' && forma.length > 0 ? forma : null,
      participantes: Array.isArray(refs) ? refs.length : 0,
      compradoEmIso: isoDoCampo(pedido.snap.get('criadoEm')),
    };
  });

  logger.info('area_cliente_compras', { uid: caller.uid, qtd: compras.length }); // sem PII
  return { estado: 'ok', compras };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** Histórico de compras do próprio dono da conta (RN-451). */
export const getMinhasCompras = https.onCall(async (_data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return getMinhasComprasCore(
    admin.firestore(),
    callerDoToken(context.auth as Parameters<typeof callerDoToken>[0])
  );
});
