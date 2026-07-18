// =============================================================================
// packages/core/src/brands/marca.ts
//
// Entidade Marca — registro REUTILIZÁVEL de patrocinador do profissional
// (LEELA-R9E · S-R9-12 · RN-171 — seed antecipada do E10-S811).
// Subcoleção: `profissionais/{profId}/marcas/{marcaId}`.
//
// RN-171: patrocinador cadastrado fica SALVO no registro do tenant e
// alimenta o cadastro futuro por autocomplete/seleção — não se recomeça do
// zero. REUSA o shape comercial de `ParceriaPatrocinador` (RN-123: nome +
// modeloComercial financeiro|permuta + valorAnual?/contrapartida).
//
// Escrita/leitura OWNER-ONLY (E10-S811 — Rules: uid == profId): a marca é
// ativo comercial do profissional, não do tenant inteiro. Ativações
// consolidadas (S812) seguem no horizonte do épico — FORA deste recorte.
// =============================================================================

import type { Timestamp } from '../index';
import {
  isModeloComercial,
  type ModeloComercial,
} from '../clubs/parceria';

// ---------------------------------------------------------------------------
// Coleção e enums
// ---------------------------------------------------------------------------

/** Subcoleção do profissional: `profissionais/{profId}/marcas/{marcaId}`. */
export const SUBCOLECAO_MARCAS = 'marcas';

export type StatusMarca = 'ativa' | 'inativa';

export const STATUS_MARCA: readonly StatusMarca[] = ['ativa', 'inativa'];

export function isStatusMarca(v: unknown): v is StatusMarca {
  return typeof v === 'string' && (STATUS_MARCA as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

export const MARCA_NOME_MAX = 80;
/** Contrapartida mínima quando permuta (SPEC-02 — espelho do patrocinador). */
export const MARCA_CONTRAPARTIDA_MIN = 20;
export const MARCA_CONTRAPARTIDA_MAX = 2000;

/** Marca/patrocinador reutilizável (RN-171/123). */
export interface Marca {
  id: string;
  nome: string;
  modeloComercial: ModeloComercial;
  /** Obrigatório quando modeloComercial == 'financeiro' (R$/ano). */
  valorAnual?: number;
  /** Obrigatória quando modeloComercial == 'permuta' (≥ 20 chars). */
  contrapartida?: string;
  logoUrl?: string;
  contratoUrl?: string;
  status: StatusMarca;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/** Input de criação/edição (o cliente escreve direto — Rules owner-only). */
export interface MarcaInput {
  nome: string;
  modeloComercial: ModeloComercial;
  valorAnual?: number;
  contrapartida?: string;
  logoUrl?: string;
  contratoUrl?: string;
  status?: StatusMarca;
}

// ---------------------------------------------------------------------------
// Validação pura (usada pelo form como UX e pelo parse como fail-fast)
// ---------------------------------------------------------------------------

const URL_RE = /^https?:\/\/.{1,2000}$/;

/**
 * Valida um input de marca (RN-123 condicional por modelo). Retorna lista de
 * erros (vazia = válido). @pure
 */
export function validarMarcaInput(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];

  const nome = input['nome'];
  if (
    typeof nome !== 'string' ||
    nome.trim().length === 0 ||
    nome.trim().length > MARCA_NOME_MAX
  ) {
    erros.push(`"nome" é obrigatório (1..${MARCA_NOME_MAX} caracteres).`);
  }
  const modelo = input['modeloComercial'];
  if (!isModeloComercial(modelo)) {
    erros.push('"modeloComercial" deve ser financeiro ou permuta (RN-123).');
  } else {
    if (modelo === 'financeiro') {
      const valor = input['valorAnual'];
      if (
        typeof valor !== 'number' ||
        !Number.isFinite(valor) ||
        valor <= 0
      ) {
        erros.push('Modelo financeiro exige "valorAnual" > 0 (RN-123).');
      }
    }
    if (modelo === 'permuta') {
      const contra = input['contrapartida'];
      if (
        typeof contra !== 'string' ||
        contra.trim().length < MARCA_CONTRAPARTIDA_MIN ||
        contra.trim().length > MARCA_CONTRAPARTIDA_MAX
      ) {
        erros.push(
          `Modelo permuta exige "contrapartida" com ${MARCA_CONTRAPARTIDA_MIN}..${MARCA_CONTRAPARTIDA_MAX} caracteres (RN-123).`
        );
      }
    }
  }
  const contrapartida = input['contrapartida'];
  if (
    contrapartida !== undefined &&
    (typeof contrapartida !== 'string' ||
      contrapartida.length > MARCA_CONTRAPARTIDA_MAX)
  ) {
    erros.push(`"contrapartida" deve ser texto ≤ ${MARCA_CONTRAPARTIDA_MAX} chars.`);
  }
  for (const campo of ['logoUrl', 'contratoUrl'] as const) {
    const v = input[campo];
    if (v !== undefined && (typeof v !== 'string' || !URL_RE.test(v))) {
      erros.push(`"${campo}" deve ser URL http(s) válida.`);
    }
  }
  const status = input['status'];
  if (status !== undefined && !isStatusMarca(status)) {
    erros.push('"status" deve ser ativa ou inativa.');
  }
  return erros;
}

// ---------------------------------------------------------------------------
// Parse fail-fast (borda de I/O do Firestore)
// ---------------------------------------------------------------------------

/** Parsing defensivo de um doc Firestore em `Marca` (fail-fast). @pure */
export function parseMarca(id: string, data: Record<string, unknown>): Marca {
  const nome = data['nome'];
  const modelo = data['modeloComercial'];
  const status = data['status'];

  if (typeof nome !== 'string' || nome.length === 0) {
    throw new Error(`Marca ${id}: "nome" inválido`);
  }
  if (!isModeloComercial(modelo)) {
    throw new Error(`Marca ${id}: "modeloComercial" fora do enum (RN-123)`);
  }
  if (!isStatusMarca(status)) {
    throw new Error(`Marca ${id}: "status" fora do enum ativa|inativa`);
  }
  const valorAnual = data['valorAnual'];
  if (
    valorAnual !== undefined &&
    (typeof valorAnual !== 'number' || !Number.isFinite(valorAnual) || valorAnual <= 0)
  ) {
    throw new Error(`Marca ${id}: "valorAnual" deve ser número > 0`);
  }
  if (modelo === 'financeiro' && typeof valorAnual !== 'number') {
    throw new Error(`Marca ${id}: modelo financeiro exige "valorAnual" (RN-123)`);
  }

  const marca: Marca = {
    id,
    nome,
    modeloComercial: modelo,
    status,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };
  if (typeof valorAnual === 'number') marca.valorAnual = valorAnual;
  const contrapartida = data['contrapartida'];
  if (typeof contrapartida === 'string' && contrapartida.length > 0) {
    marca.contrapartida = contrapartida;
  }
  const logoUrl = data['logoUrl'];
  if (typeof logoUrl === 'string' && logoUrl.length > 0) marca.logoUrl = logoUrl;
  const contratoUrl = data['contratoUrl'];
  if (typeof contratoUrl === 'string' && contratoUrl.length > 0) {
    marca.contratoUrl = contratoUrl;
  }
  return marca;
}
