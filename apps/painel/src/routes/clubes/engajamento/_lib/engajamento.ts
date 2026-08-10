// =============================================================================
// Engajamento da comunidade — derivações PURAS (REDESIGN-DS · lane TELA).
//
// A regra dura desta tela é a verdade do dado: cada número aqui sai de um campo
// que EXISTE hoje, e nenhuma função deste arquivo inventa denominador, projeta
// série nem preenche buraco com zero. As métricas que a análise pediria e não
// têm fonte estão nomeadas no handoff da lane, não simuladas na tela.
//
// De onde vem cada coisa (tudo agregado ∑ mantido por Cloud Function, ou campo
// do próprio doc — o cliente NUNCA soma o que o servidor deveria somar):
//
//   · `clubes/{id}.qtdMembrosAtivos` / `.qtdDesafiosAtivos` — recontagem
//     `count()` em `onMembroWrite`/`onDesafioWrite` + cron diário;
//   · `clubes/{c}/membros/{m}.status` — RN-102, derivado por Function;
//   · `clubes/{c}/membros/{m}.entrouVia` — como o atleta chegou;
//   · `clubes/{c}/desafios/{d}.qtdParticipantes` / `.progressoPct` /
//     `.progressoPorPilar` — `onRegistroWrite → recomputarAgregadosDesafio`.
//
// A SOMA CROSS-CLUB É LEGÍTIMA e não contradiz "cliente não agrega": o que o
// cliente não pode é DERIVAR a métrica (contar membros varrendo docs, calcular
// progresso a partir de registros). Somar contadores já fechados por Function é
// a mesma operação que o hub de clubes já faz nos KPIs dele.
// =============================================================================

import { PILARES, type Desafio, type Membro, type Pilar } from '@leela/core';

// ---------------------------------------------------------------------------
// Rótulos (vocabulário do produto, não string solta na tela)
// ---------------------------------------------------------------------------

export const ROTULO_PILAR: Record<Pilar, string> = {
  fisico: 'Físico',
  mental: 'Mental',
  espiritual: 'Espiritual',
};

/**
 * Ordem de leitura da saúde da comunidade: quem chegou, quem fica, quem sumiu.
 *
 * O rótulo de `inativo` NÃO diz "sem atividade": nenhuma Function em produção
 * escreve `membro.ultimaAtividadeEm` (só o seed), então `derivarStatus`
 * (`packages/core/clubs/membro.ts`) sempre cai no fallback `entrouEm` — o
 * status é, na prática, "entrou há 30 dias ou mais, sem nenhum registro de
 * atividade desde então", não "treinou pela última vez há 30 dias" (D-2, REV
 * 2026-08-09). O escritor de `ultimaAtividadeEm` é card de backend próprio,
 * fora desta lane.
 */
export const ROTULO_SITUACAO = {
  novo: 'Novos (7 dias)',
  ativo: 'Ativos',
  inativo: 'Sem registro (30 dias+)',
} as const;

export const ROTULO_ENTRADA = {
  codigo: 'Código do club',
  convite: 'Convite',
  link: 'Link',
} as const;

// ---------------------------------------------------------------------------
// Tipos de saída
// ---------------------------------------------------------------------------

/** Uma barra rotulada — a forma que toda contagem desta tela assume. */
export interface ContagemRotulada {
  id: string;
  rotulo: string;
  total: number;
}

export interface ResumoDaComunidade {
  clubes: number;
  membrosAtivos: number;
  desafiosAtivos: number;
  /** Σ de participações nos desafios ativos (uma pessoa conta em cada desafio). */
  participacoes: number;
}

export interface LinhaDePilar {
  pilar: Pilar;
  rotulo: string;
  /**
   * Média ponderada de pontos por participante no pilar — peso = nº de
   * participantes do desafio (`qtdParticipantes`), a MESMA base que a
   * Function usa para tirar o `atual` de cada desafio (`registro.ts` ·
   * `derivarProgressoPorPilar`). Nunca é soma cross-desafio sem peso — um
   * desafio de 500 pesa 250× mais que um de 2 (REDESIGN-DS · D-1, REV
   * 2026-08-09).
   */
  atual: number;
  /** Meta média ponderada pela mesma base (mínimo por participante) — 0 quando não há meta. */
  meta: number;
}

export interface ResumoDosPilares {
  linhas: LinhaDePilar[];
  /** Quantos desafios reportaram distribuição por pilar (0 = bloco sem base). */
  desafiosComPilar: number;
}

export interface DesafioEngajado {
  id: string;
  clubeId: string;
  nome: string;
  participantes: number;
  /** 0–100, agregado ∑ do próprio desafio. */
  progressoPct: number;
}

/** Um desafio com o club de origem — o fan-out perde o pai, então ele viaja junto. */
export interface DesafioComClube {
  clubeId: string;
  desafio: Desafio;
}

// ---------------------------------------------------------------------------
// Derivações
// ---------------------------------------------------------------------------

/** Desafio "em andamento" = status ativo. Rascunho e encerrado ficam de fora. @pure */
function estaAtivo(d: Desafio): boolean {
  return d.status === 'ativo';
}

/**
 * Os quatro números do topo. `clubes` e `membrosAtivos` saem dos contadores do
 * doc do club; participações somam o ∑ dos desafios ATIVOS — o número de
 * desafios ativos vem do mesmo lugar, para os dois nunca discordarem.
 * @pure
 */
export function resumirComunidade(
  clubes: ReadonlyArray<{ qtdMembrosAtivos: number }>,
  desafios: readonly DesafioComClube[]
): ResumoDaComunidade {
  const ativos = desafios.filter((d) => estaAtivo(d.desafio));
  return {
    clubes: clubes.length,
    // ?? 0: club sem o agregado ainda (janela entre criação e a Function
    // escrever) não pode virar "NaN" no KPI do tenant inteiro (D-7, REV 2026-08-09 · ADIÇÃO).
    membrosAtivos: clubes.reduce((s, c) => s + (c.qtdMembrosAtivos ?? 0), 0),
    desafiosAtivos: ativos.length,
    participacoes: ativos.reduce((s, d) => s + d.desafio.qtdParticipantes, 0),
  };
}

/** Arredonda a 1 casa decimal — mesmo critério que a Function usa para persistir o agregado (`registro.ts`). */
function arred1(x: number): number {
  return Math.round(x * 10) / 10;
}

/**
 * Equilíbrio dos três pilares — a assinatura do produto (RN-111: o Modelo C é o
 * único que opera os três e exige mínimo em cada um).
 *
 * `progressoPorPilar` é OPCIONAL no agregado: desafio que não opera pilar não
 * traz a chave, e é por isso que `desafiosComPilar` sai junto. Zero desafios
 * com pilar não é "comunidade equilibrada em zero" — é ausência de base, e a
 * tela precisa saber a diferença para não desenhar três barras vazias.
 *
 * `atual`/`meta` de cada desafio já são MÉDIAS por participante (fonte:
 * `derivarProgressoPorPilar`), então cruzar desafios exige MÉDIA PONDERADA
 * por `qtdParticipantes` — nunca soma cross-desafio sem peso (D-1, REV
 * 2026-08-09: um desafio de 500 pesava igual a um de 2).
 * @pure
 */
export function resumirPilares(desafios: readonly DesafioComClube[]): ResumoDosPilares {
  const acumulado: Record<Pilar, { atualPonderado: number; metaPonderada: number; peso: number }> = {
    fisico: { atualPonderado: 0, metaPonderada: 0, peso: 0 },
    mental: { atualPonderado: 0, metaPonderada: 0, peso: 0 },
    espiritual: { atualPonderado: 0, metaPonderada: 0, peso: 0 },
  };
  let desafiosComPilar = 0;

  for (const { desafio } of desafios) {
    const porPilar = desafio.progressoPorPilar;
    if (!porPilar) continue;
    const chaves = PILARES.filter((p) => porPilar[p] !== undefined);
    if (chaves.length === 0) continue;
    desafiosComPilar += 1;
    const peso = desafio.qtdParticipantes;
    if (peso <= 0) continue; // sem participante = sem peso; não distorce a média dos demais
    for (const pilar of chaves) {
      const p = porPilar[pilar];
      if (!p) continue;
      acumulado[pilar].atualPonderado += p.atual * peso;
      acumulado[pilar].metaPonderada += p.meta * peso;
      acumulado[pilar].peso += peso;
    }
  }

  return {
    desafiosComPilar,
    linhas: PILARES.map((pilar) => {
      const { atualPonderado, metaPonderada, peso } = acumulado[pilar];
      return {
        pilar,
        rotulo: ROTULO_PILAR[pilar],
        atual: peso > 0 ? arred1(atualPonderado / peso) : 0,
        meta: peso > 0 ? arred1(metaPonderada / peso) : 0,
      };
    }),
  };
}

/**
 * Situação dos membros (RN-102). A ordem é a da narrativa — quem chegou, quem
 * está, quem sumiu — e não a alfabética.
 * @pure
 */
export function resumirSituacao(membros: readonly Membro[]): ContagemRotulada[] {
  return (['novo', 'ativo', 'inativo'] as const).map((situacao) => ({
    id: situacao,
    rotulo: ROTULO_SITUACAO[situacao],
    total: membros.filter((m) => m.status === situacao).length,
  }));
}

/**
 * Por onde a comunidade entrou. Canal sem ninguém SAI da lista: barra zerada
 * ocupa espaço e não informa (`design-principles` — o foco é a informação).
 * @pure
 */
export function resumirEntrada(membros: readonly Membro[]): ContagemRotulada[] {
  return (['codigo', 'convite', 'link'] as const)
    .map((via) => ({
      id: via,
      rotulo: ROTULO_ENTRADA[via],
      total: membros.filter((m) => m.entrouVia === via).length,
    }))
    .filter((c) => c.total > 0);
}

/**
 * A ÚNICA ponte club→evento que existe hoje no dado: o desafio pode declarar um
 * `eventoVinculadoId` (RN-113 — o desafio vira preparação para a prova). Não é
 * conversão (ninguém sabe quem comprou), é INTENÇÃO: quanto da atividade da
 * comunidade já está apontada para um evento seu.
 *
 * Vale a pena dizer o que ela NÃO é, porque a confusão seria cara: um desafio
 * ligado a um evento não significa que os participantes se inscreveram nele.
 * A tela nomeia isso; a função só conta.
 * @pure
 */
export function resumirPonteComEventos(
  desafios: readonly DesafioComClube[]
): ContagemRotulada[] {
  const ativos = desafios.filter((d) => estaAtivo(d.desafio));
  const comEvento = ativos.filter((d) => !!d.desafio.eventoVinculadoId).length;
  if (ativos.length === 0) return [];
  return [
    { id: 'com-evento', rotulo: 'Ligados a um evento', total: comEvento },
    { id: 'sem-evento', rotulo: 'Sem evento vinculado', total: ativos.length - comEvento },
  ];
}

/** Quantos desafios o ranking mostra. */
export const RANKING_MAX_DESAFIOS = 5;

/**
 * Desafios que mais puxam gente, do maior para o menor. Só os ATIVOS: ranquear
 * um desafio encerrado ao lado de um em andamento compara coisas que não são
 * comparáveis (um teve o ciclo inteiro, o outro está no meio dele).
 * Empate desempata por nome, para a ordem não oscilar entre renders.
 * @pure
 */
export function ranquearDesafios(
  desafios: readonly DesafioComClube[],
  max: number = RANKING_MAX_DESAFIOS
): DesafioEngajado[] {
  return desafios
    .filter((d) => estaAtivo(d.desafio) && d.desafio.qtdParticipantes > 0)
    .map(({ clubeId, desafio }) => ({
      id: desafio.id,
      clubeId,
      nome: desafio.nome,
      participantes: desafio.qtdParticipantes,
      progressoPct: desafio.progressoPct,
    }))
    .sort((a, b) => b.participantes - a.participantes || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, max);
}
