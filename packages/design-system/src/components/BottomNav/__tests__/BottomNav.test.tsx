/**
 * Contrato do BottomNav (lane NAV-MOBILE, leva 20).
 *
 * jsdom não faz layout: onde a asserção é de MEDIDA ela vira contrato de classe
 * ou de token, que é o molde do resto da família (rail-v3-tokens, AppShell).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BottomNav, bottomNavIcon, RESPIRO_BOTTOMNAV } from '../BottomNav';
import { Ticket } from 'lucide-react';

const QUATRO = [
  { id: 'visao-geral', label: 'Visão geral', icon: <span data-icon="" />, href: '/' },
  { id: 'eventos', label: 'Eventos', icon: <span data-icon="" />, href: '/eventos' },
  { id: 'clubs', label: 'Clubs', icon: <span data-icon="" />, href: '/clubes' },
  { id: 'crm', label: 'CRM', icon: <span data-icon="" />, href: '/crm' },
];

const comAtivo = (id: string) => QUATRO.map((i) => ({ ...i, active: i.id === id }));

describe('BottomNav — landmark e destinos', () => {
  it('é um landmark de navegação nomeado', () => {
    render(<BottomNav items={comAtivo('eventos')} />);
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
  });

  it('aceita outro nome de landmark (duas navs no mesmo documento)', () => {
    render(<BottomNav items={comAtivo('eventos')} ariaLabel="Navegação do produtor" />);
    expect(screen.getByRole('navigation', { name: 'Navegação do produtor' })).toBeInTheDocument();
  });

  it('cada item com href é LINK de verdade — ctrl+clique e copiar endereço', () => {
    render(<BottomNav items={comAtivo('eventos')} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/',
      '/eventos',
      '/clubes',
      '/crm',
    ]);
  });

  it('item sem href vira button (não é link para lugar nenhum)', () => {
    render(<BottomNav items={[{ id: 'x', label: 'Inerte', icon: <span /> }]} />);
    expect(screen.getByRole('button', { name: 'Inerte' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('o rótulo fica no FLUXO — nada de ícone mudo (não há hover no dedo)', () => {
    render(<BottomNav items={comAtivo('eventos')} />);
    const rotulo = screen.getByText('Clubs');
    expect(rotulo).toBeInTheDocument();
    expect(rotulo).not.toHaveClass('sr-only');
  });

  it('onClick recebe o clique (interceptação SPA)', async () => {
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    render(
      <BottomNav
        items={[{ id: 'eventos', label: 'Eventos', icon: <span />, href: '/eventos', onClick }]}
      />,
    );
    await userEvent.click(screen.getByRole('link', { name: 'Eventos' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('BottomNav — o item ativo', () => {
  it('só o ativo leva aria-current="page"', () => {
    render(<BottomNav items={comAtivo('clubs')} />);
    const atuais = screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current'));
    expect(atuais).toHaveLength(1);
    expect(atuais[0]).toHaveAccessibleName('Clubs');
  });

  it('sem item ativo, nenhum acende — e o pill não entra no DOM', () => {
    const { container } = render(<BottomNav items={QUATRO} />);
    expect(container.querySelector('[aria-current="page"]')).toBeNull();
    expect(container.querySelector('[data-bottomnav-indicador]')).toBeNull();
  });

  // O pill é UM elemento que VIAJA (mesma decisão do rail, D-1008-R14). Se
  // alguém devolver o fundo para dentro de cada item, esta asserção cai: haveria
  // um por item, não um por barra.
  it('o indicador é UM só, e viaja — nunca um fundo por item', () => {
    const { container } = render(<BottomNav items={comAtivo('crm')} />);
    expect(container.querySelectorAll('[data-bottomnav-indicador]')).toHaveLength(1);
  });

  it('o indicador anda por transform e respeita prefers-reduced-motion', () => {
    const { container } = render(<BottomNav items={comAtivo('eventos')} />);
    const pill = container.querySelector('[data-bottomnav-indicador]');
    expect(pill).toHaveClass('motion-reduce:transition-none');
    expect(pill?.className).toContain('duration-[var(--bottomnav-motion)]');
    expect(pill?.className).toContain('ease-[var(--motion-easing-default)]');
    // A tinta e o halo são os MESMOS do pill do rail — coerência é o contrato.
    expect(pill?.className).toContain('bg-[var(--action-primary)]');
    expect(pill?.className).toContain('shadow-elev-brand');
  });
});

describe('BottomNav — badge', () => {
  it('o número é decorativo e o leitor ouve o badgeLabel', () => {
    render(
      <BottomNav
        items={[
          {
            id: 'eventos',
            label: 'Eventos',
            icon: <span />,
            href: '/eventos',
            badge: 3,
            badgeLabel: '3 eventos ativos',
            active: true,
          },
        ]}
      />,
    );
    expect(screen.getByRole('link')).toHaveAccessibleName('Eventos 3 eventos ativos');
  });

  it('sem badge não há pílula nenhuma — zero decorativo é proibido', () => {
    const { container } = render(<BottomNav items={comAtivo('eventos')} />);
    expect(container.textContent).not.toMatch(/\d/);
  });
});

describe('BottomNav — anatomia flutuante', () => {
  it('só existe abaixo de lg — o breakpoint é anatomia da peça', () => {
    render(<BottomNav items={comAtivo('eventos')} />);
    expect(screen.getByRole('navigation')).toHaveClass('lg:hidden');
  });

  it('flutua: fixa no rodapé, com respiro das bordas e safe-area do iOS', () => {
    const nav = render(<BottomNav items={comAtivo('eventos')} />).getByRole('navigation');
    expect(nav).toHaveClass('fixed', 'bottom-0', 'inset-x-0');
    expect(nav.className).toContain('px-[var(--bottomnav-margin)]');
    // A safe-area SOMA à margem (a pílula sobe inteira acima do indicador de
    // home) em vez de virar padding interno, que engordaria a barra e enfiaria a
    // última fileira de pixels do rótulo debaixo dele.
    expect(nav.className).toContain('pb-[calc(var(--bottomnav-margin)+var(--bottomnav-safe-b))]');
  });

  it('a faixa transparente não come clique; só a pílula é alvo', () => {
    const nav = render(<BottomNav items={comAtivo('eventos')} />).getByRole('navigation');
    expect(nav).toHaveClass('pointer-events-none');
    expect(nav.firstElementChild).toHaveClass('pointer-events-auto');
  });

  it('className do consumidor entra no nav externo, sem apagar o lg:hidden', () => {
    render(<BottomNav items={comAtivo('eventos')} className="z-[30]" />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('z-[30]');
    expect(nav).toHaveClass('lg:hidden');
  });
});

describe('BottomNav — o respiro da página', () => {
  it('RESPIRO_BOTTOMNAV reserva o espaço e some acima de lg', () => {
    expect(RESPIRO_BOTTOMNAV).toBe('pb-[var(--bottomnav-space)] lg:pb-0');
  });
});

describe('bottomNavIcon', () => {
  it('impõe tamanho e traço por token — o consumidor não escolhe o número', () => {
    const { container } = render(<div>{bottomNavIcon(Ticket)}</div>);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('w-[var(--bottomnav-icon-size)]');
    expect(svg?.getAttribute('class')).toContain('[stroke-width:var(--bottomnav-icon-stroke)]');
    expect(svg).toHaveAttribute('aria-hidden');
  });
});

// ---------------------------------------------------------------------------
// Tokens — as medidas da barra são contrato, nos três temas.
// ---------------------------------------------------------------------------

describe('tokens da barra, nos três temas', () => {
  const temas = ['brasa', 'wine', 'dark-wine'].map((t) => ({
    nome: t,
    css: readFileSync(resolve(__dirname, `../../../../themes/${t}.css`), 'utf8'),
  }));

  const esperado: Record<string, string> = {
    '--bottomnav-height': '58px',
    '--bottomnav-radius': '22px',
    '--bottomnav-margin': 'var(--spacing-3)',
    '--bottomnav-px': 'var(--spacing-1-5)',
    '--bottomnav-gap': 'var(--spacing-1)',
    '--bottomnav-max-w': '480px',
    '--bottomnav-item-radius': '16px',
    '--bottomnav-item-gap': '3px',
    // O ícone é o MESMO do rail (21/2 lá, 22/2 aqui: a caixa do rail é 22 e a
    // barra usa a caixa inteira). Traço 2 nos dois — glifo que muda de peso
    // entre desktop e mobile é a marca escorregando de largura.
    '--bottomnav-icon-size': '22px',
    '--bottomnav-icon-stroke': '2',
    '--bottomnav-label-size': 'var(--font-size-xs-plus)',
    '--bottomnav-badge-size': '16px',
    '--bottomnav-badge-px': 'var(--spacing-1)',
    '--bottomnav-motion': 'var(--motion-duration-normal)',
    '--bottomnav-safe-b': 'env(safe-area-inset-bottom, 0px)',
    '--bottomnav-space':
      'calc(var(--bottomnav-height) + var(--bottomnav-margin) * 2 + var(--bottomnav-safe-b))',
  };

  for (const { nome, css } of temas) {
    it(`${nome} tem o grupo bottomnav inteiro`, () => {
      for (const [token, valor] of Object.entries(esperado)) {
        expect(css).toContain(`${token}: ${valor};`);
      }
    });
  }
});
