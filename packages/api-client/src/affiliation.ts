// =============================================================================
// @leela/api-client — afiliados/influenciadores (LEELA-R9E · S-R9-11 ·
// RN-313..319 — recorte antecipado do E08)
//
// Wrappers tipados de `httpsCallable` — SÓ transporte (padrão assessorias.ts):
// refCodigo/token/∑/gate de desconto são decisão EXCLUSIVA do servidor
// (functions/src/affiliation/*). A escrita da subcoleção `afiliados` é NEGADA
// a todo client SDK (Rules write:false).
// =============================================================================

import { httpsCallable } from 'firebase/functions';
import { getLeelaFunctions } from './firebase';

// ---------------------------------------------------------------------------
// salvarAfiliado (organizador — modal RN-317)
// ---------------------------------------------------------------------------

/**
 * Config de comissão do afiliado (FASE 2 · COMF2): percentual sobre o valor
 * FACE (0,01..100, passo 0,01) OU R$ fixo POR INSCRIÇÃO confirmada. O
 * ORGANIZADOR define (RN-310); mudar só afeta conversões FUTURAS (a config é
 * congelada por conversão no servidor).
 */
export interface ComissaoAfiliadoClient {
  tipo: 'percentual' | 'valor_fixo';
  percentual?: number;
  valorPorInscricao?: number;
}

export interface SalvarAfiliadoClientInput {
  eventoId: string;
  refCodigo?: string;
  tipo: 'clube' | 'pessoa_fisica';
  nome: string;
  canal?: string;
  janelaAtribuicaoDias?: number;
  /** RN-315: mínimo de inscrições p/ o desconto do cupom ativar (clube). */
  minimoInscricoes?: number | null;
  /** Cupom do evento vinculado ao link (desconto) — null desamarra. */
  cupomCodigo?: string | null;
  clubeRef?: string;
  /** PF (RN-316): e-mail do convite. */
  responsavelEmail?: string;
  /** PF: CPF opcional — o servidor persiste SÓ mascarado. */
  documento?: string;
  status?: 'ativo' | 'inativo';
  /** FASE 2: null remove; ausente no update preserva a vigente. */
  comissao?: ComissaoAfiliadoClient | null;
}

export interface SalvarAfiliadoClientResult {
  afiliadoId: string;
  refCodigo: string;
  status: 'convite_pendente' | 'ativo' | 'inativo';
  jaExistia: boolean;
  /** SÓ sem EmailProvider (emulator/flag) — com provider o token vai por e-mail. */
  tokenAceite?: string;
  conviteEnviado?: boolean;
}

export async function salvarAfiliado(
  input: SalvarAfiliadoClientInput
): Promise<SalvarAfiliadoClientResult> {
  const fn = httpsCallable<SalvarAfiliadoClientInput, SalvarAfiliadoClientResult>(
    getLeelaFunctions(),
    'salvarAfiliado'
  );
  return (await fn(input)).data;
}

// ---------------------------------------------------------------------------
// provisionAfiliadoAccount (aceite PÚBLICO do convite PF — RN-316)
// ---------------------------------------------------------------------------

/** Senha mínima da conta nova (espelho do servidor). */
export const SENHA_MIN_AFILIADO = 8;

export interface ProvisionAfiliadoClientInput {
  eventoId: string;
  afiliadoId: string;
  token: string;
  senha?: string;
  nome?: string;
}

export interface ProvisionAfiliadoClientResult {
  ok: true;
  eventoId: string;
  afiliadoId: string;
  replay: boolean;
}

export async function provisionAfiliadoAccount(
  input: ProvisionAfiliadoClientInput
): Promise<ProvisionAfiliadoClientResult> {
  const fn = httpsCallable<ProvisionAfiliadoClientInput, ProvisionAfiliadoClientResult>(
    getLeelaFunctions(),
    'provisionAfiliadoAccount'
  );
  return (await fn(input)).data;
}

// ---------------------------------------------------------------------------
// Readers de projeção fechada (RN-318/319)
// ---------------------------------------------------------------------------

export interface ConversaoProjetada {
  valor: number;
  qtdInscricoes: number;
  /** Comissão congelada da conversão (FASE 2) — 0 em docs pré-fase-2. */
  comissao: number;
  convertidoEmMillis: number | null;
}

/** Repasse manual registrado (FASE 2 — extrato do saldo de comissão). */
export interface RepasseProjetado {
  valor: number;
  observacao: string | null;
  criadoEmMillis: number | null;
}

export interface MinhaAfiliacao {
  eventoId: string;
  eventoNome: string;
  /** Slug público do evento — monta `{landing}/{slug}?ref=` no painel. */
  eventoSlug: string;
  refCodigo: string;
  tipo: 'clube' | 'pessoa_fisica';
  status: string;
  janelaAtribuicaoDias: number;
  minimoInscricoes: number | null;
  cupomCodigo: string | null;
  conversoes: number;
  valorAtribuido: number;
  /** FASE 2 — termos read-only (RN-310) + saldo próprio (RN-318). O saldo
   *  PODE ser negativo (estorno depois de repasse já registrado). */
  comissao: ComissaoAfiliadoClient | null;
  comissaoAcumulada: number;
  comissaoRepassada: number;
  saldoComissao: number;
  ultimasConversoes: ConversaoProjetada[];
  ultimosRepasses: RepasseProjetado[];
}

export interface AfiliadoDoTenant extends MinhaAfiliacao {
  nome: string;
  canal: string | null;
  clubeRef: string | null;
  responsavelEmail: string | null;
  documentoMascarado: string | null;
}

/** Lado do INFLUENCIADOR: só as PRÓPRIAS conversões (RN-318). */
export async function getMinhasAfiliacoes(): Promise<{
  afiliacoes: MinhaAfiliacao[];
}> {
  const fn = httpsCallable<Record<string, never>, { afiliacoes: MinhaAfiliacao[] }>(
    getLeelaFunctions(),
    'getMinhasAfiliacoes'
  );
  return (await fn({})).data;
}

/** Lado do ORGANIZADOR: afiliados do PRÓPRIO tenant (RN-319). */
export async function getAfiliadosDoTenant(input?: {
  eventoId?: string;
}): Promise<{ afiliados: AfiliadoDoTenant[] }> {
  const fn = httpsCallable<
    { eventoId?: string },
    { afiliados: AfiliadoDoTenant[] }
  >(getLeelaFunctions(), 'getAfiliadosDoTenant');
  return (await fn(input ?? {})).data;
}

// ---------------------------------------------------------------------------
// registrarRepasseComissao (FASE 2 — repasse MANUAL, default proposto)
// ---------------------------------------------------------------------------

export interface RegistrarRepasseComissaoClientInput {
  eventoId: string;
  afiliadoId: string;
  /**
   * Chave de idempotência (8..64 chars URL-safe) — gere com
   * `crypto.randomUUID()` no submit e REUSE no retry: replay não debita 2×.
   */
  repasseId: string;
  /** R$ cent-exato > 0, limitado ao saldo de comissão do afiliado. */
  valor: number;
  observacao?: string;
}

export interface RegistrarRepasseComissaoClientResult {
  ok: true;
  repasseId: string;
  duplicado: boolean;
  saldoComissao: number;
}

/**
 * Registra um repasse MANUAL de comissão (pagamento feito FORA da
 * plataforma). Nenhum dinheiro é movido — split automático é fase 3.
 */
export async function registrarRepasseComissao(
  input: RegistrarRepasseComissaoClientInput
): Promise<RegistrarRepasseComissaoClientResult> {
  const fn = httpsCallable<
    RegistrarRepasseComissaoClientInput,
    RegistrarRepasseComissaoClientResult
  >(getLeelaFunctions(), 'registrarRepasseComissao');
  return (await fn(input)).data;
}
