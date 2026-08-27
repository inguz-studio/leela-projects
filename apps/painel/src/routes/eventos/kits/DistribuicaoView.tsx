// =============================================================================
// DistribuicaoView — a ABA ÚNICA de distribuição de kits (S1258 · leva 11).
//
// O QUE ACONTECEU AQUI. Até 12/08 a área de Kits tinha duas abas para uma
// operação só: "Distribuição" (duas seções de progresso, sem KPI e sem tabela)
// e "Estoque" (alertas + KPIs + matriz kit×modalidade + tabela de SKU +
// movimentações). A medição da leva 11 mostrou por quê isso incomodava: o dado
// de RETIRADA aparecia em TRÊS cortes do mesmo número — as duas barras de
// progresso, o KPI "Retirados" e a coluna Retirados/confirmados da matriz —, e
// os três batiam dígito a dígito (Kit Ouro 15/43, Kit Prata 74/206, Kit Básico
// 56/159, Sem kit 9/23 nas duas abas, na captura de 13/08).
//
// A CONVERGÊNCIA PARA UMA FONTE. A retirada passa a ter UM lugar por leitura:
//   · o total          → o KPI "Retirados" (a manchete, presença registrada);
//   · o detalhe        → as barras de "Retirada por kit" e "por modalidade",
//                        que são as únicas que carregam o percentual;
//   · a matriz         → PAROU de repetir retirada. A célula passa a dizer
//                        `confirmados` (a demanda), e a coluna "Retirados"
//                        saiu. A matriz é o livro do ESTOQUE — demanda,
//                        capacidade, saldo e status —, não um terceiro corte
//                        da presença.
// O `saldo` continua sendo `capacidade − retirados` (derivação intocada); como
// a célula agora fala de demanda, a regra está DITA na descrição do bloco, para
// ninguém tentar reconciliar confirmados com saldo na cabeça.
//
// O QUE NÃO SE PERDE. A tabela de SKU/aprovisionamento vem inteira (vendido,
// físico, a encomendar, entregues, estado, alerta, ação de transição e o
// encerramento de encomendas). O que sai é a retirada por CÉLULA
// (kit × modalidade) — o corte mais fino, e o único que nenhuma das outras
// leituras reproduzia. Se ele fizer falta, volta como coluna da matriz.
//
// ANATOMIA (topo → base): alertas → resumo (MetricGrid) → retirada por kit →
// retirada por modalidade → estoque por kit e modalidade → estoque por tamanho
// → movimentações. Os quatro blocos usam o `SectionHeader` canônico; a fileira
// de KPI usa o `MetricGrid` (a escada 1→2→4 colunas é a decisão do REDESIGN-V2
// item 6, e é ela que evita o rótulo cortado abaixo de 480px).
//
// Dado real: presença dos inscritos = retirada (RN-205). Os ∑ por SKU são
// DERIVADOS pela Function (RN-224) — esta tela só renderiza o doc, nunca
// recomputa agregado no cliente. Presentational.
// =============================================================================

import * as React from 'react';
import {
  KpiCard,
  Badge,
  Button,
  ConfirmModal,
  EmptyState,
  Input,
  MetricGrid,
  Modal,
  RowActions,
  SectionHeader,
  Skeleton,
  Stack,
  Table,
  useToast,
  type BadgeProps,
  type TableColumn,
  type VerboDeAcao,
} from '@leela/design-system';
import {
  LIMIAR_BAIXA_SKU_DEFAULT,
  TRANSICOES_APROVISIONAMENTO,
  gradeEfetivaDoItem,
  mensagemContagemInvalida,
  parseContagemPtBr,
  tamanhosDoCorte,
  type Aprovisionamento,
  type EstadoAprovisionamento,
  type Inscrito,
  type ItemKit,
  type Kit,
} from '@leela/core';
import { ProgressoBarra } from './ProgressoBarra';
import {
  distribuicaoPorKit,
  distribuicaoPorModalidade,
  estoquePorKit,
  matrizEstoque,
  resumoEstoque,
  type LinhaMatriz,
} from '../_lib/distribuicao';
import { formatInt } from '../_lib/format';
import { CORTE_LABEL, ORDEM_CORTES, entregasPorSku } from '../_lib/gradeTamanhos';

export interface DistribuicaoViewProps {
  kits: Kit[];
  inscritos: Inscrito[];
  modalidades: string[];
  /** Docs REAIS da subcoleção `aprovisionamento` (∑ da Function — RN-224). */
  aprovisionamento: Aprovisionamento[];
  /** Catálogo de itens — SÓ para exibir nome/ordem de tamanhos (join visual). */
  itens: ItemKit[];
  /**
   * Transição da máquina de estados do SKU (RN-226) via callable — escrita
   * EXCLUSIVA de Function. Rejeição do servidor (replay/atalho) sobe como erro.
   */
  onTransicao: (
    sku: string,
    novoEstado: EstadoAprovisionamento,
    qtd: number
  ) => Promise<void>;
  /**
   * Encerra as ENCOMENDAS do item (RN-232 · TAMANHOS-GRADE) via callable —
   * todos os SKUs em `estimativa` viram `encomendado` com a foto vendida do
   * instante, numa transação do servidor. NÃO fecha as vendas do kit.
   */
  onEncerrarEncomendas: (
    itemId: string
  ) => Promise<{ encerrados: string[]; jaEncerrados: string[] }>;
  loading: boolean;
  error: Error | null;
}

// Rótulo/variante do Badge por estado da máquina (RN-226 — 3 estados lineares).
const BADGE_ESTADO: Record<
  EstadoAprovisionamento,
  { variant: BadgeProps['variant']; rotulo: string }
> = {
  estimativa: { variant: 'neutro', rotulo: 'Estimativa' },
  encomendado: { variant: 'alerta', rotulo: 'Encomendado' },
  em_estoque: { variant: 'vitoria', rotulo: 'Em estoque' },
};

// Rótulo e VERBO da ação que leva ao estado alvo (a matriz canônica do core
// decide o alvo — aqui só se nomeia a ação; `em_estoque` é terminal → sem ação).
// Desde a conversão para ícone (decisão do dono de 17/08) o par anda junto: o
// verbo é do vocabulário FECHADO do `RowActions` (quem desenha é o DS) e o
// rótulo abre o nome acessível da linha. Separá-los em dois mapas era o convite
// para "Receber" ganhar o ícone de encomenda no primeiro estado novo.
const ACAO_ALVO: Partial<
  Record<EstadoAprovisionamento, { rotulo: string; verbo: VerboDeAcao }>
> = {
  encomendado: { rotulo: 'Encomendar', verbo: 'encomendar' },
  em_estoque: { rotulo: 'Receber', verbo: 'receber' },
};

/** Próximo estado da máquina LINEAR (RN-226) — null quando terminal. */
function proximoEstado(
  estado: EstadoAprovisionamento
): EstadoAprovisionamento | null {
  return TRANSICOES_APROVISIONAMENTO[estado][0] ?? null;
}

/**
 * Ordena SKUs por item; dentro do item por CORTE (feminina → masculina →
 * unissex — RN-231) e, dentro do corte, pela ordem CANÔNICA da grade do
 * catálogo (P antes de M antes de G — não alfabética; legado usa
 * `tamanhosDisponiveis` ≡ grade unissex via gradeEfetivaDoItem).
 * Ordenação de EXIBIÇÃO apenas — nenhum agregado é recalculado aqui.
 */
function ordenarSkus(
  aprovisionamento: Aprovisionamento[],
  itensPorId: ReadonlyMap<string, ItemKit>
): Aprovisionamento[] {
  return [...aprovisionamento].sort((a, b) => {
    if (a.itemId !== b.itemId) return a.itemId.localeCompare(b.itemId);
    if (a.corte !== b.corte) {
      return ORDEM_CORTES.indexOf(a.corte) - ORDEM_CORTES.indexOf(b.corte);
    }
    const item = itensPorId.get(a.itemId);
    const tamanhos = item ? tamanhosDoCorte(gradeEfetivaDoItem(item), a.corte) : [];
    const ia = tamanhos.indexOf(a.tamanho);
    const ib = tamanhos.indexOf(b.tamanho);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1; // tamanho fora do catálogo (∪ existentes) vai ao fim
    return a.tamanho.localeCompare(b.tamanho);
  });
}

/** Quantidade sugerida no modal — lida do DOC (nunca ∑ recalculado):
 *  encomendar → `aEncomendar` (o número que resolve a compra — RN-224);
 *  receber    → qtd da última encomenda registrada no `historico` (RN-226). */
function qtdSugerida(
  row: Aprovisionamento,
  alvo: EstadoAprovisionamento
): number {
  if (alvo === 'em_estoque') {
    for (let i = row.historico.length - 1; i >= 0; i -= 1) {
      if (row.historico[i]!.estado === 'encomendado') return row.historico[i]!.qtd;
    }
  }
  return row.aEncomendar;
}

export function DistribuicaoView({
  kits,
  inscritos,
  modalidades,
  aprovisionamento,
  itens,
  onTransicao,
  onEncerrarEncomendas,
  loading,
  error,
}: DistribuicaoViewProps): JSX.Element {
  const { toast } = useToast();
  // SKU em transição (modal aberto) — null = fechado.
  const [transicao, setTransicao] = React.useState<{
    row: Aprovisionamento;
    alvo: EstadoAprovisionamento;
  } | null>(null);
  // Item com encerramento de encomendas pedido (ConfirmModal) — null = fechado.
  const [encerrando, setEncerrando] = React.useState<string | null>(null);
  const [busyEncerrar, setBusyEncerrar] = React.useState(false);

  if (loading) {
    return (
      <Stack gap="md" role="status" aria-label="Carregando distribuição">
        <Skeleton variant="rect" className="h-28" />
        <Skeleton variant="rect" className="h-40" />
        <Skeleton variant="rect" className="h-60" />
      </Stack>
    );
  }
  if (error) {
    return <p className="text-[var(--text-danger)]">Não foi possível carregar a distribuição.</p>;
  }

  if (kits.length === 0) {
    return (
      <EmptyState
        title="Nenhum kit para controlar"
        description="Cadastre kits para acompanhar a retirada e o estoque."
      />
    );
  }

  const resumo = resumoEstoque(kits, inscritos);
  const linhas = matrizEstoque(kits, inscritos, modalidades);
  const esgotados = estoquePorKit(kits, inscritos).filter((l) => l.esgotado);
  const porKit = distribuicaoPorKit(inscritos).filter((k) => k.total > 0);
  const porModalidade = distribuicaoPorModalidade(inscritos, modalidades).filter(
    (m) => m.total > 0,
  );

  const itensPorId = new Map(itens.map((i) => [i.id, i]));
  const nomeDoItem = (itemId: string): string =>
    itensPorId.get(itemId)?.nome ?? itemId;
  const skus = ordenarSkus(aprovisionamento, itensPorId);
  // `alerta` vem CARIMBADO no doc pela Function (limiar baixa = 10 default) —
  // filtro de exibição, não derivação.
  const skusEmAlerta = skus.filter((s) => s.alerta !== null);
  // Grade em uso? (algum SKU com corte explícito) — a coluna Corte só aparece
  // quando existe separação; evento 100% legado/unissex mantém a tabela enxuta.
  const temCorte = skus.some((s) => s.corte !== 'unissex');
  // ENTREGAS por corte×tamanho (RN-232·e): derivação PURA dos inscritos —
  // entregue = presença registrada (kit retirado no balcão, RN-205).
  const entregas = entregasPorSku(inscritos);
  // Itens com encomenda aberta (algum SKU em `estimativa`) — alvo da ação
  // "Encerrar encomendas" (RN-232). Ordem estável por nome.
  const itensComEncomendaAberta = [...new Set(
    skus.filter((s) => s.estado === 'estimativa').map((s) => s.itemId)
  )].sort((a, b) => nomeDoItem(a).localeCompare(nomeDoItem(b)));

  // Matriz kit × modalidade — DEMANDA e saldo. A retirada NÃO mora mais aqui
  // (S1258): a célula diz `confirmados` e a coluna "Retirados" saiu, porque o
  // bloco de progresso acima já conta a mesma presença, kit a kit e com o
  // percentual que a tabela nunca teve.
  const columns: TableColumn<LinhaMatriz>[] = [
    { key: 'nome', header: 'Kit', render: (r) => r.nome },
    ...modalidades.map(
      (mod): TableColumn<LinhaMatriz> => ({
        key: `mod-${mod}`,
        header: mod,
        align: 'right',
        render: (r) => {
          const c = r.celulas.find((x) => x.modalidade === mod);
          if (!c || (!c.oferecido && c.confirmados === 0)) {
            return <span className="text-[var(--text-tertiary)]">—</span>;
          }
          return (
            <span className="[font-variant-numeric:tabular-nums] text-[var(--text-primary)]">
              {formatInt(c.confirmados)}
            </span>
          );
        },
      }),
    ),
    {
      key: 'total',
      header: 'Confirmados',
      align: 'right',
      render: (r) => (
        <span className="[font-variant-numeric:tabular-nums]">
          {formatInt(r.totalConfirmados)}
        </span>
      ),
    },
    {
      key: 'capacidade',
      header: 'Capacidade',
      align: 'right',
      render: (r) => (r.capacidade === null ? '—' : formatInt(r.capacidade)),
    },
    {
      key: 'saldo',
      header: 'Saldo',
      align: 'right',
      render: (r) => (r.saldo === null ? '—' : formatInt(r.saldo)),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.capacidade === null ? (
          <Badge variant="neutro">Sem capacidade</Badge>
        ) : r.esgotado ? (
          <Badge variant="vulcao">Esgotado</Badge>
        ) : (
          <Badge variant="vitoria">Disponível</Badge>
        ),
    },
  ];

  // Colunas do aceite S210-T4: vendido · físico · a encomendar · estado ·
  // alerta — TODOS lidos do doc (∑ da Function), zero recálculo no cliente.
  const columnsSku: TableColumn<Aprovisionamento>[] = [
    { key: 'item', header: 'Item', render: (r) => nomeDoItem(r.itemId) },
    // Corte (RN-231) — só quando o evento separa por corte; dado da CHAVE do
    // doc (parse do core), nunca derivado aqui.
    ...(temCorte
      ? [
          {
            key: 'corte',
            header: 'Corte',
            render: (r) => CORTE_LABEL[r.corte],
          } satisfies TableColumn<Aprovisionamento>,
        ]
      : []),
    { key: 'tamanho', header: 'Tamanho', render: (r) => r.tamanho },
    {
      key: 'vendido',
      header: 'Vendido',
      align: 'right',
      render: (r) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatInt(r.qtdVendida)}</span>
      ),
    },
    {
      key: 'fisico',
      header: 'Físico',
      align: 'right',
      render: (r) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatInt(r.estoqueFisico)}</span>
      ),
    },
    {
      key: 'a-encomendar',
      header: 'A encomendar',
      align: 'right',
      render: (r) => (
        <span
          className={`[font-variant-numeric:tabular-nums] ${
            r.aEncomendar > 0 ? 'font-[var(--font-weight-semibold)] text-[var(--text-primary)]' : ''
          }`}
        >
          {formatInt(r.aEncomendar)}
        </span>
      ),
    },
    {
      key: 'entregues',
      header: 'Entregues',
      align: 'right',
      // RN-232·e: acompanhamento de ENTREGAS por corte×tamanho no
      // credenciamento — entregues / escolhidos (pendentes = diferença),
      // derivado do fulfillment do balcão (presença registrada, RN-205).
      render: (r) => {
        const e = entregas.get(r.id);
        if (!e) return <span className="text-[var(--text-tertiary)]">—</span>;
        return (
          <span className="[font-variant-numeric:tabular-nums]">
            <span className="text-[var(--text-primary)]">{formatInt(e.entregues)}</span>
            <span className="text-[var(--text-tertiary)]">
              {' '}/ {formatInt(e.entregues + e.pendentes)}
            </span>
          </span>
        );
      },
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => (
        <Badge variant={BADGE_ESTADO[r.estado].variant}>{BADGE_ESTADO[r.estado].rotulo}</Badge>
      ),
    },
    {
      key: 'alerta',
      header: 'Alerta',
      render: (r) =>
        r.alerta === 'esgotado' ? (
          <Badge variant="vulcao">Esgotado</Badge>
        ) : r.alerta === 'baixa' ? (
          <Badge variant="alerta">Baixa</Badge>
        ) : (
          <span className="text-[var(--text-tertiary)]">—</span>
        ),
    },
    {
      key: 'acao',
      header: 'Ação',
      render: (r) => {
        const alvo = proximoEstado(r.estado);
        const acao = alvo === null ? undefined : ACAO_ALVO[alvo];
        if (alvo === null || acao === undefined) {
          // `em_estoque` é terminal (RN-226) — nada a fazer.
          return <span className="text-[var(--text-tertiary)]">—</span>;
        }
        // Ícone, não escrito (decisão do dono de 17/08). O rótulo carrega o SKU
        // inteiro porque a tabela repete o mesmo item em várias linhas: sem o
        // corte e o tamanho no nome, quatro pacotes de encomenda ficariam com o
        // mesmo nome acessível e a compra sairia do tamanho errado.
        const corte = r.corte === 'unissex' ? '' : ` ${CORTE_LABEL[r.corte].toLowerCase()}`;
        return (
          <RowActions
            actions={[
              {
                id: 'transicao',
                label: `${acao.rotulo} ${nomeDoItem(r.itemId)}${corte} tamanho ${r.tamanho}`,
                verbo: acao.verbo,
                onClick: () => setTransicao({ row: r, alvo }),
              },
            ]}
          />
        );
      },
    },
  ];

  async function confirmarEncerramento(): Promise<void> {
    if (encerrando === null) return;
    setBusyEncerrar(true);
    try {
      const r = await onEncerrarEncomendas(encerrando);
      toast({
        title: 'Encomendas encerradas',
        description:
          `${formatInt(r.encerrados.length)} SKU(s) foram para "Encomendado" com a contagem ` +
          `vendida de agora${r.jaEncerrados.length > 0 ? `; ${formatInt(r.jaEncerrados.length)} já estavam além de estimativa` : ''}. As vendas continuam abertas.`,
        variant: 'success',
      });
      setEncerrando(null);
    } catch (e) {
      toast({
        title: 'Falha ao encerrar encomendas',
        ...(e instanceof Error && e.message ? { description: e.message } : {}),
        variant: 'danger',
      });
    } finally {
      setBusyEncerrar(false);
    }
  }

  async function confirmarTransicao(qtd: number): Promise<void> {
    if (!transicao) return;
    const { row, alvo } = transicao;
    try {
      await onTransicao(row.id, alvo, qtd);
      toast({
        title: alvo === 'em_estoque' ? 'Estoque recebido' : 'Encomenda registrada',
        variant: 'success',
      });
      setTransicao(null);
    } catch (e) {
      // failed-precondition (transição inválida/replay) e permission-denied
      // sobem do servidor com mensagem descritiva — exibida sem tradução.
      toast({
        title: 'Falha na transição do SKU',
        ...(e instanceof Error && e.message ? { description: e.message } : {}),
        variant: 'danger',
      });
    }
  }

  return (
    <Stack gap="xl">
      {esgotados.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-[var(--spacing-3)] rounded-[var(--radius-md)] border-l-[var(--card-critical-border)] border-l-[var(--border-danger)] bg-[var(--feedback-danger-surface)] p-[var(--spacing-4)]"
        >
          <p className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]">
            <strong className="font-[var(--font-weight-bold)]">
              {esgotados.length} kit(s) sem saldo:
            </strong>{' '}
            {esgotados.map((e) => e.nome).join(', ')}. Reponha antes da entrega para não errar o
            kit na retirada.
          </p>
        </div>
      )}

      {/* Alerta por SKU — `alerta` derivado pela Function (baixa ≤ limiar 10
          default / esgotado), lido do doc: visível sem caçar linha na tabela. */}
      {skusEmAlerta.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-[var(--spacing-3)] rounded-[var(--radius-md)] border-l-[var(--card-critical-border)] border-l-[var(--border-danger)] bg-[var(--feedback-danger-surface)] p-[var(--spacing-4)]"
        >
          <p className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]">
            <strong className="font-[var(--font-weight-bold)]">
              {skusEmAlerta.length} SKU(s) em alerta de estoque:
            </strong>{' '}
            {skusEmAlerta
              .map(
                (s) =>
                  `${nomeDoItem(s.itemId)} ${s.tamanho} (${s.alerta === 'esgotado' ? 'esgotado' : 'baixa'})`,
              )
              .join(', ')}
            . Estoque baixo = saldo até {LIMIAR_BAIXA_SKU_DEFAULT} unidades.
          </p>
        </div>
      )}

      {/* Resumo — a MANCHETE da aba, e a ÚNICA leitura de topo da retirada.
          `MetricGrid` fecha a escada 1 → 2 → 4 colunas (REDESIGN-V2 item 6):
          abaixo de 480px o rótulo do KPI cortava na receita antiga. */}
      <MetricGrid as="section" columns={4} aria-label="Resumo de kits">
        <KpiCard
          label="Total"
          value={resumo.totalCapacidade === null ? '—' : formatInt(resumo.totalCapacidade)}
          hint="capacidade dos kits"
        />
        <KpiCard label="Retirados" value={formatInt(resumo.retirados)} hint="presença registrada" />
        <KpiCard
          label="Disponíveis"
          value={resumo.disponiveis === null ? '—' : formatInt(resumo.disponiveis)}
          hint="saldo por capacidade"
        />
        <KpiCard
          label="Em risco"
          value={formatInt(resumo.emRisco)}
          hint="kit(s) esgotado(s)"
          tone={resumo.emRisco > 0 ? 'danger' : 'default'}
        />
      </MetricGrid>

      {/* RETIRADA — o detalhe da presença, e o único lugar com percentual. */}
      <section aria-label="Retirada por kit">
        {/* V2708-09: description removida. */}
        <SectionHeader title="Retirada por kit" />
        <Stack gap="lg">
          {porKit.map((k) => (
            <LinhaProgresso
              key={k.kit}
              titulo={k.label}
              retirados={k.retirados}
              total={k.total}
              pct={k.pct}
            />
          ))}
          {porKit.length === 0 && <Vazio />}
        </Stack>
      </section>

      <section aria-label="Retirada por modalidade">
        <SectionHeader title="Retirada por modalidade" />
        <Stack gap="lg">
          {porModalidade.map((m) => (
            <LinhaProgresso
              key={m.modalidade}
              titulo={m.modalidade}
              retirados={m.retirados}
              total={m.total}
              pct={m.pct}
            />
          ))}
          {porModalidade.length === 0 && <Vazio />}
        </Stack>
      </section>

      {/* ESTOQUE — demanda × capacidade, a visão de "não errar o kit". */}
      <section aria-label="Estoque por kit e modalidade">
        {/* V2708-09: description removida. */}
        <SectionHeader title="Estoque por kit e modalidade" />
        {/* responsive="scroll" (revisão r1 A2): esta é a ÚNICA consumidora que é
            matriz de comparação em grade (kit×modalidade). Virar card no mobile
            (default) apagaria a leitura "qual modalidade está curta entre os
            kits". Mantemos a grade densa e rolamos na horizontal DENTRO do wrap
            (scroll-x contido, nunca no documento). design-principles §(c) reserva
            TABELA — não cards — justamente p/ comparação em grade. */}
        <Table
          columns={columns}
          data={linhas}
          keyExtractor={(r) => r.id}
          caption="Demanda e saldo por kit e modalidade"
          responsive="scroll"
        />
      </section>

      {/* Estoque por SKU (S210-T4) — dado REAL da subcoleção `aprovisionamento`.
          Responde o JTBD da Marina: quanto tenho de cada tamanho e o que falta
          encomendar, sem planilha. Lista de leitura → card-mode default no
          mobile (não é matriz de comparação — design-principles §(c)). */}
      <section aria-label="Estoque por tamanho">
        {/* V2708-09: description removida. */}
        <SectionHeader title="Estoque por tamanho" />
        <Stack gap="md">
          {/* ENCERRAR ENCOMENDAS (RN-232): a contagem vendida de AGORA vira a foto
              da produção (todos os SKUs do item em estimativa → encomendado, numa
              transação do servidor). NÃO fecha as vendas — quem comprar depois
              aparece em "a encomendar". */}
          {itensComEncomendaAberta.length > 0 && (
            <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
              {itensComEncomendaAberta.map((itemId) => (
                <Button
                  key={itemId}
                  variant="secondary"
                  size="sm"
                  onClick={() => setEncerrando(itemId)}
                >
                  Encerrar encomendas · {nomeDoItem(itemId)}
                </Button>
              ))}
            </div>
          )}
          {skus.length === 0 ? (
            // EmptyState HONESTO: evento sem SKU tamanhado. Item único (sacochila)
            // não gera SKU por definição (S210-T3); os docs materializam com a
            // agregação da primeira venda confirmada.
            <EmptyState
              title="Nenhum SKU de tamanho neste evento"
              description="Só itens tamanhados (ex.: camiseta com P/M/G/GG) geram estoque por tamanho — itens únicos, como sacochila, não entram aqui. Os SKUs aparecem com a primeira venda confirmada após o item tamanhado ter tamanhos disponíveis cadastrados."
            />
          ) : (
            <Table
              columns={columnsSku}
              data={skus}
              keyExtractor={(r) => r.id}
              caption="Aprovisionamento por SKU (item × tamanho)"
            />
          )}
        </Stack>
      </section>

      {/* Backend-dependency HONESTO: movimentações exigem um livro-razão de
          estoque (entradas/saídas/ajustes) inexistente no agregado atual — o
          `historico[]` do SKU registra apenas transições da máquina (RN-226). */}
      <EmptyState
        title="Movimentações ainda não disponíveis"
        description="Entradas, saídas e ajustes de estoque dependem de um livro-razão de movimentações — ainda não computado neste evento."
      />

      <TransicaoSkuModal
        transicao={transicao}
        nomeDoItem={nomeDoItem}
        onFechar={() => setTransicao(null)}
        onConfirmar={confirmarTransicao}
      />

      {/* Confirmação do encerramento (RN-232) — semântica explícita: foto da
          produção, vendas seguem abertas. */}
      <ConfirmModal
        open={encerrando !== null}
        onOpenChange={(open) => {
          if (!open) setEncerrando(null);
        }}
        title="Encerrar encomendas do item?"
        {...(encerrando !== null ? { target: nomeDoItem(encerrando) } : {})}
        description="A contagem vendida de agora vira a encomenda de produção, por corte e tamanho."
        loses={['Os SKUs em estimativa passam a "Encomendado" com a contagem atual (a foto não muda depois)']}
        keeps={[
          'As vendas do kit continuam abertas — encerrar encomenda não trava a compra',
          'Quem comprar depois aparece em "a encomendar" quando o estoque chegar',
        ]}
        confirmLabel="Encerrar encomendas"
        cancelLabel="Cancelar"
        loading={busyEncerrar}
        onConfirm={() => void confirmarEncerramento()}
      />
    </Stack>
  );
}

// -----------------------------------------------------------------------------
// Linha de progresso de retirada — retirados/total + percentual + barra.
// -----------------------------------------------------------------------------

function LinhaProgresso({
  titulo,
  retirados,
  total,
  pct,
}: {
  titulo: string;
  retirados: number;
  total: number;
  pct: number;
}): JSX.Element {
  return (
    <Stack gap="xs">
      <div className="flex items-center justify-between text-[length:var(--font-size-sm)]">
        <span className="text-[var(--text-primary)]">{titulo}</span>
        <span className="text-[var(--text-secondary)]">
          {formatInt(retirados)} / {formatInt(total)} ({pct}%)
        </span>
      </div>
      <ProgressoBarra pct={pct} label={`Retirada de ${titulo}`} />
    </Stack>
  );
}

function Vazio(): JSX.Element {
  return (
    <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
      Sem inscritos confirmados nesta categoria.
    </p>
  );
}

// -----------------------------------------------------------------------------
// Modal de transição de SKU (RN-226) — coleta a QUANTIDADE da transição
// (encomendada/recebida). Reusa DS Modal/Input/Button (4 vias de fechamento).
// A validação REAL é do servidor (matriz canônica + guards); aqui só o básico
// de forma (inteiro ≥ 0) para não pagar round-trip por typo.
// -----------------------------------------------------------------------------

function TransicaoSkuModal({
  transicao,
  nomeDoItem,
  onFechar,
  onConfirmar,
}: {
  transicao: { row: Aprovisionamento; alvo: EstadoAprovisionamento } | null;
  nomeDoItem: (itemId: string) => string;
  onFechar: () => void;
  onConfirmar: (qtd: number) => Promise<void>;
}): JSX.Element {
  const [qtd, setQtd] = React.useState('');
  const [erro, setErro] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const aberto = transicao !== null;
  const receber = transicao?.alvo === 'em_estoque';

  // Pré-preenche ao abrir: a sugestão vem do DOC (aEncomendar / última
  // encomenda do historico) — nunca um ∑ recalculado aqui.
  React.useEffect(() => {
    if (!transicao) return;
    setQtd(String(qtdSugerida(transicao.row, transicao.alvo)));
    setErro(null);
  }, [transicao]);

  async function confirmar(): Promise<void> {
    // Estoque pelo parser único de contagem (FIX-PARSE-MILHAR): encomendar
    // "1.000" camisetas registrava UMA, e 1 passava na guarda de inteiro.
    // PARSE-1: texto ilegível passa a dizer POR QUE é ilegível — a frase única
    // respondia "informe um inteiro" tanto para "2,5" quanto para "abc" quanto
    // para campo em branco. A guarda de faixa (≥ 0) fica com a frase antiga.
    const lido = parseContagemPtBr(qtd);
    if (!lido.ok) {
      setErro(mensagemContagemInvalida(lido.motivo));
      return;
    }
    if (lido.valor < 0) {
      setErro('Informe um número inteiro maior ou igual a zero.');
      return;
    }
    setBusy(true);
    try {
      await onConfirmar(lido.valor);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={aberto}
      onOpenChange={(open) => {
        if (!open) onFechar();
      }}
      title={receber ? 'Receber em estoque' : 'Registrar encomenda'}
      footer={
        <div className="flex justify-end gap-[var(--spacing-3)]">
          <Button variant="secondary" onClick={onFechar} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void confirmar()} disabled={busy}>
            Confirmar
          </Button>
        </div>
      }
    >
      <Stack gap="lg">
        {transicao && (
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {nomeDoItem(transicao.row.itemId)}
            {transicao.row.corte !== 'unissex' && (
              <> · corte {CORTE_LABEL[transicao.row.corte].toLowerCase()}</>
            )}{' '}
            · tamanho {transicao.row.tamanho}
          </p>
        )}
        <Input
          id="transicao-sku-qtd"
          label={receber ? 'Quantidade recebida' : 'Quantidade a encomendar'}
          type="text"
          inputMode="numeric"
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
          {...(erro ? { errorMessage: erro } : {})}
        />
        <p className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
          {receber
            ? 'A quantidade recebida declara o estoque físico do SKU — o "a encomendar" e os alertas são recalculados pelo servidor.'
            : 'Sugestão pré-preenchida com o "a encomendar" atual (vendido − físico, calculado pelo servidor).'}
        </p>
      </Stack>
    </Modal>
  );
}

DistribuicaoView.displayName = 'DistribuicaoView';
