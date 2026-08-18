// =============================================================================
// LotesView — MODALIDADES do evento, com os lotes de cada uma dentro
// (S316-T4 · E04 · ADR-012 · RN-500/501/502).
//
// A leva 22 do dono (17/08) re-ancorou esta tela: *"Essa área deve ser ali em
// Lotes. E chamaremos de Modalidades ao invés de Lotes, no menu secundário.
// Ali posso ou adicionar uma modalidade ou um lote dentro da modalidade."*
// **Modalidade é o pai, lote é o filho**, e as duas ações do topo são
// literalmente a frase dele.
//
// ⚠️ O ARQUIVO E A ROTA NÃO MUDAM DE NOME, e isso é regra, não preguiça: a
// RN-399 manda mudar o que a pessoa LÊ, não o identificador. O id da aba
// (`lotes`), o segmento da URL e o caminho do arquivo são identificadores; o
// rótulo é o que muda. Mesma régua da RN-572, que trocou "Cadastro" por
// "Gerenciamento" em Kits sem mover nada.
//
// ⛔ A RÉGUA QUE ESTA TELA NÃO PODE ESTOURAR (L-021): quem entra aqui dez vezes
// por semana entra para mexer em preço e vaga de lote, não para criar
// modalidade. **Editar um lote existente continua custando os mesmos toques de
// antes** — a linha da tabela e o `RowActions` dela estão intactos; tudo que
// nasceu é ao redor. O bloco por modalidade já existia (era ele quem agrupava);
// o que faltava era o nível de cima ter AÇÕES.
//
// O QUE MUDOU DE FATO:
//   1. "Adicionar modalidade" existe, no topo — a queixa que o dono repetiu
//      três vezes entre 10/08 e 17/08 era não achar onde;
//   2. cada bloco de modalidade ganha renomear e remover;
//   3. modalidade sem lote deixa de ser tabela vazia e vira O CONVITE, com o
//      botão que resolve;
//   4. ⚠️ COMPAT: lote cuja modalidade saiu da lista VOLTA a aparecer, num
//      bloco marcado. A tela antiga fazia `lotes.filter(l => l.modalidade === m)`
//      sobre `evento.modalidades` e o lote sumia sem erro e sem aviso, com o
//      preço dele ainda no banco e a Rule `modalidadeExisteNoEventoPai`
//      impedindo qualquer conserto. Nenhum documento é migrado — a leitura é
//      que passa a ser honesta;
//   5. os textos que declaravam a lacuna morreram no mesmo commit que a fecha
//      (a DIAG-PAINEL-LACUNAS os escreveu para a tela parar de mentir enquanto
//      a S316 não subisse; mantê-los agora seria a mentira oposta).
//
// Preço vigente e lote ativo continuam DERIVADOS do kernel (`precoVigente` /
// `loteAtivo`), nunca recalculados aqui.
// =============================================================================

import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  RowActions,
  SectionHeader,
  Skeleton,
  Table,
} from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import {
  capacidadeDoLote,
  loteAtivo,
  modalidadesDaTela,
  precoVigente,
  type Evento,
  type Lote,
} from '@leela/core';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { formatDataHoraCurta, formatDinheiro, formatInt } from '../_lib/format';
import { estadoLoteBadge, loteDesativavel, loteImutavel } from './_lib/loteForm';

export interface LotesViewProps {
  evento: Evento;
  lotes: Lote[];
  loading: boolean;
  error: Error | null;
  onNovoLote: (modalidade: string) => void;
  onEditarLote: (lote: Lote) => void;
  onRemoverLote: (lote: Lote) => void;
  /** Abre o ajuste de capacidade (reabrir vagas — S307-T2). */
  onAjustarCapacidade: (lote: Lote) => void;
  /** Ação rápida: encerrar a venda deste lote agora (frente E). */
  onDesativarLote: (lote: Lote) => void;
  /** Abre o modal de acrescentar modalidade (S316-T4). */
  onAdicionarModalidade: () => void;
  /** Abre o modal de renomear a modalidade (RN-501). */
  onRenomearModalidade: (modalidade: string) => void;
  /** Pede a remoção da modalidade — o servidor recusa nomeando (RN-502). */
  onRemoverModalidade: (modalidade: string) => void;
  /**
   * A lista de modalidades é editável? `false` quando o evento já tem
   * inscrição de qualquer status, inclusive PIX pendente (RN-500/RN-487). A
   * tela ESPELHA a fronteira; a Function é a autoridade.
   */
  podeEditarModalidades: boolean;
  /** Instante de referência (default `new Date()`) — injetável para teste. */
  agora?: Date;
}

export function LotesView({
  evento,
  lotes,
  loading,
  error,
  onNovoLote,
  onEditarLote,
  onRemoverLote,
  onAjustarCapacidade,
  onDesativarLote,
  onAdicionarModalidade,
  onRenomearModalidade,
  onRemoverModalidade,
  podeEditarModalidades,
  agora = new Date(),
}: LotesViewProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando modalidades" className="flex flex-col gap-[var(--spacing-4)]">
        <Skeleton variant="rect" className="h-40" />
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Não foi possível carregar as modalidades"
        description="Tente recarregar a página. Se persistir, verifique sua conexão."
      />
    );
  }

  // COMPAT (item 4 do cabeçalho): as do evento, na ordem do documento, mais as
  // que só existem nos lotes — estas marcadas como fora da lista.
  const blocos = modalidadesDaTela(
    evento.modalidades,
    lotes.map((l) => l.modalidade),
  );

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <SectionHeader
        title="Modalidades"
        description={
          'Cada modalidade tem sua própria sequência de lotes (Lote 1 → 2 → 3), com janela, ' +
          'vaga e preço próprios. A virada é automática: por data ou por esgotamento da vaga ' +
          '(o que ocorrer primeiro).'
        }
        action={
          podeEditarModalidades ? (
            <Button variant="primary" size="sm" onClick={onAdicionarModalidade}>
              <Plus className="h-[var(--icon-size)] w-[var(--icon-size)] [stroke-width:var(--icon-stroke)]" />
              Adicionar modalidade
            </Button>
          ) : undefined
        }
      />

      {!podeEditarModalidades ? (
        // Honesto e específico: o organizador precisa saber POR QUE o botão não
        // está lá, e o que continua podendo fazer.
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Este evento já tem inscrição registrada, e a lista de modalidades fica congelada a
          partir da primeira (inclusive PIX pendente). Preço, vaga e janela de cada lote
          continuam editáveis abaixo.
        </p>
      ) : null}

      {blocos.length === 0 ? (
        <EmptyState
          title="Este evento ainda não tem modalidade"
          description="A modalidade é a distância ou o percurso (5k, 21k, Kids 1k). Sem ela não há lote de preço para configurar."
          {...(podeEditarModalidades
            ? {
                action: (
                  <Button variant="primary" onClick={onAdicionarModalidade}>
                    <Plus className="h-[var(--icon-size)] w-[var(--icon-size)] [stroke-width:var(--icon-stroke)]" />
                    Adicionar a primeira modalidade
                  </Button>
                ),
              }
            : {})}
        />
      ) : (
        blocos.map(({ nome, orfa }) => (
          <ModalidadeBloco
            key={nome}
            modalidade={nome}
            orfa={orfa}
            lotes={lotes.filter((l) => l.modalidade === nome)}
            agora={agora}
            podeEditarModalidades={podeEditarModalidades}
            onNovoLote={onNovoLote}
            onEditarLote={onEditarLote}
            onRemoverLote={onRemoverLote}
            onAjustarCapacidade={onAjustarCapacidade}
            onDesativarLote={onDesativarLote}
            onRenomearModalidade={onRenomearModalidade}
            onRemoverModalidade={onRemoverModalidade}
            onAdicionarModalidade={onAdicionarModalidade}
          />
        ))
      )}
    </div>
  );
}

interface ModalidadeBlocoProps {
  modalidade: string;
  /** A modalidade sumiu de `evento.modalidades` mas ainda tem lote apontando. */
  orfa: boolean;
  lotes: Lote[];
  agora: Date;
  podeEditarModalidades: boolean;
  onNovoLote: (modalidade: string) => void;
  onEditarLote: (lote: Lote) => void;
  onRemoverLote: (lote: Lote) => void;
  onAjustarCapacidade: (lote: Lote) => void;
  onDesativarLote: (lote: Lote) => void;
  onRenomearModalidade: (modalidade: string) => void;
  onRemoverModalidade: (modalidade: string) => void;
  onAdicionarModalidade: () => void;
}

function ModalidadeBloco({
  modalidade,
  orfa,
  lotes,
  agora,
  podeEditarModalidades,
  onNovoLote,
  onEditarLote,
  onRemoverLote,
  onAjustarCapacidade,
  onDesativarLote,
  onRenomearModalidade,
  onRemoverModalidade,
  onAdicionarModalidade,
}: ModalidadeBlocoProps): JSX.Element {
  const ordenados = [...lotes].sort((a, b) => a.ordem - b.ordem);
  // Preço vigente e lote ativo: DERIVAÇÃO do kernel (RN-300/301) — sem
  // precoLegado (a config de preço-base de percurso é outra tela); sem lote
  // ativo = venda fechada/não iniciada.
  const preco = precoVigente({ lotesDaModalidade: ordenados, agora });
  const ativo = loteAtivo(ordenados, agora);

  const colunas: TableColumn<Lote>[] = [
    { key: 'ordem', header: 'Ordem', width: 72, render: (l) => `L${l.ordem}` },
    { key: 'nome', header: 'Lote', render: (l) => l.nome },
    {
      key: 'janela',
      header: 'Janela',
      render: (l) => `${formatDataHoraCurta(l.inicioEm)} → ${formatDataHoraCurta(l.fimEm)}`,
    },
    // Os TRÊS números em TRÊS colunas (D-1008-R12: "simplifique para
    // vendidos, disponiveis e total" — a coluna única "150 · 0 · 150" lia
    // como amontoado). Segue sem obrigar subtração de cabeça: os três números
    // continuam lado a lado, cada um com header próprio e alinhamento
    // numérico do padrão da Table (align right + tabular-nums).
    // `capacidadeDoLote` é a aritmética do kernel (disponível = configurado −
    // vendido, nunca negativo).
    {
      key: 'vendidos',
      header: 'Vendidos',
      align: 'right',
      render: (l) => (
        <span className="[font-variant-numeric:tabular-nums] text-[var(--text-secondary)]">
          {formatInt(capacidadeDoLote(l).vendido)}
        </span>
      ),
    },
    {
      key: 'disponiveis',
      header: 'Disponíveis',
      align: 'right',
      render: (l) => (
        <strong className="[font-variant-numeric:tabular-nums] font-[var(--font-weight-semibold)] text-[var(--text-success)]">
          {formatInt(capacidadeDoLote(l).disponivel)}
        </strong>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (l) => (
        <span className="[font-variant-numeric:tabular-nums] text-[var(--text-secondary)]">
          {formatInt(capacidadeDoLote(l).configurado)}
        </span>
      ),
    },
    {
      key: 'preco',
      header: 'Preço',
      align: 'right',
      render: (l) => formatDinheiro(l.preco),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (l) => {
        const badge = estadoLoteBadge(l, ordenados, agora);
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
  ];

  return (
    // Card CANÔNICO, não <section> cru com bg (mesma família do D-1008-R11):
    // sob o vidro --surface-raised é filme translúcido que só lê como cartão
    // com a receita de elevação do Card. role="region" + aria-label preservam
    // o landmark que o <section> nomeado dava.
    <Card
      role="region"
      aria-label={`Modalidade ${modalidade}`}
      className="flex flex-col gap-[var(--spacing-3)] p-[var(--spacing-5)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
            <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
              {modalidade}
            </h3>
            {orfa ? <Badge variant="alerta">Fora da lista do evento</Badge> : null}
            {preco !== null ? (
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                Preço vigente{' '}
                <strong className="font-[var(--font-weight-semibold)] text-[var(--text-brand)]">
                  {formatDinheiro(preco)}
                </strong>
                {ativo ? <> · lote ativo <strong className="text-[var(--text-primary)]">{ativo.nome}</strong></> : null}
              </span>
            ) : (
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                {ordenados.length === 0 ? 'Sem preço configurado' : 'Nenhum lote ativo (venda fechada ou não iniciada)'}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-[var(--spacing-2)]">
          {podeEditarModalidades && !orfa ? (
            <>
              <IconButton
                aria-label={`Renomear a modalidade ${modalidade}`}
                title={`Renomear a modalidade ${modalidade}`}
                onClick={() => onRenomearModalidade(modalidade)}
              >
                <Pencil />
              </IconButton>
              <IconButton
                aria-label={`Remover a modalidade ${modalidade}`}
                title={`Remover a modalidade ${modalidade}`}
                onClick={() => onRemoverModalidade(modalidade)}
              >
                <Trash2 />
              </IconButton>
            </>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => onNovoLote(modalidade)}>
            <Plus className="h-[var(--icon-size)] w-[var(--icon-size)] [stroke-width:var(--icon-stroke)]" />
            Novo lote
          </Button>
        </div>
      </header>

      {orfa ? (
        // COMPAT do acervo, com texto honesto: este lote existe, tem preço, e
        // NENHUMA escrita passa nele enquanto o nome não voltar para a lista —
        // a Rule `modalidadeExisteNoEventoPai` roda no create E no update.
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          {`Estes lotes apontam para "${modalidade}", que não está na lista de modalidades do evento. ` +
            'Enquanto o nome não voltar para a lista, nenhuma edição destes lotes é gravada. ' +
            (podeEditarModalidades
              ? 'Adicione a modalidade de novo para recuperá-los, ou remova os lotes.'
              : 'O evento já vendeu, então a lista está congelada — fale com o suporte.')}
        </p>
      ) : null}

      {ordenados.length === 0 ? (
        // O CONVITE, não a linha vazia. Modalidade sem lote é exatamente a
        // pergunta que o organizador não conseguia fazer antes ("qual delas
        // ainda não tem preço?"), e a resposta traz o botão que resolve.
        <EmptyState
          title="Nenhum lote nesta modalidade"
          description="Sem lote não há preço, e a modalidade não abre para venda. Configure o primeiro lote."
          action={
            <Button variant="primary" onClick={() => onNovoLote(modalidade)}>
              <Plus className="h-[var(--icon-size)] w-[var(--icon-size)] [stroke-width:var(--icon-stroke)]" />
              Configurar o primeiro lote
            </Button>
          }
        />
      ) : (
        <Table
          columns={colunas}
          data={ordenados}
          keyExtractor={(l) => l.id}
          caption={`Lotes de ${modalidade}`}
          emptyTitle="Nenhum lote nesta modalidade"
          emptyDescription="Configure o primeiro lote para abrir a venda desta modalidade."
          renderActions={(lote) => {
            // Desativar = encerrar a venda AGORA, mesmo com a janela vigente
            // (frente E). Só aparece habilitado enquanto o lote ainda vende: um
            // lote já encerrado não tem venda para interromper, e um lote
            // agendado (janela não aberta) sai por Remover.
            const desativavel = loteDesativavel(lote, agora);
            const imutavel = loteImutavel(lote);
            return (
              // Ícone no lugar do escrito (decisão do dono, 17/08). O `title` que
              // explicava o bloqueio virou parte do `label`: no RowActions o
              // rótulo É o nome acessível E a dica, então a razão do bloqueio
              // continua chegando pelos dois canais, sem atributo paralelo.
              <RowActions
                actions={[
                  {
                    id: 'editar',
                    label: `Editar lote ${lote.nome}`,
                    verbo: 'editar',
                    onClick: () => onEditarLote(lote),
                  },
                  {
                    id: 'capacidade',
                    label: `Ajustar capacidade do lote ${lote.nome}`,
                    verbo: 'capacidade',
                    onClick: () => onAjustarCapacidade(lote),
                  },
                  {
                    id: 'desativar',
                    label: desativavel
                      ? `Desativar lote ${lote.nome} (encerra a venda agora)`
                      : `Desativar lote ${lote.nome} (já não está vendendo)`,
                    verbo: 'desativar',
                    onClick: () => onDesativarLote(lote),
                    destructive: true,
                    disabled: !desativavel,
                  },
                  {
                    id: 'remover',
                    label: imutavel
                      ? `Remover lote ${lote.nome} (já vendeu, não pode ser removido)`
                      : `Remover lote ${lote.nome}`,
                    verbo: 'remover',
                    onClick: () => onRemoverLote(lote),
                    destructive: true,
                    disabled: imutavel,
                  },
                ]}
              />
            );
          }}
        />
      )}

      {orfa && podeEditarModalidades ? (
        <div>
          <Button variant="secondary" size="sm" onClick={onAdicionarModalidade}>
            <Plus className="h-[var(--icon-size)] w-[var(--icon-size)] [stroke-width:var(--icon-stroke)]" />
            {`Trazer "${modalidade}" de volta para a lista`}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

LotesView.displayName = 'LotesView';
