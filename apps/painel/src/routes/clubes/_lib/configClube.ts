// =============================================================================
// Logica pura das configuracoes do clube (S110-T1). Sanitizacao de slug em
// tempo real, secoes ancora (scroll spy), niveis de visibilidade/comportamento
// e as 6 permissoes de admin (RN-142). Sem React/DOM: 100% testavel.
// =============================================================================

import type { VisibilidadeClube, ModeloEntradaClube } from '@leela/core';
import { CATEGORIAS_CLUBE, MODALIDADES_CLUBE, ESTADOS_BR } from '@leela/core';
import type { SelectOption } from '@leela/design-system';

// ---------------------------------------------------------------------------
// Slug - sanitizacao em tempo real (SPEC 2.10)
// ---------------------------------------------------------------------------

/**
 * Converte texto livre em slug kebab-case valido (docId = slug):
 * minusculas, sem acentos, nao-alfanumericos viram hifen, hifens colapsados
 * e aparados nas pontas. "Corrida Perfeita Sul!" -> "corrida-perfeita-sul".
 */
export function sanitizeSlug(texto: string): string {
  return texto
    .normalize('NFD')
    // Apos NFD, letras base sao ASCII e os diacriticos ficam como marcas
    // combinantes nao-ASCII - remove-las deixa so o esqueleto ASCII.
    .replace(/[^\x00-\x7f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Secoes ancora (scroll spy)
// ---------------------------------------------------------------------------

export type SecaoConfigId =
  | 'identidade'
  | 'pagina'
  | 'regras'
  | 'moderacao'
  | 'admin';

export interface SecaoConfig {
  id: SecaoConfigId;
  label: string;
}

export const SECOES_CONFIG: readonly SecaoConfig[] = [
  { id: 'identidade', label: 'Identidade' },
  { id: 'pagina', label: 'Página pública' },
  { id: 'regras', label: 'Regras' },
  { id: 'moderacao', label: 'Moderação' },
  { id: 'admin', label: 'Admin avançada' },
];

// ---------------------------------------------------------------------------
// Niveis (visibilidade RN-140, modelo RN-104, comportamento RN-143)
// ---------------------------------------------------------------------------

export const VISIBILIDADES: { id: VisibilidadeClube; label: string; hint: string }[] = [
  { id: 'publica', label: 'Pública', hint: 'Qualquer pessoa vê e entra' },
  { id: 'indexavel', label: 'Indexável', hint: 'Aparece em buscas do app' },
  { id: 'privada', label: 'Privada', hint: 'Só por link/código' },
];

export const MODELOS_ENTRADA: { id: ModeloEntradaClube; label: string; disabled: boolean }[] = [
  { id: 'gratuito', label: 'Gratuito', disabled: false },
  { id: 'pago_em_breve', label: 'Pago', disabled: true }, // RN-104: promessa
];

// ---------------------------------------------------------------------------
// Opcoes de Select — vocabulario fechado do core (fix-tema-clube). Fonte unica
// reusada pelo form de criacao (NovoClubePage) e pela edicao (ConfiguracoesView)
// para criar e editar nao divergirem. O placeholder ('') forca escolha
// explicita e e rejeitado por validarClube (nao pertence ao vocabulario).
// ---------------------------------------------------------------------------

/** Opcoes do Select "Tipo de clube" (categoria) com placeholder. */
export const CATEGORIA_OPCOES: SelectOption[] = [
  { value: '', label: 'Selecione o tipo' },
  ...CATEGORIAS_CLUBE.map((c) => ({ value: c, label: c })),
];

/** Opcoes do Select "Modalidade" com placeholder. */
export const MODALIDADE_OPCOES: SelectOption[] = [
  { value: '', label: 'Selecione a modalidade' },
  ...MODALIDADES_CLUBE.map((m) => ({ value: m, label: m })),
];

/** Opcoes do Select "Estado" (UF) com placeholder — value = sigla. */
export const ESTADO_OPCOES: SelectOption[] = [
  { value: '', label: 'UF' },
  ...ESTADOS_BR.map((e) => ({ value: e.uf, label: `${e.uf} · ${e.nome}` })),
];

/** Tipo de localizacao (Chip group — espelha o padrao de Visibilidade). */
export const TIPOS_LOCALIZACAO: { id: 'presencial' | 'online'; label: string }[] = [
  { id: 'presencial', label: 'Presencial' },
  { id: 'online', label: 'Online' },
];

/** Comportamento dos membros no clube (RN-143 - 3 niveis, UI). */
export type ComportamentoMembros = 'livre' | 'moderado' | 'restrito';

export const COMPORTAMENTOS: { id: ComportamentoMembros; label: string; hint: string }[] = [
  { id: 'livre', label: 'Livre', hint: 'Membros postam sem moderação' },
  { id: 'moderado', label: 'Moderado', hint: 'Posts de membros passam por aprovação' },
  { id: 'restrito', label: 'Restrito', hint: 'Só admins publicam' },
];

// ---------------------------------------------------------------------------
// Permissoes de admin (RN-142 - 6 independentes)
// ---------------------------------------------------------------------------

export type PermissaoAdminId =
  | 'gerenciar_membros'
  | 'criar_desafios'
  | 'gerenciar_parcerias'
  | 'enviar_comunicados'
  | 'editar_configuracoes'
  | 'ver_financeiro';

export interface PermissaoAdminDef {
  id: PermissaoAdminId;
  label: string;
}

export const PERMISSOES_ADMIN: readonly PermissaoAdminDef[] = [
  { id: 'gerenciar_membros', label: 'Gerenciar membros' },
  { id: 'criar_desafios', label: 'Criar e editar desafios' },
  { id: 'gerenciar_parcerias', label: 'Gerenciar parcerias' },
  { id: 'enviar_comunicados', label: 'Enviar comunicados' },
  { id: 'editar_configuracoes', label: 'Editar configurações' },
  { id: 'ver_financeiro', label: 'Ver financeiro' },
];
