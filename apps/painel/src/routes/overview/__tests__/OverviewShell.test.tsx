import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewShell } from '../OverviewShell';

// A moldura (AppShell + Sidebar) é do layout raiz desde o Lote B3 — os
// contratos de navegação vivem em src/shell/__tests__/RootShell.test.tsx.
describe('OverviewShell (S600-T1)', () => {
  it('mostra o título e a saudação do produtor', () => {
    render(
      <OverviewShell nome="Marina Castelo">
        <div>conteúdo</div>
      </OverviewShell>
    );
    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(
      screen.getByText('Olá, Marina — aqui está o resumo das suas operações.')
    ).toBeInTheDocument();
  });

  it('saudação genérica sem nome e children renderizados', () => {
    render(
      <OverviewShell nome={null}>
        <div>painel do produtor</div>
      </OverviewShell>
    );
    expect(screen.getByText('painel do produtor')).toBeInTheDocument();
  });
});
