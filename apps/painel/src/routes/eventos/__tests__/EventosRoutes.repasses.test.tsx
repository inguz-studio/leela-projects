// =============================================================================
// Precedência `/eventos/repasses` × `/eventos/:slug` — risco de regressão #3 do
// report da rodada IA-MENU, testado sobre a ÁRVORE DE ROTAS REAL (EventosRoutes),
// não sobre uma réplica.
//
// O modo de falha que este teste fecha: um evento cujo slug seja literalmente
// "repasses" sequestrar a subdivisão, ou a subdivisão sequestrar esse evento.
// No react-router v6 o ranking dá vitória ao segmento estático sobre o
// dinâmico — mas "o framework provavelmente faz certo" não é o padrão da casa
// quando a tela do outro lado é a que tira dinheiro do sistema.
//
// As telas-folha são trocadas por marcadores: o que está sob teste é o
// ROTEAMENTO, não o conteúdo (que tem suíte própria, intocada por esta rodada).
//
// O dublê do EventoLayout tem `<Outlet/>` (achado 5 da INGQR-REV): sem ele, o
// dublê é um beco sem saída e QUALQUER asserção futura sobre rota filha de
// `:slug` nasceria falso-verde — a rota casaria, a filha não renderizaria e o
// teste não notaria. As filhas que este arquivo alcança viram marcadores pelo
// mesmo motivo das folhas de primeiro nível, e a guarda de papel entra como
// passa-direto: `RequirePapel` lê o Outlet context do layout REAL e sessão de
// verdade, que é conteúdo de outra suíte, não roteamento.
// =============================================================================

import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes, useParams } from 'react-router-dom';

vi.mock('../repasses/RepassesPage', () => ({
  RepassesPage: () => <div data-testid="alvo">subdivisao-repasses</div>,
}));

vi.mock('../hub/HubRoute', () => ({
  HubRoute: () => <div data-testid="alvo">lista-de-eventos</div>,
}));

vi.mock('../evento/EventoLayout', () => ({
  EventoLayout: () => {
    const { slug } = useParams();
    // O Outlet é IRMÃO do marcador, não filho: `resolverEm` lê o
    // `textContent` do marcador, e a filha dentro dele mudaria o texto que as
    // asserções de precedência comparam. Nenhuma asserção atual muda.
    return (
      <>
        <div data-testid="alvo">{`evento:${slug ?? ''}`}</div>
        <Outlet />
      </>
    );
  },
}));

vi.mock('../novo/NovoEventoRoute', () => ({
  NovoEventoRoute: () => <div data-testid="alvo">novo-evento</div>,
}));

vi.mock('../evento/overview/OverviewPage', () => ({
  OverviewPage: () => <span data-testid="filha">overview</span>,
}));

vi.mock('../inscritos/InscritosPage', () => ({
  InscritosPage: () => <span data-testid="filha">inscritos</span>,
}));

vi.mock('../../_system/RequirePapel', () => ({
  RequirePapel: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const { EventosRoutes } = await import('../EventosRoutes');

/**
 * Monta o módulo NO MESMO ponto em que o App.tsx o monta (`/eventos/*`). Sem
 * isso o pathname absoluto que a SubNav lê ficaria diferente do de produção e
 * o teste passaria a medir o harness, não o produto.
 */
function montarEm(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/eventos/*" element={<EventosRoutes />} />
      </Routes>
    </MemoryRouter>,
  );
}

function resolverEm(rota: string): string {
  const { unmount } = montarEm(rota);
  const texto = screen.getByTestId('alvo').textContent ?? '';
  unmount();
  return texto;
}

describe('EventosRoutes — precedência da subdivisão Repasses (risco #3)', () => {
  it.each([
    ['/eventos', 'lista-de-eventos'],
    ['/eventos/repasses', 'subdivisao-repasses'],
    ['/eventos/novo', 'novo-evento'],
    ['/eventos/corrida-da-serra', 'evento:corrida-da-serra'],
    // A armadilha: um evento com slug "repasses" NÃO sequestra a subdivisão.
    // O segmento estático vence o dinâmico — precedência declarada, não sorte.
    ['/eventos/repasses/', 'subdivisao-repasses'],
  ])('%s resolve em %s', (rota, esperado) => {
    expect(resolverEm(rota)).toBe(esperado);
  });

  it('a subdivisão não sequestra nenhum outro evento', () => {
    expect(resolverEm('/eventos/repasse')).toBe('evento:repasse');
    expect(resolverEm('/eventos/repassess')).toBe('evento:repassess');
    expect(resolverEm('/eventos/meus-repasses')).toBe('evento:meus-repasses');
  });

  it('a lista e a subdivisão dividem a moldura do hub (SubNav Eventos | Repasses)', () => {
    montarEm('/eventos/repasses');
    const subnav = screen.getByRole('navigation', { name: 'Seções de Eventos' });
    expect(subnav).toBeInTheDocument();
    // LEELA-DEBT-T4: a aba virou âncora — role 'link' e href de verdade. Sem
    // afrouxar nada: o par href↔destino entra como asserção nova.
    const aba = screen.getByRole('link', { name: 'Repasses' });
    expect(aba).toHaveAttribute('aria-current', 'page');
    expect(aba).toHaveAttribute('href', '/eventos/repasses');
  });

  it('a rota filha de :slug RENDERIZA dentro do layout (o dublê não é beco sem saída)', () => {
    // Achado 5 da INGQR-REV: sem `<Outlet/>` no dublê, a rota filha casava e
    // não renderizava — asserção nova sobre conteúdo de aba nasceria
    // falso-verde. Esta é a asserção que torna o Outlet load-bearing: remova
    // o Outlet e ela cai, em vez de o arquivo seguir verde sem provar nada.
    const { unmount } = montarEm('/eventos/corrida-da-serra');
    expect(screen.getByTestId('alvo')).toHaveTextContent('evento:corrida-da-serra');
    expect(screen.getByTestId('filha')).toHaveTextContent('overview');
    unmount();

    montarEm('/eventos/corrida-da-serra/inscritos');
    expect(screen.getByTestId('alvo')).toHaveTextContent('evento:corrida-da-serra');
    expect(screen.getByTestId('filha')).toHaveTextContent('inscritos');
  });

  it('a moldura do hub NÃO envolve a criação nem as abas de um evento', () => {
    const { unmount } = montarEm('/eventos/novo');
    expect(
      screen.queryByRole('navigation', { name: 'Seções de Eventos' }),
    ).not.toBeInTheDocument();
    unmount();

    montarEm('/eventos/corrida-da-serra/inscritos');
    expect(
      screen.queryByRole('navigation', { name: 'Seções de Eventos' }),
    ).not.toBeInTheDocument();
  });
});
