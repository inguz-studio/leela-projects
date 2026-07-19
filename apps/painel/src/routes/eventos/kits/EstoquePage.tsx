// =============================================================================
// EstoquePage — container `/eventos/:slug/kits/estoque` (S205-T4 · S210-T4).
//
// WIRE FABLE-D: além de kits+inscritos (matriz kit×modalidade), carrega a
// subcoleção REAL `eventos/{id}/aprovisionamento/{sku}` via TanStack Query
// (useAprovisionamento — ADR-010) e o catálogo de itens (join visual de nome/
// ordem de tamanhos). A transição de estado (RN-226) desce como callback da
// mutation `useTransicaoAprovisionamento` (callable — escrita EXCLUSIVA de
// Function; invalida a chave de aprovisionamento no sucesso).
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import type { EstadoAprovisionamento } from '@leela/core';
import { EstoqueView } from './EstoqueView';
import { useKits, useItensKit } from '../_data/kits';
import { useTodosInscritos } from '../_data/inscritos';
import { useAprovisionamento } from '../_data/estoque';
import {
  useEncerrarEncomendasItem,
  useTransicaoAprovisionamento,
} from '../../../lib/query/mutations';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function EstoquePage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const kits = useKits(evento.id);
  const inscritos = useTodosInscritos(evento.id);
  const aprovisionamento = useAprovisionamento(evento.id);
  const itens = useItensKit(evento.id);
  const transicao = useTransicaoAprovisionamento(evento.id);
  const encerrar = useEncerrarEncomendasItem(evento.id);

  return (
    <EstoqueView
      kits={kits.data ?? []}
      inscritos={inscritos.data ?? []}
      modalidades={evento.modalidades}
      aprovisionamento={aprovisionamento.data ?? []}
      // Falha no catálogo NÃO derruba a tela: o nome degrada para o itemId do
      // próprio SKU (ausência honesta, não dado fake).
      itens={itens.data ?? []}
      onTransicao={(sku: string, novoEstado: EstadoAprovisionamento, qtd: number) =>
        transicao.mutateAsync({ sku, novoEstado, qtd }).then(() => undefined)
      }
      onEncerrarEncomendas={(itemId: string) => encerrar.mutateAsync({ itemId })}
      loading={kits.loading || inscritos.loading || aprovisionamento.loading || itens.loading}
      error={kits.error ?? inscritos.error ?? aprovisionamento.error}
    />
  );
}

EstoquePage.displayName = 'EstoquePage';
