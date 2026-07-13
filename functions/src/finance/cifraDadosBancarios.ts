// =============================================================================
// functions/src/finance/cifraDadosBancarios.ts
//
// Cifra e mascaramento dos dados bancários do organizador
// (LEELA-E09s-L2-T2 · RN-354 · ADR-014 PROPOSTA).
//
// AES-256-GCM (node:crypto, zero dependência nova), envelope no shape que o
// L1 fixou em `DadosBancariosSecret`: { algoritmo, ciphertext, iv, authTag,
// keyVersion } (base64; IV 12 bytes ÚNICO por escrita; tag 16 bytes).
// Payload em claro = JSON { conta, pix } — SÓ os campos sensíveis.
//
// AAD = tenantId (ADR-014 §2): um blob copiado de um tenant para outro
// FALHA a decifra — integridade de contexto, não só de conteúdo.
//
// Chave: env `BANK_DATA_KEY` (base64 de 32 bytes; Secret Manager em produção
// via runWith secrets — ADR-014 §3). SEM chave ⇒ fail-closed: quem chama
// lança failed-precondition; NUNCA grava em claro nem deriva chave fallback.
// Rotação: `BANK_DATA_KEY_VERSION` carimba o envelope; decifra escolhe a
// chave pelo keyVersion (atual → BANK_DATA_KEY; antiga → BANK_DATA_KEY_V{n})
// — ADR-014 §4, re-cifra lazy no próximo save.
//
// Tudo aqui é determinístico/testável SEM Emulator (unit): roundtrip, IV
// único, AAD errada falha, blob adulterado falha, chave errada falha,
// tabela de máscaras. NUNCA logar payload em claro (ADR-014 §5).
// =============================================================================

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Chave (env — Secret Manager em produção; ADR-014 §3/§4)
// ---------------------------------------------------------------------------

export const ENV_BANK_DATA_KEY = 'BANK_DATA_KEY';
export const ENV_BANK_DATA_KEY_VERSION = 'BANK_DATA_KEY_VERSION';

const AES_KEY_BYTES = 32;
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

export interface ChaveCifra {
  key: Buffer;
  version: number;
}

function parseChaveB64(b64: string | undefined): Buffer | null {
  if (typeof b64 !== 'string' || b64.length === 0) return null;
  const key = Buffer.from(b64, 'base64');
  // Chave malformada = SEM chave (fail-closed) — nunca cifrar com lixo
  return key.length === AES_KEY_BYTES ? key : null;
}

/** Chave VIGENTE do ambiente — null quando ausente/malformada (fail-closed). */
export function chaveVigente(): ChaveCifra | null {
  const key = parseChaveB64(process.env[ENV_BANK_DATA_KEY]);
  if (key === null) return null;
  const vRaw = Number(process.env[ENV_BANK_DATA_KEY_VERSION] ?? '1');
  const version = Number.isInteger(vRaw) && vRaw >= 1 ? vRaw : 1;
  return { key, version };
}

/**
 * Chave para DECIFRAR um envelope de `keyVersion` dado (rotação — ADR-014
 * §4): versão vigente usa BANK_DATA_KEY; anteriores, BANK_DATA_KEY_V{n}.
 */
export function chavePorVersao(version: number): Buffer | null {
  const vigente = chaveVigente();
  if (vigente !== null && vigente.version === version) return vigente.key;
  return parseChaveB64(process.env[`${ENV_BANK_DATA_KEY}_V${version}`]);
}

// ---------------------------------------------------------------------------
// Envelope AES-256-GCM (shape DadosBancariosSecret sem tenantId/timestamp)
// ---------------------------------------------------------------------------

/** Payload sensível em claro — existe SÓ em memória da Function. */
export interface PayloadBancarioSecreto {
  conta: string;
  pix: string | null;
}

export interface EnvelopeCifrado {
  algoritmo: 'aes-256-gcm';
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

/**
 * Cifra { conta, pix } com AES-256-GCM e AAD = tenantId (ADR-014 §1/§2).
 * IV aleatório de 12 bytes por chamada — dois envelopes do MESMO payload
 * nunca coincidem.
 */
export function cifrarDadosBancarios(
  payload: PayloadBancarioSecreto,
  tenantId: string,
  chave: ChaveCifra
): EnvelopeCifrado {
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error('tenantId é obrigatório (AAD do envelope — ADR-014).');
  }
  const iv = randomBytes(GCM_IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', chave.key, iv, {
    authTagLength: GCM_TAG_BYTES,
  });
  cipher.setAAD(Buffer.from(tenantId, 'utf8'));
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    algoritmo: 'aes-256-gcm',
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    keyVersion: chave.version,
  };
}

/**
 * Decifra o envelope com a chave da SUA versão e AAD = tenantId. Lança em:
 * chave da versão ausente, blob adulterado (tag), AAD divergente (blob
 * copiado entre tenants) — as mensagens NUNCA carregam o payload.
 */
export function decifrarDadosBancarios(
  envelope: EnvelopeCifrado,
  tenantId: string
): PayloadBancarioSecreto {
  const key = chavePorVersao(envelope.keyVersion);
  if (key === null) {
    throw new Error(
      `chave da versão ${envelope.keyVersion} indisponível — rotação incompleta (ADR-014 §4).`
    );
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(envelope.iv, 'base64'),
    { authTagLength: GCM_TAG_BYTES }
  );
  decipher.setAAD(Buffer.from(tenantId, 'utf8'));
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final(), // lança OpenSSL error em tag/AAD/chave errada
  ]);
  const parsed: unknown = JSON.parse(plaintext.toString('utf8'));
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>)['conta'] !== 'string'
  ) {
    throw new Error('payload decifrado fora do shape { conta, pix }.');
  }
  const obj = parsed as Record<string, unknown>;
  return {
    conta: obj['conta'] as string,
    pix: typeof obj['pix'] === 'string' ? obj['pix'] : null,
  };
}

// ---------------------------------------------------------------------------
// Máscaras (RN-354 — o cliente SÓ vê isto; determinísticas, puras)
// ---------------------------------------------------------------------------

/** Remove tudo que não é dígito. @pure */
export function somenteDigitos(s: string): string {
  return s.replace(/\D/g, '');
}

/** Conta: SÓ os 4 últimos dígitos visíveis — `****1234`. @pure */
export function mascararConta(conta: string): string {
  const digitos = somenteDigitos(conta);
  return `****${digitos.slice(-4)}`;
}

/**
 * CPF (11 dígitos) → `***.***.***-12`; CNPJ (14) → `**.***.***` + barra +
 * `****-12` (a barra literal não pode aparecer neste comentário — fecharia
 * o bloco). Outros tamanhos: genérico `****` + 2 últimos (nunca lançar em
 * máscara — a VALIDAÇÃO de tamanho acontece antes, no input). @pure
 */
export function mascararCpfCnpj(docFiscal: string): string {
  const d = somenteDigitos(docFiscal);
  if (d.length === 11) return `***.***.***-${d.slice(-2)}`;
  if (d.length === 14) return `**.***.***/****-${d.slice(-2)}`;
  return `****${d.slice(-2)}`;
}

/**
 * Chave PIX mascarada (RN-354):
 *   e-mail        → `***@g***.com` (1ª letra do domínio + TLD);
 *   CPF 11 díg.   → `***.***.***-12`;
 *   CNPJ 14 díg.  → máscara fiscal com barra (ver mascararCpfCnpj);
 *   demais (telefone, chave aleatória) → `****` + 4 últimos caracteres.
 * Telefone BR (13 dígitos com +55) cai no genérico — deliberado: máscara
 * de apresentação, não parser de chave. @pure
 */
export function mascararPix(pix: string): string {
  if (pix.includes('@')) {
    const [, dominio = ''] = pix.split('@');
    const ponto = dominio.lastIndexOf('.');
    if (ponto > 0) {
      return `***@${dominio[0] ?? '*'}***${dominio.slice(ponto)}`;
    }
    return `***@${dominio[0] ?? '*'}***`;
  }
  const d = somenteDigitos(pix);
  if (d.length === 11 && d === pix) return mascararCpfCnpj(pix);
  if (d.length === 14 && d === pix) return mascararCpfCnpj(pix);
  return `****${pix.slice(-4)}`;
}
