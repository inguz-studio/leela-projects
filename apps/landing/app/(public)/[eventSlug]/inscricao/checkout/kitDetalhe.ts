// =============================================================================
// Detalhe do kit para a VISÃO do comprador (LEELA-R13 · frente 7).
//
// DECISÃO DO VITOR (adendo 10): "precisamos também dar a visão do kit,
// descrição do kit para o que está incluso, e imagens também para que o
// comprador possa visualizar."
//
// ⚠️ LACUNA DE MODELO (registrada em leela-specs para o lote R9-C):
// o shape público do kit (`KitPublico` em lib/tipos) e o doc `eventos/{id}/kits`
// hoje têm só { id, nome, preco, modalidades, capacidade } — SEM descrição,
// SEM itens ("o que está incluso") e SEM imagem. Estender o modelo (campo no
// core + projeção no leitor + upload 1:1 real) é do R9-C e do território R9-E
// (functions/core), FORA desta lane (checkout/apresentação). Então, para
// entregar a visão AGORA sem tocar no core, este módulo mantém um catálogo
// DEMO app-side, chaveado pelo enum canônico do kit (kit_ouro/prata/basico),
// e a imagem é um SLOT 1:1 MOCK (mesmo padrão da capa do R7 — placeholder
// digno; o upload real vem no R9-C). Quando o modelo real chegar, trocar
// `detalheDoKit` por leitura dos campos do `KitPublico`.
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
   * URL de imagem 1:1 quando existir (futuro R9-C). `null` hoje → o componente
   * renderiza o placeholder 1:1 mock. Nunca fabricamos URL.
   */
  imagemUrl: string | null;
}

// Catálogo DEMO por tier canônico. Texto honesto de kit de corrida de rua;
// substituível pelo dado real do doc no R9-C sem mudar a UI que consome.
const DETALHE_DEMO: Record<string, KitDetalheView> = {
  kit_ouro: {
    descricao: 'O kit mais completo — para quem quer levar a experiência inteira do evento.',
    itens: [
      'Camiseta técnica premium de corrida',
      'Medalha de finisher exclusiva',
      'Sacola do evento',
      'Viseira oficial',
      'Número de peito personalizado',
    ],
    imagemUrl: null,
  },
  kit_prata: {
    descricao: 'O equilíbrio entre custo e experiência, com os itens que mais importam no dia.',
    itens: [
      'Camiseta técnica de corrida',
      'Medalha de finisher',
      'Sacola do evento',
      'Número de peito',
    ],
    imagemUrl: null,
  },
  kit_basico: {
    descricao: 'O essencial para largar: camiseta, número e a medalha na chegada.',
    itens: ['Camiseta do evento', 'Medalha de finisher', 'Número de peito'],
    imagemUrl: null,
  },
  sem_kit: {
    descricao: 'Inscrição sem kit — você garante a vaga e o número de peito.',
    itens: ['Número de peito', 'Cronometragem e resultado oficiais'],
    imagemUrl: null,
  },
};

/**
 * Detalhe da visão de um kit. Deriva o tier pelo enum canônico (a MESMA chave
 * Kit↔enum do checkout) e cai num genérico honesto quando o tier é
 * desconhecido — nunca inventa itens específicos.
 */
export function detalheDoKit(kit: KitPublico): KitDetalheView {
  const enumKit = kitEnumFromId(kit.id);
  return (
    DETALHE_DEMO[enumKit] ?? {
      descricao: 'Kit do evento — confira os itens inclusos na retirada.',
      itens: ['Itens do kit confirmados na retirada, nas janelas do evento.'],
      imagemUrl: null,
    }
  );
}
