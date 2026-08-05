/**
 * REV-MOTION · a janela de COEXISTÊNCIA que a saída animada abriu.
 *
 * O QUE ESTE ARQUIVO PROVA, e por que ele não existia antes. Enquanto o
 * fechamento era seco (`if (!open) return null`), nunca havia dois diálogos
 * vivos no mesmo instante: o que fechava saía do DOM no mesmo tick em que o
 * consumidor dizia `open=false`. A BUILD-MOTION segurou o nó pela duração de
 * saída para que a animação rodasse — e com isso abriu uma janela em que o
 * diálogo que SAI e o diálogo que ENTRA existem juntos.
 *
 * ⚠️ Essa janela ENCOLHEU (o dono separou abrir de fechar em 05/08: 800ms para
 * abrir, 250ms para fechar) e NÃO fechou. Corrida em janela menor é a mesma
 * corrida, só mais difícil de reproduzir à mão — motivo de sobra para os casos
 * abaixo continuarem existindo. Eles leem a duração do token gerado, então
 * seguem medindo a janela real qualquer que seja o número.
 *
 * `document.body` é único, e o retorno de foco também. Nessa janela os dois
 * disputavam ambos:
 *   1. o que SAI restaurava `body.overflow` ao desmontar → a página voltava a
 *      rolar POR TRÁS de um modal que estava na tela;
 *   2. o que SAI chamava `back.focus()` ao desmontar → arrancava o foco de
 *      dentro do diálogo que tinha aberto por cima dele.
 *
 * E um terceiro, que a espera do desmonte tornou provável em vez de raro: o
 * gatilho pode ter sido re-renderizado para fora da árvore nesse meio-tempo.
 * `focus()` num nó desconectado não falha — não faz NADA, e o foco cai no
 * `<body>`. Quem navega por teclado recomeça do topo do documento (WCAG 2.4.3).
 *
 * Os três vetores são de CICLO DE VIDA, não de aparência: rodam em jsdom sem
 * depender de um frame de animação.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import { Dialog } from '../../Dialog';
import { Modal } from '../../Modal';
import { Drawer } from '../../Drawer';
import { brasaTheme } from '../../../theme/rn-themes';
import { msDoValorCSS, VAR_DURACAO_OVERLAY_SAIDA } from '../../../utils/overlayMotion';

// O valor real do produto, do tema gerado — jsdom não carrega `themes/*.css`.
// É a duração de FECHAMENTO porque é ela que mede a janela de coexistência.
const VALOR_SAIDA = brasaTheme['motion-overlay-exit-duration'] ?? '';
const DURACAO = msDoValorCSS(VALOR_SAIDA);

beforeEach(() => {
  vi.useFakeTimers();
  document.documentElement.style.setProperty(VAR_DURACAO_OVERLAY_SAIDA, VALOR_SAIDA);
});

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.style.removeProperty(VAR_DURACAO_OVERLAY_SAIDA);
  document.body.style.removeProperty('overflow');
});

// ---------------------------------------------------------------------------

function DoisOverlays({ a, b }: { a: boolean; b: boolean }): React.JSX.Element {
  return (
    <>
      <Modal open={a} onOpenChange={vi.fn()} title="Primeiro">
        <button type="button">ação A</button>
      </Modal>
      <Drawer open={b} onOpenChange={vi.fn()} title="Segundo">
        <button type="button">ação B</button>
      </Drawer>
    </>
  );
}

describe('⛔ um overlay em SAÍDA não pode desfazer a trava de quem está ABERTO', () => {
  it('a rolagem do body continua travada quando o overlay em saída desmonta', () => {
    const { rerender } = render(<DoisOverlays a b={false} />);
    expect(document.body.style.overflow).toBe('hidden');

    // A fecha; 100ms depois, dentro da saída de A, B abre.
    rerender(<DoisOverlays a={false} b={false} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender(<DoisOverlays a={false} b />);
    expect(document.body.style.overflow).toBe('hidden');

    // A animação de A termina e A desmonta — B segue ABERTO na tela.
    act(() => {
      vi.advanceTimersByTime(DURACAO);
    });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    // Antes do fix: '' — a página rolava atrás do drawer aberto.
    expect(document.body.style.overflow).toBe('hidden');

    // E quando B fecha de verdade, a página volta a rolar (a trava não vaza).
    rerender(<DoisOverlays a={false} b={false} />);
    act(() => {
      vi.advanceTimersByTime(DURACAO);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('o overlay em saída não arranca o foco de dentro do overlay aberto', () => {
    const abridor = document.createElement('button');
    abridor.textContent = 'abriu o primeiro';
    document.body.appendChild(abridor);
    abridor.focus();

    const { rerender } = render(<DoisOverlays a b={false} />);
    rerender(<DoisOverlays a={false} b={false} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender(<DoisOverlays a={false} b />);

    const painelB = screen.getAllByRole('dialog').find((no) => no.getAttribute('data-state') !== 'closed');
    expect(painelB?.contains(document.activeElement)).toBe(true);

    act(() => {
      vi.advanceTimersByTime(DURACAO);
    });
    // Antes do fix: o desmonte de A devolvia o foco ao `abridor` e a pessoa
    // ficava tabulando a página com o drawer aberto na frente.
    expect(document.activeElement).not.toBe(abridor);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);

    abridor.remove();
  });
});

// ---------------------------------------------------------------------------

describe('⛔ o caso EMPILHADO não pode ser vítima do conserto da coexistência', () => {
  // "Só o último devolve o foco" é a regra que parece certa e quebra aqui: uma
  // confirmação aberta POR CIMA de um diálogo nunca é a última a fechar, e o
  // foco ficaria largado em vez de voltar ao botão que a abriu. A regra é a
  // PILHA — devolve quem estava no TOPO —, e as duas situações se separam pela
  // ordem de abertura.
  it('a confirmação por cima devolve o foco ao botão de dentro do diálogo de baixo', () => {
    // ⚠️ Handlers ESTÁVEIS. Um `onOpenChange` recriado a cada render muda a
    // identidade do `onClose`, o efeito do hook re-roda inteiro (cleanup +
    // setup) e o foco pula do painel para o abridor e de volta em toda
    // re-renderização — ruído que não tem nada a ver com o que este caso mede.
    const nada = (): void => {};

    // O `Modal` não recebe `returnFocusRef`: ele cai no abridor, que é quem
    // tinha o foco no instante da abertura — o botão dentro do diálogo de baixo.
    function Empilhado({ confirmacao }: { confirmacao: boolean }): React.JSX.Element {
      return (
        <Dialog open onOpenChange={nada} title="Regulamento">
          <button type="button" data-testid="abrir-confirmacao">
            Aceitar
          </button>
          <Modal open={confirmacao} onOpenChange={nada} title="Confirmar">
            <button type="button">Sim</button>
          </Modal>
        </Dialog>
      );
    }

    const { rerender } = render(<Empilhado confirmacao={false} />);
    screen.getByTestId('abrir-confirmacao').focus();
    rerender(<Empilhado confirmacao />);
    // A confirmação está por cima e tem o foco.
    expect(document.activeElement).not.toBe(screen.getByTestId('abrir-confirmacao'));

    rerender(<Empilhado confirmacao={false} />);
    act(() => {
      vi.advanceTimersByTime(DURACAO);
    });

    // O diálogo de baixo continua aberto — e o foco voltou para dentro dele.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByTestId('abrir-confirmacao'));
    // E a rolagem segue travada: o diálogo de baixo ainda está na tela.
    expect(document.body.style.overflow).toBe('hidden');
  });
});

// ---------------------------------------------------------------------------

describe('⛔ retorno de foco a um alvo que já saiu do documento', () => {
  it('pula o alvo desconectado e cai no abridor ainda vivo', () => {
    // Um `returnFocusRef` que aponta para um nó JÁ removido do documento. É o
    // caso que a espera de 800ms tornou alcançável: entre o `open=false` e o
    // desmonte cabe uma re-renderização inteira do consumidor. `focus()` num nó
    // desconectado não falha — não faz NADA, e o foco fica no <body>.
    const morto = document.createElement('button');
    document.body.appendChild(morto);
    const alvoMorto: React.RefObject<HTMLElement | null> = { current: morto };

    const abridor = document.createElement('button');
    abridor.textContent = 'abridor';
    document.body.appendChild(abridor);
    abridor.focus();

    const { rerender } = render(
      <Dialog open onOpenChange={vi.fn()} title="Entrar" returnFocusRef={alvoMorto}>
        <p>corpo</p>
      </Dialog>,
    );
    // O gatilho é arrancado da página durante a saída — o ref segue apontando
    // para o nó órfão.
    morto.remove();

    rerender(
      <Dialog open={false} onOpenChange={vi.fn()} title="Entrar" returnFocusRef={alvoMorto}>
        <p>corpo</p>
      </Dialog>,
    );
    act(() => {
      vi.advanceTimersByTime(DURACAO);
    });

    // Antes do fix: o `??` aceitava o nó morto, `focus()` era no-op e o foco
    // terminava no <body> — quem navega por teclado recomeça do topo.
    expect(document.activeElement).toBe(abridor);

    abridor.remove();
  });
});
