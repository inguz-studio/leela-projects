import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParceriasView } from '../ParceriasView';
import { mkEventoAfiliado, mkPatrocinador } from '../../../_test/fixtures';

const noop = () => {};

const PARCERIAS = [
  mkEventoAfiliado({ id: 'inv', status: 'convite_pendente', eventoId: 'corrida-verao' }),
  mkEventoAfiliado({ id: 'ev', status: 'ativa', eventoId: 'meia-floripa', conversoes: 8, valorAReceber: 640 }),
  mkPatrocinador({ id: 'spo', nome: 'Loja do Corredor', modeloComercial: 'financeiro', valorAnual: 12000 }),
];

function renderView(over = {}) {
  return render(
    <ParceriasView parcerias={PARCERIAS} loading={false} error={null} {...over} />,
  );
}

describe('ParceriasView', () => {
  it('renderiza os 3 blocos', () => {
    renderView();
    expect(screen.getByLabelText('Convites pendentes')).toBeInTheDocument();
    expect(screen.getByLabelText('Eventos promovidos')).toBeInTheDocument();
    expect(screen.getByLabelText('Patrocinadores')).toBeInTheDocument();
    expect(screen.getByText('Loja do Corredor')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?640,00/)).toBeInTheDocument();
  });

  it('aceitar convite dispara onAceitar com a parceria (RN-125)', async () => {
    const onAceitar = vi.fn();
    renderView({ onAceitar });
    const bloco = screen.getByLabelText('Convites pendentes');
    await userEvent.click(within(bloco).getByRole('button', { name: 'Aceitar' }));
    expect(onAceitar).toHaveBeenCalledWith(expect.objectContaining({ id: 'inv' }));
  });

  it('recusar convite dispara onRecusar', async () => {
    const onRecusar = vi.fn();
    renderView({ onRecusar });
    const bloco = screen.getByLabelText('Convites pendentes');
    await userEvent.click(within(bloco).getByRole('button', { name: 'Recusar' }));
    expect(onRecusar).toHaveBeenCalledWith(expect.objectContaining({ id: 'inv' }));
  });

  it('ações do evento promovido (copiar link / ver termos / remover)', async () => {
    const onCopiarLink = vi.fn();
    const onVerTermos = vi.fn();
    const onRemoverEvento = vi.fn();
    renderView({ onCopiarLink, onVerTermos, onRemoverEvento });
    const tabela = screen.getByLabelText('Eventos promovidos');
    await userEvent.click(within(tabela).getByRole('button', { name: 'Copiar link' }));
    await userEvent.click(within(tabela).getByRole('button', { name: 'Ver termos' }));
    await userEvent.click(within(tabela).getByRole('button', { name: 'Remover' }));
    expect(onCopiarLink).toHaveBeenCalledWith(expect.objectContaining({ id: 'ev' }));
    expect(onVerTermos).toHaveBeenCalledWith(expect.objectContaining({ id: 'ev' }));
    expect(onRemoverEvento).toHaveBeenCalledWith(expect.objectContaining({ id: 'ev' }));
  });

  it('adicionar patrocinador e desativar disparam callbacks', async () => {
    const onAdicionarPatrocinador = vi.fn();
    const onDesativarPatrocinador = vi.fn();
    renderView({ onAdicionarPatrocinador, onDesativarPatrocinador });
    await userEvent.click(screen.getByRole('button', { name: '+ Adicionar patrocinador' }));
    expect(onAdicionarPatrocinador).toHaveBeenCalledOnce();
    const bloco = screen.getByLabelText('Patrocinadores');
    await userEvent.click(within(bloco).getByRole('button', { name: 'Desativar' }));
    expect(onDesativarPatrocinador).toHaveBeenCalledWith(expect.objectContaining({ id: 'spo' }));
  });

  it('sem parcerias mostra EmptyState', () => {
    render(<ParceriasView parcerias={[]} loading={false} error={null} onAdicionarPatrocinador={noop} />);
    expect(screen.getByText(/nenhuma parceria ainda/i)).toBeInTheDocument();
  });

  it('skeleton no load e erro no fail', () => {
    const { rerender } = render(<ParceriasView parcerias={null} loading error={null} />);
    expect(screen.getByRole('status', { name: 'Carregando parcerias' })).toBeInTheDocument();
    rerender(<ParceriasView parcerias={null} loading={false} error={new Error('x')} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
