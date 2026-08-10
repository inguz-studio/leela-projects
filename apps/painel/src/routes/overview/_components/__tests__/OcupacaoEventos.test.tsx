// =============================================================================
// OcupacaoEventos — os quatro estados do bloco (§2.12) e a prova de que ele não
// promete o que não mede.
//
// O caso que vale mais é o do evento sem capacidade: a tela precisa DIZER que
// alguém ficou de fora. Um bloco que simplesmente omite eventos silenciosamente
// ensina o organizador a confiar numa lista incompleta.
//
// A leitura sem enxergar cor vem da tabela equivalente que o BarChart do DS
// renderiza em sr-only — por isso as asserções procuram linha de tabela, e não
// pixel de barra (jsdom não faz layout).
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OcupacaoEventos, alturaDoPlot } from '../OcupacaoEventos';
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
    render(
      <OcupacaoEventos ocupacao={{ linhas: [], semCapacidade: 0 }} loading={false} />
    );
    expect(screen.getByText('Sem ocupação para mostrar')).toBeInTheDocument();
    expect(screen.getByText(/Assim que um evento com vagas definidas/)).toBeInTheDocument();
  });

  it('todos sem capacidade → o vazio explica a CAUSA e o conserto', () => {
    render(
      <OcupacaoEventos ocupacao={{ linhas: [], semCapacidade: 3 }} loading={false} />
    );
    expect(screen.getByText(/Sem o total de vagas não existe taxa de ocupação/)).toBeInTheDocument();
  });
});

describe('OcupacaoEventos · com dado', () => {
  it('cada evento vira uma linha legível com inscritos sobre vagas', () => {
    render(<OcupacaoEventos ocupacao={cheio} loading={false} />);
    const linha = screen.getByRole('rowheader', { name: 'Meia Maratona Floripa' }).closest('tr');
    expect(linha).toHaveTextContent('453 / 500');
    expect(linha).toHaveTextContent('91%');
  });

  it('não perde nenhum evento da derivação', () => {
    render(<OcupacaoEventos ocupacao={cheio} loading={false} />);
    expect(screen.getByRole('rowheader', { name: 'Desafio Serra do Mar' })).toBeInTheDocument();
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

  it('o link do cabeçalho leva ao hub de eventos', async () => {
    const onVerEventos = vi.fn();
    render(<OcupacaoEventos ocupacao={cheio} loading={false} onVerEventos={onVerEventos} />);
    await userEvent.click(screen.getByRole('button', { name: /Ver todos os eventos/ }));
    expect(onVerEventos).toHaveBeenCalled();
  });
});

describe('alturaDoPlot', () => {
  it('cresce com o número de barras', () => {
    expect(alturaDoPlot(5)).toBeGreaterThan(alturaDoPlot(2));
  });

  it('nunca colapsa a zero (lista vazia ainda tem caixa)', () => {
    expect(alturaDoPlot(0)).toBeGreaterThan(0);
  });
});
