// =============================================================================
// EngajamentoView — a análise da comunidade (REDESIGN-DS · lane TELA).
// Presentational puro: recebe dado já derivado e devolve tela.
//
// A NARRATIVA É A DO PROTÓTIPO: comunidade → ponte. Duas seções com cabeçalho
// e legenda, na ordem em que a pergunta do organizador amadurece: "quem está
// aqui?" e "isso vira participação?". Acima delas, sem faixa, a régua de KPIs
// do recorte e os Insights da Leela — que resumem o recorte inteiro, não uma
// seção (é a ordem do template do dono).
//
// ERAM TRÊS SEÇÕES ATÉ A LEVA 20. A terceira ("Eventos") saiu na onda R2 da
// carga cognitiva (ENG-CARGA-1), e a razão vale como critério para qualquer
// tela com filtro: os dois blocos dela eram os ÚNICOS que o seletor de club do
// topo não recortava, e os dois já estavam montados na Visão geral, vindos do
// mesmo componente e da mesma fonte. Bloco que o filtro da tela não alcança não
// pertence àquela tela. Hoje o seletor recorta tudo que esta tela mostra.
//
// TODO NÚMERO DESTA TELA TEM UMA CASA (RN-573). Onde um fato reaparece fora da
// casa dele — que é o caso de todo insight — a segunda aparição carrega o
// caminho de volta e declara o papel distinto no código. Cópia sem declaração
// não passa no gate.
//
// A VERDADE DE DADO É A REGRA DURA, e ela mudou o desenho. O estudo pede
// check-in por pilar, mapa por hora do dia, volume no tempo, ranking de ações e
// funil de conversão da base. Nada disso tem fonte hoje: não existe check-in de
// club (o `registrarCheckin` é o QR da largada do evento), os registros de ação
// vivem em `atletas/{uid}/registros` e as Rules não deixam o organizador ler,
// não há agregado por janela nem por bucket temporal, e o funil precisaria de
// duas coisas que também não existem — contagem de visitantes (RN-489, medida e
// confirmada ausente) e vínculo entre membro de club e comprador de evento.
//
// Nenhuma dessas caixas fica vazia e muda: cada métrica sem base tem um card
// COM NOME PRÓPRIO que diz a causa em uma frase e escreve "em breve" (REDESIGN-V2,
// itens 7, 11 e 13). É a diferença entre uma tela que parece quebrada e uma tela
// que explica o que falta — e o que falta virou lista de vetáveis no handoff, não
// número inventado. A caixa genérica anterior escondia quantas análises estão
// previstas e qual fonte destrava cada uma.
//
// Duas regras estruturais entraram junto (REDESIGN-V2): o recorte de um card
// mora DENTRO dele (item 9) e a reanimação é por gráfico, nunca por tela
// (item 10). As duas existem pelo mesmo motivo — um clique deve mexer no que
// foi clicado, e em mais nada.
// =============================================================================

import { useState, type ReactNode } from 'react';
import {
  BarChart,
  Button,
  Chip,
  Combobox,
  EmptyState,
  KpiCard,
  PageHeader,
  Skeleton,
  cn,
  type BarChartDatum,
} from '@leela/design-system';
import { Activity, CalendarClock, GitBranch, ListOrdered, Users } from 'lucide-react';
import { SecaoHead } from '../../../components/SecaoHead';
import { Cascata } from '../../../components/CartaoV3';
import { InsightsDaLeela } from './_components/InsightsDaLeela';
import { formatDecimal1, formatInt } from '../_lib/format';
import {
  RANKING_MAX_DESAFIOS,
  RANKING_MAX_MODALIDADES,
  derivarInsights,
  pilarComMaiorMedia,
  type ContagemRotulada,
  type DesafioEngajado,
  type ModalidadeDaComunidade,
  type ResumoDaComunidade,
  type ResumoDosPilares,
} from './_lib/engajamento';
import { classeDeReanimacao, useReanimacao } from './_lib/reanimacao';
import { TODOS_OS_CLUBS } from './_data/engajamento';

export interface OpcaoDeClube {
  id: string;
  nome: string;
}

export interface EngajamentoViewProps {
  clubes: OpcaoDeClube[];
  clubeSelecionado: string;
  onSelecionarClube: (id: string) => void;
  resumo: ResumoDaComunidade | null;
  pilares: ResumoDosPilares | null;
  situacao: ContagemRotulada[] | null;
  entrada: ContagemRotulada[] | null;
  desafios: DesafioEngajado[] | null;
  /** A única ponte club→evento com dado: desafios com/sem evento vinculado. */
  ponte: ContagemRotulada[] | null;
  /**
   * Bloco 4 do estudo, na versão que o dado sustenta: membros ativos por
   * modalidade DOS CLUBS (o "interesse declarado" do estudo não existe como
   * campo — a derivação e a ajuda do card dizem o que se mede).
   */
  modalidades: ModalidadeDaComunidade[] | null;
  loading: boolean;
  error: Error | null;
  /**
   * Recarrega a leitura da comunidade (UXW-FIX · MEL-01).
   *
   * O bloco de erro desta tela era o único da área sem saída: dizia que falhou
   * e deixava a pessoa com a tecla de recarregar do navegador. O irmão do hub e
   * o de assessorias já ofereciam "Tentar novamente" — este passa a oferecer.
   */
  onRetry?: (() => void) | undefined;
  /** Sem nenhum club no tenant — a tela inteira degrada para o convite. */
  semClubes: boolean;
  onCriarClube: () => void;
}

// ---------------------------------------------------------------------------
// Blocos de apoio
// ---------------------------------------------------------------------------

function Painel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        // Cartão vidro do protótipo (HIFI-REC): blur + elevação + hover-lift
        // de 2px (§5 — 250ms ≈ duration-normal; motion-reduce desliga).
        'rounded-[var(--card-radius)] bg-[var(--surface-raised)]',
        '[backdrop-filter:var(--card-blur)] shadow-elev-2',
        'p-[var(--v3-card-p-lg)]',
        'hover:translate-y-[calc(-1*var(--spacing-0-5))] hover:shadow-elev-3',
        'transition-[transform,box-shadow] duration-[var(--motion-duration-normal)] ease-[var(--motion-easing-default)]',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Faixa de seção do protótipo do estudo: título display 1.0625rem + legenda
 * inline + hairline que preenche o resto da linha (era um bloco com borda
 * superior — a faixa é mais leve e é o desenho do dono).
 */
function SecaoTitulo({
  titulo,
  legenda,
}: {
  titulo: string;
  legenda: string;
}): JSX.Element {
  return (
    <div className="flex items-baseline gap-[var(--spacing-3-5)] mt-[var(--spacing-3-5)] -mb-[var(--spacing-1)]">
      <h2
        className={cn(
          'font-display whitespace-nowrap',
          'text-[length:var(--v3-band-size)] font-[var(--peso-display)]',
          'tracking-[var(--section-title-spacing)] text-[var(--text-primary)]',
        )}
      >
        {titulo}
      </h2>
      <p className="min-w-0 text-[length:var(--font-size-sm-plus)] text-[var(--text-tertiary)] text-pretty">
        {legenda}
      </p>
      <span aria-hidden className="flex-1 h-px bg-[var(--border-subtle)] self-center" />
    </div>
  );
}

/** Altura do plot: uma faixa por barra. @pure */
export function alturaDeBarras(n: number): number {
  return Math.max(1, n) * 34 + 24;
}

function barrasDeContagem(itens: readonly ContagemRotulada[]): BarChartDatum[] {
  return itens.map((c) => ({ label: c.rotulo, value: c.total }));
}

/**
 * A única frase de conjunto que os pilares sustentam (REFACTOR item 12).
 *
 * O que saiu daqui foi a marca de "ponto de equilíbrio (33%)" e a linha "X
 * pontos acima/abaixo do equilíbrio" — o REFACTOR as declarou invenção de
 * design, e a busca no repositório confirma que elas nunca chegaram a este
 * código (viviam só no protótipo). O que entra no lugar não é um alvo: é onde
 * a comunidade está pesando. Em empate, nada é dito.
 */
function LinhaDoPilarLider({ pilares }: { pilares: ResumoDosPilares }): JSX.Element | null {
  const lider = pilarComMaiorMedia(pilares.linhas);
  if (!lider) return null;
  return (
    <p className="mt-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
      {/* UXW-MELHORIAS · MEL-14: a frase antiga só nomeava o pilar que a barra
          mais alta já mostrava — texto restatando desenho. O número (que já
          era calculado, `lider.atual`) é o que a barra não diz em palavras. */}
      {lider.rotulo} lidera, com {formatDecimal1(lider.atual)} pontos por participante.
    </p>
  );
}

/**
 * Card de métrica que a tela NOMEIA mas ainda não pode desenhar (REFACTOR
 * itens 7, 11 e 13; diretriz literal do dono: "se tiver algo que não
 * implementamos ainda, deixe escrito 'em breve'").
 *
 * O que diferencia isto de um card quebrado é a ordem da informação: primeiro
 * o NOME da métrica (o organizador precisa saber que ela está prevista),
 * depois a CAUSA em uma frase (por que não há número), e por último o "em
 * breve" — promessa, não desculpa. Nenhuma forma de gráfico aparece aqui: um
 * eixo vazio ou um heatmap todo na cor mais fraca sugerem que a medição
 * aconteceu e deu quase zero, que é exatamente a leitura errada.
 */
function CardEmBreve({
  titulo,
  causa,
  icon,
}: {
  titulo: string;
  causa: string;
  icon: ReactNode;
}): JSX.Element {
  return (
    <section aria-label={titulo} className="flex flex-col">
      <SecaoHead titulo={titulo} />
      <Painel className="flex-1">
        <EmptyState icon={icon} title="Em breve" description={causa} />
      </Painel>
    </section>
  );
}

/**
 * Envelope de reanimação de UM gráfico (REFACTOR item 10).
 *
 * O contador vive AQUI dentro, uma instância por gráfico — é o que garante o
 * escopo. `chave` é a assinatura dos filtros que mexem NESTE card: mudou a
 * chave, este gráfico se revela de novo; não mudou, ele fica parado enquanto o
 * vizinho anima.
 */
function GraficoAnimado({ chave, children }: { chave: string; children: ReactNode }): JSX.Element {
  const fase = useReanimacao(chave);
  return <div className={classeDeReanimacao(fase)}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Ranking de desafios — o card com recorte PRÓPRIO (REFACTOR item 9)
// ---------------------------------------------------------------------------

/** Recorte do ranking. Vocabulário do card, não da tela. */
type RecorteDoRanking = 'top' | 'todos';

/**
 * Desafios que mais movem a comunidade, com o recorte MORANDO DENTRO DO CARD.
 *
 * O item 9 do REFACTOR tem uma causa concreta: quando dois cards dividem um
 * filtro, clicar num reflui o outro, e o organizador não pediu isso. A defesa
 * estrutural é a que está aqui — o `useState` do recorte é local, então não
 * existe lugar de onde compartilhá-lo. O filtro de club do `PageHeader` segue
 * global de propósito: ele decide QUAIS clubs são LIDOS (escopo de query, uma
 * leitura por club), não como um card corta o que já chegou.
 *
 * O recorte também conserta um silêncio: até aqui a derivação cortava no quinto
 * e a tela não dizia que havia um sexto. Agora o corte é visível e reversível —
 * e o controle só aparece quando há o que revelar.
 */
function RankingDeDesafios({
  desafios,
  loading,
  clubeSelecionado,
}: {
  desafios: DesafioEngajado[] | null;
  loading: boolean;
  clubeSelecionado: string;
}): JSX.Element {
  const [recorte, setRecorte] = useState<RecorteDoRanking>('top');
  const lista = desafios ?? [];
  const excedeTop = lista.length > RANKING_MAX_DESAFIOS;
  const visiveis = excedeTop && recorte === 'top' ? lista.slice(0, RANKING_MAX_DESAFIOS) : lista;

  return (
    <>
      <SecaoHead
        titulo="Desafios que mais movem a comunidade"
        // A explicação ACOMPANHA O RECORTE (REFACTOR item 12): dizer "do maior
        // para o menor" enquanto a tela mostra cinco de nove é meia verdade.
        ajuda={
          excedeTop && recorte === 'top'
            ? `Os ${RANKING_MAX_DESAFIOS} desafios em andamento com mais participantes, de ${lista.length} no total. Troque para "Todos" para ver a lista inteira.`
            : 'Participantes por desafio em andamento, do maior para o menor. Só entram os ativos: um desafio encerrado já teve o ciclo inteiro, e o que está em andamento está no meio dele.'
        }
        controle={
          excedeTop ? (
            <div
              role="group"
              aria-label="Quantos desafios mostrar"
              className="flex gap-[var(--spacing-2)]"
            >
              <Chip active={recorte === 'top'} onClick={() => setRecorte('top')}>
                Top {RANKING_MAX_DESAFIOS}
              </Chip>
              <Chip active={recorte === 'todos'} onClick={() => setRecorte('todos')}>
                Todos ({lista.length})
              </Chip>
            </div>
          ) : undefined
        }
      />
      {loading || desafios === null ? (
        <Skeleton variant="rect" className="h-40" />
      ) : lista.length === 0 ? (
        <Painel>
          <EmptyState
            title="Nenhum desafio em andamento"
            description="Crie um desafio para a comunidade ter o que fazer entre um evento e outro."
          />
        </Painel>
      ) : (
        <Painel>
          {/* Dois filtros mexem NESTE card: o recorte dele e o club lido. */}
          <GraficoAnimado chave={`${clubeSelecionado}|${recorte}`}>
            <BarChart
              data={visiveis.map((d) => ({ label: d.nome, value: d.participantes }))}
              aria-label="Participantes por desafio em andamento"
              height={alturaDeBarras(visiveis.length)}
              formatValue={formatInt}
            />
          </GraficoAnimado>
        </Painel>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Modalidades da comunidade — bloco 4 do estudo, na versão honesta
// ---------------------------------------------------------------------------

/** Recorte do bloco de modalidades. Vocabulário do card, não da tela. */
type RecorteDeModalidades = 'top' | 'todas';

/**
 * Para onde a comunidade pende, por modalidade dos clubs (estudo · bloco 4).
 *
 * O estudo desenha "Top 5 modalidades de interesse" com interesse DECLARADO
 * pelos membros — campo que não existe. A versão real soma membros ativos por
 * modalidade do club (derivação em `_lib`), e o "?" diz exatamente isso: o
 * título não promete um dado que o sistema não guarda.
 *
 * Mesmo desenho estrutural do ranking de desafios: recorte PRÓPRIO do card
 * (REFACTOR item 9), controle só quando há o que revelar, reanimação escopada
 * pelos filtros que mexem NESTE card (item 10).
 */
function ModalidadesDaComunidade({
  modalidades,
  loading,
  clubeSelecionado,
}: {
  modalidades: ModalidadeDaComunidade[] | null;
  loading: boolean;
  clubeSelecionado: string;
}): JSX.Element {
  const [recorte, setRecorte] = useState<RecorteDeModalidades>('top');
  const lista = modalidades ?? [];
  const excedeTop = lista.length > RANKING_MAX_MODALIDADES;
  const visiveis =
    excedeTop && recorte === 'top' ? lista.slice(0, RANKING_MAX_MODALIDADES) : lista;

  return (
    <>
      <SecaoHead
        titulo="Modalidades da comunidade"
        ajuda={
          excedeTop && recorte === 'top'
            ? `As ${RANKING_MAX_MODALIDADES} modalidades com mais membros ativos, de ${lista.length} com gente. Troque para "Todas" para ver a lista inteira.`
            : 'Membros ativos somados por modalidade dos seus clubs. A modalidade é a do club, não um interesse que o membro declarou: esse campo não existe. Uma pessoa ativa em dois clubs conta nos dois. Modalidade sem ninguém sai da lista.'
        }
        controle={
          excedeTop ? (
            <div
              role="group"
              aria-label="Quantas modalidades mostrar"
              className="flex gap-[var(--spacing-2)]"
            >
              <Chip active={recorte === 'top'} onClick={() => setRecorte('top')}>
                Top {RANKING_MAX_MODALIDADES}
              </Chip>
              <Chip active={recorte === 'todas'} onClick={() => setRecorte('todas')}>
                Todas ({lista.length})
              </Chip>
            </div>
          ) : undefined
        }
      />
      {loading || modalidades === null ? (
        <Skeleton variant="rect" className="h-40" />
      ) : lista.length === 0 ? (
        <Painel>
          <EmptyState
            title="Sem membros ativos ainda"
            description="Quando os clubs tiverem membros ativos, a distribuição por modalidade aparece aqui."
          />
        </Painel>
      ) : (
        <Painel>
          <GraficoAnimado chave={`${clubeSelecionado}|${recorte}`}>
            <BarChart
              data={visiveis.map((m) => ({ label: m.rotulo, value: m.membros }))}
              aria-label="Membros ativos por modalidade dos clubs"
              height={alturaDeBarras(visiveis.length)}
              formatValue={formatInt}
            />
          </GraficoAnimado>
        </Painel>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

export function EngajamentoView(props: EngajamentoViewProps): JSX.Element {
  const {
    clubes,
    clubeSelecionado,
    onSelecionarClube,
    resumo,
    pilares,
    situacao,
    entrada,
    desafios,
    ponte,
    modalidades,
    loading,
    error,
    onRetry,
    semClubes,
    onCriarClube,
  } = props;

  const opcoes = [
    { value: TODOS_OS_CLUBS, label: 'Todos os clubs' },
    ...clubes.map((c) => ({ value: c.id, label: c.nome })),
  ];

  const semPilares = pilares !== null && pilares.desafiosComPilar === 0;

  return (
    <>
      {/* D-1008-R8: o subtítulo repetia as legendas das duas faixas abaixo
          ("A comunidade em si…" / "A ponte…") — cortado; as faixas orientam. */}
      <PageHeader
        title="Engajamento"
        actions={
          semClubes ? undefined : (
            <Combobox
              aria-label="Club analisado"
              options={opcoes}
              value={clubeSelecionado}
              onValueChange={(v) => onSelecionarClube(Array.isArray(v) ? (v[0] ?? TODOS_OS_CLUBS) : v)}
            />
          )
        }
      />

      <div className="flex flex-col gap-[var(--spacing-6)] p-[var(--spacing-6)]">
        {semClubes ? (
          <EmptyState
            icon={<Users aria-hidden />}
            title="Nenhum club para analisar"
            // UXW-FIX · MEL-10: a abertura era enchimento ("X nasce de Y") e
            // ainda prometia contagem de presença que esta mesma tela declara
            // ausente três vezes. Sobra o que a tela realmente passa a mostrar.
            description="Crie um club e esta tela passa a mostrar quem está na sua comunidade, o que move o grupo e quanto disso chega aos seus eventos."
            action={
              // Botão do DS, não markup cru — mesmo trabalho que ComunidadeResumo.tsx
              // já faz para "Criar um club" (D-10, REV 2026-08-09 · ADIÇÃO).
              <Button variant="secondary" size="sm" onClick={onCriarClube}>
                Criar um club
              </Button>
            }
          />
        ) : error ? (
          // UXW-FIX · MEL-01: a segunda frase era justificativa de projeto
          // dirigida a quem revisa ("os números só aparecem completos"), e o
          // bloco não oferecia saída nenhuma. Agora ele diz o que houve e dá o
          // botão — mesmo par do hub de clubs e de assessorias parceiras.
          <div
            role="alert"
            className="flex flex-col items-start gap-[var(--spacing-3)] rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            <p>Não foi possível carregar o engajamento da sua comunidade. Tente novamente.</p>
            {onRetry ? (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Tentar novamente
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            {/* ── Os números do recorte, e depois a leitura deles ─────────
                A ORDEM É A DO TEMPLATE DO DONO: a régua de KPIs e o bloco de
                insights vêm ANTES da primeira faixa de seção (mockup l.401 e
                l.439, faixa "Clubs" só na l.460). Eles resumem o recorte
                inteiro, não a banda "a comunidade em si" — estar dentro dela
                era o que fazia quatro números do tenant parecerem números de
                uma seção. */}
            {loading || resumo === null ? (
              <div
                role="status"
                aria-label="Carregando números da comunidade"
                className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2 lg:grid-cols-3"
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variant="rect" className="h-24" />
                ))}
              </div>
            ) : (
              <Cascata i={0}>
                <section
                  aria-label="Números da comunidade"
                  className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2 lg:grid-cols-3"
                >
                  {/* MANEJAMENTO DOS KPI CARDS (régua da casa-única, RN-573).
                      O KPI "Clubs" MORREU como card próprio, por dois motivos
                      que se somam:

                      1. A casa dele é outra. O hub de clubs já responde
                         "quantos clubs eu tenho", duas vezes (`HubClubes.tsx`
                         :56 "Clubs ativos" e :68 "Meus clubs"). Aqui era a
                         terceira.
                      2. Sob o seletor ele não mede nada. Com um club escolhido
                         o card lia "1" para sempre — um eco do controle que a
                         pessoa acabou de mexer, não uma medição.

                      Ele não sumiu: virou RESUMO COM CAMINHO, na legenda de
                      "Membros ativos", que é onde a contagem de clubs de fato
                      qualifica o número (ela diz entre quantos o total foi
                      somado). É o mesmo desenho que o hub já usa no KPI
                      "Pessoas alcançadas" (`HubClubes.tsx:66`). Com um único
                      club no recorte a legenda também sai: "somados entre 1
                      club" é ruído.

                      A HIERARQUIA segue o Movimento 7 da spec, que define a
                      pergunta desta tela como "quem é a comunidade e quanto
                      dela aponta para evento": primeiro quem é (membros),
                      depois o quanto ela se mexe (participações), por último o
                      que a move (desafios). */}
                  <KpiCard
                    label="Membros ativos"
                    value={formatInt(resumo.membrosAtivos)}
                    {...(resumo.clubes > 1
                      ? { hint: `somados entre ${formatInt(resumo.clubes)} clubs` }
                      : {})}
                  />
                  <KpiCard
                    label="Participações"
                    value={formatInt(resumo.participacoes)}
                    hint="nos desafios em andamento"
                  />
                  {/* PAPEL DISTINTO DECLARADO (RN-573): este número reaparece
                      na banda da ponte, onde é o TOTAL da própria decomposição
                      (ligados a um evento + sem evento vinculado). Total ao
                      lado da decomposição é papel distinto pela regra-mãe, e a
                      declaração exigida pela regra é esta linha. */}
                  <KpiCard label="Desafios ativos" value={formatInt(resumo.desafiosAtivos)} />
                </section>
              </Cascata>
            )}

            {/* O bloco do template do dono, na posição do template: largura
                total, logo abaixo da régua de KPIs e acima da primeira faixa. */}
            <Cascata i={1}>
              <InsightsDaLeela
                insights={loading ? null : derivarInsights(situacao, ponte)}
                loading={loading}
              />
            </Cascata>

            {/* ── Seção 1 · a comunidade ─────────────────────────────────── */}
            <SecaoTitulo
              titulo="Clubs"
              legenda="A comunidade em si: quem está, como chegou e o que move o grupo."
            />

            <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-2">
              <Cascata i={2} className="flex">
              <section aria-label="Equilíbrio dos pilares" className="flex flex-col flex-1">
                <SecaoHead
                  titulo="Equilíbrio dos pilares"
                  // UXW-FIX · MEL-05: a frase antiga encaixava três
                  // qualificações numa só ("por participante", "sobre o mínimo
                  // exigido", "ponderada pelo tamanho") e não sobrava leitura
                  // para quem não desenhou o cálculo. Duas frases, uma ideia
                  // cada — o que se mede, e o que pesa mais na média.
                  ajuda="Quanto a comunidade acumulou em cada pilar, em média por participante, comparado ao mínimo do desafio. Desafios com mais gente pesam mais na média. Não existe distribuição-alvo entre os três: o bloco mostra onde a comunidade está pesando, não onde ela deveria pesar."
                />
                {loading || pilares === null ? (
                  <Skeleton variant="rect" className="h-40" />
                ) : semPilares ? (
                  <Painel>
                    <EmptyState
                      icon={<Activity aria-hidden />}
                      title="Sem desafio de equilíbrio"
                      description="A distribuição por pilar aparece quando existe desafio operando os três (Modelo C, com mínimo por pilar). Os desafios de meta única não reportam pilar."
                    />
                  </Painel>
                ) : (
                  <Painel>
                    <GraficoAnimado chave={clubeSelecionado}>
                      <BarChart
                        data={pilares.linhas.map((l) => ({
                          label: l.rotulo,
                          value: l.atual,
                          ...(l.meta > 0 ? { total: l.meta } : {}),
                        }))}
                        aria-label="Média de pontos por participante por pilar, ponderada por desafio, sobre o mínimo exigido"
                        height={alturaDeBarras(pilares.linhas.length)}
                        formatValue={formatDecimal1}
                      />
                    </GraficoAnimado>
                    <LinhaDoPilarLider pilares={pilares} />
                  </Painel>
                )}
              </section>

              </Cascata>

              <Cascata i={3} className="flex">
              {/* `id`: casa do fato "membros parados" — destino do caminho do
                  insight de mesmo nome (RN-573, resumo COM caminho). */}
              <section
                id="situacao-dos-membros"
                aria-label="Situação dos membros"
                className="flex flex-col flex-1 scroll-mt-[var(--spacing-6)]"
              >
                <SecaoHead
                  titulo="Situação dos membros"
                  ajuda="Quem entrou nos últimos 7 dias, quem segue ativo e quem está há 30 dias ou mais sem nenhum registro de atividade."
                />
                {loading || situacao === null ? (
                  <Skeleton variant="rect" className="h-40" />
                ) : (
                  <Painel>
                    <GraficoAnimado chave={clubeSelecionado}>
                      <BarChart
                        data={barrasDeContagem(situacao)}
                        aria-label="Membros por situação"
                        height={alturaDeBarras(situacao.length)}
                        formatValue={formatInt}
                      />
                    </GraficoAnimado>
                  </Painel>
                )}
              </section>
              </Cascata>
            </div>

            <Cascata i={4}>
            <section aria-label="Como a comunidade entra" className="flex flex-col">
              <SecaoHead
                titulo="Como a comunidade entra"
                ajuda="A porta por onde cada membro chegou ao club. Canais sem ninguém não aparecem."
              />
              {loading || entrada === null ? (
                <Skeleton variant="rect" className="h-32" />
              ) : entrada.length === 0 ? (
                <Painel>
                  <EmptyState
                    title="Ninguém entrou ainda"
                    description="Assim que a primeira pessoa entrar pelo código, por um convite ou pelo link do club, a porta dela aparece aqui."
                  />
                </Painel>
              ) : (
                <Painel>
                  <GraficoAnimado chave={clubeSelecionado}>
                    <BarChart
                      data={barrasDeContagem(entrada)}
                      aria-label="Membros por porta de entrada"
                      height={alturaDeBarras(entrada.length)}
                      formatValue={formatInt}
                    />
                  </GraficoAnimado>
                </Painel>
              )}
            </section>
            </Cascata>

            <Cascata i={5}>
            <section aria-label="Desafios que mais movem a comunidade" className="flex flex-col">
              <RankingDeDesafios
                desafios={desafios}
                loading={loading}
                clubeSelecionado={clubeSelecionado}
              />
            </section>
            </Cascata>

            {/* Frequência e presença — as métricas ficam NOMEADAS uma a uma,
                no ESQUELETO do estudo (D-1008-R15: bloco 1 full-width, mapa e
                volume lado a lado — REFACTOR itens 7, 11 e 13). Uma caixa só,
                genérica, escondia quantas análises estão previstas e qual
                delas destrava com qual fonte. Todas dependem do mesmo registro
                que não existe. */}
            <Cascata i={6}>
            <CardEmBreve
              titulo="Check-ins realizados"
              icon={<ListOrdered aria-hidden />}
              // UXW-MELHORIAS · MEL-03: a causa tinha 3 frases — a primeira
              // descrevia o que o bloco VAI mostrar quando existir (conteúdo
              // de roadmap, não de tela). Corta para a causa em si, no padrão
              // dos irmãos.
              causa="Cada check-in fica no registro pessoal de quem fez a atividade, e o organizador não tem acesso a esse registro. O que o desafio guarda é a média de pontos por pilar, nunca a contagem de ações."
            />
            </Cascata>

            <Cascata i={7}>
            <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-2">
              <CardEmBreve
                titulo="Mapa de check-ins"
                icon={<CalendarClock aria-hidden />}
                causa="O club não registra presença: o único check-in que existe é o do QR na largada de um evento, e os registros de atividade de cada participante não ficam disponíveis para o organizador. Sem essa fonte, não há hora nem dia para pintar."
              />
              <CardEmBreve
                titulo="Volume de check-ins"
                icon={<Activity aria-hidden />}
                causa="Mesma origem do mapa. O progresso dos desafios existe, mas é um acumulado por participante: ele diz o quanto a comunidade andou, nunca em que faixa de hora ou em que semana ela apareceu."
              />
            </div>
            </Cascata>

            {/* Bloco 4 do estudo — a versão que o dado sustenta. */}
            <Cascata i={8}>
            <section aria-label="Modalidades da comunidade" className="flex flex-col">
              <ModalidadesDaComunidade
                modalidades={modalidades}
                loading={loading}
                clubeSelecionado={clubeSelecionado}
              />
            </section>
            </Cascata>

            {/* ── Seção 2 · a ponte ──────────────────────────────────────── */}
            <SecaoTitulo
              titulo="Do club para o evento"
              legenda="A ponte: quanto da comunidade vira participação em evento."
            />

            <Cascata i={9}>
            {/* `id`: casa do fato "desafios sem evento vinculado" — destino do
                caminho do insight de oportunidade. */}
            <section
              id="ponte-com-eventos"
              aria-label="Desafios ligados a um evento"
              className="flex flex-col scroll-mt-[var(--spacing-6)]"
            >
              <SecaoHead
                titulo="Desafios ligados a um evento"
                ajuda="Quanto da atividade em andamento já está apontada para um evento seu. É intenção declarada no desafio, não inscrição confirmada: um desafio ligado a um evento não significa que os participantes se inscreveram nele."
              />
              {loading || ponte === null ? (
                <Skeleton variant="rect" className="h-32" />
              ) : ponte.length === 0 ? (
                <Painel>
                  <EmptyState
                    title="Nenhum desafio em andamento"
                    description="Vincular um desafio a um evento transforma a atividade da comunidade em preparação para o seu evento."
                  />
                </Painel>
              ) : (
                <Painel>
                  <GraficoAnimado chave={clubeSelecionado}>
                    <BarChart
                      data={barrasDeContagem(ponte)}
                      aria-label="Desafios em andamento com e sem evento vinculado"
                      height={alturaDeBarras(ponte.length)}
                      formatValue={formatInt}
                    />
                  </GraficoAnimado>
                </Painel>
              )}
            </section>
            </Cascata>

            {/* UXW-FIX · MEL-02 + BLQ-17: este era o único em-breve da tela
                fora do padrão da casa — título em frase inteira ("ainda não é
                mensurável", que lê como defeito permanente), sem "em breve" e
                com 52 palavras de causa, três delas descrevendo o modelo de
                dados. Vira o MESMO CardEmBreve dos cinco irmãos: nome da
                métrica, causa em uma frase, "em breve" pelo componente. */}
            <Cascata i={10}>
            <CardEmBreve
              titulo="Conversão da base"
              icon={<GitBranch aria-hidden />}
              causa="Nem a contagem de quem visita a página de um evento nem a ligação entre membro de club e quem compra inscrição existem hoje, e sem as duas qualquer porcentagem aqui seria inventada."
            />
            </Cascata>

            {/* A BANDA "EVENTOS" SAIU AQUI (R2 · ENG-CARGA-1).
                Ela tinha dois blocos, `OcupacaoEventos` e o "Formas de
                pagamento", e os dois já estavam montados na Visão geral
                (`OverviewContent.tsx:191` e `:182`) — mesmo componente, mesma
                fonte, mesmo recorte. Não era um bloco desta tela: era uma
                segunda montagem do bloco de outra. Por isso a remoção é pura e
                nada migrou; a Visão geral não ganhou nem perdeu uma linha.

                O critério, que vale para qualquer tela com filtro: bloco que o
                filtro da tela não alcança não pertence àquela tela. Aquela
                banda era a única coisa aqui que o seletor de club não recortava
                — trocar de club não mudava uma linha dela, e era essa a
                incongruência que o dono sentiu. Com ela fora, TUDO nesta tela
                obedece ao seletor. */}
          </>
        )}
      </div>
    </>
  );
}

EngajamentoView.displayName = 'EngajamentoView';
