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

  it('rodapé resume kits/itens/marcas', () => {
    view();
    expect(screen.getByText('Kits configurados')).toBeInTheDocument();
    expect(screen.getByText('Marcas ativadas')).toBeInTheDocument();
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
});
