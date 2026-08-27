// =============================================================================
// TerciarioNav — a peça que o V2708-03 publicou.
//
// O que este arquivo guarda não é aparência (isso é o gate visual do maestro):
// é o CONTRATO que faz o terciário ser navegação de verdade nos dois modos, e as
// duas decisões que a lane tomou e que uma "simplificação" futura desfaria sem
// perceber — a orientação por CSS e o ativo sem medição.
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AreaTerciarioNav, TerciarioLayout, TerciarioNav } from '../TerciarioNav';

const ITENS_ROTA = [
  { id: 'geral', label: 'Geral', href: '/x/configuracoes', active: true },
  { id: 'politica', label: 'Política de vendas', href: '/x/configuracoes/politica', active: false },
];

function menu(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Seções de teste' });
}

describe('modo ROTA — item é link de verdade', () => {
  it('todo item vira âncora com href real (ctrl+clique e copiar endereço seguem vivos)', () => {
    render(<TerciarioNav itens={ITENS_ROTA} aria-label="Seções de teste" />);
    const links = within(menu()).getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/x/configuracoes',
      '/x/configuracoes/politica',
    ]);
  });

  it('o ativo é `aria-current="page"` — o leitor de tela ouve onde está', () => {
    render(<TerciarioNav itens={ITENS_ROTA} aria-label="Seções de teste" />);
    const ativo = within(menu()).getByRole('link', { current: 'page' });
    expect(ativo).toHaveTextContent('Geral');
  });

  it('o clique simples é interceptado e navega por SPA (não recarrega o documento)', async () => {
    render(
      <MemoryRouter initialEntries={['/x/configuracoes']}>
        <AreaTerciarioNav itens={ITENS_ROTA} aria-label="Seções de teste" />
      </MemoryRouter>,
    );
    const alvo = within(menu()).getByRole('link', { name: 'Política de vendas' });
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true });
    alvo.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
  });
});

describe('modo ÂNCORA — item é botão, e a página não muda', () => {
  const itens = [
    { id: 'identidade', label: 'Identidade', active: true, onClick: vi.fn() },
    { id: 'regras', label: 'Regras', active: false, onClick: vi.fn() },
  ];

  it('item sem href vira `button`, nunca link morto', () => {
    render(<TerciarioNav itens={itens} aria-label="Seções de teste" />);
    expect(within(menu()).getAllByRole('button')).toHaveLength(2);
    expect(within(menu()).queryAllByRole('link')).toHaveLength(0);
  });

  it('o ativo é `aria-current="true"` — porque a PÁGINA não trocou, a seção sim', () => {
    render(<TerciarioNav itens={itens} aria-label="Seções de teste" />);
    const ativo = within(menu()).getByRole('button', { name: 'Identidade' });
    expect(ativo).toHaveAttribute('aria-current', 'true');
    expect(within(menu()).getByRole('button', { name: 'Regras' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('clicar chama o handler da área (o scroll spy continua sendo dela)', async () => {
    const ir = vi.fn();
    render(
      <TerciarioNav
        itens={[{ id: 'regras', label: 'Regras', active: false, onClick: ir }]}
        aria-label="Seções de teste"
      />,
    );
    await userEvent.click(within(menu()).getByRole('button', { name: 'Regras' }));
    expect(ir).toHaveBeenCalledTimes(1);
  });
});

describe('⛔ as duas decisões da lane, afirmadas', () => {
  it('a orientação vira por CSS no MESMO DOM — uma lista, dois eixos', () => {
    // Se alguém trocar isto por dois componentes ou por um breakpoint em JS, a
    // peça volta a poder divergir entre viewports (e a remontar na virada, que é
    // o que faz indicador medido nascer errado). A lista carrega os dois eixos.
    render(<TerciarioNav itens={ITENS_ROTA} aria-label="Seções de teste" />);
    const lista = within(menu()).getByRole('list');
    expect(lista.className).toContain('flex-row');
    expect(lista.className).toContain('lg:flex-col');
  });

  it('o ativo é PREENCHIMENTO, sem indicador absoluto e sem medição', () => {
    // A causa do V2708-05 é indicador posicionado por `offsetLeft`/`offsetWidth`.
    // O terciário não tem um: o ativo é fundo no próprio item. Esta é a razão de
    // a peça ser imune àquela classe de defeito, e ela morre se alguém "unificar"
    // com o sublinhado deslizante do SubNav.
    render(<TerciarioNav itens={ITENS_ROTA} aria-label="Seções de teste" />);
    const ativo = within(menu()).getByRole('link', { current: 'page' });
    expect(ativo.className).toContain('bg-[var(--action-ghost-hover)]');
    expect(menu().querySelectorAll('[class*="absolute"]')).toHaveLength(0);
  });

  it('⛔ sem borda em nenhum estado (V2708-07 · §2.16)', () => {
    render(<TerciarioNav itens={ITENS_ROTA} aria-label="Seções de teste" />);
    for (const item of within(menu()).getAllByRole('link')) {
      expect(item.className).not.toMatch(/(^|\s)border-(?!none)/);
    }
  });
});

describe('TerciarioLayout — a moldura 25/75', () => {
  it('com menu, monta a grade de duas colunas de `lg` para cima', () => {
    const { container } = render(
      <TerciarioLayout nav={<TerciarioNav itens={ITENS_ROTA} aria-label="Seções de teste" />}>
        <p>conteúdo</p>
      </TerciarioLayout>,
    );
    expect(container.firstElementChild?.className).toContain('lg:grid-cols-[1fr_3fr]');
  });

  it('SEM menu, não sobra calha vazia — o conteúdo toma a largura inteira', () => {
    // O papel que alcança uma seção só cai aqui. Uma grade 25/75 com a primeira
    // coluna vazia mordia 25% da largura por nada.
    const { container } = render(
      <TerciarioLayout nav={null}>
        <p>conteúdo</p>
      </TerciarioLayout>,
    );
    expect(container.firstElementChild?.className).not.toContain('grid-cols');
  });
});
