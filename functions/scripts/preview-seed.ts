// =============================================================================
// functions/scripts/preview-seed.ts — runner de seed do PREVIEW LOCAL
//
// O que faz: roda TODOS os seeds existentes (functions/src/seed/*) numa ordem
// coerente de dependências e cria os usuários de LOGIN (com senha) que o
// preview usa para entrar no navegador.
//
// Por que um runner (e não rodar cada *.seed.ts direto): os entry-points dos
// seeds fixam `FIRESTORE_EMULATOR_HOST` em localhost:8080 (tenants.seed.ts faz
// isso de forma incondicional). Rodá-los direto apontaria para o Emulator dos
// AGENTES (:8080) e colidiria. Aqui nós IMPORTAMOS as funções (os blocos
// `require.main === module` NÃO rodam) e usamos o host/porta que o preview.sh
// já colocou no ambiente via FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST.
//
// Fora de functions/src/ de propósito: NÃO entra no build/deploy das Functions
// nem no type-check/lint/vitest do pacote (include = src/**). É ferramenta de
// preview, não código de produção.
//
// Emulator-only: exige as duas variáveis de host abaixo. Sem elas, aborta (os
// guards de cada seed também barram execução contra produção).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import type { AuthClaims } from '@leela/core';

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

/** Senha única dos usuários de preview (só existe no Emulator Auth). */
const PREVIEW_PASSWORD = 'demo1234';

const MARINA_EMAIL = 'marina@demo-leela.dev';
const FELIPE_EMAIL = 'felipe@demo-leela.dev';

/**
 * Garante um usuário de login do preview com uid FIXO (casando com os dados de
 * seed: organizadorId / ownerUid), e-mail, senha e claims. Idempotente.
 */
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
  console.log(`[preview-seed] login: ${email} (uid=${uid}, role=${claims.role})`);
}

async function main(): Promise<void> {
  const fsHost = process.env['FIRESTORE_EMULATOR_HOST'];
  const authHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'];
  if (!fsHost || !authHost) {
    throw new Error(
      '[preview-seed] FIRESTORE_EMULATOR_HOST e FIREBASE_AUTH_EMULATOR_HOST ' +
        'precisam estar definidos (o preview.sh faz isso). Abortando para ' +
        'nunca tocar produção.'
    );
  }

  if (!admin.apps.length) {
    // GCLOUD_PROJECT permite a uma lane semear o SEU emulador (bloco de
    // portas + projeto próprios) sem colidir com o hub do demo-leela de um
    // mock vizinho — mesmo padrão do preview-seed-clubes/extra. Default
    // inalterado.
    admin.initializeApp({ projectId: process.env['GCLOUD_PROJECT'] ?? 'demo-leela' });
  }
  const db = admin.firestore();
  const auth = admin.auth();

  console.log(`[preview-seed] Firestore → ${fsHost} · Auth → ${authHost}`);

  // 1. Admin da plataforma (bootstrap de claim) + senha para login no preview.
  await seedPlatformAdmin(auth);
  const adminUser = await auth.getUserByEmail(DEFAULT_PLATFORM_ADMIN_EMAIL);
  await auth.updateUser(adminUser.uid, {
    password: PREVIEW_PASSWORD,
    emailVerified: true,
  });
  console.log(
    `[preview-seed] login: ${DEFAULT_PLATFORM_ADMIN_EMAIL} (role=platform_admin)`
  );

  // 2. Plataforma / tenants (base de tudo).
  await seedTenants(db);
  await seedCommercialTerms(db);

  // 3. Catálogo global (referenciado pelos desafios).
  await seedCatalogoAcoes(db);

  // 4. Eventos do tenant Castelo (+ kits + inscritos + pedidos/pagamentos).
  //    ORDEM: inscritos ANTES de pedidos — seedPedidos enriquece os inscritos
  //    da Meia ([reg] + pedidoRef + tamanhos) via merge; se rodasse antes, o
  //    set integral de seedInscritos apagaria o enriquecimento (A-T3 nasceria
  //    sem [reg]/[pag]). Escreve em `pedidos`/`pagamentos` (não tocados pelo
  //    seedPreviewExtra) e faz merge nos inscritos — sem clobber.
  await seedEventos(db);
  await seedKits(db);
  await seedInscritos(db);
  await seedPedidos(db);
  await seedPoliticaVendas(db);

  // 5. Clube Corrida Perfeita Sul (+ membros + desafios + comunicados + parcerias).
  await seedClubes(db);
  await seedMembros(db);
  await seedDesafios(db);
  await seedComunicados(db);
  await seedParcerias(db);

  // 6. Dados EXTRAS do preview (aditivos por cima dos canônicos): eventos em
  //    todos os estados, entregas/check-ins, clube mais rico, tenants +
  //    termos variados e rollups/financeiro recomputados. Roda DEPOIS dos
  //    canônicos de propósito — os canônicos regravam alguns campos e o
  //    extra completa em cima (ver preview-seed-extra.ts).
  await seedPreviewExtra(db);

  // 6b. Clubes da Marina (tenant Castelo) + satélites do sistema web que
  //     nasciam vazios: campanhas do evento (incl. 'vencido' — decisão 17),
  //     assessoria E18 ativa com cupom atribuído, fila de reembolsos, repasses,
  //     log de comunicação e estoque em alerta. Roda DEPOIS do extra (usa os
  //     eventos/inscritos do Castelo já semeados). Aditivo e idempotente.
  await seedPreviewClubes(db);

  // 7. Usuários de login do preview (uid casa com os seeds → dados aparecem).
  await ensurePreviewUser(auth, MARINA_CASTELO_UID, MARINA_EMAIL, 'Marina Castelo', {
    role: 'tenant_owner',
    tenantId: CASTELO_TENANT_ID,
  });
  await ensurePreviewUser(auth, FELIPE_MARTINS_UID, FELIPE_EMAIL, 'Felipe Martins', {
    role: 'tenant_owner',
    tenantId: CORRIDA_PERFEITA_TENANT_ID,
  });

  console.log('[preview-seed] OK — todos os seeds aplicados e logins prontos.');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[preview-seed] ERRO:', err);
    process.exit(1);
  });
