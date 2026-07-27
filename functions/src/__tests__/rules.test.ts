/**
 * rules.test.ts — integração: Firestore Security Rules deny-by-default
 *
 * Requer o Firestore Emulator. A suite inteira é pulada de verdade
 * (describe.skipIf) quando FIRESTORE_EMULATOR_HOST não está definido —
 * sem emulador nenhum hook roda e a suite reporta "skipped", não "failed".
 *
 * Rodar isoladamente (Java 21+ no PATH):
 *   firebase emulators:exec --only firestore --project demo-leela \
 *     "npx vitest run src/__tests__/rules.test.ts"
 */

import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { doc, getDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

// Skip real: sem FIRESTORE_EMULATOR_HOST a suite não executa nenhum hook.
// (Antes o beforeAll estourava timeout e a suite FALHAVA sem emulador — C1.)
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

let testEnv: RulesTestEnvironment;

describe.skipIf(!hasEmulator)(
  'Firestore Rules — deny-by-default (S000-2-T1)',
  () => {
    beforeAll(async () => {
      testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
          rules: readFileSync(RULES_PATH, 'utf8'),
          host: 'localhost',
          port: 8080,
        },
      });
    });

    afterAll(async () => {
      await testEnv?.cleanup();
    });

    it('nega leitura de qualquer coleção por usuário anônimo', async () => {
      const ctx = testEnv.unauthenticatedContext();
      const docRef = doc(ctx.firestore(), 'atletas', 'qualquer-id');
      await assertFails(getDoc(docRef));
    });

    it('nega escrita de qualquer coleção por usuário anônimo', async () => {
      const ctx = testEnv.unauthenticatedContext();
      const { setDoc } = await import('firebase/firestore');
      const docRef = doc(ctx.firestore(), 'atletas', 'qualquer-id');
      await assertFails(
        setDoc(docRef, { nome: 'Teste', email: 'teste@leela.app' })
      );
    });

    it('nega leitura mesmo autenticado em coleção sem rule permissiva', async () => {
      // `pagamentos` não tem nenhuma rule permissiva para quem não é membro
      // do tenant: read exige claim tenantId compatível e write é `false`.
      // (atletas/{uid} permite self-read, então não serve para esta asserção.)
      const ctx = testEnv.authenticatedContext('uid-123');
      const docRef = doc(ctx.firestore(), 'pagamentos', 'qualquer-pagamento');
      await assertFails(getDoc(docRef));
    });

    it('nega escrita mesmo autenticado em coleção write-only-por-Function', async () => {
      // pagamentos: `allow write: if false` — nem platform_admin escreve pelo cliente.
      const ctx = testEnv.authenticatedContext('uid-123');
      const { setDoc } = await import('firebase/firestore');
      const docRef = doc(ctx.firestore(), 'pagamentos', 'qualquer-pagamento');
      await assertFails(setDoc(docRef, { tenantId: 't1', valor: 100 }));
    });

    // ── PIXCARRINHO-REV · as duas coleções do checkout que só a Function toca ─
    //
    // `carrinhos` (RN-158) e `cobrancasPixAtivas` (RN-157) NÃO têm `match` no
    // firestore.rules DE PROPÓSITO: caem no deny-by-default. A intenção estava
    // escrita em comentário nos dois arquivos e em nenhum teste — e comentário
    // não é gate. O risco não é teórico: com leitura aberta, o dono do próprio
    // uid leria a chave DETERMINÍSTICA (`{uid}__{eventoId}`) e sondaria os
    // carrinhos e as cobranças abertas de terceiros; com escrita aberta, ele
    // reabriria o próprio prazo (o timer de 15 min viraria enfeite) e forjaria
    // ou derrubaria a trava da segunda cobrança PIX.
    //
    // O uid usado é o DONO dos docs consultados: se algum dia alguém abrir um
    // `match` "só para o dono", é este teste que cai.
    it('nega leitura e escrita de `carrinhos` (RN-158) pelo cliente — inclusive ao próprio dono', async () => {
      const uid = 'uid-dono-carrinho';
      const ctx = testEnv.authenticatedContext(uid);
      const { setDoc } = await import('firebase/firestore');
      const meuCarrinho = doc(ctx.firestore(), 'carrinhos', `${uid}__evento-x`);
      await assertFails(getDoc(meuCarrinho));
      await assertFails(
        setDoc(meuCarrinho, { status: 'aberto', expiraEmMillis: Date.now() + 9e9 })
      );
    });

    it('nega leitura e escrita do ledger `carrinhos/{id}/ciclos/{n}` (T3) pelo cliente', async () => {
      const uid = 'uid-dono-carrinho';
      const ctx = testEnv.authenticatedContext(uid);
      const { setDoc } = await import('firebase/firestore');
      const ciclo = doc(ctx.firestore(), 'carrinhos', `${uid}__evento-x`, 'ciclos', '1');
      await assertFails(getDoc(ciclo));
      await assertFails(setDoc(ciclo, { status: 'expirado_sem_concluir', ciclo: 1 }));
    });

    it('nega leitura e escrita da sentinela `cobrancasPixAtivas` (RN-157) pelo cliente', async () => {
      const uid = 'uid-dono-trava';
      const ctx = testEnv.authenticatedContext(uid);
      const { setDoc } = await import('firebase/firestore');
      const sentinela = doc(
        ctx.firestore(),
        'cobrancasPixAtivas',
        `${uid}__evento-x__deadbeef`
      );
      await assertFails(getDoc(sentinela));
      await assertFails(setDoc(sentinela, { pedidoId: 'ped-forjado' }));
    });
  }
);
