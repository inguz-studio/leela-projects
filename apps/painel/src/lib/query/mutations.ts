// =============================================================================
// Gateway de MUTATIONS — o lado ESCRITA do narrow-waist (Fowler), par do
// `queries.ts`. Cada hook devolve um `useMutation` keyed que REUSA as funções
// de escrita já provadas do @leela/api-client (criarEvento via Cloud Function,
// salvarKit direto) e, no `onSuccess`, INVALIDA as chaves de leitura afetadas.
//
// Consequência (read-your-writes, Kleppmann): criar um evento invalida a chave
// `eventos.doOrganizador` — a MESMA que o Hub e a Visão Geral leem — então a
// lista reflete a escrita SEM refresh manual (o cache revalida sozinho). Nada
// de refetch cego nos callers nem estado de "reload" espalhado: a chave é o
// contrato de partilha, a invalidação é a única fonte de revalidação (ADR-010).
//
// Não reescreve as Functions nem o api-client: só fia escrita → invalidação.
// `functions/src` continua a fonte única da regra de negócio (ADR-005).
// =============================================================================

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import {
  criarEvento,
  criarPatrocinador,
  getLeelaDb,
  getLeelaFunctions,
  removerMembro,
  salvarKit,
  transferirPropriedade,
  transicionarParceria,
  type CriarEventoInput,
  type CriarEventoResult,
  type CriarPatrocinadorInput,
  type RemoverMembroResult,
  type SalvarKitInput,
  type TransferirPropriedadeResult,
} from '@leela/api-client';
import type { StatusParceria } from '@leela/core';
import { queryKeys } from './keys';

/**
 * Cria um evento (rascunho) via Cloud Function `criarEvento` e invalida a lista
 * do organizador + a Visão Geral (leem a MESMA chave `eventos.doOrganizador`) e
 * o `overview` (KPIs contam eventos). É a porta de escrita do GATE S201: após
 * o submit, o Hub `/eventos` mostra o evento novo sem o produtor recarregar.
 */
export function useCriarEvento(params: {
  tenantId: string;
  organizadorId: string;
}): UseMutationResult<CriarEventoResult, Error, CriarEventoInput> {
  const queryClient = useQueryClient();
  return useMutation<CriarEventoResult, Error, CriarEventoInput>({
    mutationFn: (input) => criarEvento(getLeelaFunctions(), input),
    onSuccess: () => {
      // read-your-writes: a chave partilhada Hub ↔ Visão Geral revalida; o
      // overview reconta os KPIs. `void` — a UI (navegação/Toast) não espera
      // o refetch, a lista atualiza quando ele chega (bounded staleness).
      void queryClient.invalidateQueries({
        queryKey: queryKeys.eventos.doOrganizador(params.tenantId, params.organizadorId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });
}

/** Variáveis de `useSalvarKit`: qual kit (id) e o payload já com tenantId. */
export interface SalvarKitVars {
  kitId: string;
  input: SalvarKitInput;
}

/**
 * Salva (cria/edita) um kit do evento e invalida a FAMÍLIA de chaves de kits
 * daquele evento (`['kits','do-evento',eventoId, *]`) — a invalidação por
 * prefixo atinge qualquer `reloadKey`, então o Cadastro reflete o kit salvo ao
 * voltar do editor, sem contador de reload manual. Reusa `salvarKit` do
 * api-client (kit é configuração do organizador, write direto — não Function).
 */
export function useSalvarKit(
  eventoId: string,
): UseMutationResult<void, Error, SalvarKitVars> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, SalvarKitVars>({
    mutationFn: ({ kitId, input }) => salvarKit(getLeelaDb(), eventoId, kitId, input),
    onSuccess: () => {
      // Prefixo da família (sem reloadKey) — casa todas as entradas do evento.
      void queryClient.invalidateQueries({ queryKey: ['kits', 'do-evento', eventoId] });
    },
  });
}

// =============================================================================
// Mutations de CLUBE (E05) — lote FID-CLUBES-F0. Cada uma reusa a escrita
// provada do api-client e, no onSuccess, invalida a chave de leitura afetada do
// clube (a MESMA que o hook de leitura consome): remover/transferir membro →
// membros.doClube; transicionar/adicionar parceria → parcerias.doClube. Read-
// your-writes declarativo — a lista reflete a escrita sem `reload()` manual
// (aposenta o contador de refetch dos containers, ADR-010).
// =============================================================================

/**
 * Remove um membro do clube (callable — recontagem ∑ no servidor) e invalida a
 * lista de membros daquele clube: a tabela reflete a remoção sem reload manual.
 * O erro `failed-precondition` (owner não removível, RN-106) sobe intacto para a
 * UI distinguir a mensagem (a tela usa isFailedPrecondition).
 */
export function useRemoverMembro(
  clubeId: string,
): UseMutationResult<RemoverMembroResult, Error, string> {
  const queryClient = useQueryClient();
  return useMutation<RemoverMembroResult, Error, string>({
    mutationFn: (membroId) => removerMembro(getLeelaFunctions(), clubeId, membroId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.membros.doClube(clubeId) });
    },
  });
}

/**
 * Transfere a propriedade do clube (transação atômica) e invalida a lista de
 * membros (o papel `owner` migra de linha — a tabela precisa refletir).
 */
export function useTransferirPropriedade(
  clubeId: string,
): UseMutationResult<TransferirPropriedadeResult, Error, string> {
  const queryClient = useQueryClient();
  return useMutation<TransferirPropriedadeResult, Error, string>({
    mutationFn: (membroId) => transferirPropriedade(getLeelaFunctions(), clubeId, membroId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.membros.doClube(clubeId) });
    },
  });
}

/** Variáveis de `useTransicionarParceria`: qual parceria e o novo status. */
export interface TransicionarParceriaVars {
  parceriaId: string;
  status: StatusParceria;
}

/**
 * Transiciona o status de uma parceria (aceitar/recusar/desativar — RN-120/122,
 * write direto guardado pelas Rules) e invalida a lista de parcerias do clube:
 * o convite sai de "pendentes" / o patrocinador muda de estado sem reload.
 */
export function useTransicionarParceria(
  clubeId: string,
): UseMutationResult<void, Error, TransicionarParceriaVars> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, TransicionarParceriaVars>({
    mutationFn: ({ parceriaId, status }) =>
      transicionarParceria(getLeelaDb(), clubeId, parceriaId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.parcerias.doClube(clubeId) });
    },
  });
}

/**
 * Cadastra um patrocinador (write direto — Rules-guarded) e invalida a lista de
 * parcerias: o card novo aparece na zona de patrocinadores sem reload manual.
 */
export function useCriarPatrocinador(
  clubeId: string,
): UseMutationResult<{ parceriaId: string }, Error, CriarPatrocinadorInput> {
  const queryClient = useQueryClient();
  return useMutation<{ parceriaId: string }, Error, CriarPatrocinadorInput>({
    mutationFn: (input) => criarPatrocinador(getLeelaDb(), clubeId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.parcerias.doClube(clubeId) });
    },
  });
}
