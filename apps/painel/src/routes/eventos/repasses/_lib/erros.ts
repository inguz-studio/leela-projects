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
 * Guard por evento (RN-368): o servidor manda um `details` TIPADO com quanto
 * aquele evento comporta. Só aceitamos o payload quando ele está completo e o
 * número é finito — `details` vem da rede, e uma frase de dinheiro montada em
 * cima de `undefined` seria pior que a genérica.
 */
function excedeDoEvento(err: unknown): number | null {
  if (!err || typeof err !== 'object' || !('details' in err)) return null;
  const details = (err as { details?: unknown }).details;
  if (!details || typeof details !== 'object') return null;
  const d = details as { motivo?: unknown; disponivelDoEvento?: unknown };
  if (d.motivo !== 'repasse_excede_evento') return null;
  return typeof d.disponivelDoEvento === 'number' && Number.isFinite(d.disponivelDoEvento)
    ? d.disponivelDoEvento
    : null;
}

/** R$ com centavos — dinheiro que a pessoa vai conferir contra o extrato. */
function reais(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Mensagem amigável para um erro de callable de repasse.
 * `null`/`undefined` → string vazia (sem erro a exibir).
 */
export function repasseErrorMessage(err: unknown, contexto: RepasseErroContexto): string {
  if (err === null || err === undefined) return '';
  switch (errorCode(err)) {
    case 'functions/failed-precondition': {
      if (contexto !== 'solicitacao') {
        return 'Não foi possível salvar os dados bancários agora. Tente novamente em instantes.';
      }
      // RN-368 — o motivo é conhecido e tem número: dizer qual é.
      const doEvento = excedeDoEvento(err);
      if (doEvento !== null) {
        return `Este evento tem ${reais(doEvento)} disponíveis para repasse — o valor pedido excede o liberado dele.`;
      }
      return 'Solicitação recusada pelo servidor: o valor excede o disponível, ou o termo comercial/dados bancários ainda não estão prontos.';
    }
    case 'functions/permission-denied':
      return 'Sua conta não tem permissão para esta ação de repasse.';
    case 'functions/invalid-argument':
      return 'Dados inválidos. Revise os campos e tente novamente.';
    default:
      return 'Não foi possível concluir a ação. Tente novamente em instantes.';
  }
}
