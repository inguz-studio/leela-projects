// =============================================================================
// functions/src/eventos/ingressosPendentes.ts
//
// EXTRATO DE PENDÊNCIA DO INGRESSO ÓRFÃO (item 54 · RN-382).
//
// O ÓRFÃO: o pedido foi PAGO, a confirmação entrou, e a emissão do ingresso
// falhou logo depois — `sem_codigo_livre` (as 8 tentativas de sorteio
// esgotadas), keyring ausente, ou qualquer erro transitório no meio da
// varredura de inscritos. O dinheiro entrou; ninguém tem ingresso. E, como a
// review INGQR-REV provou, NENHUMA re-entrega do gateway volta a tentar: a
// segunda entrega do mesmo eventId morre como duplicada e a de outro eventId
// morre por estado já final, as duas ANTES de olhar o pedido. A única janela
// de emissão era a primeira entrega.
//
// Este módulo é o GÊMEO do extrato que o item 27 construiu para o retardatário
// do dinheiro (`estornosOrfaosPendentes`, RN-380): mesmo formato (doc top-level
// por chave do caso, `resolvido` + contador + carimbos), mesma cadência de
// varredura (15 min), mesmo padrão de alerta. O que muda é o que se recupera —
// lá dinheiro, aqui credencial —, e por isso a resolução é outra: em vez de um
// POST no gateway, a re-tentativa da própria emissão.
//
// Deliberadamente SEM importar `emitirIngressos`: este arquivo é só o registro.
// Quem detecta (o disparo pós-confirmação) e quem cura (a varredura) importam
// daqui, nunca o contrário — uma direção só, sem ciclo de módulo.
//
// A coleção NÃO tem `match` em firestore.rules DE PROPÓSITO: cai no
// deny-by-default, como `estornosOrfaosPendentes`. É registro operacional, não
// tem leitor cliente; e um cliente que escrevesse aqui poderia marcar como
// resolvida uma pendência viva (o comprador nunca receberia o ingresso).
// =============================================================================

import type * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

type Db = admin.firestore.Firestore;

/** Coleção top-level do EXTRATO de pedidos pagos sem ingresso (RN-382). */
export const INGRESSOS_PENDENTES_COL = 'ingressosPendentes';

/**
 * Quantas varreduras re-tentam antes de o caso virar conferência humana.
 * Oito passagens de 15 minutos = duas horas de auto-cura. Depois disso, a
 * causa não é transitória: insistir a cada 15 minutos para sempre só gasta
 * transação e afoga o alerta que importa. O mesmo número do sorteio de código
 * (`TENTATIVAS_CODIGO_INGRESSO`), pela mesma razão — oito falhas seguidas não
 * são azar, são sinal.
 */
export const TENTATIVAS_VARREDURA_INGRESSO = 8;

/** Por que este pedido entrou no extrato (o que a detecção viu). */
export type MotivoPendenciaIngresso =
  /** A emissão rodou e deixou inscrito elegível sem ingresso (`falhas > 0`). */
  | 'emissao_incompleta'
  /** A emissão nem chegou a rodar (sem keyring, evento sem tenant, ...). */
  | 'emissao_nao_processada'
  /** O disparo pós-confirmação explodiu — o erro que o best-effort engolia. */
  | 'disparo_falhou';

export interface RegistroIngressoPendente {
  pedidoId: string;
  /** null quando a emissão parou antes de saber o evento. */
  eventoId: string | null;
  motivo: MotivoPendenciaIngresso;
  /** Inscritos elegíveis que ficaram sem ingresso (0 = a emissão nem rodou). */
  falhas: number;
  /** Texto curto do porquê — `motivo` do resultado ou mensagem do erro. */
  detalhe?: string;
}

/**
 * Grava (ou acumula) a pendência no ponto da falha.
 *
 * docId = pedidoId: a segunda detecção do MESMO pedido acumula
 * (`deteccoes` + 1) em vez de duplicar a pendência — igual ao `entregas` do
 * extrato do item 27.
 *
 * Uma detecção NUNCA des-resolve um extrato já resolvido (a mesma regra da
 * RN-380): `resolvido` só é escrito no nascimento. Aqui isso é ainda mais
 * seguro que lá — ingresso emitido é idempotente por inscrito, então a falha
 * que resolveu não pode voltar a acontecer para o mesmo pedido.
 */
export async function registrarIngressoPendente(
  db: Db,
  registro: RegistroIngressoPendente
): Promise<void> {
  const ref = db.collection(INGRESSOS_PENDENTES_COL).doc(registro.pedidoId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    tx.set(
      ref,
      {
        ...registro,
        ...(snap.exists
          ? {}
          : {
              resolvido: false,
              tentativasVarredura: 0,
              esgotado: false,
              detectadoEm: FieldValue.serverTimestamp(),
            }),
        deteccoes: FieldValue.increment(1),
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

/**
 * Fecha a pendência. Só toca em doc que EXISTE: o caminho feliz (emissão
 * completa na primeira entrega) não deixa lixo nesta coleção.
 *
 * @returns true se havia pendência aberta e ela foi fechada agora.
 */
export async function resolverIngressoPendente(
  db: Db,
  pedidoId: string,
  extras: Record<string, unknown> = {}
): Promise<boolean> {
  const ref = db.collection(INGRESSOS_PENDENTES_COL).doc(pedidoId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    if (snap.get('resolvido') === true) return false;
    tx.set(
      ref,
      {
        ...extras,
        resolvido: true,
        resolvidoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  });
}

/**
 * Carimba mais uma re-tentativa da varredura e devolve o total.
 * `esgotado` é o gatilho do alerta contável: a partir dele a varredura para de
 * re-tentar e o caso passa a ser conferência humana (mesma postura dos
 * carimbos `gateway_sem_resposta`/`divergencia_valor` do item 27).
 */
export async function carimbarTentativaIngresso(
  db: Db,
  pedidoId: string,
  extras: Record<string, unknown> = {}
): Promise<{ tentativas: number; esgotado: boolean }> {
  const ref = db.collection(INGRESSOS_PENDENTES_COL).doc(pedidoId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const anteriores =
      typeof snap.get('tentativasVarredura') === 'number'
        ? (snap.get('tentativasVarredura') as number)
        : 0;
    const tentativas = anteriores + 1;
    const esgotado = tentativas >= TENTATIVAS_VARREDURA_INGRESSO;
    tx.set(
      ref,
      {
        ...extras,
        tentativasVarredura: tentativas,
        esgotado,
        ...(esgotado && snap.get('esgotado') !== true
          ? { esgotadoEm: FieldValue.serverTimestamp() }
          : {}),
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { tentativas, esgotado };
  });
}
