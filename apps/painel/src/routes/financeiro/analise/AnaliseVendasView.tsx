// =============================================================================
// AnaliseVendasView — análise de vendas do profissional (RN-820). A entrada
// "Financeiro" do menu vira ANÁLISE (semente do E11 ao nível do profissional):
//   (a) desempenho de vendas (getOverview · dashboard/current);
//   (b) perfil de compradores — idade e sexo REAIS (∑ demografia/current ·
//       LEELA-BEPEND-T1; EmptyState honesto enquanto não há agregado);
//   (c) modalidades com mais inscritos (∑ financeiro/current);
//   (d) tamanhos mais pedidos — camiseta (∑ aprovisionamento · FABLE-D).
// Presentational puro: dados chegam por props do container. Estados honestos
// (§2.12): erro mostra "Tentar novamente"; ausência mostra EmptyState; a
// demografia declara a COBERTURA quando parte dos inscritos não tem dado.
// =============================================================================

import * as React from 'react';
import {
  BarChart,
  Button,
  DonutChart,
  EmptyState,
  KpiCard,
  PageHeader,
  Skeleton,
  Sparkline,
  type BarChartDatum,
} from '@leela/design-system';
import type { OverviewResult } from '@leela/api-client';
import { notaCobertura, type DemografiaTenant } from './_lib/demografia';

export interface AnaliseVendasViewProps {
  // (a) desempenho de vendas
  desempenho: OverviewResult | null;
  desempenhoLoading: boolean;
  desempenhoError: Error | null;
  onRetryDesempenho: () => void;

  // (b) perfil de compradores — agregado real (RN-820)
  demografia: DemografiaTenant;
  demografiaLoading: boolean;
  demografiaError: Error | null;
  onRetryDemografia: () => void;

  // (c) modalidades com mais inscritos
  modalidades: BarChartDatum[];
  modalidadesLoading: boolean;
  modalidadesError: Error | null;
  onRetryModalidades: () => void;

  // (d) tamanhos mais pedidos
  tamanhos: BarChartDatum[];
  tamanhosLoading: boolean;
  tamanhosError: Error | null;
  onRetryTamanhos: () => void;
}

/** Reais inteiros (KPI — pt-BR). @pure */
function formatBRLInt(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

/** Inteiro pt-BR. @pure */
function formatInt(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

export function AnaliseVendasView({
  desempenho,
  desempenhoLoading,
  desempenhoError,
  onRetryDesempenho,
  demografia,
  demografiaLoading,
  demografiaError,
  onRetryDemografia,
  modalidades,
  modalidadesLoading,
  modalidadesError,
  onRetryModalidades,
  tamanhos,
  tamanhosLoading,
  tamanhosError,
  onRetryTamanhos,
}: AnaliseVendasViewProps): JSX.Element {
  const cobertura = notaCobertura(demografia);
  const totalSexo = demografia.sexo.reduce((acc, s) => acc + s.value, 0);
  const demografiaVazia = demografia.faixas.length === 0 && demografia.sexo.length === 0;

  return (
    <div className="flex flex-col gap-[var(--spacing-6)] pb-[var(--spacing-8)]">
      <PageHeader
        title="Análise de vendas"
        subtitle="Desempenho, perfil de compradores, modalidades e tamanhos mais pedidos"
      />

      <div className="flex flex-col gap-[var(--spacing-8)] px-[var(--spacing-6)]">
        {/* (a) Desempenho de vendas — KPIs + série de conversão (getOverview). */}
        <section aria-label="Desempenho de vendas" className="flex flex-col gap-[var(--spacing-4)]">
          <SectionTitle>Desempenho de vendas</SectionTitle>
          {desempenhoError ? (
            <ErroBloco
              message="Não foi possível carregar o desempenho de vendas."
              onRetry={onRetryDesempenho}
            />
          ) : desempenhoLoading ? (
            <div
              role="status"
              aria-label="Carregando desempenho"
              className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3"
            >
              <Skeleton variant="rect" className="h-24" />
              <Skeleton variant="rect" className="h-24" />
              <Skeleton variant="rect" className="h-24" />
            </div>
          ) : (
            <DesempenhoConteudo desempenho={desempenho} />
          )}
        </section>

        {/* (b) Perfil de compradores — idade e sexo REAIS (∑ demografia/current
            · RN-820). Sem agregado ainda → EmptyState honesto; cobertura
            parcial → nota declarada (§2.12 — nunca número inventado). */}
        <section aria-label="Perfil de compradores" className="flex flex-col gap-[var(--spacing-4)]">
          <SectionTitle>Perfil de compradores</SectionTitle>
          {demografiaError ? (
            <ErroBloco
              message="Não foi possível carregar o perfil de compradores."
              onRetry={onRetryDemografia}
            />
          ) : demografiaLoading ? (
            <div
              role="status"
              aria-label="Carregando perfil de compradores"
              className="grid grid-cols-1 gap-[var(--spacing-4)] lg:grid-cols-2"
            >
              <Skeleton variant="rect" className="h-52" />
              <Skeleton variant="rect" className="h-52" />
            </div>
          ) : demografiaVazia ? (
            <EmptyState
              title="Sem dados demográficos ainda"
              description="O perfil de idade e sexo aparece quando houver inscrições confirmadas com dados demográficos coletados no checkout."
            />
          ) : (
            <>
              {cobertura !== null && <NotaCobertura>{cobertura}</NotaCobertura>}
              <div className="grid grid-cols-1 gap-[var(--spacing-4)] lg:grid-cols-2">
                <CardGrafico titulo="Faixa etária" nota="idade na data da prova">
                  {demografia.faixas.length === 0 ? (
                    <EmptyState
                      title="Sem idades registradas"
                      description="Nenhuma inscrição confirmada tem data de nascimento registrada."
                    />
                  ) : (
                    <BarChart
                      aria-label="Compradores por faixa etária"
                      data={demografia.faixas}
                      height={200}
                    />
                  )}
                </CardGrafico>
                <CardGrafico titulo="Sexo" nota="declarado no checkout">
                  {demografia.sexo.length === 0 ? (
                    <EmptyState
                      title="Sem sexo registrado"
                      description="Nenhuma inscrição confirmada tem sexo declarado."
                    />
                  ) : (
                    <DonutChart
                      aria-label="Compradores por sexo"
                      data={demografia.sexo}
                      centerValue={formatInt(totalSexo)}
                      centerLabel="compradores"
                      size={180}
                    />
                  )}
                </CardGrafico>
              </div>
            </>
          )}
        </section>

        {/* (c) Modalidades com mais inscritos (∑ financeiro/current). */}
        <section aria-label="Modalidades com mais inscritos" className="flex flex-col gap-[var(--spacing-4)]">
          <SectionTitle>Modalidades com mais inscritos</SectionTitle>
          <CardGrafico titulo="Inscrições por modalidade" nota="todos os seus eventos">
            <BlocoGrafico
              loading={modalidadesLoading}
              error={modalidadesError}
              onRetry={onRetryModalidades}
              vazio={modalidades.length === 0}
              carregandoLabel="Carregando modalidades"
              emptyTitle="Sem inscrições por modalidade"
              emptyDescription="O detalhamento aparece após a primeira inscrição confirmada em um evento seu."
            >
              <BarChart aria-label="Inscrições por modalidade" data={modalidades} height={220} />
            </BlocoGrafico>
          </CardGrafico>
        </section>

        {/* (d) Tamanhos mais pedidos — camiseta (∑ aprovisionamento · FABLE-D). */}
        <section aria-label="Tamanhos mais pedidos" className="flex flex-col gap-[var(--spacing-4)]">
          <SectionTitle>Tamanhos mais pedidos</SectionTitle>
          <CardGrafico titulo="Camisetas por tamanho" nota="entrega pré-preparada">
            <BlocoGrafico
              loading={tamanhosLoading}
              error={tamanhosError}
              onRetry={onRetryTamanhos}
              vazio={tamanhos.length === 0}
              carregandoLabel="Carregando tamanhos"
              emptyTitle="Sem tamanhos pedidos"
              emptyDescription="Os tamanhos aparecem quando um evento seu tem kit com camiseta (item tamanhado) vendido."
            >
              <BarChart aria-label="Camisetas por tamanho" data={tamanhos} height={220} />
            </BlocoGrafico>
          </CardGrafico>
        </section>
      </div>
    </div>
  );
}

/** KPIs + sparkline de conversão do desempenho (getOverview já resolvido). */
function DesempenhoConteudo({ desempenho }: { desempenho: OverviewResult | null }): JSX.Element {
  if (!desempenho) {
    return (
      <EmptyState
        title="Sem desempenho ainda"
        description="Os indicadores aparecem após a primeira inscrição confirmada em um evento seu."
      />
    );
  }
  const conv = desempenho.taxaConversaoPct;
  const serie = desempenho.conversaoSparkline;
  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3">
        <KpiCard label="Inscrições" value={formatInt(desempenho.inscricoesTotais)} />
        <KpiCard label="Receita confirmada" value={formatBRLInt(desempenho.receitaConfirmada)} />
        <KpiCard label="Conversão" value={conv === null ? '—' : `${formatInt(conv)}%`} />
      </div>
      {serie.length >= 2 && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
          <div className="mb-[var(--spacing-3)] flex items-baseline justify-between">
            <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
              Tendência de conversão
            </h3>
          </div>
          <div className="text-[var(--text-brand)]">
            <Sparkline values={serie} aria-label="Série de conversão recente" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Envolve um gráfico com os estados §2.12 (carregando/erro/vazio/conteúdo). */
function BlocoGrafico({
  loading,
  error,
  onRetry,
  vazio,
  carregandoLabel,
  emptyTitle,
  emptyDescription,
  children,
}: {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  vazio: boolean;
  carregandoLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  children: React.ReactNode;
}): JSX.Element {
  if (error) return <ErroBloco message="Não foi possível carregar este gráfico." onRetry={onRetry} />;
  if (loading) {
    return (
      <div role="status" aria-label={carregandoLabel}>
        <Skeleton variant="rect" className="h-52" />
      </div>
    );
  }
  if (vazio) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return <>{children}</>;
}

function SectionTitle({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
      {children}
    </h2>
  );
}

/** Card de gráfico (mesmo padrão visual dos KPIs). */
function CardGrafico({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <div className="mb-[var(--spacing-4)] flex items-baseline justify-between gap-[var(--spacing-2)]">
        <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {titulo}
        </h3>
        <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">{nota}</span>
      </div>
      {children}
    </div>
  );
}

/** Nota honesta de COBERTURA da demografia (proveniência — §2.12). */
function NotaCobertura({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <p
      role="note"
      className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--feedback-warning)] bg-[var(--surface-raised)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]"
    >
      {children}
    </p>
  );
}

/** Erro de carga de um bloco (§2.12) — nunca um estado feliz fabricado. */
function ErroBloco({ message, onRetry }: { message: string; onRetry: () => void }): JSX.Element {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-[var(--spacing-3)] rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-4)]"
    >
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-primary)]">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

AnaliseVendasView.displayName = 'AnaliseVendasView';
