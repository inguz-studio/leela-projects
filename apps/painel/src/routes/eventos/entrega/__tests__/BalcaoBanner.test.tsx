import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalcaoBanner } from '../BalcaoBanner';
import type { JanelaEntrega } from '@leela/core';

// FUSO_EVENTO = America/Sao_Paulo (UTC-3). 13:00Z = 10:00 local em 25/04/2026.
const D25: JanelaEntrega = { dia: '2026-04-25', horaInicio: '08:00', horaFim: '20:00', local: 'Arena — tenda 3' };
const D24: JanelaEntrega = { dia: '2026-04-24', horaInicio: '10:00', horaFim: '18:00', local: 'Arena — tenda 1' };

describe('BalcaoBanner', () => {
  it('sem cronograma → EmptyState honesto (nunca "Dia N")', () => {
    render(<BalcaoBanner evento={{ janelasEntrega: [] }} agora={new Date('2026-04-25T13:00:00Z')} />);
    expect(screen.getByText('Cronograma de entrega não configurado')).toBeInTheDocument();
    expect(screen.queryByText(/Dia \d+ de \d+/)).not.toBeInTheDocument();
  });

  it('janela ativa agora → "Entrega ativa · Dia N de M · até HH:mm · <local>"', () => {
    render(
      <BalcaoBanner
        evento={{ janelasEntrega: [D24, D25] }}
        agora={new Date('2026-04-25T13:00:00Z')}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Entrega ativa · Dia 2 de 2')).toBeInTheDocument();
    expect(screen.getByText('até 20:00 · Arena — tenda 3')).toBeInTheDocument();
  });

  it('fora da janela mas com próxima → aviso "Próxima janela"', () => {
    // 09:00Z = 06:00 local, antes da abertura (08:00) do mesmo dia.
    render(<BalcaoBanner evento={{ janelasEntrega: [D25] }} agora={new Date('2026-04-25T09:00:00Z')} />);
    expect(screen.getByText('Janela de entrega fechada')).toBeInTheDocument();
    expect(
      screen.getByText('Próxima janela: Sábado, 25 de abril · 08:00 · Arena — tenda 3'),
    ).toBeInTheDocument();
  });

  it('todas as janelas já passaram → "Entrega encerrada"', () => {
    render(<BalcaoBanner evento={{ janelasEntrega: [D25] }} agora={new Date('2026-04-26T09:00:00Z')} />);
    expect(screen.getByText('Entrega encerrada')).toBeInTheDocument();
    expect(screen.queryByText(/Dia \d+ de \d+/)).not.toBeInTheDocument();
  });
});
