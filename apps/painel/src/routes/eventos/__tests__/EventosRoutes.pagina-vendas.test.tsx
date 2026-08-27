// =============================================================================
// V2708-11 — a página de vendas mudou de casa, e o endereço antigo não quebrou.
//
// O dono, em 27/08: *"configurações pode unificar a página de vendas no menu
// terciário, em eventos"*. A tela é a mesma; mudaram o endereço e o menu que a
// alcança.
//
// Os dois riscos que este arquivo fecha, e os dois já custaram caro ao projeto:
//
//   1. LINK QUEBRADO. Endereço em favorito, em histórico ou colado num chat de
//      operação virando 404. A RN-234 é a regra e o molde já rodava duas vezes
//      (balcão, estoque de kits); esta é a terceira e entra com prova.
//   2. AUTORIZAÇÃO POR EFEITO COLATERAL. A rota virou FILHA de `configuracoes`,
//      que tem `RequirePapel` próprio. Se a filha passasse a herdar só o guard do
//      pai, quem decide o acesso à página de vendas deixaria de ser a célula da
//      página de vendas — e o aceite `E04-L4: financeiro edita página → NEGA`
//      viraria um comentário sobre código que não existe mais.
//
// Roteamento é o que está sob teste; as folhas viram marcadores.
// =============================================================================

import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { MATRIZ_ACESSO_EVENTO, PAPEIS_EVENTO, podeAcessar } from '@leela/core';

vi.mock('../evento/EventoLayout', () => ({
  EventoLayout: () => <Outlet />,
}));

vi.mock('../configuracoes/ConfiguracoesLayout', () => ({
  ConfiguracoesLayout: () => <Outlet />,
}));

vi.mock('../pagina-vendas/PaginaVendasPage', () => ({
  PaginaVendasPage: () => <div data-testid="alvo">pagina-vendas</div>,
}));

vi.mock('../configuracoes/ConfigGeraisPage', () => ({
  ConfigGeraisPage: () => <div data-testid="alvo">config-gerais</div>,
}));

/** Registra a área que cada `RequirePapel` atravessado declarou. */
const areasAtravessadas: string[] = [];
vi.mock('../../_system/RequirePapel', () => ({
  RequirePapel: ({ area, children }: { area: string; children: ReactNode }) => {
    areasAtravessadas.push(area);
    return <>{children}</>;
  },
}));

const { EventosRoutes } = await import('../EventosRoutes');

function Sonda(): JSX.Element {
  const { pathname } = useLocation();
  return <span data-testid="rota">{pathname}</span>;
}

function montarEm(rota: string) {
  areasAtravessadas.length = 0;
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/eventos/*" element={<EventosRoutes />} />
      </Routes>
      <Sonda />
    </MemoryRouter>,
  );
}

const SLUG = 'corrida-da-serra';

describe('a casa nova', () => {
  it('`/configuracoes/pagina-vendas` renderiza a página de vendas', () => {
    montarEm(`/eventos/${SLUG}/configuracoes/pagina-vendas`);
    expect(screen.getByTestId('alvo')).toHaveTextContent('pagina-vendas');
  });

  it('a raiz de Configurações continua sendo a página Geral', () => {
    montarEm(`/eventos/${SLUG}/configuracoes`);
    expect(screen.getByTestId('alvo')).toHaveTextContent('config-gerais');
  });
});

describe('⛔ RN-234 — o endereço antigo NUNCA quebra', () => {
  it('`/pagina-vendas` salta para dentro de Configurações', () => {
    montarEm(`/eventos/${SLUG}/pagina-vendas`);
    expect(screen.getByTestId('rota')).toHaveTextContent(
      `/eventos/${SLUG}/configuracoes/pagina-vendas`,
    );
  });

  it('o salto entrega a TELA, não um 404', () => {
    montarEm(`/eventos/${SLUG}/pagina-vendas`);
    expect(screen.getByTestId('alvo')).toHaveTextContent('pagina-vendas');
  });

  it('é UM salto só — o destino não redireciona de novo', () => {
    montarEm(`/eventos/${SLUG}/configuracoes/pagina-vendas`);
    expect(screen.getByTestId('rota')).toHaveTextContent(
      `/eventos/${SLUG}/configuracoes/pagina-vendas`,
    );
  });
});

describe('⛔ a autorização continua vindo da célula certa', () => {
  it('a rota nova atravessa o guard PRÓPRIO da página de vendas', () => {
    montarEm(`/eventos/${SLUG}/configuracoes/pagina-vendas`);
    expect(areasAtravessadas).toContain('pagina_vendas');
  });

  it('e também o do pai — aninhar somou guard, não trocou', () => {
    montarEm(`/eventos/${SLUG}/configuracoes/pagina-vendas`);
    expect(areasAtravessadas).toContain('configuracoes');
  });

  it('o redirect fica FORA do guard: quem não tem a área vê o 403 no endereço NOVO', () => {
    // Um 403 no endereço morto faria a pessoa concluir que a URL é que estava
    // errada. Mesma decisão escrita no salto do credenciamento.
    montarEm(`/eventos/${SLUG}/pagina-vendas`);
    const antesDoSalto = areasAtravessadas.indexOf('pagina_vendas');
    expect(antesDoSalto).toBeGreaterThanOrEqual(0);
    expect(screen.getByTestId('rota')).toHaveTextContent('/configuracoes/pagina-vendas');
  });

  it('`financeiro` continua SEM acesso à página de vendas (aceite E04-L4)', () => {
    expect(podeAcessar('financeiro', 'pagina_vendas')).toBe(false);
  });

  it('mover a tela não afrouxou NENHUMA célula: as duas colunas seguem idênticas', () => {
    // A razão de o aninhamento ser seguro hoje, medida e não presumida. No dia em
    // que este caso falhar, as colunas divergiram — e aí o guard próprio da filha
    // (afirmado acima) é o que impede o vazamento.
    for (const papel of PAPEIS_EVENTO) {
      expect(MATRIZ_ACESSO_EVENTO[papel].pagina_vendas).toBe(
        MATRIZ_ACESSO_EVENTO[papel].configuracoes,
      );
    }
  });
});
