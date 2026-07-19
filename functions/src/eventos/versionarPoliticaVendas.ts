// =============================================================================
// functions/src/eventos/versionarPoliticaVendas.ts
//
// Versionamento SERVER-SIDE da política de vendas (LEELA-CKMOD · spec
// CHECKOUT-UX §5.3(a) · paralelo RN-149 do regulamento).
//
// FLUXO DE ESCRITA vigente: o OWNER edita `politicaVendas/config` pelo
// client SDK (Rules validam shape S305). A VERSÃO é contrato legal (o modal
// "termos da compra + política de cancelamento" do checkout renderiza a
// política, e o pedido registra a versão ACEITA): MONOTÔNICA e de escrita
// EXCLUSIVA server-side — as Rules congelam `versao`/`versaoAtualizadaEm`/
// `politicaTextoHash` para o cliente; este trigger deriva o bump quando a
// política muda MATERIALMENTE (`materialPoliticaVendas` do core — os 3
// blocos paramétricos; tenantId/carimbos fora).
//
// SEMÂNTICA DE VIGÊNCIA (≠ regulamento): a política SEMPRE vige — sem doc,
// vigem os defaults legais (CDC Art. 49) como VERSÃO 1. Logo:
//   - criar o doc IGUAL aos defaults ⇒ NÃO bumpa (conteúdo vigente idêntico);
//   - criar/editar com conteúdo material DIFERENTE do vigente ⇒ bump
//     (baseline do doc novo = defaults, versão 1 → 2);
//   - editar só tenantId/carimbos ⇒ no-op.
//
// PADRÃO ADR-015 (precedente versionarRegulamento): núcleo puro/testável
// contra o Emulator via Admin SDK + wrapper v1 fino (onWrite). Idempotente
// por HASH do material já versionado (redelivery at-least-once não re-bumpa);
// transaction com releitura (corrida de dois updates ⇒ bumps SEQUENCIAIS
// legítimos, nunca bump perdido/duplicado do mesmo conteúdo).
//
// RN-149 ponta-a-ponta: o pedido mantém `aceites.termos.versao` (persistido
// pelo checkout — NUNCA tocado aqui); `precisaNovoAceiteTermos` (core) diz
// se um aceite antigo ainda vale para a vigente.
// =============================================================================

import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore as firestoreV1 } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  materialPoliticaVendas,
  politicaVendasPadrao,
  validarPoliticaVendas,
  versaoPoliticaVendas,
  POLITICA_VENDAS_DOC_ID,
  type PoliticaVendas,
} from '@leela/core';

type Db = admin.firestore.Firestore;

type MaterialPolitica = Pick<
  PoliticaVendas,
  'reembolso' | 'transferencia' | 'trocaIngresso'
>;

/** Hash do material versionado — chave de idempotência do bump. */
export function hashPoliticaVendas(material: MaterialPolitica): string {
  return createHash('sha256')
    .update(materialPoliticaVendas(material), 'utf8')
    .digest('hex');
}

/** Hash do material dos DEFAULTS legais (baseline de doc recém-criado). */
export function hashPoliticaPadrao(): string {
  return hashPoliticaVendas(politicaVendasPadrao());
}

export interface VersionarPoliticaVendasResult {
  bumpado: boolean;
  versao: number;
}

/**
 * Núcleo testável: relê `eventos/{eventoId}/politicaVendas/config` e bumpa a
 * versão quando o material do DISCO difere do último material versionado
 * (`politicaTextoHash`; doc sem hash usa os defaults legais como baseline —
 * é o conteúdo que vigia antes do doc existir). Doc inválido = no-op
 * (parse-fail nunca versiona lixo; as Rules já barram cliente — doc torto
 * aqui é Admin/corrompido, e versão não pode nascer de política ilegível).
 */
export async function versionarPoliticaVendasCore(
  db: Db,
  eventoId: string
): Promise<VersionarPoliticaVendasResult> {
  const ref = db
    .collection('eventos')
    .doc(eventoId)
    .collection('politicaVendas')
    .doc(POLITICA_VENDAS_DOC_ID);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      // Doc apagado (Admin) ⇒ voltam a viger os defaults (versão 1 implícita).
      // Nada a escrever — versaoPoliticaVendas(undefined) resolve a leitura.
      return { bumpado: false, versao: 1 };
    }
    const data = snap.data() ?? {};
    if (validarPoliticaVendas(data).length > 0) {
      logger.warn('politica_vendas_invalida_nao_versionada', { eventoId });
      return {
        bumpado: false,
        versao: versaoPoliticaVendas(data['versao'] as number | undefined),
      };
    }
    const material = data as unknown as MaterialPolitica;
    const hashAtual = hashPoliticaVendas(material);
    const versaoGravada = data['versao'] as number | undefined;
    const hashGravado = data['politicaTextoHash'] as string | undefined;
    const vigente = versaoPoliticaVendas(versaoGravada);

    // Baseline do último material VERSIONADO: hash gravado, ou os defaults
    // legais quando o doc nunca foi versionado (o que vigia era o padrão).
    const baseline = typeof hashGravado === 'string' ? hashGravado : hashPoliticaPadrao();

    if (hashAtual === baseline) {
      // Conteúdo vigente idêntico — garante só o CARIMBO em doc que nunca
      // foi versionado (deixa versao/hash explícitos p/ leituras futuras).
      if (typeof versaoGravada !== 'number' || typeof hashGravado !== 'string') {
        tx.update(ref, {
          versao: vigente,
          politicaTextoHash: hashAtual,
          versaoAtualizadaEm: FieldValue.serverTimestamp(),
        });
      }
      return { bumpado: false, versao: vigente };
    }

    const nova = vigente + 1;
    tx.update(ref, {
      versao: nova,
      politicaTextoHash: hashAtual,
      versaoAtualizadaEm: FieldValue.serverTimestamp(),
    });
    return { bumpado: true, versao: nova };
  });
}

// ---------------------------------------------------------------------------
// Trigger (ADR-015 — wrapper v1 fino)
// ---------------------------------------------------------------------------

export const versionarPoliticaVendas = firestoreV1
  .document('eventos/{eventoId}/politicaVendas/{docId}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) return null; // delete: defaults voltam a viger
    if (context.params['docId'] !== POLITICA_VENDAS_DOC_ID) return null;
    const eventoId = context.params['eventoId'] as string;
    const r = await versionarPoliticaVendasCore(admin.firestore(), eventoId);
    if (r.bumpado) {
      logger.info('politica_vendas_versionada', { eventoId, versao: r.versao });
    }
    return null;
  });
