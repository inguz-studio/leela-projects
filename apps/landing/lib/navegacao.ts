// =============================================================================
// apps/landing/lib/navegacao.ts — a saída PROGRAMÁTICA de uma tela.
//
// POR QUE ISTO EXISTE, e por que é tão pequeno. A landing não tinha navegação
// programática: toda saída era `<Link>` ou `<a>`, porque toda saída era um
// CLIQUE, e a única exceção era o `window.location.assign` do fim de
// `/definir-senha`. A lane CKPIX-FLOW cria a segunda exceção — o dono decidiu
// que a tela do checkout leva a pessoa à área do cliente SOZINHA quando o
// desfecho do pagamento chega (RN-560). Não há clique para pendurar um
// link.
//
// POR QUE `location.assign` E NÃO `useRouter().push`. Três razões, nesta ordem:
//   · o destino é o FIM do checkout, e uma carga limpa descarta o estado da
//     compra em vez de arrastá-lo para dentro da área do cliente;
//   · `useRouter()` exige o contexto do App Router montado, e trinta e três
//     suítes de checkout renderizam `CheckoutFlow` sem ele — o hook faria a
//     tela quebrar em todas por causa de um ramo que nenhuma delas exercita;
//   · é o que a casa já faz na única saída programática que existia
//     (`DefinirSenhaFlow`), e uma segunda maneira de sair de uma tela é uma a
//     mais do que este repositório precisa.
//
// A INDIREÇÃO É PARA O TESTE, e é honesta: `jsdom` não navega, então sem uma
// costura o ramo do redirecionamento seria o único dos quatro sem prova.
// =============================================================================

/**
 * Leva o navegador para `href`, descartando a página atual. Sem efeito no
 * servidor (o mesmo guard que `ensureLeela` usa) — chamar de Server Component
 * não quebra o render, só não navega.
 */
export function irPara(href: string): void {
  if (typeof window === 'undefined') return;
  window.location.assign(href);
}
