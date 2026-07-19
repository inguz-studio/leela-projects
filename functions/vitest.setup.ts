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

if (
  process.env['CRM_ID_PEPPER'] === undefined ||
  process.env['CRM_ID_PEPPER'].length === 0
) {
  process.env['CRM_ID_PEPPER'] = 'pepper-de-teste-vitest';
}

// ─── Drain global de fim-de-arquivo (lane SUITE-STAB · leela-build-2d6ee98d) ──
// A suíte roda sequencial por arquivo (fileParallelism: false), mas o Functions
// Emulator executa triggers de forma ASSÍNCRONA — execuções em voo do arquivo
// que TERMINA transbordam para o clear+seed do arquivo seguinte (fonte das
// assinaturas do full5: seeds engolidos, leftovers, 409 por contenção).
// Janela de assentamento no afterAll de TODO arquivo que rodou contra o
// emulator: barata (300ms × arquivos) e protege inclusive arquivos que ainda
// usam clear/seed cru — ver src/__tests__/helpers/stability.ts.
afterAll(async () => {
  if (process.env['FIRESTORE_EMULATOR_HOST'] !== undefined) {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
});
