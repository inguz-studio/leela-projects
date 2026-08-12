// =============================================================================
// packages/api-client/src/platform/documentoDaConta.ts
//
// Wrapper tipado do callable `consultarDocumentoDaConta` (ADMIN-VISAO onda 5 ·
// S1615-T3 · RN-540 · vetável V-4). Espelha o contrato de
// `functions/src/platform/consultarDocumentoDaConta.ts` — só tipa a chamada;
// autorização, minimização e o REGISTRO DE ACESSO acontecem no servidor.
//
// Por que um callable e não uma query: `pessoas` está fechada para TODO
// cliente nas Rules (`firestore.rules:2724` — `read, write: if false`),
// inclusive para o `platform_admin`, e o V-4 decidiu manter assim. Este é o
// único caminho até o documento de identificação, e ele cobra o preço certo:
// cada consulta deixa rastro.
//
// UMA CONTA POR CHAMADA. Não existe versão em lote, e não deve nascer uma: a
// RN-540 proíbe saída em massa, e uma chamada por linha de tabela renderizada
// seria exatamente isso com outro nome. O consumidor é a revelação sob gesto
// explícito do operador — nunca a montagem da página.
//
// Erros propagados como FirebaseError (mesmo padrão de `clientesTenant.ts`):
//   - 'functions/permission-denied' → caller não é platform_admin (e a
//      negativa JÁ foi registrada em auditoriaAcessos pelo servidor)
//   - 'functions/invalid-argument'  → contaUid ausente/vazio
// =============================================================================

import { httpsCallable, type Functions } from 'firebase/functions';

/**
 * O tipo de documento que a plataforma sabe identificar hoje — um membro só.
 * Documento estrangeiro NÃO tem campo no modelo de dados (medido: zero
 * ocorrências em core/functions/painel), então ele não é tipado aqui como se
 * existisse; a tela declara a lacuna com a causa nomeada.
 */
export type TipoDocumentoDaConta = 'cpf';

export interface DocumentoDaConta {
  tipo: TipoDocumentoDaConta;
  /** Só dígitos. Existe só nesta resposta — não persista, não agregue. */
  numero: string;
}

/** Por que não há documento a mostrar. A tela nomeia a causa, nunca cala. */
export type MotivoSemDocumento =
  | 'sem_registro_de_identificacao'
  | 'registro_sem_documento';

export interface ConsultarDocumentoInput {
  contaUid: string;
}

export interface ConsultarDocumentoResult {
  contaUid: string;
  documento: DocumentoDaConta | null;
  motivoAusencia: MotivoSemDocumento | null;
  /** A conta está ligada a mais de um registro de identidade. */
  haMaisDeUmRegistro: boolean;
  /** Aviso para a UI: o acesso foi registrado. */
  avisoAuditoria: string;
}

/**
 * Consulta o documento de identificação de UMA conta, com registro de acesso
 * (V-4 · RN-540). Só `platform_admin`; qualquer outro papel autenticado recebe
 * `permission-denied` com a negativa já registrada.
 */
export async function consultarDocumentoDaConta(
  functions: Functions,
  input: ConsultarDocumentoInput
): Promise<ConsultarDocumentoResult> {
  const call = httpsCallable<ConsultarDocumentoInput, ConsultarDocumentoResult>(
    functions,
    'consultarDocumentoDaConta'
  );
  return (await call(input)).data;
}
