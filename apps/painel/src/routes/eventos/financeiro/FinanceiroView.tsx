// =============================================================================
// FinanceiroView — financeiro do evento (S207-T1). Lê o agregado (nunca
// recalcula receita): visão de REPASSE do organizador (receita total, repassado,
// disponível, a ser disponibilizado), breakdown por kit/modalidade/status e
// export CSV. Presentational.
//
// A TAXA/MARGEM DA PLATAFORMA NÃO APARECE (RN-404 + decisão do dono,
// fix-tema-clube): sem card de "Taxa Leela", sem % de taxa, sem nota RN-406.
//
// "Valor repassado" (RN-235 · IAM-T7) vem do LEDGER de repasse deste evento,
// não do agregado. Desde a DEC-0727 o disponível ABATE esse repasse: a Σ do
// ledger entra na própria `derivarRepasse`, então os quatro números da Caixa
// fecham entre si e o CSV sai da mesma derivação (nunca dois números para a
// mesma linha). O aviso de "estimativa que não abate o repasse" era o contorno
// da review anterior — morto o motivo, morreu o aviso; ficou uma nota que diz o
// que o número JÁ desconta, e só quando há repasse para descontar.
// =============================================================================

import {
  BarChart,
  Button,
  DonutChart,
  EmptyState,
  Skeleton,
  Table,
  type TableColumn,
} from '@leela/design-system';
import type { FinanceiroEvento } from '@leela/api-client';
import type { RepassesAssociados } from '../repasses/_lib/repassesPorEvento';
import {
  breakdownFinanceiro,
  derivarRepasse,
  gerarCsvFinanceiro,
  RETENCAO_MAX_PCT,
  type LinhaBreakdown,
} from '../_lib/financeiro';
import { prepararModalidades } from '../evento/overview/modalidades';
import { formatBRL, formatDinheiro, formatInt } from '../_lib/format';
import { baixarTexto } from '../_lib/download';

export interface FinanceiroViewProps {
  slug: string;
  financeiro: FinanceiroEvento | null;
  loading: boolean;
  error: Error | null;
  /**
   * Σ dos repasses associados a ESTE evento pelo campo exato `eventoId`
   * (RN-349). `null` = nenhum repasse associado — estado honesto, nunca
   * R$ 0,00 sugerindo que houve movimento. Vem do MESMO reader e da MESMA
   * função pura (`associarRepassesPorEvento`) que alimentam a linha deste
   * evento em `/eventos/repasses`: os dois números se reconciliam por
   * construção, não por recálculo paralelo.
   */
  repasseDoEvento?: RepassesAssociados | null;
  repasseLoading?: boolean;
  /**
   * Falha na leitura do ledger de repasse (review CAIXADISP-REV, R-4). Desde a
   * DEC-0727 o disponível ABATE a Σ deste evento — logo, ledger ilegível é
   * questão de dinheiro, não de cosmética: a Σ chega vazia, `derivarRepasse`
   * devolve o disponível SEM abater, e o resultado é indistinguível do evento
   * que de fato não teve repasse. Declarado, a tela distingue "não houve saída"
   * de "não conseguimos ler a saída".
   */
  repasseErro?: Error | null;
  /** Atalho para a visão macro — só para quem tem acesso a repasse (RN-320). */
  podeVerRepasses?: boolean;
  onVerRepasses?: () => void;
}

export function FinanceiroView({
  slug,
  financeiro,
  loading,
  error,
  repasseDoEvento = null,
  repasseLoading = false,
  repasseErro = null,
  podeVerRepasses = false,
  onVerRepasses,
}: FinanceiroViewProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando financeiro" className="flex flex-col gap-[var(--spacing-3)]">
        <Skeleton variant="rect" className="h-28" />
        <Skeleton variant="rect" className="h-60" />
      </div>
    );
  }
  if (error) {
    return <p className="text-[var(--text-danger)]">Não foi possível carregar o financeiro.</p>;
  }
  if (!financeiro) {
    return (
      <EmptyState
        title="Financeiro ainda não disponível"
        description="O agregado financeiro é calculado após a primeira inscrição confirmada."
      />
    );
  }

  const fin = financeiro;
  // Σ de repasse EXIBIDA nesta tela (null = nenhum repasse associado). Uma só
  // fonte para o card, para a nota, para o disponível e para o CSV — a review
  // antagonista da IA-MENU cobrou o export que contradizia a tela (A-1) e o
  // disponível que ignorava a saída (A-2); as duas se fecham entrando aqui.
  const repasseExibido =
    repasseDoEvento && repasseDoEvento.qtd > 0 ? repasseDoEvento : null;
  const rep = derivarRepasse(fin, repasseExibido);
  // Quanto do repasse CABE no liberado deste evento (review CAIXADISP-REV,
  // R-2): `computeDisponivelPorEvento` trava em 0 (RN-351), então repasse vivo
  // maior que o liberado é absorvido só até o clamp. A nota diz o que o número
  // ABSORVEU, nunca a Σ que ele viu — afirmar "já desconta R$ 9.000" com o
  // liberado em R$ 8.500 é um desconto que não aconteceu.
  const abatidoNoDisponivel = repasseExibido
    ? Math.min(repasseExibido.total, rep.receitaTotal - rep.aSerDisponibilizado)
    : 0;
  // Ledger ilegível (R-4): a Σ vazia por FALHA é o mesmo objeto que a Σ vazia
  // por ausência. O disponível ao lado não abateu nada e não sabe disso.
  //
  // Só quando NÃO há Σ. O reader (react-query) pode devolver erro de refetch
  // COM o dado anterior de pé; nesse caso o número ao lado é real e já foi
  // abatido — declarar "não foi possível ler" ao lado de um valor exibido seria
  // contradizer a própria tela. O defeito é a falha indistinguível da ausência,
  // não o erro em si.
  const ledgerIlegivel = !repasseLoading && repasseErro !== null && repasseExibido === null;
  // Nota do disponível: o que ele abateu (e onde está o oficial), ou o aviso de
  // que ele PODE não ter abatido. Sem repasse e sem falha, nada a declarar.
  // `formatDinheiro` (com centavos), não `formatBRL`: os quatro CARDS seguem a
  // convenção arredondada do dashboard, mas esta frase AFIRMA um valor descontado
  // e é lida contra o extrato — R$ 3.200,55 virava "Já desconta R$ 3.201", 45
  // centavos que ninguém descontou, e a MESMA Σ aparece com centavos na tabela
  // de /eventos/repasses e no CSV (review CAIXADISP-REV, R-5).
  const notaDisponivel = ledgerIlegivel
    ? 'Não foi possível ler os repasses deste evento: este valor pode não estar abatido. O disponível oficial de saque está em Eventos › Repasses.'
    : repasseExibido
      ? `Já desconta ${formatDinheiro(abatidoNoDisponivel)} em repasse deste evento. O disponível oficial de saque está em Eventos › Repasses.`
      : null;
  const linhas = breakdownFinanceiro(fin);
  // Reusa a derivação do Overview: MESMA cor por modalidade no bar e no donut
  // (a cor segue a entidade, não o rank — regra dataviz). Per-evento, sobre o
  // agregado que JÁ existe (S207-crit2: breakdown por modalidade).
  const { inscricoes, receita } = prepararModalidades(
    fin.inscritos.porModalidade,
    fin.receitaPorModalidade,
  );

  function exportar(): void {
    baixarTexto(gerarCsvFinanceiro(fin, repasseExibido), `financeiro-${slug}.csv`);
  }

  const columns: TableColumn<LinhaBreakdown>[] = [
    { key: 'categoria', header: 'Categoria' },
    { key: 'item', header: 'Item' },
    { key: 'valor', header: 'Inscritos', align: 'right', render: (r) => formatInt(r.valor) },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <div className="flex items-center justify-between gap-[var(--spacing-3)]">
        <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Caixa do evento
        </h2>
        <div className="flex items-center gap-[var(--spacing-3)]">
          {/* Atalho para a visão macro — aparece só para quem tem acesso a
              repasse (RN-320, matriz de papéis). O caixa deste evento e o
              repasse consolidado são coisas separadas; o atalho liga as duas
              sem fundi-las. */}
          {podeVerRepasses && onVerRepasses && (
            <Button variant="ghost" onClick={onVerRepasses}>
              Ver todos os repasses
            </Button>
          )}
          <Button variant="secondary" onClick={exportar}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Caixa — visão de REPASSE do organizador (sem taxa/margem da
          plataforma, RN-404). "Valor repassado" deixou de ser R$ 0,00 genérico
          (RN-235 · IAM-T7): lê o repasse DESTE evento pelo ledger que já
          existia. A informação sempre existiu — só não chegava aqui. */}
      <section
        aria-label="Resumo financeiro"
        className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2 lg:grid-cols-4"
      >
        <CardValor rotulo="Receita total" valor={formatBRL(rep.receitaTotal)} tom="primary" />
        <CardValor
          rotulo="Valor repassado"
          valor={
            repasseLoading ? '…' : repasseExibido ? formatBRL(repasseExibido.total) : '—'
          }
          nota={
            repasseLoading
              ? 'Consultando os repasses deste evento'
              : ledgerIlegivel
                ? 'Não foi possível ler os repasses deste evento'
                : repasseExibido
                  ? `${repasseExibido.qtd} ${repasseExibido.qtd === 1 ? 'repasse solicitado' : 'repasses solicitados'} para este evento`
                  : 'Nenhum repasse solicitado para este evento'
          }
          tom="primary"
        />
        {/* DEC-0727 (achado A-2 da review antagonista, resolvido): o disponível
            abate os repasses vivos deste evento. A nota diz o que ele JÁ
            desconta — some quando não há repasse, porque aí não há o que
            declarar e os quatro números fecham sozinhos.
            O PONTEIRO para o consolidado fica na nota (review CAIXADISP-REV,
            R-3), não só no botão "Ver todos os repasses": um botão de navegação
            não afirma nada sobre a AUTORIDADE do número, e este número segue
            sendo a fatia por evento sobre a receita TOTAL, sistematicamente
            acima do saque autoritativo — que parte do líquido. Ressalva de "não
            desconta" está morta (a conta abate); o endereço do oficial não. */}
        <CardValor
          rotulo="Valor disponível"
          valor={formatBRL(rep.disponivel)}
          {...(notaDisponivel !== null ? { nota: notaDisponivel } : {})}
          tom="success"
        />
        <CardValor
          rotulo="Valor a ser disponibilizado"
          valor={formatBRL(rep.aSerDisponibilizado)}
          nota={`Retenção de até ${RETENCAO_MAX_PCT}% do total, liberada pós-evento; negociável por cliente.`}
          tom="warning"
        />
      </section>

      {/* Gráficos de breakdown por modalidade (reuso dos charts do DS —
          Recharts/ADR-010). Per-evento, sobre o agregado existente. */}
      <section
        aria-label="Distribuição por modalidade"
        className="grid grid-cols-1 gap-[var(--spacing-4)] lg:grid-cols-[3fr_2fr]"
      >
        <CardGrafico titulo="Inscrições por modalidade" nota={`${formatInt(fin.inscritos.total)} inscritos`}>
          {inscricoes.length > 0 ? (
            <BarChart aria-label="Inscrições por modalidade" data={inscricoes} height={170} />
          ) : (
            <EmptyState
              title="Sem inscrições por modalidade"
              description="O detalhamento aparece após a primeira inscrição confirmada."
            />
          )}
        </CardGrafico>

        <CardGrafico titulo="Receita por modalidade" nota={`${formatBRL(fin.receitaBruta)} total`}>
          {receita && receita.length > 0 ? (
            <DonutChart
              aria-label="Receita por modalidade"
              data={receita}
              centerValue={brlCompacto(fin.receitaBruta)}
              centerLabel="Receita total"
              size={180}
              formatValue={formatBRL}
            />
          ) : (
            <EmptyState
              title="Sem detalhamento de receita"
              description="A receita por modalidade ainda não está disponível para este evento."
            />
          )}
        </CardGrafico>
      </section>

      {/* Breakdown */}
      <section aria-label="Breakdown de inscrições" className="flex flex-col gap-[var(--spacing-3)]">
        <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Inscrições ({formatInt(fin.inscritos.total)})
        </h3>
        <Table
          columns={columns}
          data={linhas}
          keyExtractor={(r) => `${r.categoria}-${r.item}`}
          caption="Breakdown de inscrições por kit, modalidade e status"
        />
      </section>

      {/* Backend-dependency honesto: NÃO inventamos dado. Estes cortes exigem o
          modelo de pagamento/afiliação (E12), ausente no agregado atual. */}
      <EmptyState
        title="Disponível com o módulo de pagamento"
        description="Inscrições por forma de pagamento e breakdown por lote dependem dos dados de pagamento (E12) — ainda não computados neste agregado. O repasse deste evento já aparece acima (RN-349)."
      />
    </div>
  );
}

/** "R$ 85,6k" — compacto para o centro do donut. @pure */
function brlCompacto(valor: number): string {
  if (valor >= 1000) {
    const k = valor / 1000;
    return `R$ ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(k)}k`;
  }
  return formatBRL(valor);
}

/** Card de gráfico da tela Financeiro (mesmo padrão visual dos KPIs). */
function CardGrafico({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota: string;
  children: JSX.Element;
}): JSX.Element {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <div className="mb-[var(--spacing-4)] flex items-baseline justify-between gap-[var(--spacing-2)]">
        <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {titulo}
        </h3>
        <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)] [font-variant-numeric:tabular-nums]">
          {nota}
        </span>
      </div>
      {children}
    </div>
  );
}

function CardValor({
  rotulo,
  valor,
  nota,
  tom,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  tom: 'primary' | 'warning' | 'success';
}): JSX.Element {
  const cor =
    tom === 'success'
      ? 'text-[var(--text-success)]'
      : tom === 'warning'
        ? 'text-[var(--feedback-warning-fg)]'
        : 'text-[var(--text-primary)]';
  return (
    <div className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">{rotulo}</span>
      <span className={`text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] ${cor}`}>{valor}</span>
      {nota && <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">{nota}</span>}
    </div>
  );
}

FinanceiroView.displayName = 'FinanceiroView';
