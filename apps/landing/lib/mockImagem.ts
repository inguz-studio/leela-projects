// =============================================================================
// apps/landing/lib/mockImagem.ts
//
// Assets MOCK app-side para SLOTS DE IMAGEM que ficariam vazios quando o dado
// não traz URL (LEELA-R12-FIX-MOCKIMG). Mesmo padrão da galeria: SVG local,
// brasa, autocontido, sem serviço externo e event-agnostic. NÃO muta o seed —
// é fallback de renderização. Quando o dado real (avatarUrl/logoUrl) existe, a
// UI usa ele; estes só entram no lugar do placeholder cinza/monograma solto.
// =============================================================================

/** Avatar brasa de exemplo — fundo de marca SOB a inicial real do organizador.
 *  Mantido em SVG (não-foto): o slot sobrepõe a INICIAL do organizador; uma
 *  foto de rosto sob uma letra leria mal. O realismo fotográfico do T1 fica nas
 *  capas/galeria, onde a foto é a superfície inteira. */
export const AVATAR_MOCK = '/mock/organizador-avatar.svg';

/** Logos 1:1 de exemplo para a faixa de patrocinadores (fundo transparente). */
const LOGOS_MOCK = [
  '/mock/patrocinador-logo-1.svg',
  '/mock/patrocinador-logo-2.svg',
  '/mock/patrocinador-logo-3.svg',
] as const;

/**
 * Escolhe um logo mock de forma DETERMINÍSTICA pelo nome (mesmo patrocinador →
 * mesmo logo entre renders), dando variedade à faixa sem aleatoriedade.
 */
export function mockLogoPara(nome: string): string {
  let soma = 0;
  for (let i = 0; i < nome.length; i += 1) soma += nome.charCodeAt(i);
  return LOGOS_MOCK[soma % LOGOS_MOCK.length] as string;
}

// -----------------------------------------------------------------------------
// Preview mock de DADO (LEELA-R12-FIX2) — adendo 13: os slots com imagem da LP
// não podem SUMIR por falta de dado no seed; a regra vira "dado real substitui
// mock", não "sem dado, sem seção". Fazemos isso SÓ no preview/emulator (o que o
// Vitor avalia) — em produção sem emulator a superfície segue honesta (dado real
// ou nada), nunca um organizador/patrocinador falso numa página real.
// -----------------------------------------------------------------------------

/** Estamos numa execução de PREVIEW (Emulator Suite ligado)? Server-side. */
export function ehPreview(): boolean {
  return (
    process.env['LEELA_USE_EMULATOR'] === 'true' ||
    process.env['NEXT_PUBLIC_USE_EMULATOR'] === 'true' ||
    process.env['FIRESTORE_EMULATOR_HOST'] !== undefined
  );
}

/** Handle do organizador de EXEMPLO (preview) — resolve numa página própria. */
export const PREVIEW_ORG_HANDLE = 'organizacao-exemplo';

/** Organizador de exemplo p/ o bloco "Organizado por" quando não há perfil. */
export const ORGANIZADOR_MOCK = {
  handle: PREVIEW_ORG_HANDLE,
  nome: 'Organização Exemplo',
} as const;

/** Nomes de patrocinadores de exemplo (a logo 1:1 vem do mock por nome). */
export const PATROCINADORES_MOCK_NOMES = ['Run+ Store', 'Hidrata Sports', 'Trilha Co'] as const;
