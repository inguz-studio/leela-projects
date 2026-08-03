// =============================================================================
// packages/core/src/platform/cadastroOrganizador.ts
//
// Cadastro do organizador e consentimento LGPD (E00 · S030 · RN-411/412).
//
// Cadastro ABERTO, acesso TRAVADO (D-ONB-1): qualquer pessoa cria a conta sem
// código de convite. O que a segura é a ausência de claim de tenant — não este
// formulário. Aqui vive só o contrato dos dados e a validação PURA, reusada
// pela tela (`/cadastrar`), pela Rule de create do próprio doc (S030-T2) e
// pela Function de resgate (S1609-T1), que deriva o tenant daqui (P7).
//
// LGPD (RN-412): o checkbox NASCE DESMARCADO e o consentimento é carimbado com
// VERSÃO e INSTANTE. Consentimento sem versão não prova nada seis meses depois
// — o texto muda e ninguém sabe ao que a pessoa disse sim. PII vive só no doc
// `profissionais`, nunca em claims. CPF/CNPJ e KYC ficam fora (Won't do E16).
//
// Telefone REUSA `telefoneValido`/`normalizarTelefone` de eventos/dadosPessoais
// (10–13 dígitos, máscara livre, teto bruto de 32 chars). Uma segunda régua de
// telefone no mesmo produto significaria dois formatos persistidos para o mesmo
// dado de contato.
// =============================================================================

import { telefoneValido } from '../eventos/dadosPessoais';

// ---------------------------------------------------------------------------
// Termo de consentimento — versão e finalidade
// ---------------------------------------------------------------------------

/**
 * Versão do termo aceito no cadastro (RN-412). Mudou o texto do termo? Suba
 * esta constante NO MESMO commit — é ela que amarra o "sim" ao que foi lido.
 */
export const TERMO_LGPD_VERSAO = '2026-07-28';

/**
 * Finalidade declarada do tratamento (RN-412). Base legal dos dados
 * cadastrais: procedimentos preliminares de contrato (LGPD art. 7º, V); a
 * comunicação de onboarding é o que este consentimento cobre.
 */
export const TERMO_LGPD_FINALIDADE =
  'Criação e gestão da conta de organizador na plataforma Leela e contato do ' +
  'time Leela sobre a liberação do acesso.';

/** Carimbo persistido em `profissionais/{uid}.consentimentoLgpd` (RN-412). */
export interface ConsentimentoLgpd {
  versao: string;
  /** Instante do aceite — `Timestamp` no Firestore, `Date` nos testes. */
  aceitoEm: unknown;
  finalidade: string;
}

/** Estado do onboarding do organizador (RN-411). */
export type StatusOnboarding = 'aguardando_convite' | 'ativo';

// ---------------------------------------------------------------------------
// Contrato do cadastro
// ---------------------------------------------------------------------------

/**
 * Dados coletados no `/cadastrar` (RN-412 · P8). Senha não entra aqui: ela
 * vai direto ao Firebase Auth e nunca transita por este contrato nem por log.
 */
export interface CadastroOrganizadorInput {
  nome: string;
  email: string;
  /** Telefone/WhatsApp — só dígitos após `normalizarTelefone`. */
  telefone: string;
  /** Nome da organização/produtora — semente do futuro tenant (P7). */
  organizacao: string;
  /** Aceite explícito do termo. `false` bloqueia o cadastro (RN-412). */
  consentimentoLgpd: boolean;
}

export const NOME_ORGANIZADOR_MIN = 2;
export const NOME_ORGANIZADOR_MAX = 80;
export const ORGANIZACAO_MIN = 2;
export const ORGANIZACAO_MAX = 80;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------------

/**
 * Deriva um slug kebab-case do nome da organização (P7) — a semente do
 * `tenantId` no resgate. Acentos viram a letra base, o resto vira hífen.
 * Devolve `''` quando não sobra nada aproveitável (nome só de símbolos): o
 * chamador decide o fallback, porque só ele sabe o que tem em mãos para
 * desempatar (uid, e-mail, sufixo).
 * @pure
 */
export function derivarSlugOrganizacao(nome: unknown): string {
  if (typeof nome !== 'string') return '';
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

// ---------------------------------------------------------------------------
// Validação pura
// ---------------------------------------------------------------------------

/**
 * Valida o cadastro (RN-412). Devolve lista de erros — vazia = válido.
 * Pura e compartilhada: a tela usa para habilitar o botão, a Function usa
 * para não confiar na tela.
 * @pure
 */
export function validarCadastroOrganizador(
  input: Partial<CadastroOrganizadorInput> | null | undefined
): string[] {
  const erros: string[] = [];
  const dados = input ?? {};

  const nome = typeof dados.nome === 'string' ? dados.nome.trim() : '';
  if (nome.length < NOME_ORGANIZADOR_MIN || nome.length > NOME_ORGANIZADOR_MAX) {
    erros.push(
      `nome deve ter entre ${NOME_ORGANIZADOR_MIN} e ${NOME_ORGANIZADOR_MAX} caracteres.`
    );
  }

  const email = typeof dados.email === 'string' ? dados.email.trim() : '';
  if (!EMAIL_RE.test(email)) {
    erros.push('e-mail inválido.');
  }

  if (!telefoneValido(dados.telefone)) {
    erros.push('telefone deve ter entre 10 e 13 dígitos.');
  }

  const organizacao =
    typeof dados.organizacao === 'string' ? dados.organizacao.trim() : '';
  if (organizacao.length < ORGANIZACAO_MIN || organizacao.length > ORGANIZACAO_MAX) {
    erros.push(
      `nome da organização deve ter entre ${ORGANIZACAO_MIN} e ${ORGANIZACAO_MAX} caracteres.`
    );
  }

  if (dados.consentimentoLgpd !== true) {
    erros.push('consentimento LGPD é obrigatório.');
  }

  return erros;
}
