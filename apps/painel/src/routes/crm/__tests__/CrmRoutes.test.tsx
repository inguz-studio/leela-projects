// =============================================================================
// CrmRoutes — resolução das 3 subdivisões sobre a ÁRVORE DE ROTAS REAL.
//
// Fecha o risco de regressão #2 do report: a rota legada `/crm/:clienteKey`
// casa com QUALQUER segmento, inclusive `clientes` e `comunicacao`. Sem
// precedência explícita, `/crm/clientes` entraria em laço de redirecionamento.
// Aqui se prova que as subdivisões nomeadas resolvem em si mesmas — a
// pré-condição sem a qual o redirect legado do IAM-T6 não pode existir.
//
// As telas-folha viram marcadores: o que está sob teste é o ROTEAMENTO. O
// conteúdo tem suíte própria, que esta rodada não tocou.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';

vi.mock('../visao-geral/AnaliseVendasPage', () => ({
  AnaliseVendasPage: () => <div data-testid="alvo">visao-geral</div>,
}));

vi.mock('../ClientesPage', () => ({
  ClientesPage: () => <div data-testid="alvo">lista-de-clientes</div>,
}));

vi.mock('../ClienteDetailPage', () => ({
  ClienteDetailPage: () => {
    const { clienteKey } = useParams();
    return <div data-testid="alvo">{`ficha:${clienteKey ?? ''}`}</div>;
  },
}));

const { CrmRoutes } = await import('../CrmRoutes');

/** Monta o módulo no MESMO ponto do App.tsx (`/crm/*`). */
function montarEm(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/crm/*" element={<CrmRoutes />} />
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

describe('CrmRoutes — as 3 subdivisões (risco #2: ordem de rotas)', () => {
  it.each([
    ['/crm', 'visao-geral'],
    ['/crm/visao-geral', 'visao-geral'],
    ['/crm/clientes', 'lista-de-clientes'],
    ['/crm/clientes/tipo_abc123', 'ficha:tipo_abc123'],
  ])('%s resolve em %s', (rota, esperado) => {
    expect(resolverEm(rota)).toBe(esperado);
  });

  it('`/crm/clientes` abre a LISTA — nunca a ficha de um cliente de chave "clientes"', () => {
    expect(resolverEm('/crm/clientes')).toBe('lista-de-clientes');
    expect(resolverEm('/crm/clientes')).not.toContain('ficha:');
  });

  it('`/crm/comunicacao` mostra estado honesto, nunca tela vazia parecendo funcional', () => {
    montarEm('/crm/comunicacao');
    expect(
      screen.getByText('Campanhas para a base ainda não estão disponíveis'),
    ).toBeInTheDocument();
    // Diz o que existe HOJE e leva até lá — não é um vazio decorativo.
    expect(screen.getByRole('button', { name: 'Ir para Eventos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver clientes' })).toBeInTheDocument();
  });

  it('a SubNav envolve as 3 subdivisões e marca a ativa em cada uma', () => {
    for (const [rota, ativa] of [
      ['/crm', 'Visão geral'],
      ['/crm/clientes', 'Clientes'],
      ['/crm/clientes/tipo_abc123', 'Clientes'],
      ['/crm/comunicacao', 'Comunicação'],
    ] as const) {
      const { unmount } = montarEm(rota);
      const subnav = screen.getByRole('navigation', { name: 'Seções de CRM' });
      expect(subnav, `rota ${rota}`).toBeInTheDocument();
      // LEELA-DEBT-T4: as abas do CRM viraram âncoras — o role mudou de
      // 'button' para 'link' e o href passou a existir. A asserção de "onde
      // estou" segue idêntica.
      expect(
        screen.getByRole('link', { name: ativa }).getAttribute('aria-current'),
        `rota ${rota}`,
      ).toBe('page');
      unmount();
    }
  });

  it('segmento inexistente sob /crm cai no 404 do módulo, dentro do shell', () => {
    montarEm('/crm/clientes/tipo_abc123/inexistente');
    expect(screen.getByText('Essa página saiu para correr')).toBeInTheDocument();
  });
});
