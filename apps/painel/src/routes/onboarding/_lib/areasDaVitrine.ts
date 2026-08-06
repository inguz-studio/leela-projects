// =============================================================================
// O que a vitrine nomeia em cada área (ONBOARD-VITRINE · RN-510).
//
// A conta em vitrine circula pelo painel inteiro, e o menu continua navegando —
// então o conteúdo tem de acompanhar o endereço, senão a pessoa clica em
// "Eventos" e continua lendo "Visão geral", que é pior do que não navegar.
//
// O que estes textos NÃO fazem: não mostram número, não mostram exemplo, não
// simulam um painel cheio. Uma vitrine com dado inventado ensina a desconfiar
// do painel de verdade no dia seguinte. Cada área diz o que ela FAZ, e o que
// abre a porta é o código Leela.
//
// Vocabulário travado pela D-0802-1: "experiência" e "participante". Corrida
// nunca é a categoria — ela é uma experiência entre outras.
//
// Puro de propósito: é a única parte da vitrine com decisão dentro, e decisão
// se prova sem render.
// =============================================================================

export interface AreaDaVitrine {
  /** Título da área, na mesma palavra que o menu usa. */
  titulo: string;
  /** Uma linha sobre o que a área serve. Sem número, sem exemplo. */
  descricao: string;
}

/** A tela que a vitrine mostra quando o endereço não é de área nenhuma. */
export const AREA_PADRAO: AreaDaVitrine = {
  titulo: 'Painel do organizador',
  descricao:
    'Este é o painel de quem organiza experiências na Leela. Com o código Leela, cada área abaixo abre com os seus dados.',
};

/** Prefixo de rota → a área que a vitrine nomeia. A ordem importa: primeiro que casa vence. */
const AREAS: readonly (readonly [string, AreaDaVitrine])[] = [
  [
    '/eventos',
    {
      titulo: 'Eventos',
      descricao:
        'Cada experiência que você publica vive aqui: inscrições, lotes, kits, equipe e credenciamento no dia.',
    },
  ],
  [
    '/clubes',
    {
      titulo: 'Clubs',
      descricao:
        'A comunidade que continua entre uma experiência e outra: membros, desafios, parcerias e comunicados.',
    },
  ],
  [
    '/crm',
    {
      titulo: 'CRM',
      descricao:
        'Quem já participou com você em um lugar só, com a comunicação para convidar de volta.',
    },
  ],
  [
    '/marcas',
    {
      titulo: 'Marcas',
      descricao:
        'Os patrocinadores que se repetem entre experiências, cadastrados uma vez e reaproveitados.',
    },
  ],
  [
    '/plataforma',
    {
      titulo: 'Plataforma',
      descricao: 'A administração da Leela. Esta área é do time da plataforma.',
    },
  ],
];

/**
 * Qual área a vitrine mostra para este endereço. A raiz é a Visão Geral; o
 * resto casa por prefixo; o desconhecido cai no padrão, nunca em branco.
 * @pure
 */
export function areaDaVitrine(pathname: string): AreaDaVitrine {
  if (pathname === '/') {
    return {
      titulo: 'Visão geral',
      descricao:
        'O resumo do dia: o que está vendendo, o que pede atenção e quanto você tem a receber.',
    };
  }
  for (const [prefixo, area] of AREAS) {
    if (pathname === prefixo || pathname.startsWith(`${prefixo}/`)) return area;
  }
  return AREA_PADRAO;
}
