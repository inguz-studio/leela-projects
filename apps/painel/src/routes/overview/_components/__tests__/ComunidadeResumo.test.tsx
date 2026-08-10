// =============================================================================
// ComunidadeResumo — o bloco que fecha o buraco entre a story do E02
// ("consolida eventos E CLUBES") e a tela.
//
// O caso do zero é o que importa: 0 membros ativos e 0 desafios ativos NÃO é
// "comunidade com números baixos", é "não há comunidade" — e a diferença entre
// mostrar dois zeros e mostrar um caminho é a diferença entre um painel que
// informa e um que orienta.
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComunidadeResumo, type ComunidadeResumoProps } from '../ComunidadeResumo';
import { mkKpis } from '../../_test/fixtures';

function montar(over: Partial<ComunidadeResumoProps> = {}) {
  const props = {
    kpis: mkKpis({ membrosAtivosTotais: 120, desafiosAtivosTotais: 4 }),
    loading: false,
    onGerenciarClubs: vi.fn(),
    onNovoClube: vi.fn(),
    ...over,
  };
  render(<ComunidadeResumo {...props} />);
  return props;
}

describe('ComunidadeResumo · com comunidade', () => {
  it('mostra os dois agregados de comunidade que o resumo já trazia', () => {
    montar();
    expect(screen.getByText('membros ativos')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('desafios ativos')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('leva ao hub de clubs', async () => {
    const { onGerenciarClubs } = montar();
    await userEvent.click(screen.getByRole('button', { name: 'Gerenciar clubs' }));
    expect(onGerenciarClubs).toHaveBeenCalled();
  });

  it('desafios zerados com membros ativos ainda é comunidade — não vira vazio', () => {
    montar({ kpis: mkKpis({ membrosAtivosTotais: 18, desafiosAtivosTotais: 0 }) });
    expect(screen.queryByText('Nenhuma comunidade ativa')).not.toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
  });
});

describe('ComunidadeResumo · estados', () => {
  it('carregando → status acessível no lugar dos números', () => {
    montar({ kpis: null, loading: true });
    expect(
      screen.getByRole('status', { name: 'Carregando resumo dos clubs' })
    ).toBeInTheDocument();
  });

  it('erro → alerta honesto, sem zeros fabricados', async () => {
    const onRetry = vi.fn();
    montar({ kpis: null, loading: false, error: true, onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o resumo dos seus clubs.'
    );
    expect(screen.queryByText('membros ativos')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('zero em tudo → caminho para criar um club, não dois zeros mudos', async () => {
    const { onNovoClube } = montar({
      kpis: mkKpis({ membrosAtivosTotais: 0, desafiosAtivosTotais: 0 }),
    });
    expect(screen.getByText('Nenhuma comunidade ativa')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Criar um club' }));
    expect(onNovoClube).toHaveBeenCalled();
  });
});
