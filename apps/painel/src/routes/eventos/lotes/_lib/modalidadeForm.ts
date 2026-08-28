// =============================================================================
// modalidadeForm.ts — helpers da EDIÇÃO DE MODALIDADE (S316-T4 · E04 ·
// RN-578/501/502 — a RN-500 foi revogada pelo dono em 28/08).
//
// A validação de verdade é o kernel puro do core (`@leela/core` →
// `eventos/modalidades`), usado pela tela E pela Function. Aqui mora só o que
// é de tela: o endereço do erro do servidor e a copy das consequências.
//
// MOTIVO: desde 28/08 (V2708-26) a UI NÃO pergunta mais motivo ao organizador
// — o campo saiu do modal e do ConfirmModal, e o servidor o trata como
// opcional. Os espelhos de teto que moravam aqui morreram junto.
// =============================================================================

/**
 * A recusa do SERVIDOR, com endereço.
 *
 * ⛔ `failed-precondition` é a recusa NOMEADA da RN-502/RN-578 — ela lista
 * cada lote, kit e campanha que impedem a remoção, ou explica que a modalidade
 * já vendeu (e qual é o caminho vivo: inativar/ocultar). O texto vem pronto do
 * kernel e passa INTACTO. Trocá-lo por "falha ao salvar" recriaria o defeito
 * de endereço que a review da SEAL-LOTES corrigiu no `LoteModal` (`2a97a592`).
 *
 * O SDK do Firebase prefixa o código com `functions/`, e a mensagem chega em
 * `err.message` — por isso a extração é por `code`, não por texto. @pure
 */
export function mensagemErroModalidade(erro: unknown): string {
  const codigo =
    typeof erro === 'object' && erro !== null && 'code' in erro
      ? String((erro as { code: unknown }).code)
      : '';
  const mensagem =
    erro instanceof Error && erro.message.trim().length > 0 ? erro.message.trim() : '';

  if (codigo.includes('failed-precondition') || codigo.includes('invalid-argument')) {
    // A mensagem do servidor É a resposta. Nada de genérico por cima dela.
    return mensagem.length > 0 ? mensagem : 'O servidor recusou a operação.';
  }
  if (codigo.includes('permission-denied')) {
    return (
      'O servidor recusou. A lista de modalidades é editada pelo dono da conta, ' +
      'e só em evento do próprio tenant.'
    );
  }
  if (codigo.includes('not-found')) {
    return 'Este evento não foi encontrado no servidor. Recarregue a página.';
  }
  return mensagem.length > 0
    ? `Não foi possível concluir (${mensagem}). Nada foi gravado — tente de novo.`
    : 'Não foi possível concluir. Nada foi gravado — tente de novo.';
}

/**
 * As consequências que a confirmação nomeia ANTES do gesto, e não depois —
 * requisito de tela herdado da RN-500 (sobrevive à revogação: nomear a
 * consequência de um gesto destrutivo continua sendo o desenho). Elas mudam
 * com o estado do evento porque a consequência muda: num rascunho ninguém vê
 * a página; num publicado, a lista de percursos muda para quem está olhando.
 * @pure
 */
export function consequenciasDeRemover(
  publicado: boolean,
  ultimaModalidade: boolean,
): { loses: string[]; keeps: string[] } {
  const loses = ['A modalidade sai da lista do evento e do preço-base dos percursos'];
  if (ultimaModalidade) {
    loses.push('O evento fica SEM modalidade nenhuma, e sem isso não há o que vender');
  }
  if (publicado) {
    loses.push('A página pública deste evento deixa de listar esta modalidade agora');
  }
  return {
    loses,
    keeps: [
      'As outras modalidades e os lotes delas permanecem',
      // RN-578: acrescentar é sempre permitido — a fronteira do evento caiu.
      'Dá para acrescentar a modalidade de novo a qualquer momento',
    ],
  };
}

/** A mesma disciplina para o renome (RN-501 — as referências migram juntas). */
export function consequenciasDeRenomear(publicado: boolean): {
  loses: string[];
  keeps: string[];
} {
  const loses = ['O nome antigo deixa de existir no evento'];
  if (publicado) {
    loses.push('A página pública passa a mostrar o nome novo imediatamente');
  }
  return {
    loses,
    keeps: [
      'Os lotes, kits e campanhas desta modalidade migram junto, no mesmo gesto',
      'Preço, vaga e janela de cada lote não mudam',
    ],
  };
}
