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
 *     (fail-closed do firestore.get cross-service);
 *   - capa de EVENTO (CEV · RN-228): mesma guarda cross-service dos kits +
 *     allowlist estrita jpeg/png/gif (webp/avif NEGADOS neste path), path
 *     traversal/probing NEGADO, evento inexistente NEGADO, read público.
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
import {
  clearFirestoreDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';

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

// DIAG-STORAGE-CAPA: o evento REAL do defeito relatado em produção. Não é um
// fixture novo por capricho — o objeto do erro do dono foi literalmente
// `eventos/teste-taxa-repassada/capa`, e o doc de produção tem
// tenantId=castelo-producoes / organizadorId=uid-marina-castelo (lido por REST
// no Firestore de produção em 2026-08-05). Reproduzir com o id e o tenant
// REAIS é o que transforma "a regra parece certa" em "a regra permite ESTE
// upload"; qualquer outro id deixaria a dúvida de fixture no meio.
const EVENTO_PROD = 'teste-taxa-repassada';

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
        host: '127.0.0.1',
        port: Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080),
      },
      storage: {
        rules: readFileSync(STORAGE_RULES_PATH, 'utf8'),
        // IPv4 explícito: `localhost` resolve para ::1 primeiro no Node 18+
        // (DNS verbatim) e o emulator de Storage sobe em 127.0.0.1 — o par
        // host/porta tem de ser literal para a suíte não morrer em ECONNREFUSED
        // quando outra lane já ocupa a porta padrão.
        host: '127.0.0.1',
        // Porta própria por lane (mesma disciplina do LEELA_FS_EMU_PORT do
        // Firestore): duas suítes de Rules no mesmo relógio não podem disputar
        // 9199 — colisão de emulator é indistinguível de regressão de Rule.
        port: Number(process.env['LEELA_ST_EMU_PORT'] ?? 9199),
      },
    });

    if (!admin.apps.length) {
      process.env['FIRESTORE_EMULATOR_HOST'] = `127.0.0.1:${process.env['LEELA_FS_EMU_PORT'] ?? '8080'}`;
      admin.initializeApp({ projectId: PROJECT_ID });
    }
    adminDb = admin.firestore();
  }, 30_000);

  // SUITE-STAB: clear+seed com triggers pausados + canários verificados —
  // full5: firestore.get cross-service das storage.rules falhava porque o
  // doc-alvo sumia sob o backlog de triggers vizinho.
  async function seedCrossService(): Promise<void> {
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
    // DIAG-STORAGE-CAPA: cópia fiel do doc de PRODUÇÃO do evento do defeito.
    batch.set(adminDb.doc(`eventos/${EVENTO_PROD}`), {
      tenantId: CASTELO_ID,
      nome: '[TESTE] Taxa repassada — evento de teste da plataforma',
      slug: EVENTO_PROD,
      organizadorId: MARINA_UID,
    });
    await batch.commit();
  }

  beforeEach(async () => {
    await testEnv.clearStorage();
    await withTriggersPaused(async () => {
      await clearFirestoreDrained(testEnv);
      await seedVerified(adminDb, testEnv, seedCrossService, [
        `tenants/${CASTELO_ID}`,
        `clubes/${CLUBE_CASTELO}`,
        `eventos/${EVENTO_CASTELO}`,
        `eventos/${EVENTO_PROD}`,
      ]);
    });
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

  // ── .../kits/{kitId}/fotos/{slot} — as DUAS secundárias (S212-T1 · RN-427) ─
  //
  // A promessa que estes casos cobram é a que a spec vendeu como ganho "de
  // graça": com slots LITERAIS, o teto de três fotos deixa de ser combinado no
  // aplicativo e passa a ser garantido pelo Storage. Se um dia alguém trocar
  // `slot == '2' || slot == '3'` por uma regex de dígito para "facilitar", o
  // caso do slot 4 morde.

  it('tenant writer escreve as DUAS secundárias do kit (slots 2 e 3)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    for (const slot of ['2', '3']) {
      const destino = ref(storage, `eventos/${EVENTO_CASTELO}/kits/kit_ouro/fotos/${slot}`);
      await assertSucceeds(uploadBytes(destino, PNG_1KB, { contentType: 'image/png' }));
      const url = await getDownloadURL(destino);
      expect(url).toContain(`kits%2Fkit_ouro%2Ffotos%2F${slot}`);
    }
  });

  it('QUARTA foto é impossível: slot fora de {2,3} NEGADO (teto estrutural)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    for (const slot of ['1', '4', '0', '10', 'principal', '2a', '']) {
      await assertFails(
        uploadBytes(
          ref(storage, `eventos/${EVENTO_CASTELO}/kits/kit_ouro/fotos/${slot}`),
          PNG_1KB,
          { contentType: 'image/png' }
        )
      );
    }
  });

  it('secundária herda as MESMAS guardas da principal (cross-tenant, promoter, evento fantasma, SVG, kitId torto)', async () => {
    const alvo = `eventos/${EVENTO_CASTELO}/kits/kit_ouro/fotos/2`;
    await assertFails(
      uploadBytes(ref(storageDe(PASSO_OWNER_UID, passoClaims), alvo), PNG_1KB, {
        contentType: 'image/png',
      })
    );
    await assertFails(
      uploadBytes(ref(storageDe(PROMOTER_UID, promoterClaims), alvo), PNG_1KB, {
        contentType: 'image/png',
      })
    );
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(
      uploadBytes(ref(storage, 'eventos/evento-fantasma/kits/kit_ouro/fotos/2'), PNG_1KB, {
        contentType: 'image/png',
      })
    );
    await assertFails(
      uploadBytes(ref(storage, alvo), PNG_1KB, { contentType: 'image/svg+xml' })
    );
    await assertFails(
      uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/kits/Kit_Ouro/fotos/2`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('nada mais nasce sob a galeria: aninhado abaixo do slot NEGADO (deny-by-default)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    for (const path of [
      `eventos/${EVENTO_CASTELO}/kits/kit_ouro/fotos`,
      `eventos/${EVENTO_CASTELO}/kits/kit_ouro/fotos/2/extra`,
      `eventos/${EVENTO_CASTELO}/kits/kit_ouro/foto/2`,
      `eventos/${EVENTO_CASTELO}/kits/kit_ouro/Fotos/2`,
    ]) {
      await assertFails(uploadBytes(ref(storage, path), PNG_1KB, { contentType: 'image/png' }));
    }
  });

  it('anônimo LÊ a secundária (a miniatura aparece no checkout sem sessão)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(
        ref(ctx.storage(), `eventos/${EVENTO_CASTELO}/kits/kit_ouro/fotos/3`),
        PNG_1KB,
        { contentType: 'image/png' }
      );
    });
    const anon = storageDe(null);
    await assertSucceeds(
      getBytes(ref(anon, `eventos/${EVENTO_CASTELO}/kits/kit_ouro/fotos/3`))
    );
  });

  // ── eventos/{eventoId}/capa — capa/hero do evento (CEV · RN-228) ────────

  it('tenant_owner do tenant DONO do evento escreve a capa (fluxo SDK completo)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    const destino = ref(storage, `eventos/${EVENTO_CASTELO}/capa`);
    await assertSucceeds(uploadBytes(destino, PNG_1KB, { contentType: 'image/png' }));
    const url = await getDownloadURL(destino);
    expect(url).toContain(`eventos%2F${EVENTO_CASTELO}%2Fcapa`);
  });

  it('tenant_staff do tenant dono também escreve a capa (papel writer)', async () => {
    const storage = storageDe(STAFF_UID, staffClaims);
    await assertSucceeds(
      uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/capa`), PNG_1KB, {
        contentType: 'image/jpeg',
      })
    );
  });

  it('re-upload SOBRESCREVE a capa (update permitido — sem órfãos)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    const destino = ref(storage, `eventos/${EVENTO_CASTELO}/capa`);
    await assertSucceeds(uploadBytes(destino, PNG_1KB, { contentType: 'image/png' }));
    await assertSucceeds(
      uploadBytes(destino, new Uint8Array(2048).fill(3), { contentType: 'image/gif' })
    );
  });

  it('tenant_owner de OUTRO tenant NÃO escreve a capa do evento (cross-tenant NEGADO)', async () => {
    const storage = storageDe(PASSO_OWNER_UID, passoClaims);
    await assertFails(
      uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/capa`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  it('promoter / platform_admin / anônimo NÃO escrevem a capa pelo client', async () => {
    await assertFails(
      uploadBytes(
        ref(storageDe(PROMOTER_UID, promoterClaims), `eventos/${EVENTO_CASTELO}/capa`),
        PNG_1KB,
        { contentType: 'image/png' }
      )
    );
    await assertFails(
      uploadBytes(
        ref(storageDe(PLATFORM_ADMIN_UID, { role: 'platform_admin' }), `eventos/${EVENTO_CASTELO}/capa`),
        PNG_1KB,
        { contentType: 'image/png' }
      )
    );
    await assertFails(
      uploadBytes(ref(storageDe(null), `eventos/${EVENTO_CASTELO}/capa`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  // Bypass de papel via caminho forjado (vetor do brief CEV): claim writer de
  // OUTRO tenant apontando o caminho de um evento que não é seu já está coberto
  // acima (cross-tenant); aqui, evento INEXISTENTE — o firestore.get erra e
  // NEGA (fail-closed): não se "reserva" capa de evento que ainda não existe.
  it('evento INEXISTENTE NEGADO (firestore.get fail-closed — sem "reservar" capa)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(
      uploadBytes(ref(storage, 'eventos/evento-fantasma/capa'), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  // RN-228: allowlist da capa de evento é SÓ jpeg/png/gif — webp/avif (válidos
  // nas demais superfícies) NÃO entram neste path; SVG/HTML seguem banidos.
  it.each(['image/webp', 'image/avif', 'image/svg+xml', 'text/html', 'application/octet-stream'])(
    'contentType %s NEGADO na capa de evento (allowlist RN-228 jpeg/png/gif)',
    async (contentType) => {
      const storage = storageDe(MARINA_UID, marinaClaims);
      await assertFails(
        uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/capa`), PNG_1KB, { contentType })
      );
    }
  );

  // Spoof por token EMBUTIDO (vetor do brief CEV): regex ancorada ^…$ — se
  // qualquer um passasse, o bucket serviria text/html → stored XSS.
  it.each(['text/html; image/png', 'image/png,text/html', 'image/gifx', 'ximage/jpeg'])(
    'contentType com token embutido "%s" NEGADO na capa de evento (full-match)',
    async (contentType) => {
      const storage = storageDe(MARINA_UID, marinaClaims);
      await assertFails(
        uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/capa`), PNG_1KB, { contentType })
      );
    }
  );

  // Teto RN-228 nas Rules (fix da review antagonista CEV): 2MB exato PASSA
  // (boundary), 2MB+1 NEGADO — o teto fino vale TAMBÉM contra SDK direto,
  // não só no seam. Vazio NEGADO (imagemValida).
  it('2MB exato PASSA e 2MB+1 NEGADO na capa de evento (teto RN-228 nas Rules)', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    const DOIS_MB = 2 * 1024 * 1024;
    await assertSucceeds(
      uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/capa`), new Uint8Array(DOIS_MB), {
        contentType: 'image/jpeg',
      })
    );
    await assertFails(
      uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/capa`), new Uint8Array(DOIS_MB + 1), {
        contentType: 'image/jpeg',
      })
    );
  }, 30_000);

  it('arquivo VAZIO NEGADO na capa de evento', async () => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(
      uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/capa`), new Uint8Array(0), {
        contentType: 'image/png',
      })
    );
  });

  // Claim writer MALFORMADO (gap apontado pela review): role=tenant_owner SEM
  // tenantId — `tenantId is string` no isTenantWriterRole NEGA por construção
  // (nunca chega ao null==null do firestore.get).
  it('tenant_owner SEM tenantId no claim NEGADO na capa de evento (claim malformado)', async () => {
    const storage = storageDe('uid-owner-sem-tenant', { role: 'tenant_owner' });
    await assertFails(
      uploadBytes(ref(storage, `eventos/${EVENTO_CASTELO}/capa`), PNG_1KB, {
        contentType: 'image/png',
      })
    );
  });

  // Path traversal / probing (vetor do brief CEV): só o segmento LITERAL
  // `capa` casa — path aninhado, nome próximo e objeto solto sob eventos/
  // caem no deny-by-default (nenhum match concede).
  it.each([
    `eventos/${EVENTO_CASTELO}/capa/extra`, // aninhado sob capa
    `eventos/${EVENTO_CASTELO}/Capa`, // case-sensitive probing
    `eventos/${EVENTO_CASTELO}/capa2`, // nome próximo
    `eventos/${EVENTO_CASTELO}/qualquer.png`, // objeto fora do contrato
    'eventos/capa', // sem eventoId (vira {eventoId}='capa' sem objeto → nada casa)
  ])('path forjado "%s" NEGADO em write (deny-by-default)', async (path) => {
    const storage = storageDe(MARINA_UID, marinaClaims);
    await assertFails(uploadBytes(ref(storage, path), PNG_1KB, { contentType: 'image/png' }));
  });

  it('anônimo LÊ a capa do evento (hero da landing pública)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), `eventos/${EVENTO_CASTELO}/capa`), PNG_1KB, {
        contentType: 'image/png',
      });
    });
    const anon = storageDe(null);
    await assertSucceeds(getBytes(ref(anon, `eventos/${EVENTO_CASTELO}/capa`)));
  });

  it('delete da capa: writer do tenant dono SIM; outro tenant NÃO', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), `eventos/${EVENTO_CASTELO}/capa`), PNG_1KB, {
        contentType: 'image/png',
      });
    });
    await assertFails(
      deleteObject(ref(storageDe(PASSO_OWNER_UID, passoClaims), `eventos/${EVENTO_CASTELO}/capa`))
    );
    await assertSucceeds(
      deleteObject(ref(storageDe(MARINA_UID, marinaClaims), `eventos/${EVENTO_CASTELO}/capa`))
    );
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

  // ═══════════════════════════════════════════════════════════════════════
  // DIAG-STORAGE-CAPA — veredito CONDIÇÃO A CONDIÇÃO do `allow create` de
  // `eventos/{eventoId}/capa`, sobre o evento e o tenant REAIS do defeito
  // relatado em produção ("User does not have permission to access
  // 'eventos/teste-taxa-repassada/capa'").
  //
  // As quatro condições do grant, na ordem em que a Rule as encadeia:
  //   C1 isTenantWriterRole()        — claim: tenantId string + role writer
  //   C2 eventoDoMeuTenant(eventoId) — CROSS-SERVICE firestore.get no doc
  //   C3 imagemValida()              — payload 1B..5MB + contentType de imagem
  //   C4 capaEventoFormatoValido()   — jpeg|png|gif + ≤2MB
  //
  // Cada teste abaixo mantém TRÊS condições satisfeitas e falseia UMA, para o
  // veredito ser por condição e não pelo conjunto. O caso feliz vem primeiro:
  // com as quatro satisfeitas o upload PASSA — logo a Rule não é a culpada do
  // que o dono viu.
  // ═══════════════════════════════════════════════════════════════════════
  describe('DIAG-STORAGE-CAPA — condição a condição, com o evento de produção', () => {
    const JPEG_500KB = new Uint8Array(500 * 1024).fill(1);
    const DOIS_MB = 2 * 1024 * 1024;

    /** Código do erro do SDK, ou null quando o upload passou. */
    async function codigoDoErro(p: Promise<unknown>): Promise<string | null> {
      try {
        await p;
        return null;
      } catch (e) {
        return (e as { code?: string }).code ?? String(e);
      }
    }

    it('C1..C4 satisfeitas: a Marina de PRODUÇÃO sobe a capa de teste-taxa-repassada', async () => {
      const storage = storageDe(MARINA_UID, marinaClaims);
      const destino = ref(storage, `eventos/${EVENTO_PROD}/capa`);
      await assertSucceeds(uploadBytes(destino, JPEG_500KB, { contentType: 'image/jpeg' }));
      const url = await getDownloadURL(destino);
      expect(url).toContain(`eventos%2F${EVENTO_PROD}%2Fcapa`);
    }, 30_000);

    it.each([
      ['sem tenantId no claim', 'uid-sem-tenant', { role: 'tenant_owner' }],
      ['role promoter', PROMOTER_UID, { tenantId: CASTELO_ID, role: 'promoter' }],
      ['role platform_admin (não tem tenantId)', PLATFORM_ADMIN_UID, { role: 'platform_admin' }],
      ['role athlete', 'uid-atleta', { role: 'athlete' }],
    ])('C1 isTenantWriterRole FALSA (%s) → NEGA', async (_nome, uid, claims) => {
      await assertFails(
        uploadBytes(ref(storageDe(uid, claims), `eventos/${EVENTO_PROD}/capa`), JPEG_500KB, {
          contentType: 'image/jpeg',
        })
      );
    });

    it('C2 eventoDoMeuTenant FALSA (claim de outro tenant) → NEGA', async () => {
      await assertFails(
        uploadBytes(
          ref(storageDe(PASSO_OWNER_UID, passoClaims), `eventos/${EVENTO_PROD}/capa`),
          JPEG_500KB,
          { contentType: 'image/jpeg' }
        )
      );
    });

    // ESTE é o teste que reproduz o SINTOMA de produção. Com o doc do evento
    // fora do alcance do firestore.get, a C2 não fica "falsa": ela ERRA — e o
    // erro, por construção fail-closed, é NEGAR. O SDK devolve exatamente o
    // mesmo `storage/unauthorized` que o dono viu, com claim perfeito e arquivo
    // perfeito. Em produção a mesma indistinguibilidade acontece por outro
    // motivo (o service agent do Storage não tem permissão de ler o Firestore),
    // e é por isso que o erro cru na tela não é diagnóstico: ele cobre
    // "você não pode" e "eu não consegui perguntar" com a mesma frase.
    it('C2 INDISPONÍVEL (doc do evento ausente) → NEGA com storage/unauthorized — mesmo sintoma da produção', async () => {
      await adminDb.doc(`eventos/${EVENTO_PROD}`).delete();
      const storage = storageDe(MARINA_UID, marinaClaims);
      const codigo = await codigoDoErro(
        uploadBytes(ref(storage, `eventos/${EVENTO_PROD}/capa`), JPEG_500KB, {
          contentType: 'image/jpeg',
        })
      );
      expect(codigo).toBe('storage/unauthorized');
    }, 30_000);

    it.each([
      ['payload vazio', new Uint8Array(0), 'image/jpeg'],
      ['acima de 5MB', new Uint8Array(CINCO_MB + 1), 'image/jpeg'],
    ])('C3 imagemValida FALSA (%s) → NEGA', async (_nome, bytes, contentType) => {
      await assertFails(
        uploadBytes(ref(storageDe(MARINA_UID, marinaClaims), `eventos/${EVENTO_PROD}/capa`), bytes, {
          contentType,
        })
      );
    }, 30_000);

    it.each([
      ['contentType image/webp', new Uint8Array(1024), 'image/webp'],
      ['contentType image/avif', new Uint8Array(1024), 'image/avif'],
      ['2MB + 1 byte', new Uint8Array(DOIS_MB + 1), 'image/jpeg'],
    ])('C4 capaEventoFormatoValido FALSA (%s) → NEGA', async (_nome, bytes, contentType) => {
      await assertFails(
        uploadBytes(ref(storageDe(MARINA_UID, marinaClaims), `eventos/${EVENTO_PROD}/capa`), bytes, {
          contentType,
        })
      );
    }, 30_000);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // GUARDA CONTRA REINCIDÊNCIA — o teto e a allowlist da capa estão escritos
  // em DOIS lugares: na Rule (`capaEventoFormatoValido`, fronteira real) e no
  // seam do cliente (`problemaDoArquivoCapaEvento`, a mensagem que a pessoa
  // lê). Enquanto os dois coincidem, todo arquivo recusado sai com frase
  // específica ("A capa deve ter no máximo 2MB") e NUNCA com o
  // `storage/unauthorized` cru — que é reservado a problema de permissão.
  //
  // Se alguém afrouxar um lado, abre-se uma FAIXA em que a tela deixa passar e
  // o Storage nega, e a pessoa recebe uma acusação de permissão por um
  // problema de arquivo. É a mesma família de defeito que já custou caro nesta
  // casa (validação duplicada divergindo entre camadas), e é barata de fechar:
  // o teste lê os dois arquivos-fonte e compara os números.
  // ═══════════════════════════════════════════════════════════════════════
  describe('guarda: seam do cliente e Rule não podem divergir na capa', () => {
    const SEAM_PATH = resolve(__dirname, '../../../packages/api-client/src/storage.ts');

    it('o teto de bytes da capa é o MESMO na Rule e no seam', () => {
      const rules = readFileSync(STORAGE_RULES_PATH, 'utf8');
      const seam = readFileSync(SEAM_PATH, 'utf8');
      const naRule = /request\.resource\.size <= (\d+) \* 1024 \* 1024/.exec(
        rules.slice(rules.indexOf('function capaEventoFormatoValido'))
      );
      const noSeam = /CAPA_EVENTO_MAX_BYTES = (\d+) \* 1024 \* 1024/.exec(seam);
      expect(naRule?.[1]).toBeDefined();
      expect(noSeam?.[1]).toBeDefined();
      expect(noSeam?.[1]).toBe(naRule?.[1]);
    });

    it('a allowlist de contentType da capa é a MESMA na Rule e no seam', () => {
      const rules = readFileSync(STORAGE_RULES_PATH, 'utf8');
      const seam = readFileSync(SEAM_PATH, 'utf8');
      const naRule = /\^image\/\(([a-z|]+)\)\$/.exec(
        rules.slice(rules.indexOf('function capaEventoFormatoValido'))
      );
      const noSeam = /CAPA_EVENTO_UPLOAD_TIPOS = \[([^\]]+)\]/.exec(seam);
      expect(naRule?.[1]).toBeDefined();
      expect(noSeam?.[1]).toBeDefined();
      const daRule = (naRule?.[1] ?? '').split('|').sort();
      const doSeam = (noSeam?.[1] ?? '')
        .split(',')
        .map((s) => s.trim().replace(/^'|'$/g, ''))
        .filter((s) => s.startsWith('image/'))
        .map((s) => s.replace('image/', ''))
        .sort();
      expect(doSeam).toEqual(daRule);
    });
  });
});
