// =============================================================================
// apps/landing/lib/mockImagem.ts
//
// Assets MOCK app-side para SLOTS DE IMAGEM que ficariam vazios quando o dado
// não traz URL (LEELA-R12-FIX-MOCKIMG). Mesmo padrão da galeria: SVG local,
// brasa, autocontido, sem serviço externo e event-agnostic. NÃO muta o seed —
// é fallback de renderização. Quando o dado real (avatarUrl/logoUrl) existe, a
// UI usa ele; estes só entram no lugar do placeholder cinza/monograma solto.
// =============================================================================

/** Avatar brasa de exemplo — fundo de marca sob a inicial real do organizador. */
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
