// =============================================================================
// functions/scripts/prod-seed-leela-hub.ts — seed de PRODUÇÃO (leela-hub)
// Lane DEPLOY-PREVIEW · DEC-0728F.
//
// Reaproveita 100% os seeds canônicos (functions/src/seed/* + extras do
// preview) e RE-DATA os dados na escrita: todo Timestamp/Date/string de data
// é deslocado pelo nº de dias entre o relógio de referência do dataset
// (LEELA_CLOCK do preview local = 2026-03-15) e HOJE. Nada de relógio fake em
// produção (LEELA_CLOCK só existe sob FUNCTIONS_EMULATOR): o dado nasce com
// datas futuras REAIS e envelhece naturalmente. `codigoIngresso` vem de graça
// (o seed canônico de inscritos já o grava — item 54/INGRESSO-QR).
//
// Como re-data: patch de protótipo NESTE processo (DocumentReference.set,
// WriteBatch.set, CollectionReference.add — únicos métodos de escrita que os
// seeds usam) aplicando redate() ao payload antes de gravar. Ferramenta de
// script, nunca código de produção (fora de src/ ⇒ fora de build/lint/vitest).
//
// Guard: o escape nominal do emulator-guard exige LEELA_SEED_PROD_ACK igual
// ao projectId POR EXTENSO — este runner define ambos de propósito. Também
// ABORTA se qualquer *_EMULATOR_HOST estiver no ambiente (nunca misturar).
//
// Credenciais: GOOGLE_APPLICATION_CREDENTIALS (ADC). Rodar SEMPRE via
// wrapper da lane (ver handoff DEPLOY-PREVIEW) — nunca commitar credencial.
//
// Uso:
//   node <tsx> functions/scripts/prod-seed-leela-hub.ts
//   (com GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_QUOTA_PROJECT=leela-hub)
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import {
  DocumentReference,
  CollectionReference,
  WriteBatch,
  Timestamp,
} from 'firebase-admin/firestore';
import type { AuthClaims } from '@leela/core';

const PROD_PROJECT_ID = 'leela-hub';

/** Relógio de referência do dataset (o LEELA_CLOCK do preview local). */
const REF_CLOCK_UTC = Date.UTC(2026, 2, 15); // 2026-03-15

// ---------------------------------------------------------------------------
// Trava de ambiente (ANTES de importar os seeds não é necessário — os guards
// rodam na CHAMADA — mas validamos primeiro de qualquer forma).
// ---------------------------------------------------------------------------
for (const v of [
  'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_AUTH_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST',
]) {
  if (process.env[v] !== undefined) {
    throw new Error(
      `[prod-seed] ${v} está definido — este runner é EXCLUSIVO de produção. ` +
        'Rode o preview local pelo preview.sh.'
    );
  }
}
if (process.env['GOOGLE_APPLICATION_CREDENTIALS'] === undefined) {
  throw new Error(
    '[prod-seed] GOOGLE_APPLICATION_CREDENTIALS ausente — rode via wrapper ' +
      'da lane (credencial local, nunca commitada).'
  );
}
process.env['GCLOUD_PROJECT'] = PROD_PROJECT_ID;
process.env['LEELA_SEED_PROD_ACK'] = PROD_PROJECT_ID;

// Imports dos seeds DEPOIS da trava (entry-blocks não rodam ao importar).
/* eslint-disable import/first */
import {
  seedTenants,
  CASTELO_TENANT_ID,
  MARINA_CASTELO_UID,
} from '../src/seed/tenants.seed';
import { seedCommercialTerms } from '../src/seed/commercialTerms.seed';
import { seedCatalogoAcoes } from '../src/seed/catalogoAcoes.seed';
import { seedEventos } from '../src/seed/eventos.seed';
import { seedKits } from '../src/seed/kits.seed';
import { seedInscritos } from '../src/seed/inscritos.seed';
import { seedPedidos } from '../src/seed/pedidos.seed';
import { seedPoliticaVendas } from '../src/seed/politicaVendas.seed';
import {
  seedClubes,
  CORRIDA_PERFEITA_TENANT_ID,
  FELIPE_MARTINS_UID,
} from '../src/seed/clubes.seed';
import { seedMembros } from '../src/seed/membros.seed';
import { seedDesafios } from '../src/seed/desafios.seed';
import { seedComunicados } from '../src/seed/comunicados.seed';
import { seedParcerias } from '../src/seed/parcerias.seed';
import {
  seedPlatformAdmin,
  DEFAULT_PLATFORM_ADMIN_EMAIL,
} from '../src/seed/platformAdmin.seed';
import { seedPreviewExtra } from './preview-seed-extra';
import { seedPreviewClubes } from './preview-seed-clubes';
/* eslint-enable import/first */

// ---------------------------------------------------------------------------
// Re-datação
// ---------------------------------------------------------------------------

/** Offset em dias inteiros entre o relógio de referência do dataset e hoje. */
function offsetDias(): number {
  const hoje = new Date();
  const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((hojeUtc - REF_CLOCK_UTC) / 86_400_000);
}

const OFFSET_DIAS = offsetDias();
const OFFSET_MS = OFFSET_DIAS * 86_400_000;

const RE_DATA_SO = /^\d{4}-\d{2}-\d{2}$/;
const RE_DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:/;

function shiftDataSo(s: string): string {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y as number, (m as number) - 1, d as number) + OFFSET_MS);
  return dt.toISOString().slice(0, 10);
}

/** Desloca ISO datetime preservando representação -03:00 (padrão do seed). */
function shiftDataHora(s: string): string | null {
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return null;
  const local = new Date(ms + OFFSET_MS - 3 * 3_600_000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
}

function redate(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return Timestamp.fromMillis(value.toMillis() + OFFSET_MS);
  }
  if (value instanceof Date) {
    return new Date(value.getTime() + OFFSET_MS);
  }
  if (typeof value === 'string') {
    if (RE_DATA_SO.test(value)) return shiftDataSo(value);
    if (RE_DATA_HORA.test(value)) return shiftDataHora(value) ?? value;
    return value;
  }
  if (Array.isArray(value)) return value.map(redate);
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redate(v);
    return out;
  }
  // FieldValue (serverTimestamp/delete), DocumentReference, Buffer etc.:
  // intocados — o Firestore resolve/serializa como sempre.
  return value;
}

/** Patch de protótipo: toda escrita dos seeds passa por redate(). */
function instalarRedatePatch(): void {
  const dSet = DocumentReference.prototype.set;
  (DocumentReference.prototype as unknown as Record<string, unknown>)['set'] =
    function patchedSet(this: DocumentReference, data: unknown, opts?: unknown) {
      return opts === undefined
        ? (dSet as Function).call(this, redate(data))
        : (dSet as Function).call(this, redate(data), opts);
    };

  const bSet = WriteBatch.prototype.set;
  (WriteBatch.prototype as unknown as Record<string, unknown>)['set'] =
    function patchedBatchSet(this: WriteBatch, ref: unknown, data: unknown, opts?: unknown) {
      return opts === undefined
        ? (bSet as Function).call(this, ref, redate(data))
        : (bSet as Function).call(this, ref, redate(data), opts);
    };

  const cAdd = CollectionReference.prototype.add;
  (CollectionReference.prototype as unknown as Record<string, unknown>)['add'] =
    function patchedAdd(this: CollectionReference, data: unknown) {
      return (cAdd as Function).call(this, redate(data));
    };
}

// ---------------------------------------------------------------------------
// Usuários de login (mesma convenção do preview local — senha pública do
// repo; PENDENTE-DONO: trocar/desativar antes de divulgar o link).
// ---------------------------------------------------------------------------
const PREVIEW_PASSWORD = 'demo1234';
const MARINA_EMAIL = 'marina@demo-leela.dev';
const FELIPE_EMAIL = 'felipe@demo-leela.dev';

async function ensurePreviewUser(
  auth: admin.auth.Auth,
  uid: string,
  email: string,
  displayName: string,
  claims: AuthClaims
): Promise<void> {
  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, {
      email,
      password: PREVIEW_PASSWORD,
      emailVerified: true,
      displayName,
    });
  } catch {
    await auth.createUser({
      uid,
      email,
      password: PREVIEW_PASSWORD,
      emailVerified: true,
      displayName,
    });
  }
  await auth.setCustomUserClaims(uid, claims);
  await auth.revokeRefreshTokens(uid);
  console.log(`[prod-seed] login: ${email} (uid=${uid}, role=${claims.role})`);
}

// ---------------------------------------------------------------------------
// Main — mesma ordem do preview-seed.ts (dependências entre seeds).
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log(
    `[prod-seed] alvo=${PROD_PROJECT_ID} · offset=+${OFFSET_DIAS} dias ` +
      `(ref 2026-03-15 → hoje)`
  );
  if (OFFSET_DIAS <= 0) {
    throw new Error('[prod-seed] offset não-positivo — revisar REF_CLOCK_UTC.');
  }

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROD_PROJECT_ID });
  }
  const db = admin.firestore();
  const auth = admin.auth();

  instalarRedatePatch();

  await seedPlatformAdmin(auth);
  const adminUser = await auth.getUserByEmail(DEFAULT_PLATFORM_ADMIN_EMAIL);
  await auth.updateUser(adminUser.uid, {
    password: PREVIEW_PASSWORD,
    emailVerified: true,
  });
  console.log(`[prod-seed] login: ${DEFAULT_PLATFORM_ADMIN_EMAIL} (role=platform_admin)`);

  await seedTenants(db);
  await seedCommercialTerms(db);
  await seedCatalogoAcoes(db);
  await seedEventos(db);
  await seedKits(db);
  await seedInscritos(db);
  await seedPedidos(db);
  await seedPoliticaVendas(db);
  await seedClubes(db);
  await seedMembros(db);
  await seedDesafios(db);
  await seedComunicados(db);
  await seedParcerias(db);
  await seedPreviewExtra(db);
  await seedPreviewClubes(db);

  await ensurePreviewUser(auth, MARINA_CASTELO_UID, MARINA_EMAIL, 'Marina Castelo', {
    role: 'tenant_owner',
    tenantId: CASTELO_TENANT_ID,
  });
  await ensurePreviewUser(auth, FELIPE_MARTINS_UID, FELIPE_EMAIL, 'Felipe Martins', {
    role: 'tenant_owner',
    tenantId: CORRIDA_PERFEITA_TENANT_ID,
  });

  console.log('[prod-seed] OK — seeds aplicados RE-DATADOS e logins prontos.');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[prod-seed] ERRO:', err);
    process.exit(1);
  });
