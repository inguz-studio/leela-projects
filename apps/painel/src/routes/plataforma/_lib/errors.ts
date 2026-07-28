// =============================================================================
// Tradução de erros das callables de plataforma → mensagem clara pro admin
// (S1601-T4). Puro — testável sem React.
//
// As Cloud Functions propagam FirebaseError com `code` = 'functions/…'. A
// guarda de papel/estado no servidor devolve 'failed-precondition' (ex.:
// e-mail com papel conflitante, transição de status inválida). A UI NÃO
// tenta adivinhar; mapeia o code para uma frase acionável.
// =============================================================================

/** Extrai o `code` de um erro de callable (FirebaseError) com segurança. */
function errorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/**
 * Mensagem amigável para um erro de callable de plataforma.
 * `null`/`undefined` → string vazia (sem erro a exibir).
 */
export function platformErrorMessage(err: unknown): string {
  if (err === null || err === undefined) return '';
  switch (errorCode(err)) {
    case 'functions/permission-denied':
      return 'Sua conta não tem permissão de administrador da plataforma para esta ação.';
    case 'functions/failed-precondition':
      return 'Ação bloqueada: o estado atual não permite esta operação (ex.: e-mail com papel conflitante ou transição de status inválida).';
    case 'functions/already-exists':
      return 'Já existe um tenant ativo com esse slug vinculado a outro responsável.';
    case 'functions/invalid-argument':
      return 'Dados inválidos. Revise os campos e tente novamente.';
    default:
      return 'Não foi possível concluir a ação. Tente novamente em instantes.';
  }
}

/**
 * Mensagem de recusa que o OPERADOR lê (fix ESTORNO-REV · vetor 6, agora
 * partilhado — E-4).
 *
 * As guardas do servidor escrevem em português de operador e dizem o que
 * fazer: a RN-371 manda conferir o extrato do gateway antes de tentar de novo,
 * a RN-351 explica por que o saldo não cobre o repasse, a validação do plano
 * diz qual campo recusou. `platformErrorMessage` trocava essas frases pelo
 * texto genérico de plataforma ("e-mail com papel conflitante ou transição de
 * status inválida") — texto de OUTRA tela, que numa fila de dinheiro manda o
 * operador procurar no lugar errado.
 *
 * Regra: a frase do servidor quando ela existe; o mapeador genérico como rede
 * (callable que estoura em 'internal' chega com message 'INTERNAL', que não é
 * frase de operador). O mapeador segue INTACTO — as telas que dependem do
 * texto genérico continuam chamando ele direto. @pure
 */
export function mensagemDaRecusa(err: unknown): string {
  const bruta =
    err !== null && typeof err === 'object' && 'message' in err
      ? String((err as { message?: unknown }).message ?? '').trim()
      : '';
  const generica = platformErrorMessage(err);
  return bruta.length > 0 && bruta.toUpperCase() !== 'INTERNAL' ? bruta : generica;
}
