// =============================================================================
// functions/src/cliente/leituraArea.ts
//
// As leituras compartilhadas da área do cliente (S1222-T1 · RN-451).
//
// Os dois callables da frente B partem do MESMO conjunto de pedidos e do mesmo
// resumo de evento. Deixar cada um montar o seu faria as duas telas
// divergirem no dia em que a fronteira mudasse — e a fronteira aqui é
// autorização, não formatação.
//
// QUAL É O VÍNCULO ENTRE PEDIDO E CONTA. Existem dois, e eles NÃO são
// equivalentes:
//
//   (a) `pedidos/{id}.contaSemFriccao.contaUid` — a conta que o e-mail da
//       compra resolveu na confirmação de pagamento. Escritor único
//       (`contaSemFriccao.ts`), coleção `write: if false`, inforjável pelo
//       cliente. É EXATAMENTE o vínculo que a RN-469 já usa para autorizar a
//       leitura do doc do pedido nas Rules — já em produção desde a S1225-T1.
//
//   (b) `pessoas/{ref}.contaUid` — o claim da FICHA de identidade por CPF, que
//       o anti-hijack de primeiro-vínculo pode ter RECUSADO.
//
// O HISTÓRICO DE COMPRAS usa (a) e mais nada, porque (b) sozinho apagaria a
// compra para terceiros: quem paga para a família toda sem se inscrever não
// tem CPF de pagador no pedido, `pessoaVinculada` fica falso, e uma lista
// construída por (b) mostraria zero compras para quem acabou de gastar o
// dinheiro. Esse é o defeito de 04/08 de novo, com outra roupa.
//
// Em compensação, (a) NÃO é usado cru: o resultado ainda passa pelo filtro de
// que `responsavel.email` seja o e-mail VERIFICADO do token. A área do cliente
// fica, assim, estritamente mais fechada que a Rule da RN-469 — que autoriza o
// mesmo documento sem exigir verificação de e-mail nenhuma. É a leitura que
// não piora a fronteira do POSSE-EMAIL-1, como a lane tem ordem de fazer.
//
// SEM ÍNDICE COMPOSTO NOVO: a query tem UMA igualdade e nenhum `orderBy` — o
// índice automático de subcampo de mapa dá conta. A ordenação é feita em
// memória sobre o teto abaixo. Trocar isto por `orderBy('criadoEm')` exigiria
// índice composto e um passo de deploy que a lane não controla.
// =============================================================================

import type * as admin from 'firebase-admin';
import type { ContaDoCliente, Db } from './gateAreaCliente';

/**
 * Teto de compras lidas por conta. Um comprador de bem-estar com mais de 200
 * compras é caso de paginação, não de lista — e a lista da área é "simples",
 * na palavra do dono. O teto é declarado aqui para que o dia em que ele
 * apertar seja uma decisão, e não uma surpresa.
 */
export const TETO_PEDIDOS_DA_CONTA = 200;

export interface ResumoEventoArea {
  id: string;
  nome: string;
  slug: string;
  /** Data do evento em ISO 8601 (UTC). null = doc sem data legível. */
  dataIso: string | null;
  /** Milissegundos da data do evento — o recorte próximos/passados. */
  dataMillis: number | null;
  local: string;
  tenantId: string;
}

/** Snapshot de pedido que passou o gate, com o que as duas telas consomem. */
export interface PedidoDaConta {
  id: string;
  eventoId: string;
  criadoEmMillis: number;
  snap: admin.firestore.DocumentSnapshot;
}

/**
 * Converte um valor de campo do Firestore em milissegundos, aceitando
 * `Timestamp`, `Date` e número. Doc corrompido devolve null em vez de lançar:
 * uma compra com carimbo torto ainda é uma compra que a pessoa fez, e sumir
 * com ela seria a mentira que a RN-451 proíbe.
 */
export function millisDoCampo(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (valor instanceof Date) return valor.getTime();
  const comToMillis = valor as { toMillis?: () => number };
  if (typeof comToMillis.toMillis === 'function') {
    const ms = comToMillis.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/** ISO 8601 de um campo de data, ou null. */
export function isoDoCampo(valor: unknown): string | null {
  const ms = millisDoCampo(valor);
  if (ms === null) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Os pedidos da conta, do mais recente para o mais antigo.
 *
 * O filtro de e-mail acontece em MEMÓRIA de propósito: a query já é o
 * isolamento (só documentos carimbados com este uid chegam aqui), e a segunda
 * condição é uma RE-CHECAGEM de leitor, não um segundo isolamento. Escrevê-la
 * como `where('responsavel.email','==',…)` faria a lista depender de um índice
 * composto sem ganhar nenhuma garantia.
 */
export async function lerPedidosDaConta(
  db: Db,
  conta: ContaDoCliente
): Promise<PedidoDaConta[]> {
  const snap = await db
    .collection('pedidos')
    .where('contaSemFriccao.contaUid', '==', conta.uid)
    .limit(TETO_PEDIDOS_DA_CONTA)
    .get();

  const pedidos: PedidoDaConta[] = [];
  for (const doc of snap.docs) {
    const email = doc.get('responsavel.email') as unknown;
    if (typeof email !== 'string' || email.trim().toLowerCase() !== conta.email) continue;
    const eventoId = doc.get('eventoId') as unknown;
    if (typeof eventoId !== 'string' || eventoId.length === 0) continue;
    pedidos.push({
      id: doc.id,
      eventoId,
      criadoEmMillis: millisDoCampo(doc.get('criadoEm')) ?? 0,
      snap: doc,
    });
  }

  pedidos.sort((a, b) => {
    if (b.criadoEmMillis !== a.criadoEmMillis) return b.criadoEmMillis - a.criadoEmMillis;
    return a.id < b.id ? -1 : 1;
  });
  return pedidos;
}

/**
 * Resumo dos eventos citados, por point read e sem repetir id. A experiência é
 * pública (`eventos/{slug}` é lido pela vitrine sem sessão), então nada aqui é
 * dado novo — é o nome e a data que a pessoa já viu quando comprou.
 */
export async function lerResumoDosEventos(
  db: Db,
  eventoIds: readonly string[]
): Promise<Map<string, ResumoEventoArea>> {
  const unicos = [...new Set(eventoIds)].filter((id) => id.length > 0);
  const mapa = new Map<string, ResumoEventoArea>();
  if (unicos.length === 0) return mapa;

  const snaps = await db.getAll(...unicos.map((id) => db.collection('eventos').doc(id)));
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const data = snap.get('data');
    mapa.set(snap.id, {
      id: snap.id,
      nome: (snap.get('nome') as string | undefined) ?? '',
      slug: (snap.get('slug') as string | undefined) ?? snap.id,
      dataIso: isoDoCampo(data),
      dataMillis: millisDoCampo(data),
      local: (snap.get('local') as string | undefined) ?? '',
      tenantId: (snap.get('tenantId') as string | undefined) ?? '',
    });
  }
  return mapa;
}
