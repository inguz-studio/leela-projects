// =============================================================================
// functions/src/seed/emulator-guard.ts
//
// Guard anti-produção compartilhado pelos seeds (padrão F5 — review S1600,
// mesmo contrato de tenants.seed.ts): seed SÓ roda contra o Emulator.
// =============================================================================

/**
 * Lança erro se o processo não estiver claramente apontado ao Emulator:
 * exige FIRESTORE_EMULATOR_HOST ou projectId com prefixo 'demo-'.
 * NUNCA permita seed contra produção — com UMA exceção nominal e explícita:
 *
 * Escape do seed de preview em produção (lane DEPLOY-PREVIEW · DEC-0728F):
 * `LEELA_SEED_PROD_ACK` precisa conter POR EXTENSO o mesmo projectId ativo
 * (hoje: `leela-hub`) E o processo NÃO pode estar apontado a um Emulator.
 * Duas declarações independentes que só o runner dedicado
 * (`functions/scripts/prod-seed-leela-hub.ts`) faz de propósito — nenhum
 * fluxo de teste/preview local define essa var. Default segue fail-closed.
 */
export function assertEmulatorOnly(seedName: string): void {
  const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
  const projectId =
    process.env['GCLOUD_PROJECT'] ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';

  const ack = process.env['LEELA_SEED_PROD_ACK'];
  if (
    ack !== undefined &&
    ack.length > 0 &&
    ack === projectId &&
    !emulatorHost
  ) {
    return; // seed de produção autorizado nominalmente (ver doc acima)
  }

  if (!emulatorHost && !projectId.startsWith('demo-')) {
    throw new Error(
      `[seed] BLOQUEADO: ${seedName} só roda no Emulator. ` +
        'Defina FIRESTORE_EMULATOR_HOST (ou use um projectId demo-*). ' +
        'NUNCA execute este seed contra produção.'
    );
  }
}
