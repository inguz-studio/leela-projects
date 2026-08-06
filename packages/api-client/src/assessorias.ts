// =============================================================================
// @leela/api-client — assessorias parceiras (LEELA-E18 · S1800/S1801/S1802/S1803)
//
// Wrappers tipados de `httpsCallable` para as 4 Cloud Functions do épico E18 +
// um LEITOR tenant-scoped da subcoleção `tenants/{tid}/parceirosAssessoria`.
//
// SÓ transporte (padrão checkout.ts/finance.ts): documento (dígito verificador),
// máquina de estados, convite/token e cupom escopado são decisão EXCLUSIVA do
// servidor (functions/src/assessorias/*). Os contratos abaixo são o ESPELHO das
// Cloud Functions — o cliente não depende de `functions`.
//
// ESCRITA da parceria/clube/convite é NEGADA para todo client SDK (Rules
// write:false — postura pós-19c8afe): cadastro/aceite/encerramento/condição
// passam pelas callables. A LEITURA da lista é liberada ao papel de ESCRITA do
// tenant (owner/staff) — promoter/athlete não leem CPF/CNPJ de terceiros (LGPD).
// =============================================================================

import { httpsCallable } from 'firebase/functions';
import {
  collection,
  getDocs,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore';
import {
  COLECAO_PARCEIROS_ASSESSORIA,
  parseParceriaAssessoria,
  type ParceriaAssessoria,
  type StatusParceriaAssessoria,
  type TipoCupom,
  SENHA_MIN as SENHA_MIN_CASA,
} from '@leela/core';
import { getLeelaFunctions } from './firebase';

// ---------------------------------------------------------------------------
// S1800 — cadastrar assessoria como club parceiro (CNPJ/CPF)
// ---------------------------------------------------------------------------

export interface CadastrarAssessoriaInput {
  /** Nome da assessoria (vira o nome do clube — 1..60). */
  nome: string;
  /** CNPJ ou CPF, com ou sem máscara (validação + dedupe RN-361 no servidor). */
  documento: string;
  /** E-mail do responsável (chave do convite — RN-106/362). */
  responsavelEmail: string;
}

export interface CadastrarAssessoriaResult {
  /** docId da parceria (= documento normalizado — RN-361). */
  parceriaId: string;
  /** docId (slug) do clube parceiro. */
  clubeId: string;
  status: StatusParceriaAssessoria;
  /** true = conta existia, vínculo ativo na hora (RN-362). */
  vinculoImediato: boolean;
  /** true = documento já cadastrado (replay/reenvio — nada duplicado). */
  jaExistia: boolean;
  /**
   * Token de aceite (SÓ no ramo convite — compõe o link da landing). Enquanto o
   * EmailProvider é mock, o servidor devolve o token ao ORGANIZADOR (que entrega
   * o link ao responsável). Em produção sem EmailProvider, o ramo convite é
   * FAIL-CLOSED (failed-precondition) — a UI mostra o estado honesto.
   */
  tokenAceite?: string;
}

/**
 * Cadastra uma assessoria como club parceiro do tenant (S1800). Conta do
 * responsável já existe ⇒ vínculo imediato; não existe ⇒ convite pendente com
 * token (só emulator/sandbox). Dedupe por documento é estrutural no servidor.
 */
export async function cadastrarAssessoriaParceira(
  input: CadastrarAssessoriaInput
): Promise<CadastrarAssessoriaResult> {
  const fn = httpsCallable<CadastrarAssessoriaInput, CadastrarAssessoriaResult>(
    getLeelaFunctions(),
    'cadastrarAssessoriaParceira'
  );
  const { data } = await fn(input);
  return data;
}

// ---------------------------------------------------------------------------
// S1801 — aceite do convite + provisionamento (callable PÚBLICA, sem auth)
// ---------------------------------------------------------------------------

export interface ProvisionAssessoriaInput {
  tenantId: string;
  /** docId da parceria (= documento normalizado — veio no link). */
  parceriaId: string;
  /** Token de aceite do link (o doc guarda só o hash). */
  token: string;
  /** Senha da conta NOVA (ignorada quando a conta já existe). */
  senha?: string;
  /** Nome de exibição do responsável (fallback: nome da assessoria). */
  nome?: string;
}

export interface ProvisionAssessoriaResult {
  ok: true;
  clubeId: string;
  /** true = aceite já estava integralmente provisionado (retry). */
  replay: boolean;
}

/**
 * Piso da senha desta porta — APELIDO da política da casa. Era 'espelho de
 * SENHA_MIN da Function — premissa': duas autoridades sobre a mesma régua.
 * Agora as duas leem `@leela/core` · platform/politicaDeSenha.
 */
export const SENHA_MIN_ASSESSORIA = SENHA_MIN_CASA;

/**
 * Aceita o convite de assessoria (S1801-T2 — página pública de aceite na
 * landing). Callable PÚBLICA: o responsável ainda não tem conta e o token do
 * link É a credencial. Conta nova exige senha; conta existente é vinculada sem
 * tocar credenciais. Idempotente (replay).
 */
export async function provisionAssessoriaAccount(
  input: ProvisionAssessoriaInput
): Promise<ProvisionAssessoriaResult> {
  const fn = httpsCallable<ProvisionAssessoriaInput, ProvisionAssessoriaResult>(
    getLeelaFunctions(),
    'provisionAssessoriaAccount'
  );
  const { data } = await fn(input);
  return data;
}

// ---------------------------------------------------------------------------
// S1802 — condição de desconto do club parceiro (via cupom escopado, sem split)
// ---------------------------------------------------------------------------

export interface DefinirCondicaoDescontoInput {
  /** docId da parceria (= documento normalizado). */
  parceriaId: string;
  /** Evento onde o cupom vale (cupom é subcoleção do evento — E04). */
  eventoId: string;
  /** Código do cupom (normalizado no servidor — vira o docId). */
  codigo: string;
  tipo: TipoCupom;
  /** % (0<v≤100) quando percentual; R$ (v>0) quando fixo. */
  valor: number;
  /** Teto de usos (int ≥ 1) — ausente/null = ilimitado. */
  tetoUso?: number | null;
  /** Janela de validade (millis epoch — serializável em callable). */
  inicioEmMillis: number;
  fimEmMillis: number;
}

export interface DefinirCondicaoDescontoResult {
  ok: true;
  /** Path do cupom criado: `eventos/{eventoId}/cupons/{CODIGO}`. */
  cupomRef: string;
  codigo: string;
}

/**
 * Define/redefine a condição de desconto exclusiva do club parceiro (S1802). A
 * condição materializa-se como um CUPOM escopado `club_parceiro` (ADR-012 — sem
 * segundo caminho de desconto, sem split). Exige parceria ATIVA (RN-364).
 */
export async function definirCondicaoDesconto(
  input: DefinirCondicaoDescontoInput
): Promise<DefinirCondicaoDescontoResult> {
  const fn = httpsCallable<DefinirCondicaoDescontoInput, DefinirCondicaoDescontoResult>(
    getLeelaFunctions(),
    'definirCondicaoDesconto'
  );
  const { data } = await fn(input);
  return data;
}

// ---------------------------------------------------------------------------
// S1803 — encerrar (revogar) a parceria
// ---------------------------------------------------------------------------

export interface EncerrarParceriaInput {
  /** docId da parceria (= documento normalizado). */
  parceriaId: string;
}

export interface EncerrarParceriaResult {
  ok: true;
  /** Estado antes do encerramento ('inativa' = replay idempotente). */
  statusAnterior: StatusParceriaAssessoria;
}

/**
 * Encerra uma parceria de assessoria (S1803). `convite_pendente`/`ativa` →
 * `inativa` (o link de aceite morre; o desconto morre por consequência —
 * ADR-012). `inativa` é terminal (replay idempotente). O doc é retido 90d
 * (RN-144). Rejeita `permission-denied` para quem não é writer do tenant.
 */
export async function encerrarParceriaAssessoria(
  input: EncerrarParceriaInput
): Promise<EncerrarParceriaResult> {
  const fn = httpsCallable<EncerrarParceriaInput, EncerrarParceriaResult>(
    getLeelaFunctions(),
    'encerrarParceriaAssessoria'
  );
  const { data } = await fn(input);
  return data;
}

// ---------------------------------------------------------------------------
// Leitura — lista de parcerias do tenant (S1803)
// ---------------------------------------------------------------------------

/**
 * Lista as parcerias de assessoria do tenant (`tenants/{tid}/parceirosAssessoria`),
 * mais recentes primeiro. Um doc corrompido (parse fail-fast) é isolado + logado,
 * não derruba a lista inteira (mesma disciplina de `listRepasses`). Só o papel de
 * escrita do tenant (owner/staff) lê — a Rule é a autoridade (LGPD, minimização).
 */
export async function listParceriasAssessoria(
  db: Firestore,
  tenantId: string
): Promise<ParceriaAssessoria[]> {
  const q = query(
    collection(db, 'tenants', tenantId, COLECAO_PARCEIROS_ASSESSORIA),
    orderBy('criadoEm', 'desc')
  );
  const snap = await getDocs(q);
  const out: ParceriaAssessoria[] = [];
  for (const d of snap.docs) {
    try {
      out.push(parseParceriaAssessoria(d.id, d.data()));
    } catch (err) {
      console.error(`[listParceriasAssessoria] parceria "${d.id}" corrompida — omitida`, err);
    }
  }
  return out;
}
