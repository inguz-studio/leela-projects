// =============================================================================
// DistribuicaoPage — container da aba ÚNICA `/eventos/:slug/kits/distribuicao`
// (S205-T4 · S210-T4 · S1258).
//
// Depois da unificação da leva 11 este container carrega o que as DUAS abas
// carregavam: kits + inscritos (progresso de retirada e matriz kit×modalidade),
// a subcoleção REAL `eventos/{id}/aprovisionamento/{sku}` via TanStack Query
// (useAprovisionamento — ADR-010) e o catálogo de itens (join visual de nome/
// ordem de tamanhos). A transição de estado (RN-226) desce como callback da
// mutation `useTransicaoAprovisionamento` (callable — escrita EXCLUSIVA de
// Function; invalida a chave de aprovisionamento no sucesso).
//
// As quatro queries compartilham chave com o resto da área, então a aba única
// não faz mais requisição que as duas abas faziam separadas — o cache do
// TanStack Query já servia `inscritos` para as duas.
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import type { EstadoAprovisionamento } from '@leela/core';
import { DistribuicaoView } from './DistribuicaoView';
import { useKits, useItensKit } from '../_data/kits';
import { useTodosInscritos } from '../_data/inscritos';
import { useAprovisionamento } from '../_data/estoque';
import {
  useEncerrarEncomendasItem,
  useTransicaoAprovisionamento,
} from '../../../lib/query/mutations';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function DistribuicaoPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const kits = useKits(evento.id);
  const inscritos = useTodosInscritos(evento.id);
  const aprovisionamento = useAprovisionamento(evento.id);
  const itens = useItensKit(evento.id);
  const transicao = useTransicaoAprovisionamento(evento.id);
  const encerrar = useEncerrarEncomendasItem(evento.id);

  return (
    <DistribuicaoView
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

DistribuicaoPage.displayName = 'DistribuicaoPage';
