/**
 * useDialogBehavior — comportamento ADQUIRIDO de diálogo, Radix-free (ADR-017).
 *
 * PROVENIÊNCIA: extraído verbatim do efeito do `Dialog` público (que por sua
 * vez generalizou o `RegulamentoModal` provado pela lane SECFIX com 10/10
 * testes). É a fonte ÚNICA da parte perigosa de duplicar — focus trap cíclico,
 * Esc, scroll-lock do body e retorno de foco — consumida por TRÊS superfícies:
 *   - `Dialog` (skin pública, bottom-sheet → centrado);
 *   - `Modal` (skin do painel, centrado, ex-Radix — convergência da pendência
 *     (1) do ADR-017: some o `@radix-ui/react-dialog` do grafo);
 *   - `Drawer` (off-canvas do painel, ex-Radix).
 * O comportamento é único; a SKIN (DOM/classe/motion) é de cada componente.
 *
 * Contrato (DoD Modal): Esc fecha; foco ENTRA no alvo ao abrir (X, ou o 1º
 * focável, ou o próprio painel via tabIndex=-1 quando não há focável — paridade
 * com o autofocus do Radix Content); Tab/Shift+Tab CÍCLICOS dentro do painel
 * (aria-modal sinaliza AT mas não bloqueia teclado — W2-F-05); scroll do body
 * travado enquanto aberto e restaurado quando o ÚLTIMO diálogo fecha; foco
 * RETORNA ao abridor (`returnFocusRef`, com fallback no elemento ativo no
 * momento da abertura) — e só para um alvo que ainda exista no documento.
 *
 * ⛔ O "último" e o "ainda exista" não são detalhe: a saída animada da
 * BUILD-MOTION mantém o nó vivo por 800ms depois do `open=false`, o que criou
 * uma janela em que dois diálogos coexistem. Ver o bloco da trava compartilhada
 * mais abaixo e `__tests__/useDialogBehavior.coexistencia.test.tsx`.
 */

import * as React from 'react';

// Seletor dos elementos focáveis (suficiente para conteúdo de diálogo: botões,
// links, campos). Mantido simples de propósito — não é um focus-trap genérico
// de biblioteca.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ---------------------------------------------------------------------------
// Trava de rolagem COMPARTILHADA (REV-MOTION · 05/08)
// ---------------------------------------------------------------------------
// `document.body` é um recurso único e todo diálogo do DS o disputa. Enquanto o
// fechamento era seco isso nunca apareceu: o nó saía do DOM no mesmo tick, e
// nunca havia dois diálogos vivos ao mesmo tempo. Com a SAÍDA ANIMADA da
// BUILD-MOTION o nó sobrevive `--motion-overlay-exit-duration` depois do
// `open=false` — abriu-se uma janela em que o diálogo que SAI e o que ENTRA
// coexistem. Cada um salvava e restaurava o `overflow` por conta própria, então
// o desmonte do que SAI devolvia `overflow: ''` com o outro ainda aberto: a
// página voltava a rolar POR TRÁS de um modal na tela.
//
// ⚠️ A janela ENCOLHEU de 800ms para 250ms em 05/08 (o dono separou abrir de
// fechar), mas não fechou: 250ms de dois overlays vivos é a mesma disputa em
// tempo menor. Encurtar duração nunca conserta corrida — só a torna mais rara,
// que é o pior estado possível para um bug.
//
// O contador resolve a disputa sem cada componente saber do outro: o primeiro
// que entra guarda o valor original e trava; o ÚLTIMO que sai destrava.
let travasDeRolagem = 0;
let overflowOriginal: string | null = null;

function travarRolagem(): void {
  if (travasDeRolagem === 0) overflowOriginal = document.body.style.overflow;
  travasDeRolagem += 1;
  document.body.style.overflow = 'hidden';
}

function destravarRolagem(): void {
  travasDeRolagem = Math.max(0, travasDeRolagem - 1);
  if (travasDeRolagem > 0) return;
  document.body.style.overflow = overflowOriginal ?? '';
  overflowOriginal = null;
}

// ---------------------------------------------------------------------------
// Quem devolve o foco: o do TOPO, não o último
// ---------------------------------------------------------------------------
// O foco também é recurso único, e a mesma janela de coexistência o disputa —
// mas a regra aqui NÃO é "só o último devolve". Essa regra parece certa e quebra
// o caso empilhado: um diálogo que abre um segundo por cima (confirmação) não
// seria o último ao fechar, e o foco ficaria largado em vez de voltar ao botão
// que abriu a confirmação, dentro do diálogo de baixo.
//
// A regra correta é a PILHA: devolve o foco quem estava no topo. A pilha segue a
// ordem de abertura, e as duas situações se separam sozinhas:
//   - empilhado (confirmação sobre diálogo): o de cima fecha primeiro, ele É o
//     topo → devolve o foco ao abridor dele. Certo.
//   - coexistência (A saindo, B abrindo): A abriu ANTES, então B está no topo.
//     A desmonta 800ms depois e NÃO é o topo → não encosta no foco de B. Certo.
const pilhaDeDialogos: symbol[] = [];

function empilharDialogo(id: symbol): void {
  pilhaDeDialogos.push(id);
}

/** `true` se este diálogo era o topo — só ele tem direito ao retorno de foco. */
function desempilharDialogo(id: symbol): boolean {
  const eraTopo = pilhaDeDialogos[pilhaDeDialogos.length - 1] === id;
  const posicao = pilhaDeDialogos.lastIndexOf(id);
  if (posicao !== -1) pilhaDeDialogos.splice(posicao, 1);
  return eraTopo;
}

// Primeiro candidato que AINDA está no documento. `back?.focus()` num nó já
// removido não falha e não faz nada: o foco cai silenciosamente no `<body>` e
// quem navega por teclado recomeça do topo da página (WCAG 2.4.3). Com a saída
// animada o desmonte acontece 800ms depois do fechar — tempo de sobra para o
// gatilho ter sido re-renderizado para fora da árvore.
function primeiroConectado(
  ...candidatos: readonly (HTMLElement | null | undefined)[]
): HTMLElement | null {
  for (const candidato of candidatos) {
    if (candidato != null && candidato.isConnected) return candidato;
  }
  return null;
}

export interface UseDialogBehaviorOptions {
  open: boolean;
  /** Fecha o diálogo (ex.: () => onOpenChange(false)). */
  onClose: () => void;
  /** Painel do diálogo — escopo do focus trap e alvo do foco fallback. */
  panelRef: React.RefObject<HTMLElement | null>;
  /**
   * Elemento que recebe o foco ao abrir. Sem ele, foca o 1º focável do painel;
   * sem focável, foca o próprio painel (precisa de tabIndex=-1) — paridade com
   * o autofocus do Radix Content.
   */
  initialFocusRef?: React.RefObject<HTMLElement | null> | undefined;
  /**
   * Elemento que recebe o foco de volta ao fechar (ex.: o botão que abriu).
   * Sem ele, devolve ao elemento ativo no momento da abertura.
   */
  returnFocusRef?: React.RefObject<HTMLElement | null> | undefined;
}

export function useDialogBehavior({
  open,
  onClose,
  panelRef,
  initialFocusRef,
  returnFocusRef,
}: UseDialogBehaviorOptions): void {
  // Elemento ativo no momento da abertura — fallback do retorno de foco.
  const openerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Identidade deste diálogo na pilha — nasce a cada abertura.
    const id = Symbol('dialogo');

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (panel === null) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      const insidePanel = active instanceof HTMLElement && panel.contains(active);
      if (e.shiftKey) {
        // Shift+Tab no primeiro (ou com foco fora do painel) → cicla p/ último.
        if (!insidePanel || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!insidePanel || active === last) {
        // Tab no último (ou com foco fora do painel) → cicla p/ primeiro.
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    travarRolagem();
    empilharDialogo(id);

    // Foco de entrada: alvo explícito → 1º focável → o próprio painel.
    const panel = panelRef.current;
    const target =
      initialFocusRef?.current ??
      panel?.querySelector<HTMLElement>(FOCUSABLE) ??
      panel ??
      null;
    target?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      destravarRolagem();
      // Retorna o foco ao abridor ao fechar (retorno de foco do DoD Modal).
      // Só o do TOPO: um diálogo em saída animada que já não está no topo
      // arrancaria o foco de dentro do diálogo aberto por cima dele.
      if (!desempilharDialogo(id)) return;
      // E só para um alvo que AINDA existe — ver `primeiroConectado`.
      primeiroConectado(returnFocusRef?.current, openerRef.current)?.focus();
    };
  }, [open, onClose, panelRef, initialFocusRef, returnFocusRef]);
}
