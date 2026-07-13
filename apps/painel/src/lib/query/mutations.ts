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
  atualizarConfiguracoesEvento,
  convidarMembroEquipe,
  criarEvento,
  criarPatrocinador,
  despublicarPaginaVendas,
  estornarInscricao,
  getLeelaDb,
  getLeelaFunctions,
  publicarPaginaVendas,
  removerConviteEquipe,
  removerCupom,
  removerLote,
  removerMembro,
  requestRepasse,
  salvarConteudoPaginaVendas,
  salvarCupom,
  salvarKit,
  salvarLote,
  saveDadosBancarios,
  setClaimsEquipe,
  transferirPropriedade,
  transicaoAprovisionamento,
  transicionarParceria,
  type AtualizarConfiguracoesEventoInput,
  type ConvidarMembroEquipeInput,
  type CriarEventoInput,
  type CriarEventoResult,
  type CriarPatrocinadorInput,
  type EstornarInscricaoInput,
  type EstornarInscricaoResult,
  type PublicarPaginaVendasResult,
  type RemoverMembroResult,
  type RequestRepasseInput,
  type RequestRepasseResult,
  type SaveDadosBancariosInput,
  type SaveDadosBancariosResult,
  type EscritaLoteInput,
  type SalvarConteudoPaginaVendasInput,
  type SalvarCupomInput,
  type SalvarKitInput,
  type SetClaimsEquipeResult,
  type TransferirPropriedadeResult,
  type TransicaoAprovisionamentoResult,
} from '@leela/api-client';
import type {
  EstadoAprovisionamento,
  MembroEquipe,
  PapelEvento,
  StatusParceria,
} from '@leela/core';
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

/**
 * Salva as CONFIGURAÇÕES GERAIS do evento (S304-T2 · E04-L5) via escrita direta
 * `atualizarConfiguracoesEvento` (Rules-guarded por `isTenantWriter`; nunca toca
 * ∑/status/percursos). No onSuccess invalida a chave partilhada da lista do
 * organizador (Hub ↔ Visão Geral — de onde `useEvento` serve o evento) E o
 * detalhe por slug → o form reflete `usaChip`/nome/local salvos sem reload
 * (read-your-writes, ADR-010). O erro `permission-denied` sobe intacto (§2.12).
 */
export function useAtualizarConfiguracoesEvento(params: {
  slug: string;
  eventoId: string;
  tenantId: string;
  organizadorId: string;
}): UseMutationResult<void, Error, AtualizarConfiguracoesEventoInput> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, AtualizarConfiguracoesEventoInput>({
    mutationFn: (input) =>
      atualizarConfiguracoesEvento(getLeelaDb(), params.eventoId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.eventos.doOrganizador(params.tenantId, params.organizadorId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.eventos.detalhe(params.slug),
      });
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
// Mutations de LOTE (E04 · S300 · ADR-012) — money-config do organizador.
// Escrita DIRETA (Rules-guarded como kits): `salvarLote`/`removerLote`. No
// onSuccess invalida `['lotes','do-evento',eventoId]` (a chave que a tela de
// config lê) → o lote salvo/removido reflete sem reload manual. `vendidos` é ∑
// de Function (a UI nunca o envia); a Rule congela os campos comerciais do lote
// vendido (RN-200/300). A regra de negócio (virada, preço vigente) vive no core/
// Function — aqui só se fia escrita → invalidação.
// =============================================================================

/** Variáveis de `useSalvarLote`: id do lote, payload (completo ou SÓ-NOME
 *  para lote vendido — RN-200/300) e se é criação (criadoEm). */
export interface SalvarLoteVars {
  loteId: string;
  input: EscritaLoteInput;
  criar: boolean;
}

/**
 * Salva (cria/edita) um lote de uma modalidade e invalida os lotes do evento —
 * a tela de config reflete a escrita (read-your-writes, ADR-010). Reusa
 * `salvarLote` do api-client (write direto guardado por Rules; nunca toca
 * `vendidos`).
 */
export function useSalvarLote(
  eventoId: string,
): UseMutationResult<void, Error, SalvarLoteVars> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, SalvarLoteVars>({
    mutationFn: ({ loteId, input, criar }) =>
      salvarLote(getLeelaDb(), eventoId, loteId, input, criar),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.lotes.doEvento(eventoId) });
    },
  });
}

/**
 * Remove um lote (a Rule só permite quando `vendidos == 0`) e invalida os lotes
 * do evento. O erro `permission-denied` (lote com venda) sobe intacto para a UI
 * — mas a tela já bloqueia o botão de remover quando `vendidos > 0`.
 */
export function useRemoverLote(
  eventoId: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (loteId) => removerLote(getLeelaDb(), eventoId, loteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.lotes.doEvento(eventoId) });
    },
  });
}

// =============================================================================
// Mutation de APROVISIONAMENTO (E03 · S210-T2 · FABLE-D) — transição da máquina
// de estados do SKU (estimativa → encomendado → em_estoque, RN-226). Escrita
// EXCLUSIVA de Cloud Function (`transicaoAprovisionamento`); as Rules negam TODA
// escrita de cliente na subcoleção. No onSuccess invalida
// `aprovisionamento.doEvento` — a tela de Estoque reflete o novo estado/∑ sem
// reload (read-your-writes, ADR-010). O erro (failed-precondition = transição
// inválida/replay; permission-denied = cross-tenant) sobe intacto para a UI.
// =============================================================================

/** Variáveis de `useTransicaoAprovisionamento`: SKU, estado alvo e quantidade. */
export interface TransicaoAprovisionamentoVars {
  /** docId do SKU — `itemId__tamanho` (S210-T2) */
  sku: string;
  novoEstado: EstadoAprovisionamento;
  /** Quantidade da transição (encomendada / recebida) — inteiro ≥ 0. */
  qtd: number;
}

/**
 * Avança o estado de aprovisionamento de um SKU (callable — RN-226) e invalida a
 * chave de aprovisionamento do evento: a tela de Estoque reflete o novo estado e
 * os ∑ recomputados sem reload manual. Reusa `transicaoAprovisionamento` do
 * api-client (write EXCLUSIVA de Function — nunca escrita direta do cliente).
 */
export function useTransicaoAprovisionamento(
  eventoId: string,
): UseMutationResult<TransicaoAprovisionamentoResult, Error, TransicaoAprovisionamentoVars> {
  const queryClient = useQueryClient();
  return useMutation<TransicaoAprovisionamentoResult, Error, TransicaoAprovisionamentoVars>({
    mutationFn: ({ sku, novoEstado, qtd }) =>
      transicaoAprovisionamento(getLeelaFunctions(), { eventoId, sku, novoEstado, qtd }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.aprovisionamento.doEvento(eventoId),
      });
    },
  });
}

// =============================================================================
// Mutations de CUPOM (E04 · S300-T5) — cupom simples do organizador. Escrita
// DIRETA (Rules-guarded como lotes/kits): `salvarCupom`/`removerCupom`. No
// onSuccess invalida `['cupons','do-evento',eventoId]` (a chave que a seção lê)
// → o cupom salvo/removido reflete sem reload manual. `usos` (≡ usosFeitos) é ∑
// de Function (checkout, E12) — a UI nunca o envia; `codigo` é imutável (docId).
// A remoção só é permitida com `usos == 0` (a Rule é a autoridade).
// =============================================================================

/** Variáveis de `useSalvarCupom`: id do cupom (≡ código normalizado), payload
 *  (com tenantId) e se é criação (criadoEm). */
export interface SalvarCupomVars {
  cupomId: string;
  input: SalvarCupomInput;
  criar: boolean;
}

/**
 * Salva (cria/edita) um cupom e invalida os cupons do evento — a seção reflete a
 * escrita (read-your-writes, ADR-010). Reusa `salvarCupom` do api-client (write
 * direto guardado por Rules; nunca toca `usos`).
 */
export function useSalvarCupom(
  eventoId: string,
): UseMutationResult<void, Error, SalvarCupomVars> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, SalvarCupomVars>({
    mutationFn: ({ cupomId, input, criar }) =>
      salvarCupom(getLeelaDb(), eventoId, cupomId, input, criar),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cupons.doEvento(eventoId) });
    },
  });
}

/**
 * Remove um cupom (a Rule só permite quando `usos == 0`) e invalida os cupons do
 * evento. O erro `permission-denied` (cupom já usado) sobe intacto para a UI —
 * mas a seção já bloqueia o botão de remover quando `usos > 0`.
 */
export function useRemoverCupom(
  eventoId: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (cupomId) => removerCupom(getLeelaDb(), eventoId, cupomId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cupons.doEvento(eventoId) });
    },
  });
}

// =============================================================================
// Mutations da PÁGINA DE VENDAS (E04 · S300-T3) — editor de conteúdo do evento.
// CONTEÚDO (seções + SEO) é escrita DIRETA (Rules-guarded como lotes/kits):
// `salvarConteudoPaginaVendas`. PUBLICAÇÃO é escrita EXCLUSIVA de Function:
// `publicar/despublicarPaginaVendas` (seam callable — a Function ainda não
// existe em `functions/`; enquanto não subir, o erro sobe e a UI mostra Toast).
// Todas invalidam `['pagina-vendas','do-evento',eventoId]` → read-your-writes.
// =============================================================================

/** Variáveis de `useSalvarConteudoPaginaVendas`: payload e se é criação. */
export interface SalvarConteudoPaginaVendasVars {
  input: SalvarConteudoPaginaVendasInput;
  criar: boolean;
}

/**
 * Salva o conteúdo (seções + SEO) da página e invalida a chave da página — o
 * toggle/SEO reflete sem reload (read-your-writes, ADR-010). Nunca toca a flag
 * de publicação (escrita de Function).
 */
export function useSalvarConteudoPaginaVendas(
  eventoId: string,
): UseMutationResult<void, Error, SalvarConteudoPaginaVendasVars> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, SalvarConteudoPaginaVendasVars>({
    mutationFn: ({ input, criar }) =>
      salvarConteudoPaginaVendas(getLeelaDb(), eventoId, input, criar),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paginaVendas.doEvento(eventoId) });
    },
  });
}

/**
 * Publica a página via Function `publicarPaginaVendas` (valida completude
 * server-side) e invalida a chave da página — o estado publicado reflete sem
 * reload. Erro (inclui Function ainda não deployada) sobe para a UI (Toast).
 */
export function usePublicarPaginaVendas(
  eventoId: string,
): UseMutationResult<PublicarPaginaVendasResult, Error, void> {
  const queryClient = useQueryClient();
  return useMutation<PublicarPaginaVendasResult, Error, void>({
    mutationFn: () => publicarPaginaVendas(getLeelaFunctions(), eventoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paginaVendas.doEvento(eventoId) });
    },
  });
}

/**
 * Despublica a página (volta a rascunho) via Function `despublicarPaginaVendas`
 * e invalida a chave da página. Mesmo seam/observação de `usePublicarPaginaVendas`.
 */
export function useDespublicarPaginaVendas(
  eventoId: string,
): UseMutationResult<PublicarPaginaVendasResult, Error, void> {
  const queryClient = useQueryClient();
  return useMutation<PublicarPaginaVendasResult, Error, void>({
    mutationFn: () => despublicarPaginaVendas(getLeelaFunctions(), eventoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paginaVendas.doEvento(eventoId) });
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

// =============================================================================
// Mutation de ESTORNO por inscrito (E04 · FABLE-B · ADR-011/RN-341). Escrita
// EXCLUSIVA de Cloud Function (`estornarInscricao`) — o VALOR é decisão do
// servidor (RN-337): o cliente nunca o envia nem o calcula. No onSuccess
// invalida (a) o join [pag] do inscrito — o status do pagamento reflete; (b) a
// lista de inscritos do evento — o badge do inscrito flipa p/ Estornado; (c) o
// financeiro do evento — a receita revertida reflete. Read-your-writes (ADR-010).
// O erro do callable sobe INTACTO para a UI (§2.12 — mensagem honesta do gate).
// =============================================================================

/**
 * Estorna um inscrito do pedido (callable — saga idempotente do FABLE-B) e
 * invalida as chaves de leitura afetadas. `eventoId` fixa o alvo das
 * invalidações; `inscritoId` vem das variáveis (chave do join [pag]).
 */
export function useEstornarInscrito(
  eventoId: string,
): UseMutationResult<EstornarInscricaoResult, Error, EstornarInscricaoInput> {
  const queryClient = useQueryClient();
  return useMutation<EstornarInscricaoResult, Error, EstornarInscricaoInput>({
    mutationFn: (input) => estornarInscricao(input),
    onSuccess: (_res, input) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pedidos.ePagamentoDoInscrito(eventoId, input.inscritoId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inscritos.todos(eventoId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.financeiro.current(eventoId) });
    },
  });
}

// =============================================================================
// Mutations de EQUIPE (E04 · S304-T3 · E04-L5). Duas naturezas (ADR-008/RN-401):
//   - TROCA DE PAPEL (`setClaimsEquipe`, callable) e REMOÇÃO de membro ATIVO
//     (mesma callable com `papel: null`) — merge preservador de claims + âncora
//     no doc; o cliente NUNCA escreve claim direto.
//   - CONVITE (`convidarMembroEquipe`, escrita direta Rules-guarded) e remoção
//     de convite pendente (`removerConviteEquipe`, delete direto — só status
//     'convidado'). A ativação do convite (uid + claims) é da Function.
// Todas invalidam `['equipe','do-evento',eventoId]` → a lista reflete sem reload
// (read-your-writes, ADR-010). Erro (permission-denied / invalid-argument /
// failed-precondition da anti-escalada) sobe INTACTO para a UI (§2.12).
// =============================================================================

/** Variáveis de `useSetPapelEquipe`: uid do membro ATIVO e o novo papel. */
export interface SetPapelEquipeVars {
  uid: string;
  papel: PapelEvento;
}

/**
 * Troca o papel de um membro ATIVO (callable — anti-escalada no servidor) e
 * invalida a equipe do evento. Só para membro com `uid` (convite não tem papel
 * trocável pelo cliente).
 */
export function useSetPapelEquipe(
  eventoId: string,
): UseMutationResult<SetClaimsEquipeResult, Error, SetPapelEquipeVars> {
  const queryClient = useQueryClient();
  return useMutation<SetClaimsEquipeResult, Error, SetPapelEquipeVars>({
    mutationFn: ({ uid, papel }) =>
      setClaimsEquipe(getLeelaFunctions(), { eventoId, uid, papel }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipe.doEvento(eventoId) });
    },
  });
}

/**
 * Convida um membro (escrita direta Rules-guarded) e invalida a equipe do
 * evento — o convite pendente aparece na lista sem reload. `tenantId` casa com
 * o do evento pai (ADR-009); a Rule nega papel 'organizador' e create com uid.
 */
export function useConvidarMembroEquipe(params: {
  eventoId: string;
  tenantId: string;
}): UseMutationResult<string, Error, ConvidarMembroEquipeInput> {
  const queryClient = useQueryClient();
  return useMutation<string, Error, ConvidarMembroEquipeInput>({
    mutationFn: (input) =>
      convidarMembroEquipe(getLeelaDb(), params.eventoId, params.tenantId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipe.doEvento(params.eventoId) });
    },
  });
}

/**
 * Remove um membro e invalida a equipe. Ramifica pela natureza do vínculo:
 * ATIVO (com uid) → revoga via Function `setClaimsEquipe` com `papel: null`
 * (claims + âncora no doc, na MESMA operação — token velho morre na hora);
 * CONVITE pendente → delete direto (a Rule só permite delete de 'convidado').
 */
export function useRemoverMembroEquipe(
  eventoId: string,
): UseMutationResult<void, Error, MembroEquipe> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, MembroEquipe>({
    mutationFn: async (membro) => {
      if (membro.status === 'ativo' && membro.uid !== null) {
        await setClaimsEquipe(getLeelaFunctions(), {
          eventoId,
          uid: membro.uid,
          papel: null,
        });
        return;
      }
      await removerConviteEquipe(getLeelaDb(), eventoId, membro.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipe.doEvento(eventoId) });
    },
  });
}

// =============================================================================
// Mutations do REPASSE do organizador (E09-slim · E09s-L3). Escrita EXCLUSIVA
// de Cloud Function (RN-357): o cliente nunca escreve saldo/dados bancários/
// repasse direto. `saveDadosBancarios` cifra+mascara server-side e devolve SÓ o
// mascarado (RN-354) → a UI mostra apenas `****1234`. No onSuccess invalida
// `repasse.dadosBancarios` → read-your-writes (ADR-010). O erro do callable
// sobe INTACTO para a UI (§2.12 — Toast/inline honesto do gate).
// =============================================================================

/**
 * Cadastra/atualiza os dados bancários (callable `saveDadosBancarios`,
 * tenant_owner). O número em claro trafega SÓ no callable (TLS) e nunca volta
 * ao cliente (RN-354); a tela reflete o mascarado salvo sem reload.
 */
export function useSaveDadosBancarios(
  tenantId: string,
): UseMutationResult<SaveDadosBancariosResult, Error, SaveDadosBancariosInput> {
  const queryClient = useQueryClient();
  return useMutation<SaveDadosBancariosResult, Error, SaveDadosBancariosInput>({
    mutationFn: (input) => saveDadosBancarios(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.repasse.dadosBancarios(tenantId),
      });
    },
  });
}

/**
 * Solicita um repasse (callable `requestRepasse`, tenant_owner). O servidor relê
 * `saldo.disponivel` e valida (RN-352) — `valor > disponivel` ⇒ failed-precondition
 * (o cliente nunca cria; o espelho client é só UX). No onSuccess invalida o
 * saldo (comprometido↑/disponível↓) E o histórico (novo item em `solicitado`) →
 * ambos refletem sem reload (read-your-writes, ADR-010).
 */
export function useRequestRepasse(
  tenantId: string,
): UseMutationResult<RequestRepasseResult, Error, RequestRepasseInput> {
  const queryClient = useQueryClient();
  return useMutation<RequestRepasseResult, Error, RequestRepasseInput>({
    mutationFn: (input) => requestRepasse(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.repasse.saldo(tenantId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.repasse.historico(tenantId) });
    },
  });
}
