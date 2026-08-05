/**
 * REV-MOTION · o que a suíte da lane não cobria.
 *
 * Três lacunas, todas de CRITÉRIO DE ACEITE (não de aparência):
 *
 *  1. ⛔ prefers-reduced-motion foi provado em DOIS dos cinco primitivos
 *     (Dialog e Toast). O `Directive` do commit diz que o sinal tem duas
 *     metades — as classes `motion-safe:` e a espera zerada em
 *     `duracaoDeSaidaMs` — e que mexer numa sem a outra produz overlay que
 *     espera sem animar (tela travada). Sem prova nos cinco, três superfícies
 *     dependiam de leitura de código. Aqui os CINCO respondem.
 *
 *  2. O CUSTO DO FECHAR É UM NÚMERO, e ele não estava fixado em teste nenhum.
 *     O commit registra o efeito colateral em prosa ("a cortina segue
 *     interceptando clique") e classifica como `Not-tested`. É justamente o
 *     dado que o dono precisa para decidir a duração, então ele vira medida:
 *     a página fica inerte por EXATAMENTE a duração do token de FECHAMENTO, e
 *     nem 1ms a mais.
 *
 *     ⚠️ A MEDIDA VEM DO TOKEN GERADO, não de um literal. `brasaTheme` é a
 *     saída de `pnpm generate-tokens`, ou seja, o número que o produto embarca
 *     de verdade. Foi assim que a decisão de 05/08 (800ms para abrir, 250ms
 *     para fechar) entrou aqui sem ninguém caçar `800` espalhado em teste — e
 *     é assim que a próxima troca vai entrar. Um número solto neste arquivo
 *     transformaria "mudar a duração" numa varredura.
 *
 *  3. O TIMER É ARTESANAL (`setTimeout` próprio, não biblioteca). Timer
 *     artesanal que sobrevive ao desmonte é vazamento clássico, e o caminho
 *     "pai desmonta no meio da saída" existe de verdade: o header troca de
 *     ramo quando a sessão vira nomeada, com o overlay ainda saindo.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Dialog } from '../../components/Dialog';
import { Modal } from '../../components/Modal';
import { Drawer } from '../../components/Drawer';
import { DropdownMenu } from '../../components/DropdownMenu';
import { ToastProvider, useToast } from '../../components/Toast';
import { brasaTheme } from '../../theme/rn-themes';
import {
  msDoValorCSS,
  VAR_DURACAO_MENU,
  VAR_DURACAO_OVERLAY_ENTRADA,
  VAR_DURACAO_OVERLAY_SAIDA,
} from '../overlayMotion';

// Os valores REAIS do produto, lidos do tema gerado. jsdom não carrega
// `themes/*.css`, então o teste planta os mesmos números no `documentElement`.
const VALOR_ENTRADA = brasaTheme['motion-overlay-enter-duration'] ?? '';
const VALOR_SAIDA = brasaTheme['motion-overlay-exit-duration'] ?? '';
const VALOR_MENU = brasaTheme['motion-menu-duration'] ?? '';

/** A janela de inércia da página: quanto tempo a cortina fica na frente. */
const SAIDA = msDoValorCSS(VALOR_SAIDA);
const ENTRADA = msDoValorCSS(VALOR_ENTRADA);

function definirToken(variavel: string, valor: string): void {
  document.documentElement.style.setProperty(variavel, valor);
}

/** Liga o stub de `prefers-reduced-motion: reduce`. jsdom não tem matchMedia. */
function pedirMenosMovimento(): void {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: consulta.includes('prefers-reduced-motion: reduce'),
    media: consulta,
    onchange: null,
    addEventListener: (): void => {},
    removeEventListener: (): void => {},
    addListener: (): void => {},
    removeListener: (): void => {},
    dispatchEvent: (): boolean => false,
  }));
}

const ACOES = [{ id: 'a', label: 'Editar', onClick: vi.fn() }];

function DisparadorDeToast(): React.JSX.Element {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast({ title: 'Salvo', variant: 'success' })}>
      Disparar
    </button>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  definirToken(VAR_DURACAO_OVERLAY_ENTRADA, VALOR_ENTRADA);
  definirToken(VAR_DURACAO_OVERLAY_SAIDA, VALOR_SAIDA);
  definirToken(VAR_DURACAO_MENU, VALOR_MENU);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty(VAR_DURACAO_OVERLAY_ENTRADA);
  document.documentElement.style.removeProperty(VAR_DURACAO_OVERLAY_SAIDA);
  document.documentElement.style.removeProperty(VAR_DURACAO_MENU);
  document.body.style.removeProperty('overflow');
});

// ---------------------------------------------------------------------------
// 1 — reduced-motion nos CINCO
// ---------------------------------------------------------------------------

describe('⛔ reduced-motion: com o token cheio, os cinco saem sem esperar nada', () => {
  it('Dialog', () => {
    pedirMenosMovimento();
    const { rerender } = render(
      <Dialog open onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Dialog>,
    );
    rerender(
      <Dialog open={false} onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Modal', () => {
    pedirMenosMovimento();
    const { rerender } = render(
      <Modal open onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Modal>,
    );
    rerender(
      <Modal open={false} onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Drawer', () => {
    pedirMenosMovimento();
    const props = { title: 'T', onOpenChange: vi.fn() } as const;
    const { rerender } = render(
      <Drawer open {...props}>
        <p>c</p>
      </Drawer>,
    );
    rerender(
      <Drawer open={false} {...props}>
        <p>c</p>
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('DropdownMenu', () => {
    pedirMenosMovimento();
    const props = {
      actions: ACOES,
      onOpenChange: vi.fn(),
      trigger: <button type="button">Ações</button>,
    };
    const { rerender } = render(<DropdownMenu open {...props} />);
    rerender(<DropdownMenu open={false} {...props} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('Toast', () => {
    pedirMenosMovimento();
    render(
      <ToastProvider>
        <DisparadorDeToast />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('a rolagem do body volta na hora — reduced-motion não deixa a tela travada', () => {
    pedirMenosMovimento();
    const { rerender } = render(
      <Modal open onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <Modal open={false} onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('');
  });
});

describe('⛔ nenhuma classe de animação sem o gate motion-safe (os cinco)', () => {
  // Ocorrência CRUA da classe (sem prefixo) é o que reprova: é ela que rodaria
  // para quem pediu menos movimento.
  const CRUA = /(^|\s)(animate-in|animate-out|fade-in-0|fade-out-0|zoom-in-95|zoom-out-95|slide-in-from-[a-z0-9-]+|slide-out-to-[a-z0-9-]+)\b/;

  it('Drawer — cortina e painel', () => {
    render(
      <Drawer open title="T" onOpenChange={vi.fn()}>
        <p>c</p>
      </Drawer>,
    );
    const painel = screen.getByRole('dialog');
    const cortina = screen.getByTestId('drawer-overlay');
    expect(painel.className).toContain('motion-safe:data-[state=closed]:animate-out');
    expect(painel.className).not.toMatch(CRUA);
    expect(cortina.className).not.toMatch(CRUA);
  });

  it('Toast', () => {
    render(
      <ToastProvider>
        <DisparadorDeToast />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));
    const toast = screen.getByRole('status');
    expect(toast.className).toContain('motion-safe:data-[state=closed]:animate-out');
    expect(toast.className).not.toMatch(CRUA);
  });

  it('DropdownMenu', () => {
    render(
      <DropdownMenu
        open
        actions={ACOES}
        onOpenChange={vi.fn()}
        trigger={<button type="button">Ações</button>}
      />,
    );
    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('motion-safe:data-[state=closed]:animate-out');
    expect(menu.className).not.toMatch(CRUA);
  });
});

// ---------------------------------------------------------------------------
// 2 — o número: quanto tempo a página fica inerte depois do "fechar"
// ---------------------------------------------------------------------------

describe('o custo do fechar é EXATAMENTE a duração do token de FECHAMENTO', () => {
  it('cortina, trava de rolagem e aria-modal duram o token — nem 1ms a mais', () => {
    const { rerender } = render(
      <Modal open onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Modal>,
    );
    rerender(
      <Modal open={false} onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Modal>,
    );

    act(() => {
      vi.advanceTimersByTime(SAIDA - 1);
    });
    // A um milissegundo do fim a página AINDA está inerte: a cortina cobre a
    // tela inteira, o body não rola e o diálogo ainda se declara modal.
    expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('modal-overlay').className).toContain('fixed inset-0');
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('a medida acompanha o token — trocar o número move os dois juntos', () => {
    // Um valor que não é nem o de abertura nem o de fechamento embarcados: se
    // o código lesse qualquer outra coisa, este teste não fecharia em 90ms.
    definirToken(VAR_DURACAO_OVERLAY_SAIDA, '90ms');
    const { rerender } = render(
      <Modal open onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Modal>,
    );
    rerender(
      <Modal open={false} onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Modal>,
    );
    act(() => {
      vi.advanceTimersByTime(89);
    });
    expect(document.body.style.overflow).toBe('hidden');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(document.body.style.overflow).toBe('');
  });

  // -------------------------------------------------------------------------
  // A decisão do dono de 05/08, virada em teste.
  // -------------------------------------------------------------------------
  // A REV-MOTION mediu o custo do token único e o dono respondeu separando os
  // dois sentidos: a abertura é onde a marca aparece; o fechamento vem depois
  // de a pessoa já ter decidido sair, e ali lentidão é pedágio. Se alguém
  // religar a espera do desmonte no token de ABERTURA — o erro natural, já que
  // era um token só —, a página volta a ficar inerte pelo tempo da entrada e é
  // exatamente isto que reprova aqui.
  it('⛔ a janela de inércia é a duração de FECHAMENTO, nunca a de abertura', () => {
    expect(SAIDA).toBeLessThan(ENTRADA);

    const { rerender } = render(
      <Modal open onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Modal>,
    );
    rerender(
      <Modal open={false} onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Modal>,
    );

    act(() => {
      vi.advanceTimersByTime(SAIDA);
    });
    // Passada a duração de FECHAMENTO a página já é da pessoa de novo, mesmo
    // com o token de abertura valendo bem mais.
    expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3 — o timer artesanal e o desmonte
// ---------------------------------------------------------------------------

describe('o relógio da saída não sobrevive ao desmonte do pai', () => {
  it('desmontar no meio da saída não deixa timer vivo nem trava a rolagem', () => {
    const { rerender, unmount } = render(
      <Modal open onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Modal>,
    );
    rerender(
      <Modal open={false} onOpenChange={vi.fn()} title="T">
        <p>c</p>
      </Modal>,
    );
    act(() => {
      vi.advanceTimersByTime(SAIDA / 2);
    });
    unmount();

    expect(vi.getTimerCount()).toBe(0);
    // A rolagem volta com o desmonte — não fica presa esperando um timer que
    // já não existe.
    expect(document.body.style.overflow).toBe('');

    act(() => {
      vi.advanceTimersByTime(SAIDA * 3);
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
