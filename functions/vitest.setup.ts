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

if (
  process.env['CRM_ID_PEPPER'] === undefined ||
  process.env['CRM_ID_PEPPER'].length === 0
) {
  process.env['CRM_ID_PEPPER'] = 'pepper-de-teste-vitest';
}
