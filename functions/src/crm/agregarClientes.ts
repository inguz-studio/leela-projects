// =============================================================================
// functions/src/crm/agregarClientes.ts
//
// CRM do organizador — manutenção do cliente consolidado cross-evento por
// Cloud Function (E19 · S-R9-13-T1 · RN-172).
//
// Doc mantido: `tenants/{tenantId}/crmClientes/{clienteKey}` — escrita
// EXCLUSIVA de Function (Rules: write false; leitura SÓ isTenantWriter —
// nunca promoter/afiliado/patrocinador/coordenador; nem platform_admin via
// client SDK). A futura aba CRM LÊ este doc — nunca varre inscritos/pedidos
// no cliente (padrão RN-820 de projeção fechada; aqui a projeção é
// INDIVIDUAL, categoria distinta: PII gated).
//
// PII (LGPD) — fronteira e minimização (RN-172):
//   - fonte = inscrito ([reg]: nascimento/genero + atletaNome) e pedido
//     (valorFinal/taxaRepassada da linha; e-mail do responsável SÓ como
//     insumo de chave), lidos SERVER-SIDE dentro da transação;
//   - o doc materializado carrega SÓ nome, nascimento (→ idade/aniversário),
//     gênero, contagens e valores — NUNCA CPF, telefone, cidade/UF, contato
//     de emergência ou restrição médica;
//   - o VALOR da chave de linking (CPF/e-mail) não é persistido: docId =
//     `{tipo}_{sha256(tenantId:tipo:valor)[0:32]}`. O salt por tenant impede
//     correlacionar a MESMA pessoa entre tenants pela igualdade do docId
//     (review antagonista E19) e nada reversível fica em path/log.
//
// LEDGER FECHADO + TRANSAÇÃO (race-safe): cada cliente carrega o mapa
// `inscricoes` (uma entrada por inscrição confirmada/estornada, chave
// determinística `{eventoId}_{inscritoId}`). O gatilho recomputa o agregado
// SÓ a partir desse mapa (computeCrmCliente — @leela/core, nunca
// reimplementado) numa transação: dois writes concorrentes do mesmo cliente
// serializam por retry otimista — nenhum incremento cego, nenhum lost
// update. Reprocessar (at-least-once) sobrescreve a MESMA entrada — quando
// nada muda, NENHUMA escrita acontece (`atualizadoEm` intocado prova o
// no-op, padrão agregarDemografia).
//
// MUDANÇA DE CHAVE (correção de CPF / [reg] chegando depois): a entrada
// migra — remove do doc da chave ANTIGA (doc vazio é DELETADO — expurgo
// natural; remoção de inscrito idem) e regrava na nova. LIMITAÇÃO
// DOCUMENTADA: entrega fora de ordem de eventos ANTIGOS do trigger pode
// deixar entrada órfã na chave antiga até o próximo write do inscrito
// (mesma classe da limitação de data do agregarDemografia).
//
// GATILHO: onWrite de `eventos/{e}/inscritos/{i}` — convive com
// onInscritoWrite/Estoque/Demografia/Virada/Automacao (agregados
// independentes no mesmo path). Pendente/cancelada NÃO entra (P-E19-6:
// quem não comprou não ganha perfil de CRM — dado mínimo). O write de
// `crmClientes` não redispara — sem loop.
//
// RECONCILIAÇÃO COM E06 (comunicação — adendo do Vitor 09:14): NADA muda em
// enviarCampanha/estimarAlcance/automações (audiência por EVENTO segue
// dona do fluxo). O CRM passa a ser a FONTE DE AUDIÊNCIA do hub central
// (S-R9-13-T4, lote de UI): o mapa `eventos` de cada cliente permite
// segmentar "clientes que participaram do evento X" e o disparo REUSARÁ o
// pipeline único executarDisparoCampanha por evento — vínculo registrado
// no épico E19, sem tocar no que roda.
// =============================================================================

import { createHash } from 'node:crypto';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  computeCrmCliente,
  crmClienteInalterado,
  derivarIdentidadeCliente,
  isDataEventoISO,
  isGeneroInscrito,
  parseCrmCliente,
  SUBCOLECAO_CRM_CLIENTES,
  type CrmClienteDoc,
  type CrmInscricaoEntry,
  type GeneroInscrito,
  type IdentidadeCliente,
} from '@leela/core';

type Db = admin.firestore.Firestore;
type DocData = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Chave do cliente (docId) — hash com salt por tenant, nada reversível
// ---------------------------------------------------------------------------

/**
 * DocId do cliente CRM: `{tipo}_{sha256(tenantId:tipo:valor)[0:32]}`.
 * Determinístico por (tenant, identidade); o valor em claro (CPF/e-mail)
 * NUNCA aparece em path, doc ou log (minimização RN-172). O tenantId no
 * hash impede correlação cross-tenant da mesma pessoa por igualdade de id.
 */
export function clienteDocId(tenantId: string, id: IdentidadeCliente): string {
  const digest = createHash('sha256')
    .update(`${tenantId}:${id.tipo}:${id.valor}`)
    .digest('hex')
    .slice(0, 32);
  return `${id.tipo}_${digest}`;
}

// ---------------------------------------------------------------------------
// Derivações do snapshot do inscrito (+ pedido) — tudo server-side
// ---------------------------------------------------------------------------

/** Campos do inscrito que o CRM consome (leitura defensiva, nunca parse total
 *  — doc legado fora do contrato de parseInscrito não pode travar o CRM). */
interface InscritoCrmView {
  tenantId: string;
  atletaId: string;
  atletaNome: string;
  status: string;
  pedidoRef: string | null;
  ehResponsavel: boolean;
  cpf: unknown;
  nascimento: string | null;
  genero: GeneroInscrito | null;
  atualizadoEmMs: number;
}

function viewInscrito(data: DocData | null): InscritoCrmView | null {
  if (data === null) return null;
  const tenantId = typeof data['tenantId'] === 'string' ? data['tenantId'] : '';
  const atletaId = typeof data['atletaId'] === 'string' ? data['atletaId'] : '';
  if (tenantId.length === 0 || atletaId.length === 0) return null; // corrompido
  const dados = (data['dadosPessoais'] ?? {}) as DocData;
  const nascimentoRaw = dados['nascimento'];
  const generoRaw = dados['genero'];
  const atualizadoEm = data['atualizadoEm'] as { toMillis?: () => number } | undefined;
  return {
    tenantId,
    atletaId,
    atletaNome: typeof data['atletaNome'] === 'string' ? data['atletaNome'] : '',
    status: typeof data['status'] === 'string' ? data['status'] : '',
    pedidoRef: typeof data['pedidoRef'] === 'string' ? data['pedidoRef'] : null,
    ehResponsavel: data['ehResponsavel'] === true,
    cpf: dados['cpf'],
    nascimento: isDataEventoISO(nascimentoRaw) ? nascimentoRaw : null,
    genero: isGeneroInscrito(generoRaw) ? generoRaw : null,
    atualizadoEmMs:
      atualizadoEm !== undefined && typeof atualizadoEm.toMillis === 'function'
        ? atualizadoEm.toMillis()
        : 0,
  };
}

/** Linha do pedido correspondente ao inscrito (dinheiro da inscrição). */
interface LinhaPedido {
  valorPago: number;
  taxaRepassada: number;
  /** e-mail do responsável — SÓ insumo de chave, nunca persistido */
  emailResponsavel: unknown;
}

/**
 * Extrai a linha do inscrito do doc do pedido. Guardas anti-contaminação:
 * pedido de OUTRO tenant (dado corrompido/forjado) é tratado como ausente —
 * dinheiro/e-mail de outro tenant jamais entram no CRM deste (review
 * antagonista E19: cross-tenant via pedidoRef adulterado).
 */
function linhaDoPedido(
  pedido: DocData | null,
  tenantId: string,
  inscritoId: string
): LinhaPedido {
  const vazia: LinhaPedido = { valorPago: 0, taxaRepassada: 0, emailResponsavel: undefined };
  if (pedido === null) return vazia;
  if (pedido['tenantId'] !== tenantId) return vazia; // fail-closed cross-tenant
  const responsavel = (pedido['responsavel'] ?? {}) as DocData;
  const emailResponsavel = responsavel['email'];
  if (pedido['status'] !== 'pago') {
    return { ...vazia, emailResponsavel };
  }
  const itens = Array.isArray(pedido['itens']) ? (pedido['itens'] as DocData[]) : [];
  const item = itens.find((i) => i['inscritoRef'] === inscritoId);
  const valorFinal = typeof item?.['valorFinal'] === 'number' ? item['valorFinal'] : 0;
  const taxa = typeof item?.['taxaRepassada'] === 'number' ? item['taxaRepassada'] : 0;
  return {
    valorPago: Number.isFinite(valorFinal) && valorFinal >= 0 ? valorFinal : 0,
    taxaRepassada: Number.isFinite(taxa) && taxa >= 0 ? taxa : 0,
    emailResponsavel,
  };
}

function identidadeDo(view: InscritoCrmView, linha: LinhaPedido): IdentidadeCliente {
  return derivarIdentidadeCliente({
    cpf: view.cpf,
    // O [reg] não tem e-mail: o único e-mail conhecido é o do responsável do
    // pedido — vale como identidade SÓ quando o inscrito É o responsável.
    email: view.ehResponsavel ? linha.emailResponsavel : undefined,
    atletaId: view.atletaId,
  });
}

// ---------------------------------------------------------------------------
// Recomputação (núcleo — testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

/**
 * Aplica UM write de inscrito no CRM do tenant, numa transação:
 *   - inscrição confirmada/estornada → entrada `{eventoId}_{inscritoId}` no
 *     ledger do cliente + recompute fechado (computeCrmCliente);
 *   - pendente/cancelada/deletada → entrada removida (doc vazio é deletado);
 *   - chave mudou (CPF corrigido) → entrada migra de doc.
 * Idempotente: replay produz o MESMO doc (no-op sem escrita).
 *
 * @returns ação efetivada por chave — dado de observabilidade dos testes.
 */
export async function aplicarWriteInscritoNoCrm(
  db: Db,
  eventoId: string,
  inscritoId: string,
  before: DocData | null,
  after: DocData | null
): Promise<Record<string, 'set' | 'remove' | 'noop' | 'delete'>> {
  const viewBefore = viewInscrito(before);
  const viewAfter = viewInscrito(after);
  if (viewBefore === null && viewAfter === null) return {};

  const entryKey = `${eventoId}_${inscritoId}`;

  return db.runTransaction(async (tx) => {
    // ── Leituras (todas antes de qualquer escrita — contrato de tx) ────────
    const eventoSnap = await tx.get(db.collection('eventos').doc(eventoId));
    const eventoNome =
      typeof eventoSnap.get('nome') === 'string' ? (eventoSnap.get('nome') as string) : '';

    const pedidoRefs = new Set<string>();
    if (viewBefore?.pedidoRef) pedidoRefs.add(viewBefore.pedidoRef);
    if (viewAfter?.pedidoRef) pedidoRefs.add(viewAfter.pedidoRef);
    const pedidos = new Map<string, DocData | null>();
    for (const ref of pedidoRefs) {
      const snap = await tx.get(db.collection('pedidos').doc(ref));
      pedidos.set(ref, snap.exists ? (snap.data() as DocData) : null);
    }

    const linhaDe = (view: InscritoCrmView | null): LinhaPedido =>
      view === null
        ? { valorPago: 0, taxaRepassada: 0, emailResponsavel: undefined }
        : linhaDoPedido(
            view.pedidoRef ? (pedidos.get(view.pedidoRef) ?? null) : null,
            view.tenantId,
            inscritoId
          );

    const linhaBefore = linhaDe(viewBefore);
    const linhaAfter = linhaDe(viewAfter);

    const keyBefore =
      viewBefore !== null
        ? clienteDocId(viewBefore.tenantId, identidadeDo(viewBefore, linhaBefore))
        : null;

    // Entrada nova SÓ para inscrição que comprou (P-E19-6)
    const entryAfter: CrmInscricaoEntry | null =
      viewAfter !== null &&
      (viewAfter.status === 'confirmado' || viewAfter.status === 'estornado')
        ? {
            eventoId,
            eventoNome,
            status: viewAfter.status,
            valorPago: linhaAfter.valorPago,
            taxaRepassada: linhaAfter.taxaRepassada,
            nome: viewAfter.atletaNome,
            nascimento: viewAfter.nascimento,
            genero: viewAfter.genero,
            atualizadoEmMs: viewAfter.atualizadoEmMs,
          }
        : null;
    const identidadeAfter =
      viewAfter !== null ? identidadeDo(viewAfter, linhaAfter) : null;
    const keyAfter =
      entryAfter !== null && viewAfter !== null && identidadeAfter !== null
        ? clienteDocId(viewAfter.tenantId, identidadeAfter)
        : null;

    const colecao = (tenantId: string) =>
      db.collection('tenants').doc(tenantId).collection(SUBCOLECAO_CRM_CLIENTES);

    const acoes: Record<string, 'set' | 'remove' | 'noop' | 'delete'> = {};

    // Doc da chave nova (leitura ANTES das escritas)
    const clienteAfterSnap =
      keyAfter !== null && viewAfter !== null
        ? await tx.get(colecao(viewAfter.tenantId).doc(keyAfter))
        : null;
    // Doc da chave antiga — só quando é OUTRO doc (migração/remoção)
    const precisaRemoverDoBefore =
      keyBefore !== null && viewBefore !== null && keyBefore !== keyAfter;
    const clienteBeforeSnap = precisaRemoverDoBefore
      ? await tx.get(colecao(viewBefore.tenantId).doc(keyBefore))
      : null;

    // ── Escritas ───────────────────────────────────────────────────────────
    if (precisaRemoverDoBefore && clienteBeforeSnap !== null && viewBefore !== null) {
      if (clienteBeforeSnap.exists) {
        const atual = parseCrmCliente(
          keyBefore as string,
          clienteBeforeSnap.data() as DocData
        );
        if (entryKey in atual.inscricoes) {
          const inscricoes = { ...atual.inscricoes };
          delete inscricoes[entryKey];
          if (Object.keys(inscricoes).length === 0) {
            tx.delete(clienteBeforeSnap.ref); // expurgo natural — doc some
            acoes[keyBefore as string] = 'delete';
          } else {
            tx.set(clienteBeforeSnap.ref, {
              tenantId: viewBefore.tenantId,
              chaveTipo: atual.chaveTipo,
              inscricoes,
              ...computeCrmCliente(inscricoes),
              atualizadoEm: FieldValue.serverTimestamp(),
            });
            acoes[keyBefore as string] = 'remove';
          }
        } else {
          acoes[keyBefore as string] = 'noop';
        }
      } else {
        acoes[keyBefore as string] = 'noop';
      }
    }

    if (
      keyAfter !== null &&
      entryAfter !== null &&
      viewAfter !== null &&
      identidadeAfter !== null &&
      clienteAfterSnap !== null
    ) {
      const inscricoes: Record<string, CrmInscricaoEntry> = clienteAfterSnap.exists
        ? { ...parseCrmCliente(keyAfter, clienteAfterSnap.data() as DocData).inscricoes }
        : {};
      inscricoes[entryKey] = entryAfter;
      const novo: CrmClienteDoc = {
        tenantId: viewAfter.tenantId,
        chaveTipo: identidadeAfter.tipo,
        inscricoes,
        ...computeCrmCliente(inscricoes),
      };
      const inalterado =
        clienteAfterSnap.exists &&
        crmClienteInalterado(
          parseCrmCliente(keyAfter, clienteAfterSnap.data() as DocData),
          novo
        );
      if (inalterado) {
        acoes[keyAfter] = 'noop'; // zero write — atualizadoEm intocado
      } else {
        tx.set(clienteAfterSnap.ref, {
          ...novo,
          atualizadoEm: FieldValue.serverTimestamp(),
        });
        acoes[keyAfter] = 'set';
      }
    }

    return acoes;
  });
}

// ---------------------------------------------------------------------------
// Gatilho (Cloud Functions v1 — mesmo runtime dos módulos existentes)
// ---------------------------------------------------------------------------

/**
 * onWrite de inscrito → mantém o cliente CRM do tenant (E19 · RN-172).
 * At-least-once safe (entrada sobrescrita por chave determinística; no-op
 * quando nada muda). Convive com os demais gatilhos do mesmo path.
 */
export const onInscritoWriteCrm = functions.firestore
  .document('eventos/{eventoId}/inscritos/{inscritoId}')
  .onWrite(async (change, context) => {
    const eventoId = context.params['eventoId'] as string;
    const inscritoId = context.params['inscritoId'] as string;
    try {
      const acoes = await aplicarWriteInscritoNoCrm(
        admin.firestore(),
        eventoId,
        inscritoId,
        change.before.exists ? ((change.before.data() ?? null) as DocData) : null,
        change.after.exists ? ((change.after.data() ?? null) as DocData) : null
      );
      // Sem PII no log: ids opacos + ações — nunca nome/chave/valores (LGPD)
      logger.info('crm_cliente_aplicado', {
        eventoId,
        inscritoId,
        acoes: Object.values(acoes),
      });
    } catch (err) {
      logger.error('crm_cliente_falha', { eventoId, inscritoId, err });
      throw err;
    }
  });
