// =============================================================================
// EngajamentoView — a análise da comunidade (REDESIGN-DS · lane TELA).
// Presentational puro: recebe dado já derivado e devolve tela.
//
// A NARRATIVA É A DO PROTÓTIPO, e ela é boa: comunidade → ponte → resultado.
// Três seções com cabeçalho e legenda, na ordem em que a pergunta do
// organizador amadurece: "quem está aqui?", "isso vira participação?", "e o que
// aconteceu na prova?".
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
  EmptyState,
  KpiCard,
  PageHeader,
  Select,
  Skeleton,
  cn,
  type BarChartDatum,
} from '@leela/design-system';
import { Activity, CalendarClock, CreditCard, GitBranch, ListOrdered, Users } from 'lucide-react';
import { SecaoHead } from '../../../components/SecaoHead';
import { Cascata } from '../../../components/CartaoV3';
// Blocos da banda Eventos (estudo · D-1008-R15) — componentes da VG v3
// RATIFICADA (D-1008-R3), CONSUMIDOS daqui, nunca re-implementados: a
// "Ocupação" desta tela é a versão analytics (E02) do MESMO bloco, e o card
// "em breve" estilizado v3 é o mesmo padrão de honestidade da VG.
import { OcupacaoEventos } from '../../overview/_components/OcupacaoEventos';
import { EmBreveV3 } from '../../overview/_components/EmBreveV3';
import type { OcupacaoDosEventos } from '../../overview/_lib/ocupacao';
import { formatDecimal1, formatInt } from '../_lib/format';
import {
  RANKING_MAX_DESAFIOS,
  RANKING_MAX_MODALIDADES,
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
   * Banda Eventos (estudo · D-1008-R15) — ocupação REAL dos últimos eventos,
   * derivada pelo canônico da VG (`derivarOcupacao`). Estado PRÓPRIO: eventos
   * são do organizador, não de um club, então nem o filtro de club nem o erro
   * da leitura de clubs alcançam este bloco.
   */
  ocupacao: OcupacaoDosEventos | null;
  eventosLoading: boolean;
  eventosError: boolean;
  onRetryEventos?: (() => void) | undefined;
  /**
   * Bloco 4 do estudo, na versão que o dado sustenta: membros ativos por
   * modalidade DOS CLUBS (o "interesse declarado" do estudo não existe como
   * campo — a derivação e a ajuda do card dizem o que se mede).
   */
  modalidades: ModalidadeDaComunidade[] | null;
  loading: boolean;
  error: Error | null;
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
      {lider.rotulo} é o pilar com a maior média por participante.
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
            ? `Os ${RANKING_MAX_DESAFIOS} desafios em andamento com mais participantes, de ${lista.length} no total. Troque o recorte para ver todos.`
            : 'Participantes por desafio em andamento, do maior para o menor. Só entram os ativos: um desafio encerrado teve o ciclo inteiro, e comparar os dois não compara coisas comparáveis.'
        }
        controle={
          excedeTop ? (
            <Select
              aria-label="Recorte do ranking de desafios"
              options={[
                { value: 'top', label: `Top ${RANKING_MAX_DESAFIOS}` },
                { value: 'todos', label: `Todos (${lista.length})` },
              ]}
              value={recorte}
              onChange={(e) => setRecorte(e.target.value as RecorteDoRanking)}
            />
          ) : undefined
        }
      />
      {loading || desafios === null ? (
        <Skeleton variant="rect" className="h-40" />
      ) : lista.length === 0 ? (
        <Painel>
          <EmptyState
            title="Nenhum desafio em andamento"
            description="Um desafio ativo é o que dá à comunidade uma razão para aparecer entre um evento e outro."
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
            ? `As ${RANKING_MAX_MODALIDADES} modalidades com mais membros ativos, de ${lista.length} com gente. Troque o recorte para ver todas.`
            : 'Membros ativos somados por modalidade dos seus clubs. A modalidade é a do club — não é interesse declarado pelo atleta, que o sistema não guarda — e uma pessoa ativa em dois clubs conta em cada um. Modalidade sem ninguém sai da lista.'
        }
        controle={
          excedeTop ? (
            <Select
              aria-label="Recorte das modalidades"
              options={[
                { value: 'top', label: `Top ${RANKING_MAX_MODALIDADES}` },
                { value: 'todas', label: `Todas (${lista.length})` },
              ]}
              value={recorte}
              onChange={(e) => setRecorte(e.target.value as RecorteDeModalidades)}
            />
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
    ocupacao,
    eventosLoading,
    eventosError,
    onRetryEventos,
    modalidades,
    loading,
    error,
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
            <Select
              aria-label="Club analisado"
              options={opcoes}
              value={clubeSelecionado}
              onChange={(e) => onSelecionarClube(e.target.value)}
            />
          )
        }
      />

      <div className="flex flex-col gap-[var(--spacing-6)] p-[var(--spacing-6)]">
        {semClubes ? (
          <EmptyState
            icon={<Users aria-hidden />}
            title="Nenhum club para analisar"
            description="O engajamento nasce da comunidade. Crie um club e esta tela passa a contar quem aparece, o que move o grupo e quanto disso chega aos seus eventos."
            action={
              // Botão do DS, não markup cru — mesmo trabalho que ComunidadeResumo.tsx
              // já faz para "Criar um club" (D-10, REV 2026-08-09 · ADIÇÃO).
              <Button variant="secondary" size="sm" onClick={onCriarClube}>
                Criar um club
              </Button>
            }
          />
        ) : error ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            Não foi possível carregar o engajamento da sua comunidade. Os números desta tela
            só aparecem completos — nenhum bloco mostra parte do dado como se fosse o todo.
          </div>
        ) : (
          <>
            {/* ── Seção 1 · a comunidade ─────────────────────────────────── */}
            <SecaoTitulo
              titulo="Clubs"
              legenda="A comunidade em si: quem está, como chegou e o que move o grupo."
            />

            {loading || resumo === null ? (
              <div
                role="status"
                aria-label="Carregando números da comunidade"
                className="grid grid-cols-1 gap-[var(--spacing-4)] xs:grid-cols-2 lg:grid-cols-4"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rect" className="h-24" />
                ))}
              </div>
            ) : (
              <Cascata i={0}>
                <section
                  aria-label="Números da comunidade"
                  className="grid grid-cols-1 gap-[var(--spacing-4)] xs:grid-cols-2 lg:grid-cols-4"
                >
                  <KpiCard label="Clubs" value={formatInt(resumo.clubes)} />
                  <KpiCard label="Membros ativos" value={formatInt(resumo.membrosAtivos)} />
                  <KpiCard label="Desafios ativos" value={formatInt(resumo.desafiosAtivos)} />
                  <KpiCard
                    label="Participações"
                    value={formatInt(resumo.participacoes)}
                    hint="nos desafios em andamento"
                  />
                </section>
              </Cascata>
            )}

            <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-2">
              <Cascata i={1} className="flex">
              <section aria-label="Equilíbrio dos pilares" className="flex flex-col flex-1">
                <SecaoHead
                  titulo="Equilíbrio dos pilares"
                  ajuda="Média de pontos por participante em cada pilar sobre o mínimo exigido, ponderada pelo tamanho dos desafios que operam equilíbrio. Não existe distribuição-alvo entre os três: o bloco mostra onde a comunidade está pesando, não onde ela deveria pesar."
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

              <Cascata i={2} className="flex">
              <section aria-label="Situação dos membros" className="flex flex-col flex-1">
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

            <Cascata i={3}>
            <section aria-label="Como a comunidade entra" className="flex flex-col">
              <SecaoHead
                titulo="Como a comunidade entra"
                ajuda="A porta por onde cada membro chegou ao club. Canal sem ninguém sai da lista: barra zerada ocupa espaço e não informa."
              />
              {loading || entrada === null ? (
                <Skeleton variant="rect" className="h-32" />
              ) : entrada.length === 0 ? (
                <Painel>
                  <EmptyState
                    title="Ninguém entrou ainda"
                    description="Assim que o primeiro atleta usar o código, um convite ou o link do club, a porta dele aparece aqui."
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

            <Cascata i={4}>
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
            <Cascata i={5}>
            <CardEmBreve
              titulo="Check-ins realizados"
              icon={<ListOrdered aria-hidden />}
              causa="O bloco do estudo mostra o total de check-ins do período, a divisão entre os três pilares e o ranking de ações com o Top 10. Tudo depende da contagem de registros por ação — quilômetros, sessões, páginas, noites —, que vive no registro de cada atleta, e as Rules não abrem esse caminho para o organizador. O agregado do desafio guarda pontos médios por pilar, nunca a contagem nem a ação que a formou."
            />
            </Cascata>

            <Cascata i={6}>
            <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-2">
              <CardEmBreve
                titulo="Mapa de Check-ins"
                icon={<CalendarClock aria-hidden />}
                causa="O club não registra presença: o único check-in que existe é o do QR na largada de um evento, e os registros de atividade do atleta não são legíveis pelo organizador. Sem essa fonte, não há hora nem dia para pintar."
              />
              <CardEmBreve
                titulo="Volume de Check-ins"
                icon={<Activity aria-hidden />}
                causa="Mesma origem do mapa. O progresso dos desafios existe, mas é um acumulado por participante: ele diz o quanto a comunidade andou, nunca em que faixa de hora ou em que semana ela apareceu."
              />
            </div>
            </Cascata>

            {/* Bloco 4 do estudo — a versão que o dado sustenta. */}
            <Cascata i={7}>
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

            <Cascata i={8}>
            <section aria-label="Desafios ligados a um evento" className="flex flex-col">
              <SecaoHead
                titulo="Desafios ligados a um evento"
                ajuda="Quanto da atividade em andamento já está apontada para uma prova sua. É intenção declarada no desafio, não inscrição confirmada: um desafio ligado a um evento não significa que os participantes se inscreveram nele."
              />
              {loading || ponte === null ? (
                <Skeleton variant="rect" className="h-32" />
              ) : ponte.length === 0 ? (
                <Painel>
                  <EmptyState
                    title="Nenhum desafio em andamento"
                    description="Vincular um desafio a um evento transforma o treino da comunidade em preparação para a sua prova."
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

            <Cascata i={9}>
            <section aria-label="Conversão da base" className="flex flex-col">
              <SecaoHead titulo="Conversão da base" />
              <Painel>
                <EmptyState
                  icon={<GitBranch aria-hidden />}
                  title="A conversão da base ainda não é mensurável"
                  description="O funil pediria duas coisas que o sistema não guarda: quantas pessoas visitaram a página de um evento (nenhuma contagem de visitante existe) e quais membros de club compraram uma inscrição (o cadastro de cliente não carrega o vínculo com o club). Sem as duas, qualquer taxa aqui seria chute com cara de número."
                />
              </Painel>
            </section>
            </Cascata>

            {/* ── Seção 3 · o resultado (estudo · D-1008-R15) ────────────── */}
            <SecaoTitulo
              titulo="Eventos"
              legenda="O resultado: ocupação das provas e como as pessoas pagam."
            />

            <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-2 items-stretch">
              {/* Bloco REAL: mesma fonte e mesmo componente da VG (chave de
                  query partilhada — o cache reidrata entre as telas). O card
                  carrega estado de erro e retry PRÓPRIOS: eventos que falham
                  não derrubam a análise da comunidade. */}
              <Cascata i={10} className="flex [&>*]:flex-1">
                <OcupacaoEventos
                  ocupacao={ocupacao}
                  loading={eventosLoading}
                  error={eventosError}
                  onRetry={onRetryEventos}
                />
              </Cascata>
              {/* Sem fonte (impedimento HIFI-REC): nenhum agregado por forma
                  de pagamento chega ao cliente — nada de donut fabricado. */}
              <Cascata i={11} className="flex [&>*]:flex-1">
                <EmBreveV3
                  titulo="Formas de pagamento"
                  icon={<CreditCard aria-hidden />}
                  causa="O doc de pagamento guarda a forma (PIX ou cartão), mas nenhum agregado por forma de pagamento chega ao cliente — e este painel não varre documentos financeiros para somar por conta própria. Quando a série financeira existir, o donut do estudo aparece aqui."
                />
              </Cascata>
            </div>
          </>
        )}
      </div>
    </>
  );
}

EngajamentoView.displayName = 'EngajamentoView';
