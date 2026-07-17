// =============================================================================
// functions/src/eventos/ajustarCapacidadeLote.ts
//
// Cloud Function callable: AJUSTE DE CAPACIDADE do lote — reabrir vagas
// (LEELA-S307-T1 · E04 · RN-304, decisão Vitor 2026-07-17).
//
// "A vaga cancelada não volta sozinha (ratchet RN-300 mantido); só o
// organizador reabre subindo a capacidade." Esta Function é a ÚNICA porta de
// escrita de `quantidadeLimite` em lote COM venda (a Rule congela o campo
// pós-1ª venda do próprio lote — payload direto de cliente morre lá; Admin
// SDK bypassa Rules, e o guard vive AQUI).
//
// GUARDS (Schneier — servidor autoritativo):
//   - papel: SÓ tenant_owner (assertTenantOwner — staff/promoter/athlete/
//     papel-de-evento NEGADOS; espelho da postura S305: capacidade de venda
//     é decisão do dono);
//   - tenant: lote/evento do PRÓPRIO tenant (cross-tenant nega, RN-400) +
//     tenant ativo (RN-402);
//   - regra: `validarAjusteCapacidade` do kernel — inteiro 1..1M e NUNCA
//     abaixo do vendido (fail-closed, nada gravado);
//   - ∑ intocado: `vendidos` jamais é alterado por este fluxo (escritor
//     exclusivo = virada S300-T2).
//
// AUDITORIA (RN-304): todo ajuste EFETIVADO grava um registro em
// `auditoriaAcessos/{autoId}` (padrão E09/getBankDetailsForPayout —
// deny-by-default p/ cliente): quem, quando, evento/lote, de → para, motivo.
// O registro é gravado FORA da transação, APÓS o commit (ajuste sem
// auditoria não existe: falha de commit ⇒ nenhum registro; falha do
// registro pós-commit é logada e o doc do lote carrega o carimbo
// `capacidadeAjustadaEm` — trilha primária no próprio agregado).
//
// REABERTURA derivada: o estado ativo/encerrado do lote é DERIVADO
// (`loteAtivo`/`loteEncerrado` — kernel); subir a capacidade acima de
// `vendidos` com a janela aberta REABRE a venda por construção. O carimbo
// `encerradoEm`/`encerradoMotivo` NÃO é apagado (trilha monotônica —
// decisão #3 do virarLote); a UI decide pelo derivado, não pelo carimbo.
//
// IDEMPOTÊNCIA: ajuste para o MESMO valor é no-op declarado (`alterado:
// false`, sem write, sem auditoria duplicada). Transação Firestore serializa
// corridas contra a virada (que só escreve `vendidos`/carimbos — campos
// disjuntos deste fluxo).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  capacidadeDoLote,
  validarAjusteCapacidade,
  type AuthClaims,
  type CapacidadeLote,
} from '@leela/core';
import { assertTenantOwner } from '../finance/atores';
import { assertTenantAtivo, type EventoCaller } from './criarEvento';
import { AUDITORIA_ACESSOS_COL } from '../finance/getBankDetailsForPayout';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface AjustarCapacidadeLoteInput {
  eventoId: string;
  loteId: string;
  novaCapacidade: number;
  /** Motivo do ajuste (auditoria — obrigatório, 3–500 caracteres). */
  motivo: string;
}

export interface AjustarCapacidadeLoteResult {
  eventoId: string;
  loteId: string;
  /** false = no-op (capacidade já era a pedida) — nada gravado. */
  alterado: boolean;
  capacidadeAnterior: number;
  /** Painel pós-ajuste (aceite S307: configurado/vendido/disponível). */
  capacidade: CapacidadeLote;
}

export const MOTIVO_AJUSTE_MIN = 3;
export const MOTIVO_AJUSTE_MAX = 500;

/** Tipo do registro de auditoria deste fluxo (discriminador na coleção). */
export const TIPO_AUDITORIA_CAPACIDADE = 'ajuste_capacidade_lote';

/** Valida o input bruto — lista de erros (vazia = válido). @pure */
export function validarAjustarCapacidadeInput(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];
  // Ids com '/' fariam `.doc()` lançar (vira 'internal' opaco) — não é path
  // traversal (Firestore não escapa da coleção), mas rejeitar aqui devolve
  // 'invalid-argument' honesto (review S307 achado #4).
  if (
    typeof input['eventoId'] !== 'string' ||
    input['eventoId'].length === 0 ||
    input['eventoId'].includes('/')
  ) {
    erros.push('"eventoId" é obrigatório (sem "/").');
  }
  if (
    typeof input['loteId'] !== 'string' ||
    input['loteId'].length === 0 ||
    input['loteId'].includes('/')
  ) {
    erros.push('"loteId" é obrigatório (sem "/").');
  }
  const cap = input['novaCapacidade'];
  if (typeof cap !== 'number' || !Number.isInteger(cap)) {
    erros.push('"novaCapacidade" deve ser inteiro.');
  }
  const motivo = input['motivo'];
  if (typeof motivo !== 'string' || motivo.trim().length < MOTIVO_AJUSTE_MIN) {
    erros.push(`"motivo" é obrigatório (mínimo ${MOTIVO_AJUSTE_MIN} caracteres — auditoria).`);
  } else if (motivo.trim().length > MOTIVO_AJUSTE_MAX) {
    erros.push(`"motivo" excede ${MOTIVO_AJUSTE_MAX} caracteres.`);
  }
  return erros;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function ajustarCapacidadeLoteCore(
  db: Db,
  rawInput: unknown,
  caller: EventoCaller
): Promise<AjustarCapacidadeLoteResult> {
  // GUARD de papel: SÓ tenant_owner (staff/promoter/athlete negados).
  const tenantId = assertTenantOwner(caller.claims);

  const erros = validarAjustarCapacidadeInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `AjustarCapacidadeLoteInput inválido: ${erros.join(' ')}`
    );
  }
  const input = rawInput as unknown as AjustarCapacidadeLoteInput;

  await assertTenantAtivo(db, tenantId);

  const eventoRef = db.collection('eventos').doc(input.eventoId);
  const loteRef = eventoRef.collection('lotes').doc(input.loteId);

  const resultado = await db.runTransaction(async (tx) => {
    const [eventoSnap, loteSnap] = await Promise.all([
      tx.get(eventoRef),
      tx.get(loteRef),
    ]);
    if (!eventoSnap.exists) {
      throw new https.HttpsError('not-found', `Evento '${input.eventoId}' não existe.`);
    }
    // Cross-tenant: owner só ajusta lote do PRÓPRIO tenant (RN-400).
    if (eventoSnap.get('tenantId') !== tenantId) {
      throw new https.HttpsError(
        'permission-denied',
        'Evento pertence a outro tenant (RN-400).'
      );
    }
    if (!loteSnap.exists) {
      throw new https.HttpsError(
        'not-found',
        `Lote '${input.loteId}' não existe no evento '${input.eventoId}'.`
      );
    }
    if (loteSnap.get('tenantId') !== tenantId) {
      throw new https.HttpsError(
        'internal',
        `Lote '${input.loteId}' com tenantId divergente do evento — dado corrompido.`
      );
    }

    const capacidadeAnterior = loteSnap.get('quantidadeLimite') as number;
    const vendidos = loteSnap.get('vendidos') as number;
    if (
      typeof capacidadeAnterior !== 'number' ||
      !Number.isInteger(capacidadeAnterior) ||
      typeof vendidos !== 'number' ||
      !Number.isInteger(vendidos) ||
      vendidos < 0
    ) {
      throw new https.HttpsError(
        'internal',
        `Lote '${input.loteId}' com capacidade/vendidos corrompidos — intervenção manual.`
      );
    }

    // Regra do kernel (RN-304): int 1..1M e NUNCA abaixo do vendido.
    const recusa = validarAjusteCapacidade(
      { quantidadeLimite: capacidadeAnterior, vendidos },
      input.novaCapacidade
    );
    if (recusa !== null) {
      throw new https.HttpsError('failed-precondition', recusa);
    }

    if (input.novaCapacidade === capacidadeAnterior) {
      // No-op declarado — sem write, sem auditoria duplicada.
      return {
        alterado: false,
        capacidadeAnterior,
        capacidade: capacidadeDoLote({
          quantidadeLimite: capacidadeAnterior,
          vendidos,
        }),
      };
    }

    // ESCRITA CIRÚRGICA: só a capacidade + carimbos (NUNCA `vendidos`/
    // carimbos de virada — escritor exclusivo é a virada S300-T2).
    tx.update(loteRef, {
      quantidadeLimite: input.novaCapacidade,
      capacidadeAjustadaEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    return {
      alterado: true,
      capacidadeAnterior,
      capacidade: capacidadeDoLote({
        quantidadeLimite: input.novaCapacidade,
        vendidos,
      }),
    };
  });

  if (resultado.alterado) {
    // AUDITORIA pós-commit (quem/quando/de→para/motivo — RN-304). Falha aqui
    // não desfaz o ajuste (o lote carrega `capacidadeAjustadaEm`): loga alto.
    try {
      await db.collection(AUDITORIA_ACESSOS_COL).add({
        tipo: TIPO_AUDITORIA_CAPACIDADE,
        tenantId,
        eventoId: input.eventoId,
        loteId: input.loteId,
        de: resultado.capacidadeAnterior,
        para: input.novaCapacidade,
        motivo: input.motivo.trim(),
        uid: caller.uid,
        papel: caller.claims.role ?? 'desconhecido',
        em: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      logger.error('auditoria_ajuste_capacidade_falhou', {
        eventoId: input.eventoId,
        loteId: input.loteId,
        uid: caller.uid,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Fallback de auditoria COMPLETO (review antagonista S307, achado #1): se o
  // write em `auditoriaAcessos` falhar pós-commit, o Cloud Logging preserva
  // quem/de→para/MOTIVO/tenant/papel — a razão do ajuste nunca some.
  logger.info('ajuste_capacidade_lote', {
    eventoId: input.eventoId,
    loteId: input.loteId,
    tenantId,
    de: resultado.capacidadeAnterior,
    para: input.novaCapacidade,
    alterado: resultado.alterado,
    motivo: input.motivo.trim(),
    uid: caller.uid,
    papel: caller.claims.role ?? 'desconhecido',
  });

  return {
    eventoId: input.eventoId,
    loteId: input.loteId,
    ...resultado,
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `ajustarCapacidadeLote` — callable do organizador (owner-only, RN-304). */
export const ajustarCapacidadeLote = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return ajustarCapacidadeLoteCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
