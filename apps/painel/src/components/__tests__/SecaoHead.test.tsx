// =============================================================================
// SecaoHead — o cabeçalho de bloco, e o "?" que abre FORA do card.
//
// O que se cobra aqui é a regra do REFACTOR item 8, que é estrutural e não
// estética: a explicação do bloco abre em PORTAL, na raiz do documento. Um
// ancestral com `transform` (o hover de card que sobe um tiquinho, por
// exemplo) vira bloco de contenção e faz qualquer camada posicionada se
// ancorar no card —
// a dica some atrás do vizinho. O teste afirma o que impede isso: o conteúdo
// não é descendente do bloco que o disparou, e a família tipográfica é
// declarada em vez de herdada, porque fora da árvore do painel não há de quem
// herdar.
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SecaoHead } from '../SecaoHead';

describe('SecaoHead · o "?" do cabeçalho (REFACTOR item 8)', () => {
  it('sem `ajuda`, não existe botão nenhum — cabeçalho não ganha enfeite', () => {
    render(<SecaoHead titulo="Situação dos membros" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('o nome acessível cita o bloco: seis "?" na tela precisam de seis nomes', () => {
    render(<SecaoHead titulo="Situação dos membros" ajuda="Quem entrou, quem fica." />);
    expect(
      screen.getByRole('button', { name: 'O que "Situação dos membros" mostra' })
    ).toBeInTheDocument();
  });

  it('a explicação fica fechada até alguém pedir', () => {
    render(<SecaoHead titulo="Situação dos membros" ajuda="Quem entrou, quem fica." />);
    expect(screen.queryByText('Quem entrou, quem fica.')).not.toBeInTheDocument();
  });

  it('aberta, ela renderiza FORA do bloco — em portal de raiz, não dentro do card', async () => {
    const { container } = render(
      <SecaoHead titulo="Situação dos membros" ajuda="Quem entrou, quem fica." />
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'O que "Situação dos membros" mostra' })
    );
    const conteudo = screen.getByText('Quem entrou, quem fica.');
    expect(conteudo).toBeInTheDocument();
    expect(container.contains(conteudo)).toBe(false);
  });

  it('a família tipográfica é declarada, não herdada (fora da árvore não há de quem herdar)', async () => {
    render(<SecaoHead titulo="Situação dos membros" ajuda="Quem entrou, quem fica." />);
    await userEvent.click(
      screen.getByRole('button', { name: 'O que "Situação dos membros" mostra' })
    );
    expect(screen.getByText('Quem entrou, quem fica.').className).toContain(
      'font-[family-name:var(--font-family-ui)]'
    );
  });
});

describe('SecaoHead · slots que já existiam', () => {
  it('o link de ação continua chamando quem o passou', async () => {
    const onAcao = vi.fn();
    render(<SecaoHead titulo="Bloco" acaoRotulo="Ver tudo" onAcao={onAcao} />);
    await userEvent.click(screen.getByRole('button', { name: /Ver tudo/ }));
    expect(onAcao).toHaveBeenCalledTimes(1);
  });

  it('a descrição, quando existe, fica visível sob o título', () => {
    render(<SecaoHead titulo="Bloco" descricao="Uma linha de contexto." />);
    expect(screen.getByText('Uma linha de contexto.')).toBeInTheDocument();
  });
});
