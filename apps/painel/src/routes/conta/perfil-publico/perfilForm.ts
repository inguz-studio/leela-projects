// =============================================================================
// perfilForm — helpers PUROS do editor de perfil público (DN-1-T1). A validação
// de forma é DELEGADA ao core (`validarPerfilInput` / `handleProblema`) — fonte
// única, a mesma que a Function `salvarPerfil` roda na fronteira do servidor.
// Aqui só há a ponte entre o estado controlado do formulário e o `PerfilInput`.
// =============================================================================

import {
  handleProblema,
  validarPerfilInput,
  type LinkExternoPerfil,
  type Perfil,
  type PerfilInput,
  type VisibilidadePerfil,
} from '@leela/core';

/** Estado controlado do formulário (strings — o `<input>` só fala string). */
export interface PerfilFormValues {
  /** SEM `@` — a UI mostra o prefixo; o core normaliza. Só editável no CREATE. */
  handle: string;
  nome: string;
  bio: string;
  avatarUrl: string;
  /** Capa do perfil — nome canônico `imagemUrl` (RN-166). */
  imagemUrl: string;
  visibilidade: VisibilidadePerfil;
  linksExternos: LinkExternoPerfil[];
}

export const PERFIL_VALORES_INICIAIS: PerfilFormValues = {
  handle: '',
  nome: '',
  bio: '',
  avatarUrl: '',
  imagemUrl: '',
  visibilidade: 'publica',
  linksExternos: [],
};

/** Deriva o estado do formulário de um perfil existente (modo editar). */
export function valoresDePerfil(perfil: Perfil): PerfilFormValues {
  return {
    handle: perfil.handle,
    nome: perfil.nome,
    bio: perfil.bio ?? '',
    avatarUrl: perfil.avatarUrl ?? '',
    imagemUrl: perfil.imagemUrl ?? '',
    visibilidade: perfil.visibilidade,
    linksExternos: perfil.linksExternos ?? [],
  };
}

/**
 * Monta o `PerfilInput` a partir do formulário. Campos opcionais VAZIOS viram
 * `undefined` (ausência) — no UPDATE o servidor REMOVE o que não vier (limpar a
 * bio de verdade limpa o doc). Links com label OU url vazios são descartados
 * (nunca envia link pela metade). @pure
 */
export function paraPerfilInput(v: PerfilFormValues): PerfilInput {
  const bio = v.bio.trim();
  const avatarUrl = v.avatarUrl.trim();
  const imagemUrl = v.imagemUrl.trim();
  const links = v.linksExternos
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
    .filter((l) => l.label.length > 0 && l.url.length > 0);

  return {
    handle: v.handle.trim(),
    nome: v.nome.trim(),
    visibilidade: v.visibilidade,
    ...(bio.length > 0 ? { bio } : {}),
    ...(avatarUrl.length > 0 ? { avatarUrl } : {}),
    ...(imagemUrl.length > 0 ? { imagemUrl } : {}),
    ...(links.length > 0 ? { linksExternos: links } : {}),
  };
}

/**
 * Erros de forma do formulário (vazio = pronto para salvar). No CREATE o handle
 * entra na validação; no UPDATE ele é imutável e não é reavaliado (o core
 * validaria o handle atual, sempre válido). @pure
 */
export function validarPerfilForm(v: PerfilFormValues, modo: 'create' | 'edit'): string[] {
  const input = paraPerfilInput(v);
  if (modo === 'edit') {
    // Handle imutável: usa um placeholder válido só para não reprovar a forma
    // por causa dele (o servidor preserva o handle real do doc).
    return validarPerfilInput({ ...input, handle: input.handle || 'placeholder' });
  }
  return validarPerfilInput(input);
}

/**
 * Diagnóstico inline do handle no CREATE (`null` = ok). Só a copy de erro do
 * core — reservados/formato — para feedback ao vivo ANTES de salvar. @pure
 */
export function problemaDoHandle(handle: string): string | null {
  return handleProblema(handle);
}
