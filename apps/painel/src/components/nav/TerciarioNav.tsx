// =============================================================================
// TerciarioNav — o menu TERCIÁRIO do painel, publicado como peça única.
//
// A fala do dono que criou este arquivo, na íntegra (27/08, sessão de aprovação
// da landing):
//
//   "o formato de menu em clubs, configurações ficou bom, pois o menu terciário
//    se encaixa melhor no formato web. Padronize isso no desktop."
//
// ## A decisão que esta peça carrega, e por que ela contraria o default de 17/08
//
// A S049/RN-574 propôs matar este formato e substituí-lo por um `TabsPanel` de
// PAINÉIS EXCLUSIVOS (o conteúdo troca no lugar, só a seção ativa existe). Esse
// default nasceu do vetável TERCIARIO-1, que perguntava: *"abas fixas" mata o
// formato âncora?* — e o vetável ficou dez dias sem resposta.
//
// A fala de 27/08 responde, e responde na LEITURA ALTERNATIVA da própria spec:
// o `TabsPanel` nunca foi construído (a onda B não subiu), então o que o dono
// olhou na tela e chamou de bom foi EXATAMENTE o molde âncora que já existia —
// coluna vertical sticky, seções empilhadas, pílula preenchida no ativo. Ele
// elogiou o que estava no ar. O default de painéis exclusivos fica DERRUBADO
// pela fala, e junto com ele morre o efeito colateral que a spec registrou como
// honesto: o Ctrl+F do navegador deixando de achar texto de outra seção.
//
// O que ele pediu é o FORMATO DO MENU ("o formato de menu… se encaixa melhor no
// formato web"), não o modelo de conteúdo. Por isso esta peça padroniza a
// APARÊNCIA e a ANATOMIA do terciário, e deixa cada área escolher o mecanismo:
//
//   · modo ROTA   — item com `href`, navegação SPA, `aria-current="page"`.
//     Cada seção continua sendo uma rota com dado próprio, guard próprio e
//     endereço colável. É o caso de Configurações do evento.
//   · modo ÂNCORA — item com `onClick`, `aria-current="true"`. As seções são
//     blocos empilhados na mesma rota, com scroll spy. É o molde dos Clubs,
//     preservado intacto.
//
// Uma peça, dois mecanismos, uma aparência — que é literalmente o que o cânone
// exige: *"Área, sub-área e terciária são o mesmo componente com a mesma
// aparência: não existe variante por nível de profundidade"*
// (`03-canon/canone-de-componentes.md:234-235`).
//
// ## Por que aqui e não no `@leela/design-system`
//
// Mesma fronteira do `AreaSubNav` ao lado: esta peça fia `react-router`, que o
// DS não tem como dependência e não deve ter (o pacote é consumido pela landing
// Next e pelo mobile). Precedente literal do movimento em `CartaoV3.tsx:9-12` e
// `SecaoHead.tsx:10-14`, e o mesmo veredito que a S049-T1 tomou ao promover o
// bloco de Insights para `src/components/` em vez de para o DS.
//
// ## Responsividade — o mandato aberto do dono, e a escolha
//
// Ele escopou o pedido ao desktop ("Padronize isso NO DESKTOP") e abriu o resto:
// *"permito você buscar a melhor solução"*. A escolha, com a conta:
//
//   Abaixo de `lg` a coluna vira uma FAIXA HORIZONTAL rolável; de `lg` para cima
//   é a coluna sticky que ele elogiou.
//
// A conta que decide: a coluna vertical, num 390, custa ~200px de dobra (5 itens
// × 36px + respiros) ANTES do primeiro campo — numa tela onde a barra superior
// já come ~61px e a barra inferior cobra os 82px que ESTA MESMA RODADA mandou
// encolher (V2708-04). Entregar um menu de 200px no mesmo commit em que se corta
// a barra por ser "muito grande" seria contradizer o dono com a mão direita
// enquanto se obedece com a esquerda. A faixa horizontal custa ~44px.
//
// E ela não é linguagem visual nova: abaixo de `lg` o terciário fica com a mesma
// silhueta da barra que o painel usa em todos os outros níveis. É a orientação
// dupla que a própria RN-574 pediu ("a peça é uma só com orientação horizontal
// ou vertical"), só que resolvida por CSS no MESMO DOM — sem segundo componente,
// sem breakpoint em JavaScript, sem remontagem na virada.
//
// ## O ativo é pílula preenchida, e isso é uma decisão de robustez
//
// O `SubNav` marca o ativo com um indicador que DESLIZA, e a posição dele vem de
// medição em runtime (`offsetLeft`/`offsetWidth`). Essa mecânica é a origem de
// dois defeitos já pagos pelo projeto (a pílula estourando a barra mobile, S053;
// e o indicador que não remede quando só a largura disponível muda) e é a causa
// do V2708-05 desta rodada.
//
// O terciário marca o ativo com FUNDO no próprio item — zero medição, zero
// `useLayoutEffect`, zero indicador absoluto. A consequência é que ele funciona
// idêntico nas duas orientações sem uma linha de JavaScript de layout, e a
// classe de defeito do V2708-05 NÃO TEM ONDE EXISTIR nesta peça. Foi escolha, e
// está escrita aqui para não ser "simplificada" de volta.
//
// ⛔ Sem borda (V2708-07 · §2.16): o ativo é preenchimento, nunca traço.
// =============================================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { SCROLL_X_ONLY_SEM_CROMO } from '@leela/design-system';
import { terciarioComNavSpa } from '../../lib/navSpa';

export interface TerciarioItem {
  /** Identificador estável da seção (vira sufixo de `id` no modo âncora). */
  id: string;
  label: string;
  /**
   * Modo ROTA. O `href` FICA no DOM (ctrl/cmd+clique, clique do meio, copiar
   * endereço) e o clique simples é interceptado pelo `onClick` — mesmo contrato
   * do `navSpa` que rege as outras barras.
   */
  href?: string;
  /** Modo ÂNCORA (ou o interceptador de SPA do modo rota). */
  onClick?: (event: React.MouseEvent) => void;
  active: boolean;
}

export interface TerciarioNavProps {
  itens: readonly TerciarioItem[];
  /** Rótulo do landmark. Obrigatório: cada área nomeia o próprio menu. */
  'aria-label': string;
}

/** Item ativo — preenchimento, peso e tinta primária. Sem borda. */
const ITEM_ATIVO =
  'bg-[var(--action-ghost-hover)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]';

/** Item inativo — só tinta, o hover promove. */
const ITEM_INATIVO = 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]';

/**
 * Anatomia comum às duas orientações. `text-left` alinha o rótulo no modo
 * coluna; `whitespace-nowrap` impede que a faixa horizontal quebre um rótulo em
 * duas linhas e cresça de altura.
 */
const ITEM_BASE =
  'block w-full rounded-[var(--radius-sm)] px-[var(--spacing-3)] py-[var(--spacing-2)] ' +
  'text-left whitespace-nowrap no-underline cursor-pointer bg-transparent border-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]';

/**
 * A virada de orientação, e ela é SÓ CSS.
 *
 * Abaixo de `lg`: `flex-row` + rolagem horizontal sem cromo (o mesmo utilitário
 * que segura a `SubNav`, pela mesma razão — barra clássica do Windows comendo
 * altura útil é a cascata documentada em `utils/scroll`). Os itens param de
 * esticar (`w-auto`) e param de encolher (`shrink-0`) para o rótulo não ser
 * espremido.
 *
 * De `lg` para cima: `flex-col`, itens em largura cheia, sem rolagem.
 */
const LISTA =
  `flex flex-row gap-[var(--spacing-1)] ${SCROLL_X_ONLY_SEM_CROMO} ` +
  'lg:flex-col lg:overflow-visible';

const ITEM_ORIENTACAO = 'w-auto shrink-0 lg:w-full lg:shrink';

export function TerciarioNav({ itens, 'aria-label': ariaLabel }: TerciarioNavProps): JSX.Element {
  return (
    <nav
      aria-label={ariaLabel}
      data-terciario=""
      // A coluna gruda só onde ela É coluna. Na faixa horizontal o sticky seria
      // uma barra flutuante que o dono não pediu — e roubaria dobra de novo.
      className="lg:sticky lg:top-[var(--spacing-6)] lg:self-start"
    >
      <ul className={LISTA}>
        {itens.map((item) => {
          const classe = `${ITEM_BASE} ${ITEM_ORIENTACAO} ${item.active ? ITEM_ATIVO : ITEM_INATIVO}`;
          return (
            <li key={item.id} className="shrink-0 lg:shrink lg:w-full">
              {item.href !== undefined ? (
                <a
                  href={item.href}
                  // `page` é o valor certo quando o item leva a OUTRA rota; o
                  // modo âncora usa `true`, porque a página não muda.
                  aria-current={item.active ? 'page' : undefined}
                  onClick={item.onClick}
                  className={classe}
                >
                  {item.label}
                </a>
              ) : (
                <button
                  type="button"
                  aria-current={item.active ? 'true' : undefined}
                  onClick={item.onClick}
                  className={classe}
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

TerciarioNav.displayName = 'TerciarioNav';

/**
 * O terciário em modo ROTA, com a navegação de SPA já fiada.
 *
 * Mesma fronteira do `AreaSubNav`: a área decide QUAIS são os itens e qual é o
 * ativo (a moldura da área, nunca a página — lição do D-1008-R16); o roteamento
 * é daqui. Área que use o modo âncora monta o `TerciarioNav` direto, porque não
 * há rota para fiar.
 */
export function AreaTerciarioNav({
  itens,
  'aria-label': ariaLabel,
}: TerciarioNavProps): JSX.Element {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return <TerciarioNav itens={terciarioComNavSpa(itens, navigate, pathname)} aria-label={ariaLabel} />;
}

AreaTerciarioNav.displayName = 'AreaTerciarioNav';

/**
 * A MOLDURA do terciário — o 25/75 que o dono elogiou, numa peça só.
 *
 * Existe pela lição do D-1008-R16 (menu colado página a página produz aba órfã e
 * largura que salta entre irmãs) e pela RN-568: repetir `lg:grid-cols-[1fr_3fr]`
 * em cada área é como as áreas divergem. Quem monta passa o menu e o conteúdo.
 */
export function TerciarioLayout({
  nav,
  children,
}: {
  nav: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  // Sem menu não há 25/75: a coluna vazia deixaria uma calha de 25% mordendo a
  // largura do conteúdo por nada. Área que gateia o menu por papel (o papel que
  // alcança uma seção só) cai aqui, e recebe a largura inteira.
  if (nav === null || nav === undefined || nav === false) {
    return <div className="flex min-w-0 flex-col gap-[var(--spacing-6)]">{children}</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-[1fr_3fr]">
      {nav}
      <div className="flex min-w-0 flex-col gap-[var(--spacing-6)]">{children}</div>
    </div>
  );
}

TerciarioLayout.displayName = 'TerciarioLayout';
