// =============================================================================
// packages/core/src/platform/contaParticipante.ts
//
// O contrato da conta de PARTICIPANTE criada pelas duas portas da landing
// (S1229/S1230 · RN-478 · RN-479 · RN-480).
//
// POR QUE ELE MORA NO CORE, E POR QUE ISSO NÃO É PREFERÊNCIA DE ARQUITETURA:
// a lição do DEF-A da ONBOARD-REV é literal — régua de tela mais frouxa que a
// do servidor produz CONTA ÓRFÃ. A tela habilita o botão com a mesma função
// que o servidor usa para não confiar na tela, e nenhuma régua nova nasce em
// `apps/`. É o mesmo desenho de `validarCadastroOrganizador`, ao lado.
//
// ESTE É TAMBÉM O CONTRATO QUE O `/cadastrar` VAI CONSUMIR. A fila da
// SPEC-QUALIFICACAO mexe no mesmo módulo do core; qualquer ordem funciona
// desde que a segunda consuma o contrato da primeira. O que não pode acontecer
// é nascerem dois contratos paralelos criando a mesma conta com réguas que
// divergem na primeira revisão de copy — é o CONTA-2 do painel.
// =============================================================================

import {
  TERMO_LGPD_FINALIDADE,
  TERMO_LGPD_VERSAO,
} from './cadastroOrganizador';
import { SENHA_MAX, SENHA_MIN, senhaValida } from './politicaDeSenha';

// ---------------------------------------------------------------------------
// Senha
// ---------------------------------------------------------------------------

/**
 * O piso da senha desta porta é o piso da CASA — não um número desta porta.
 *
 * O comentário que estava aqui dizia, em 2026-07-28, que se a casa quisesse
 * subir o piso ela subiria "o dos dois no mesmo commit, e o número é este
 * aqui". O dono pediu a regra de composição (número + caractere especial) e
 * esse dia chegou: o número saiu deste arquivo e virou `platform/politicaDeSenha`,
 * onde a régua vale para as DUAS telas, para as três Functions que criam senha
 * e para qualquer porta futura. Estes nomes continuam existindo porque o
 * api-client e as Functions os importam — mas são apelidos, não autoridades.
 */
export const SENHA_CONTA_MIN = SENHA_MIN;
export const SENHA_CONTA_MAX = SENHA_MAX;

/** @pure — a política inteira (comprimento + número + especial). */
export function senhaDeContaValida(senha: unknown): boolean {
  return senhaValida(senha);
}

// ---------------------------------------------------------------------------
// Termo e consentimento (RN-479)
// ---------------------------------------------------------------------------

/**
 * A versão do termo da conta — REEXPORTADA, nunca copiada (RN-479/RN-466).
 *
 * Sob a RN-466 existem dois termos: o DA CONTA, que o `/cadastrar` usa e que
 * esta porta usa, e o DO PROFISSIONAL, que nasce na promoção com constante
 * própria. `TERMO_LGPD_VERSAO` é o primeiro. Escrever `'2026-07-28'` aqui
 * criaria a segunda autoridade sobre o mesmo termo — e no dia em que o texto
 * mudasse, uma das duas superfícies carimbaria a versão errada, que é
 * exatamente a divergência que a RN-466 existe para impedir.
 */
export const TERMO_CONTA_VERSAO = TERMO_LGPD_VERSAO;
export const TERMO_CONTA_FINALIDADE = TERMO_LGPD_FINALIDADE;

// ---------------------------------------------------------------------------
// Nome
// ---------------------------------------------------------------------------

export const NOME_PARTICIPANTE_MIN = 2;
export const NOME_PARTICIPANTE_MAX = 80;

// ---------------------------------------------------------------------------
// O contrato de criação
// ---------------------------------------------------------------------------

/**
 * O que a porta de criação recebe (RN-478/RN-479).
 *
 * A senha NÃO entra neste contrato pelo mesmo motivo que não entra no do
 * organizador: ela vai direto ao Firebase Auth e nunca transita por objeto de
 * domínio nem por log. Quem a valida é `senhaDeContaValida`, à parte.
 *
 * O INSTANTE do aceite também não entra: ele é do SERVIDOR (RN-446). Aceite
 * datado pelo cliente é recusado — ver `aceiteDatadoPeloCliente`.
 */
export interface ContaParticipanteInput {
  nome: string;
  email: string;
  /** Aceite explícito do termo da conta. `false` bloqueia a criação (RN-479). */
  consentimentoLgpd: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida o contrato de criação. Devolve lista de erros — vazia = válido.
 * Pura e compartilhada: a tela usa para habilitar o botão, o servidor usa para
 * não confiar na tela.
 * @pure
 */
export function validarContaParticipante(
  input: Partial<ContaParticipanteInput> | null | undefined
): string[] {
  const erros: string[] = [];
  const dados = input ?? {};

  const nome = typeof dados.nome === 'string' ? dados.nome.trim() : '';
  if (nome.length < NOME_PARTICIPANTE_MIN || nome.length > NOME_PARTICIPANTE_MAX) {
    erros.push(
      `nome deve ter entre ${NOME_PARTICIPANTE_MIN} e ${NOME_PARTICIPANTE_MAX} caracteres.`
    );
  }

  const email = typeof dados.email === 'string' ? dados.email.trim() : '';
  if (!EMAIL_RE.test(email)) erros.push('e-mail inválido.');

  // Checkbox nasce DESMARCADO e `false` bloqueia (RN-412/RN-479). A
  // comparação é estrita: `'true'`, `1` e `'on'` não são consentimento.
  if (dados.consentimentoLgpd !== true) {
    erros.push('consentimento LGPD é obrigatório.');
  }

  return erros;
}

/**
 * O cliente tentou datar o próprio aceite? (RN-446)
 *
 * Carimbo de consentimento vindo do cliente é prova que a pessoa carimbou para
 * si mesma. O servidor recusa a chamada inteira em vez de ignorar o campo em
 * silêncio: ignorar deixaria uma tela achando que datou, e a discrepância só
 * apareceria numa auditoria, seis meses depois.
 * @pure
 */
export function aceiteDatadoPeloCliente(input: unknown): boolean {
  if (typeof input !== 'object' || input === null) return false;
  const bruto = input as Record<string, unknown>;
  for (const campo of ['aceitoEm', 'consentimentoEm', 'consentimentoLgpdEm']) {
    if (bruto[campo] !== undefined) return true;
  }
  const consentimento = bruto['consentimentoLgpd'];
  return typeof consentimento === 'object' && consentimento !== null;
}
