// =============================================================================
// functions/src/seed/convitesOrganizador.seed.ts
//
// Seed dos convites de organizador do ambiente de desenvolvimento
// (E16 · S1608-T1 · RN-413).
//
// Por que existe: a jornada de aceite do pacote (cadastrar → aterrissar
// travado → resgatar → painel destravado) precisa de pelo menos um código
// ATIVO para ser exercitável sem passar antes pela tela do super-admin. Os
// códigos são FIXOS e legíveis de propósito — o seed nunca roda em produção
// (guard F5), e um código sorteado obrigaria a ler o Firestore para testar.
//
// Idempotente: código que já existe é NO-OP (rerun não ressuscita um código
// que o desenvolvedor resgatou ou revogou de propósito no Emulator).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  COLECAO_CONVITES_ORGANIZADOR,
  validarCodigoOrganizador,
} from '@leela/core';
import { assertEmulatorOnly } from './emulator-guard';
import { DEFAULT_PLATFORM_ADMIN_EMAIL } from './platformAdmin.seed';

/** Códigos canônicos do Emulator (8 chars, alfabeto RN-413). */
export const CONVITES_SEED: ReadonlyArray<{ codigo: string; nota: string }> = [
  { codigo: 'LEELA234', nota: 'Convite de desenvolvimento — jornada feliz' },
  { codigo: 'LEELA567', nota: 'Convite de desenvolvimento — reserva' },
];

/**
 * Grava os convites `ativo` do Emulator. `criadoPor` recebe o e-mail do
 * super-admin canônico como rótulo legível: o uid dele só existe depois do
 * `platformAdmin.seed`, e o seed não deve depender da ordem de execução.
 */
export async function seedConvitesOrganizador(
  db: admin.firestore.Firestore
): Promise<void> {
  assertEmulatorOnly('seedConvitesOrganizador');

  const col = db.collection(COLECAO_CONVITES_ORGANIZADOR);
  let criados = 0;

  for (const { codigo, nota } of CONVITES_SEED) {
    // Guarda de sanidade: um seed com código fora do alfabeto entraria no
    // banco e seria rejeitado pelas Rules e pelo resgate — falha silenciosa.
    if (!validarCodigoOrganizador(codigo)) {
      throw new Error(`[seed] convite '${codigo}' fora do formato RN-413.`);
    }
    const ref = col.doc(codigo);
    if ((await ref.get()).exists) {
      console.log(`[seed] convitesOrganizador: '${codigo}' já existe — no-op`);
      continue;
    }
    await ref.set({
      codigo,
      status: 'ativo',
      nota,
      criadoPor: DEFAULT_PLATFORM_ADMIN_EMAIL,
      criadoEm: FieldValue.serverTimestamp(),
    });
    criados += 1;
  }

  console.log(
    `[seed] convitesOrganizador: ${criados} código(s) ativo(s) — ` +
      CONVITES_SEED.map((c) => c.codigo).join(', ')
  );
}

// ---------------------------------------------------------------------------
// Entry point (execução direta)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  seedConvitesOrganizador(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
