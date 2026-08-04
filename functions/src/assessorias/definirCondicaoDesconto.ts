// =============================================================================
// functions/src/assessorias/definirCondicaoDesconto.ts
//
// Cloud Function callable: define a condição de desconto do CLUB PARCEIRO
// (LEELA-E18 · S1802-T1 backend · RN-364/365 · ADR-012).
//
// Contrato:
//   definirCondicaoDesconto({ parceriaId, eventoId, codigo, tipo, valor,
//                             tetoUso?, inicioEm, fimEm })
//     -> { ok: true, cupomRef, codigo }
//
// TUDO PELO KERNEL DE CUPONS (ADR-012 — nenhum segundo caminho de desconto):
// a condição materializa-se como um CUPOM do evento com
// `escopo='club_parceiro'` + `clubeRef` + `parceriaRef` (RN-364). O
// checkout resolve o desconto pelo MESMO pipeline de cupom vigente
// (computeSaleState), com uma guarda a mais: parceria ATIVA. `commercial
// Terms` (retenção % + D+N — RN-365) seguem operando sobre o pós-desconto,
// SEM alteração de máquina (nada aqui toca repasse).
//
// TRANSAÇÃO ÚNICA: cria/substitui o cupom escopado + carimba
// `condicaoDesconto` na parceria — os dois lados nunca divergem. O canal de
// CLIENTE não grava cupom escopado (Rules exigem escopo 'geral'); esta
// Function é a ÚNICA porta (deny-by-default).
//
// SUBSTITUIÇÃO: redefinir a condição cria o cupom novo e DESATIVA o
// anterior encurtando a janela (`fimEm = agora`) — nunca deleta (trilha
// comercial; `usos` preservado). Colisão de código com cupom EXISTENTE de
// outro escopo/parceria → already-exists (não sequestra cupom geral).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { https, runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  COLECAO_PARCEIROS_ASSESSORIA,
  isCodigoCupomValido,
  isTipoCupom,
  normalizarCodigoCupom,
  valorCupomValido,
  type AuthClaims,
  type TipoCupom,
} from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from '../eventos/criarEvento';
import { mascararDocumento } from './cadastrarAssessoria';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface DefinirCondicaoDescontoInput {
  /** docId da parceria (= documento normalizado) */
  parceriaId: string;
  /** Evento onde o cupom vale (cupom é subcoleção do evento — E04) */
  eventoId: string;
  /** Código do cupom (normalizado no servidor — vira o docId) */
  codigo: string;
  tipo: TipoCupom;
  /** % (0<v≤100) quando percentual; R$ (v>0) quando fixo */
  valor: number;
  /** Teto de usos (int ≥ 1) — ausente/null = ilimitado */
  tetoUso?: number | null;
  /** Janela de validade (millis epoch — serializável em callable) */
  inicioEmMillis: number;
  fimEmMillis: number;
}

export interface DefinirCondicaoDescontoResult {
  ok: true;
  /** Path do cupom criado: eventos/{eventoId}/cupons/{CODIGO} */
  cupomRef: string;
  codigo: string;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function definirCondicaoDescontoCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller,
  agora: Date = new Date()
): Promise<DefinirCondicaoDescontoResult> {
  const tenantId = assertTenantWriter(caller.claims);

  // ── Validação pura do input (fronteira de segurança) ─────────────────────
  const input = rawInput as Partial<DefinirCondicaoDescontoInput> | null;
  const parceriaId =
    typeof input?.parceriaId === 'string' ? input.parceriaId : '';
  const eventoId = typeof input?.eventoId === 'string' ? input.eventoId : '';
  if (parceriaId.length === 0 || eventoId.length === 0) {
    throw new https.HttpsError(
      'invalid-argument',
      '"parceriaId" e "eventoId" são obrigatórios.'
    );
  }
  if (typeof input?.codigo !== 'string') {
    throw new https.HttpsError('invalid-argument', '"codigo" é obrigatório.');
  }
  const codigo = normalizarCodigoCupom(input.codigo);
  if (!isCodigoCupomValido(codigo)) {
    throw new https.HttpsError(
      'invalid-argument',
      `Código '${codigo}' fora do padrão A-Z0-9 (3–20).`
    );
  }
  if (!isTipoCupom(input?.tipo)) {
    throw new https.HttpsError(
      'invalid-argument',
      '"tipo" deve ser percentual|fixo.'
    );
  }
  const tipo = input.tipo as TipoCupom;
  if (!valorCupomValido(tipo, input?.valor)) {
    throw new https.HttpsError(
      'invalid-argument',
      `"valor" inválido para tipo ${tipo} (percentual 0<v≤100; fixo v>0).`
    );
  }
  const valor = input.valor as number;
  const tetoUso = input?.tetoUso;
  if (
    tetoUso !== undefined &&
    tetoUso !== null &&
    (!Number.isInteger(tetoUso) || tetoUso < 1)
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      '"tetoUso" deve ser inteiro ≥ 1 ou null (ilimitado).'
    );
  }
  const inicioMs = input?.inicioEmMillis;
  const fimMs = input?.fimEmMillis;
  if (
    typeof inicioMs !== 'number' ||
    typeof fimMs !== 'number' ||
    !Number.isFinite(inicioMs) ||
    !Number.isFinite(fimMs) ||
    fimMs <= inicioMs
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      'Janela inválida: inicioEmMillis/fimEmMillis com fim > início.'
    );
  }

  await assertTenantAtivo(db, tenantId);

  const parceriaRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection(COLECAO_PARCEIROS_ASSESSORIA)
    .doc(parceriaId);
  const eventoRef = db.collection('eventos').doc(eventoId);
  const cupomRef = eventoRef.collection('cupons').doc(codigo);

  await db.runTransaction(async (tx) => {
    const [parceriaSnap, eventoSnap, cupomSnap] = await Promise.all([
      tx.get(parceriaRef),
      tx.get(eventoRef),
      tx.get(cupomRef),
    ]);

    if (!parceriaSnap.exists) {
      throw new https.HttpsError(
        'not-found',
        `Parceria '${mascararDocumento(parceriaId)}' não existe neste tenant.`
      );
    }
    // Condição só em parceria ATIVA (RN-364): pendente ainda não aceitou;
    // inativa foi encerrada (desconto morto por definição).
    if (parceriaSnap.get('status') !== 'ativa') {
      throw new https.HttpsError(
        'failed-precondition',
        'Condição de desconto exige parceria ATIVA (RN-364).'
      );
    }
    if (!eventoSnap.exists) {
      throw new https.HttpsError('not-found', `Evento '${eventoId}' não existe.`);
    }
    // RN-400: o cupom nasce num evento do PRÓPRIO tenant.
    if (eventoSnap.get('tenantId') !== tenantId) {
      throw new https.HttpsError(
        'permission-denied',
        'Evento pertence a outro tenant (RN-400).'
      );
    }

    const clubeRef = (parceriaSnap.get('clubeRef') ?? '') as string;
    if (clubeRef.length === 0) {
      throw new https.HttpsError(
        'internal',
        'Parceria sem clubeRef — estado incoerente (RN-360).'
      );
    }

    // Colisão de código: só substitui cupom da MESMA parceria (redefinição);
    // cupom geral/de outra parceria nunca é sequestrado.
    if (cupomSnap.exists) {
      const mesmoEscopo = cupomSnap.get('escopo') === 'club_parceiro';
      const mesmaParceria = cupomSnap.get('parceriaRef') === parceriaRef.path;
      if (!mesmoEscopo || !mesmaParceria) {
        throw new https.HttpsError(
          'already-exists',
          `Código '${codigo}' já existe neste evento com outro escopo/vínculo.`
        );
      }
    }

    // Condição ANTERIOR em outro código/evento → desativa encurtando a
    // janela (fimEm = agora; nunca deleta — trilha comercial + usos).
    const condAnterior = parceriaSnap.get('condicaoDesconto') as
      | { cupomRef?: string }
      | undefined;
    if (
      condAnterior?.cupomRef !== undefined &&
      condAnterior.cupomRef !== cupomRef.path
    ) {
      const anteriorRef = db.doc(condAnterior.cupomRef);
      const anteriorSnap = await tx.get(anteriorRef);
      if (anteriorSnap.exists) {
        tx.update(anteriorRef, {
          fimEm: Timestamp.fromDate(agora),
          atualizadoEm: FieldValue.serverTimestamp(),
        });
      }
    }

    const now = FieldValue.serverTimestamp();
    const cupomDoc: Record<string, unknown> = {
      id: codigo,
      tenantId,
      codigo,
      tipo,
      valor,
      tetoUso: typeof tetoUso === 'number' ? tetoUso : null,
      inicioEm: Timestamp.fromMillis(inicioMs),
      fimEm: Timestamp.fromMillis(fimMs),
      escopo: 'club_parceiro',
      clubeRef,
      parceriaRef: parceriaRef.path,
      atualizadoEm: now,
    };
    if (cupomSnap.exists) {
      // Redefinição do MESMO código: preserva usos/criadoEm (∑ e trilha).
      tx.update(cupomRef, cupomDoc);
    } else {
      cupomDoc['usos'] = 0;
      cupomDoc['criadoEm'] = now;
      tx.create(cupomRef, cupomDoc);
    }

    // Carimbo na parceria — MESMA tx (os dois lados nunca divergem).
    tx.update(parceriaRef, {
      condicaoDesconto: {
        cupomRef: cupomRef.path,
        eventoId,
        codigo,
        tipo,
        valor,
      },
      atualizadoEm: now,
    });
  });

  logger.info('assessoria_condicao_definida', {
    tenantId,
    eventoId,
    codigo,
    parceria: mascararDocumento(parceriaId),
    tipo,
  });

  return { ok: true, cupomRef: cupomRef.path, codigo };
}

// ---------------------------------------------------------------------------
// Callable (wrapper fino — padrão criarEvento)
// ---------------------------------------------------------------------------

// PIXREAL-FIX T5 (2026-08-04): BREVO_API_KEY faltava no runWith. O
// selectEmailProvider e fail-closed por contrato (RN-137), entao sem o binding
// esta funcao degradava para 'pendente_chave' em SILENCIO -- a tela confirmava
// a acao e o e-mail nunca saia. Guarda contra reincidencia:
// __tests__/secretsBinding.contract.test.ts
export const definirCondicaoDesconto = runWith({ secrets: ['BREVO_API_KEY'] }).https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }
    return definirCondicaoDescontoCore(admin.firestore(), data, {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    });
  }
);
