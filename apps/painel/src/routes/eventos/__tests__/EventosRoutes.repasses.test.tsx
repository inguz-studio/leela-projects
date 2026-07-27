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
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';

vi.mock('../repasses/RepassesPage', () => ({
  RepassesPage: () => <div data-testid="alvo">subdivisao-repasses</div>,
}));

vi.mock('../hub/HubRoute', () => ({
  HubRoute: () => <div data-testid="alvo">lista-de-eventos</div>,
}));

vi.mock('../evento/EventoLayout', () => ({
  EventoLayout: () => {
    const { slug } = useParams();
    return <div data-testid="alvo">{`evento:${slug ?? ''}`}</div>;
  },
}));

vi.mock('../novo/NovoEventoRoute', () => ({
  NovoEventoRoute: () => <div data-testid="alvo">novo-evento</div>,
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
