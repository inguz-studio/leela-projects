// =============================================================================
// CuponsSection — bloco "Cupons" DENTRO da tela da página de vendas (S300-T5 ·
// E04). Auto-contido: lê os cupons do evento (TanStack Query — ADR-010) e
// orquestra o CupomModal (criar/editar) + o ConfirmModal de remoção (§2.15) +
// copiar código (glossário). Renderizado pelo container `PaginaVendasPage` como
// mais um bloco empilhado — a tela existente (PaginaVendasView) NÃO é refeita.
//
// DECISÃO DE PLACEMENT (registrada): cupom vive como SEÇÃO na tela da página de
// vendas (não sub-rota). O surface do brief põe o CupomModal sob
// `pagina-vendas/_components`; a tela é uma pilha de blocos independentes
// (publicação, seções, SEO) e uma tabela + um modal são leves demais para
// justificar uma sub-rota. Segue o padrão dos blocos existentes.
//
// `usos` (≡ usosFeitos) é read-only do servidor (∑ de Function/checkout — E12):
// a seção só o EXIBE; o incremento é do checkout, nunca escrito aqui. Remover é
// bloqueado quando `usos > 0` (espelha o delete da Rule).
// =============================================================================

import * as React from 'react';
import { Badge, Button, ConfirmModal, EmptyState, Skeleton, Table, useToast } from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import type { Cupom } from '@leela/core';
import { Copy, Plus } from 'lucide-react';
import { CupomModal } from './CupomModal';
import { useCupomMutations, useCupons } from '../../_data/cupons';
import { estadoCupomBadge, labelDesconto, labelUsos } from '../_lib/cupomForm';
import { formatDataCurta } from '../../_lib/format';

export interface CuponsSectionProps {
  eventoId: string;
  /** Instante de referência (default `new Date()`) — injetável para teste. */
  agora?: Date;
}

/** `usos > 0` → cupom com desconto já aplicado; a Rule veta a remoção. @pure */
function cupomUsado(cupom: Pick<Cupom, 'usos'>): boolean {
  return cupom.usos > 0;
}

export function CuponsSection({ eventoId, agora = new Date() }: CuponsSectionProps): JSX.Element {
  const { toast } = useToast();
  const { data: cupons, loading, error } = useCupons(eventoId);
  const { salvar, remover } = useCupomMutations(eventoId);

  const [modalAberto, setModalAberto] = React.useState(false);
  const [cupomEmEdicao, setCupomEmEdicao] = React.useState<Cupom | null>(null);

  const [cupomParaRemover, setCupomParaRemover] = React.useState<Cupom | null>(null);
  const [removendo, setRemovendo] = React.useState(false);

  const todos = cupons ?? [];
  const codigosExistentes = React.useMemo(() => todos.map((c) => c.id), [todos]);

  function abrirNovo(): void {
    setCupomEmEdicao(null);
    setModalAberto(true);
  }

  function abrirEdicao(cupom: Cupom): void {
    setCupomEmEdicao(cupom);
    setModalAberto(true);
  }

  async function copiarCodigo(codigo: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(codigo);
      toast({ title: `Cupom ${codigo} copiado`, variant: 'success' });
    } catch {
      toast({ title: 'Não foi possível copiar o código', variant: 'danger' });
    }
  }

  async function confirmarRemocao(): Promise<void> {
    if (!cupomParaRemover) return;
    setRemovendo(true);
    try {
      await remover(cupomParaRemover.id);
      toast({ title: 'Cupom removido', variant: 'success' });
      setCupomParaRemover(null);
    } catch {
      toast({ title: 'Falha ao remover o cupom', variant: 'danger' });
    } finally {
      setRemovendo(false);
    }
  }

  const colunas: TableColumn<Cupom>[] = [
    {
      key: 'codigo',
      header: 'Código',
      render: (c) => (
        <code className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {c.codigo}
        </code>
      ),
    },
    { key: 'desconto', header: 'Desconto', render: (c) => labelDesconto(c) },
    {
      key: 'validade',
      header: 'Validade',
      render: (c) => `${formatDataCurta(c.inicioEm)} → ${formatDataCurta(c.fimEm)}`,
    },
    { key: 'usos', header: 'Usos', align: 'right', render: (c) => labelUsos(c) },
    {
      key: 'estado',
      header: 'Estado',
      render: (c) => {
        const badge = estadoCupomBadge(c, agora);
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
  ];

  return (
    <section
      aria-label="Cupons de desconto"
      className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
            Cupons
          </h3>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            Descontos simples aplicados no checkout. Cada cupom tem código único, tipo
            (percentual ou valor fixo), validade e um limite de usos opcional.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={abrirNovo}>
          <Plus className="h-[var(--icon-size)] w-[var(--icon-size)] [stroke-width:var(--icon-stroke)]" />
          Novo cupom
        </Button>
      </header>

      {loading ? (
        <div role="status" aria-label="Carregando cupons" className="flex flex-col gap-[var(--spacing-3)]">
          <Skeleton variant="rect" className="h-12" />
          <Skeleton variant="rect" className="h-12" />
        </div>
      ) : error ? (
        <EmptyState
          title="Não foi possível carregar os cupons"
          description="Tente recarregar a página. Se persistir, verifique sua conexão."
        />
      ) : (
        <Table
          columns={colunas}
          data={todos}
          keyExtractor={(c) => c.id}
          caption="Cupons de desconto do evento"
          emptyTitle="Nenhum cupom criado"
          emptyDescription="Crie um cupom para oferecer desconto no checkout deste evento."
          renderActions={(cupom) => (
            <div className="flex items-center gap-[var(--spacing-2)]">
              <Button variant="ghost" size="sm" onClick={() => void copiarCodigo(cupom.codigo)}>
                <Copy className="h-[var(--icon-size)] w-[var(--icon-size)] [stroke-width:var(--icon-stroke)]" />
                Copiar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => abrirEdicao(cupom)}>
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCupomParaRemover(cupom)}
                disabled={cupomUsado(cupom)}
                title={cupomUsado(cupom) ? 'Cupom já usado não pode ser removido' : undefined}
              >
                Remover
              </Button>
            </div>
          )}
        />
      )}

      <CupomModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        cupom={cupomEmEdicao}
        codigosExistentes={codigosExistentes}
        onSalvar={salvar}
      />

      <ConfirmModal
        open={cupomParaRemover !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setCupomParaRemover(null);
        }}
        title="Remover cupom"
        {...(cupomParaRemover ? { description: `Cupom ${cupomParaRemover.codigo}` } : {})}
        loses={['O código para de valer no checkout deste evento']}
        keeps={['As inscrições que já usaram o cupom permanecem intactas']}
        confirmLabel="Remover cupom"
        loading={removendo}
        onConfirm={() => void confirmarRemocao()}
      />
    </section>
  );
}

CuponsSection.displayName = 'CuponsSection';
