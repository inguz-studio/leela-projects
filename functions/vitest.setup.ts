// =============================================================================
// functions/vitest.setup.ts — ambiente base dos TESTES (CK2-T6).
//
// `CRM_ID_PEPPER` passou a ser exigido também pelo CHECKOUT (RN-173: o
// registry de pessoas deriva o docId por HMAC — pessoaRegistry.ts, fail-
// closed herdado do hardening A3 do CRM). Sem um default de teste, TODA
// suite que cria pedido teria que setar a env — este setup dá o valor de
// TESTE global (nunca o de produção; produção = Secret Manager no deploy).
//
// Suites que provam o fail-closed (crm.integration / pessoaCore) continuam
// válidas: elas DELETAM a env no próprio teste e restauram depois.
// =============================================================================

import { afterAll } from 'vitest';
import { resumeTriggersSticky } from './src/__tests__/helpers/stability';

if (
  process.env['CRM_ID_PEPPER'] === undefined ||
  process.env['CRM_ID_PEPPER'].length === 0
) {
  process.env['CRM_ID_PEPPER'] = 'pepper-de-teste-vitest';
}

// ─── Fim-de-arquivo (lane SUITE-STAB · leela-build-2d6ee98d) ─────────────────
// 1. resumeTriggersSticky: arquivos wired pausam background triggers p/ o
//    arquivo INTEIRO (o re-enable dispara reload de function definitions —
//    caro; 1× por arquivo, aqui, com o emulator ocioso). No-op p/ arquivos
//    que não pausaram.
// 2. Janela de assentamento: execuções de trigger em voo do arquivo que
//    TERMINA transbordavam p/ o clear+seed do arquivo seguinte (assinaturas
//    do full5: seeds engolidos, leftovers, 409 por contenção). 300ms baratos
//    que protegem inclusive arquivos que ainda usam clear/seed cru.
// Este afterAll é registrado ANTES dos hooks do arquivo ⇒ roda por ÚLTIMO.
afterAll(async () => {
  if (process.env['FIRESTORE_EMULATOR_HOST'] !== undefined) {
    await resumeTriggersSticky();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
});
