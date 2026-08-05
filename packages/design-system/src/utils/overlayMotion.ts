/**
 * overlayMotion — o motor de entrada e SAÍDA das superfícies de sobreposição
 * (BUILD-MOTION · ordem do dono de 04/08: "todos os modais, overlays, drawers
 * devem aparecer com uma leve animação de fade-in ou sliding, para abrir e
 * fechar; a mesma coisa para os toasts").
 *
 * O PROBLEMA QUE ELE RESOLVE. Todos os overlays do DS eram Radix-free e
 * faziam `if (!open) return null` — o nó saía do DOM no mesmo tick em que o
 * `open` virava `false`. As classes `data-[state=closed]:animate-out` que
 * `Modal` e `Drawer` já carregavam nunca chegaram a rodar um frame sequer: o
 * elemento que deveria animar já não existia. A entrada era suave e o
 * fechamento era seco — exatamente a metade que o dono viu faltando.
 *
 * A saída animada exige UMA coisa que o React não dá de graça: manter o nó
 * vivo depois que o consumidor já disse `open=false`. É o que `usePresencaOverlay`
 * faz — e é a razão de este arquivo existir em vez de cada componente
 * improvisar um `setTimeout` próprio.
 *
 * A DURAÇÃO NÃO MORA AQUI. Ela é token, no tier COMPARTILHADO de
 * `tokens/component.json` — os dois temas, uma linha para trocar. O JS lê o
 * mesmo token que o CSS usa para animar, então nunca existem dois números para
 * o mesmo movimento: se a animação dura 800ms e o desmonte esperasse 300ms, o
 * overlay sumiria no meio do fade.
 *
 * ⛔ ABRIR E FECHAR SÃO DOIS TOKENS, NÃO UM (decisão do dono · 05/08). A
 * REV-MOTION mediu o custo do token único: com 800ms nos dois sentidos a página
 * ficava 800ms EXATOS inerte a cada fechamento — a cortina interceptando
 * clique, o `body` sem rolar e o diálogo ainda se declarando `aria-modal`.
 * Diante do número, o dono separou os dois sentidos: `--motion-overlay-enter-
 * duration` = 800ms, `--motion-overlay-exit-duration` = 250ms. A razão dele,
 * que fica escrita aqui para não ser "otimizada" de volta por simetria: a
 * ABERTURA é onde a marca aparece, e o tempo ali é o que ela custa; o
 * FECHAMENTO acontece depois de a pessoa já ter decidido sair, e lentidão nessa
 * hora não é marca, é pedágio.
 *
 * ⚠️ É A DURAÇÃO DE SAÍDA que define a janela de inércia. Ela é o número que o
 * `usePresencaOverlay` espera antes de tirar o nó do DOM — e é durante essa
 * espera que a página fica coberta. A de entrada não segura nada: o nó já está
 * lá. Quem mexer nesses tokens mexe em coisas de naturezas diferentes.
 *
 * O MENU tem um token só para as duas direções (`--motion-menu-duration`, 120ms)
 * porque nele não há esse trade-off: 120ms não é pedágio em sentido nenhum.
 *
 * SEM TOKEN = SEM ESPERA. Quando a variável não resolve (SSR, jsdom, consumidor
 * que não importou o tema), a duração é 0 e o comportamento degrada
 * exatamente para o de antes desta lane: desmonte imediato. Preferimos perder
 * a animação a deixar um nó preso na tela.
 *
 * ⛔ prefers-reduced-motion É REQUISITO, NÃO ENFEITE. Quem pede menos
 * movimento recebe 0ms aqui (desmonte imediato) E nenhuma classe de animação
 * lá (todas gated por `motion-safe:` nos componentes). As duas metades leem o
 * MESMO sinal — não existe caminho em que o CSS anime e o JS não espere, ou o
 * contrário.
 *
 * Zero dependência nova: React + CSS. O gate `server-safety.test.ts` reprova
 * biblioteca de animação sem razão escrita, e não há razão — `data-state` +
 * keyframes do preset já entregam o movimento.
 */

import * as React from 'react';

/** ABERTURA das superfícies modais (Dialog, Modal, Drawer, Toast). 800ms. */
export const VAR_DURACAO_OVERLAY_ENTRADA = '--motion-overlay-enter-duration';

/**
 * FECHAMENTO das mesmas superfícies. 250ms — e é ESTE o número que mede a
 * inércia da página, porque é ele que o `usePresencaOverlay` espera com a
 * cortina ainda na frente.
 */
export const VAR_DURACAO_OVERLAY_SAIDA = '--motion-overlay-exit-duration';

/**
 * Duração do menu. É outro token de propósito: menu é affordance de PONTEIRO —
 * o item que a pessoa está mirando não pode ainda estar voando quando o dedo
 * chega. 800ms num modal é lento; num menu é quebrado. Um valor para as duas
 * direções: em 120ms não existe o trade-off que separou abrir de fechar no
 * overlay.
 */
export const VAR_DURACAO_MENU = '--motion-menu-duration';

/** Estado de motion exposto no DOM como `data-state` (contrato do preset). */
export type EstadoOverlay = 'open' | 'closed';

/**
 * As duas durações de uma superfície, sempre juntas. Existe para que abrir e
 * fechar não possam ser passados separados por engano: quem escolhe a
 * superfície escolhe o par inteiro, e o motor decide qual metade usar.
 */
export interface ParDeDuracao {
  /** Variável CSS da animação de ABERTURA. */
  entrada: string;
  /** Variável CSS da animação de FECHAMENTO — a que define a janela de inércia. */
  saida: string;
}

/** Superfícies modais: abre em 800ms, fecha em 250ms. */
export const DURACAO_OVERLAY: ParDeDuracao = {
  entrada: VAR_DURACAO_OVERLAY_ENTRADA,
  saida: VAR_DURACAO_OVERLAY_SAIDA,
};

/** Menu: o mesmo token nas duas direções, de propósito. */
export const DURACAO_MENU: ParDeDuracao = {
  entrada: VAR_DURACAO_MENU,
  saida: VAR_DURACAO_MENU,
};

export interface PresencaOverlay {
  /** O nó deve estar no DOM? Continua `true` durante toda a saída. */
  presente: boolean;
  /** Vai para o `data-state` do nó — é ele que dispara enter/exit no CSS. */
  estado: EstadoOverlay;
}

/**
 * `true` quando o sistema pede menos movimento. Defensivo por opção: ambiente
 * sem `matchMedia` (jsdom antigo, SSR) responde `false` em vez de explodir.
 */
export function prefereMenosMovimento(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** `800ms` → 800 · `0.8s` → 800 · `''`/lixo → 0. */
export function msDoValorCSS(bruto: string): number {
  const valor = bruto.trim();
  if (valor.length === 0) return 0;
  const numero = Number.parseFloat(valor);
  if (!Number.isFinite(numero) || numero <= 0) return 0;
  // `ms` antes de `s`: "800ms" termina em "s" e cairia no ramo errado.
  if (valor.endsWith('ms')) return numero;
  if (valor.endsWith('s')) return numero * 1000;
  return numero;
}

/**
 * Quanto esperar antes de tirar o nó do DOM. Lê o MESMO token que anima a
 * SAÍDA — fonte única. Reduced-motion e token ausente devolvem 0 (desmonte
 * imediato).
 */
export function duracaoDeSaidaMs(variavel: string = VAR_DURACAO_OVERLAY_SAIDA): number {
  if (typeof document === 'undefined') return 0;
  if (prefereMenosMovimento()) return 0;
  const bruto = getComputedStyle(document.documentElement).getPropertyValue(variavel);
  return msDoValorCSS(bruto);
}

/**
 * Mantém o nó montado durante a animação de saída.
 *
 * O ajuste de estado acontece DURANTE o render (padrão oficial do React para
 * derivar estado de props) e não num efeito: assim `presente` já é `true` no
 * mesmo commit em que `open` virou `true` — abrir não ganha um frame de
 * atraso, e o `Dialog` que hoje aparece na hora continua aparecendo na hora.
 */
export function usePresencaOverlay(
  open: boolean,
  par: ParDeDuracao = DURACAO_OVERLAY,
): PresencaOverlay {
  const [saindo, setSaindo] = React.useState(false);
  const [anterior, setAnterior] = React.useState(open);
  // ⚠️ SAÍDA, nunca entrada: o que este hook mede é quanto tempo o nó fica
  // vivo DEPOIS do `open=false` — a janela em que a página segue coberta.
  const variavelDeSaida = par.saida;

  if (anterior !== open) {
    setAnterior(open);
    // Fechou agora → entra em saída. Reabriu no meio da saída → cancela.
    setSaindo(!open);
  }

  React.useEffect(() => {
    if (!saindo) return undefined;
    const ms = duracaoDeSaidaMs(variavelDeSaida);
    if (ms <= 0) {
      setSaindo(false);
      return undefined;
    }
    const timer = setTimeout(() => setSaindo(false), ms);
    return () => clearTimeout(timer);
    // A dependência é a STRING, não o objeto: um par montado inline no
    // consumidor não re-dispara o relógio a cada render.
  }, [saindo, variavelDeSaida]);

  return { presente: open || saindo, estado: open ? 'open' : 'closed' };
}

/**
 * Duração e easing do nó animado, por REFERÊNCIA ao token — o valor continua
 * no CSS, o componente só aponta para ele.
 *
 * Por que `style` e não classe utilitária: `.animate-in` do preset já fixa
 * `animation-duration: var(--motion-duration-fast)` (150ms, o ritmo de
 * micro-interação do DS). Sobrescrever isso por outra classe utilitária
 * dependeria da ORDEM em que o Tailwind emite as duas — empate de
 * especificidade resolvido por sorte. O atributo `style` vence sempre, sem
 * depender de ordenação, e continua 100% token: o que está inline é
 * `var(--motion-overlay-enter-duration)`, não um número.
 *
 * Duração e easing andam JUNTOS pelo estado: quem abre usa o par de entrada,
 * quem fecha usa o de saída. Era assim que o easing já funcionava; a duração
 * passou a acompanhar quando os dois sentidos deixaram de ter o mesmo número.
 */
export function estiloMotion(
  estado: EstadoOverlay,
  par: ParDeDuracao = DURACAO_OVERLAY,
): React.CSSProperties {
  const abrindo = estado === 'open';
  return {
    animationDuration: `var(${abrindo ? par.entrada : par.saida})`,
    animationTimingFunction: abrindo ? 'var(--motion-easing-enter)' : 'var(--motion-easing-exit)',
  };
}
