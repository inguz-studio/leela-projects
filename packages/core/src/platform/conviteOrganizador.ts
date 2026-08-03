// =============================================================================
// packages/core/src/platform/conviteOrganizador.ts
//
// Convite de ORGANIZADOR para a plataforma (E16 · RN-413/414/415).
//
// NÃO confundir com os dois convites que já existem no produto:
//   - `clubes.codigoConvite` (RN-101) convida ATLETA para CLUBE;
//   - `clubes/{id}/convites` (S104) convida por e-mail para o clube.
// Este aqui é a porta da PLATAFORMA: quem resgata vira dono de um tenant
// (RN-414). Entidade própria, coleção própria, Rules próprias.
//
// Funções puras — sem I/O. O sorteio aceita um RNG injetável para teste; a
// avaliação de validade recebe o instante, porque o relógio que vale é o do
// SERVIDOR (a Function passa o dele; o cliente nunca decide).
//
// Alfabeto: reusa a MESMA constante do convite de clube (RN-101) em vez de
// abrir uma terceira cópia da string no repo. O que muda é o TAMANHO — 8 em
// vez de 5 — porque este código é porta de plataforma e não de comunidade:
// 31^8 ≈ 8.5e11 combinações contra 31^5 ≈ 2.9e7. Constante única (RN-157).
// =============================================================================

import { ALFABETO_CODIGO_CONVITE } from '../clubs/codigo-convite';

// ---------------------------------------------------------------------------
// Constantes (fonte única — Rules, Function, UI e seed derivam daqui)
// ---------------------------------------------------------------------------

/** Coleção top-level dos convites de organizador (docId = o próprio código). */
export const COLECAO_CONVITES_ORGANIZADOR = 'convitesOrganizador';

/**
 * Alfabeto do código (RN-413): A–Z sem `O I L` + 2–9 (sem `0 1`).
 * MESMA constante do convite de clube — um só lugar para mexer.
 */
export const ALFABETO_CODIGO_ORGANIZADOR = ALFABETO_CODIGO_CONVITE;

/** Comprimento fixo do código de organizador (RN-413). */
export const TAMANHO_CODIGO_ORGANIZADOR = 8;

/** Teto de tentativas de resgate por conta, por janela (RN-415). */
export const LIMITE_RESGATE_CONVITE = 5;

/** Largura da janela do rate-limit de resgate: 1 hora (RN-415). */
export const JANELA_RESGATE_CONVITE_MS = 60 * 60 * 1000;

/**
 * Erro ÚNICO e genérico do resgate (RN-414). Inexistente, usado, revogado e
 * expirado são indistinguíveis para quem chama — qualquer diferenciação vira
 * oráculo de enumeração de códigos válidos.
 */
export const ERRO_RESGATE_CONVITE = 'Código inválido ou já utilizado.';

/** Teto da nota livre que o super-admin escreve ao gerar (para quem é). */
export const NOTA_CONVITE_MAX = 200;

// Regex derivada das constantes acima — a string do alfabeto é a fonte.
const CODIGO_ORGANIZADOR_RE = new RegExp(
  `^[${ALFABETO_CODIGO_ORGANIZADOR}]{${TAMANHO_CODIGO_ORGANIZADOR}}$`
);

/**
 * Separadores tolerados na digitação e removidos na normalização: espaços
 * (incluindo NBSP), hífen ASCII e a família de travessões Unicode que um
 * copiar-colar de WhatsApp/e-mail costuma trazer.
 */
const SEPARADORES_RE = /[\s\u00a0\u2010-\u2015-]/g;

// ---------------------------------------------------------------------------
// Modelo
// ---------------------------------------------------------------------------

/** Ciclo de vida do convite (RN-413): `ativo → usado | revogado | expirado`. */
export type StatusConviteOrganizador = 'ativo' | 'usado' | 'revogado' | 'expirado';

/**
 * Documento `convitesOrganizador/{codigo}`. Datas ficam `unknown` porque o
 * mesmo shape atravessa Admin SDK (`Timestamp`), client SDK (`Timestamp`) e
 * testes puros (`Date`) — o core não importa o SDK de ninguém.
 */
export interface ConviteOrganizador {
  /** Redundante com o docId de propósito: a Rule confere os dois. */
  codigo: string;
  status: StatusConviteOrganizador;
  /** Nota livre do super-admin ("para o Francisco"). Opcional. */
  nota?: string;
  /** Validade opcional (RN-413) — sem validade por default (P3). */
  expiraEm?: unknown;
  criadoPor: string;
  criadoEm?: unknown;
  /** Carimbo de uso — escrito SÓ pela Function de resgate (RN-414). */
  usadoPor?: string;
  usadoEm?: unknown;
  /** Tenant provisionado pelo resgate. */
  tenantId?: string;
  revogadoPor?: string;
  revogadoEm?: unknown;
}

// ---------------------------------------------------------------------------
// Normalização e validação
// ---------------------------------------------------------------------------

/**
 * Normaliza o que o usuário digitou: trim, maiúsculas e remoção de espaços e
 * hífens (RN-413). `ab12-cd34` e `AB12 CD34` chegam no mesmo `AB12CD34`.
 *
 * Entrada não-string vira string vazia — o chamador valida depois.
 * @pure
 */
export function normalizarCodigoOrganizador(bruto: unknown): string {
  if (typeof bruto !== 'string') return '';
  return bruto.replace(SEPARADORES_RE, '').toUpperCase();
}

/**
 * Valida a FORMA do código (RN-413): 8 símbolos do alfabeto sem ambíguos.
 * Não diz nada sobre existência ou estado — isso é do servidor.
 * @pure
 */
export function validarCodigoOrganizador(codigo: string): boolean {
  return typeof codigo === 'string' && CODIGO_ORGANIZADOR_RE.test(codigo);
}

/**
 * Sorteia um código válido (RN-413).
 *
 * @param random fonte em [0, 1); default `Math.random`. Injetável nos testes.
 * @pure (dado o RNG)
 */
export function gerarCodigoOrganizador(random: () => number = Math.random): string {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO_ORGANIZADOR; i++) {
    // Clamp defensivo: RNG fora de [0,1) não pode indexar fora do alfabeto.
    const r = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);
    codigo += ALFABETO_CODIGO_ORGANIZADOR[
      Math.floor(r * ALFABETO_CODIGO_ORGANIZADOR.length)
    ];
  }
  return codigo;
}

// ---------------------------------------------------------------------------
// Elegibilidade (avaliada no resgate, contra o relógio do SERVIDOR)
// ---------------------------------------------------------------------------

/**
 * Converte qualquer representação de instante (Date, Timestamp do Firestore,
 * epoch ms, ISO) em epoch ms. `null` quando não dá para decidir — e quem
 * chama trata `null` como "sem validade".
 */
function instanteMs(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor.getTime();
  }
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'string') {
    const ms = Date.parse(valor);
    return Number.isNaN(ms) ? null : ms;
  }
  // Timestamp do Firestore (Admin e client SDK expõem toMillis()).
  const comToMillis = valor as { toMillis?: () => number };
  if (typeof comToMillis.toMillis === 'function') {
    const ms = comToMillis.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/**
 * O convite está expirado NESTE instante? Sem `expiraEm` nunca expira (P3).
 * A comparação é `<=`: o instante exato da validade já está fora.
 * @pure
 */
export function conviteExpirado(convite: Pick<ConviteOrganizador, 'expiraEm'>, agora: Date): boolean {
  const limite = instanteMs(convite.expiraEm);
  if (limite === null) return false;
  return limite <= agora.getTime();
}

/**
 * O convite é resgatável NESTE instante (RN-413/414)? Só `ativo` e dentro da
 * validade. Pura de propósito: a Function reavalia isto DENTRO da transação
 * com o doc fresco, e o teste exercita a decisão sem Firestore.
 * @pure
 */
export function conviteResgatavel(
  convite: Pick<ConviteOrganizador, 'status' | 'expiraEm'>,
  agora: Date
): boolean {
  return convite.status === 'ativo' && !conviteExpirado(convite, agora);
}
