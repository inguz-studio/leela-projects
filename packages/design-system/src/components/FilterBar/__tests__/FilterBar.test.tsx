// =============================================================================
// FilterBar — a barra que hospeda busca, facetas, contador e ações.
//
// O que este arquivo trava:
//
//   - a COMPOSIÇÃO com o `Toolbar`. A peça não pode reescrever a linha de dois
//     lados nem a hairline: a prova é por identidade de assinatura contra o
//     `Toolbar` renderizado sozinho, o desenho de prova da Onda 0.
//   - o LANDMARK ÚNICO de busca. O `SearchInput` já traz `role="search"`; a
//     barra não pode trazer o segundo, ou o leitor de tela anuncia duas buscas
//     onde há uma.
//   - o REFLUXO INTERNO. Três facetas numa linha sem `flex-wrap` viram rolagem
//     horizontal, que nesta casa é dívida recorrente — o teste afirma a classe
//     porque o jsdom não faz layout.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FilterBar } from '../FilterBar';
import { Toolbar } from '../../Toolbar';
import { SearchInput } from '../../SearchInput';
import { FilterChips } from '../../FilterChips';
import { ResultCount } from '../../ResultCount';
import { Button } from '../../Button';

const STATUS = [
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'enviado', label: 'Enviado' },
];

function Completa() {
  return (
    <FilterBar
      label="comunicados"
      search={<SearchInput aria-label="Buscar comunicado por título" shortcutLabel={null} />}
      facets={
        <FilterChips
          label="Filtrar por status"
          options={STATUS}
          selected={[]}
          onChange={() => {}}
        />
      }
      count={
        <ResultCount
          visiveis={12}
          total={40}
          substantivo={{ singular: 'comunicado', plural: 'comunicados' }}
        />
      }
      actions={<Button variant="primary">+ Novo comunicado</Button>}
    />
  );
}

describe('FilterBar · nome e estrutura', () => {
  it('nomeia a barra em uma grafia só — "Filtros de <lista>"', () => {
    render(<Completa />);
    expect(screen.getByRole('toolbar', { name: 'Filtros de comunicados' })).toBeInTheDocument();
  });

  it('hospeda os quatro slots dentro da mesma barra', () => {
    render(<Completa />);
    const barra = screen.getByRole('toolbar');
    expect(within(barra).getByRole('searchbox', { name: /Buscar comunicado/ })).toBeInTheDocument();
    // A faceta é uma LISTA desde 17/08 (leva 20): o gatilho, não um
    // `role="group"` de chips. Ver `FilterChips.test.tsx` para o contrato.
    expect(
      within(barra).getByRole('button', { name: 'Filtrar por status' }),
    ).toBeInTheDocument();
    expect(within(barra).getByRole('status')).toHaveTextContent('Mostrando 12 de 40 comunicados');
    expect(within(barra).getByRole('button', { name: '+ Novo comunicado' })).toBeInTheDocument();
  });

  it('sem slot nenhum continua sendo uma barra nomeada, sem lixo no DOM', () => {
    render(<FilterBar label="vendas" />);
    const barra = screen.getByRole('toolbar', { name: 'Filtros de vendas' });
    expect(within(barra).queryByRole('searchbox')).toBeNull();
    expect(within(barra).queryByRole('group')).toBeNull();
  });
});

describe('FilterBar · o landmark de busca fica onde a busca está', () => {
  // Dois `role="search"` aninhados são a regra `landmark-unique` do axe, e o
  // efeito prático é o leitor de tela anunciar duas buscas onde há uma.
  it('a barra NÃO declara um segundo role="search"', () => {
    const { container } = render(<Completa />);
    expect(container.querySelectorAll('[role="search"]')).toHaveLength(1);
  });

  it('o único role="search" é o do SearchInput, e ele contém o campo', () => {
    const { container } = render(<Completa />);
    const busca = container.querySelector('[role="search"]');
    expect(busca).not.toBeNull();
    expect(busca?.querySelector('input')).not.toBeNull();
  });

  it('sem busca, a barra não tem landmark de busca nenhum', () => {
    const { container } = render(<FilterBar label="vendas" actions={<Button>Exportar</Button>} />);
    expect(container.querySelectorAll('[role="search"]')).toHaveLength(0);
  });
});

describe('FilterBar · composição (zero motor próprio)', () => {
  // Identidade de assinatura: a raiz da barra tem de ser byte a byte a do
  // `Toolbar` renderizado sozinho. Reescrever a linha de dois lados, o refluxo
  // ou a hairline quebra o teste.
  it('a raiz é o Toolbar do DS, com a assinatura idêntica', () => {
    const { unmount } = render(<Toolbar aria-label="Filtros de comunicados" />);
    const assinatura = screen.getByRole('toolbar').className;
    unmount();

    render(<Completa />);
    expect(screen.getByRole('toolbar').className).toBe(assinatura);
  });

  it('o lado que cresce quebra linha em vez de virar rolagem horizontal', () => {
    render(<Completa />);
    const busca = screen.getByRole('searchbox', { name: /Buscar comunicado/ });
    const ladoEsquerdo = busca.closest('.flex-wrap');
    expect(ladoEsquerdo).not.toBeNull();
    expect(ladoEsquerdo?.className).toContain('min-w-0');
  });

  it('não declara eixo de rolagem nenhum — quem rola é a página', () => {
    const { container } = render(<Completa />);
    expect(container.innerHTML).not.toMatch(/overflow-[xy]-/);
  });

  it('aceita className do consumidor sem perder a anatomia do Toolbar', () => {
    render(<FilterBar label="vendas" className="teste-barra" />);
    const barra = screen.getByRole('toolbar');
    expect(barra).toHaveClass('teste-barra');
    expect(barra.className).toContain('border-b-[var(--border-subtle)]');
  });
});
