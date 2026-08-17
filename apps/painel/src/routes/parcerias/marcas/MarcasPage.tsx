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
// o papel do registro.
//
// MARCA NÃO SE APAGA (PATROCINADOR-TOGGLE · decisão do dono de 09/08,
// `02-rodadas/2026-08-09-decisoes-dono/01-decisoes-dono.md` §20). O botão
// Excluir saiu da tela e a porta de exclusão saiu do api-client junto: a marca
// desligada some do autocomplete de patrocínios NOVOS e continua no registro,
// com o estado visível, para poder voltar. Patrocínios já cadastrados em
// eventos e clubes nunca foram tocados — são cópias independentes —, e agora
// isso é provado por teste em vez de descrito num modal de exclusão.
//
// O CONTROLE É O `Switch` DO DS, E O AVISO É O TOAST. Cânone §3: liga/desliga
// com efeito imediato é `Switch`; `Checkbox` é o que espera Submit. O
// `ConfirmModal` ficou para trás de propósito — ele existe para ação
// DESTRUTIVA (cânone §8, botão `destructive`), e vestir de vermelho um gesto
// reversível ensinaria de novo o medo que esta decisão removeu. O "avisando"
// que o dono pediu é a frase genérica do §20, e ela sai no toast da escrita
// (cânone §11), dizendo o que muda e o que não muda.
//
// O NÚMERO DE PATROCÍNIOS AFETADOS CONTINUA FORA. Ele exige o leitor barato que
// o E10-S812 nunca teve; a frase genérica é o que cabe hoje, e trocá-la pelo
// número custa uma string no dia em que o S812 sair do gelo.
//
// Owner-scoped por `uid` (Rules: uid == profId) — a lista é a do profissional
// logado, curta e pessoal; a busca roda no cliente sobre ela.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  PageHeader,
  ResultCount,
  SearchInput,
  Skeleton,
  Switch,
  Table,
  Thumb,
  useToast,
  type TableColumn,
} from '@leela/design-system';
import type { Marca, StatusMarca } from '@leela/core';
import { siglaDe } from '@/lib/sigla';
import { useMarcasSession } from './_data/session';
import {
  definirStatusDaMarcaDoProfissional,
  salvarMarcaDoProfissional,
  uploadLogoDaMarca,
  useMarcas,
} from './_data/marcas';
import { MarcaFormModal } from './MarcaFormModal';
import type { MarcaInput } from '@leela/core';

/**
 * O "avisando" do dono, em frase genérica (§20). Uma string: o dia em que o
 * E10-S812 entregar a contagem, ela vira o número de patrocínios afetados.
 */
const AVISO_DESLIGAR =
  'Ela não aparece mais no autocomplete ao cadastrar patrocínios novos. Os patrocínios já cadastrados em eventos e clubes continuam intactos, e você pode religar quando quiser.';

const AVISO_LIGAR = 'Ela volta a aparecer no autocomplete ao cadastrar patrocínios novos.';

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

/**
 * Miniatura do logo 1:1 na linha da marca (RN-171 · RN-236). Era um par
 * `img`/`div` à mão aqui dentro; virou o `Thumb` do DS, que traz de graça o
 * `loading="lazy"` que faltava (a lista é do profissional, mas cresce), a
 * medida por token e a degradação para a sigla quando a URL do Storage morre —
 * antes uma URL revogada deixava o quadrado quebrado do navegador na tabela.
 *
 * O `alt` continua nomeando a marca porque aqui a coluna do logo vem ANTES da
 * coluna do nome e o cabeçalho dela é vazio: sem `alt` a célula seria muda.
 */
function LogoCell({ marca }: { marca: Marca }): JSX.Element {
  return (
    <Thumb
      src={marca.logoUrl}
      alt={marca.logoUrl ? `Logo de ${marca.nome}` : ''}
      fallback={siglaDe(marca.nome)}
    />
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
  // Estado recém-escrito, aplicado por cima do retrato do reader. O toggle
  // NÃO faz refetch: uma volta ao servidor só para reler o campo que acabamos
  // de escrever deixaria o controle inerte por um instante, que é o defeito de
  // interruptor que não responde. A sobreposição morre quando o reader traz
  // uma lista nova (salvar, criar, retry) — o servidor é quem manda.
  const [statusLocal, setStatusLocal] = useState<Record<string, StatusMarca>>({});
  const [alternando, setAlternando] = useState<string | null>(null);

  useEffect(() => setStatusLocal({}), [itens]);

  const lista = useMemo(
    () => itens.map((m) => (statusLocal[m.id] ? { ...m, status: statusLocal[m.id]! } : m)),
    [itens, statusLocal],
  );

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);
    if (termo === '') return lista;
    return lista.filter((m) => normalizar(m.nome).includes(termo));
  }, [lista, busca]);

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

  /** Liga/desliga a marca no registro, com o aviso do §20 no toast da escrita. */
  async function alternarStatus(m: Marca, ligada: boolean): Promise<void> {
    if (!uid) return;
    const novo: StatusMarca = ligada ? 'ativa' : 'inativa';
    setAlternando(m.id);
    try {
      await definirStatusDaMarcaDoProfissional(uid, m.id, novo);
      setStatusLocal((s) => ({ ...s, [m.id]: novo }));
      toast({
        variant: 'success',
        title: ligada ? `${m.nome} ativada` : `${m.nome} desativada`,
        description: ligada ? AVISO_LIGAR : AVISO_DESLIGAR,
      });
    } catch {
      toast({
        variant: 'danger',
        title: ligada
          ? 'Não foi possível ativar a marca'
          : 'Não foi possível desativar a marca',
      });
    } finally {
      setAlternando(null);
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
        // O estado é rótulo (`Badge`, cânone §4) e o controle é `Switch`
        // (cânone §3). O nome acessível do interruptor nomeia a MARCA e o que
        // o estado governa, e não o estado em si: um rótulo que muda junto com
        // a posição do controle deixa a lista com cinco controles chamados
        // "Ativa" e ninguém sabe qual é qual fora da leitura visual.
        key: 'estado',
        header: 'No autocomplete',
        render: (m) => {
          const ativa = m.status === 'ativa';
          return (
            <div className="flex items-center gap-[var(--spacing-3)]">
              <Switch
                checked={ativa}
                disabled={alternando !== null}
                aria-label={`${m.nome}: aparecer no autocomplete de patrocínios novos`}
                onCheckedChange={(v) => void alternarStatus(m, v)}
              />
              <Badge variant={ativa ? 'vitoria' : 'neutro'}>{ativa ? 'Ativa' : 'Inativa'}</Badge>
            </div>
          );
        },
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
          </div>
        ),
      },
    ],
    [alternando, uid],
  );

  const semSessao = session.status === 'anonymous';

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Marcas"
        subtitle="Seus patrocinadores reutilizáveis num lugar só. Cadastre uma vez e reaproveite no autocomplete ao vincular patrocínios em eventos e clubes. Marca desativada sai do autocomplete e continua aqui, para voltar quando você quiser."
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
            <FilterBar
              label="marcas"
              search={
                <SearchInput
                  id="marcas-busca"
                  aria-label="Buscar marca por nome"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome da marca (ex.: CDL)"
                  shortcutLabel={null}
                />
              }
            />

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
      <ResultCount
        visiveis={filtradas.length}
        total={total}
        substantivo={{ singular: 'marca', plural: 'marcas' }}
      />
    </div>
  );
}

MarcasPage.displayName = 'MarcasPage';
