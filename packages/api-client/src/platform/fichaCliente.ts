// =============================================================================
// packages/api-client/src/platform/fichaCliente.ts
//
// Wrapper tipado do callable `obterFichaDoCliente` (ADMIN-VISAO onda 3 ·
// S1612-T6 · RN-539 na forma que o V-2 lhe deu). Espelha o contrato de
// `functions/src/platform/obterFichaDoCliente.ts` — só tipa a chamada;
// autorização, montagem e registro de acesso acontecem no servidor.
//
// A LISTA continua magra e a FICHA é que é completa. `listarClientesDoTenant`
// devolve comportamento (nome, eventos, inscrições, valor gasto, LTV); esta
// chamada devolve a ficha do indivíduo com contato, documento, endereço,
// restrições e pedidos. A separação é o desenho, não uma etapa: uma lista com
// CPF e telefone de todo mundo seria a agenda de participantes de todos os
// produtores num lugar só, e a RN-540 recusa saída em massa.
//
// Cada chamada é uma consulta de PII identificada e o servidor a registra.
// Não chame isto em laço sobre uma página de lista.
//
// Erros propagados como FirebaseError (padrão de `platform/mutations.ts`):
//   - 'functions/permission-denied' → caller não é platform_admin (negativa já
//      registrada em auditoriaAcessos pelo servidor)
//   - 'functions/invalid-argument'  → tenantId/clienteKey ausente ou malformado
//   - 'functions/not-found'         → o cliente não existe nesse tenant
// =============================================================================

import { httpsCallable, type Functions } from 'firebase/functions';

/** Endereço do pedido, como o checkout o coleta (RN-561). */
export interface FichaEnderecoView {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  numero: string;
  complemento?: string;
}

export interface FichaContatoEmergenciaView {
  nome: string;
  telefone: string;
}

export interface FichaPedidoDoClienteView {
  pedidoId: string;
  eventoId: string;
  eventoNome: string;
  statusNoCrm: string;
  /** null quando o doc do pedido não existe mais. */
  statusDoPedido: string | null;
  valorPago: number;
  atualizadoEmMs: number;
}

/**
 * A ficha completa de um indivíduo. Campo de contato `null` significa que a
 * fonte NÃO guarda o dado — a tela mostra ausência declarada, nunca string
 * vazia e nunca zero.
 */
export interface FichaDoClienteView {
  clienteKey: string;
  nome: string;
  cpf: string | null;
  nascimento: string | null;
  genero: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  endereco: FichaEnderecoView | null;
  restricoesMedicas: string | null;
  contatoEmergencia: FichaContatoEmergenciaView | null;
  qtdEventos: number;
  qtdInscricoes: number;
  valorGasto: number;
  ltv: number;
  pedidos: FichaPedidoDoClienteView[];
  /** true = o histórico tem mais inscrições do que a ficha leu. */
  pedidosTruncados: boolean;
}

export interface ObterFichaDoClienteInput {
  tenantId: string;
  clienteKey: string;
}

/**
 * Abre a ficha completa de UM cliente do tenant (S1612-T6, consumidor).
 * Só `platform_admin` (RN-539); qualquer outro papel autenticado recebe
 * `permission-denied` com a negativa já registrada.
 */
export async function obterFichaDoCliente(
  functions: Functions,
  input: ObterFichaDoClienteInput
): Promise<FichaDoClienteView> {
  const call = httpsCallable<ObterFichaDoClienteInput, FichaDoClienteView>(
    functions,
    'obterFichaDoCliente'
  );
  return (await call(input)).data;
}
