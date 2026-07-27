import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { KitsCadastroView } from '../KitsCadastroView';
import type { ItemKit, Kit } from '@leela/core';
import { ts } from '../../_test/fixtures';

function mkKit(over: Partial<Kit>): Kit {
  return {
    id: 'k',
    tenantId: 'castelo',
    nome: 'Kit',
    preco: 0,
    capacidade: 0,
    modalidades: [],
    itens: [],
    criadoEm: ts(new Date()),
    atualizadoEm: ts(new Date()),
    ...over,
  };
}
function mkItem(over: Partial<ItemKit>): ItemKit {
  return {
    id: 'i',
    tenantId: 'castelo',
    eventoId: 'e1',
    nome: 'Item',
    tamanhado: true,
    origem: 'organizador',
    exibirLogo: false,
    modeloEstoque: 'sob_encomenda',
    tamanhosDisponiveis: [],
    kits: [],
    criadoEm: ts(new Date()),
    atualizadoEm: ts(new Date()),
    ...over,
  };
}

const kits = [
  mkKit({ id: 'ouro', nome: 'Kit Ouro', preco: 120 }),
  mkKit({ id: 'prata', nome: 'Kit Prata', preco: 60 }),
  mkKit({ id: 'basico', nome: 'Kit Básico', preco: 0 }),
  mkKit({ id: 'sem', nome: 'Sem kit', preco: -30 }),
];
const itens = [
  mkItem({ id: 'cam', nome: 'Camiseta', tamanhado: true, origem: 'organizador', usadoEm: [{ kitId: 'ouro', nome: 'Kit Ouro' }] }),
  mkItem({ id: 'gel', nome: 'Gel Growth', tamanhado: false, origem: 'patrocinador', marca: 'Growth', exibirLogo: true }),
];

function view(props: Partial<Parameters<typeof KitsCadastroView>[0]> = {}) {
  render(
    <MemoryRouter>
      <KitsCadastroView slug="e1" kits={kits} itens={itens} loading={false} error={null} {...props} />
    </MemoryRouter>,
  );
}

describe('KitsCadastroView (RN-211/213/215/216)', () => {
  it('mostra os 4 kits incluindo "Sem kit" com desconto', () => {
    view();
    expect(screen.getByRole('heading', { name: 'Kit Ouro' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sem kit' })).toBeInTheDocument();
    expect(screen.getByText('Desconto de R$ 30')).toBeInTheDocument();
  });

  it('catálogo mostra badges de tipo/origem e "usado em"', () => {
    view();
    expect(screen.getByText('Usado em: Kit Ouro')).toBeInTheDocument();
    expect(screen.getByText('Patrocinador')).toBeInTheDocument();
    expect(screen.getByText('Logo exibido ao atleta')).toBeInTheDocument();
  });

  it('nunca usa a palavra "tier" (RN-216)', () => {
    const { container } = render(
      <MemoryRouter>
        <KitsCadastroView slug="e1" kits={kits} itens={itens} loading={false} error={null} />
      </MemoryRouter>,
    );
    expect(container.textContent?.toLowerCase()).not.toContain('tier');
  });

  it('KPIs de resumo ficam no TOPO (antes da seção de kits), com KpiCard canônico', () => {
    view();
    const resumo = screen.getByText('Kits configurados');
    expect(resumo).toBeInTheDocument();
    expect(screen.getByText('Marcas ativadas')).toBeInTheDocument();
    // Ordem no DOM: o resumo precede o cabeçalho "Kits" (KPIs ao topo).
    const heading = screen.getByRole('heading', { name: 'Kits' });
    expect(resumo.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sem callback de item, não mostra "+ Adicionar item" (T2 read-only)', () => {
    view();
    expect(screen.queryByRole('button', { name: '+ Adicionar item' })).not.toBeInTheDocument();
  });

  it('com onNovoItem, mostra e dispara o botão de novo item', async () => {
    const onNovoItem = vi.fn();
    view({ onNovoItem });
    await userEvent.click(screen.getByRole('button', { name: '+ Adicionar item' }));
    expect(onNovoItem).toHaveBeenCalled();
  });

  it('kits vazios → EmptyState', () => {
    render(
      <MemoryRouter>
        <KitsCadastroView slug="e1" kits={[]} itens={[]} loading={false} error={null} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nenhum kit configurado')).toBeInTheDocument();
  });

  // ── Miniatura do kit (RN-227 · RN-236) ──────────────────────────────────
  // O job: reconhecer o kit DE VISTA na grade, antes de abrir. As asserções
  // olham o que o organizador enxerga na linha do kit, não classe utilitária.
  describe('miniatura da imagem do kit (RN-227 · RN-236)', () => {
    /** Card do kit pelo título — a miniatura tem de estar DENTRO dele. */
    function cardDoKit(nome: string): HTMLElement {
      const titulo = screen.getByRole('heading', { name: nome });
      const card = titulo.closest('article');
      expect(card).not.toBeNull();
      return card as HTMLElement;
    }

    it('kit COM imagem exibe a miniatura da própria imagem, adiada (lista)', () => {
      render(
        <MemoryRouter>
          <KitsCadastroView
            slug="e1"
            kits={[mkKit({ id: 'ouro', nome: 'Kit Ouro', preco: 120, imagemUrl: 'https://cdn.x/ouro.jpg' })]}
            itens={[]}
            loading={false}
            error={null}
          />
        </MemoryRouter>,
      );
      const img = cardDoKit('Kit Ouro').querySelector('img');
      expect(img).not.toBeNull();
      expect(img).toHaveAttribute('src', 'https://cdn.x/ouro.jpg');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('cada kit mostra a SUA imagem — é isso que separa um do outro na grade', () => {
      render(
        <MemoryRouter>
          <KitsCadastroView
            slug="e1"
            kits={[
              mkKit({ id: 'ouro', nome: 'Kit Ouro', preco: 120, imagemUrl: 'https://cdn.x/ouro.jpg' }),
              mkKit({ id: 'prata', nome: 'Kit Prata', preco: 60, imagemUrl: 'https://cdn.x/prata.jpg' }),
            ]}
            itens={[]}
            loading={false}
            error={null}
          />
        </MemoryRouter>,
      );
      expect(cardDoKit('Kit Ouro').querySelector('img')).toHaveAttribute('src', 'https://cdn.x/ouro.jpg');
      expect(cardDoKit('Kit Prata').querySelector('img')).toHaveAttribute('src', 'https://cdn.x/prata.jpg');
    });

    it('kit SEM imagem cai na sigla e não renderiza img (nada de quadrado quebrado)', () => {
      view();
      const card = cardDoKit('Kit Ouro');
      expect(card.querySelector('img')).toBeNull();
      // Escopo na CAIXA da miniatura (primeiro filho do header), não no card
      // inteiro: 'K' também é a primeira letra de "Kit Ouro", que está escrita
      // no <h3> ao lado — a asserção no card passava mesmo com o `fallback`
      // arrancado do Thumb, e não travava nada.
      const caixa = card.querySelector('header')?.firstElementChild as HTMLElement;
      expect(caixa).toHaveTextContent('K');
    });

    it('a miniatura é decorativa: o nome do kit segue sendo o rótulo da linha', () => {
      render(
        <MemoryRouter>
          <KitsCadastroView
            slug="e1"
            kits={[mkKit({ id: 'ouro', nome: 'Kit Ouro', preco: 120, imagemUrl: 'https://cdn.x/ouro.jpg' })]}
            itens={[]}
            loading={false}
            error={null}
          />
        </MemoryRouter>,
      );
      expect(cardDoKit('Kit Ouro').querySelector('img')).toHaveAttribute('alt', '');
      expect(screen.getByRole('heading', { name: 'Kit Ouro' })).toBeInTheDocument();
    });

    it('a miniatura não rouba o caminho de edição do kit', () => {
      view();
      // 4 kits na fixture → 4 atalhos "Editar", um por card.
      expect(screen.getAllByRole('link', { name: 'Editar' })).toHaveLength(4);
    });
  });
});
