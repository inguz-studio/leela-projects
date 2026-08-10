import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewShell } from '../OverviewShell';

// A moldura (AppShell + SidebarRail) é do layout raiz — os contratos de
// navegação vivem em src/shell/__tests__/RootShell.test.tsx.
describe('OverviewShell (HIFI-REC · cabeçalho do protótipo v3)', () => {
  it('título + saudação do protótipo com o nome em destaque de marca', () => {
    render(
      <OverviewShell nome="Marina Castelo">
        <div>conteúdo</div>
      </OverviewShell>
    );
    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    // "Olá, MARINA, aqui está o panorama do seu ecossistema." — o nome vem em
    // <strong> na cor da marca (protótipo v3).
    const nome = screen.getByText('MARINA');
    expect(nome.tagName).toBe('STRONG');
    expect(nome.className).toContain('--text-brand');
    expect(screen.getByText(/aqui está o panorama do seu ecossistema\./)).toBeInTheDocument();
  });

  it('saudação sem nome fecha a frase sozinha e children renderizam', () => {
    render(
      <OverviewShell nome={null}>
        <div>painel do produtor</div>
      </OverviewShell>
    );
    expect(screen.getByText('painel do produtor')).toBeInTheDocument();
    expect(screen.getByText(/aqui está o panorama do seu ecossistema\./)).toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });

  it('date-badge no page-head: "Domingo, 19 de Abril · 14:32"', () => {
    render(
      <OverviewShell nome="Marina Castelo" agora={new Date('2026-04-19T14:32:00')}>
        <div>conteúdo</div>
      </OverviewShell>
    );
    expect(screen.getByText('Domingo, 19 de Abril · 14:32')).toBeInTheDocument();
  });
});
