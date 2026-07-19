// =============================================================================
// MarcasPage — módulo "Marcas" do painel (`/marcas`, E10 · S811 seed · RN-171).
// Um lugar único para o profissional gerenciar seus patrocinadores/marcas
// reutilizáveis: lista densa (logo 1:1 + nome + modelo comercial), busca por
// nome, contador "mostrando X de Y", criar/editar (modal) e excluir com
// ConfirmModal de consequências honestas.
//
// HONESTIDADE DE DADO (RN-171 recorte): NÃO exibimos "em quantos patrocínios a
// marca é usada" — a consolidação de ativações é o E10-S812 (Icebox) e não há
// reader barato neste recorte. Em vez de um número inventado, a página explica
// o papel do registro. Excluir remove o doc do registro reutilizável: a marca
// sai do autocomplete de patrocínios FUTUROS; patrocínios já cadastrados em
// eventos/clubes são cópias independentes e permanecem intactos.
//
// Owner-scoped por `uid` (Rules: uid == profId) — a lista é a do profissional
// logado, curta e pessoal; a busca roda no cliente sobre ela.
// =============================================================================

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  ConfirmModal,
  EmptyState,
  PageHeader,
  SearchInput,
  Skeleton,
  Table,
  useToast,
  type TableColumn,
} from '@leela/design-system';
import type { Marca } from '@leela/core';
import { useMarcasSession } from './_data/session';
import {
  excluirMarcaDoProfissional,
  salvarMarcaDoProfissional,
  uploadLogoDaMarca,
  useMarcas,
} from './_data/marcas';
import { MarcaFormModal } from './MarcaFormModal';
import type { MarcaInput } from '@leela/core';

function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

/** Normaliza para busca acento-insensível. */
function normalizar(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function LogoCell({ marca }: { marca: Marca }): JSX.Element {
  if (marca.logoUrl) {
    return (
      <img
        src={marca.logoUrl}
        alt={`Logo de ${marca.nome}`}
        className="h-10 w-10 rounded-[var(--radius-md)] object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-tertiary)]"
    >
      {marca.nome.trim().charAt(0).toUpperCase() || '—'}
    </div>
  );
}

export function MarcasPage(): JSX.Element {
  const session = useMarcasSession();
  const uid = session.uid;
  const { toast } = useToast();
  const { itens, loading, error, refetch } = useMarcas(uid);

  const [busca, setBusca] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Marca | null>(null);
  const [excluir, setExcluir] = useState<Marca | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);
    if (termo === '') return itens;
    return itens.filter((m) => normalizar(m.nome).includes(termo));
  }, [itens, busca]);

  function abrirNova(): void {
    setEditando(null);
    setFormAberto(true);
  }

  function abrirEdicao(m: Marca): void {
    setEditando(m);
    setFormAberto(true);
  }

  async function salvar(input: MarcaInput, marcaId?: string): Promise<void> {
    if (!uid) return;
    try {
      await salvarMarcaDoProfissional(uid, input, marcaId);
      toast({
        variant: 'success',
        title: marcaId ? `${input.nome} atualizada` : `${input.nome} adicionada ao registro`,
      });
      refetch();
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível salvar a marca' });
      throw new Error('salvar-marca-falhou');
    }
  }

  async function uploadLogo(marcaId: string | null, nome: string, file: File): Promise<string> {
    return uploadLogoDaMarca(marcaId, nome, file);
  }

  async function confirmarExclusao(): Promise<void> {
    if (!uid || !excluir) return;
    setExcluindo(true);
    try {
      await excluirMarcaDoProfissional(uid, excluir.id);
      toast({ variant: 'success', title: `${excluir.nome} removida do registro` });
      setExcluir(null);
      refetch();
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível excluir a marca' });
    } finally {
      setExcluindo(false);
    }
  }

  const cols = useMemo<TableColumn<Marca>[]>(
    () => [
      { key: 'logo', header: '', render: (m) => <LogoCell marca={m} /> },
      {
        key: 'nome',
        header: 'Marca',
        render: (m) => (
          <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {m.nome}
          </span>
        ),
      },
      {
        key: 'modelo',
        header: 'Modelo comercial',
        render: (m) => (
          <Badge variant={m.modeloComercial === 'financeiro' ? 'brand' : 'neutro'}>
            {m.modeloComercial === 'financeiro' ? 'Financeiro' : 'Permuta'}
          </Badge>
        ),
      },
      {
        key: 'resumo',
        header: 'Detalhe',
        render: (m) =>
          m.modeloComercial === 'financeiro' && typeof m.valorAnual === 'number' ? (
            <span className="text-[var(--text-secondary)]">{formatBRL(m.valorAnual)}/ano</span>
          ) : m.contrapartida ? (
            <span className="line-clamp-1 max-w-xs text-[var(--text-secondary)]">
              {m.contrapartida}
            </span>
          ) : (
            <span className="text-[var(--text-tertiary)]">—</span>
          ),
      },
      {
        key: 'acoes',
        header: '',
        align: 'right',
        render: (m) => (
          <div className="flex justify-end gap-[var(--spacing-2)]">
            <Button variant="secondary" size="sm" onClick={() => abrirEdicao(m)}>
              Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExcluir(m)}>
              Excluir
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const semSessao = session.status === 'anonymous';

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Marcas"
        subtitle="Seus patrocinadores reutilizáveis num lugar só. Cadastre uma vez e reaproveite no autocomplete ao vincular patrocínios em eventos e clubes."
        actions={
          !semSessao ? (
            <Button variant="primary" onClick={abrirNova} disabled={!uid}>
              Nova marca
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        {semSessao ? (
          <EmptyState
            title="Entre para gerenciar suas marcas"
            description="Seu registro de patrocinadores é pessoal. Faça login para vê-lo."
          />
        ) : session.status === 'loading' ? (
          <div role="status" aria-label="Carregando marcas" className="flex flex-col gap-[var(--spacing-4)]">
            <Skeleton variant="rect" className="h-12" />
            <Skeleton variant="rect" className="h-48" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-[var(--spacing-4)]">
              <SearchInput
                id="marcas-busca"
                aria-label="Buscar marca por nome"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome da marca (ex.: CDL)"
                shortcutLabel={null}
                className="w-full max-w-md flex-1"
              />
            </div>

            <Conteudo
              loading={loading}
              error={error}
              total={itens.length}
              filtradas={filtradas}
              busca={busca.trim()}
              colunas={cols}
              onRefetch={refetch}
              onNova={abrirNova}
            />
          </>
        )}
      </div>

      <MarcaFormModal
        open={formAberto}
        onOpenChange={setFormAberto}
        initial={editando}
        onSalvar={salvar}
        onUploadLogo={uploadLogo}
      />

      <ConfirmModal
        open={excluir !== null}
        onOpenChange={(o) => {
          if (!o) setExcluir(null);
        }}
        title="Excluir marca do registro?"
        description="Esta marca sai do seu registro reutilizável de patrocinadores."
        target={excluir?.nome}
        loses={[
          'Não aparece mais no autocomplete ao cadastrar patrocínios futuros — você teria de digitar tudo de novo.',
        ]}
        keeps={[
          'Patrocínios já cadastrados em eventos e clubes continuam intactos (são cópias independentes desta marca).',
          'Você pode cadastrar a marca de novo quando quiser.',
        ]}
        confirmLabel="Excluir marca"
        loading={excluindo}
        onConfirm={() => void confirmarExclusao()}
      />
    </div>
  );
}

function Conteudo({
  loading,
  error,
  total,
  filtradas,
  busca,
  colunas,
  onRefetch,
  onNova,
}: {
  loading: boolean;
  error: Error | null;
  total: number;
  filtradas: Marca[];
  busca: string;
  colunas: TableColumn<Marca>[];
  onRefetch: () => void;
  onNova: () => void;
}): JSX.Element {
  if (error !== null) {
    return (
      <div
        role="alert"
        className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
      >
        Não foi possível carregar suas marcas.{' '}
        <button type="button" className="underline" onClick={onRefetch}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (loading) {
    return (
      <div role="status" aria-label="Carregando marcas" className="flex flex-col gap-[var(--spacing-3)]">
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }
  if (total === 0) {
    return (
      <EmptyState
        title="Nenhuma marca cadastrada ainda"
        description="Cadastre seus patrocinadores aqui para reaproveitá-los ao vincular patrocínios nos eventos e clubes. Toda marca cadastrada num patrocínio também aparece nesta lista."
        action={
          <Button variant="primary" onClick={onNova}>
            Cadastrar primeira marca
          </Button>
        }
      />
    );
  }
  if (filtradas.length === 0) {
    return (
      <EmptyState
        title="Nada encontrado"
        description={`Nenhuma marca casa com "${busca}". Ajuste o termo da busca.`}
      />
    );
  }
  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <Table
        columns={colunas}
        data={filtradas}
        keyExtractor={(m) => m.id}
        caption="Marcas/patrocinadores do profissional"
      />
      <p
        className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
        aria-live="polite"
      >
        Mostrando {filtradas.length} de {total} {total === 1 ? 'marca' : 'marcas'}
      </p>
    </div>
  );
}

MarcasPage.displayName = 'MarcasPage';
