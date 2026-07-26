// =============================================================================
// Tradução dos erros das callables de repasse → mensagem clara pro organizador.
// Puro — testável sem React. As Functions propagam FirebaseError com `code` =
// 'functions/…'; o servidor é a autoridade (RN-352/354/357) e a UI NÃO adivinha,
// mapeia o code para uma frase honesta e acionável (§2.12).
// =============================================================================

/** Contexto da ação — muda o texto do `failed-precondition` (significados distintos). */
export type RepasseErroContexto = 'dados' | 'solicitacao';

/** Extrai o `code` de um erro de callable (FirebaseError) com segurança. */
function errorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/**
 * Mensagem amigável para um erro de callable de repasse.
 * `null`/`undefined` → string vazia (sem erro a exibir).
 */
export function repasseErrorMessage(err: unknown, contexto: RepasseErroContexto): string {
  if (err === null || err === undefined) return '';
  switch (errorCode(err)) {
    case 'functions/failed-precondition':
      return contexto === 'solicitacao'
        ? 'Solicitação recusada pelo servidor: o valor excede o disponível, ou o termo comercial/dados bancários ainda não estão prontos.'
        : 'Não foi possível salvar os dados bancários agora. Tente novamente em instantes.';
    case 'functions/permission-denied':
      return 'Sua conta não tem permissão para esta ação de repasse.';
    case 'functions/invalid-argument':
      return 'Dados inválidos. Revise os campos e tente novamente.';
    default:
      return 'Não foi possível concluir a ação. Tente novamente em instantes.';
  }
}
