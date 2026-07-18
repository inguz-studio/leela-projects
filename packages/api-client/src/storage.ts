// =============================================================================
// @leela/api-client — upload de imagens (Firebase Storage) · LEELA-R5
//
// Seam ÚNICO de upload do painel (ADR-016). Cada helper sobe o arquivo para o
// path CONTRATADO nas storage.rules (nomes de objeto fixos — re-upload
// SOBRESCREVE, sem órfãos) e devolve a downloadURL. A URL alimenta os MESMOS
// campos de hoje (Auth.photoURL, `avatarUrl`/`imagemUrl` do perfil,
// `imagemUrl` do clube) — zero mudança de shape nos docs; URL externa colada
// pelo usuário continua aceita (o upload é um CAMINHO a mais, não o único).
//
// SEGURANÇA (defesa em profundidade):
//   - a validação AQUI (tipo/tamanho) é UX — devolve erro amigável antes do
//     roundtrip; a fronteira REAL são as storage.rules (allowlist de
//     contentType + 1B..5MB + ownership por uid/tenant, fail-closed);
//   - o contentType enviado é o declarado pelo File do browser; validação de
//     BYTES (magic numbers/re-encode) é server-side — follow-up registrado.
// =============================================================================

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getLeelaAuth, getLeelaStorage } from './firebase';

/** Allowlist de contentType de imagem — ESPELHO da regex das storage.rules. */
export const IMAGEM_UPLOAD_TIPOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

/** Teto de upload — ESPELHO do limite das storage.rules (5MB). */
export const IMAGEM_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Valida o arquivo ANTES do upload (UX; as Rules revalidam no servidor).
 * Retorna a mensagem do problema ou null quando o arquivo serve. @pure
 */
export function problemaDoArquivoImagem(file: File): string | null {
  if (!(IMAGEM_UPLOAD_TIPOS as readonly string[]).includes(file.type)) {
    return 'Use uma imagem JPG, PNG, WebP, GIF ou AVIF.';
  }
  if (file.size === 0) {
    return 'O arquivo está vazio.';
  }
  if (file.size > IMAGEM_UPLOAD_MAX_BYTES) {
    return 'A imagem deve ter no máximo 5MB.';
  }
  return null;
}

/** uid da sessão ativa — uploads são sempre do usuário logado. */
function uidAtual(): string {
  const user = getLeelaAuth().currentUser;
  if (!user) throw new Error('Sem sessão ativa para enviar a imagem.');
  return user.uid;
}

/**
 * Núcleo do upload: valida (erro amigável), sobe com o contentType declarado
 * e resolve a downloadURL. Path é responsabilidade dos helpers públicos —
 * NUNCA derive path de input do usuário (nome do arquivo não entra no path).
 */
async function uploadImagem(path: string, file: File): Promise<string> {
  const problema = problemaDoArquivoImagem(file);
  if (problema) throw new Error(problema);
  const destino = ref(getLeelaStorage(), path);
  await uploadBytes(destino, file, { contentType: file.type });
  return getDownloadURL(destino);
}

/**
 * Foto de perfil da CONTA (`/conta` → Avatar do rodapé). Sobe para
 * `users/{uid}/foto-perfil`; a UI então grava a URL via `atualizarFotoPerfil`
 * (mesmo campo Auth.photoURL de hoje).
 */
export async function uploadFotoPerfilConta(file: File): Promise<string> {
  return uploadImagem(`users/${uidAtual()}/foto-perfil`, file);
}

/**
 * Avatar do perfil público @handle (campo `avatarUrl`).
 * Path: `users/{uid}/perfil-avatar`.
 */
export async function uploadAvatarPerfilPublico(file: File): Promise<string> {
  return uploadImagem(`users/${uidAtual()}/perfil-avatar`, file);
}

/**
 * Capa do perfil público @handle (campo `imagemUrl`, RN-166).
 * Path: `users/{uid}/perfil-capa`.
 */
export async function uploadCapaPerfilPublico(file: File): Promise<string> {
  return uploadImagem(`users/${uidAtual()}/perfil-capa`, file);
}

/**
 * Capa do CLUBE (campo canônico `imagemUrl`, RN-166). Path:
 * `clubes/{clubeId}/capa` — as Rules provam por firestore.get que o clube
 * pertence ao tenant do caller (claim writer não basta).
 */
export async function uploadCapaClube(clubeId: string, file: File): Promise<string> {
  if (clubeId.trim().length === 0) {
    throw new Error('Clube inválido para enviar a capa.');
  }
  return uploadImagem(`clubes/${clubeId}/capa`, file);
}
