import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GaleriaEstados } from '../GaleriaEstados';

describe('GaleriaEstados (§2.9 / RN-208)', () => {
  it('lista os 5 estados no índice', () => {
    render(<GaleriaEstados />);
    for (const titulo of ['Vazio', 'Sem kit', 'Completo (já atendido)', 'Conflito de chip', 'Fora da janela']) {
      expect(screen.getByRole('button', { name: titulo })).toBeInTheDocument();
    }
  });

  it('mostra apenas um estado por vez (nunca empilhados)', async () => {
    render(<GaleriaEstados />);
    // estado inicial = Vazio
    expect(screen.getByText('Nenhum atleta identificado')).toBeInTheDocument();
    expect(screen.queryByText('Entrega ainda não abriu')).not.toBeInTheDocument();
    // troca para Fora da janela
    await userEvent.click(screen.getByRole('button', { name: 'Fora da janela' }));
    expect(screen.getByText('Entrega ainda não abriu')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum atleta identificado')).not.toBeInTheDocument();
  });

  it('conflito de chip abre ConfirmModal com preview de consequências (§2.15)', async () => {
    render(<GaleriaEstados />);
    await userEvent.click(screen.getByRole('button', { name: 'Conflito de chip' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simular conflito de chip' }));
    expect(await screen.findByText('Chip já vinculado a outro atleta')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sobrescrever chip' }));
    expect(await screen.findByText(/reatribuído a Marina Silva/)).toBeInTheDocument();
  });
});
