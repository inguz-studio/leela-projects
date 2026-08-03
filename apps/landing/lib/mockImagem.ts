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

// -----------------------------------------------------------------------------
// Feed de EXEMPLO do perfil (S1707-T4 · RN-445 · D-ACH-19)
// -----------------------------------------------------------------------------

/**
 * Publicação de exemplo do feed do perfil. Não existe modelo de post, nem
 * Rules, nem leitor: a coleção do feed é épico futuro (D-ACH-21). Isto aqui é
 * o que o tester vê no preview para entender o formato — e só no preview.
 */
export interface PostFeedMock {
  id: string;
  /** Rótulo de tempo FIXO. Mock não consulta relógio: um "há 2 dias" calculado
   *  mudaria entre o render do servidor e o do cliente, e ninguém ganha nada. */
  quando: string;
  texto: string;
  /** Imagem opcional — reaproveita o acervo de exemplo que a galeria já usa. */
  imagemUrl?: string;
}

/**
 * Três publicações de exemplo. Vocabulário D-0802-1: experiência e
 * participante, e corrida nunca como categoria — o mesmo texto é servido na
 * página de quem organiza retiro de respiração e na de quem organiza travessia.
 */
export const FEED_MOCK: readonly PostFeedMock[] = [
  {
    id: 'exemplo-1',
    quando: 'há 2 dias',
    texto:
      'As inscrições da próxima experiência abrem na quinta. Quem já participou de alguma nossa recebe o aviso antes.',
    imagemUrl: '/gallery/leela-galeria-percurso.jpg',
  },
  {
    id: 'exemplo-2',
    quando: 'há 1 semana',
    texto:
      'Fechamos o encontro do mês com 42 participantes. O ponto de encontro do próximo já está definido e vai no grupo do club.',
  },
  {
    id: 'exemplo-3',
    quando: 'há 3 semanas',
    texto:
      'Abrimos um club novo para quem quer começar devagar: dois encontros por semana, sem cronômetro e sem exigência de ritmo.',
  },
];
