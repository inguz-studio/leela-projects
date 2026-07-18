// =============================================================================
// functions/src/shared/rateLimit.ts
//
// Rate-limit FAIL-CLOSED em Firestore (LEELA-R2-RATELIMIT · E18 aceite).
//
// Desenho (registrado no report R2):
//   - Janela DESLIZANTE real: o doc `rateLimits/{chave}` guarda `marcos`
//     (epoch ms de cada tentativa ACEITA dentro da janela). A cada consumo,
//     numa TRANSAÇÃO: poda marcos fora da janela; se algum balde está no
//     limite → NEGA sem apender (negativa não estende a janela — evita
//     lockout permanente; o balde já está no teto). O array é limitado por
//     construção ao próprio `limite` (só cresce em consumo aceito).
//   - FAIL-CLOSED de verdade: erro de infra na transação NEGA (o aceite
//     depende do mesmo Firestore — indisponível = indisponível).
//   - Resposta ÚNICA e genérica `resource-exhausted` (sem oráculo: estouro,
//     infra e chave desconhecida são indistinguíveis para o chamador).
//   - LGPD: chave = SHA-256 truncado (IP/alvo nunca persistem em claro).
//     `expiraEm` acompanha o doc para uma TTL policy futura (higiene ops).
//
// Rules: `rateLimits` NÃO tem match — deny-by-default (client SDK nunca lê
// nem escreve os contadores; ver comentário no firestore.rules).
// =============================================================================

import type * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface JanelaRateLimit {
  /** docId em `rateLimits` — SEMPRE derivada via hashChave (sem dado cru). */
  chave: string;
  /** Máximo de consumos aceitos dentro da janela. */
  limite: number;
  /** Largura da janela deslizante em ms. */
  janelaMs: number;
}

export const COLECAO_RATE_LIMITS = 'rateLimits';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Erro único do estouro/indisponibilidade — genérico DE PROPÓSITO. */
function esgotado(): https.HttpsError {
  return new https.HttpsError(
    'resource-exhausted',
    'Muitas tentativas. Tente novamente em alguns minutos.'
  );
}

/** SHA-256 hex truncado (40 chars) — chave estável sem persistir dado cru. */
export function hashChave(bruto: string): string {
  return createHash('sha256').update(bruto, 'utf8').digest('hex').slice(0, 40);
}

// NOTA (LEELA-R2, decisão pós-review antagonista): NÃO existe chave por
// ORIGEM/IP aqui de propósito. Derivar IP confiável do `x-forwarded-for` num
// callable gen1 é premissa de infra NÃO verificável do emulator (o nº de hops
// que o GFE/LB apende decide qual posição é o IP real × o valor forjável pelo
// cliente); um índice fixo vira bypass silencioso se a topologia muda
// (gen2/CDN/domínio custom) e um balde por IP pune vizinho de NAT/CGNAT. O
// throttle volumétrico por origem é responsabilidade da BORDA (Firebase App
// Check / Cloud Armor), não da aplicação. A defesa de brute-force vive na
// chave por ALVO (o convite REAL — ver provisionAssessoria.ts), que o atacante
// é obrigado a endereçar e não é forjável para outro balde.

// ---------------------------------------------------------------------------
// Núcleo
// ---------------------------------------------------------------------------

/**
 * Consome 1 tentativa em TODAS as janelas, atomicamente. Lança
 * `resource-exhausted` quando QUALQUER balde está no limite (nenhum balde é
 * consumido nesse caso) ou quando a infra falha (fail-closed).
 */
export async function consumirRateLimit(
  db: admin.firestore.Firestore,
  janelas: JanelaRateLimit[],
  agora: Date = new Date()
): Promise<void> {
  if (janelas.length === 0) return;
  const nowMs = agora.getTime();
  let estourou = true; // fail-closed: só vira false se a transação decidir
  try {
    await db.runTransaction(async (tx) => {
      const refs = janelas.map((j) =>
        db.collection(COLECAO_RATE_LIMITS).doc(j.chave)
      );
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));

      const crus = snaps.map((s) => {
        const marcos = s.get('marcos') as unknown;
        return Array.isArray(marcos)
          ? marcos.filter((m): m is number => typeof m === 'number')
          : [];
      });
      const podados = janelas.map((j, i) =>
        crus[i]!.filter((m) => m > nowMs - j.janelaMs)
      );

      estourou = janelas.some((j, i) => podados[i]!.length >= j.limite);

      janelas.forEach((j, i) => {
        const podado = podados[i]!;
        if (!estourou) podado.push(nowMs);
        // Escreve só quando mudou (append aceito ou poda efetiva) — negativa
        // pura não gera write (flood negado não amplifica escrita).
        if (!estourou || podado.length !== crus[i]!.length) {
          tx.set(refs[i]!, {
            marcos: podado,
            atualizadoEm: Timestamp.fromMillis(nowMs),
            expiraEm: Timestamp.fromMillis(nowMs + j.janelaMs),
          });
        }
      });
    });
  } catch (err) {
    // FAIL-CLOSED: infra indisponível NEGA (mesma resposta genérica).
    logger.error('rate_limit_indisponivel', {
      erro: err instanceof Error ? err.message : String(err),
    });
    estourou = true;
  }
  if (estourou) throw esgotado();
}
