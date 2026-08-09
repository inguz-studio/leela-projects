// =============================================================================
// O FUNDO FICA INERTE ENQUANTO O AVISO ESTÁ NA FRENTE
// (VITRINE-VEU-1 · corte de 09/08, fechando o DEF-R1 da REV-VITRINE).
//
// O QUE A REVIEW MEDIU. Com o aviso aberto, oito controles do fundo seguiam
// alcançáveis — os seis itens da sidebar, o botão da moldura e o "Como receber
// o código Leela" da vitrine. Um `element.click()` sintético (o clique que
// VoiceOver, NVDA e TalkBack emitem, e que não passa por hit-test) navegou o
// painel para `/marcas` com o aviso "bloqueante" na tela, em silêncio.
//
// POR QUE O `Modal` DO DS, SOZINHO, NÃO FECHA ISSO. Ele portaliza para o
// `document.body`, trava a rolagem, prende o Tab e devolve o foco — e é por isso
// que o corte mandou adotá-lo. Mas ele NÃO torna o fundo inerte: o `aria-hidden`
// que ele tem está no próprio véu, não no resto da página. `aria-modal="true"` é
// um SINAL para a tecnologia assistiva, não uma trava: quem respeita, respeita;
// o clique sintético atravessa do mesmo jeito. Enquanto os oito controles
// estiverem na árvore de acessibilidade, existe algo para a AT clicar.
//
// `inert` é a trava, e é a única que existe na plataforma: o navegador tira o
// subárvore inteira da árvore de acessibilidade, do foco e do alcance de evento
// de ponteiro. A AT não acha o link "Marcas" para clicar nele.
//
// ONDE ELE É APLICADO, e por que não é no `Modal`. O alvo tem de conter a
// SIDEBAR, que é desenhada pelo `RootShell`, acima deste gate — inertizar só a
// área de conteúdo deixaria seis dos oito controles de pé. O alvo certo é o
// contêiner do app inteiro: em produção o `#root`, no teste o contêiner que o
// RTL monta. Os dois têm a mesma propriedade e é ela que o código procura: ser
// o filho de `<body>` que contém a vitrine. O aviso, portalizado pelo `Modal`,
// é IRMÃO desse contêiner — fica de fora do `inert` por construção, sem
// precisar de exceção escrita em lugar nenhum.
//
// Subir isto para dentro do `Modal` do DS resolveria as 26 telas de uma vez e é
// a conversa certa a ter — mas é mudança de comportamento em 26 telas, e não é
// o que o corte de 09/08 decidiu. Fica aqui, na lane que a mediu.
// =============================================================================

import { useEffect, type RefObject } from 'react';

/** O atributo. Nome em um lugar só — o teste mede o mesmo que o código escreve. */
export const ATRIBUTO_INERTE = 'inert';

/**
 * O filho de `<body>` que contém `ancora` — o contêiner do app.
 *
 * Sobe até parar logo abaixo do `<body>`. Devolve `null` quando a âncora não
 * está no documento (nó desmontado) ou quando ela não descende do `<body>`, que
 * é o caso de um nó solto criado em teste.
 * @pure
 */
export function containerDoApp(ancora: Element | null): HTMLElement | null {
  if (ancora === null || !ancora.isConnected) return null;
  let no: Element = ancora;
  while (no.parentElement !== null && no.parentElement !== document.body) {
    no = no.parentElement;
  }
  if (no.parentElement !== document.body) return null;
  return no instanceof HTMLElement ? no : null;
}

/**
 * Torna o contêiner do app inerte enquanto `ativo`.
 *
 * Idempotente e educado com quem chegou antes: se o contêiner JÁ está inerte
 * (outro diálogo, uma lane futura), este hook não escreve nem apaga nada — quem
 * travou destrava. Sem isso, dois avisos sobrepostos devolveriam o fundo ao
 * mundo no fechamento do primeiro.
 */
export function useFundoInerte(ativo: boolean, ancora: RefObject<Element | null>): void {
  useEffect(() => {
    if (!ativo) return undefined;
    const fundo = containerDoApp(ancora.current);
    if (fundo === null || fundo.hasAttribute(ATRIBUTO_INERTE)) return undefined;
    fundo.setAttribute(ATRIBUTO_INERTE, '');
    return () => fundo.removeAttribute(ATRIBUTO_INERTE);
  }, [ativo, ancora]);
}
