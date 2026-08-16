// =============================================================================
// ListaGlobal — a casca das DUAS listas globais do painel master (ADMIN-VISAO
// onda 4 · S1614-T2 e S1614-T3).
//
// A spec já tinha visto que "todos os eventos" e "todos os clubs" são a mesma
// tela duas vezes (03-spec.md · Parte 1): coleção raiz, tabela densa, recorte,
// paginação, coluna de tenant. O que muda entre elas são as COLUNAS e as
// palavras. Então a casca é uma só e cada tela entrega as suas — em vez de dois
// arquivos que nascem iguais e divergem no primeiro conserto.
//
// Presentational: estado async e callbacks entram por prop; nenhuma leitura
// acontece aqui. Composição sobre o DS (PageHeader, Toolbar, Table, EmptyState,
// Skeleton, Card, Button) — nenhum padrão reconstruído à mão.
//
// O CONTADOR é o gate da onda e por isso ele vive aqui, num lugar só: a
// paginação por cursor não conhece total, então o rótulo vem de
// `rotuloContagem` (_lib/listasGlobais.ts) e nunca apresenta o que está
// carregado como total do sistema.
// =============================================================================

import type { ReactNode } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  EmptyState,
  FilterBar,
  PageHeader,
  ResultCount,
  Skeleton,
  Table,
  type TableColumn,
} from '@leela/design-system';
import type { ListaGlobalState } from '../_data/listasGlobais';
import type { Substantivo } from '../_lib/listasGlobais';

export interface ListaGlobalProps<T> {
  titulo: string;
  subtitulo: string;
  /** Controles de recorte (chips de status, seletor de tenant). */
  recorte: ReactNode;
  estado: ListaGlobalState<T>;
  colunas: TableColumn<T>[];
  keyExtractor: (item: T) => string;
  /** `<caption>` da tabela — o que um leitor de tela ouve antes das linhas. */
  caption: string;
  substantivo: Substantivo;
  /** Clique na linha (a spec manda ir para a ficha do tenant dono). */
  onRowClick?: (item: T) => void;
  vazio: { titulo: string; descricao: string };
  erro: { titulo: string; descricao: string };
}

export function ListaGlobal<T>({
  titulo,
  subtitulo,
  recorte,
  estado,
  colunas,
  keyExtractor,
  caption,
  substantivo,
  onRowClick,
  vazio,
  erro,
}: ListaGlobalProps<T>): JSX.Element {
  // O contador só existe quando há o que contar — mesma condição que já
  // decidia a linha antes desta peça compor a `FilterBar` (erro e loading não
  // têm contagem, e a lista vazia já diz isso pelo `EmptyState`).
  const mostrarContador = estado.error === null && !estado.loading && estado.itens.length > 0;

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader title={titulo} subtitle={subtitulo} />

      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        <FilterBar
          label={substantivo.plural}
          facets={recorte}
          count={
            mostrarContador ? (
              <ResultCount
                visiveis={estado.itens.length}
                temMais={estado.temMais}
                substantivo={substantivo}
              />
            ) : undefined
          }
        />

        {estado.error !== null ? (
          <Card role="alert" className="border-l-4 border-l-[var(--border-danger)]">
            <CardHeader>
              <CardTitle>{erro.titulo}</CardTitle>
              <CardDescription>{erro.descricao}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="secondary" onClick={estado.refetch}>
                Tentar novamente
              </Button>
            </CardFooter>
          </Card>
        ) : estado.loading ? (
          <div
            role="status"
            aria-label={`Carregando ${substantivo.plural}`}
            className="flex flex-col gap-[var(--spacing-3)]"
          >
            <Skeleton variant="rect" className="h-40" />
          </div>
        ) : estado.itens.length === 0 ? (
          <EmptyState title={vazio.titulo} description={vazio.descricao} />
        ) : (
          <div className="flex flex-col gap-[var(--spacing-4)]">
            <Table
              columns={colunas}
              data={estado.itens}
              keyExtractor={keyExtractor}
              caption={caption}
              {...(onRowClick ? { onRowClick } : {})}
            />

            {estado.temMais ? (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  disabled={estado.loadingMore}
                  onClick={estado.carregarMais}
                >
                  {estado.loadingMore ? 'Carregando…' : 'Carregar mais'}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

ListaGlobal.displayName = 'ListaGlobal';
