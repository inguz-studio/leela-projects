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
 * A DURAÇÃO NÃO MORA AQUI. Ela é token: `--motion-overlay-duration` (e
 * `--motion-menu-duration` para menu), no tier COMPARTILHADO de
 * `tokens/component.json` — um valor, os dois temas, uma linha para trocar. O
 * JS lê o mesmo token que o CSS usa para animar, então nunca existem dois
 * números para o mesmo movimento: se a animação dura 800ms e o desmonte
 * esperasse 300ms, o overlay sumiria no meio do fade.
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

/** Duração das superfícies modais (Dialog, Modal, Drawer, Toast). */
export const VAR_DURACAO_OVERLAY = '--motion-overlay-duration';

/**
 * Duração do menu. É outro token de propósito: menu é affordance de PONTEIRO —
 * o item que a pessoa está mirando não pode ainda estar voando quando o dedo
 * chega. 800ms num modal é lento; num menu é quebrado.
 */
export const VAR_DURACAO_MENU = '--motion-menu-duration';

/** Estado de motion exposto no DOM como `data-state` (contrato do preset). */
export type EstadoOverlay = 'open' | 'closed';

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
 * Quanto esperar antes de tirar o nó do DOM. Lê o MESMO token que anima —
 * fonte única. Reduced-motion e token ausente devolvem 0 (desmonte imediato).
 */
export function duracaoDeSaidaMs(variavel: string = VAR_DURACAO_OVERLAY): number {
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
  variavel: string = VAR_DURACAO_OVERLAY,
): PresencaOverlay {
  const [saindo, setSaindo] = React.useState(false);
  const [anterior, setAnterior] = React.useState(open);

  if (anterior !== open) {
    setAnterior(open);
    // Fechou agora → entra em saída. Reabriu no meio da saída → cancela.
    setSaindo(!open);
  }

  React.useEffect(() => {
    if (!saindo) return undefined;
    const ms = duracaoDeSaidaMs(variavel);
    if (ms <= 0) {
      setSaindo(false);
      return undefined;
    }
    const timer = setTimeout(() => setSaindo(false), ms);
    return () => clearTimeout(timer);
  }, [saindo, variavel]);

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
 * `var(--motion-overlay-duration)`, não um número.
 */
export function estiloMotion(
  estado: EstadoOverlay,
  variavel: string = VAR_DURACAO_OVERLAY,
): React.CSSProperties {
  return {
    animationDuration: `var(${variavel})`,
    animationTimingFunction:
      estado === 'open' ? 'var(--motion-easing-enter)' : 'var(--motion-easing-exit)',
  };
}
