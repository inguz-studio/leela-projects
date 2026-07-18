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

// ---------------------------------------------------------------------------
// Logos de patrocinador 1:1 (R9-E · S-R9-12 · RN-171 + adendo do Vitor)
// ---------------------------------------------------------------------------

/** Tolerância da proporção 1:1 (2% — corta ruído de export, barra retângulo). */
export const LOGO_QUADRADA_TOLERANCIA = 0.02;

/**
 * Valida que a imagem é QUADRADA (1:1) — validação APP-LEVEL (as Rules não
 * decodificam imagem; mesma divisão de responsabilidade da capa 1.9:1).
 * Retorna mensagem do problema ou null. Async: decodifica via
 * createImageBitmap (fallback: aceita quando o browser não suporta —
 * degradação honesta, o servidor não re-checa).
 */
export async function problemaProporcaoQuadrada(file: File): Promise<string | null> {
  // Acesso via globalThis: o tsconfig do pacote não carrega lib DOM completa
  // (File vem estrutural); em runtime sem suporte, degrada aceitando.
  const criarBitmap = (
    globalThis as {
      createImageBitmap?: (
        f: File
      ) => Promise<{ width: number; height: number; close(): void }>;
    }
  ).createImageBitmap;
  if (typeof criarBitmap !== 'function') return null;
  try {
    const bitmap = await criarBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    if (width === 0 || height === 0) return 'Imagem inválida.';
    const desvio = Math.abs(width / height - 1);
    if (desvio > LOGO_QUADRADA_TOLERANCIA) {
      return `A logo deve ser quadrada (1:1) — a imagem tem ${width}×${height}.`;
    }
    return null;
  } catch {
    return 'Não foi possível ler a imagem — use JPG, PNG, WebP, GIF ou AVIF.';
  }
}

/**
 * Logo 1:1 da MARCA do registro reutilizável (`profissionais/{uid}/marcas`).
 * Path: `marcas/{uid}/{marcaId}` (Rules: só o próprio uid escreve). Valida
 * tipo/tamanho + proporção 1:1 antes do upload.
 */
export async function uploadLogoMarca(marcaId: string, file: File): Promise<string> {
  const id = marcaId.trim();
  if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(id)) {
    throw new Error('Marca inválida para enviar a logo.');
  }
  const problema1a1 = await problemaProporcaoQuadrada(file);
  if (problema1a1) throw new Error(problema1a1);
  return uploadImagem(`marcas/${uidAtual()}/${id}`, file);
}

/**
 * Logo 1:1 do PATROCINADOR do clube (parceria tipo 'patrocinador').
 * Path: `clubes/{clubeId}/patrocinador-{parceriaId}` — Rules provam o
 * tenant por firestore.get (mesma guarda da capa).
 */
export async function uploadLogoPatrocinadorClube(
  clubeId: string,
  parceriaId: string,
  file: File
): Promise<string> {
  const pid = parceriaId.trim().toLowerCase();
  if (clubeId.trim().length === 0 || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(pid)) {
    throw new Error('Patrocinador inválido para enviar a logo.');
  }
  const problema1a1 = await problemaProporcaoQuadrada(file);
  if (problema1a1) throw new Error(problema1a1);
  return uploadImagem(`clubes/${clubeId}/patrocinador-${pid}`, file);
}
