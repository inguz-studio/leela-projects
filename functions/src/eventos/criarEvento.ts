// =============================================================================
// functions/src/eventos/criarEvento.ts
//
// Cloud Function callable: cria um evento como RASCUNHO (LEELA-S201-T2 · E03).
//
// Contrato: `criarEvento(input) -> { eventoId, slug }`.
//
// Segurança (nunca confia no cliente):
//   - Autorização: papel de escrita do tenant (tenant_owner | tenant_staff)
//     com tenantId no claim — espelho da matriz S1600 das Rules. O
//     `organizadorId` gravado é SEMPRE o uid do caller (nunca vem do input).
//   - Validação COMPLETA do input no servidor (`validarCriarEventoInput`).
//     A validação de formulário do painel (S201-T1 · core/validacao) é UX;
//     esta aqui é a fronteira de segurança.
//   - Tenant suspenso não cria evento (RN-402 — mesma guarda `tenantAtivo`
//     das Rules; Admin SDK bypassa Rules, então a Function reverifica).
//
// Slug = docId (unicidade transacional):
//   candidatos `base`, `base-2`, `base-3`… são lidos DENTRO da transação;
//   criação concorrente do mesmo nome não colide (a transação perdedora
//   retenta e enxerga o doc da vencedora). Ver slug.ts.
//
// Agregados ∑ nascem zerados (qtdInscritos/receitaConfirmada = 0) — só a
// Function de agregação (S207-T2) os mantém dali em diante.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  dataEventoNoFuturo,
  dataEventoParaDate,
  isDataEventoISO,
  isPercursoEvento,
  type AuthClaims,
  type PercursoEvento,
} from '@leela/core';
import { MAX_TENTATIVAS_SLUG, slugCandidato, slugify } from './slug';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/**
 * Input de criação de evento (validado no servidor — nunca confiar na UI).
 * Shape CONFIRMADO com o L3: espelha `apps/painel/src/routes/eventos/_data/
 * contracts.ts` (nome, descricao?, data, local, modalidades, percursos).
 * `usaChip` é extensão opcional do servidor (RN-207) — o form pode omitir.
 */
export interface CriarEventoInput {
  nome: string;
  /**
   * Data da prova. Dois shapes aceitos (fix review Onda1 #01):
   *   - `yyyy-mm-dd` (o que o form do painel envia — input date): dia CIVIL
   *     no fuso do produto (`FUSO_EVENTO`); HOJE é válido — mesma regra
   *     `dataEventoNoFuturo` que a UI aplica (fonte única em @leela/core);
   *   - ISO 8601 com hora (ex.: '2027-04-25T07:00:00-03:00'): instante
   *     exato, deve ser futuro.
   */
  data: string;
  local: string;
  /** Nomes de percursos/modalidades (ex.: ['5k','10k','21k']) — mínimo 1 */
  modalidades: string[];
  /** Percursos com preço independente (S201-T1, RN-200) — mínimo 1 */
  percursos: PercursoEvento[];
  /** Usa chip de cronometragem (RN-207) — default false */
  usaChip?: boolean;
  descricao?: string;
}

export interface CriarEventoResult {
  eventoId: string;
  slug: string;
}

/** Identidade do caller (extraída do context.auth pelo wrapper callable). */
export interface EventoCaller {
  uid: string;
  claims: AuthClaims;
}

// ---------------------------------------------------------------------------
// Validação pura do input (fronteira de segurança do servidor)
// ---------------------------------------------------------------------------

const NOME_MIN = 3;
const NOME_MAX = 120;
const LOCAL_MAX = 200;
const DESCRICAO_MAX = 5000;
const MODALIDADES_MAX = 20;
const PERCURSOS_MAX = 20;
const PERCURSO_NOME_MAX = 60;

/**
 * Valida o input bruto de `criarEvento`. Retorna a lista de erros (vazia =
 * válido). Pura — reutilizada pelos testes sem Emulator.
 * @pure
 */
export function validarCriarEventoInput(
  raw: unknown,
  agora: () => Date = () => new Date()
): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];

  const nome = input['nome'];
  if (typeof nome !== 'string' || nome.trim().length < NOME_MIN) {
    erros.push(`"nome" é obrigatório (mínimo ${NOME_MIN} caracteres).`);
  } else if (nome.trim().length > NOME_MAX) {
    erros.push(`"nome" excede ${NOME_MAX} caracteres.`);
  } else if (slugify(nome).length === 0) {
    erros.push('"nome" não gera slug válido (use letras ou números).');
  }

  // Data: shape date-only do form → dia civil no fuso do produto, HOJE
  // válido (fonte única com a UI — fix review Onda1 #01); ISO com hora →
  // instante futuro (contrato original preservado p/ chamadas programáticas).
  const data = input['data'];
  if (typeof data === 'string' && isDataEventoISO(data)) {
    if (!dataEventoNoFuturo(data, agora())) {
      erros.push('"data" deve ser hoje ou futura.');
    }
  } else if (typeof data !== 'string' || Number.isNaN(Date.parse(data))) {
    erros.push('"data" deve ser uma data ISO 8601 válida.');
  } else if (Date.parse(data) <= agora().getTime()) {
    erros.push('"data" deve ser futura.');
  }

  const local = input['local'];
  if (typeof local !== 'string' || local.trim().length === 0) {
    erros.push('"local" é obrigatório.');
  } else if (local.trim().length > LOCAL_MAX) {
    erros.push(`"local" excede ${LOCAL_MAX} caracteres.`);
  }

  const modalidades = input['modalidades'];
  if (
    !Array.isArray(modalidades) ||
    modalidades.length === 0 ||
    !modalidades.every((m) => typeof m === 'string' && m.trim().length > 0)
  ) {
    erros.push('"modalidades" deve ter ao menos 1 percurso não-vazio.');
  } else if (modalidades.length > MODALIDADES_MAX) {
    erros.push(`"modalidades" excede ${MODALIDADES_MAX} percursos.`);
  }

  const percursos = input['percursos'];
  if (
    !Array.isArray(percursos) ||
    percursos.length === 0 ||
    !percursos.every(
      (p) =>
        isPercursoEvento(p) &&
        p.nome.trim().length > 0 &&
        p.nome.trim().length <= PERCURSO_NOME_MAX
    )
  ) {
    erros.push(
      '"percursos" deve ter ao menos 1 percurso { nome, preco ≥ 0 } (RN-200).'
    );
  } else if (percursos.length > PERCURSOS_MAX) {
    erros.push(`"percursos" excede ${PERCURSOS_MAX} percursos.`);
  }

  const usaChip = input['usaChip'];
  if (usaChip !== undefined && typeof usaChip !== 'boolean') {
    erros.push('"usaChip" deve ser boolean (RN-207).');
  }

  const descricao = input['descricao'];
  if (descricao !== undefined) {
    if (typeof descricao !== 'string') {
      erros.push('"descricao" deve ser string.');
    } else if (descricao.length > DESCRICAO_MAX) {
      erros.push(`"descricao" excede ${DESCRICAO_MAX} caracteres.`);
    }
  }

  return erros;
}

// ---------------------------------------------------------------------------
// Autorização compartilhada das Functions de evento (espelha isTenantWriter)
// ---------------------------------------------------------------------------

/**
 * Exige papel de ESCRITA de tenant (tenant_owner | tenant_staff) com tenantId
 * no claim. Retorna o tenantId do caller. Lança HttpsError caso contrário.
 */
export function assertTenantWriter(claims: AuthClaims): string {
  const papelDeEscrita =
    claims.role === 'tenant_owner' || claims.role === 'tenant_staff';
  if (!papelDeEscrita || typeof claims.tenantId !== 'string' || claims.tenantId.length === 0) {
    throw new https.HttpsError(
      'permission-denied',
      'Apenas tenant_owner/tenant_staff do tenant operam eventos (RN-401).'
    );
  }
  return claims.tenantId;
}

/**
 * Exige tenant ATIVO (RN-402) — Admin SDK bypassa as Rules, então cada
 * Function de escrita reverifica a guarda `tenantAtivo` aqui.
 */
export async function assertTenantAtivo(
  db: admin.firestore.Firestore,
  tenantId: string
): Promise<void> {
  const snap = await db.collection('tenants').doc(tenantId).get();
  if (!snap.exists || snap.get('status') !== 'ativo') {
    throw new https.HttpsError(
      'failed-precondition',
      `Tenant '${tenantId}' não está ativo — operação bloqueada (RN-402).`
    );
  }
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

/**
 * Cria o evento como rascunho. Ver contrato no cabeçalho do arquivo.
 */
export async function criarEventoCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller
): Promise<CriarEventoResult> {
  const tenantId = assertTenantWriter(caller.claims);

  const erros = validarCriarEventoInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `CriarEventoInput inválido: ${erros.join(' ')}`
    );
  }
  const input = rawInput as CriarEventoInput;

  await assertTenantAtivo(db, tenantId);

  const base = slugify(input.nome);
  const now = FieldValue.serverTimestamp();

  const slug = await db.runTransaction(async (tx) => {
    // Todas as leituras ANTES da escrita (contrato de transação Firestore)
    for (let n = 0; n < MAX_TENTATIVAS_SLUG; n++) {
      const candidato = slugCandidato(base, n);
      const ref = db.collection('eventos').doc(candidato);
      const snap = await tx.get(ref);
      if (snap.exists) continue;

      const doc: Record<string, unknown> = {
        id: candidato,
        tenantId,
        organizadorId: caller.uid, // NUNCA vem do input
        nome: input.nome.trim(),
        // date-only → meia-noite CIVIL no fuso do produto (nunca UTC-midnight,
        // que renderizava dia N−1 no Brasil — fix review Onda1 #02)
        data: Timestamp.fromDate(
          isDataEventoISO(input.data)
            ? dataEventoParaDate(input.data)
            : new Date(input.data)
        ),
        local: input.local.trim(),
        modalidades: input.modalidades.map((m) => m.trim()),
        percursos: input.percursos.map((p) => ({
          nome: p.nome.trim(),
          preco: p.preco,
        })),
        slug: candidato,
        status: 'rascunho',
        usaChip: input.usaChip === true,
        qtdInscritos: 0,
        receitaConfirmada: 0,
        criadoEm: now,
        atualizadoEm: now,
      };
      if (typeof input.descricao === 'string' && input.descricao.length > 0) {
        doc['descricao'] = input.descricao;
      }
      tx.set(ref, doc);
      return candidato;
    }
    throw new https.HttpsError(
      'resource-exhausted',
      `Não foi possível gerar slug único para '${base}' após ` +
        `${MAX_TENTATIVAS_SLUG} tentativas — renomeie o evento.`
    );
  });

  logger.info('evento_criado', { tenantId, eventoId: slug, uid: caller.uid });
  return { eventoId: slug, slug };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `criarEvento` — callable do painel (submit do form S201-T1). */
export const criarEvento = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return criarEventoCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
