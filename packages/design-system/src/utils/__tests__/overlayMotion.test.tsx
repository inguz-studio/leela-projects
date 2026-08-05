/**
 * Movimento das superfícies de sobreposição (BUILD-MOTION · 04/08).
 *
 * O que este arquivo prova, e por que cada prova existe:
 *
 *  1. A DURAÇÃO VEM DO TOKEN. O mesmo diálogo, com dois valores diferentes no
 *     token de saída, espera dois tempos diferentes. Um número hardcoded em
 *     qualquer lugar do caminho reprova aqui — é a garantia de que trocar o
 *     ritmo custa UMA linha em `tokens/component.json` e não uma varredura por
 *     componente.
 *  2. A SAÍDA ESPERA A ANIMAÇÃO. O nó continua no DOM, com `data-state="closed"`,
 *     durante toda a duração — e some no fim. Era exatamente isso que faltava:
 *     as classes `animate-out` existiam desde a A2 e nunca rodaram um frame,
 *     porque o `if (!open) return null` matava o nó no mesmo tick.
 *  3. ⛔ prefers-reduced-motion ENCURTA PARA ZERO. Quem pede menos movimento
 *     não espera nada e não vê animação nenhuma — nos dois sentidos. É critério
 *     de aceite, não enfeite.
 *  4. O MENU LÊ OUTRO TOKEN. `--motion-menu-duration` e não o do overlay — a
 *     prova é feita com os tokens todos definidos ao mesmo tempo, então trocar
 *     um pelo outro no código faria o teste falhar.
 *  5. ABRIR E FECHAR SÃO DOIS TOKENS (decisão do dono · 05/08). O que anima a
 *     abertura é `--motion-overlay-enter-duration`; o que a espera do desmonte
 *     lê é `--motion-overlay-exit-duration`.
 *
 * ⚠️ OS NÚMEROS AQUI SÃO SINTÉTICOS, de propósito: cada caso planta o próprio
 * valor no token e cobra o mesmo valor de volta, então o arquivo prova o
 * MECANISMO sem conhecer o ritmo do produto. A medida do número real —
 * quanto tempo a página fica inerte com o token que embarca — vive em
 * `overlayMotion.rev.test.tsx`, ancorada no tema gerado.
 *
 * jsdom não implementa `window.matchMedia` (verificado): `prefereMenosMovimento`
 * responde `false` por guarda, e é por isso que a suíte inteira que já existia
 * segue passando sem tocar em nada. Aqui o stub é explícito quando o cenário é
 * o de reduced-motion.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Dialog } from '../../components/Dialog';
import { Modal } from '../../components/Modal';
import { Drawer } from '../../components/Drawer';
import { DropdownMenu } from '../../components/DropdownMenu';
import { ToastProvider, useToast } from '../../components/Toast';
import {
  DURACAO_MENU,
  duracaoDeSaidaMs,
  estiloMotion,
  msDoValorCSS,
  prefereMenosMovimento,
  VAR_DURACAO_MENU,
  VAR_DURACAO_OVERLAY_ENTRADA,
  VAR_DURACAO_OVERLAY_SAIDA,
} from '../overlayMotion';

// ---------------------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------------------

/**
 * Duração de saída SINTÉTICA. Não é o número do produto (esse mora no token e
 * é medido na suíte da REV): é um valor escolhido justamente por não ser nem o
 * de abertura nem o de fechamento embarcados, para que "o código leu o token"
 * e "o código chutou o número de sempre" não possam se confundir.
 */
const SAIDA = 500;
const SAIDA_CSS = `${SAIDA}ms`;

function definirToken(variavel: string, valor: string): void {
  document.documentElement.style.setProperty(variavel, valor);
}

/** Liga o stub de `prefers-reduced-motion: reduce`. jsdom não tem matchMedia. */
function pedirMenosMovimento(reduzido: boolean): void {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: reduzido && consulta.includes('prefers-reduced-motion: reduce'),
    media: consulta,
    onchange: null,
    addEventListener: (): void => {},
    removeEventListener: (): void => {},
    addListener: (): void => {},
    removeListener: (): void => {},
    dispatchEvent: (): boolean => false,
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty(VAR_DURACAO_OVERLAY_ENTRADA);
  document.documentElement.style.removeProperty(VAR_DURACAO_OVERLAY_SAIDA);
  document.documentElement.style.removeProperty(VAR_DURACAO_MENU);
});

// ---------------------------------------------------------------------------
// Leitura do token
// ---------------------------------------------------------------------------

describe('overlayMotion — a duração é token, não número no código', () => {
  it('lê ms e s do valor CSS; valor ausente ou inválido vira 0 (sem espera)', () => {
    expect(msDoValorCSS('800ms')).toBe(800);
    expect(msDoValorCSS(' 250ms ')).toBe(250);
    expect(msDoValorCSS('0.8s')).toBe(800);
    expect(msDoValorCSS('')).toBe(0);
    expect(msDoValorCSS('lento')).toBe(0);
    expect(msDoValorCSS('0ms')).toBe(0);
  });

  it('duracaoDeSaidaMs devolve o que estiver no token — os dois, cada um o seu', () => {
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    definirToken(VAR_DURACAO_MENU, '120ms');
    expect(duracaoDeSaidaMs()).toBe(SAIDA);
    expect(duracaoDeSaidaMs(VAR_DURACAO_MENU)).toBe(120);
  });

  it('⛔ a espera do desmonte lê o token de SAÍDA e ignora o de abertura', () => {
    // O token de abertura existe e vale outra coisa. Se `duracaoDeSaidaMs`
    // caísse nele — o erro natural de quem lembra do token único —, a página
    // ficaria inerte pelo tempo da ENTRADA a cada fechamento, que é
    // exatamente o pedágio que a decisão de 05/08 tirou.
    definirToken(VAR_DURACAO_OVERLAY_ENTRADA, '900ms');
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    expect(duracaoDeSaidaMs()).toBe(SAIDA);
  });

  it('sem token definido, não há espera (degrada para o desmonte imediato)', () => {
    expect(duracaoDeSaidaMs()).toBe(0);
  });

  it('estiloMotion referencia a VARIÁVEL, nunca um número — e uma por sentido', () => {
    const abrindo = estiloMotion('open');
    const fechando = estiloMotion('closed');
    // Duração e easing andam juntos pelo estado: abrir e fechar são movimentos
    // diferentes, com números diferentes desde 05/08.
    expect(abrindo.animationDuration).toBe('var(--motion-overlay-enter-duration)');
    expect(fechando.animationDuration).toBe('var(--motion-overlay-exit-duration)');
    expect(abrindo.animationTimingFunction).toBe('var(--motion-easing-enter)');
    expect(fechando.animationTimingFunction).toBe('var(--motion-easing-exit)');
    // O menu tem um token só, e ele vale nas duas direções.
    expect(estiloMotion('open', DURACAO_MENU).animationDuration).toBe(
      'var(--motion-menu-duration)',
    );
    expect(estiloMotion('closed', DURACAO_MENU).animationDuration).toBe(
      'var(--motion-menu-duration)',
    );
    for (const valor of Object.values({ ...abrindo, ...fechando })) {
      expect(String(valor)).toMatch(/^var\(--motion-[a-z-]+\)$/);
      expect(String(valor)).not.toMatch(/\d/);
    }
  });

  it('⛔ reduced-motion zera a espera mesmo com o token definido', () => {
    definirToken(VAR_DURACAO_OVERLAY_ENTRADA, '900ms');
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    pedirMenosMovimento(true);
    expect(prefereMenosMovimento()).toBe(true);
    // As DUAS zeradas: nenhum sentido sobra esperando.
    expect(duracaoDeSaidaMs()).toBe(0);
    expect(duracaoDeSaidaMs(VAR_DURACAO_OVERLAY_ENTRADA)).toBe(0);
    expect(duracaoDeSaidaMs(VAR_DURACAO_MENU)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Dialog (superfície pública)
// ---------------------------------------------------------------------------

function DialogControlado({ open }: { open: boolean }): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={vi.fn()} title="Entrar">
      <p>corpo</p>
    </Dialog>
  );
}

describe('Dialog — saída animada de verdade', () => {
  it('o nó espera a duração do token antes de sair do DOM', () => {
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    const { rerender } = render(<DialogControlado open />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<DialogControlado open={false} />);
    // Ainda na tela, agora marcado como saindo — é o frame que faltava.
    const saindo = screen.getByRole('dialog');
    expect(saindo).toHaveAttribute('data-state', 'closed');

    act(() => {
      vi.advanceTimersByTime(SAIDA - 1);
    });
    expect(screen.queryByRole('dialog')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('trocar o token troca a espera — nenhuma duração está no código', () => {
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, '90ms');
    const { rerender } = render(<DialogControlado open />);
    rerender(<DialogControlado open={false} />);

    act(() => {
      vi.advanceTimersByTime(90);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('⛔ reduced-motion: fecha na hora, sem animação e sem espera', () => {
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    pedirMenosMovimento(true);
    const { rerender } = render(<DialogControlado open />);
    rerender(<DialogControlado open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toda classe de animação é gated por motion-safe (cortina e painel)', () => {
    render(<DialogControlado open />);
    const container = screen.getByRole('dialog');
    const painel = container.querySelector('.bg-surface-raised');
    const cortina = container.querySelector('[aria-hidden]');
    expect(painel?.className).toContain('motion-safe:data-[state=open]:animate-in');
    expect(painel?.className).toContain('motion-safe:data-[state=closed]:animate-out');
    expect(cortina?.className).toContain('motion-safe:data-[state=open]:fade-in-0');
    expect(cortina?.className).toContain('motion-safe:data-[state=closed]:fade-out-0');
    // Nenhuma classe de animação SEM o gate — a busca é por ocorrência crua.
    for (const no of [painel, cortina]) {
      expect(no?.className).not.toMatch(/(^|\s)(animate-in|animate-out|fade-in-0|fade-out-0)\b/);
    }
  });

  it('mobile é bottom-sheet e desktop é fade+zoom — a regra da superfície', () => {
    render(<DialogControlado open />);
    const painel = screen.getByRole('dialog').querySelector('.bg-surface-raised');
    // Mobile: sobe da borda que ele encosta (items-end).
    expect(painel?.className).toContain('motion-safe:data-[state=open]:slide-in-from-bottom');
    expect(painel?.className).toContain('motion-safe:data-[state=closed]:slide-out-to-bottom');
    // Desktop (sm+): zera a translação e usa zoom — card centrado não desliza.
    expect(painel?.className).toContain('motion-safe:sm:data-[state=open]:slide-in-from-bottom-0');
    expect(painel?.className).toContain('motion-safe:sm:data-[state=open]:zoom-in-95');
    expect(painel?.className).toContain('motion-safe:sm:data-[state=closed]:zoom-out-95');
  });

  it('o painel aponta para o token no style — nunca um número inline', () => {
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    const { rerender } = render(<DialogControlado open />);
    const painel = (): HTMLElement | null =>
      screen.getByRole('dialog').querySelector<HTMLElement>('.bg-surface-raised');
    // Aberto: o token de ABERTURA.
    expect(painel()?.style.animationDuration).toBe('var(--motion-overlay-enter-duration)');
    expect(painel()?.style.animationTimingFunction).toBe('var(--motion-easing-enter)');

    // Saindo: o de FECHAMENTO — o nó troca de token junto com o `data-state`.
    rerender(<DialogControlado open={false} />);
    expect(painel()?.style.animationDuration).toBe('var(--motion-overlay-exit-duration)');
    expect(painel()?.style.animationTimingFunction).toBe('var(--motion-easing-exit)');
  });

  it('reabrir no meio da saída cancela o desmonte (o nó não some depois)', () => {
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    const { rerender } = render(<DialogControlado open />);
    rerender(<DialogControlado open={false} />);
    act(() => {
      vi.advanceTimersByTime(SAIDA / 2);
    });
    rerender(<DialogControlado open />);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-state', 'open');
    act(() => {
      vi.advanceTimersByTime(SAIDA * 2);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Modal e Drawer (superfície do painel)
// ---------------------------------------------------------------------------

describe('Modal — saída animada e reduced-motion', () => {
  it('espera o token antes de desmontar, com data-state=closed no caminho', () => {
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    const { rerender } = render(
      <Modal open onOpenChange={vi.fn()} title="Confirmar">
        <p>corpo</p>
      </Modal>,
    );
    rerender(
      <Modal open={false} onOpenChange={vi.fn()} title="Confirmar">
        <p>corpo</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('data-state', 'closed');
    expect(screen.getByTestId('modal-overlay')).toHaveAttribute('data-state', 'closed');

    act(() => {
      vi.advanceTimersByTime(SAIDA);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('⛔ ganhou o gate motion-safe que só o Drawer tinha', () => {
    render(
      <Modal open onOpenChange={vi.fn()} title="Confirmar">
        <p>corpo</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('motion-safe:data-[state=open]:animate-in');
    expect(dialog.className).toContain('motion-safe:data-[state=closed]:zoom-out-95');
    expect(dialog.className).not.toMatch(/(^|\s)(animate-in|zoom-in-95)\b/);
  });
});

describe('Drawer — o off-canvas volta deslizando', () => {
  it('espera o token e sai com slide-out para a borda ancorada', () => {
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    const props = { title: 'Menu', onOpenChange: vi.fn() } as const;
    const { rerender } = render(
      <Drawer open {...props}>
        <p>conteúdo</p>
      </Drawer>,
    );
    rerender(
      <Drawer open={false} {...props}>
        <p>conteúdo</p>
      </Drawer>,
    );
    const painel = screen.getByRole('dialog');
    expect(painel).toHaveAttribute('data-state', 'closed');
    expect(painel.className).toContain('motion-safe:data-[state=closed]:slide-out-to-left');

    act(() => {
      vi.advanceTimersByTime(SAIDA);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// DropdownMenu — outro token, de propósito
// ---------------------------------------------------------------------------

describe('DropdownMenu — ritmo de menu, não de modal', () => {
  it('sai em --motion-menu-duration, mesmo com o token de overlay bem maior', () => {
    definirToken(VAR_DURACAO_OVERLAY_ENTRADA, '900ms');
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    definirToken(VAR_DURACAO_MENU, '120ms');
    const props = {
      actions: [{ id: 'a', label: 'Editar', onClick: vi.fn() }],
      onOpenChange: vi.fn(),
      trigger: <button type="button">Ações</button>,
    };
    const { rerender } = render(<DropdownMenu open {...props} />);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    rerender(<DropdownMenu open={false} {...props} />);
    expect(screen.getByRole('menu')).toHaveAttribute('data-state', 'closed');

    act(() => {
      vi.advanceTimersByTime(120);
    });
    // Se o menu lesse qualquer token de overlay, ainda faltaria tempo aqui.
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('menu em saída não engole clique', () => {
    definirToken(VAR_DURACAO_MENU, '120ms');
    const props = {
      actions: [{ id: 'a', label: 'Editar', onClick: vi.fn() }],
      onOpenChange: vi.fn(),
      trigger: <button type="button">Ações</button>,
    };
    const { rerender } = render(<DropdownMenu open {...props} />);
    rerender(<DropdownMenu open={false} {...props} />);
    expect(screen.getByRole('menu').className).toContain('data-[state=closed]:pointer-events-none');
  });
});

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function DisparadorDeToast(): React.JSX.Element {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast({ title: 'Salvo', variant: 'success' })}>
      Disparar
    </button>
  );
}

describe('Toast — some pelo caminho por onde veio', () => {
  it('o item fica na fila durante a saída e some no fim do token', () => {
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    render(
      <ToastProvider>
        <DisparadorDeToast />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'open');

    fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }));
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'closed');

    act(() => {
      vi.advanceTimersByTime(SAIDA - 1);
    });
    expect(screen.queryByRole('status')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('o auto-dismiss de 4s também sai animado (não é corte)', () => {
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    render(
      <ToastProvider>
        <DisparadorDeToast />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'closed');

    act(() => {
      vi.advanceTimersByTime(SAIDA);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('⛔ reduced-motion: o toast sai no mesmo tick do dismiss', () => {
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, SAIDA_CSS);
    pedirMenosMovimento(true);
    render(
      <ToastProvider>
        <DisparadorDeToast />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
