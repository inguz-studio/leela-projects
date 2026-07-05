// =============================================================================
// Tradução dos error.codes do callable `criarEvento` para toast acionável
// (review Onda1 #34 — o catch genérico "Tente novamente em instantes" tornava
// failed-precondition/resource-exhausted/invalid-argument inacionáveis; o
// retry sugerido nunca resolvia). Padrão da casa: MembrosPage/WIKI §4.
// Puro — testável sem RTL.
// =============================================================================

export interface ToastErro {
  title: string;
  description: string;
}

/** Extrai o code de um erro de callable ('functions/invalid-argument' etc.). */
function codigoDoErro(err: unknown): string {
  if (typeof err !== 'object' || err === null) return '';
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

/** Mensagem do servidor sem o prefixo técnico (já vem pt-BR e por campo). */
function detalheDoServidor(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null;
  const message = (err as { message?: unknown }).message;
  if (typeof message !== 'string' || message.length === 0) return null;
  return message.replace(/^.*CriarEventoInput inválido:\s*/, '').trim() || null;
}

/**
 * Mapeia o erro do submit para um toast claro. Fallback mantém a copy
 * genérica original (erros de rede/indisponibilidade — aí sim, retry).
 * @pure
 */
export function toastErroCriarEvento(err: unknown): ToastErro {
  const code = codigoDoErro(err);

  if (code.includes('failed-precondition')) {
    return {
      title: 'Sua conta não pode criar eventos agora',
      description:
        'O cadastro da sua produtora não está ativo (RN-402). Fale com o suporte da plataforma.',
    };
  }
  if (code.includes('resource-exhausted')) {
    return {
      title: 'Esse nome de evento está esgotado',
      description: 'Já existem muitos eventos com esse nome — renomeie e envie de novo.',
    };
  }
  if (code.includes('invalid-argument')) {
    return {
      title: 'O servidor rejeitou os dados do evento',
      description:
        detalheDoServidor(err) ??
        'Revise a data e os preços dos percursos e envie de novo.',
    };
  }
  return {
    title: 'Não foi possível criar o evento',
    description: 'Tente novamente em instantes.',
  };
}
