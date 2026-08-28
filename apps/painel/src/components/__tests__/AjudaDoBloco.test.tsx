// =============================================================================
// AjudaDoBloco — o "?" do cabeçalho de bloco que abre FORA do card.
//
// Migrado de SecaoHead.test.tsx (lane REUSO-E-SHOWROOM, 28/08). O SecaoHead
// local foi consolidado no SectionHeader do DS; o padrão do ícone de ajuda
// foi extraído para AjudaDoBloco.
//
// O que se cobra aqui é a regra do REFACTOR item 8, que é estrutural e não
// estética: a explicação do bloco abre em PORTAL, na raiz do documento. Um
// ancestral com `transform` (o hover de card que sobe um tiquinho, por
// exemplo) vira bloco de contenção e faz qualquer camada posicionada se
// ancorar no card — a dica some atrás do vizinho. O teste afirma o que impede
// isso: o conteúdo não é descendente do bloco que o disparou, e a família
// tipográfica é declarada em vez de herdada, porque fora da árvore do painel
// não há de quem herdar.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AjudaDoBloco } from '../AjudaDoBloco';

describe('AjudaDoBloco · o "?" do cabeçalho (REFACTOR item 8)', () => {
  it('o nome acessível cita o bloco: seis "?" na tela precisam de seis nomes', () => {
    render(<AjudaDoBloco titulo="Situação dos membros" texto="Quem entrou, quem fica." />);
    expect(
      screen.getByRole('button', { name: 'O que "Situação dos membros" mostra' })
    ).toBeInTheDocument();
  });

  it('a explicação fica fechada até alguém pedir', () => {
    render(<AjudaDoBloco titulo="Situação dos membros" texto="Quem entrou, quem fica." />);
    expect(screen.queryByText('Quem entrou, quem fica.')).not.toBeInTheDocument();
  });

  it('aberta, ela renderiza FORA do bloco — em portal de raiz, não dentro do card', async () => {
    const { container } = render(
      <AjudaDoBloco titulo="Situação dos membros" texto="Quem entrou, quem fica." />
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'O que "Situação dos membros" mostra' })
    );
    const conteudo = screen.getByText('Quem entrou, quem fica.');
    expect(conteudo).toBeInTheDocument();
    expect(container.contains(conteudo)).toBe(false);
  });

  it('a família tipográfica é declarada, não herdada (fora da árvore não há de quem herdar)', async () => {
    render(<AjudaDoBloco titulo="Situação dos membros" texto="Quem entrou, quem fica." />);
    await userEvent.click(
      screen.getByRole('button', { name: 'O que "Situação dos membros" mostra' })
    );
    expect(screen.getByText('Quem entrou, quem fica.').className).toContain(
      'font-[family-name:var(--font-family-ui)]'
    );
  });
});
