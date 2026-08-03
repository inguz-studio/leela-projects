'use server';

// =============================================================================
// Ação de servidor que alimenta a faixa do cupom (S1215-T3 · RN-432).
//
// POR QUE UMA AÇÃO, e não um Server Component lendo `searchParams`: ler
// searchParams no servidor tornaria a página do evento DINÂMICA, e ela é
// estática (S1201). A faixa entra como client component atrás de Suspense —
// exatamente o que o `RefTracker` e o `CtaInscricao` já fazem — e busca a
// resposta aqui. Nenhuma rota nova, nenhum handler público novo.
//
// POR QUE NÃO LER O CUPOM NO CLIENTE: as Rules restringem cupom ao
// organizador, com o motivo escrito no modelo ("enumerar cupons = vazar
// descontos"). A verificação roda com Admin SDK no servidor e o gate de
// autorização vive no código — a doutrina da casa desde a S1200-T2. Rules
// intocadas por esta task.
//
// A resposta é a mínima possível e UNIFORME para toda falha. Quem controla o
// que sai é o `verificarCupomDoLink`; esta camada não acrescenta um campo.
// =============================================================================

import { verificarCupomDoLink, type CupomDoLinkPublico } from '@/lib/leitor';

export async function verificarCupomLinkAction(
  eventoSlug: string,
  codigo: string,
): Promise<CupomDoLinkPublico | null> {
  return verificarCupomDoLink(eventoSlug, codigo);
}
