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
  getLeelaDb,
  getLeelaFunctions,
  salvarKit,
  type CriarEventoInput,
  type CriarEventoResult,
  type SalvarKitInput,
} from '@leela/api-client';
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
