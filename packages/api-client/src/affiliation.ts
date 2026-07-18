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
  convertidoEmMillis: number | null;
}

export interface MinhaAfiliacao {
  eventoId: string;
  eventoNome: string;
  refCodigo: string;
  tipo: 'clube' | 'pessoa_fisica';
  status: string;
  janelaAtribuicaoDias: number;
  minimoInscricoes: number | null;
  cupomCodigo: string | null;
  conversoes: number;
  valorAtribuido: number;
  ultimasConversoes: ConversaoProjetada[];
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
