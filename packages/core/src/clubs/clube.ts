// =============================================================================
// packages/core/src/clubs/clube.ts
//
// Entidade Clube — tenant-scoped (ADR-009). Coleção: `clubes/{clubId}`
// (docId = slug). Módulo Clubs — LEELA-E05 (S101-T1).
//
// RNs: RN-100 (papéis do profissional no clube), RN-101 (código de convite),
//      RN-104 (modeloEntrada), RN-140 (visibilidade), RN-141 (aprovacaoManual).
//
// Agregados ∑ (qtdMembrosAtivos, qtdDesafiosAtivos) são mantidos por Cloud
// Function — o cliente NUNCA os escreve (Rules negam).
// =============================================================================

import type { Timestamp } from '../index';
import { validarCodigoConvite } from './codigo-convite';

// ---------------------------------------------------------------------------
// Literal types
// ---------------------------------------------------------------------------

/** Papel do PROFISSIONAL em relação a um clube (RN-100) */
export type PapelClube = 'owner' | 'parceiro';

/** Visibilidade do clube (RN-140) */
export type VisibilidadeClube = 'publica' | 'indexavel' | 'privada';

/** Modelo de entrada do clube (RN-104 — pago é promessa de produto) */
export type ModeloEntradaClube = 'gratuito' | 'pago_em_breve';

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Clube de corrida — tenant-scoped.
 * Coleção: `clubes/{clubId}` (docId = slug).
 * Subcoleções: membros, desafios, parcerias, comunicados, permissoesAdmin.
 */
export interface Clube {
  /** docId = slug */
  id: string;
  /** Isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Máx. 60 caracteres */
  nome: string;
  /** Máx. 280 caracteres */
  descricao: string;
  slug: string;
  categoria: string;
  modalidade: string;
  localizacao: string;
  /** Referência ao profissional owner */
  ownerId: string;
  /** 5 chars; exclui 0/O/1/I/L (RN-101) */
  codigoConvite: string;
  visibilidade: VisibilidadeClube;
  /** Exige aprovação manual de novos membros (RN-141) */
  aprovacaoManual: boolean;
  modeloEntrada: ModeloEntradaClube;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  /** Agregado ∑ — mantido por Cloud Function */
  qtdMembrosAtivos: number;
  /** Agregado ∑ — mantido por Cloud Function */
  qtdDesafiosAtivos: number;
}

/**
 * Payload de criação/edição de clube pelo cliente.
 * Sem campos ∑ (agregados nascem 0 e só a Function escreve) e sem timestamps
 * (serverTimestamp no write path).
 */
export type ClubeInput = Omit<
  Clube,
  'id' | 'criadoEm' | 'atualizadoEm' | 'qtdMembrosAtivos' | 'qtdDesafiosAtivos'
>;

// ---------------------------------------------------------------------------
// Limites & validação
// ---------------------------------------------------------------------------

/** Limite do nome do clube (modelo-de-dados-firestore.md) */
export const CLUBE_NOME_MAX = 60;

/** Limite da descrição do clube */
export const CLUBE_DESCRICAO_MAX = 280;

// Slug: kebab-case minúsculo (a-z, 0-9, hífen simples entre segmentos)
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slug válido: kebab-case minúsculo, sem espaços/acentos (docId = slug). */
export function validarSlugClube(slug: string): boolean {
  return typeof slug === 'string' && SLUG_RE.test(slug);
}

/**
 * Valida um payload de clube. Retorna a lista de erros (vazia = válido).
 * Pura — usada pelo cliente (feedback de formulário) e por seeds/Functions.
 */
export function validarClube(input: ClubeInput): string[] {
  const erros: string[] = [];

  if (!input.nome?.trim()) {
    erros.push('nome é obrigatório');
  } else if (input.nome.length > CLUBE_NOME_MAX) {
    erros.push(`nome excede ${CLUBE_NOME_MAX} caracteres`);
  }

  if (input.descricao && input.descricao.length > CLUBE_DESCRICAO_MAX) {
    erros.push(`descricao excede ${CLUBE_DESCRICAO_MAX} caracteres`);
  }

  if (!validarSlugClube(input.slug)) {
    erros.push('slug inválido (use kebab-case minúsculo, ex.: corrida-perfeita-sul)');
  }

  if (!input.tenantId?.trim()) {
    erros.push('tenantId é obrigatório (ADR-009)');
  }

  if (!input.ownerId?.trim()) {
    erros.push('ownerId é obrigatório');
  }

  if (!validarCodigoConvite(input.codigoConvite)) {
    erros.push('codigoConvite inválido (RN-101: 5 chars maiúsculos sem 0/O/1/I/L)');
  }

  return erros;
}
