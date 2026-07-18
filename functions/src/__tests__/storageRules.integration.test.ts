/**
 * storageRules.integration.test.ts — LEELA-R5 (ADR-016)
 *
 * Integração (Storage + Firestore Emulator): Security Rules do Firebase
 * Storage (`storage.rules`) + fluxo de upload real pelo SDK client (sem
 * navegador — o RulesTestContext É o client SDK).
 *
 * Cobre (gate do brief R5):
 *   - dono escreve no path próprio (users/{uid}/…) e o fluxo completo
 *     uploadBytes → getDownloadURL resolve;
 *   - outro usuário NEGADO no path alheio; anônimo NEGADO em write;
 *   - contentType fora da allowlist NEGADO (octet-stream, text/html e
 *     image/svg+xml — SVG fica FORA por ser vetor de XSS);
 *   - > 5MB NEGADO (boundary: 5MB exato passa, 5MB+1 nega); vazio NEGADO;
 *   - objeto fora da allowlist de nomes NEGADO; path aninhado NEGADO
 *     (wildcard de 1 segmento + catch-all deny);
 *   - read público SÓ do que é intrinsecamente público (users/{uid}/… e
 *     clubes/{clubeId}/capa); path fora do contrato ILEGÍVEL até autenticado;
 *   - capa de clube: tenant writer do tenant DONO escreve; cross-tenant
 *     NEGADO; papel não-writer (promoter) NEGADO; clube INEXISTENTE NEGADO
 *     (fail-closed do firestore.get cross-service).
 *
 * Comando (1 emulator por vez, portas 8080/9199 conferidas por zumbis antes):
 *   cd functions && JAVA_HOME=$HOME/.jdks/jdk-21.0.11+10 \
 *     npx firebase-tools@13 emulators:exec --only firestore,storage \
 *     --project demo-leela "npx vitest run src/__tests__/storageRules.integration.test.ts"
 *
 * Skip real (describe.skipIf) sem FIRESTORE_EMULATOR_HOST — padrão C1.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getBytes, getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import * as admin from 'firebase-admin';

const PROJECT_ID = 'demo-leela';
const STORAGE_RULES_PATH = resolve(__dirname, '../../../storage.rules');
const FIRESTORE_RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// ── Fixtures ──────────────────────────────────────────────────────────────
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const CLUBE_CASTELO = 'clube-do-castelo'; // clube do tenant castelo
const EVENTO_CASTELO = 'meia-floripa-2026'; // evento do tenant castelo (R9-C)
const MARINA_UID = 'uid-marina-castelo'; // tenant_owner de castelo
const STAFF_UID = 'uid-staff-castelo'; // tenant_staff de castelo
const PROMOTER_UID = 'uid-promoter-castelo'; // promoter (NÃO escreve)
const PASSO_OWNER_UID = 'uid-passo-owner'; // tenant_owner de passo-certo
const ATLETA_UID = 'uid-atleta-sem-tenant'; // autenticado sem claims de tenant
const PLATFORM_ADMIN_UID = 'uid-platform-admin'; // claim mais poderoso do sistema

const PNG_1KB = new Uint8Array(1024).fill(7);
const CINCO_MB = 5 * 1024 * 1024;

const marinaClaims = { tenantId: CASTELO_ID, role: 'tenant_owner' };
const staffClaims = { tenantId: CASTELO_ID, role: 'tenant_staff' };
const promoterClaims = { tenantId: CASTELO_ID, role: 'promoter' };
const passoClaims = { tenantId: PASSO_ID, role: 'tenant_owner' };

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('storage.rules — upload de imagens (LEELA-R5)', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(FIRESTORE_RULES_PATH, 'utf8'),
        host: 'localhost',
        port: Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080),
      },
      storage: {
        rules: readFileSync(STORAGE_RULES_PATH, 'utf8'),
        host: 'localhost',
        port: 9199,
      },
    });

    if (!admin.apps.length) {
      process.env['FIRESTORE_EMULATOR_HOST'] = `localhost:${process.env['LEELA_FS_EMU_PORT'] ?? '8080'}`;
      admin.initializeApp({ projectId: PROJECT_ID });
    }
    adminDb = admin.firestore();
  }, 30_000);

  beforeEach(async () => {
    await testEnv.clearStorage();
    await testEnv.clearFirestore();
    // Seed Firestore (Admin SDK, bypass de Rules): tenants + clube do castelo.
    // O cross-service firestore.get das storage.rules lê ESTES docs.
    const batch = adminDb.batch();
    batch.set(adminDb.doc(`tenants/${CASTELO_ID}`), { status: 'ativo' });
    batch.set(adminDb.doc(`tenants/${PASSO_ID}`), { status: 'ativo' });
    batch.set(adminDb.doc(`clubes/${CLUBE_CASTELO}`), {
      tenantId: CASTELO_ID,
      nome: 'Clube do Castelo',
      slug: CLUBE_CASTELO,
    });
    // R9-C: evento do castelo — alvo do firestore.get do path de imagem de kit
    batch.set(adminDb.doc(`eventos/${EVENTO_CASTELO}`), {
      tenantId: CASTELO_ID,
      nome: 'Meia Maratona Floripa 2026',
      slug: EVENTO_CASTELO,
    });
    await batch.commit();
  }, 30_000);

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  function storageDe(uid: string | null, claims?: Record<string, unknown>) {
    return uid
      ? testEnv.authenticatedContext(uid, claims).storage()
      : testEnv.unauthenticatedContext().storage();
  }

  // ── users/{uid} — dono escreve; fluxo completo do SDK ───────────────────

  it('dono faz upload da própria foto de perfil e resolve a downloadURL (fluxo SDK completo)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    const destino = ref(storage, `users/${MARINA_UID}/foto-perfil`);
    await assertSucceeds(uploadBytes(destino, PNG_1KB, { contentType: 'image/png' }));
    const url = await getDownloadURL(destino);
    expect(url).toContain(`users%2F${MARINA_UID}%2Ffoto-perfil`);
  });

  it('dono escreve os 3 objetos contratados (foto-perfil, perfil-avatar, perfil-capa)', async () => {
    const storage = storageDe(ATLETA_UID); // qualquer autenticado — não exige tenant
    for (const objeto of ['foto-perfil', 'perfil-avatar', 'perfil-capa']) {
      await assertSucceeds(
        uploadBytes(ref(storage, `users/${ATLETA_UID}/${objeto}`), PNG_1KB, {
          contentType: 'image/jpeg',
        })
      );
    }
  });

  it('re-upload SOBRESCREVE o mesmo objeto (update permitido ao dono)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    const destino = ref(storage, `users/${MARINA_UID}/perfil-avatar`);
    await assertSucceeds(uploadBytes(destino, PNG_1KB, { contentType: 'image/png' }));
    await assertSucceeds(
      uploadBytes(destino, new Uint8Array(2048).fill(9), { contentType: 'image/webp' })
    );
  });

  // ── escrita em path alheio / anônimo ────────────────────────────────────

  it('outro usuário autenticado NÃO escreve no path alheio', async () => {
    const storage = storageDe(PASSO_OWNER_UID, passoClaims);
    await assertFails(
      uploadBytes(ref(storage, `users/${MARINA_UID}/foto-perfil`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('anônimo NÃO escreve em nenhum path de usuário', async () => {
    const storage = storageDe(null);
    await assertFails(
      uploadBytes(ref(storage, `users/${MARINA_UID}/foto-perfil`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  // ── contentType allowlist ───────────────────────────────────────────────

  it.each(['application/octet-stream', 'text/html', 'image/svg+xml', 'video/mp4'])(
    'contentType %s NEGADO (allowlist de imagem; SVG fora por XSS)',
    async (contentType) => {
      const storage = storageDe(MARINA_UID, marinaClaims);
      await assertFails(
        uploadBytes(ref(storage, `users/${MARINA_UID}/foto-perfil`), PNG_1KB, { contentType })
      );
    }
  );

  // Regex ANCORADA (^…$): tipo com TOKEN de imagem EMBUTIDO é NEGADO — prova
  // que a defesa contra XSS não depende de substring-match (review antagonista
  // R5 ALTO-1). Se qualquer um destes PASSASSE, o objeto seria servido como
  // text/html a partir do bucket → stored XSS.
  it.each([
    'text/html; image/png', // param após tipo perigoso
    'image/png,text/html', // lista com tipo perigoso
    'image/png; charset=utf-8', // param legítimo mas fora do full-match
    'image/gifx', // sufixo colado no token
    'ximage/png', // prefixo colado no token
    'image/png-evil', // sufixo após token
  ])('contentType com token embutido "%s" NEGADO (full-match ancorado)', async (contentType) => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(
      uploadBytes(ref(storage, `users/${MARINA_UID}/foto-perfil`), PNG_1KB, { contentType })
    );
  });

  // ── tamanho ─────────────────────────────────────────────────────────────

  it('5MB exato PASSA (boundary do teto)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertSucceeds(
      uploadBytes(ref(storage, `users/${MARINA_UID}/perfil-capa`), new Uint8Array(CINCO_MB), {
        contentType: 'image/jpeg',
      })
    );
  }, 30_000);

  it('acima de 5MB NEGADO', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(
      uploadBytes(ref(storage, `users/${MARINA_UID}/perfil-capa`), new Uint8Array(CINCO_MB + 1), {
        contentType: 'image/jpeg',
      })
    );
  }, 30_000);

  it('arquivo VAZIO NEGADO', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(
      uploadBytes(ref(storage, `users/${MARINA_UID}/foto-perfil`), new Uint8Array(0), {
        contentType: 'image/png',
      })
    );
  });

  // ── allowlist de NOMES de objeto + wildcard de 1 segmento ───────────────

  it('objeto fora da allowlist de nomes NEGADO (mesmo com contentType de imagem)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(
      uploadBytes(ref(storage, `users/${MARINA_UID}/qualquer.png`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('path ANINHADO sob users NEGADO (wildcard de 1 segmento + catch-all deny)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(
      uploadBytes(ref(storage, `users/${MARINA_UID}/foto-perfil/extra`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('path fora de TODO contrato NEGADO em write (catch-all)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(
      uploadBytes(ref(storage, 'uploads/livre.png'), PNG_1KB, { contentType: 'image/png' })
    );
  });

  // ── read: público só no que é intrinsecamente público ───────────────────

  it('anônimo LÊ a foto de perfil (avatar é superfície pública)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), `users/${MARINA_UID}/foto-perfil`), PNG_1KB, {
        contentType: 'image/png',
      });
    });
    const anon = storageDe(null);
    await assertSucceeds(getBytes(ref(anon, `users/${MARINA_UID}/foto-perfil`)));
  });

  it('anônimo LÊ a capa do clube (superfície pública da landing)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), `clubes/${CLUBE_CASTELO}/capa`), PNG_1KB, {
        contentType: 'image/png',
      });
    });
    const anon = storageDe(null);
    await assertSucceeds(getBytes(ref(anon, `clubes/${CLUBE_CASTELO}/capa`)));
  });

  it('path fora do contrato é ILEGÍVEL (anônimo E autenticado)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), 'privado/segredo.bin'), PNG_1KB, {
        contentType: 'application/octet-stream',
      });
    });
    await assertFails(getBytes(ref(storageDe(null), 'privado/segredo.bin')));
    await assertFails(getBytes(ref(storageDe(MARINA_UID, marinaClaims), 'privado/segredo.bin')));
  });

  // ── clubes/{clubeId}/capa — ownership por firestore.get ─────────────────

  it('tenant_owner do tenant DONO escreve a capa do clube', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertSucceeds(
      uploadBytes(ref(storage, `clubes/${CLUBE_CASTELO}/capa`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('tenant_staff do tenant DONO também escreve (papel writer)', async () => {
    const storage = storageDe(STAFF_UID, staffClaims);
    await assertSucceeds(
      uploadBytes(ref(storage, `clubes/${CLUBE_CASTELO}/capa`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('tenant_owner de OUTRO tenant NÃO escreve a capa (cross-tenant NEGADO)', async () => {
    const storage = storageDe(PASSO_OWNER_UID, passoClaims);
    await assertFails(
      uploadBytes(ref(storage, `clubes/${CLUBE_CASTELO}/capa`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('promoter do tenant dono NÃO escreve (papel sem escrita)', async () => {
    const storage = storageDe(PROMOTER_UID, promoterClaims);
    await assertFails(
      uploadBytes(ref(storage, `clubes/${CLUBE_CASTELO}/capa`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  // Regressão platform_admin (review antagonista R5 MÉDIO-3): o claim mais
  // poderoso do sistema NÃO tem escrita de client no Storage — nem na capa de
  // clube alheio, nem no path de outro usuário (back-office usa Admin SDK, que
  // bypassa Rules). Espelha o fix F1-01 do R2 (platform_admin não vaza pelo
  // client). tenantId ausente é de propósito: platform_admin é cross-tenant.
  it('platform_admin NÃO escreve a capa de clube pelo client (Admin SDK é o caminho)', async () => {
    const storage = storageDe(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      uploadBytes(ref(storage, `clubes/${CLUBE_CASTELO}/capa`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('platform_admin NÃO escreve no path de outro usuário', async () => {
    const storage = storageDe(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      uploadBytes(ref(storage, `users/${MARINA_UID}/foto-perfil`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('clube INEXISTENTE NEGADO (firestore.get fail-closed — sem "reservar" capa)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(
      uploadBytes(ref(storage, 'clubes/clube-fantasma/capa'), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('objeto diferente de `capa` sob clubes NEGADO', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(
      uploadBytes(ref(storage, `clubes/${CLUBE_CASTELO}/extra.png`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  // ── eventos/{eventoId}/kits/{kitId} — imagem 1:1 do kit (R9-C · RN-227) ──

  it('tenant_owner do tenant DONO do evento escreve a imagem do kit (fluxo SDK completo)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    const destino = ref(storage, `eventos/${EVENTO_CASTELO}/kits/kit_ouro`);
    await assertSucceeds(uploadBytes(destino, PNG_1KB, { contentType: 'image/png' }));
    const url = await getDownloadURL(destino);
    expect(url).toContain(`eventos%2F${EVENTO_CASTELO}%2Fkits%2Fkit_ouro`);
  });

  it('tenant_staff também escreve; kitId com underscore (chave Kit↔enum) casa o padrão', async () => {
    const storage = storageDe(STAFF_UID, staffClaims);
    await assertSucceeds(
      uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/kits/sem_kit`), PNG_1KB, {
        contentType: 'image/webp',
      })
    );
  });

  it('tenant_owner de OUTRO tenant NÃO escreve imagem de kit (cross-tenant NEGADO)', async () => {
    const storage = storageDe(PASSO_OWNER_UID, passoClaims);
    await assertFails(
      uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/kits/kit_ouro`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('promoter/platform_admin NÃO escrevem imagem de kit pelo client', async () => {
    await assertFails(
      uploadBytes(
        ref(storageDe(PROMOTER_UID, promoterClaims), `eventos/${EVENTO_CASTELO}/kits/kit_ouro`),
        PNG_1KB,
        { contentType: 'image/png' }
      )
    );
    await assertFails(
      uploadBytes(
        ref(
          storageDe(PLATFORM_ADMIN_UID, { role: 'platform_admin' }),
          `eventos/${EVENTO_CASTELO}/kits/kit_ouro`
        ),
        PNG_1KB,
        { contentType: 'image/png' }
      )
    );
  });

  it('evento INEXISTENTE NEGADO (firestore.get fail-closed — sem "reservar" imagem)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(
      uploadBytes(ref(storage, 'eventos/evento-fantasma/kits/kit_ouro'), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('contentType perigoso NEGADO no path de kit (SVG/HTML — stored XSS)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    for (const contentType of ['image/svg+xml', 'text/html']) {
      await assertFails(
        uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/kits/kit_ouro`), PNG_1KB, {
          contentType,
        })
      );
    }
  });

  it('kitId fora do padrão NEGADO (maiúscula, path traversal por nome)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    for (const kitId of ['Kit_Ouro', '-comeca-com-hifen', 'a'.repeat(81)]) {
      await assertFails(
        uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/kits/${kitId}`), PNG_1KB, {
          contentType: 'image/png',
        })
      );
    }
  });

  it('anônimo LÊ a imagem do kit (superfície pública do checkout)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), `eventos/${EVENTO_CASTELO}/kits/kit_ouro`), PNG_1KB, {
        contentType: 'image/png',
      });
    });
    const anon = storageDe(null);
    await assertSucceeds(getBytes(ref(anon, `eventos/${EVENTO_CASTELO}/kits/kit_ouro`)));
  });

  // ── delete: só o dono ───────────────────────────────────────────────────

  it('dono DELETA a própria foto; outro usuário NÃO', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), `users/${MARINA_UID}/foto-perfil`), PNG_1KB, {
        contentType: 'image/png',
      });
    });
    await assertFails(
      deleteObject(ref(storageDe(PASSO_OWNER_UID, passoClaims), `users/${MARINA_UID}/foto-perfil`))
    );
    await assertSucceeds(
      deleteObject(ref(storageDe(MARINA_UID, marinaClaims), `users/${MARINA_UID}/foto-perfil`))
    );
  });
});
