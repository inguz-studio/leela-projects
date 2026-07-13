// =============================================================================
// functions/src/finance/saveDadosBancarios.ts
//
// Callable `saveDadosBancarios` (LEELA-E09s-L2-T2 · RN-354/357 · ADR-014).
//
// O organizador (tenant_owner) envia os dados bancários EM CLARO pelo
// callable (TLS); o servidor:
//   1. valida os campos (banco, agência, conta, tipo, PIX?, titular,
//      CPF/CNPJ) — invalid-argument com a lista de erros;
//   2. CIFRA conta/PIX (AES-256-GCM + AAD=tenantId, chave do Secret
//      Manager — ADR-014) e grava `dadosBancariosSecret/current`
//      (read:false/write:false p/ TODO cliente — RN-354);
//   3. grava `dadosBancarios/current` SÓ com campos MASCARADOS
//      (`****1234`, `***@g***.com`, `***.***.***-12`);
//   4. devolve ao cliente APENAS o mascarado.
//
// CPF/CNPJ completo NÃO é armazenado em lugar NENHUM (minimização LGPD —
// ADR-014 "fora de escopo": o admin confere o favorecido por titular +
// final do documento). Só conta e PIX vão ao envelope cifrado.
//
// IDEMPOTENTE: reenvio sobrescreve os dois docs PRESERVANDO `criadoEm`
// (aceite T2) — retry de rede não duplica nem rejuvenesce o cadastro.
// FAIL-CLOSED: sem `BANK_DATA_KEY` no ambiente ⇒ failed-precondition e
// NENHUMA escrita (nunca gravar em claro "por enquanto").
// Logs NUNCA carregam conta/PIX (ADR-014 §5) — só tenantId e keyVersion.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https, runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  isTipoContaBancaria,
  type AuthClaims,
  type DadosBancariosSnapshot,
} from '@leela/core';
import { assertTenantAtivo } from '../eventos/criarEvento';
import { assertTenantOwner, type FinanceCaller } from './atores';
import {
  chaveVigente,
  cifrarDadosBancarios,
  ENV_BANK_DATA_KEY,
  mascararConta,
  mascararCpfCnpj,
  mascararPix,
  somenteDigitos,
} from './cifraDadosBancarios';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------

export interface SaveDadosBancariosInput {
  banco: string;
  agencia: string;
  /** Número da conta EM CLARO — só trafega no callable; nunca persiste. */
  conta: string;
  tipo: string;
  /** Chave PIX em claro — opcional. */
  pix?: string;
  titular: string;
  /** CPF/CNPJ do titular — usado SÓ para derivar a máscara. */
  cpfCnpj: string;
}

export interface SaveDadosBancariosResult {
  /** SEMPRE e SOMENTE a versão mascarada (RN-354). */
  dadosBancarios: DadosBancariosSnapshot;
}

const BANCO_MAX = 80;
const AGENCIA_MAX = 10;
const CONTA_DIGITOS_MIN = 4;
const CONTA_DIGITOS_MAX = 20;
const PIX_MAX = 140;
const TITULAR_MAX = 120;

/** Valida o input — lista de erros acionáveis (vazia = válido). @pure */
export function validarDadosBancariosInput(raw: unknown): string[] {
  const erros: string[] = [];
  if (typeof raw !== 'object' || raw === null) {
    return ['payload deve ser um objeto.'];
  }
  const input = raw as Record<string, unknown>;

  const banco = input['banco'];
  if (typeof banco !== 'string' || banco.trim().length === 0) {
    erros.push('"banco" é obrigatório.');
  } else if (banco.trim().length > BANCO_MAX) {
    erros.push(`"banco" excede ${BANCO_MAX} caracteres.`);
  }

  const agencia = input['agencia'];
  if (
    typeof agencia !== 'string' ||
    somenteDigitos(agencia).length === 0 ||
    agencia.trim().length > AGENCIA_MAX
  ) {
    erros.push(`"agencia" deve ter dígitos (máx. ${AGENCIA_MAX} caracteres).`);
  }

  const conta = input['conta'];
  if (typeof conta !== 'string') {
    erros.push('"conta" é obrigatória.');
  } else {
    const d = somenteDigitos(conta).length;
    if (d < CONTA_DIGITOS_MIN || d > CONTA_DIGITOS_MAX) {
      erros.push(
        `"conta" deve ter entre ${CONTA_DIGITOS_MIN} e ${CONTA_DIGITOS_MAX} dígitos.`
      );
    }
  }

  if (!isTipoContaBancaria(input['tipo'])) {
    erros.push('"tipo" deve ser corrente|poupanca.');
  }

  const pix = input['pix'];
  if (pix !== undefined) {
    if (typeof pix !== 'string' || pix.trim().length === 0) {
      erros.push('"pix" quando presente deve ser string não-vazia.');
    } else if (pix.length > PIX_MAX) {
      erros.push(`"pix" excede ${PIX_MAX} caracteres.`);
    }
  }

  const titular = input['titular'];
  if (typeof titular !== 'string' || titular.trim().length < 3) {
    erros.push('"titular" é obrigatório (mínimo 3 caracteres).');
  } else if (titular.trim().length > TITULAR_MAX) {
    erros.push(`"titular" excede ${TITULAR_MAX} caracteres.`);
  }

  const cpfCnpj = input['cpfCnpj'];
  if (typeof cpfCnpj !== 'string') {
    erros.push('"cpfCnpj" é obrigatório.');
  } else {
    const d = somenteDigitos(cpfCnpj).length;
    if (d !== 11 && d !== 14) {
      erros.push('"cpfCnpj" deve ter 11 (CPF) ou 14 (CNPJ) dígitos.');
    }
  }

  return erros;
}

/** Deriva a projeção MASCARADA (a única que persiste legível). @pure */
export function derivarMascarado(
  tenantId: string,
  input: SaveDadosBancariosInput
): DadosBancariosSnapshot {
  return {
    tenantId,
    banco: input.banco.trim(),
    agencia: input.agencia.trim(),
    contaMascarada: mascararConta(input.conta),
    tipo: input.tipo as DadosBancariosSnapshot['tipo'],
    pixMascarado: input.pix !== undefined ? mascararPix(input.pix.trim()) : null,
    titular: input.titular.trim(),
    cpfCnpjMascarado: mascararCpfCnpj(input.cpfCnpj),
  };
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function saveDadosBancariosCore(
  db: Db,
  rawInput: unknown,
  caller: FinanceCaller
): Promise<SaveDadosBancariosResult> {
  const tenantId = assertTenantOwner(caller.claims);

  const erros = validarDadosBancariosInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `Dados bancários inválidos: ${erros.join(' ')}`
    );
  }
  const input = rawInput as unknown as SaveDadosBancariosInput;

  await assertTenantAtivo(db, tenantId);

  // FAIL-CLOSED (ADR-014 §3): sem chave, NADA é escrito — jamais em claro.
  const chave = chaveVigente();
  if (chave === null) {
    throw new https.HttpsError(
      'failed-precondition',
      'Cifra de dados bancários não configurada (BANK_DATA_KEY) — operação bloqueada (RN-354).'
    );
  }

  const mascarado = derivarMascarado(tenantId, input);
  const envelope = cifrarDadosBancarios(
    { conta: input.conta.trim(), pix: input.pix?.trim() ?? null },
    tenantId,
    chave
  );

  const publicoRef = db.doc(`tenants/${tenantId}/dadosBancarios/current`);
  const secretRef = db.doc(`tenants/${tenantId}/dadosBancariosSecret/current`);

  await db.runTransaction(async (tx) => {
    const atual = await tx.get(publicoRef);
    const agora = FieldValue.serverTimestamp();
    // Reenvio sobrescreve idempotente PRESERVANDO criadoEm (aceite T2)
    const criadoEm = atual.exists ? (atual.get('criadoEm') as unknown) : agora;
    tx.set(publicoRef, { ...mascarado, criadoEm, atualizadoEm: agora });
    tx.set(secretRef, { tenantId, ...envelope, atualizadoEm: agora });
  });

  // Sem dado sensível no log (ADR-014 §5) — só id e versão da chave
  logger.info('dados_bancarios_salvos', {
    tenantId,
    keyVersion: envelope.keyVersion,
  });

  return { dadosBancarios: mascarado };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/**
 * `saveDadosBancarios` — callable do painel (tenant_owner). Em produção a
 * chave chega via Secret Manager (`runWith({ secrets })` — ADR-014 §3);
 * no Emulator, a MESMA env setada localmente.
 */
export const saveDadosBancarios = runWith({
  secrets: [ENV_BANK_DATA_KEY],
}).https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return saveDadosBancariosCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
