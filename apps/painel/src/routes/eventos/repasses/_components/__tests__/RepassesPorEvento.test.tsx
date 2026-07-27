// =============================================================================
// RepassesPorEvento (RN-349) — estados §2.12: carregando, erro + "Tentar
// novamente", vazio honesto, linhas com "—" no evento sem termo, e a coluna
// "Repassado" pelo campo EXATO eventoId (LEELA-BEPEND-T2) + nota "sem
// associação" para docs legados.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RepassesPorEvento } from '../RepassesPorEvento';
import type { AssociacaoRepasses, LinhaRepasseEvento } from '../../_lib/repassesPorEvento';

const LINHAS: LinhaRepasseEvento[] = [
  {
    eventoId: 'a',
    nome: 'Corrida do Sol',
    slug: 'corrida-do-sol',
    encerrado: false,
    vendido: 12000,
    retido: 1500,
    disponivelEstimado: 8500,
    semTermo: false,
  },
  {
    eventoId: 'b',
    nome: 'Trail da Serra',
    slug: 'trail-da-serra',
    encerrado: true,
    vendido: 5000,
    retido: null,
    disponivelEstimado: null,
    semTermo: true,
  },
];

const SEM_ASSOCIACAO: AssociacaoRepasses = {
  porEvento: new Map(),
  semAssociacao: { qtd: 0, total: 0 },
};

describe('RepassesPorEvento', () => {
  it('carregando → status acessível, sem tabela', () => {
    render(
      <RepassesPorEvento linhas={[]} associacao={SEM_ASSOCIACAO} loading error={null} onRetry={vi.fn()} />,
    );
    expect(screen.getByRole('status', { name: 'Carregando repasse por evento' })).toBeInTheDocument();
  });

  it('erro → mensagem + botão "Tentar novamente" chama onRetry', () => {
    const onRetry = vi.fn();
    render(
      <RepassesPorEvento
        linhas={[]}
        associacao={SEM_ASSOCIACAO}
        loading={false}
        error={new Error('x')}
        onRetry={onRetry}
      />,
    );
    const btn = screen.getByRole('button', { name: /tentar novamente/i });
    btn.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('vazio → EmptyState honesto que reforça o escopo consolidado (RN-358)', () => {
    render(
      <RepassesPorEvento linhas={[]} associacao={SEM_ASSOCIACAO} loading={false} error={null} onRetry={vi.fn()} />,
    );
    expect(screen.getByText('Sem repasse consolidado ainda')).toBeInTheDocument();
    expect(screen.getByText(/consolidado de todos eles aparece aqui/i)).toBeInTheDocument();
  });

  it('linhas → nomes, valores e "—" no evento sem termo; badge Encerrado', () => {
    render(
      <RepassesPorEvento linhas={LINHAS} associacao={SEM_ASSOCIACAO} loading={false} error={null} onRetry={vi.fn()} />,
    );
    expect(screen.getByText('Corrida do Sol')).toBeInTheDocument();
    expect(screen.getByText('Trail da Serra')).toBeInTheDocument();
    // Evento sem termo: retido e disponível estimado saem como "—".
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    // Evento encerrado ganha o badge.
    expect(screen.getByText('Encerrado')).toBeInTheDocument();
  });

  it('coluna Repassado: Σ dos repasses pelo campo EXATO eventoId (RN-349)', () => {
    const associacao: AssociacaoRepasses = {
      porEvento: new Map([['a', { qtd: 2, total: 7500 }]]),
      semAssociacao: { qtd: 0, total: 0 },
    };
    render(
      <RepassesPorEvento linhas={LINHAS} associacao={associacao} loading={false} error={null} onRetry={vi.fn()} />,
    );
    // A Table do DS duplica o header no card-mode mobile — basta existir.
    expect(screen.getAllByText('Repassado').length).toBeGreaterThanOrEqual(1);
    const tabela = screen.getByRole('table');
    expect((tabela.textContent ?? '').replace(/\s/g, ' ')).toContain('R$ 7.500,00');
    expect((tabela.textContent ?? '').replace(/\s/g, ' ')).toContain('(2)');
  });

  it('repasses SEM eventoId → nota "sem associação" declarada (nunca atribuídos)', () => {
    const associacao: AssociacaoRepasses = {
      porEvento: new Map(),
      semAssociacao: { qtd: 2, total: 3000 },
    };
    render(
      <RepassesPorEvento linhas={LINHAS} associacao={associacao} loading={false} error={null} onRetry={vi.fn()} />,
    );
    const nota = screen.getByRole('note');
    expect((nota.textContent ?? '').replace(/\s/g, ' ')).toContain('2 repasses');
    expect((nota.textContent ?? '').replace(/\s/g, ' ')).toContain('R$ 3.000,00');
    expect((nota.textContent ?? '').replace(/\s/g, ' ')).toContain('sem associação');
    // R-6 (review CAIXADISP-REV): desde a DEC-0727 a seção afirma que a coluna
    // já desconta os repasses. Estes NÃO entram em linha nenhuma — a Σ da coluna
    // fica acima do card agregado exatamente por este valor, e a nota diz isso.
    expect((nota.textContent ?? '').replace(/\s/g, ' ')).toContain('não descontados');
  });

  it('a seção declara que desconta os repasses ASSOCIADOS (não "os repasses")', () => {
    render(
      <RepassesPorEvento linhas={LINHAS} associacao={SEM_ASSOCIACAO} loading={false} error={null} onRetry={vi.fn()} />,
    );
    const secao = screen.getByRole('region', { name: 'Repasse por evento' });
    expect((secao.textContent ?? '').replace(/\s/g, ' ')).toContain(
      'já descontados os repasses associados a cada um',
    );
  });

  it('sem repasse legado → nota NÃO aparece (ruído zero)', () => {
    render(
      <RepassesPorEvento linhas={LINHAS} associacao={SEM_ASSOCIACAO} loading={false} error={null} onRetry={vi.fn()} />,
    );
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
