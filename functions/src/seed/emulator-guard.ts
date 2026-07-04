// =============================================================================
// functions/src/seed/emulator-guard.ts
//
// Guard anti-produção compartilhado pelos seeds (padrão F5 — review S1600,
// mesmo contrato de tenants.seed.ts): seed SÓ roda contra o Emulator.
// =============================================================================

/**
 * Lança erro se o processo não estiver claramente apontado ao Emulator:
 * exige FIRESTORE_EMULATOR_HOST ou projectId com prefixo 'demo-'.
 * NUNCA permita seed contra produção.
 */
export function assertEmulatorOnly(seedName: string): void {
  const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
  const projectId =
    process.env['GCLOUD_PROJECT'] ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';

  if (!emulatorHost && !projectId.startsWith('demo-')) {
    throw new Error(
      `[seed] BLOQUEADO: ${seedName} só roda no Emulator. ` +
        'Defina FIRESTORE_EMULATOR_HOST (ou use um projectId demo-*). ' +
        'NUNCA execute este seed contra produção.'
    );
  }
}
