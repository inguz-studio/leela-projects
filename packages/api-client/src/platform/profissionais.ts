// =============================================================================
// packages/api-client/src/platform/profissionais.ts
//
// Leitura de `profissionais/{profId}` + join tenant → owner (CONS-4-T1).
//
// A tela de detalhe do tenant (S1601/L2) mostrava o `ownerUid` cru porque o
// modelo do tenant só carrega o uid do dono. O nome real vive em
// `profissionais/{ownerUid}` — e as Rules JÁ permitem essa leitura para
// exatamente os mesmos leitores do tenant (platform_admin; membro do tenant
// via `resource.data.tenantId`). Por isso a forma mínima é um READER com
// join, não denormalização: o padrão 🔁 (espelho por Function + backfill)
// fica reservado para dados que cruzam fronteira de tenant (ex.: parceria);
// aqui não há fronteira nem amplificação de leitura (1 getDoc extra por
// tela de detalhe).
//
// ESCRITA (S030-T2 · RN-411/412): a ÚNICA escrita de cliente permitida aqui é
// o auto-cadastro do organizador criando o PRÓPRIO doc, com shape fechado pela
// Rule (`hasOnly`) — sem `tenantId`, sem `papeis`, `statusOnboarding` preso em
// `aguardando_convite`. Tudo o mais em `profissionais` segue write-only de
// platform_admin/Function.
// =============================================================================

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  TERMO_LGPD_FINALIDADE,
  TERMO_LGPD_VERSAO,
  normalizarTelefone,
  type Profissional,
  type Tenant,
} from '@leela/core';
import { httpsCallable } from 'firebase/functions';
import { getLeelaFunctions } from '../firebase';
import { getTenant } from './tenants';

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

/**
 * Lê um profissional pelo uid.
 * Security Rule garante: o próprio, membro do tenant dele ou platform_admin.
 */
export async function getProfissional(
  db: Firestore,
  profId: string
): Promise<Profissional | null> {
  const snap = await getDoc(doc(db, 'profissionais', profId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Profissional;
}

/** Resultado do join tenant → owner (owner null-safe). */
export interface TenantComOwner {
  tenant: Tenant;
  /** Perfil do dono — null quando `profissionais/{ownerUid}` não existe */
  owner: Profissional | null;
}

/**
 * Join de 1 salto: tenant + perfil do owner (`profissionais/{ownerUid}`).
 * `owner: null` quando o doc do profissional não existe (tenant legado /
 * provisionamento incompleto) — a UI cai no fallback (uid) sem quebrar.
 */
export async function getTenantComOwner(
  db: Firestore,
  tenantId: string
): Promise<TenantComOwner | null> {
  const tenant = await getTenant(db, tenantId);
  if (!tenant) return null;

  const owner = tenant.ownerUid
    ? await getProfissional(db, tenant.ownerUid)
    : null;

  return { tenant, owner };
}

// ---------------------------------------------------------------------------
// Escrita — auto-cadastro do organizador (S030-T2 · RN-411/412)
// ---------------------------------------------------------------------------

/** Dados que o `/cadastrar` grava no doc do próprio profissional. */
export interface PerfilOrganizadorInput {
  nome: string;
  email: string;
  /** Cru da tela; normalizado para só dígitos antes de gravar. */
  telefone: string;
  organizacao: string;
}

/**
 * Cria `profissionais/{uid}` logo após o cadastro (RN-411/412).
 *
 * A conta nasce SEM tenant e SEM claim: o doc registra `statusOnboarding:
 * 'aguardando_convite'` e carimba o consentimento LGPD com VERSÃO, FINALIDADE
 * e INSTANTE DO SERVIDOR — data de cliente é relógio do usuário, e um aceite
 * datado pelo próprio titular não vale como prova.
 *
 * O `tenantId` NÃO entra aqui de propósito: o vínculo com o tenant é escrito
 * pelo resgate do convite (RN-414), server-side. A Rule recusa o campo.
 */
export async function criarPerfilOrganizador(
  db: Firestore,
  uid: string,
  input: PerfilOrganizadorInput
): Promise<void> {
  await setDoc(doc(db, 'profissionais', uid), {
    id: uid,
    nome: input.nome.trim(),
    email: input.email.trim(),
    telefone: normalizarTelefone(input.telefone),
    organizacao: input.organizacao.trim(),
    statusOnboarding: 'aguardando_convite',
    consentimentoLgpd: {
      versao: TERMO_LGPD_VERSAO,
      finalidade: TERMO_LGPD_FINALIDADE,
      aceitoEm: serverTimestamp(),
    },
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// A ponte da área do cliente (S1234-T1 · RN-512)
// ---------------------------------------------------------------------------

/**
 * Os motivos que o SERVIDOR nomeia, em `details.motivo`.
 *
 * Esta lista é a fonte: a união abaixo é derivada dela, e não escrita ao lado.
 * Antes eram duas listas — a união e o array de validação — e uma recusa nova
 * que entrasse só na união passaria a compilar e a cair em `indisponivel` em
 * produção: a pessoa leria "tente de novo em instantes" para uma recusa que o
 * servidor tinha acabado de nomear.
 */
const MOTIVOS_NOMEADOS = [
  'sem_sessao',
  'sessao_anonima',
  'conta_de_plataforma',
  /**
   * PONTE-ELEGIVEL-1: a conta que o resgate do código recusaria (divulgador,
   * ex-organizadora rebaixada de propósito) para na PORTA, com frase própria,
   * em vez de atravessar e ouvir "código inválido" dias depois.
   */
  'conta_inelegivel',
  'aceite_ausente',
  'aceite_datado_pelo_cliente',
] as const;

/**
 * As recusas nomeadas da promoção. Vêm em `details.motivo` do callable; a
 * TELA escolhe a frase, porque copy é voz do produto e não contrato de API.
 * `indisponivel` é o balde do que não é recusa de regra (rede, deploy ainda
 * não propagado) — e existe para que nenhuma dessas chegue à pessoa como
 * "erro interno".
 */
export type MotivoRecusaPromocao = (typeof MOTIVOS_NOMEADOS)[number] | 'indisponivel';

export interface PromocaoProfissionalResult {
  statusOnboarding: 'aguardando_convite';
  /** true = a conta já alcançava o painel profissional; nada foi escrito. */
  jaExistia: boolean;
}

/**
 * Promove a conta LOGADA a profissional (RN-512).
 *
 * A conta já existe — este é o gesto que a área do cliente precisava em vez de
 * mandar a pessoa ao `/cadastrar` do painel, que só sabe CRIAR conta e devolve
 * a negativa única anti-enumeração para quem já tem uma.
 *
 * Idempotente por construção do servidor: chamar duas vezes devolve sucesso e
 * não recolhe consentimento (RN-467). O aceite viaja como booleano puro — a
 * VERSÃO e o INSTANTE são carimbados pelo servidor (RN-446/RN-466), e mandar
 * qualquer um dos dois daqui é recusado de propósito.
 */
export async function promoverParaProfissional(): Promise<PromocaoProfissionalResult> {
  const fn = httpsCallable<{ aceiteTermo: true }, PromocaoProfissionalResult>(
    getLeelaFunctions(),
    'promoverParaProfissional'
  );
  const { data } = await fn({ aceiteTermo: true });
  return data;
}

/**
 * Traduz a falha da promoção no motivo que a tela sabe dizer.
 *
 * A leitura é do `details.motivo` que o servidor manda, e NÃO do código HTTP:
 * derivar o motivo do código obrigaria a tela a reconstruir a regra, e no dia
 * em que uma recusa nova nascesse com o mesmo código a pessoa leria a frase
 * errada. Motivo desconhecido vira `indisponivel` — nunca uma mensagem crua.
 */
export function motivoDaRecusaDaPromocao(erro: unknown): MotivoRecusaPromocao {
  const detalhe = (erro as { details?: { motivo?: unknown } } | null)?.details?.motivo;
  if (
    typeof detalhe === 'string' &&
    (MOTIVOS_NOMEADOS as readonly string[]).includes(detalhe)
  ) {
    return detalhe as MotivoRecusaPromocao;
  }
  // Fallback estreito e só para o caso que o transporte resolve sozinho: sem
  // sessão o SDK recusa antes de sair do navegador, e ali não há `details`.
  const code = (erro as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code.includes('unauthenticated')) return 'sem_sessao';
  return 'indisponivel';
}
