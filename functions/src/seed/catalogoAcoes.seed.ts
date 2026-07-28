// =============================================================================
// functions/src/seed/catalogoAcoes.seed.ts
//
// Seed do catálogo global `catalogoAcoes` — 16 ações em 3 pilares
// (RN-114: 7 Físico, 5 Mental, 4 Espiritual) — LEELA-S105-T1.
// NÃO executar em produção (guard assertEmulatorOnly local — unificação com
// seed/emulator-guard.ts do E16 é follow-up já anotado no E05-L1).
//
// A fonte canônica das 16 ações é `@leela/core` (CATALOGO_ACOES): o seed é
// apenas a materialização no Firestore — zero duplicação de dados aqui.
// Idempotente: docIds fixos (slug da ação); rerun regrava o mesmo conteúdo.
//
// Rules: leitura global autenticada; escrita de cliente NEGADA (write: if
// false) — este seed usa Admin SDK (bypass de Rules), como a Function faria.
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { CATALOGO_ACOES, TOTAL_ACOES_CATALOGO } from '@leela/core';
import { assertEmulatorOnly as guardEmulatorOnly } from './emulator-guard';

/**
 * Guard anti-produção (padrão F5 — review S1600): seed SÓ roda no Emulator.
 */
function assertEmulatorOnly(): void {
  // Delegado ao guard COMPARTILHADO de emulator-guard.ts (mesmo contrato
  // F5 + escape nominal de producao da lane DEPLOY-PREVIEW). Antes: copia
  // local identica - consolidada para o escape valer em todos os seeds.
  guardEmulatorOnly('seedCatalogoAcoes');
}

/**
 * Materializa as 16 ações canônicas em `catalogoAcoes/{acaoId}`.
 * Idempotente: set() completo por docId fixo — rerun converge sempre.
 */
export async function seedCatalogoAcoes(
  db: admin.firestore.Firestore
): Promise<void> {
  assertEmulatorOnly();

  if (CATALOGO_ACOES.length !== TOTAL_ACOES_CATALOGO) {
    // Defesa contra drift do core (RN-114 é invariante de produto)
    throw new Error(
      `[seed] catálogo divergente: esperado ${TOTAL_ACOES_CATALOGO} ações, ` +
        `core tem ${CATALOGO_ACOES.length}`
    );
  }

  const batch = db.batch();
  for (const acao of CATALOGO_ACOES) {
    batch.set(db.collection('catalogoAcoes').doc(acao.id), {
      id: acao.id,
      nome: acao.nome,
      pilar: acao.pilar,
      unidade: acao.unidade,
      pontosBase: acao.pontosBase,
      unidadeBase: acao.unidadeBase,
      icone: acao.icone,
    });
  }
  await batch.commit();

  console.log(
    `[seed] catalogoAcoes: ${CATALOGO_ACOES.length} ações (7 físico · 5 mental · 4 espiritual)`
  );
}

// ---------------------------------------------------------------------------
// Entry point (execução direta)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      process.env['FIRESTORE_EMULATOR_HOST'] ?? 'localhost:8080';
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  seedCatalogoAcoes(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
