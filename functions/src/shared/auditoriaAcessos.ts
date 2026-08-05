// =============================================================================
// functions/src/shared/auditoriaAcessos.ts
//
// TRILHA DE ACESSO AUDITADO (RN-354 · LGPD) — o registro de "quem tocou o quê,
// quando, e como terminou".
//
// Nasceu dentro do `getBankDetailsForPayout` (E09s-L2-T5) e saiu de lá quando o
// segundo consumidor apareceu (F2 · reenvio de e-mails do pedido). O motivo da
// mudança não foi estética: o teste de contrato dos secrets
// (`secretsBinding.contract.test.ts`) reprovou o import, e com razão — importar
// a CONSTANTE da coleção arrastava o módulo da cifra de dados bancários para
// dentro do fecho de imports da nova Function, que passaria a exigir
// `BANK_DATA_KEY` para reenviar um e-mail. Constante compartilhada mora em
// módulo sem dependência, não no primeiro que a usou.
//
// A coleção NÃO tem `match` em firestore.rules DE PROPÓSITO: deny-by-default
// para todo cliente. É trilha, e trilha que o auditado pode ler ou apagar não
// é trilha.
//
// REGRA DOS CONSUMIDORES: o registro é gravado FORA de transação e ANTES de
// qualquer `throw` — um abort não pode apagar o rastro da tentativa. E nada de
// PII no doc nem no log: só ids, papel e desfecho.
// =============================================================================

import type * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

type Db = admin.firestore.Firestore;

/** Coleção top-level da trilha — server-only (deny-by-default nas Rules). */
export const AUDITORIA_ACESSOS_COL = 'auditoriaAcessos';

/**
 * Grava um acesso na trilha e ecoa no log estruturado.
 *
 * @param tipo família do acesso (`acesso_dados_bancarios`,
 *   `reenvio_emails_pedido`, ...) — é por ele que a consulta filtra.
 * @param registro ids + papel + desfecho. NUNCA e-mail, nome, token ou número
 *   de conta.
 */
export async function registrarAcessoAuditado(
  db: Db,
  tipo: string,
  registro: Record<string, string>,
  logMessage: string
): Promise<void> {
  await db.collection(AUDITORIA_ACESSOS_COL).add({
    tipo,
    ...registro,
    em: FieldValue.serverTimestamp(),
  });
  logger.info(logMessage, registro);
}
