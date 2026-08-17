/**
 * RowActions — o que se afirma aqui é o que o dono pediu e o que a
 * acessibilidade cobra, não a aparência.
 *
 * O centro é o VOCABULÁRIO FECHADO: mesmo verbo, mesmo ícone, em qualquer
 * tabela. Um teste que só checasse "renderiza N botões" passaria verde no dia
 * em que duas telas escolhessem lápis diferentes para "editar" — que é o
 * defeito que a peça existe para impedir.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RowActions, ICONES_DE_ACAO, type RowAction } from '../RowActions';

const acao = (over: Partial<RowAction> = {}): RowAction => ({
  id: 'ver',
  label: 'Ver detalhe de Marina Silva',
  verbo: 'ver',
  onClick: vi.fn(),
  ...over,
});

describe('RowActions — nome acessível', () => {
  it('todo ícone tem aria-label; nenhum botão fica sem nome', () => {
    render(
      <RowActions
        actions={[
          acao(),
          acao({ id: 'editar', verbo: 'editar', label: 'Editar Marina Silva' }),
        ]}
      />,
    );

    const botoes = screen.getAllByRole('button');
    expect(botoes.length).toBe(2);
    for (const b of botoes) {
      expect(b.getAttribute('aria-label')).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Ver detalhe de Marina Silva' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar Marina Silva' })).toBeTruthy();
  });

  /**
   * A dica é reforço VISUAL. Se ela fosse o único canal do nome, a ação sumiria
   * para leitor de tela — e some mesmo para quem só olha, porque a dica só
   * existe no hover e no foco.
   */
  it('o nome NÃO depende da dica: existe com a dica fechada', () => {
    render(<RowActions actions={[acao()]} />);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver detalhe de Marina Silva' })).toBeTruthy();
  });

  it('a dica aparece no foco de teclado e repete o rótulo', async () => {
    render(<RowActions actions={[acao()]} />);
    fireEvent.focus(screen.getByRole('button', { name: 'Ver detalhe de Marina Silva' }));

    await waitFor(() => {
      expect(screen.getAllByText('Ver detalhe de Marina Silva').length).toBeGreaterThan(0);
    });
  });
});

describe('RowActions — vocabulário fechado', () => {
  it('o mesmo verbo desenha o MESMO ícone em instâncias diferentes', () => {
    const { container: a } = render(<RowActions actions={[acao({ label: 'Ver A' })]} />);
    const { container: b } = render(
      <RowActions actions={[acao({ id: 'x', label: 'Ver B (outra tabela)' })]} />,
    );

    const svgA = a.querySelector('button svg');
    const svgB = b.querySelector('button svg');
    expect(svgA).toBeTruthy();
    expect(svgB).toBeTruthy();
    // Mesma classe de ícone lucide = mesmo desenho.
    expect(svgA?.getAttribute('class')).toBe(svgB?.getAttribute('class'));
  });

  it('verbos diferentes desenham ícones diferentes', () => {
    const { container } = render(
      <RowActions
        actions={[
          acao(),
          acao({ id: 'editar', verbo: 'editar', label: 'Editar' }),
          acao({ id: 'remover', verbo: 'remover', label: 'Remover' }),
        ]}
      />,
    );
    const classes = [...container.querySelectorAll('button svg')].map((s) => s.getAttribute('class'));
    expect(new Set(classes).size).toBe(3);
  });

  it('o vocabulário cobre os 16 verbos que o inventário mediu', () => {
    // Se um verbo sair daqui sem sair do cânone, a peça passa a mentir sobre a
    // cobertura — e a próxima tabela inventa o seu.
    expect(Object.keys(ICONES_DE_ACAO).sort()).toEqual(
      [
        'abrir',
        'aplicar',
        'aprovar',
        'capacidade',
        'copiar',
        'desativar',
        'editar',
        'encomendar',
        'identificar',
        'liberar',
        'receber',
        'recusar',
        'registrar',
        'remover',
        'revogar',
        'ver',
      ].sort(),
    );
  });
});

describe('RowActions — comportamento', () => {
  it('clicar dispara a ação daquela linha', () => {
    const onClick = vi.fn();
    render(<RowActions actions={[acao({ onClick })]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhe de Marina Silva' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('ação desabilitada não dispara', () => {
    const onClick = vi.fn();
    render(<RowActions actions={[acao({ onClick, disabled: true })]} />);
    const botao = screen.getByRole('button', { name: 'Ver detalhe de Marina Silva' });
    expect(botao).toBeDisabled();
    fireEvent.click(botao);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('até o limite, tudo fica à vista — sem menu', () => {
    render(
      <RowActions
        actions={[
          acao(),
          acao({ id: 'e', verbo: 'editar', label: 'Editar' }),
          acao({ id: 'r', verbo: 'remover', label: 'Remover' }),
        ]}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Mais ações' })).toBeNull();
    expect(screen.getAllByRole('button').length).toBe(3);
  });

  /**
   * Com UM item sobrando o menu trocaria um clique por dois para esconder um
   * ícone só — por isso o recolhimento só vale acima de `maximoVisivel + 1`.
   */
  it('um item além do limite continua à vista (menu não compensa)', () => {
    render(
      <RowActions
        actions={[
          acao(),
          acao({ id: 'e', verbo: 'editar', label: 'Editar' }),
          acao({ id: 'r', verbo: 'remover', label: 'Remover' }),
          acao({ id: 'c', verbo: 'copiar', label: 'Copiar' }),
        ]}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Mais ações' })).toBeNull();
    expect(screen.getAllByRole('button').length).toBe(4);
  });

  it('excedente de dois ou mais vira menu nomeado', () => {
    render(
      <RowActions
        menuLabel="Mais ações de Marina Silva"
        actions={[
          acao(),
          acao({ id: 'e', verbo: 'editar', label: 'Editar' }),
          acao({ id: 'r', verbo: 'remover', label: 'Remover' }),
          acao({ id: 'c', verbo: 'copiar', label: 'Copiar' }),
          acao({ id: 'a', verbo: 'aprovar', label: 'Aprovar' }),
        ]}
      />,
    );
    // 3 visíveis + o gatilho do menu
    expect(screen.getAllByRole('button').length).toBe(4);
    expect(screen.getByRole('button', { name: 'Mais ações de Marina Silva' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Copiar' })).toBeNull();
  });
});
