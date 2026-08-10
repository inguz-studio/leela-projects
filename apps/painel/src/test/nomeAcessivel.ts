// =============================================================================
// Identidade de elemento por NOME ACESSÍVEL nos testes de moldura (HIFI-REC-FIX).
//
// Os inventários da moldura identificavam elemento por `textContent`, e o
// SidebarRail derrubou essa chave: o item FECHADO do rail carrega o rótulo
// DUAS vezes no texto (span `sr-only` + tooltip `aria-hidden`), então
// `textContent` devolve 'ClubsClubs' para um item que a tecnologia assistiva
// anuncia como 'Clubs'. O nome acessível é a identidade que a AT consome — e é
// imune à duplicação, porque a subárvore `aria-hidden` fica fora dele.
//
// Aproximação deliberadamente pequena da ACCNAME (aria-label, senão conteúdo
// sem as subárvores `aria-hidden`): é o suficiente para os elementos da
// moldura (âncoras e botões com rótulo textual ou aria-label), e não puxa
// dependência nova. Botão sem nada além de conteúdo `aria-hidden` devolve ''
// — de propósito: é o retrato fiel de um controle SEM nome para a AT, e o
// inventário que o declara está declarando exatamente essa dívida.
// =============================================================================

/** Nome acessível aproximado: `aria-label`, senão texto sem os `aria-hidden`. */
export function nomeAcessivel(no: HTMLElement): string {
  const rotulo = no.getAttribute('aria-label');
  if (rotulo !== null) return rotulo;
  const copia = no.cloneNode(true) as HTMLElement;
  for (const oculto of copia.querySelectorAll('[aria-hidden="true"]')) {
    oculto.remove();
  }
  return (copia.textContent ?? '').trim();
}
