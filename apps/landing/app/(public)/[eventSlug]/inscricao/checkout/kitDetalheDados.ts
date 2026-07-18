// =============================================================================
// Detalhe do kit para a VISÃO do comprador (LEELA-R13 · frente 7 → R9-C).
//
// DECISÃO DO VITOR (adendo 10): "precisamos também dar a visão do kit,
// descrição do kit para o que está incluso, e imagens também para que o
// comprador possa visualizar."
//
// R9-C (RN-227/RN-229 — modelo REAL): `KitPublico` agora carrega
// `descricao`/`itens`/`imagemUrl` vindos do doc `eventos/{id}/kits` (upload
// 1:1 real em `eventos/{eventoId}/kits/{kitId}` no Storage). Este módulo
// passa a ser a POLÍTICA DE FALLBACK, campo a campo (padrão capas R14 —
// "sem dado → mock rico, nunca vazio"):
//   - dado real preenchido → usa o dado real;
//   - descricao/itens ausentes → catálogo mock chaveado pelo enum canônico
//     (o MESMO texto honesto do R13);
//   - imagemUrl ausente → `null`, e a arte 1:1 mock rica é INLINE no
//     `KitDetalhe.tsx` (SVG no DOM consome tokens do DS — L-011). NUNCA
//     fabricamos URL; a imagem real vem só do doc (já validada http(s)
//     pelo core, segura para `src` de <img>).
// =============================================================================

import type { KitPublico } from '@/lib/tipos';
import { kitEnumFromId } from './tipos';

/** Visão enriquecida de um kit — o que o comprador lê antes de escolher. */
export interface KitDetalheView {
  /** Frase curta que posiciona o kit. */
  descricao: string;
  /** "O que está incluso" — itens do kit, em linguagem de produto. */
  itens: string[];
  /**
   * URL de imagem 1:1 REAL (doc, R9-C) ou `null` — com `null` o
   * `KitDetalhe.tsx` renderiza a arte mock rica inline (tokens do DS).
   */
  imagemUrl: string | null;
}

// Catálogo FALLBACK por tier canônico (texto honesto do R13). Entra campo a
// campo apenas onde o organizador ainda não preencheu o dado real.
const DETALHE_FALLBACK: Record<string, Omit<KitDetalheView, 'imagemUrl'>> = {
  kit_ouro: {
    descricao: 'O kit mais completo — para quem quer levar a experiência inteira do evento.',
    itens: [
      'Camiseta técnica premium de corrida',
      'Medalha de finisher exclusiva',
      'Sacola do evento',
      'Viseira oficial',
      'Número de peito personalizado',
    ],
  },
  kit_prata: {
    descricao: 'O equilíbrio entre custo e experiência, com os itens que mais importam no dia.',
    itens: [
      'Camiseta técnica de corrida',
      'Medalha de finisher',
      'Sacola do evento',
      'Número de peito',
    ],
  },
  kit_basico: {
    descricao: 'O essencial para largar: camiseta, número e a medalha na chegada.',
    itens: ['Camiseta do evento', 'Medalha de finisher', 'Número de peito'],
  },
  sem_kit: {
    descricao: 'Inscrição sem kit — você garante a vaga e o número de peito.',
    itens: ['Número de peito', 'Cronometragem e resultado oficiais'],
  },
};

const FALLBACK_GENERICO: Omit<KitDetalheView, 'imagemUrl'> = {
  descricao: 'Kit do evento — confira os itens inclusos na retirada.',
  itens: ['Itens do kit confirmados na retirada, nas janelas do evento.'],
};

/**
 * Detalhe da visão de um kit — DADO REAL primeiro (R9-C), fallback mock por
 * campo. `imagemUrl` real já passou pela fronteira http(s) do core; quando
 * `null`, quem entrega o "mock rico, nunca vazio" é a arte 1:1 INLINE do
 * `KitDetalhe.tsx` (SVG no DOM consome tokens `var(--…)` do DS — L-011;
 * data-URI não resolve tokens, por isso a arte NÃO mora aqui). NUNCA
 * fabricamos URL de imagem.
 */
export function detalheDoKit(kit: KitPublico): KitDetalheView {
  const enumKit = kitEnumFromId(kit.id);
  const fallback = DETALHE_FALLBACK[enumKit] ?? FALLBACK_GENERICO;
  return {
    descricao: kit.descricao ?? fallback.descricao,
    itens: kit.itens.length > 0 ? kit.itens : fallback.itens,
    imagemUrl: kit.imagemUrl,
  };
}
