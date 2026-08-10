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
// Em vez de seis caixas vazias (que é o que "um empty-state por gráfico"
// produziria), cada seção sem base recebe UM estado vazio que NOMEIA a métrica
// e a causa. É a diferença entre uma tela que parece quebrada e uma tela que
// explica o que falta — e o que falta virou lista de vetáveis no handoff, não
// número inventado.
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
import { Activity, GitBranch, Users } from 'lucide-react';
import { SecaoHead } from '../../../components/SecaoHead';
import { formatDecimal1, formatInt } from '../_lib/format';
import {
  RANKING_MAX_DESAFIOS,
  type ContagemRotulada,
  type DesafioEngajado,
  type ResumoDaComunidade,
  type ResumoDosPilares,
} from './_lib/engajamento';
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
        'rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SecaoTitulo({
  titulo,
  legenda,
}: {
  titulo: string;
  legenda: string;
}): JSX.Element {
  return (
    <div className="border-t border-t-[var(--border-subtle)] pt-[var(--spacing-5)]">
      <h2
        className={cn(
          'font-display italic',
          'text-[length:var(--section-title-size)] font-[var(--peso-display)]',
          'tracking-[var(--section-title-spacing)] text-[var(--text-primary)]',
        )}
      >
        {titulo}
      </h2>
      <p className="mt-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
        {legenda}
      </p>
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
}: {
  desafios: DesafioEngajado[] | null;
  loading: boolean;
}): JSX.Element {
  const [recorte, setRecorte] = useState<RecorteDoRanking>('top');
  const lista = desafios ?? [];
  const excedeTop = lista.length > RANKING_MAX_DESAFIOS;
  const visiveis = excedeTop && recorte === 'top' ? lista.slice(0, RANKING_MAX_DESAFIOS) : lista;

  return (
    <>
      <SecaoHead
        titulo="Desafios que mais movem a comunidade"
        descricao="Participantes por desafio em andamento, do maior para o menor."
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
          <BarChart
            data={visiveis.map((d) => ({ label: d.nome, value: d.participantes }))}
            aria-label="Participantes por desafio em andamento"
            height={alturaDeBarras(visiveis.length)}
            formatValue={formatInt}
          />
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
      <PageHeader
        title="Engajamento"
        subtitle="A saúde da sua comunidade: quem está nos clubs, o que os move e como isso chega aos seus eventos."
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
                className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rect" className="h-24" />
                ))}
              </div>
            ) : (
              <section
                aria-label="Números da comunidade"
                className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4"
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
            )}

            <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-2">
              <section aria-label="Equilíbrio dos pilares" className="flex flex-col">
                <SecaoHead
                  titulo="Equilíbrio dos pilares"
                  descricao="Média de pontos por participante em cada pilar sobre o mínimo exigido, ponderada pelo tamanho dos desafios que operam equilíbrio."
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
                  </Painel>
                )}
              </section>

              <section aria-label="Situação dos membros" className="flex flex-col">
                <SecaoHead
                  titulo="Situação dos membros"
                  descricao="Quem entrou nos últimos 7 dias, quem segue ativo e quem está há 30 dias ou mais sem nenhum registro de atividade."
                />
                {loading || situacao === null ? (
                  <Skeleton variant="rect" className="h-40" />
                ) : (
                  <Painel>
                    <BarChart
                      data={barrasDeContagem(situacao)}
                      aria-label="Membros por situação"
                      height={alturaDeBarras(situacao.length)}
                      formatValue={formatInt}
                    />
                  </Painel>
                )}
              </section>
            </div>

            <section aria-label="Como a comunidade entra" className="flex flex-col">
              <SecaoHead
                titulo="Como a comunidade entra"
                descricao="A porta por onde cada membro chegou ao club."
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
                  <BarChart
                    data={barrasDeContagem(entrada)}
                    aria-label="Membros por porta de entrada"
                    height={alturaDeBarras(entrada.length)}
                    formatValue={formatInt}
                  />
                </Painel>
              )}
            </section>

            <section aria-label="Desafios que mais movem a comunidade" className="flex flex-col">
              <RankingDeDesafios desafios={desafios} loading={loading} />
            </section>

            <section aria-label="Frequência e presença" className="flex flex-col">
              <SecaoHead titulo="Frequência e presença" />
              <Painel>
                <EmptyState
                  icon={<Activity aria-hidden />}
                  title="Frequência da comunidade ainda não é medida"
                  description="Mapa de horários, volume por período e ranking de ações dependem de um registro de presença do club — hoje só existe check-in de largada de evento, e os registros de atividade do atleta não são legíveis pelo organizador. Enquanto a fonte não existir, esta seção não mostra número."
                />
              </Painel>
            </section>

            {/* ── Seção 2 · a ponte ──────────────────────────────────────── */}
            <SecaoTitulo
              titulo="Do club para o evento"
              legenda="A ponte: quanto da comunidade vira participação em evento."
            />

            <section aria-label="Desafios ligados a um evento" className="flex flex-col">
              <SecaoHead
                titulo="Desafios ligados a um evento"
                descricao="Quanto da atividade em andamento já está apontada para uma prova sua. É intenção declarada no desafio, não inscrição confirmada."
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
                  <BarChart
                    data={barrasDeContagem(ponte)}
                    aria-label="Desafios em andamento com e sem evento vinculado"
                    height={alturaDeBarras(ponte.length)}
                    formatValue={formatInt}
                  />
                </Painel>
              )}
            </section>

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
          </>
        )}
      </div>
    </>
  );
}

EngajamentoView.displayName = 'EngajamentoView';
