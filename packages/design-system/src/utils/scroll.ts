/**
 * Rolagem — a regra da casa (BUILD-SCROLL-PADRAO, 2026-08-06).
 *
 * Este arquivo É a regra, não a descrição dela. Nenhum componente e nenhuma tela
 * escreve `overflow-x-*` ou `overflow-y-*` na mão: quem rola importa uma das três
 * constantes daqui. Quem escrever o eixo solto não passa no `eslint` — a regra
 * `leela-scroll/no-scroll-de-um-eixo` (`packages/design-system/lint`) aponta o
 * arquivo, a linha e a constante que resolve.
 *
 * ## Por que a regra existe
 *
 * O dono reportou "scroll duplo" três vezes: menu secundário do evento, CRM e
 * kits. Sempre o mesmo mecanismo, e ele está na especificação do CSS, não em bug
 * de navegador:
 *
 *   CSS Overflow 3 §3.1 — quando um eixo é declarado e o outro fica `visible`,
 *   o `visible` computa para `auto`.
 *
 * Quer dizer: `overflow-y: auto` sozinho não entrega um contêiner de rolagem,
 * entrega dois. O segundo fica invisível até o dia em que algum conteúdo estoura
 * o eixo que ninguém declarou, e aí nasce a barra que o dono vê. No Windows e no
 * Chrome essa barra é clássica, ocupa espaço: ela come ~15px do eixo oposto e
 * empurra o conteúdo a estourar de volta. A horizontal fabrica a vertical. Foi
 * essa cascata, medida no SubNav (fd6e5e69).
 *
 * ## As três formas legítimas de rolar
 *
 * 1. `SCROLL_Y_ONLY` — a página e os painéis (modal, gaveta, sidebar). Rolam na
 *    vertical e só.
 * 2. `SCROLL_X_ONLY` — o dado largo, matriz de comparação. Rola na horizontal
 *    COM a barra à mostra: numa tabela densa a barra é a única pista de que a
 *    grade continua para o lado. Esconder o cromo aqui esconderia coluna.
 * 3. `SCROLL_X_ONLY_SEM_CROMO` — a navegação (SubNav). Rola na horizontal sem
 *    barra nenhuma, por ordem do dono, dita duas vezes. A pista é a aba cortada
 *    na borda, mais as setas ←/→ que já movem o foco.
 *
 * ## Fechar o eixo oposto não recorta nada de novo
 *
 * Trocar o eixo PROMOVIDO (um `auto` que ninguém pediu) por `hidden` explícito
 * não muda o que é recortado: o eixo promovido já tinha estabelecido o contexto
 * de recorte. O que muda é a barra sumir. E `hidden` continua rolável por
 * programa, então o navegador ainda revela o elemento que recebeu foco por
 * teclado. É por isso que a constante usa `hidden` e não `clip`: `clip` perderia
 * essa revelação e tiraria conteúdo do alcance do teclado.
 *
 * ## Quem pode rolar na horizontal
 *
 * O widget largo, dentro dele mesmo, nunca a página. A `Table` já dizia isso em
 * prosa ("scroll-x CONTIDO no card, nunca no body/documento") e era a única peça
 * a dizer. Agora vale para todos, e o contêiner de rolagem da página
 * (`RootShell`) fecha o eixo x. Se uma tela ficar larga, isso é defeito DA TELA,
 * e o conserto é na tela — `flex-wrap`, `min-w-0`, `truncate`, `basis-full` —
 * não em soltar uma barra horizontal no painel inteiro. O `min-w-0` do `<main>`
 * do AppShell já existia com essa mesma intenção declarada ("a constraint
 * IMPEDE, não só esconde"); a página agora acompanha.
 *
 * ## A ordem no `cn()` faz parte da trava
 *
 * `cn` é `twMerge`, que resolve conflito pelo ÚLTIMO da lista. A constante entra
 * SEMPRE DEPOIS do `className` do consumidor. Com ela antes, um `overflow-y-auto`
 * vindo de fora apagava a trava em silêncio e o teste continuava verde, porque
 * renderiza sem `className` — foi o achado da REV-LOTES (c2b19244). Todo
 * componente que aceita `className` no elemento que rola tem teste de override.
 */

/**
 * Contêiner que rola na VERTICAL e só. Eixo x fechado explicitamente para o CSS
 * não promovê-lo a `auto` e desenhar uma barra horizontal que ninguém pediu.
 *
 * Use na página, no corpo de modal/diálogo, em gaveta e em painel lateral.
 */
export const SCROLL_Y_ONLY = 'overflow-y-auto overflow-x-hidden';

/**
 * Contêiner que rola na HORIZONTAL e só, COM a barra visível. Eixo y fechado
 * pelo mesmo motivo: sem isso, a barra horizontal clássica rouba altura e o
 * resto vira uma barra vertical fantasma de ~15px de curso.
 *
 * Use em dado largo cuja continuação para o lado precisa de pista: matriz de
 * comparação, grade densa. Não use em navegação.
 */
export const SCROLL_X_ONLY = 'overflow-x-auto overflow-y-hidden';

/**
 * Igual ao `SCROLL_X_ONLY`, sem o cromo da barra. O conteúdo continua alcançável
 * por gesto, trackpad, arrastar e teclado — o que some é o desenho da barra.
 *
 * Use só em NAVEGAÇÃO (SubNav), onde a aba cortada na borda já é a afordância e
 * o dono pediu explicitamente que nenhuma barra apareça. Em dado, prefira o
 * `SCROLL_X_ONLY`: esconder o cromo ali esconde que existe mais coluna.
 */
export const SCROLL_X_ONLY_SEM_CROMO = `${SCROLL_X_ONLY} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`;
