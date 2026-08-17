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

import { PILARES, type Clube, type Desafio, type Membro, type Pilar } from '@leela/core';

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
 *
 * UXW-FIX · MEL-07: o rótulo era "Sem registro (30 dias+)", e "sem registro"
 * lê como "não se cadastrou" — a barra media gente parada, não gente sem
 * cadastro. "Parados há 30 dias ou mais" diz o que a barra conta sem prometer
 * a última atividade que a D-2 proíbe afirmar.
 */
export const ROTULO_SITUACAO = {
  novo: 'Novos (7 dias)',
  ativo: 'Ativos',
  inativo: 'Parados há 30 dias ou mais',
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
 * Qual pilar concentra a maior média por participante (REFACTOR item 12).
 *
 * É a ÚNICA leitura de conjunto que este dado sustenta. O estudo desenhava uma
 * marca de "ponto de equilíbrio (33%)" sobre as barras, e o próprio REFACTOR a
 * declarou invenção de design: não existe equilíbrio-alvo entre os três pilares
 * em regra nenhuma do produto, então uma marca ali transformava distribuição em
 * nota. A linha honesta diz onde a comunidade está pesando — e nada sobre onde
 * deveria pesar.
 *
 * Empate devolve `null` de propósito: eleger um líder no empate é escolha do
 * computador apresentada como fato. Tudo em zero também devolve `null` — sem
 * acúmulo não há concentração, e o bloco de pilares já tem estado próprio para
 * ausência de base.
 * @pure
 */
export function pilarComMaiorMedia(linhas: readonly LinhaDePilar[]): LinhaDePilar | null {
  const comAcumulo = linhas.filter((l) => l.atual > 0);
  if (comAcumulo.length === 0) return null;
  const maior = Math.max(...comAcumulo.map((l) => l.atual));
  const lideres = comAcumulo.filter((l) => l.atual === maior);
  return lideres.length === 1 ? lideres[0]! : null;
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
 * `eventoVinculadoId` (RN-113 — o desafio vira preparação para o evento). Não é
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

/**
 * Membros ativos somados numa modalidade dos clubs — o bloco 4 do estudo
 * (D-1008-R15), na versão que o dado sustenta.
 */
export interface ModalidadeDaComunidade {
  /** A própria modalidade (vocabulário fechado do club — já é rótulo humano). */
  id: string;
  rotulo: string;
  membros: number;
}

/**
 * Para onde a comunidade pende, por modalidade dos clubs.
 *
 * O estudo rotula este bloco "modalidades de interesse" DECLARADAS pelos
 * membros — e esse dado não existe: nenhum campo de atleta ou membro declara
 * interesse. O que existe é o par `clube.modalidade` (vocabulário fechado,
 * validado no core) + `clube.qtdMembrosAtivos` (∑ mantido por Function), e é
 * ISSO que a função soma — a tela diz o que mede, nunca "interesse declarado".
 *
 * Mesmas regras dos vizinhos: `?? 0` cobre o club na janela pré-Function
 * (D-7 — um club recém-criado não vira NaN); modalidade sem ninguém SAI da
 * lista (barra zerada ocupa espaço e não informa); uma pessoa ativa em dois
 * clubs conta em cada um — igual ao KPI de participações, e a ajuda do card
 * diz isso. Devolve a lista INTEIRA ordenada: o corte "Top 5" é recorte de
 * card (REFACTOR item 9), não de derivação. Empate desempata por nome, para a
 * ordem não oscilar entre renders.
 * @pure
 */
export function resumirModalidades(
  clubes: ReadonlyArray<Pick<Clube, 'modalidade' | 'qtdMembrosAtivos'>>
): ModalidadeDaComunidade[] {
  const porModalidade = new Map<string, number>();
  for (const clube of clubes) {
    const atual = porModalidade.get(clube.modalidade) ?? 0;
    porModalidade.set(clube.modalidade, atual + (clube.qtdMembrosAtivos ?? 0));
  }
  return [...porModalidade.entries()]
    .filter(([, membros]) => membros > 0)
    .map(([modalidade, membros]) => ({ id: modalidade, rotulo: modalidade, membros }))
    .sort((a, b) => b.membros - a.membros || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
}

// ---------------------------------------------------------------------------
// Insights da Leela — a camada de RESUMO COM CAMINHO (RN-573)
// ---------------------------------------------------------------------------

/**
 * Tom do insight. `atencao` é o que está pesando contra a comunidade agora;
 * `oportunidade` é o que está sobre a mesa e ninguém pegou. São os dois tons
 * do template do dono (l.1484), e não existe um terceiro: um insight que não
 * pede ação nem abre porta é uma frase decorativa.
 */
export type TomDoInsight = 'atencao' | 'oportunidade';

/**
 * Uma leitura automática dos números DESTE recorte.
 *
 * O `caminho` não é enfeite, é o que torna o bloco legal sob a RN-573. Um
 * insight é, por construção, um número que já está desenhado mais abaixo na
 * mesma tela — e a regra-mãe diz que aparição fora da casa do dado é "resumo
 * COM CAMINHO, nunca cópia". Então todo insight carrega a âncora da casa do
 * fato, e o papel distinto fica DECLARADO: o gráfico responde "como isto se
 * distribui", o insight responde "o que nisso pede ação agora".
 */
export interface InsightDaLeela {
  id: string;
  tom: TomDoInsight;
  tag: string;
  titulo: string;
  detalhe: string;
  /** `id` do bloco que é a casa do fato — o destino do caminho. */
  ancora: string;
  /** Rótulo do link que leva à casa. */
  caminho: string;
}

/**
 * Os insights que o dado de HOJE sustenta, derivação por derivação.
 *
 * As duas leituras abaixo saem de números que esta mesma tela já derivou, e
 * de nenhuma leitura nova: nada de fan-out, nada de query extra. Cada uma só
 * nasce quando tem o que dizer — insight de zero ("nenhum membro parado") é
 * ruído com cara de aviso.
 *
 * O DENOMINADOR VEM DA MESMA FONTE DO NUMERADOR, e isso é regra, não detalhe.
 * A tentação era dividir os parados pelo KPI "Membros ativos", que sai do
 * agregado `clube.qtdMembrosAtivos`; os parados saem da lista carregada. São
 * dois caminhos de cálculo, e a RN-573 nasceu justamente do par que diverge
 * (a amostra de controle achou o caso vivo na área do clube). Aqui o total é
 * a soma das próprias situações.
 * @pure
 */
export function derivarInsights(
  situacao: readonly ContagemRotulada[] | null,
  ponte: readonly ContagemRotulada[] | null
): InsightDaLeela[] {
  const insights: InsightDaLeela[] = [];

  const parados = situacao?.find((c) => c.id === 'inativo')?.total ?? 0;
  const totalMembros = (situacao ?? []).reduce((s, c) => s + c.total, 0);
  if (parados > 0 && totalMembros > 0) {
    insights.push({
      id: 'membros-parados',
      tom: 'atencao',
      tag: 'Atenção',
      titulo: `${formatInteiro(parados)} de ${formatInteiro(totalMembros)} membros estão parados`,
      // O rótulo honesto da D-2 viaja junto: o dado NÃO afirma a última
      // atividade da pessoa, afirma que nada foi registrado desde a entrada.
      detalhe:
        'Parado é quem entrou há 30 dias ou mais e não teve nenhum registro de atividade desde então. A distribuição inteira está na situação dos membros.',
      ancora: 'situacao-dos-membros',
      caminho: 'Ver situação dos membros',
    });
  }

  const semEvento = ponte?.find((c) => c.id === 'sem-evento')?.total ?? 0;
  const totalDesafios = (ponte ?? []).reduce((s, c) => s + c.total, 0);
  if (semEvento > 0 && totalDesafios > 0) {
    insights.push({
      id: 'desafios-sem-evento',
      tom: 'oportunidade',
      tag: 'Oportunidade',
      titulo: `${formatInteiro(semEvento)} de ${formatInteiro(totalDesafios)} desafios não apontam para um evento`,
      detalhe:
        'Vincular um desafio a um evento seu transforma a atividade da comunidade em preparação para ele. É intenção declarada no desafio, não inscrição confirmada.',
      ancora: 'ponte-com-eventos',
      caminho: 'Ver a ponte com eventos',
    });
  }

  return insights;
}

/** Inteiro em pt-BR. Local para o arquivo seguir @pure e sem import de tela. */
function formatInteiro(n: number): string {
  return n.toLocaleString('pt-BR');
}

/**
 * Tamanho do recorte "Top" das modalidades — decisão de TELA, como o dos
 * desafios abaixo. O estudo desenha cinco barras.
 */
export const RANKING_MAX_MODALIDADES = 5;

/**
 * Tamanho do recorte "Top" do ranking — é decisão de TELA (quantas barras cabem
 * antes da lista virar rolagem), não de dado. Fica exportado aqui porque o
 * vocabulário do bloco vive neste arquivo, mas quem corta é a View: desde o
 * REFACTOR item 9 o card tem recorte próprio ("Top 5" × "Todos"), e um corte
 * feito na derivação impediria o recorte de existir — a tela receberia cinco e
 * nunca saberia que há mais.
 */
export const RANKING_MAX_DESAFIOS = 5;

/**
 * Desafios que mais puxam gente, do maior para o menor. Só os ATIVOS: ranquear
 * um desafio encerrado ao lado de um em andamento compara coisas que não são
 * comparáveis (um teve o ciclo inteiro, o outro está no meio dele).
 * Empate desempata por nome, para a ordem não oscilar entre renders.
 *
 * Devolve a lista INTEIRA por padrão (REFACTOR item 9). O `max` continua na
 * assinatura para quem precisar de um teto duro.
 * @pure
 */
export function ranquearDesafios(
  desafios: readonly DesafioComClube[],
  max: number = Number.POSITIVE_INFINITY
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
