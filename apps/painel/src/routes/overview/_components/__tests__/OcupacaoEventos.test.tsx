// =============================================================================
// OcupacaoEventos — a lista-régua do protótipo v3 (HIFI-REC) e a prova de que
// ela não promete o que não mede.
//
// O caso que vale mais segue o mesmo: evento sem capacidade fica de fora E a
// tela DIZE que ficou. A leitura sem enxergar cor vem do `aria-label` da barra
// (nome + x de y + %), que carrega o mesmo conteúdo que a cor pinta.
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIMIAR_ATENCAO_PCT, OcupacaoEventos, pctDaBarra } from '../OcupacaoEventos';
import type { OcupacaoDosEventos } from '../../_lib/ocupacao';

const cheio: OcupacaoDosEventos = {
  linhas: [
    { slug: 'meia-floripa-2026', nome: 'Meia Maratona Floripa', inscritos: 453, capacidade: 500, ocupacao: 0.906 },
    { slug: 'serra-do-mar', nome: 'Desafio Serra do Mar', inscritos: 312, capacidade: 600, ocupacao: 0.52 },
  ],
  semCapacidade: 0,
};

describe('OcupacaoEventos · estados', () => {
  it('carregando → status acessível, nunca gráfico vazio fingindo dado', () => {
    render(<OcupacaoEventos ocupacao={null} loading />);
    expect(
      screen.getByRole('status', { name: 'Carregando ocupação dos eventos' })
    ).toBeInTheDocument();
  });

  it('erro → alerta honesto com retry, nunca estado vazio fabricado', async () => {
    const onRetry = vi.fn();
    render(<OcupacaoEventos ocupacao={null} loading={false} error onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a ocupação dos seus eventos.'
    );
    expect(screen.queryByText(/Sem ocupação para mostrar/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('sem eventos → estado vazio que orienta, sem culpar o dado', () => {
    render(<OcupacaoEventos ocupacao={{ linhas: [], semCapacidade: 0 }} loading={false} />);
    expect(screen.getByText('Sem ocupação para mostrar')).toBeInTheDocument();
    expect(screen.getByText(/Assim que um evento com vagas definidas/)).toBeInTheDocument();
  });

  it('todos sem capacidade → o vazio explica a CAUSA e o conserto', () => {
    render(<OcupacaoEventos ocupacao={{ linhas: [], semCapacidade: 3 }} loading={false} />);
    expect(
      screen.getByText(/Sem o total de vagas não existe taxa de ocupação/)
    ).toBeInTheDocument();
  });
});

describe('OcupacaoEventos · com dado (anatomia do protótipo)', () => {
  it('cada evento vira uma linha nome · barra · "x/y" com % no nome acessível', () => {
    render(<OcupacaoEventos ocupacao={cheio} loading={false} />);
    expect(screen.getByText('Meia Maratona Floripa')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Meia Maratona Floripa: 453 de 500 vagas (91%)' })
    ).toBeInTheDocument();
    expect(screen.getByText('453')).toBeInTheDocument();
    expect(screen.getByText('/500')).toBeInTheDocument();
  });

  it('não perde nenhum evento da derivação', () => {
    render(<OcupacaoEventos ocupacao={cheio} loading={false} />);
    expect(screen.getByText('Desafio Serra do Mar')).toBeInTheDocument();
  });

  it('barra ≥ 85% acende o âmbar de atenção; abaixo fica no acento (protótipo)', () => {
    render(<OcupacaoEventos ocupacao={cheio} loading={false} />);
    const quente = screen
      .getByRole('img', { name: /Meia Maratona Floripa/ })
      .querySelector('i');
    const fria = screen.getByRole('img', { name: /Desafio Serra do Mar/ }).querySelector('i');
    expect(quente?.className).toContain('--feedback-warning');
    expect(fria?.className).toContain('--chart-accent');
  });

  it('limiar e razão são puros e testáveis', () => {
    expect(LIMIAR_ATENCAO_PCT).toBe(85);
    expect(pctDaBarra(0.906)).toBe(91);
    expect(pctDaBarra(0.52)).toBe(52);
  });

  it('conta em voz alta os eventos que ficaram de fora', () => {
    render(<OcupacaoEventos ocupacao={{ ...cheio, semCapacidade: 2 }} loading={false} />);
    expect(
      screen.getByText('2 eventos ficaram de fora por não ter capacidade definida.')
    ).toBeInTheDocument();
  });

  it('singular quando é um só (copy, não template cru)', () => {
    render(<OcupacaoEventos ocupacao={{ ...cheio, semCapacidade: 1 }} loading={false} />);
    expect(
      screen.getByText('1 evento ficou de fora por não ter capacidade definida.')
    ).toBeInTheDocument();
  });

  it('a seção nomeia os "últimos 5 eventos" (recorte real da derivação)', () => {
    render(<OcupacaoEventos ocupacao={cheio} loading={false} />);
    expect(screen.getByText('Ocupação dos últimos 5 eventos')).toBeInTheDocument();
  });
});
