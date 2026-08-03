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
 * As TRÊS posições de foto de um kit (S212-T2 · RN-427). A posição 1 é a
 * principal e continua no objeto de nome fixo que já existe; as 2 e 3 são as
 * secundárias e vivem em slots LITERAIS sob `.../fotos/`. Um union fechado, e
 * não `number`, porque este valor vira segmento de path: as Rules só conhecem
 * `2` e `3`, e um quarto slot não tem para onde ir.
 */
export type SlotFotoKit = 1 | 2 | 3;

/** Lista canônica dos slots — única fonte para validação e UI. */
export const SLOTS_FOTO_KIT: readonly SlotFotoKit[] = [1, 2, 3];

/**
 * Caminho do objeto de um slot. Slot 1 é o objeto de nome fixo da RN-227, que
 * NÃO ganha sufixo — é o que mantém toda leitura antiga funcionando. @pure
 */
export function caminhoFotoKit(
  eventoId: string,
  kitId: string,
  slot: SlotFotoKit
): string {
  return slot === 1
    ? `eventos/${eventoId}/kits/${kitId}`
    : `eventos/${eventoId}/kits/${kitId}/fotos/${slot}`;
}

/**
 * O slot em que uma downloadURL mora, ou `null` quando a URL não é de nenhum
 * dos três objetos deste kit (URL colada, kit antigo, string vazia).
 *
 * A downloadURL do Firebase carrega o path do objeto URL-encodado
 * (`.../o/eventos%2F{ev}%2Fkits%2F{kit}%2Ffotos%2F2?alt=media&token=…`), então
 * dá para ler o slot da própria URL sem guardar um segundo campo no doc.
 * Comparação por SUFIXO do path (antes da query), e não `includes` solto, para
 * `.../fotos/2` nunca casar como se fosse a principal. @pure
 */
export function slotDaUrlFotoKit(
  url: string | null | undefined,
  eventoId: string,
  kitId: string
): SlotFotoKit | null {
  if (typeof url !== 'string' || url.length === 0) return null;
  const semQuery = url.split('?')[0] ?? '';
  for (const slot of SLOTS_FOTO_KIT) {
    const alvo = encodeURIComponent(caminhoFotoKit(eventoId, kitId, slot));
    if (semQuery.endsWith(alvo)) return slot;
  }
  return null;
}

/**
 * Em QUAL slot gravar o arquivo que o organizador acabou de escolher para a
 * posição `posicao` (1 = principal).
 *
 * Por que isto não é `slot = posicao`. "Tornar principal" (RN-427) troca as
 * URLs DENTRO do documento e não move um byte no bucket — é função pura, por
 * decisão da spec. Depois de uma troca, a URL que está na posição 1 pode ser a
 * do objeto do slot 2. Gravar o upload seguinte da posição 2 em cima do slot 2
 * invalidaria o token da URL que a PRINCIPAL está usando, e a foto grande
 * morreria numa tela que ninguém tocou. Sequência de quatro cliques, alcançável
 * sem malícia.
 *
 * Regra: se a posição já aponta para um objeto deste kit, reenvia NAQUELE
 * objeto — que é exatamente a propriedade da RN-227 ("reenviar sobrescreve, sem
 * órfão"). Se a posição está vazia (ou aponta para fora), pega o menor slot que
 * NENHUMA das três posições esteja usando. Como há três slots e no máximo três
 * fotos, e a posição de destino não conta, sempre sobra um. @pure
 */
export function slotDeUploadFotoKit(
  posicoes: readonly (string | null | undefined)[],
  posicao: SlotFotoKit,
  eventoId: string,
  kitId: string
): SlotFotoKit {
  const atual = slotDaUrlFotoKit(posicoes[posicao - 1], eventoId, kitId);
  if (atual !== null) return atual;
  const ocupados = new Set<SlotFotoKit>();
  posicoes.forEach((url, i) => {
    if (i === posicao - 1) return;
    const s = slotDaUrlFotoKit(url, eventoId, kitId);
    if (s !== null) ocupados.add(s);
  });
  return SLOTS_FOTO_KIT.find((s) => !ocupados.has(s)) ?? posicao;
}

/**
 * Imagem 1:1 do KIT do evento (R9-C · RN-227 · gap R13). Path RATIFICADO:
 * `eventos/{eventoId}/kits/{kitId}` — as Rules provam por firestore.get que
 * o EVENTO pertence ao tenant do caller (mesma guarda da capa de clube).
 * Valida tipo/tamanho + proporção 1:1 antes do upload; a downloadURL
 * alimenta `Kit.imagemUrl` via `salvarKit`. Ids canônicos usam underscore
 * (`kit_ouro` — chave Kit↔enum), por isso o padrão aceita `_`.
 *
 * S212-T2 (RN-427): o `slot` escolhe a posição. O default é `1` de propósito —
 * toda chamada que já existia continua subindo a principal no MESMO objeto,
 * sem uma linha de mudança. Nome de objeto FIXO nos três casos: reenviar
 * sobrescreve e nunca deixa órfão, e não existe filename livre.
 */
export async function uploadImagemKit(
  eventoId: string,
  kitId: string,
  file: File,
  slot: SlotFotoKit = 1
): Promise<string> {
  const id = kitId.trim();
  if (eventoId.trim().length === 0 || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id)) {
    throw new Error('Kit inválido para enviar a imagem.');
  }
  if (!SLOTS_FOTO_KIT.includes(slot)) {
    throw new Error('Posição de foto do kit inválida.');
  }
  const problema1a1 = await problemaProporcaoQuadrada(file);
  if (problema1a1) throw new Error(problema1a1);
  return uploadImagem(caminhoFotoKit(eventoId, id, slot), file);
}

// ---------------------------------------------------------------------------
// Capa do EVENTO (CEV · RN-228 — fecha a pendência UPSW / DEC-0719 item 19)
// ---------------------------------------------------------------------------

/**
 * Allowlist de contentType da CAPA DE EVENTO (RN-228, ratificada DEC-0719):
 * SÓ JPEG/PNG/GIF — mais estrita que `IMAGEM_UPLOAD_TIPOS` (webp/avif ficam
 * de fora NESTA superfície). ESPELHO da regex `capaEventoFormatoValido` das
 * storage.rules (a Rule é a fronteira; aqui é UX/fail-fast).
 */
export const CAPA_EVENTO_UPLOAD_TIPOS = ['image/jpeg', 'image/png', 'image/gif'] as const;

/**
 * Teto da capa de evento — 2MB (RN-228). ESPELHADO nas storage.rules
 * (`capaEventoFormatoValido` também impõe 2MB — hardening da review CEV):
 * a Rule é a fronteira contra SDK direto; aqui é UX/fail-fast.
 */
export const CAPA_EVENTO_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Valida o arquivo da capa de evento ANTES do upload (RN-228: jpeg/png/gif,
 * 1B..2MB). Retorna a mensagem do problema ou null. A chamada acontece no
 * arquivo FINAL (pós-crop 1.9:1 do ImageUploadField) — um PNG/JPEG que o crop
 * não conseguiu reduzir a ≤2MB é rejeitado aqui com mensagem honesta. @pure
 */
export function problemaDoArquivoCapaEvento(file: File): string | null {
  if (!(CAPA_EVENTO_UPLOAD_TIPOS as readonly string[]).includes(file.type)) {
    return 'A capa deve ser JPG, PNG ou GIF (RN-228).';
  }
  if (file.size === 0) {
    return 'O arquivo está vazio.';
  }
  if (file.size > CAPA_EVENTO_MAX_BYTES) {
    return 'A capa deve ter no máximo 2MB.';
  }
  return null;
}

/**
 * Capa/hero do EVENTO (campo canônico `Evento.imagemUrl`, RN-153/RN-228).
 * Path CONTRATADO: `eventos/{eventoId}/capa` — as Rules provam por
 * firestore.get que o EVENTO pertence ao tenant do caller (mesma guarda dos
 * kits/capa de clube; evento inexistente NEGA — por isso o "Novo evento" só
 * sobe a capa APÓS o criarEvento devolver o id). Valida RN-228 (formato +
 * 2MB) antes do roundtrip; a proporção 1.9:1/1600×838 é ajustada pelo crop
 * client-side do ImageUploadField (Rules não decodificam imagem).
 */
export async function uploadCapaEvento(eventoId: string, file: File): Promise<string> {
  if (eventoId.trim().length === 0) {
    throw new Error('Evento inválido para enviar a capa.');
  }
  const problema = problemaDoArquivoCapaEvento(file);
  if (problema) throw new Error(problema);
  return uploadImagem(`eventos/${eventoId}/capa`, file);
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
