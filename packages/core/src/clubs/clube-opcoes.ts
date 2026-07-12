// =============================================================================
// packages/core/src/clubs/clube-opcoes.ts
//
// Vocabulário FECHADO do clube (fix-tema-clube): tipo de clube (categoria),
// modalidade e localização estruturada. O dono decidiu tirar o texto livre —
// criar e editar clube passam a escolher de listas canônicas, e a localização
// vira { cidade, estado (UF), online }. Fonte única reusada pelo form de
// criação (NovoClubePage), pela edição (ConfiguracoesView) e pela validação
// pura (validarClube).
//
// ESTADOS_BR deriva de UFS_BRASIL (eventos/dadosPessoais) — a lista de siglas é
// única no core (Brasil-only na V1, mesma premissa de FUSO_EVENTO); aqui só se
// acrescenta o NOME por extenso para o rótulo do Select.
// =============================================================================

import { UFS_BRASIL, isUfBrasil } from '../eventos/dadosPessoais';

// ---------------------------------------------------------------------------
// Tipo de clube (categoria) — "Tipo de clube" no form
// ---------------------------------------------------------------------------

/** Tipos de clube — vocabulário fechado (Select "Tipo de clube"). */
export const CATEGORIAS_CLUBE: readonly string[] = [
  'Assessoria esportiva',
  'Equipe/Time',
  'Grupo de corrida',
  'Comunidade',
  'Academia',
];

/** Categoria válida? (∈ vocabulário fechado). @pure */
export function isCategoriaClube(value: string): boolean {
  return CATEGORIAS_CLUBE.includes(value);
}

// ---------------------------------------------------------------------------
// Modalidade — lista ampla (corrida + além)
// ---------------------------------------------------------------------------

/** Modalidades do clube — vocabulário fechado (Select "Modalidade"). */
export const MODALIDADES_CLUBE: readonly string[] = [
  'Corrida de rua',
  'Trail',
  'Ciclismo',
  'MTB',
  'Caminhada',
  'Triatlo',
  'Natação',
  'Funcional',
  'Bem-estar/Yoga',
];

/** Modalidade válida? (∈ vocabulário fechado). @pure */
export function isModalidadeClube(value: string): boolean {
  return MODALIDADES_CLUBE.includes(value);
}

// ---------------------------------------------------------------------------
// Estados (UF + nome) — deriva de UFS_BRASIL, não duplica a lista de siglas
// ---------------------------------------------------------------------------

/** Estado do Brasil: sigla (UF) + nome por extenso (rótulo do Select). */
export interface EstadoBR {
  uf: string;
  nome: string;
}

/** Nome por extenso por UF — só o rótulo; a lista canônica é UFS_BRASIL. */
const UF_NOMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

/** 27 UFs do Brasil (sigla + nome) na ordem canônica de UFS_BRASIL. */
export const ESTADOS_BR: readonly EstadoBR[] = UFS_BRASIL.map((uf) => ({
  uf,
  nome: UF_NOMES[uf] ?? uf,
}));

// ---------------------------------------------------------------------------
// Localização estruturada
// ---------------------------------------------------------------------------

/**
 * Localização do clube. Presencial exige cidade + estado (UF); `online` é um
 * clube sem sede física (cidade/estado opcionais). O dono: "só Cidade e Estado,
 * e se é online ou virtual".
 */
export interface LocalizacaoClube {
  /** Cidade — texto livre (só quando presencial). */
  cidade: string;
  /** UF (sigla, ex.: "SC") — Brasil-only na V1. Vazio quando online. */
  estado: string;
  /** Clube sem sede física (online/virtual). */
  online: boolean;
}

/**
 * Localização coerente? Online sempre ok (sem sede); presencial exige cidade
 * não-vazia + UF válida. @pure
 */
export function localizacaoValida(loc: LocalizacaoClube): boolean {
  if (loc.online) return true;
  return loc.cidade.trim().length > 0 && isUfBrasil(loc.estado);
}

/**
 * Rótulo de exibição da localização: online → "Online"; presencial → "Cidade/UF"
 * (partes vazias caem fora). @pure
 */
export function formatarLocalizacaoClube(loc: LocalizacaoClube): string {
  if (loc.online) return 'Online';
  return [loc.cidade.trim(), loc.estado].filter(Boolean).join('/');
}
